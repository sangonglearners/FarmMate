// Crop management API functions - 사용자별 로컬 스토리지 사용
import { getCrops } from "@shared/api/saveCrop";
import type { Crop, InsertCrop } from "@shared/types/schema";

export const cropApi = {
  getCrops: async (search?: string): Promise<Crop[]> => {
    const crops = await getCrops();
    if (search) {
      return crops.filter(crop => 
        crop.name.toLowerCase().includes(search.toLowerCase()) ||
        crop.category?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return crops;
  },

  createCrop: async (cropData: InsertCrop): Promise<Crop> => {
    // 이 함수는 더 이상 사용되지 않음 - saveCrop을 직접 사용
    throw new Error("createCrop은 더 이상 사용되지 않습니다. saveCrop을 사용하세요.");
  },

  updateCrop: async (id: string, cropData: Partial<InsertCrop>): Promise<Crop> => {
    // 이 함수는 더 이상 사용되지 않음 - updateCrop을 직접 사용
    throw new Error("updateCrop은 더 이상 사용되지 않습니다. updateCrop을 직접 사용하세요.");
  },

  deleteCrop: async (id: string): Promise<{ success: boolean }> => {
    // 이 함수는 더 이상 사용되지 않음 - 로컬 스토리지에서 직접 삭제
    throw new Error("deleteCrop은 더 이상 사용되지 않습니다. 로컬 스토리지에서 직접 삭제하세요.");
  },
};