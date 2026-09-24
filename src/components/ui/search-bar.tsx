"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";

export function SearchBar({
  placeholder = "Search…",
  defaultValue,
  name = "q",
}: {
  placeholder?: string;
  defaultValue?: string;
  name?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const params = new URLSearchParams(window.location.search);
        const value = String(fd.get(name) || "").trim();
        if (value) params.set(name, value);
        else params.delete(name);
        startTransition(() => {
          router.push(`?${params.toString()}`);
        });
      }}
    >
      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="max-w-md"
        disabled={pending}
      />
      <button
        type="submit"
        className="rounded-md border border-tss-border bg-white px-3 text-xs font-semibold text-tss-navy hover:bg-tss-steel-soft"
      >
        {pending ? "…" : "Search"}
      </button>
    </form>
  );
}
