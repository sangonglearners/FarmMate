// Crop management API functions (Supabase via repository)
import type { InsertCrop } from "@shared/schema";
import { CropRepository } from "@/shared/api/crop.repository";
import type { Crop } from "@shared/schema";

export const cropApi = {
  getCrops: async (_search?: string): Promise<Crop[]> => {
    const repo = new CropRepository();
    // 검색 기능은 후속으로 확장. 현재는 전체 조회
    return await repo.listByFarm();
  },

  createCrop: async (cropData: InsertCrop): Promise<Crop> => {
    const repo = new CropRepository();
    return await repo.create({
      name: cropData.name,
      variety: cropData.variety,
      category: cropData.category,
      farm_id: cropData.farmId,
    });
  },

  updateCrop: async (id: string, cropData: Partial<InsertCrop>): Promise<Crop> => {
    const repo = new CropRepository();
    return await repo.update(id, {
      name: cropData.name,
      variety: cropData.variety,
      category: cropData.category,
      farm_id: cropData.farmId,
      status: cropData.status,
    });
  },

  deleteCrop: async (id: string): Promise<{ success: boolean }> => {
    const repo = new CropRepository();
    await repo.remove(id);
    return { success: true };
  },
};