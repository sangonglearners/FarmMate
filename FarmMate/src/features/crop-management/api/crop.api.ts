// Crop management API functions
import { apiRequest } from "@shared/api/client";
import type { Crop, InsertCrop } from "@shared/types/schema";

export const cropApi = {
  getCrops: async (search?: string): Promise<Crop[]> => {
    const url = search ? `/api/crops?search=${encodeURIComponent(search)}` : "/api/crops";
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch crops");
    return response.json();
  },

  createCrop: async (cropData: InsertCrop): Promise<Crop> => {
    const response = await apiRequest("POST", "/api/crops", cropData);
    return response.json();
  },

  updateCrop: async (id: string, cropData: Partial<InsertCrop>): Promise<Crop> => {
    const response = await apiRequest("PUT", `/api/crops/${id}`, cropData);
    return response.json();
  },

  deleteCrop: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiRequest("DELETE", `/api/crops/${id}`);
    return response.json();
  },
};