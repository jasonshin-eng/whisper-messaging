import { NextRequest, NextResponse } from "next/server";
import { verifyInboxPassword, createSessionCookie } from "@/lib/auth";

// Handles traditional HTML form POST — sets cookie and redirects
export async function POST(request: NextRequest) {
  let password = "";

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    password = params.get("password") ?? "";
  } else {
    try {
      const body = await request.json();
      password = body.password ?? "";
    } catch {
      password = "";
    }
  }

  if (!password) {
    return NextResponse.redirect(new URL("/inbox?error=1", request.url), 303);
  }

  const valid = await verifyInboxPassword(password);
  if (!valid) {
    return NextResponse.redirect(new URL("/inbox?error=1", request.url), 303);
  }

  const cookie = createSessionCookie();
  const response = NextResponse.redirect(new URL("/inbox", request.url), 303);
  response.headers.set("Set-Cookie", cookie);
  return response;
}
