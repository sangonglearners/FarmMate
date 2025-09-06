// Farm management API functions - 사용자별 로컬 스토리지 사용
import { getFarms } from "@shared/api/saveFarm";
import type { Farm, InsertFarm } from "@shared/types/schema";

export const farmApi = {
  getFarms: async (): Promise<Farm[]> => {
    return getFarms();
  },

  createFarm: async (farmData: InsertFarm): Promise<Farm> => {
    // 이 함수는 더 이상 사용되지 않음 - saveFarm을 직접 사용
    throw new Error("createFarm은 더 이상 사용되지 않습니다. saveFarm을 사용하세요.");
  },

  updateFarm: async (id: string, farmData: Partial<InsertFarm>): Promise<Farm> => {
    // 이 함수는 더 이상 사용되지 않음 - updateFarm을 직접 사용
    throw new Error("updateFarm은 더 이상 사용되지 않습니다. updateFarm을 직접 사용하세요.");
  },

  deleteFarm: async (id: string): Promise<{ success: boolean }> => {
    // 이 함수는 더 이상 사용되지 않음 - 로컬 스토리지에서 직접 삭제
    throw new Error("deleteFarm은 더 이상 사용되지 않습니다. 로컬 스토리지에서 직접 삭제하세요.");
  },
};