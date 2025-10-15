// 사용자별로 로컬 스토리지에 농장을 저장하는 함수
import { supabase } from "./supabase";

export async function saveFarm(input: {
  name: string;
  environment?: string;
  rowCount?: number;
  area?: number;
}) {
  // 현재 로그인한 사용자 ID 가져오기
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || "anonymous-user";
  
  // 사용자별 농장 목록 키 생성
  const userFarmsKey = `farmmate-farms-${userId}`;
  
  // 기존 농장 목록 가져오기
  const storedFarms = localStorage.getItem(userFarmsKey);
  const farms = storedFarms ? JSON.parse(storedFarms) : [];
  
  // 중복 검사 (공백 트림, 대소문자 무시)
  const normalizedName = input.name.trim().toLowerCase();
  const isDuplicate = farms.some((existingFarm: any) => 
    existingFarm.name.trim().toLowerCase() === normalizedName
  );
  
  if (isDuplicate) {
    throw new Error("이미 등록된 이름입니다.");
  }
  
  // 새 농장 생성
  const newFarm = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // 고유 ID
    name: input.name,
    environment: input.environment || null,
    rowCount: input.rowCount || null,
    area: input.area || null,
    userId: userId,
    createdAt: new Date().toISOString(),
  };
  
  // 농장 목록에 추가
  farms.push(newFarm);
  
  // 사용자별 로컬 스토리지에 저장
  localStorage.setItem(userFarmsKey, JSON.stringify(farms));
  
  return newFarm;
}

export async function updateFarm(id: string, input: {
  name: string;
  environment?: string;
  rowCount?: number;
  area?: number;
}) {
  // 현재 로그인한 사용자 ID 가져오기
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || "anonymous-user";
  
  // 사용자별 농장 목록 키 생성
  const userFarmsKey = `farmmate-farms-${userId}`;
  
  // 기존 농장 목록 가져오기
  const storedFarms = localStorage.getItem(userFarmsKey);
  const farms = storedFarms ? JSON.parse(storedFarms) : [];
  
  // 해당 농장 찾기
  const farmIndex = farms.findIndex((f: any) => f.id === id);
  if (farmIndex === -1) {
    throw new Error("농장을 찾을 수 없습니다.");
  }
  
  // 중복 검사 (공백 트림, 대소문자 무시, 자기 자신은 제외)
  const normalizedName = input.name.trim().toLowerCase();
  const isDuplicate = farms.some((existingFarm: any, index: number) => 
    index !== farmIndex && existingFarm.name.trim().toLowerCase() === normalizedName
  );
  
  if (isDuplicate) {
    throw new Error("이미 등록된 이름입니다.");
  }
  
  // 농장 업데이트
  farms[farmIndex] = {
    ...farms[farmIndex],
    name: input.name,
    environment: input.environment || null,
    rowCount: input.rowCount || null,
    area: input.area || null,
  };
  
  // 로컬 스토리지에 저장
  localStorage.setItem(userFarmsKey, JSON.stringify(farms));
  
  return farms[farmIndex];
}

export async function getFarms(): Promise<any[]> {
  // 현재 로그인한 사용자 ID 가져오기
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || "anonymous-user";
  
  // 사용자별 농장 목록 키 생성
  const userFarmsKey = `farmmate-farms-${userId}`;
  
  // 기존 농장 목록 가져오기
  const storedFarms = localStorage.getItem(userFarmsKey);
  const farms = storedFarms ? JSON.parse(storedFarms) : [];
  
  return farms;
}