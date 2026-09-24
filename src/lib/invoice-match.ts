import { decimalToNumber } from "@/lib/utils";
import type { MatchStatus } from "@prisma/client";

type QtyLine = { partNumber: string; quantity: unknown; unitCost?: unknown };

function key(partNumber: string) {
  return partNumber.trim().toUpperCase();
}

export function threeWayMatch(input: {
  purchaseLines: QtyLine[];
  receiptLines: QtyLine[];
  invoiceLines: QtyLine[];
  tolerancePct?: number;
}): { status: MatchStatus; notes: string } {
  const tol = (input.tolerancePct ?? 2) / 100;
  const po = new Map<string, { qty: number; cost: number }>();
  const grn = new Map<string, number>();
  const inv = new Map<string, { qty: number; cost: number }>();

  for (const l of input.purchaseLines) {
    const k = key(l.partNumber);
    const cur = po.get(k) || { qty: 0, cost: 0 };
    cur.qty += decimalToNumber(l.quantity as never);
    cur.cost = decimalToNumber((l.unitCost ?? 0) as never);
    po.set(k, cur);
  }
  for (const l of input.receiptLines) {
    const k = key(l.partNumber);
    grn.set(k, (grn.get(k) || 0) + decimalToNumber(l.quantity as never));
  }
  for (const l of input.invoiceLines) {
    const k = key(l.partNumber);
    const cur = inv.get(k) || { qty: 0, cost: 0 };
    cur.qty += decimalToNumber(l.quantity as never);
    cur.cost = decimalToNumber((l.unitCost ?? 0) as never);
    inv.set(k, cur);
  }

  const parts = new Set([...po.keys(), ...grn.keys(), ...inv.keys()]);
  if (parts.size === 0) return { status: "UNMATCHED", notes: "No lines to match" };

  let matched = 0;
  let partial = 0;
  let exceptions = 0;
  const notes: string[] = [];

  for (const part of parts) {
    const p = po.get(part);
    const g = grn.get(part) ?? 0;
    const i = inv.get(part);
    if (!p || !i || g <= 0) {
      exceptions += 1;
      notes.push(`${part}: missing PO/GRN/invoice qty`);
      continue;
    }
    const qtyOk =
      Math.abs(p.qty - g) <= p.qty * tol + 0.001 &&
      Math.abs(p.qty - i.qty) <= p.qty * tol + 0.001;
    const priceOk =
      p.cost === 0 || Math.abs(p.cost - i.cost) <= Math.max(p.cost * tol, 0.01);

    if (qtyOk && priceOk) {
      matched += 1;
    } else if (g > 0 && i.qty > 0) {
      partial += 1;
      notes.push(
        `${part}: qty PO ${p.qty}/GRN ${g}/INV ${i.qty}` +
          (priceOk ? "" : `; price PO ${p.cost} vs INV ${i.cost}`)
      );
    } else {
      exceptions += 1;
      notes.push(`${part}: incomplete match`);
    }
  }

  if (exceptions === 0 && partial === 0 && matched === parts.size) {
    return { status: "MATCHED", notes: "PO, goods receipt, and invoice aligned" };
  }
  if (matched > 0 || partial > 0) {
    return { status: "PARTIAL", notes: notes.slice(0, 6).join("; ") || "Partial match" };
  }
  if (exceptions > 0 && matched === 0 && partial === 0) {
    return { status: "EXCEPTION", notes: notes.slice(0, 6).join("; ") || "Match exception" };
  }
  return { status: "UNMATCHED", notes: notes.slice(0, 6).join("; ") || "Unmatched" };
}
