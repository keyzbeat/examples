import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";

const AUTH_COOKIE = "demo_access";

function expectedToken(): string | null {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export function proxy(request: NextRequest) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (!demoMode) return NextResponse.next();

  const expected = expectedToken();
  // Pas de mot de passe configuré : on ne bloque pas le développement local.
  if (!expected) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token === expected) return NextResponse.next();

  const gateUrl = new URL("/entree", request.url);
  gateUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: [
    "/((?!entree|api/demo-auth|_next|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|glb|woff2?)$).*)",
  ],
};
