import type { Task, InsertTask } from "@shared/types/schema";
import { apiRequest } from "./client";

export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    const res = await apiRequest("GET", "/api/tasks");
    return res.json();
  },

  getTasksByDate: async (date: string): Promise<Task[]> => {
    const res = await apiRequest("GET", `/api/tasks?date=${date}`);
    return res.json();
  },

  createTask: async (task: InsertTask): Promise<Task> => {
    const res = await apiRequest("POST", "/api/tasks", task);
    return res.json();
  },

  updateTask: async (id: string, task: Partial<InsertTask>): Promise<Task> => {
    const res = await apiRequest("PUT", `/api/tasks/${id}`, task);
    return res.json();
  },

  completeTask: async (id: string): Promise<Task> => {
    const res = await apiRequest("POST", `/api/tasks/${id}/complete`);
    return res.json();
  },

  deleteTask: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks/${id}`);
  },
};