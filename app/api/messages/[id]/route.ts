import { NextRequest } from "next/server";
import { UpdateStatusSchema } from "@/lib/validation/message";
import { isAuthenticated } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";
import { devUpdateStatus, devDelete } from "@/lib/dev-store";

const useDb = !!process.env.DATABASE_URL;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authed = await isAuthenticated(request);
  if (!authed) return jsonError(401, "Unauthorized");

  const { id } = params;

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Validation failed");

  const { status } = parsed.data;

  if (useDb) {
    const { db } = await import("@/lib/db/client");
    const { messages } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const updated = await db.update(messages).set({ status }).where(eq(messages.id, id)).returning({ id: messages.id });
    if (updated.length === 0) return jsonError(404, "Message not found");
    return jsonOk({ id: updated[0].id, status });
  } else {
    const msg = devUpdateStatus(id, status);
    if (!msg) return jsonError(404, "Message not found");
    return jsonOk({ id: msg.id, status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authed = await isAuthenticated(request);
  if (!authed) return jsonError(401, "Unauthorized");

  const { id } = params;

  if (useDb) {
    const { db } = await import("@/lib/db/client");
    const { messages } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(messages).where(eq(messages.id, id));
    return jsonOk({ id });
  } else {
    devDelete(id);
    return jsonOk({ id });
  }
}
