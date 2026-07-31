"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeCompanyName, parseCompanyAliases } from "@/lib/companies";
import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import {
  companies,
  companyVerifications,
} from "@/server/db/schema";

const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  aliases: z.string().max(1_000),
  sectorKey: z.string().trim().min(1).max(100),
  verificationKind: z.enum([
    "government_program",
    "tips",
    "portfolio",
    "demo_day",
    "self_declared",
    "other",
  ]),
  sourceName: z.string().trim().min(1).max(200),
  sourceUrl: z.union([z.url(), z.literal("")]),
  observedAt: z.coerce.date(),
  note: z.string().trim().max(2_000),
});

const reviewCompanySchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["candidate", "approved", "rejected"]),
});

export async function createCompanyCandidate(formData: FormData) {
  const admin = await requireAdmin();
  const input = createCompanySchema.parse({
    name: formData.get("name"),
    aliases: formData.get("aliases") ?? "",
    sectorKey: formData.get("sectorKey"),
    verificationKind: formData.get("verificationKind"),
    sourceName: formData.get("sourceName"),
    sourceUrl: formData.get("sourceUrl") ?? "",
    observedAt: formData.get("observedAt"),
    note: formData.get("note") ?? "",
  });

  await db.transaction(async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        name: input.name,
        normalizedName: normalizeCompanyName(input.name),
        aliases: parseCompanyAliases(input.aliases),
        sectorKey: input.sectorKey,
        status: "candidate",
        createdBy: admin.id,
      })
      .returning({ id: companies.id });

    if (!company) throw new Error("Failed to create company candidate.");

    await tx.insert(companyVerifications).values({
      companyId: company.id,
      kind: input.verificationKind,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl || null,
      observedAt: input.observedAt,
      note: input.note || null,
      createdBy: admin.id,
    });
  });

  revalidatePath("/admin/companies");
  revalidatePath("/today");
}

export async function reviewCompanyCandidate(formData: FormData) {
  const admin = await requireAdmin();
  const input = reviewCompanySchema.parse({
    companyId: formData.get("companyId"),
    status: formData.get("status"),
  });

  await db
    .update(companies)
    .set({
      status: input.status,
      reviewedBy: input.status === "candidate" ? null : admin.id,
      reviewedAt: input.status === "candidate" ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(companies.id, input.companyId));

  revalidatePath("/admin/companies");
  revalidatePath("/today");
}
