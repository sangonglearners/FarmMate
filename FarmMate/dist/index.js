// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  farms;
  crops;
  tasks;
  recommendations;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.farms = /* @__PURE__ */ new Map();
    this.crops = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Map();
    this.recommendations = /* @__PURE__ */ new Map();
    this.initializeSampleData();
  }
  initializeSampleData() {
    const sampleUser = {
      id: "user-1",
      username: "\uC9C4\uC608\uC6D0",
      password: "password123"
    };
    this.users.set("user-1", sampleUser);
    const sampleFarms = [
      {
        id: "farm-1",
        userId: "user-1",
        name: "\uB178\uC9C0 \uB18D\uC7A5",
        environment: "\uB178\uC9C0",
        rowCount: 45,
        area: 20,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "farm-2",
        userId: "user-1",
        name: "\uC2DC\uC124\uB18D\uC7A5 1",
        environment: "\uC2DC\uC1241",
        rowCount: 20,
        area: 10,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "farm-3",
        userId: "user-1",
        name: "\uC2DC\uC124\uB18D\uC7A5 2",
        environment: "\uC2DC\uC1242",
        rowCount: 10,
        area: 10,
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
    sampleFarms.forEach((farm) => this.farms.set(farm.id, farm));
    const sampleCrops = [
      {
        id: "crop-1",
        userId: "user-1",
        farmId: "farm-1",
        category: "\uBC30\uCD94",
        name: "\uCF5C\uB77C\uBE44",
        variety: "\uADF8\uB9B0",
        status: "growing",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "crop-2",
        userId: "user-1",
        farmId: "farm-2",
        category: "\uBFCC\uB9AC\uCC44\uC18C",
        name: "\uB2F9\uADFC",
        variety: "\uD37C\uD50C",
        status: "harvesting",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "crop-3",
        userId: "user-1",
        farmId: "farm-1",
        category: "\uBFCC\uB9AC\uCC44\uC18C",
        name: "\uBE44\uD2B8",
        variety: "\uB808\uB4DC",
        status: "completed",
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "crop-4",
        userId: "user-1",
        farmId: "farm-2",
        category: "\uBC30\uCD94",
        name: "\uBBF8\uB2C8\uC591\uBC30\uCD94",
        variety: "\uD2F0\uC544\uB77C",
        status: "growing",
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
    sampleCrops.forEach((crop) => this.crops.set(crop.id, crop));
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const sampleTasks = [
      {
        id: "task-1",
        userId: "user-1",
        farmId: "farm-1",
        cropId: "crop-1",
        title: "\uCF5C\uB77C\uBE44 \uD30C\uC885",
        description: "\uC774\uB791: 1\uBC88",
        taskType: "\uD30C\uC885",
        scheduledDate: today,
        endDate: null,
        completed: 0,
        completedAt: null,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "task-2",
        userId: "user-1",
        farmId: "farm-1",
        cropId: "crop-3",
        title: "\uBE44\uD2B8 \uC218\uD655-\uC120\uBCC4",
        description: "\uC774\uB791: 2\uBC88",
        taskType: "\uC218\uD655-\uC120\uBCC4",
        scheduledDate: today,
        endDate: null,
        completed: 0,
        completedAt: null,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "task-3",
        userId: "user-1",
        farmId: "farm-2",
        cropId: "crop-2",
        title: "\uB2F9\uADFC \uC721\uBB18",
        description: "\uC774\uB791: 1\uBC88",
        taskType: "\uC721\uBB18",
        scheduledDate: today,
        endDate: null,
        completed: 0,
        completedAt: null,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: "task-4",
        userId: "user-1",
        farmId: "farm-1",
        cropId: "crop-4",
        title: "\uBBF8\uB2C8\uC591\uBC30\uCD94 \uC800\uC7A5-\uD3EC\uC7A5",
        description: "\uC774\uB791: 2\uBC88",
        taskType: "\uC800\uC7A5-\uD3EC\uC7A5",
        scheduledDate: today,
        endDate: null,
        completed: 0,
        completedAt: null,
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
    sampleTasks.forEach((task) => this.tasks.set(task.id, task));
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Farm methods
  async getFarmsByUserId(userId) {
    return Array.from(this.farms.values()).filter((farm) => farm.userId === userId);
  }
  async getFarm(id) {
    return this.farms.get(id);
  }
  async createFarm(userId, farm) {
    const id = randomUUID();
    const newFarm = {
      ...farm,
      id,
      userId,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.farms.set(id, newFarm);
    return newFarm;
  }
  async updateFarm(id, farmData) {
    const existingFarm = this.farms.get(id);
    if (!existingFarm) return void 0;
    const updatedFarm = { ...existingFarm, ...farmData };
    this.farms.set(id, updatedFarm);
    return updatedFarm;
  }
  async deleteFarm(id) {
    return this.farms.delete(id);
  }
  // Crop methods
  async getCropsByUserId(userId) {
    return Array.from(this.crops.values()).filter((crop) => crop.userId === userId);
  }
  async getCrop(id) {
    return this.crops.get(id);
  }
  async createCrop(userId, crop) {
    const id = randomUUID();
    const newCrop = {
      ...crop,
      id,
      userId,
      status: crop.status || "growing",
      createdAt: /* @__PURE__ */ new Date()
    };
    this.crops.set(id, newCrop);
    return newCrop;
  }
  async updateCrop(id, cropData) {
    const existingCrop = this.crops.get(id);
    if (!existingCrop) return void 0;
    const updatedCrop = { ...existingCrop, ...cropData };
    this.crops.set(id, updatedCrop);
    return updatedCrop;
  }
  async deleteCrop(id) {
    return this.crops.delete(id);
  }
  async searchCrops(query) {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.crops.values()).filter(
      (crop) => crop.name.toLowerCase().includes(lowercaseQuery) || crop.category.toLowerCase().includes(lowercaseQuery) || crop.variety.toLowerCase().includes(lowercaseQuery)
    );
  }
  // Task methods
  async getTasksByUserId(userId) {
    return Array.from(this.tasks.values()).filter((task) => task.userId === userId);
  }
  async getTasksByDate(userId, date2) {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId && task.scheduledDate === date2
    );
  }
  async getTask(id) {
    return this.tasks.get(id);
  }
  async createTask(userId, task) {
    const id = randomUUID();
    const newTask = {
      ...task,
      id,
      userId,
      completed: task.completed || 0,
      completedAt: null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.tasks.set(id, newTask);
    return newTask;
  }
  async updateTask(id, taskData) {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return void 0;
    const updatedTask = { ...existingTask, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  async deleteTask(id) {
    return this.tasks.delete(id);
  }
  async completeTask(id) {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return void 0;
    const completedTask = { ...existingTask, completedAt: /* @__PURE__ */ new Date() };
    this.tasks.set(id, completedTask);
    return completedTask;
  }
  // Recommendation methods
  async getRecommendationsByUserId(userId) {
    return Array.from(this.recommendations.values()).filter((rec) => rec.userId === userId);
  }
  async createRecommendation(userId, recommendation) {
    const id = randomUUID();
    const newRecommendation = {
      ...recommendation,
      id,
      userId,
      expectedCost: recommendation.expectedCost || null,
      expectedRevenue: recommendation.expectedRevenue || null,
      laborScore: recommendation.laborScore || null,
      profitabilityScore: recommendation.profitabilityScore || null,
      rarityScore: recommendation.rarityScore || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.recommendations.set(id, newRecommendation);
    return newRecommendation;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var farms = pgTable("farms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  environment: text("environment").notNull(),
  // 노지, 시설, 기타
  rowCount: integer("row_count").notNull(),
  area: integer("area").notNull(),
  // in m²
  createdAt: timestamp("created_at").defaultNow()
});
var crops = pgTable("crops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  farmId: varchar("farm_id"),
  category: text("category").notNull(),
  // 배추, 뿌리채소 등
  name: text("name").notNull(),
  // 콜라비, 당근, 비트 등
  variety: text("variety").notNull(),
  // 그린, 퍼플, 레드 등
  status: text("status").default("growing"),
  // growing, harvesting, completed
  createdAt: timestamp("created_at").defaultNow()
});
var tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  farmId: varchar("farm_id"),
  cropId: varchar("crop_id"),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(),
  // 파종, 육묘, 수확-선별, 저장-포장 등
  scheduledDate: date("scheduled_date").notNull(),
  endDate: date("end_date"),
  completed: integer("completed").notNull().default(0),
  // 0: 미완료, 1: 완료
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var cropRecommendations = pgTable("crop_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  environment: text("environment").notNull(),
  season: text("season").notNull(),
  recommendedCrops: jsonb("recommended_crops").notNull(),
  // Array of crop objects
  expectedCost: integer("expected_cost"),
  expectedRevenue: integer("expected_revenue"),
  laborScore: integer("labor_score"),
  profitabilityScore: integer("profitability_score"),
  rarityScore: integer("rarity_score"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertFarmSchema = createInsertSchema(farms).omit({
  id: true,
  userId: true,
  createdAt: true
});
var insertCropSchema = createInsertSchema(crops).omit({
  id: true,
  userId: true,
  createdAt: true
});
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
  completedAt: true
});
var insertRecommendationSchema = createInsertSchema(cropRecommendations).omit({
  id: true,
  userId: true,
  createdAt: true
});

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/farms", async (req, res) => {
    try {
      const userId = "user-1";
      const farms2 = await storage.getFarmsByUserId(userId);
      res.json(farms2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch farms" });
    }
  });
  app2.post("/api/farms", async (req, res) => {
    try {
      const userId = "user-1";
      const farmData = insertFarmSchema.parse(req.body);
      const farm = await storage.createFarm(userId, farmData);
      res.json(farm);
    } catch (error) {
      res.status(400).json({ error: "Invalid farm data" });
    }
  });
  app2.put("/api/farms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const farmData = insertFarmSchema.partial().parse(req.body);
      const farm = await storage.updateFarm(id, farmData);
      if (!farm) {
        return res.status(404).json({ error: "Farm not found" });
      }
      res.json(farm);
    } catch (error) {
      res.status(400).json({ error: "Invalid farm data" });
    }
  });
  app2.delete("/api/farms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteFarm(id);
      if (!success) {
        return res.status(404).json({ error: "Farm not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete farm" });
    }
  });
  app2.get("/api/crops", async (req, res) => {
    try {
      const userId = "user-1";
      const { search } = req.query;
      let crops2;
      if (search) {
        crops2 = await storage.searchCrops(search);
        crops2 = crops2.filter((crop) => crop.userId === userId);
      } else {
        crops2 = await storage.getCropsByUserId(userId);
      }
      res.json(crops2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch crops" });
    }
  });
  app2.post("/api/crops", async (req, res) => {
    try {
      const userId = "user-1";
      const cropData = insertCropSchema.parse(req.body);
      const crop = await storage.createCrop(userId, cropData);
      res.json(crop);
    } catch (error) {
      res.status(400).json({ error: "Invalid crop data" });
    }
  });
  app2.put("/api/crops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cropData = insertCropSchema.partial().parse(req.body);
      const crop = await storage.updateCrop(id, cropData);
      if (!crop) {
        return res.status(404).json({ error: "Crop not found" });
      }
      res.json(crop);
    } catch (error) {
      res.status(400).json({ error: "Invalid crop data" });
    }
  });
  app2.delete("/api/crops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCrop(id);
      if (!success) {
        return res.status(404).json({ error: "Crop not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete crop" });
    }
  });
  app2.get("/api/tasks", async (req, res) => {
    try {
      const userId = "user-1";
      const { date: date2 } = req.query;
      let tasks2;
      if (date2) {
        tasks2 = await storage.getTasksByDate(userId, date2);
      } else {
        tasks2 = await storage.getTasksByUserId(userId);
      }
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const userId = "user-1";
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(userId, taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });
  app2.put("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });
  app2.post("/api/tasks/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.completeTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete task" });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });
  app2.get("/api/recommendations", async (req, res) => {
    try {
      const userId = "user-1";
      const recommendations = await storage.getRecommendationsByUserId(userId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });
  app2.post("/api/recommendations", async (req, res) => {
    try {
      const userId = "user-1";
      const recommendationData = insertRecommendationSchema.parse(req.body);
      const sampleRecommendation = {
        ...recommendationData,
        recommendedCrops: [
          {
            name: "\uCF69_\uC644\uB450 (\uC288\uAC00\uC564)",
            expectedYield: 30,
            expectedRevenue: 5e5,
            seedCost: 3e5,
            netProfit: 2e5
          },
          {
            name: "\uBC30\uCD94_\uCF5C\uB77C\uBE44 (\uADF8\uB9B0)",
            expectedYield: 15,
            expectedRevenue: 25e4,
            seedCost: 17e4,
            netProfit: 8e4
          }
        ],
        expectedCost: 25e4,
        expectedRevenue: 6e5,
        laborScore: 20,
        profitabilityScore: 16.6,
        rarityScore: 15
      };
      const recommendation = await storage.createRecommendation(userId, sampleRecommendation);
      res.json(recommendation);
    } catch (error) {
      res.status(400).json({ error: "Invalid recommendation data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var NODE_ENV = process.env.NODE_ENV || "production";
var PORT = parseInt(process.env.PORT || "5000", 10);
var HOST = process.env.HOST || "0.0.0.0";
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = NODE_ENV;
}
console.log("\u{1F680} Starting \uCC44\uC18C\uC0DD\uD65C Smart Agriculture Platform");
console.log(`Environment: ${NODE_ENV}`);
console.log(`Port: ${PORT}`);
console.log(`Host: ${HOST}`);
console.log(`Process ID: ${process.pid}`);
console.log(`Node Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log("==================================================");
var app = express2();
app.set("trust proxy", 1);
app.disable("x-powered-by");
if (NODE_ENV === "production") {
  app.set("view cache", true);
  app.set("case sensitive routing", true);
  app.set("strict routing", true);
}
app.use((req, res, next) => {
  if (NODE_ENV === "production") {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  next();
});
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: false, limit: "10mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", {
    message: error.message,
    stack: error.stack,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  setTimeout(() => process.exit(1), 100);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", {
    reason,
    promise,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  setTimeout(() => process.exit(1), 100);
});
var isShuttingDown = false;
var gracefulShutdown = (signal) => {
  if (isShuttingDown) {
    console.log(`Force shutdown on second ${signal}`);
    process.exit(1);
  }
  isShuttingDown = true;
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  setTimeout(() => {
    console.log("Graceful shutdown completed");
    process.exit(0);
  }, 5e3);
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("warning", (warning) => {
  console.warn("Process Warning:", {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});
(async () => {
  try {
    log("Starting application initialization...");
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      });
    });
    app.get("/ready", (req, res) => {
      res.status(200).json({
        status: "ready",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: NODE_ENV
      });
    });
    const server = await registerRoutes(app);
    log("Routes registered successfully");
    app.use((err, req, res, next) => {
      const status = err.status || err.statusCode || 500;
      const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message || "Internal Server Error";
      console.error("Error occurred:", {
        status,
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.status(status).json({ message });
      if (process.env.NODE_ENV !== "production") {
        throw err;
      }
    });
    const isProduction = NODE_ENV === "production";
    if (!isProduction) {
      log("Setting up development environment with Vite");
      await setupVite(app, server);
    } else {
      log("Setting up production environment with static files");
      serveStatic(app);
    }
    const startServer = () => {
      return new Promise((resolve, reject) => {
        const serverInstance = server.listen({
          port: PORT,
          host: HOST,
          reusePort: true
        }, () => {
          console.log("==================================================");
          console.log("\u2705 Server Status: RUNNING");
          console.log(`\u{1F310} Server URL: http://${HOST}:${PORT}`);
          console.log(`\u{1F3E5} Health Check: http://${HOST}:${PORT}/health`);
          console.log(`\u{1F4CA} Environment: ${NODE_ENV}`);
          console.log("==================================================");
          log(`Server successfully started on port ${PORT} in ${NODE_ENV} mode`);
          log("Application initialization completed successfully");
          if (process.send) {
            process.send("ready");
          }
          process.nextTick(() => {
            console.log("\u{1F389} \uCC44\uC18C\uC0DD\uD65C Platform is ready to serve requests!");
          });
          resolve();
        });
        serverInstance.on("error", (error) => {
          console.error("==================================================");
          console.error("\u274C Server startup failed");
          if (error.code === "EADDRINUSE") {
            console.error(`Port ${PORT} is already in use`);
            console.error(`Try using a different port by setting PORT environment variable`);
          } else if (error.code === "EACCES") {
            console.error(`Permission denied to bind to port ${PORT}`);
            console.error(`Try using a port number above 1024`);
          } else {
            console.error("Server error details:", {
              code: error.code,
              message: error.message,
              stack: error.stack
            });
          }
          console.error("==================================================");
          reject(error);
        });
        serverInstance.on("close", () => {
          console.log("Server connection closed");
        });
      });
    };
    await startServer();
  } catch (error) {
    console.error("==================================================");
    console.error("\u274C APPLICATION STARTUP FAILED");
    console.error("==================================================");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: NODE_ENV,
      port: PORT,
      host: HOST
    });
    console.error("==================================================");
    if (NODE_ENV === "production") {
      console.error("Production startup failure - attempting cleanup...");
      setTimeout(() => {
        console.error("Exiting after cleanup timeout");
        process.exit(1);
      }, 2e3);
    } else {
      process.exit(1);
    }
  }
})();
