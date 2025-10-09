// 날짜별 작업 완료 상태 관리 API
import { supabase } from "./supabase";

export interface TaskCompletion {
  id: string;
  taskId: string;
  userId: string;
  completionDate: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SupabaseTaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  completion_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toTaskCompletion(r: SupabaseTaskCompletion): TaskCompletion {
  return {
    id: r.id,
    taskId: r.task_id,
    userId: r.user_id,
    completionDate: r.completion_date,
    completed: r.completed,
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

// 특정 작업의 날짜별 완료 상태 조회
export async function getTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('task_completion_dates')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', auth.user.id)
    .order('completion_date', { ascending: true });

  if (error) {
    console.error('작업 완료 상태 조회 오류:', error);
    throw error;
  }

  return data.map(toTaskCompletion);
}

// 특정 날짜의 작업 완료 상태 조회
export async function getTaskCompletionByDate(taskId: string, date: string): Promise<TaskCompletion | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('task_completion_dates')
    .select('*')
    .eq('task_id', taskId)
    .eq('completion_date', date)
    .eq('user_id', auth.user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows found" 오류
    console.error('작업 완료 상태 조회 오류:', error);
    throw error;
  }

  return data ? toTaskCompletion(data) : null;
}

// 특정 날짜의 작업 완료 상태 설정
export async function setTaskCompletion(taskId: string, date: string, completed: boolean): Promise<TaskCompletion> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const completionData = {
    task_id: taskId,
    user_id: auth.user.id,
    completion_date: date,
    completed: completed,
    completed_at: completed ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('task_completion_dates')
    .upsert(completionData, {
      onConflict: 'task_id,completion_date'
    })
    .select()
    .single();

  if (error) {
    console.error('작업 완료 상태 설정 오류:', error);
    throw error;
  }

  return toTaskCompletion(data);
}

// 특정 날짜의 작업 완료 상태 삭제
export async function deleteTaskCompletion(taskId: string, date: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { error } = await supabase
    .from('task_completion_dates')
    .delete()
    .eq('task_id', taskId)
    .eq('completion_date', date)
    .eq('user_id', auth.user.id);

  if (error) {
    console.error('작업 완료 상태 삭제 오류:', error);
    throw error;
  }
}

// 작업이 삭제될 때 관련된 완료 상태도 삭제 (CASCADE로 자동 처리됨)
export async function deleteTaskCompletionsByTaskId(taskId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { error } = await supabase
    .from('task_completion_dates')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', auth.user.id);

  if (error) {
    console.error('작업 완료 상태 삭제 오류:', error);
    throw error;
  }
}
