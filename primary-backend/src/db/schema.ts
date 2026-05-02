import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* -------------------- USERS -------------------- */
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
});

/* -------------------- ZAPS -------------------- */
export const zaps = pgTable("zaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  triggerId: uuid("trigger_id"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

/* -------------------- TRIGGERS -------------------- */
export const triggers = pgTable("triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapId: uuid("zap_id")
    .unique()
    .notNull()
    .references(() => zaps.id, { onDelete: "cascade" }),
  triggerId: text("trigger_id")
    .notNull()
    .references(() => availableTriggers.id),
  metadata: jsonb("metadata")
    .default(sql`'{}'::jsonb`)
    .notNull(),
});

/* -------------------- ACTIONS -------------------- */
export const actions = pgTable("actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapId: uuid("zap_id")
    .notNull()
    .references(() => zaps.id, { onDelete: "cascade" }),
  actionId: text("action_id")
    .notNull()
    .references(() => availableActions.id),
  metadata: jsonb("metadata")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  sortingOrder: integer("sorting_order").default(0).notNull(),
});

/* -------------------- AVAILABLE ACTIONS -------------------- */
export const availableActions = pgTable("available_actions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
});

/* -------------------- AVAILABLE TRIGGERS -------------------- */
export const availableTriggers = pgTable("available_triggers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
});

/* -------------------- ZAP RUN -------------------- */
export const zapRuns = pgTable("zap_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapId: uuid("zap_id")
    .notNull()
    .references(() => zaps.id, { onDelete: "cascade" }),
  metadata: jsonb("metadata").notNull(),
});

/* -------------------- OUTBOX -------------------- */
export const zapRunOutbox = pgTable("zap_run_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapRunId: uuid("zap_run_id")
    .unique()
    .notNull()
    .references(() => zapRuns.id, { onDelete: "cascade" }),
});

/* -------------------- RELATIONS -------------------- */

export const userRelations = relations(users, ({ many }) => ({
  zaps: many(zaps),
}));

export const zapRelations = relations(zaps, ({ one, many }) => ({
  user: one(users, {
    fields: [zaps.userId],
    references: [users.id],
  }),
  trigger: one(triggers),
  actions: many(actions),
  zapRuns: many(zapRuns),
}));

export const triggerRelations = relations(triggers, ({ one }) => ({
  zap: one(zaps, {
    fields: [triggers.zapId],
    references: [zaps.id],
  }),
  type: one(availableTriggers, {
    fields: [triggers.triggerId],
    references: [availableTriggers.id],
  }),
}));

export const actionRelations = relations(actions, ({ one }) => ({
  zap: one(zaps, {
    fields: [actions.zapId],
    references: [zaps.id],
  }),
  type: one(availableActions, {
    fields: [actions.actionId],
    references: [availableActions.id],
  }),
}));

export const zapRunRelations = relations(zapRuns, ({ one }) => ({
  zap: one(zaps, {
    fields: [zapRuns.zapId],
    references: [zaps.id],
  }),
  outbox: one(zapRunOutbox),
}));

export const outboxRelations = relations(zapRunOutbox, ({ one }) => ({
  zapRun: one(zapRuns, {
    fields: [zapRunOutbox.zapRunId],
    references: [zapRuns.id],
  }),
}));