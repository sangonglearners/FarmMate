// Farm management API functions
import { apiRequest } from "@shared/api/client";
import type { Farm, InsertFarm } from "@shared/types/schema";

export const farmApi = {
  getFarms: async (): Promise<Farm[]> => {
    const response = await fetch("/api/farms");
    if (!response.ok) throw new Error("Failed to fetch farms");
    return response.json();
  },

  createFarm: async (farmData: InsertFarm): Promise<Farm> => {
    const response = await apiRequest("POST", "/api/farms", farmData);
    return response.json();
  },

  updateFarm: async (id: string, farmData: Partial<InsertFarm>): Promise<Farm> => {
    const response = await apiRequest("PUT", `/api/farms/${id}`, farmData);
    return response.json();
  },

  deleteFarm: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiRequest("DELETE", `/api/farms/${id}`);
    return response.json();
  },
};