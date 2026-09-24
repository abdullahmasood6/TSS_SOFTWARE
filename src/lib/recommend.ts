import type { KycStatus, MarketplaceKind } from "@prisma/client";

export type RecommendSupplier = {
  id: string;
  name: string;
  kind: MarketplaceKind;
  kycStatus: KycStatus;
  complianceHold: boolean;
  leadTimeDays: number | null;
  categories: string | null;
  portsServed: string | null;
  brandsServed: string | null;
  ratingScore: unknown;
  active: boolean;
};

export type RecommendInput = {
  deliveryPort?: string | null;
  category?: string | null;
  brands?: string[];
  alreadySentIds?: string[];
};

export type SupplierScore = {
  supplier: RecommendSupplier;
  score: number;
  reasons: string[];
};

function tokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;/|]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function includesPort(portsServed: string | null, deliveryPort?: string | null) {
  if (!deliveryPort) return false;
  const needle = deliveryPort.trim().toLowerCase();
  if (!needle) return false;
  return tokens(portsServed).some(
    (p) => p === needle || p.includes(needle) || needle.includes(p)
  );
}

function rating(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Rule-based supplier ranking (Procureship-style, no ML). */
export function rankSuppliers(
  suppliers: RecommendSupplier[],
  input: RecommendInput
): SupplierScore[] {
  const already = new Set(input.alreadySentIds || []);
  const brands = (input.brands || []).map((b) => b.toLowerCase()).filter(Boolean);
  const category = input.category?.trim().toLowerCase() || "";

  return suppliers
    .filter((s) => s.active && !already.has(s.id))
    .map((s) => {
      let score = 0;
      const reasons: string[] = [];

      if (s.kycStatus === "BLOCKED" || s.complianceHold) {
        return { supplier: s, score: -1000, reasons: ["Blocked / compliance hold"] };
      }
      if (s.kycStatus === "CLEAR") {
        score += 25;
        reasons.push("KYC clear");
      } else if (s.kycStatus === "REVIEW") {
        score -= 10;
        reasons.push("KYC review");
      } else {
        score -= 5;
        reasons.push("KYC pending");
      }

      if (includesPort(s.portsServed, input.deliveryPort)) {
        score += 40;
        reasons.push(`Serves ${input.deliveryPort}`);
      }

      const cats = tokens(s.categories);
      if (category && cats.some((c) => c.includes(category) || category.includes(c))) {
        score += 20;
        reasons.push("Category match");
      }

      const servedBrands = tokens(s.brandsServed);
      const brandHits = brands.filter((b) =>
        servedBrands.some((sb) => sb.includes(b) || b.includes(sb))
      );
      if (brandHits.length) {
        score += Math.min(30, brandHits.length * 10);
        reasons.push(`Brand: ${brandHits.slice(0, 2).join(", ")}`);
      }

      if (s.leadTimeDays != null) {
        if (s.leadTimeDays <= 7) {
          score += 15;
          reasons.push("Fast lead time");
        } else if (s.leadTimeDays <= 14) {
          score += 8;
        } else if (s.leadTimeDays > 30) {
          score -= 5;
        }
      }

      const r = rating(s.ratingScore);
      if (r > 0) {
        score += Math.round(r * 2);
        reasons.push(`Rating ${r.toFixed(1)}`);
      }

      if (s.kind === "SERVICE_PROVIDER" && category.includes("service")) {
        score += 10;
        reasons.push("Service provider");
      }

      return { supplier: s, score, reasons };
    })
    .filter((x) => x.score > -500)
    .sort((a, b) => b.score - a.score);
}
