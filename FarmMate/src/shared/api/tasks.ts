// client/src/shared/api/tasks.ts
import { supabase } from "./supabase";
import type { Task } from "@shared/types/schema";

interface SupabaseTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: string;
  scheduled_date: string;
  end_date: string | null;
  farm_id: string | null;
  crop_id: string | null;
  row_number: number | null;
  completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toTask(r: SupabaseTask): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description || null,
    taskType: r.task_type,
    scheduledDate: r.scheduled_date,
    endDate: r.end_date || null,
    completed: r.completed,
    farmId: r.farm_id || null,
    cropId: r.crop_id || null,
    userId: r.user_id,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
    rowNumber: r.row_number || null,
  };
}

export async function listTasksByDate(date: string): Promise<Task[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('tasks_v1')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('scheduled_date', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('작업 조회 오류:', error);
    throw error;
  }

  return (data || []).map(toTask);
}

export async function listTasksRange(start: string, end: string): Promise<Task[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('tasks_v1')
    .select('*')
    .eq('user_id', auth.user.id)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('작업 범위 조회 오류:', error);
    throw error;
  }

  return (data || []).map(toTask);
}

// 기존 API와 호환성을 위한 taskApi 객체
export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    return listTasksRange("2020-01-01", "2030-12-31");
  },

  getTasksByDate: async (date: string): Promise<Task[]> => {
    return listTasksByDate(date);
  },

  createTask: async (taskData: any): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    const { data, error } = await supabase
      .from('tasks_v1')
      .insert({
        user_id: auth.user.id,
        title: taskData.title,
        description: taskData.description || null,
        task_type: taskData.taskType || '기타',
        scheduled_date: taskData.scheduledDate,
        end_date: taskData.endDate || null,
        farm_id: taskData.farmId || null,
        crop_id: taskData.cropId || null,
        row_number: taskData.rowNumber || null,
        completed: taskData.completed || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('작업 생성 오류:', error);
      throw error;
    }

    return toTask(data);
  },

  updateTask: async (id: string, taskData: any): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    const { data, error } = await supabase
      .from('tasks_v1')
      .update({
        title: taskData.title,
        description: taskData.description || null,
        task_type: taskData.taskType,
        scheduled_date: taskData.scheduledDate,
        end_date: taskData.endDate || null,
        farm_id: taskData.farmId || null,
        crop_id: taskData.cropId || null,
        row_number: taskData.rowNumber || null,
        completed: taskData.completed || 0,
      })
      .eq('id', id)
      .eq('user_id', auth.user.id) // 보안: 자신의 작업만 수정 가능
      .select()
      .single();

    if (error) {
      console.error('작업 수정 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error("작업을 찾을 수 없습니다.");
    }

    return toTask(data);
  },

  completeTask: async (id: string): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    const { data, error } = await supabase
      .from('tasks_v1')
      .update({
        completed: 1,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', auth.user.id) // 보안: 자신의 작업만 완료 가능
      .select()
      .single();

    if (error) {
      console.error('작업 완료 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error("작업을 찾을 수 없습니다.");
    }

    return toTask(data);
  },

  uncompleteTask: async (id: string): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    const { data, error } = await supabase
      .from('tasks_v1')
      .update({
        completed: 0,
        completed_at: null,
      })
      .eq('id', id)
      .eq('user_id', auth.user.id) // 보안: 자신의 작업만 완료 취소 가능
      .select()
      .single();

    if (error) {
      console.error('작업 완료 취소 오류:', error);
      throw error;
    }

    if (!data) {
      throw new Error("작업을 찾을 수 없습니다.");
    }

    return toTask(data);
  },

  deleteTask: async (id: string): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    const { error } = await supabase
      .from('tasks_v1')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id); // 보안: 자신의 작업만 삭제 가능

    if (error) {
      console.error('작업 삭제 오류:', error);
      throw error;
    }
  },
};
