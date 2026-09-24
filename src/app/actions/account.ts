"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, assertCan } from "@/lib/permissions";

export async function updateMyProfile(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
}

export async function changeMyPassword(formData: FormData) {
  const session = await requireSession();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters");
  if (newPassword !== confirmPassword) throw new Error("Passwords do not match");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });

  revalidatePath("/profile");
}

export async function createStaffUser(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "settings.users");

  const data = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.nativeEnum(Role),
      password: z.string().min(8),
    })
    .parse({
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      role: String(formData.get("role") || "SALES"),
      password: String(formData.get("password") || ""),
    });

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already in use");

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });

  revalidatePath("/settings");
}

export async function updateStaffUser(id: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "settings.users");

  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "") as Role;
  const active = String(formData.get("active") || "true") === "true";
  const password = String(formData.get("password") || "").trim();

  if (!name) throw new Error("Name required");
  if (!Object.values(Role).includes(role)) throw new Error("Invalid role");

  if (id === session.user.id && !active) {
    throw new Error("You cannot deactivate your own account");
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      active,
      ...(password.length >= 8
        ? { passwordHash: await bcrypt.hash(password, 10) }
        : {}),
    },
  });

  revalidatePath("/settings");
}

export async function setStaffUserActive(id: string, active: boolean) {
  const session = await requireSession();
  assertCan(session.user.role, "settings.users");
  if (id === session.user.id && !active) {
    throw new Error("You cannot deactivate your own account");
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
}
