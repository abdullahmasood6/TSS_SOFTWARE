import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export type Permission =
  | "dashboard"
  | "enquiries.view"
  | "enquiries.write"
  | "quotes.view"
  | "quotes.write"
  | "quotes.approve"
  | "rfq.write"
  | "orders.view"
  | "orders.customer_po"
  | "orders.purchase"
  | "invoices"
  | "invoices.write"
  | "payments"
  | "payments.write"
  | "contracts"
  | "contracts.write"
  | "marketplace"
  | "customers"
  | "customers.write"
  | "suppliers"
  | "suppliers.write"
  | "suppliers.compliance"
  | "vessels"
  | "vessels.write"
  | "catalog"
  | "catalog.write"
  | "templates"
  | "templates.write"
  | "price_history"
  | "reports"
  | "settings.view"
  | "settings.company"
  | "settings.users"
  | "profile";

const ALL: Permission[] = [
  "dashboard",
  "enquiries.view",
  "enquiries.write",
  "quotes.view",
  "quotes.write",
  "quotes.approve",
  "rfq.write",
  "orders.view",
  "orders.customer_po",
  "orders.purchase",
  "invoices",
  "invoices.write",
  "payments",
  "payments.write",
  "contracts",
  "contracts.write",
  "marketplace",
  "customers",
  "customers.write",
  "suppliers",
  "suppliers.write",
  "suppliers.compliance",
  "vessels",
  "vessels.write",
  "catalog",
  "catalog.write",
  "templates",
  "templates.write",
  "price_history",
  "reports",
  "settings.view",
  "settings.company",
  "settings.users",
  "profile",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL,
  SALES: [
    "dashboard",
    "enquiries.view",
    "enquiries.write",
    "quotes.view",
    "quotes.write",
    "quotes.approve",
    "orders.view",
    "orders.customer_po",
    "customers",
    "customers.write",
    "suppliers",
    "vessels",
    "vessels.write",
    "catalog",
    "templates",
    "templates.write",
    "price_history",
    "reports",
    "marketplace",
    "settings.view",
    "profile",
  ],
  PROCUREMENT: [
    "dashboard",
    "enquiries.view",
    "enquiries.write",
    "quotes.view",
    "rfq.write",
    "orders.view",
    "orders.purchase",
    "invoices",
    "invoices.write",
    "payments",
    "payments.write",
    "contracts",
    "contracts.write",
    "marketplace",
    "customers",
    "suppliers",
    "suppliers.write",
    "suppliers.compliance",
    "vessels",
    "catalog",
    "catalog.write",
    "templates",
    "price_history",
    "reports",
    "settings.view",
    "profile",
  ],
  VIEWER: [
    "dashboard",
    "enquiries.view",
    "quotes.view",
    "orders.view",
    "reports",
    "price_history",
    "customers",
    "suppliers",
    "settings.view",
    "profile",
  ],
};

export const ROLE_META: Record<
  Role,
  { label: string; summary: string; focus: string[] }
> = {
  ADMIN: {
    label: "Admin",
    summary: "Full access — users, settings, and every workflow stage.",
    focus: ["User management", "Company settings", "All modules"],
  },
  SALES: {
    label: "Sales",
    summary: "Owns the customer side: enquiries, quotes, approvals, and customer POs.",
    focus: ["Enquiries", "Customer quotes", "Approvals", "Customer POs"],
  },
  PROCUREMENT: {
    label: "Procurement",
    summary: "Owns sourcing: RFQs, supplier costs, purchases, invoices, and settlement.",
    focus: ["RFQs", "Supplier quotes", "Purchases", "Invoices & payments"],
  },
  VIEWER: {
    label: "Viewer",
    summary: "Read-only visibility across operations — no create or edit actions.",
    focus: ["Dashboards", "Reports", "Document history"],
  },
};

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function can(role: Role, permission: Permission) {
  return permissionsFor(role).includes(permission);
}

export function canAny(role: Role, permissions: Permission[]) {
  return permissions.some((p) => can(role, p));
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission | Permission[]) {
  const session = await requireSession();
  const needed = Array.isArray(permission) ? permission : [permission];
  if (!canAny(session.user.role, needed)) {
    redirect("/unauthorized");
  }
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role) && session.user.role !== Role.ADMIN) {
    redirect("/unauthorized");
  }
  return session;
}

/** @deprecated Prefer can(role, permission) */
export function canWrite(role: Role) {
  return canAny(role, [
    "enquiries.write",
    "quotes.write",
    "rfq.write",
    "orders.customer_po",
    "orders.purchase",
    "customers.write",
    "suppliers.write",
    "catalog.write",
    "invoices.write",
    "payments.write",
    "contracts.write",
  ]);
}

export function canManageUsers(role: Role) {
  return can(role, "settings.users");
}

export function canSales(role: Role) {
  return can(role, "quotes.write") || role === Role.ADMIN;
}

export function canProcurement(role: Role) {
  return can(role, "rfq.write") || role === Role.ADMIN;
}

export function assertCan(role: Role, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("Unauthorized — your role cannot perform this action");
  }
}

export type NavItem = {
  href: string;
  label: string;
  permission: Permission | Permission[];
};

export function navVisible(role: Role, permission: Permission | Permission[]) {
  const needed = Array.isArray(permission) ? permission : [permission];
  return canAny(role, needed);
}
