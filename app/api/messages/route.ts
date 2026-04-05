import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { SubmitMessageSchema } from "@/lib/validation/message";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAuthenticated } from "@/lib/auth";
import { getClientIp, jsonError, jsonOk } from "@/lib/utils";
import { devInsert, devList } from "@/lib/dev-store";

const MAX_BODY_BYTES = 15_000;
const useDb = !!process.env.DATABASE_URL;

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return jsonError(413, "Request body too large");
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(ip);

  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return jsonError(413, "Request body too large");
    body = JSON.parse(text);
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = SubmitMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Validation failed");
  }

  const { ciphertext } = parsed.data;
  const id = nanoid();

  if (useDb) {
    const { db } = await import("@/lib/db/client");
    const { messages } = await import("@/lib/db/schema");
    await db.insert(messages).values({ id, ciphertext });
  } else {
    devInsert(id, ciphertext);
  }

  return jsonOk({ id }, 201);
}

export async function GET(request: NextRequest) {
  const authed = await isAuthenticated(request);
  if (!authed) return jsonError(401, "Unauthorized");

  if (!useDb) {
    return jsonOk({ messages: devList() });
  }

  try {
    const { db } = await import("@/lib/db/client");
    const { messages } = await import("@/lib/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db.select().from(messages).orderBy(desc(messages.receivedAt)).limit(200);
    return jsonOk({ messages: rows });
  } catch {
    return jsonOk({ messages: [] });
  }
}
