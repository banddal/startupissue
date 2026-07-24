"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/today" });
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: "/" });
}
