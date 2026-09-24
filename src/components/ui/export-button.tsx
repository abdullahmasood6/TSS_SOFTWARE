import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExportButton({
  entity,
  query,
  label = "Export Excel",
  className,
  variant = "outline",
}: {
  entity: string;
  query?: Record<string, string | undefined>;
  label?: string;
  className?: string;
  variant?: "outline" | "ghost" | "default" | "steel";
}) {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) params.set(k, v);
    }
  }
  const href = `/api/export/${entity}${params.toString() ? `?${params}` : ""}`;

  return (
    <Button asChild variant={variant} className={cn(className)}>
      <Link href={href} prefetch={false}>
        <Download className="h-3.5 w-3.5" />
        {label}
      </Link>
    </Button>
  );
}
