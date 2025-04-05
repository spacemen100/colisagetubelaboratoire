import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  barcode: text("barcode").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Laboratory model
export const laboratories = pgTable("laboratories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
});

export const insertLabSchema = createInsertSchema(laboratories).omit({
  id: true,
});

// Temperature requirement enum
export const temperatureTypes = ["ambient", "cold", "frozen"] as const;
export const temperatureSchema = z.enum(temperatureTypes);
export type TemperatureType = z.infer<typeof temperatureSchema>;

// Sample tube model
export const tubes = pgTable("tubes", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(),
  type: text("type").notNull(),
  patientId: text("patient_id").notNull(),
  collectionDate: timestamp("collection_date").notNull(),
  temperatureRequirement: text("temperature_requirement").notNull(),
  boxId: integer("box_id"),
  status: text("status").notNull().default("pending"),
  labId: integer("lab_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertTubeSchema = createInsertSchema(tubes).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
  boxId: true,
  status: true,
});

// Box model for transport
export const boxes = pgTable("boxes", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(),
  temperatureType: text("temperature_type").notNull(),
  status: text("status").notNull().default("open"),
  sourceLabId: integer("source_lab_id").notNull(),
  destinationLabId: integer("destination_lab_id"),
  tubeCount: integer("tube_count").notNull().default(0),
  pickupDate: timestamp("pickup_date"),
  deliveryDate: timestamp("delivery_date"),
  transporterId: text("transporter_id"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertBoxSchema = createInsertSchema(boxes).omit({
  id: true,
  tubeCount: true,
  createdAt: true,
  lastUpdated: true,
  pickupDate: true,
  deliveryDate: true,
  transporterId: true,
});

// Alert model
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("warning"),
  tubeId: integer("tube_id"),
  boxId: integer("box_id"),
  labId: integer("lab_id").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  resolved: true,
});

// Activity log model
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  details: jsonb("details"),
  userId: integer("user_id").notNull(),
  labId: integer("lab_id").notNull(),
  tubeId: integer("tube_id"),
  boxId: integer("box_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLab = z.infer<typeof insertLabSchema>;
export type Lab = typeof laboratories.$inferSelect;

export type InsertTube = z.infer<typeof insertTubeSchema>;
export type Tube = typeof tubes.$inferSelect;

export type InsertBox = z.infer<typeof insertBoxSchema>;
export type Box = typeof boxes.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Stats types for dashboard
export type DashboardStats = {
  pendingSamples: number;
  readyBoxes: number;
  inTransit: number;
  activeAlerts: number;
  ambientTubes: number;
  ambientBoxes: number;
  ambientInTransit: number;
  coldTubes: number;
  coldBoxes: number;
  coldInTransit: number;
  frozenTubes: number;
  frozenBoxes: number;
  frozenInTransit: number;
};

export type RecentBox = {
  id: number;
  code: string;
  type: TemperatureType;
  status: string;
  content: string;
};

export type RecentActivity = {
  id: number;
  type: string;
  message: string;
  time: string;
  user: string;
  icon: string;
  iconBgColor: string;
};
