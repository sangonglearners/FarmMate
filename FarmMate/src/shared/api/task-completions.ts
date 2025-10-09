import { supabase } from "./supabase";

interface TaskCompletion {
  id: string;
  taskId: string;
  userId: string;
  completionDate: string;
  completed: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupabaseTaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  completion_date: string;
  completed: number;
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
    completedAt: r.completed_at || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// 특정 날짜의 작업 완료 상태 가져오기
export async function getTaskCompletionsForDate(date: string): Promise<TaskCompletion[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('completion_date', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('작업 완료 상태 조회 오류:', error);
    throw error;
  }

  return data.map(toTaskCompletion);
}

// 특정 작업의 특정 날짜 완료 상태 가져오기
export async function getTaskCompletion(taskId: string, date: string): Promise<TaskCompletion | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('task_id', taskId)
    .eq('completion_date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 데이터가 없음
      return null;
    }
    console.error('작업 완료 상태 조회 오류:', error);
    throw error;
  }

  return toTaskCompletion(data);
}

// 작업 완료 상태 설정
export async function setTaskCompletion(taskId: string, date: string, completed: boolean): Promise<TaskCompletion> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const completionData = {
    task_id: taskId,
    user_id: auth.user.id,
    completion_date: date,
    completed: completed ? 1 : 0,
    completed_at: completed ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('task_completions')
    .upsert(completionData, {
      onConflict: 'task_id,user_id,completion_date'
    })
    .select()
    .single();

  if (error) {
    console.error('작업 완료 상태 설정 오류:', error);
    throw error;
  }

  return toTaskCompletion(data);
}

// 작업 완료 상태 삭제
export async function deleteTaskCompletion(taskId: string, date: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { error } = await supabase
    .from('task_completions')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('task_id', taskId)
    .eq('completion_date', date);

  if (error) {
    console.error('작업 완료 상태 삭제 오류:', error);
    throw error;
  }
}

export const taskCompletionApi = {
  getTaskCompletionsForDate,
  getTaskCompletion,
  setTaskCompletion,
  deleteTaskCompletion,
};
