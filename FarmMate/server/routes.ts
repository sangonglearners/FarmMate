import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertFarmSchema, 
  insertCropSchema, 
  insertTaskSchema,
  insertRecommendationSchema 
} from "@shared/types/schema";
// Auth imports removed

export async function registerRoutes(app: Express): Promise<Server> {
  // Farm routes
  app.get("/api/farms", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const farms = await storage.getFarmsByUserId(userId);
      res.json(farms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch farms" });
    }
  });

  app.post("/api/farms", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const farmData = insertFarmSchema.parse(req.body);
      const farm = await storage.createFarm(userId, farmData);
      res.json(farm);
    } catch (error) {
      res.status(400).json({ error: "Invalid farm data" });
    }
  });

  app.put("/api/farms/:id", async (req, res) => {
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

  app.delete("/api/farms/:id", async (req, res) => {
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

  // Crop routes
  app.get("/api/crops", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const { search } = req.query;
      
      let crops;
      if (search) {
        crops = await storage.searchCrops(search as string);
        crops = crops.filter(crop => crop.userId === userId);
      } else {
        crops = await storage.getCropsByUserId(userId);
      }
      res.json(crops);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch crops" });
    }
  });

  app.post("/api/crops", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const cropData = insertCropSchema.parse(req.body);
      const crop = await storage.createCrop(userId, cropData);
      res.json(crop);
    } catch (error) {
      res.status(400).json({ error: "Invalid crop data" });
    }
  });

  app.put("/api/crops/:id", async (req, res) => {
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

  app.delete("/api/crops/:id", async (req, res) => {
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

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      // 헤더에서 사용자 ID 가져오기 (Supabase 인증 토큰에서 추출하거나 임시로 헤더 사용)
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const { date } = req.query;
      
      let tasks;
      if (date) {
        tasks = await storage.getTasksByDate(userId, date as string);
      } else {
        tasks = await storage.getTasksByUserId(userId);
      }
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(userId, taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
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

  app.delete("/api/tasks/:id", async (req, res) => {
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

  app.post("/api/tasks/:id/complete", async (req, res) => {
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

  app.delete("/api/tasks/:id", async (req, res) => {
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

  // Auth routes removed

  // Recommendation routes
  app.get("/api/recommendations", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const recommendations = await storage.getRecommendationsByUserId(userId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "anonymous";
      const recommendationData = insertRecommendationSchema.parse(req.body);
      
      // Generate sample recommendation data
      const sampleRecommendation = {
        ...recommendationData,
        recommendedCrops: [
          {
            name: "콩_완두 (슈가앤)",
            expectedYield: 30,
            expectedRevenue: 500000,
            seedCost: 300000,
            netProfit: 200000
          },
          {
            name: "배추_콜라비 (그린)",
            expectedYield: 15,
            expectedRevenue: 250000,
            seedCost: 170000,
            netProfit: 80000
          }
        ],
        expectedCost: 250000,
        expectedRevenue: 600000,
        laborScore: 20,
        profitabilityScore: 16.6,
        rarityScore: 15.0
      };
      
      const recommendation = await storage.createRecommendation(userId, sampleRecommendation);
      res.json(recommendation);
    } catch (error) {
      res.status(400).json({ error: "Invalid recommendation data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
