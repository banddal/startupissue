import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/server/db";
import { users, type AppUser } from "@/server/db/schema";

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user ?? null;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function requireActiveUser(): Promise<AppUser> {
  const user = await requireUser();

  if (user.status !== "active") {
    redirect("/pending");
  }

  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireActiveUser();

  if (user.role !== "admin") {
    throw new AuthorizationError();
  }

  return user;
}
