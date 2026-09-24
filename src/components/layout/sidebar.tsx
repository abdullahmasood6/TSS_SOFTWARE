"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSearch,
  Users,
  Truck,
  Package,
  FileText,
  ShoppingCart,
  History,
  Settings,
  LogOut,
  Ship,
  LayoutTemplate,
  BarChart3,
  UserRound,
  Store,
  Receipt,
  Wallet,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import {
  navVisible,
  ROLE_META,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";

const groups: {
  label: string;
  items: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    permission: Permission | Permission[];
  }[];
}[] = [
  {
    label: "Work",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
      { href: "/enquiries", label: "Enquiries", icon: FileSearch, permission: "enquiries.view" },
      { href: "/quotes", label: "Customer Quotes", icon: FileText, permission: "quotes.view" },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders.view" },
      { href: "/invoices", label: "Invoices", icon: Receipt, permission: "invoices" },
      { href: "/payments", label: "Payments", icon: Wallet, permission: "payments" },
      { href: "/contracts", label: "Contracts", icon: ScrollText, permission: "contracts" },
    ],
  },
  {
    label: "Network",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: Store, permission: "marketplace" },
      { href: "/customers", label: "Customers", icon: Users, permission: "customers" },
      { href: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers" },
      { href: "/vessels", label: "Vessels", icon: Ship, permission: "vessels" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/catalog", label: "Parts catalog", icon: Package, permission: "catalog" },
      { href: "/templates", label: "Templates", icon: LayoutTemplate, permission: "templates" },
      { href: "/price-history", label: "Price History", icon: History, permission: "price_history" },
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: UserRound, permission: "profile" },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        permission: ["settings.view", "settings.company", "settings.users"],
      },
    ],
  },
];

/** Roles that should not see Customer Quotes as a primary sales tool */
function groupLabelForRole(role: Role, label: string) {
  if (role === "PROCUREMENT" && label === "Work") return "Sourcing";
  if (role === "SALES" && label === "Fulfillment") return "Orders";
  if (role === "VIEWER" && label === "Work") return "Browse";
  return label;
}

export function Sidebar({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const role = user.role as Role;
  const meta = ROLE_META[role];

  return (
    <aside className="relative flex h-screen w-[16.5rem] shrink-0 flex-col overflow-hidden border-r border-white/8 bg-gradient-to-b from-tss-navy via-[#0b203a] to-tss-navy-deep text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-16 top-24 h-48 w-48 rounded-full bg-tss-steel/20 blur-3xl" />
        <div className="absolute bottom-20 right-[-40px] h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-sm font-bold tracking-[0.08em] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            NW
          </div>
          <div className="min-w-0">
            <div className="text-[1.05rem] font-semibold tracking-[-0.01em]">Northwharf</div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-white/55">Operations</div>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const items = group.items.filter((item) => navVisible(role, item.permission));
          if (!items.length) return null;
          return (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                {groupLabelForRole(role, group.label)}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.875rem] transition-all duration-150",
                        active
                          ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                          : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                      )}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-tss-steel-mid animate-slide-in" />
                      ) : null}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-opacity",
                          active ? "opacity-100" : "opacity-70 group-hover:opacity-90"
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 bg-black/10 px-4 py-4 backdrop-blur-sm">
        <Link href="/profile" className="block rounded-md transition hover:bg-white/8">
          <div className="truncate text-sm font-medium tracking-[-0.01em]">{user.name}</div>
          <div className="truncate text-xs text-white/50">{user.email}</div>
          <div className="mt-1.5 inline-flex rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-100/80">
            {meta?.label || user.role}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-white/45">
            {meta?.summary}
          </p>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/60 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
