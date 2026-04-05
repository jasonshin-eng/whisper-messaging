import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  scheme: text("scheme").notNull().default("sealed-box"),
  ciphertext: text("ciphertext").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status", { enum: ["new", "read", "archived"] })
    .notNull()
    .default("new"),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
