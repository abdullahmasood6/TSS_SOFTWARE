"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") || "").trim();
        if (!q) return;
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tss-slate/70" />
      <Input
        name="q"
        placeholder="Search any item and press enter…"
        className="h-10 border-tss-border/80 bg-tss-surface/80 pl-10 text-sm shadow-none placeholder:text-tss-slate/55 focus-visible:bg-white"
      />
    </form>
  );
}
