// 사용자별로 로컬 스토리지에 작물을 저장하는 함수
import { supabase } from "./supabase";

export async function saveCrop(input: {
  name: string;
  category?: string;
  variety?: string;
  status?: string;
  farmId?: string;
  sowingDate?: string;
}) {
  // 현재 로그인한 사용자 ID 가져오기
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || "anonymous-user";
  
  // 사용자별 작물 목록 키 생성
  const userCropsKey = `farmmate-crops-${userId}`;
  
  // 기존 작물 목록 가져오기
  const storedCrops = localStorage.getItem(userCropsKey);
  const crops = storedCrops ? JSON.parse(storedCrops) : [];
  
  // 새 작물 생성
  const newCrop = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // 고유 ID
    name: input.name,
    category: input.category || null,
    variety: input.variety || null,
    status: input.status || "growing",
    farmId: input.farmId || null,
    sowingDate: input.sowingDate || null,
    userId: userId,
    createdAt: new Date().toISOString(),
  };
  
  // 작물 목록에 추가
  crops.push(newCrop);
  
  // 사용자별 로컬 스토리지에 저장
  localStorage.setItem(userCropsKey, JSON.stringify(crops));
  
  return newCrop;
}

export async function updateCrop(id: string, input: {
  name: string;
  category?: string;
  variety?: string;
  status?: string;
  farmId?: string;
  sowingDate?: string;
}) {
  // 현재 로그인한 사용자 ID 가져오기
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || "anonymous-user";
  
  // 사용자별 작물 목록 키 생성
  const userCropsKey = `farmmate-crops-${userId}`;
  
  // 기존 작물 목록 가져오기
  const storedCrops = localStorage.getItem(userCropsKey);
  const crops = storedCrops ? JSON.parse(storedCrops) : [];
  
  // 해당 작물 찾기
  const cropIndex = crops.findIndex((c: any) => c.id === id);
  if (cropIndex === -1) {
    throw new Error("작물을 찾을 수 없습니다.");
  }
  
  // 작물 업데이트
  crops[cropIndex] = {
    ...crops[cropIndex],
    name: input.name,
    category: input.category || null,
    variety: input.variety || null,
    status: input.status || "growing",
    farmId: input.farmId || null,
    sowingDate: input.sowingDate || null,
  };
  
  // 로컬 스토리지에 저장
  localStorage.setItem(userCropsKey, JSON.stringify(crops));
  
  return crops[cropIndex];
}

export async function getCrops(): Promise<any[]> {
  // 현재 로그인한 사용자 ID 가져오기
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || "anonymous-user";
  
  // 사용자별 작물 목록 키 생성
  const userCropsKey = `farmmate-crops-${userId}`;
  
  // 기존 작물 목록 가져오기
  const storedCrops = localStorage.getItem(userCropsKey);
  const crops = storedCrops ? JSON.parse(storedCrops) : [];
  
  return crops;
}