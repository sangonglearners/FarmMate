// client/src/shared/api/tasks.ts
import { supabase } from "./supabase";
import { mustOk } from "./mustOk";
import type { Task } from "@shared/types/schema";

type Row = {
  id: number;
  title: string;
  memo: string | null;
  scheduled_at: string | null;
  farm_id: number | null;
  crop_id: number | null;
  task_type: string | null;
  completed: number | null;
  completed_at: string | null;
  owner_id: string;
};

function toTask(r: Row): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.memo ?? undefined,
    taskType: r.task_type ?? "기타",
    scheduledDate: r.scheduled_at ?? "",
    completed: r.completed ?? 0,
    farmId: r.farm_id ? String(r.farm_id) : "",
    cropId: r.crop_id ? String(r.crop_id) : "",
    userId: r.owner_id,
    completedAt: r.completed_at,
    createdAt: new Date().toISOString(), // 기본값
  } as any;
}

export async function listTasksByDate(date: string) {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth?.user?.id ?? "test-user-id";
  
  const res = await supabase
    .from("tasks")
    .select("id,title,memo,scheduled_at,farm_id,crop_id,task_type,completed,completed_at,owner_id")
    .eq("scheduled_at", date)
    .eq("owner_id", ownerId)
    .order("scheduled_at", { ascending: true });

  return (mustOk(res) as any[]).map(toTask);
}

export async function listTasksRange(start: string, end: string) {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth?.user?.id ?? "test-user-id";
  
  const res = await supabase
    .from("tasks")
    .select("id,title,memo,scheduled_at,farm_id,crop_id,task_type,completed,completed_at,owner_id")
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .eq("owner_id", ownerId)
    .order("scheduled_at", { ascending: true });

  return (mustOk(res) as any[]).map(toTask);
}

// 기존 API와 호환성을 위한 taskApi 객체
export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    return listTasksRange("2020-01-01", "2030-12-31");
  },

  getTasksByDate: async (date: string): Promise<Task[]> => {
    return listTasksByDate(date);
  },

  createTask: async (task: any): Promise<Task> => {
    // Supabase 저장 로직을 여기에 구현하거나
    // saveTask 함수를 사용하도록 수정
    throw new Error("createTask는 saveTask 함수를 사용하세요");
  },

  updateTask: async (id: string, task: any): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    const ownerId = auth?.user?.id ?? "test-user-id";
    
    const res = await supabase
      .from("tasks")
      .update({
        title: task.title,
        memo: task.description,
        task_type: task.taskType,
        scheduled_at: task.scheduledDate,
        farm_id: task.farmId ? Number(task.farmId) : null,
        crop_id: task.cropId ? Number(task.cropId) : null,
        completed: task.completed,
      })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("id,title,memo,scheduled_at,farm_id,crop_id,task_type,completed,completed_at,owner_id")
      .single();

    return toTask(mustOk(res) as any);
  },

  completeTask: async (id: string): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    const ownerId = auth?.user?.id ?? "test-user-id";
    
    const res = await supabase
      .from("tasks")
      .update({ 
        completed: 1,
        completed_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select("id,title,memo,scheduled_at,farm_id,crop_id,task_type,completed,completed_at,owner_id")
      .single();

    return toTask(mustOk(res) as any);
  },

  deleteTask: async (id: string): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser();
    const ownerId = auth?.user?.id ?? "test-user-id";
    
    await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
  },
};
