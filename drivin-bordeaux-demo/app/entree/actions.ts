"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";

export async function unlockDemo(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expected = process.env.DEMO_PASSWORD;

  if (!expected || password !== expected) {
    redirect(`/entree?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = createHash("sha256").update(expected).digest("hex");
  const jar = await cookies();
  jar.set("demo_access", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(next && next.startsWith("/") ? next : "/");
}
