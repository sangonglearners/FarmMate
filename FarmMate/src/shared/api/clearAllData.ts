// Supabase에서 작업 데이터를 삭제하는 함수
import { supabase } from "./supabase";

// 현재 사용자의 모든 작업 데이터를 삭제하는 함수
export async function clearCurrentUserTaskData(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', auth.user.id);

  if (error) {
    console.error('작업 데이터 삭제 오류:', error);
    throw error;
  }

  console.log(`🗑️ 사용자 ${auth.user.email}의 모든 작업 데이터가 삭제되었습니다.`);
}

// 관리자용: 모든 사용자의 작업 데이터를 삭제하는 함수 (주의: 위험함)
export async function clearAllTaskData(): Promise<void> {
  // 이 함수는 관리자만 사용해야 합니다.
  // RLS 정책 때문에 실제로는 현재 사용자의 데이터만 삭제됩니다.
  await clearCurrentUserTaskData();
}

// 프론트엔드의 모든 로컬 데이터를 삭제하는 함수
export function clearAllFrontendData(): void {
  console.log('🧹 FarmMate 프론트엔드 데이터 정리 시작...');
  
  // 1. 로컬 스토리지 정리
  const localKeysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('farmmate-') || 
      key.startsWith('fm_') ||
      key.startsWith('supabase.') ||
      key.includes('farmmate') ||
      key.includes('task') ||
      key.includes('crop') ||
      key.includes('farm')
    )) {
      localKeysToDelete.push(key);
    }
  }
  
  localKeysToDelete.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ 로컬 스토리지 삭제됨: ${key}`);
  });
  
  // 2. 세션 스토리지 정리
  const sessionKeysToDelete: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('farmmate-') || 
      key.startsWith('fm_') ||
      key.startsWith('supabase.') ||
      key.includes('farmmate')
    )) {
      sessionKeysToDelete.push(key);
    }
  }
  
  sessionKeysToDelete.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ 세션 스토리지 삭제됨: ${key}`);
  });
  
  console.log(`🗑️ 총 ${localKeysToDelete.length + sessionKeysToDelete.length}개 항목이 삭제되었습니다.`);
  console.log('✨ 모든 프론트엔드 데이터가 정리되었습니다!');
}

// 개발자용: 브라우저 콘솔에서 사용할 수 있는 전역 함수
if (typeof window !== 'undefined') {
  (window as any).clearCurrentUserData = clearCurrentUserTaskData;
  (window as any).clearAllFarmMateData = clearAllTaskData;
  (window as any).clearAllFrontendData = clearAllFrontendData;
}
