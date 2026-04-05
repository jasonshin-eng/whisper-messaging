/**
 * File-backed message store used when DATABASE_URL is not set.
 * Persists messages to .dev-messages.json so they survive server restarts.
 */

import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), ".dev-messages.json");

export interface DevMessage {
  id: string;
  ciphertext: string;
  receivedAt: string;
  status: string;
}

function load(): Record<string, DevMessage> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    }
  } catch { /* corrupt file — start fresh */ }

  // Seed with test message on first run
  const seed: Record<string, DevMessage> = {
    "dev-seed-001": {
      id: "dev-seed-001",
      ciphertext:
        "rCmq6BWKIXuDj//I+UOGYNIbQdC95CiLtBhTH1R1RyuFEyy/vm/jN6NqPWYgwAP5jX0o982nlxQ/JQZl/ENBpfYtSzG3sZtr/AqoL1xFfyAOUrtVdZDiKislYrKa6+gM178ymvMAeWlxt4/FsxXAYAwD4NrPbtC2dQK+bEmiDiokCIoPIH9485vkVpkKhb6kUzBhea0pWDGJSThYXowKDm2cRhpwsHDYZvp4GWQ7MEUngkmNtUhYpTna",
      receivedAt: "2026-04-03T10:00:00.000Z",
      status: "new",
    },
  };
  save(seed);
  return seed;
}

function save(store: Record<string, DevMessage>) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function devList(): DevMessage[] {
  const store = load();
  return Object.values(store).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

export function devInsert(id: string, ciphertext: string): DevMessage {
  const store = load();
  const msg: DevMessage = { id, ciphertext, receivedAt: new Date().toISOString(), status: "new" };
  store[id] = msg;
  save(store);
  return msg;
}

export function devUpdateStatus(id: string, status: string): DevMessage | null {
  const store = load();
  if (!store[id]) return null;
  store[id].status = status;
  save(store);
  return store[id];
}

export function devDelete(id: string): boolean {
  const store = load();
  if (!store[id]) return false;
  delete store[id];
  save(store);
  return true;
}
