// Supabase에서 작업 데이터를 삭제하는 함수
import { supabase } from "./supabase";

type PgErr = { code?: string; message?: string } | null;

function assertNoDeleteError(error: PgErr, context: string): void {
  if (error) {
    console.error(`${context}:`, error);
    throw new Error(error.message || context);
  }
}

function isMissingTableError(error: PgErr): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache")
  );
}

/** 테이블이 없으면 무시하고, 그 외 오류는 중단합니다. */
async function deleteOptionalTable(
  label: string,
  run: () => Promise<{ error: PgErr }>
): Promise<void> {
  const { error } = await run();
  if (!error) return;
  if (isMissingTableError(error)) {
    console.warn(`[withdraw] ${label}: 테이블 없음, 건너뜀`);
    return;
  }
  assertNoDeleteError(error, label);
}

/**
 * 회원 탈퇴: 현재 로그인 사용자의 앱 DB 데이터를 삭제합니다.
 * Supabase Auth의 auth.users 레코드는 서비스 롤/대시보드에서만 삭제되며, 재로그인 시 프로필이 다시 동기화될 수 있습니다.
 */
export async function withdrawCurrentUserAccount(): Promise<void> {
  const testRaw = typeof localStorage !== "undefined" ? localStorage.getItem("test-user") : null;
  if (testRaw) {
    let testId: string;
    try {
      testId = JSON.parse(testRaw).id;
    } catch {
      throw new Error("테스트 사용자 정보를 읽을 수 없습니다.");
    }
    const { error } = await supabase.from("user_profiles").delete().eq("id", testId);
    if (error) console.warn("테스트 사용자 프로필 삭제:", error);
    return;
  }

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    console.error("[withdraw] getUser 오류:", authErr);
    throw new Error(authErr.message || "인증 정보를 확인할 수 없습니다.");
  }
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const uid = auth.user.id;

  const ledRes = await supabase.from("ledgers").select("id").eq("user_id", uid);
  if (ledRes.error) {
    if (!isMissingTableError(ledRes.error)) {
      assertNoDeleteError(ledRes.error, "장부 목록 조회");
    }
  } else {
    const ledgerIds = (ledRes.data ?? []).map((r: { id: string }) => r.id);
    if (ledgerIds.length > 0) {
      const { error: expErr } = await supabase.from("expense_items").delete().in("ledger_id", ledgerIds);
      assertNoDeleteError(expErr, "비용 항목 삭제");
    }
    const { error: ledgerDelErr } = await supabase.from("ledgers").delete().eq("user_id", uid);
    assertNoDeleteError(ledgerDelErr, "장부 삭제");
  }

  await deleteOptionalTable("작업 완료일 삭제", async () =>
    supabase.from("task_completion_dates").delete().eq("user_id", uid)
  );
  await deleteOptionalTable("작업 완료 삭제", async () =>
    supabase.from("task_completions").delete().eq("user_id", uid)
  );
  await deleteOptionalTable("캘린더 댓글 삭제", async () =>
    supabase.from("calendar_comments").delete().eq("user_id", uid)
  );

  const { error: tvErr } = await supabase.from("tasks_v1").delete().eq("user_id", uid);
  if (tvErr) {
    if (!isMissingTableError(tvErr)) assertNoDeleteError(tvErr, "작업 삭제");
  }

  const { error: t0Err } = await supabase.from("tasks").delete().eq("user_id", uid);
  if (t0Err && !isMissingTableError(t0Err)) {
    assertNoDeleteError(t0Err, "레거시 작업 삭제");
  }

  await deleteOptionalTable("캘린더 공유 삭제", async () =>
    supabase.from("calendar_shares").delete().or(`owner_id.eq.${uid},shared_user_id.eq.${uid}`)
  );

  const farmRes = await supabase.from("farms").select("id").eq("user_id", uid);
  if (farmRes.error) {
    if (!isMissingTableError(farmRes.error)) assertNoDeleteError(farmRes.error, "농장 목록 조회");
  } else {
    const farmIds = (farmRes.data ?? []).map((r: { id: string }) => r.id);
    if (farmIds.length > 0) {
      await deleteOptionalTable("작물 삭제", async () =>
        supabase.from("crops").delete().in("farm_id", farmIds)
      );
    }
    const { error: farmDelErr } = await supabase.from("farms").delete().eq("user_id", uid);
    assertNoDeleteError(farmDelErr, "농장 삭제");
  }

  await deleteOptionalTable("추천 기록 삭제", async () =>
    supabase.from("rec_result").delete().eq("user_id", uid)
  );

  const { error: upErr } = await supabase.from("user_profiles").delete().eq("id", uid);
  assertNoDeleteError(upErr, "프로필 삭제");
}

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
