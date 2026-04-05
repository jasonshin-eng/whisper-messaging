import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await destroySession(request);
  const response = NextResponse.redirect(new URL("/inbox", request.url), 303);
  response.headers.set(
    "Set-Cookie",
    "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
  );
  return response;
}
