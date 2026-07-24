import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/lib/auth-types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    status: UserStatus;
  }
}
