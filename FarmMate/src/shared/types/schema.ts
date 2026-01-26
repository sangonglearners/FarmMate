import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Farms table
export const farms = pgTable("farms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  environment: text("environment").notNull(), // 노지, 시설, 기타
  rowCount: integer("row_count").notNull(),
  area: integer("area").notNull(), // in m²
  createdAt: timestamp("created_at").defaultNow(),
});

// Crops table
export const crops = pgTable("crops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  farmId: varchar("farm_id"),
  category: text("category").notNull(), // 배추, 뿌리채소 등
  name: text("name").notNull(), // 콜라비, 당근, 비트 등
  variety: text("variety").notNull(), // 그린, 퍼플, 레드 등
  status: text("status").default("growing"), // growing, harvesting, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  farmId: varchar("farm_id"),
  cropId: varchar("crop_id"),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // 파종, 육묘, 수확-선별, 저장-포장 등
  scheduledDate: date("scheduled_date").notNull(),
  endDate: date("end_date"),
  rowNumber: integer("row_number"), // 이랑 번호
  taskGroupId: varchar("task_group_id"), // 작업 그룹 ID (같은 그룹의 작업들을 연결)
  completed: integer("completed").notNull().default(0), // 0: 미완료, 1: 완료
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Crop recommendations table
export const cropRecommendations = pgTable("crop_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  environment: text("environment").notNull(),
  season: text("season").notNull(),
  recommendedCrops: jsonb("recommended_crops").notNull(), // Array of crop objects
  expectedCost: integer("expected_cost"),
  expectedRevenue: integer("expected_revenue"),
  laborScore: integer("labor_score"),
  profitabilityScore: integer("profitability_score"),
  rarityScore: integer("rarity_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ledgers table (장부)
export const ledgers = pgTable("ledgers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  taskId: varchar("task_id"), // tasks 테이블 FK - 연동 핵심
  revenueAmount: integer("revenue_amount"), // 총 매출액
  harvestQuantity: integer("harvest_quantity"), // 수확량
  harvestUnit: text("harvest_unit"), // 수확 단위 - kg, g, box, 포대, 근 등
  qualityGrade: text("quality_grade"), // 품질 등급 - 최상, 상, 중, 하
  salesChannel: text("sales_channel"), // 판매처
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expense items table (비용 항목)
export const expenseItems = pgTable("expense_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ledgerId: varchar("ledger_id").notNull(), // ledgers 테이블 FK
  category: text("category").notNull(), // 비용 카테고리명 - 종자/묘목비, 비료/퇴비, 농약/방제비, 인건비(외부인력), 자재비(비닐, 지주대 등), 기계/유류비, 기타
  cost: integer("cost").notNull(), // 해당 카테고리 비용
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFarmSchema = createInsertSchema(farms).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertCropSchema = createInsertSchema(crops).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
  completedAt: true,
});

export const insertRecommendationSchema = createInsertSchema(cropRecommendations).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertLedgerSchema = createInsertSchema(ledgers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseItemSchema = createInsertSchema(expenseItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type Farm = typeof farms.$inferSelect;

export type InsertCrop = z.infer<typeof insertCropSchema>;
export type Crop = typeof crops.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type CropRecommendation = typeof cropRecommendations.$inferSelect;

export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type Ledger = typeof ledgers.$inferSelect;

export type InsertExpenseItem = z.infer<typeof insertExpenseItemSchema>;
export type ExpenseItem = typeof expenseItems.$inferSelect;
