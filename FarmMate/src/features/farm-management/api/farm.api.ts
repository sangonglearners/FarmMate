// Farm management API functions (Supabase direct via repository)
import type { InsertFarm } from "@shared/types/schema";
import { FarmRepository } from "@shared/api/farm.repository";
import type { FarmEntity } from "@shared/api/farm.repository";

export const farmApi = {
  getFarms: async (): Promise<FarmEntity[]> => {
    const repo = new FarmRepository();
    return await repo.list();
  },

  createFarm: async (farmData: InsertFarm): Promise<FarmEntity> => {
    const repo = new FarmRepository();
    return await repo.create({
      name: (farmData as any).name,
      environment: farmData.environment,
      rowCount: farmData.rowCount,
      area: farmData.area,
    });
  },

  updateFarm: async (id: string, farmData: Partial<InsertFarm>): Promise<FarmEntity> => {
    const repo = new FarmRepository();
    return await repo.update(id, {
      name: (farmData as any)?.name,
      environment: farmData.environment,
      rowCount: farmData.rowCount,
      area: farmData.area,
    });
  },

  deleteFarm: async (id: string): Promise<{ success: boolean }> => {
    const repo = new FarmRepository();
    await repo.remove(id);
    return { success: true };
  },
};