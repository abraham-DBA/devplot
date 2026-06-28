import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth-types";

// Next.js 16 proxy runs in Node.js runtime (not edge), so importing auth
// (which initialises a pg Pool) is safe — the pool is shared across requests
// via the module singleton, not re-created per request.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth.api.getSession({ headers: request.headers });

  const isAuthenticated = !!session?.user;
  const user: SessionUser | undefined = session?.user;
  const onboardingCompleted = user?.onboardingCompleted ?? false;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/onboarding");

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && !onboardingCompleted && isProtected && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isAuthenticated && onboardingCompleted && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.svg$).*)"],
};
