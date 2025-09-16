// Crop management API functions (Supabase via repository)
import type { InsertCrop, Crop } from "@shared/types";
import { CropRepository, type CropEntity } from "@shared/api/crop.repository";

export const cropApi = {
  getCrops: async (_search?: string): Promise<Crop[]> => {
    const repo = new CropRepository();
    // 검색 기능은 후속으로 확장. 현재는 전체 조회
    const entities: CropEntity[] = await repo.listByFarm();
    // API 레이어 타입(Crop)은 createdAt: Date|null 을 기대하므로 변환
    return entities.map((e) => ({
      id: e.id,
      userId: e.userId,
      farmId: e.farmId ?? null,
      category: e.category,
      name: e.name,
      variety: e.variety,
      status: e.status || null,
      createdAt: e.createdAt ? new Date(e.createdAt) : null,
    }));
  },

  createCrop: async (cropData: InsertCrop): Promise<Crop> => {
    const repo = new CropRepository();
    const e = await repo.create({
      name: cropData.name,
      variety: cropData.variety,
      category: cropData.category,
      farm_id: cropData.farmId ?? undefined,
    });
    return {
      id: e.id,
      userId: e.userId,
      farmId: e.farmId ?? null,
      category: e.category,
      name: e.name,
      variety: e.variety,
      status: e.status || null,
      createdAt: e.createdAt ? new Date(e.createdAt) : null,
    };
  },

  updateCrop: async (id: string, cropData: Partial<InsertCrop>): Promise<Crop> => {
    const repo = new CropRepository();
    const e = await repo.update(id, {
      name: cropData.name,
      variety: cropData.variety,
      category: cropData.category,
      farm_id: cropData.farmId ?? undefined,
      status: cropData.status ?? undefined,
    });
    return {
      id: e.id,
      userId: e.userId,
      farmId: e.farmId ?? null,
      category: e.category,
      name: e.name,
      variety: e.variety,
      status: e.status || null,
      createdAt: e.createdAt ? new Date(e.createdAt) : null,
    };
  },

  deleteCrop: async (id: string): Promise<{ success: boolean }> => {
    const repo = new CropRepository();
    await repo.remove(id);
    return { success: true };
  },
};