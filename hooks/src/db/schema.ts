import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// User
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
});

// Zap
export const zaps = pgTable("zaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  triggerId: uuid("trigger_id"),
});

// Trigger
export const triggers = pgTable("triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapId: uuid("zap_id").unique().notNull(),
  triggerId: uuid("trigger_id").notNull(),
});

// Action
export const actions = pgTable("actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapId: uuid("zap_id").notNull(),
  actionId: uuid("action_id").notNull(),
});

// AvailableAction
export const availableActions = pgTable("available_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
});

// AvailableTrigger
export const availableTriggers = pgTable("available_triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
});

// ZapRun
export const zapRuns = pgTable("zap_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapId: uuid("zap_id").notNull(),
  metadata: jsonb("metadata").notNull(),
});

// ZapRunOutbox
export const zapRunOutbox = pgTable("zap_run_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  zapRunId: uuid("zap_run_id").unique().notNull(),
});