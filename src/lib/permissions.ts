import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role) && session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return session;
}

export function canWrite(role: Role) {
  return role === Role.ADMIN || role === Role.SALES || role === Role.PROCUREMENT;
}

export function canManageUsers(role: Role) {
  return role === Role.ADMIN;
}

export function canSales(role: Role) {
  return role === Role.ADMIN || role === Role.SALES;
}

export function canProcurement(role: Role) {
  return role === Role.ADMIN || role === Role.PROCUREMENT;
}
