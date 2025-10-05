// Supabase 데이터베이스에 작업을 저장하는 함수
import { supabase } from "./supabase";
import { taskApi } from "./tasks";

export async function saveTask(input: {
  title: string; 
  memo?: string; 
  scheduledAt?: string; 
  farmId?: string; 
  cropId?: string; 
  taskType?: string;
  rowNumber?: number;
}) {
  // taskApi.createTask를 사용하여 Supabase에 저장
  const taskData = {
    title: input.title,
    description: input.memo || "",
    taskType: input.taskType || "기타",
    scheduledDate: input.scheduledAt || new Date().toISOString().split('T')[0],
    farmId: input.farmId || "",
    cropId: input.cropId || "",
    rowNumber: input.rowNumber || null,
    completed: 0,
  };
  
  return await taskApi.createTask(taskData);
}
