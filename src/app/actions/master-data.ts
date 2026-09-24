"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, assertCan } from "@/lib/permissions";
import { z } from "zod";

function emptyToUndef(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

const customerSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

function parseCustomer(formData: FormData) {
  return customerSchema.parse({
    name: formData.get("name"),
    code: emptyToUndef(formData.get("code")),
    contact: emptyToUndef(formData.get("contact")),
    email: emptyToUndef(formData.get("email")),
    phone: emptyToUndef(formData.get("phone")),
    address: emptyToUndef(formData.get("address")),
    country: emptyToUndef(formData.get("country")),
    notes: emptyToUndef(formData.get("notes")),
  });
}

export async function createCustomer(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "customers.write");
  const data = parseCustomer(formData);
  await prisma.customer.create({
    data: {
      name: data.name,
      code: data.code || null,
      contact: data.contact || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      country: data.country || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/customers");
}

export async function updateCustomer(id: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "customers.write");
  const data = parseCustomer(formData);
  await prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code || null,
      contact: data.contact || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      country: data.country || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/customers");
}

export async function setCustomerActive(id: string, active: boolean) {
  const session = await requireSession();
  assertCan(session.user.role, "customers.write");
  await prisma.customer.update({ where: { id }, data: { active } });
  revalidatePath("/customers");
}

const supplierSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  leadTimeDays: z.coerce.number().optional().nullable(),
  brandsServed: z.string().optional(),
  categories: z.string().optional(),
  portsServed: z.string().optional(),
  notes: z.string().optional(),
});

function parseSupplier(formData: FormData) {
  const lead = formData.get("leadTimeDays");
  return supplierSchema.parse({
    name: formData.get("name"),
    code: emptyToUndef(formData.get("code")),
    contact: emptyToUndef(formData.get("contact")),
    email: emptyToUndef(formData.get("email")),
    phone: emptyToUndef(formData.get("phone")),
    address: emptyToUndef(formData.get("address")),
    country: emptyToUndef(formData.get("country")),
    leadTimeDays: lead === "" || lead == null ? null : Number(lead),
    brandsServed: emptyToUndef(formData.get("brandsServed")),
    categories: emptyToUndef(formData.get("categories")),
    portsServed: emptyToUndef(formData.get("portsServed")),
    notes: emptyToUndef(formData.get("notes")),
  });
}

export async function createSupplier(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "suppliers.write");
  const data = parseSupplier(formData);
  await prisma.supplier.create({
    data: {
      name: data.name,
      code: data.code || null,
      contact: data.contact || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      country: data.country || null,
      leadTimeDays: data.leadTimeDays ?? null,
      brandsServed: data.brandsServed || null,
      categories: data.categories || null,
      portsServed: data.portsServed || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "suppliers.write");
  const data = parseSupplier(formData);
  await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code || null,
      contact: data.contact || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      country: data.country || null,
      leadTimeDays: data.leadTimeDays ?? null,
      brandsServed: data.brandsServed || null,
      categories: data.categories || null,
      portsServed: data.portsServed || null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/suppliers");
}

export async function setSupplierActive(id: string, active: boolean) {
  const session = await requireSession();
  assertCan(session.user.role, "suppliers.write");
  await prisma.supplier.update({ where: { id }, data: { active } });
  revalidatePath("/suppliers");
}

const partSchema = z.object({
  partNumber: z.string().min(1),
  description: z.string().min(1),
  manufacturer: z.string().optional(),
  brand: z.string().optional(),
  impaCode: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

function parsePart(formData: FormData) {
  return partSchema.parse({
    partNumber: formData.get("partNumber"),
    description: formData.get("description"),
    manufacturer: emptyToUndef(formData.get("manufacturer")),
    brand: emptyToUndef(formData.get("brand")),
    impaCode: emptyToUndef(formData.get("impaCode")),
    category: emptyToUndef(formData.get("category")),
    unit: emptyToUndef(formData.get("unit")) || "EA",
    notes: emptyToUndef(formData.get("notes")),
  });
}

export async function createPart(formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "catalog.write");
  const data = parsePart(formData);
  await prisma.part.create({
    data: {
      partNumber: data.partNumber,
      description: data.description,
      manufacturer: data.manufacturer || null,
      brand: data.brand || data.manufacturer || null,
      impaCode: data.impaCode || null,
      category: data.category || null,
      unit: data.unit || "EA",
      notes: data.notes || null,
    },
  });
  revalidatePath("/catalog");
}

export async function updatePart(id: string, formData: FormData) {
  const session = await requireSession();
  assertCan(session.user.role, "catalog.write");
  const data = parsePart(formData);
  await prisma.part.update({
    where: { id },
    data: {
      partNumber: data.partNumber,
      description: data.description,
      manufacturer: data.manufacturer || null,
      brand: data.brand || null,
      impaCode: data.impaCode || null,
      category: data.category || null,
      unit: data.unit || "EA",
      notes: data.notes || null,
    },
  });
  revalidatePath("/catalog");
}

export async function setPartActive(id: string, active: boolean) {
  const session = await requireSession();
  assertCan(session.user.role, "catalog.write");
  await prisma.part.update({ where: { id }, data: { active } });
  revalidatePath("/catalog");
}
