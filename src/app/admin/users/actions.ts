"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

const changeStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "rejected", "suspended"]),
});

export async function changeUserStatus(formData: FormData) {
  const admin = await requireAdmin();
  const input = changeStatusSchema.parse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });

  if (admin.id === input.userId && input.status !== "active") {
    throw new Error("You cannot deactivate your own administrator account.");
  }

  await db
    .update(users)
    .set({
      status: input.status,
      approvedBy: input.status === "active" ? admin.id : null,
      approvedAt: input.status === "active" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId));

  revalidatePath("/admin/users");
}
