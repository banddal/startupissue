import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { destinationFor } from "@/server/auth/access";

export default auth((request) => {
  const destination = destinationFor(
    request.auth?.user
      ? {
          role: request.auth.user.role,
          status: request.auth.user.status,
        }
      : null,
    request.nextUrl.pathname,
  );

  if (!destination) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(destination, request.url));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
