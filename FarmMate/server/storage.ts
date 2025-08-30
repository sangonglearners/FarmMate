import { 
  type User, 
  type InsertUser, 
  type Farm, 
  type InsertFarm,
  type Crop,
  type InsertCrop,
  type Task,
  type InsertTask,
  type CropRecommendation,
  type InsertRecommendation,
  users,
  farms,
  crops,
  tasks,
  cropRecommendations
} from "@shared/types/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Farm methods
  getFarmsByUserId(userId: string): Promise<Farm[]>;
  getFarm(id: string): Promise<Farm | undefined>;
  createFarm(userId: string, farm: InsertFarm): Promise<Farm>;
  updateFarm(id: string, farm: Partial<InsertFarm>): Promise<Farm | undefined>;
  deleteFarm(id: string): Promise<boolean>;

  // Crop methods
  getCropsByUserId(userId: string): Promise<Crop[]>;
  getCrop(id: string): Promise<Crop | undefined>;
  createCrop(userId: string, crop: InsertCrop): Promise<Crop>;
  updateCrop(id: string, crop: Partial<InsertCrop>): Promise<Crop | undefined>;
  deleteCrop(id: string): Promise<boolean>;
  searchCrops(query: string): Promise<Crop[]>;

  // Task methods
  getTasksByUserId(userId: string): Promise<Task[]>;
  getTasksByDate(userId: string, date: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(userId: string, task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  completeTask(id: string): Promise<Task | undefined>;

  // Recommendation methods
  getRecommendationsByUserId(userId: string): Promise<CropRecommendation[]>;
  createRecommendation(userId: string, recommendation: InsertRecommendation): Promise<CropRecommendation>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private farms: Map<string, Farm>;
  private crops: Map<string, Crop>;
  private tasks: Map<string, Task>;
  private recommendations: Map<string, CropRecommendation>;

  constructor() {
    this.users = new Map();
    this.farms = new Map();
    this.crops = new Map();
    this.tasks = new Map();
    this.recommendations = new Map();

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create a sample user
    const sampleUser: User = {
      id: "user-1",
      username: "진예원",
      password: "password123"
    };
    this.users.set("user-1", sampleUser);

    // Create sample farms
    const sampleFarms: Farm[] = [
      {
        id: "farm-1",
        userId: "user-1",
        name: "노지 농장",
        environment: "노지",
        rowCount: 45,
        area: 20,
        createdAt: new Date()
      },
      {
        id: "farm-2",
        userId: "user-1",
        name: "시설농장 1",
        environment: "시설1",
        rowCount: 20,
        area: 10,
        createdAt: new Date()
      },
      {
        id: "farm-3",
        userId: "user-1",
        name: "시설농장 2",
        environment: "시설2",
        rowCount: 10,
        area: 10,
        createdAt: new Date()
      }
    ];
    sampleFarms.forEach(farm => this.farms.set(farm.id, farm));

    // Create sample crops
    const sampleCrops: Crop[] = [
      {
        id: "crop-1",
        userId: "user-1",
        farmId: "farm-1",
        category: "배추",
        name: "콜라비",
        variety: "그린",
        status: "growing",
        createdAt: new Date()
      },
      {
        id: "crop-2",
        userId: "user-1",
        farmId: "farm-2",
        category: "뿌리채소",
        name: "당근",
        variety: "퍼플",
        status: "harvesting",
        createdAt: new Date()
      },
      {
        id: "crop-3",
        userId: "user-1",
        farmId: "farm-1",
        category: "뿌리채소",
        name: "비트",
        variety: "레드",
        status: "completed",
        createdAt: new Date()
      },
      {
        id: "crop-4",
        userId: "user-1",
        farmId: "farm-2",
        category: "배추",
        name: "미니양배추",
        variety: "티아라",
        status: "growing",
        createdAt: new Date()
      }
    ];
    sampleCrops.forEach(crop => this.crops.set(crop.id, crop));

    // Create sample tasks
    const today = new Date().toISOString().split('T')[0];
    const sampleTasks: Task[] = [
      {
        id: "task-1",
        userId: "user-1",
        farmId: "farm-1",
        cropId: "crop-1",
        title: "콜라비 파종",
        description: "이랑: 1번",
        taskType: "파종",
        scheduledDate: today,
        endDate: null,
        rowNumber: 1,
        completed: 0,
        completedAt: null,
        createdAt: new Date()
      },
      {
        id: "task-2",
        userId: "user-1",
        farmId: "farm-1",
        cropId: "crop-3",
        title: "비트 수확-선별",
        description: "이랑: 2번",
        taskType: "수확-선별",
        scheduledDate: today,
        endDate: null,
        rowNumber: 2,
        completed: 0,
        completedAt: null,
        createdAt: new Date()
      },
      {
        id: "task-3",
        userId: "user-1",
        farmId: "farm-2",
        cropId: "crop-2",
        title: "당근 육묘",
        description: "이랑: 1번",
        taskType: "육묘",
        scheduledDate: today,
        endDate: null,
        rowNumber: 1,
        completed: 0,
        completedAt: null,
        createdAt: new Date()
      },
      {
        id: "task-4",
        userId: "user-1",
        farmId: "farm-1",
        cropId: "crop-4",
        title: "미니양배추 저장-포장",
        description: "이랑: 2번",
        taskType: "저장-포장",
        scheduledDate: today,
        endDate: null,
        rowNumber: 2,
        completed: 0,
        completedAt: null,
        createdAt: new Date()
      }
    ];
    sampleTasks.forEach(task => this.tasks.set(task.id, task));
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Farm methods
  async getFarmsByUserId(userId: string): Promise<Farm[]> {
    return Array.from(this.farms.values()).filter(farm => farm.userId === userId);
  }

  async getFarm(id: string): Promise<Farm | undefined> {
    return this.farms.get(id);
  }

  async createFarm(userId: string, farm: InsertFarm): Promise<Farm> {
    const id = randomUUID();
    const newFarm: Farm = { 
      ...farm, 
      id, 
      userId, 
      createdAt: new Date() 
    };
    this.farms.set(id, newFarm);
    return newFarm;
  }

  async updateFarm(id: string, farmData: Partial<InsertFarm>): Promise<Farm | undefined> {
    const existingFarm = this.farms.get(id);
    if (!existingFarm) return undefined;

    const updatedFarm: Farm = { ...existingFarm, ...farmData };
    this.farms.set(id, updatedFarm);
    return updatedFarm;
  }

  async deleteFarm(id: string): Promise<boolean> {
    return this.farms.delete(id);
  }

  // Crop methods
  async getCropsByUserId(userId: string): Promise<Crop[]> {
    return Array.from(this.crops.values()).filter(crop => crop.userId === userId);
  }

  async getCrop(id: string): Promise<Crop | undefined> {
    return this.crops.get(id);
  }

  async createCrop(userId: string, crop: InsertCrop): Promise<Crop> {
    const id = randomUUID();
    const newCrop: Crop = { 
      ...crop, 
      id, 
      userId, 
      status: crop.status || "growing",
      farmId: crop.farmId || null,
      createdAt: new Date() 
    };
    this.crops.set(id, newCrop);
    return newCrop;
  }

  async updateCrop(id: string, cropData: Partial<InsertCrop>): Promise<Crop | undefined> {
    const existingCrop = this.crops.get(id);
    if (!existingCrop) return undefined;

    const updatedCrop: Crop = { ...existingCrop, ...cropData };
    this.crops.set(id, updatedCrop);
    return updatedCrop;
  }

  async deleteCrop(id: string): Promise<boolean> {
    return this.crops.delete(id);
  }

  async searchCrops(query: string): Promise<Crop[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.crops.values()).filter(crop => 
      crop.name.toLowerCase().includes(lowercaseQuery) ||
      crop.category.toLowerCase().includes(lowercaseQuery) ||
      crop.variety.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Task methods
  async getTasksByUserId(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  async getTasksByDate(userId: string, date: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => 
      task.userId === userId && task.scheduledDate === date
    );
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(userId: string, task: InsertTask): Promise<Task> {
    const id = randomUUID();
    const newTask: Task = { 
      ...task, 
      id, 
      userId, 
      farmId: task.farmId || null,
      cropId: task.cropId || null,
      description: task.description || null,
      endDate: task.endDate || null,
      rowNumber: task.rowNumber || null,
      completed: task.completed || 0,
      completedAt: null,
      createdAt: new Date() 
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;

    const updatedTask: Task = { ...existingTask, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;

    const completedTask: Task = { ...existingTask, completedAt: new Date() };
    this.tasks.set(id, completedTask);
    return completedTask;
  }

  // Recommendation methods
  async getRecommendationsByUserId(userId: string): Promise<CropRecommendation[]> {
    return Array.from(this.recommendations.values()).filter(rec => rec.userId === userId);
  }

  async createRecommendation(userId: string, recommendation: InsertRecommendation): Promise<CropRecommendation> {
    const id = randomUUID();
    const newRecommendation: CropRecommendation = { 
      ...recommendation, 
      id, 
      userId, 
      expectedCost: recommendation.expectedCost || null,
      expectedRevenue: recommendation.expectedRevenue || null,
      laborScore: recommendation.laborScore || null,
      profitabilityScore: recommendation.profitabilityScore || null,
      rarityScore: recommendation.rarityScore || null,
      createdAt: new Date() 
    };
    this.recommendations.set(id, newRecommendation);
    return newRecommendation;
  }
}

export const storage = new MemStorage();
