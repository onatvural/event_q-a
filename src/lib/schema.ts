import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

// ─── Events ───────────────────────────────────────────────
export const events = pgTable("events", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  date: text("date").notNull(), // stored as YYYY-MM-DD
  adminPassword: text("admin_password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Speakers ─────────────────────────────────────────────
export const speakers = pgTable("speakers", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  topic: text("topic").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Questions ────────────────────────────────────────────
export const questions = pgTable("questions", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  speakerId: text("speaker_id")
    .notNull()
    .references(() => speakers.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  authorId: text("author_id").notNull(), // anonymous localStorage UUID
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Votes ────────────────────────────────────────────────
export const votes = pgTable(
  "votes",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    voterId: text("voter_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueVote: unique().on(table.questionId, table.voterId),
  })
);

// ─── Presence ─────────────────────────────────────────────
export const presence = pgTable("presence", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  lastSeen: timestamp("last_seen").defaultNow(),
});

// ─── Types ────────────────────────────────────────────────
export type Event = InferSelectModel<typeof events>;
export type Speaker = InferSelectModel<typeof speakers>;
export type Question = InferSelectModel<typeof questions>;
export type Vote = InferSelectModel<typeof votes>;
export type Presence = InferSelectModel<typeof presence>;
