import type { UserRole, UserStatus } from "@/lib/auth-types";

export type AccessUser = {
  role: UserRole;
  status: UserStatus;
};

export type AccessDestination = "/" | "/pending" | "/today";

export function destinationFor(
  user: AccessUser | null,
  pathname: string,
): AccessDestination | null {
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/_next");

  if (!user) {
    return isPublic ? null : "/";
  }

  if (user.status !== "active") {
    return pathname === "/pending" || pathname.startsWith("/api/auth")
      ? null
      : "/pending";
  }

  if (pathname === "/" || pathname === "/pending") {
    return "/today";
  }

  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return "/today";
  }

  return null;
}
