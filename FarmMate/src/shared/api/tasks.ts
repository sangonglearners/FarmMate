// client/src/shared/api/tasks.ts
import { supabase } from "./supabase";
import type { Task } from "@shared/schema";

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
  task_group_id: string | null;
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
    rowNumber: r.row_number || null,
    taskGroupId: r.task_group_id || null,
    userId: r.user_id,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
  };
}

export async function listTasksByDate(date: string): Promise<Task[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  // RLS 정책이 자동으로 처리하므로 user_id 필터링 제거
  const { data, error } = await supabase
    .from('tasks_v1')
    .select('*')
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

  // RLS 정책이 자동으로 처리하므로 필터링 없이 select만 수행
  // RLS 정책에 따라 본인의 작업과 공유받은 작업이 모두 반환됨
  const { data, error } = await supabase
    .from('tasks_v1')
    .select('*')
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
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    // 1. 자신의 작업 가져오기
    const { data: ownTasks, error: ownError } = await supabase
      .from('tasks_v1')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('scheduled_date', { ascending: true });

    if (ownError) {
      console.error('자신의 작업 조회 오류:', ownError);
      throw ownError;
    }

    // 2. 공유받은 농장의 작업 가져오기
    const { data: sharedFarms, error: sharedError } = await supabase
      .from('calendar_shares')
      .select('calendar_id, role')
      .eq('shared_user_id', auth.user.id);

    if (sharedError) {
      console.error('공유 농장 조회 오류:', sharedError);
    }

    let sharedTasks: SupabaseTask[] = [];
    if (sharedFarms && sharedFarms.length > 0) {
      const farmIds = sharedFarms.map(f => f.calendar_id); // calendar_id에 farm_id가 저장됨
      const { data: sharedTasksData, error: sharedTasksError } = await supabase
        .from('tasks_v1')
        .select('*')
        .in('farm_id', farmIds) // farm_id로 필터링
        .order('scheduled_date', { ascending: true });

      if (sharedTasksError) {
        console.error('공유 작업 조회 오류:', sharedTasksError);
      } else {
        sharedTasks = sharedTasksData || [];
      }
    }

    // 3. 모든 작업 합치기 (중복 제거)
    const allTasksMap = new Map<string, SupabaseTask>();
    [...(ownTasks || []), ...sharedTasks].forEach(task => {
      allTasksMap.set(task.id, task);
    });

    return Array.from(allTasksMap.values()).map(toTask);
  },

  getTasksByDate: async (date: string): Promise<Task[]> => {
    return listTasksByDate(date);
  },

  createTask: async (taskData: any): Promise<Task> => {
    console.log('🔹 taskApi.createTask 시작', taskData);
    
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      console.error('❌ 사용자가 로그인되어 있지 않음');
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    console.log('✅ 인증된 사용자:', auth.user.id);

    // 현재 사용자가 소유자로 있는 공유 캘린더 확인
    const { data: sharedCalendars } = await supabase
      .from('calendar_shares')
      .select('calendar_id')
      .eq('owner_id', auth.user.id);

    const insertData = {
      user_id: auth.user.id,
      title: taskData.title,
      description: taskData.description || null,
      task_type: taskData.taskType || '기타',
      scheduled_date: taskData.scheduledDate,
      end_date: taskData.endDate || null,
      farm_id: taskData.farmId || null,
      crop_id: taskData.cropId || null,
      row_number: taskData.rowNumber || null,
      task_group_id: taskData.taskGroupId || null,
      completed: taskData.completed || 0,
    };

    console.log('📤 Supabase에 저장할 데이터:', insertData);

    const { data, error } = await supabase
      .from('tasks_v1')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ 작업 생성 오류:', error);
      console.error('❌ 오류 상세:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ 작업 생성 성공:', data);
    return toTask(data);
  },

  updateTask: async (id: string, taskData: any): Promise<Task> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      throw new Error("사용자가 로그인되어 있지 않습니다.");
    }

    // 대상 작업 정보 조회 (권한 판별용)
    const { data: targetTask, error: fetchErr } = await supabase
      .from('tasks_v1')
      .select('id, user_id, farm_id')
      .eq('id', id)
      .single();
    if (fetchErr || !targetTask) {
      throw new Error("수정할 작업을 찾을 수 없습니다.");
    }

    // 권한 확인: 작업 작성자이거나, 농장 소유자이거나, 해당 농장에 editor 권한이면 허용
    let canEditByRole = false;
    if (targetTask.farm_id) {
      // 농장 소유자 여부
      const { data: farmRow } = await supabase
        .from('farms')
        .select('user_id')
        .eq('id', targetTask.farm_id)
        .single();

      const isOwner = !!farmRow && farmRow.user_id === auth.user.id;

      // editor 권한 여부
      const { data: shareRow } = await supabase
        .from('calendar_shares')
        .select('id')
        .eq('calendar_id', targetTask.farm_id)
        .eq('shared_user_id', auth.user.id)
        .eq('role', 'editor')
        .single();

      const isEditor = !!shareRow;
      canEditByRole = isOwner || isEditor;
    }

    // undefined 값을 null로 변환하여 UUID 오류 방지
    const updateData: any = {
      title: taskData.title,
      description: taskData.description || null,
      task_type: taskData.taskType,
      scheduled_date: taskData.scheduledDate,
      end_date: taskData.endDate || null,
      row_number: taskData.rowNumber || null,
      task_group_id: taskData.taskGroupId || null,
      completed: taskData.completed || 0,
    };

    // farm_id와 crop_id는 유효한 UUID일 때만 포함
    if (taskData.farmId && taskData.farmId !== 'undefined' && taskData.farmId !== '') {
      updateData.farm_id = taskData.farmId;
    } else {
      updateData.farm_id = null;
    }

    if (taskData.cropId && taskData.cropId !== 'undefined' && taskData.cropId !== '') {
      updateData.crop_id = taskData.cropId;
    } else {
      updateData.crop_id = null;
    }

    console.log('작업 수정 데이터:', updateData);

    // 작성자 본인인 경우에는 user_id 매칭을 유지하고,
    // 소유자/에디터인 경우에는 RLS에 위임(추가 user_id 조건 없이)한다.
    const query = supabase.from('tasks_v1').update(updateData).eq('id', id);
    const finalQuery = (targetTask.user_id === auth.user.id || !canEditByRole)
      ? query.eq('user_id', auth.user.id)
      : query;

    const { data, error } = await finalQuery.select().single();

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

    // 대상 작업 정보 조회 (권한 판별용)
    const { data: targetTask, error: fetchErr } = await supabase
      .from('tasks_v1')
      .select('id, user_id, farm_id')
      .eq('id', id)
      .single();
    if (fetchErr || !targetTask) {
      throw new Error("작업을 찾을 수 없습니다.");
    }

    // 권한 확인
    let canEditByRole = false;
    if (targetTask.farm_id) {
      const { data: farmRow } = await supabase
        .from('farms')
        .select('user_id')
        .eq('id', targetTask.farm_id)
        .single();
      const isOwner = !!farmRow && farmRow.user_id === auth.user.id;
      const { data: shareRow } = await supabase
        .from('calendar_shares')
        .select('id')
        .eq('calendar_id', targetTask.farm_id)
        .eq('shared_user_id', auth.user.id)
        .eq('role', 'editor')
        .single();
      const isEditor = !!shareRow;
      canEditByRole = isOwner || isEditor;
    }

    const baseUpdate = supabase
      .from('tasks_v1')
      .update({ completed: 1, completed_at: new Date().toISOString() })
      .eq('id', id);

    const finalQuery = (targetTask.user_id === auth.user.id || !canEditByRole)
      ? baseUpdate.eq('user_id', auth.user.id)
      : baseUpdate;

    const { data, error } = await finalQuery.select().single();

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

    // 대상 작업 정보 조회 (권한 판별용)
    const { data: targetTask, error: fetchErr } = await supabase
      .from('tasks_v1')
      .select('id, user_id, farm_id')
      .eq('id', id)
      .single();
    if (fetchErr || !targetTask) {
      throw new Error("작업을 찾을 수 없습니다.");
    }

    // 권한 확인
    let canEditByRole = false;
    if (targetTask.farm_id) {
      const { data: farmRow } = await supabase
        .from('farms')
        .select('user_id')
        .eq('id', targetTask.farm_id)
        .single();
      const isOwner = !!farmRow && farmRow.user_id === auth.user.id;
      const { data: shareRow } = await supabase
        .from('calendar_shares')
        .select('id')
        .eq('calendar_id', targetTask.farm_id)
        .eq('shared_user_id', auth.user.id)
        .eq('role', 'editor')
        .single();
      const isEditor = !!shareRow;
      canEditByRole = isOwner || isEditor;
    }

    const baseUpdate = supabase
      .from('tasks_v1')
      .update({ completed: 0, completed_at: null })
      .eq('id', id);

    const finalQuery = (targetTask.user_id === auth.user.id || !canEditByRole)
      ? baseUpdate.eq('user_id', auth.user.id)
      : baseUpdate;

    const { data, error } = await finalQuery.select().single();

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

    // 대상 작업 정보 조회 (권한 판별용)
    const { data: targetTask, error: fetchErr } = await supabase
      .from('tasks_v1')
      .select('id, user_id, farm_id')
      .eq('id', id)
      .single();
    if (fetchErr || !targetTask) {
      throw new Error("삭제할 작업을 찾을 수 없습니다.");
    }

    // 권한 확인
    let canEditByRole = false;
    if (targetTask.farm_id) {
      const { data: farmRow } = await supabase
        .from('farms')
        .select('user_id')
        .eq('id', targetTask.farm_id)
        .single();
      const isOwner = !!farmRow && farmRow.user_id === auth.user.id;
      const { data: shareRow } = await supabase
        .from('calendar_shares')
        .select('id')
        .eq('calendar_id', targetTask.farm_id)
        .eq('shared_user_id', auth.user.id)
        .eq('role', 'editor')
        .single();
      const isEditor = !!shareRow;
      canEditByRole = isOwner || isEditor;
    }

    const baseDelete = supabase.from('tasks_v1').delete().eq('id', id);
    const finalQuery = (targetTask.user_id === auth.user.id || !canEditByRole)
      ? baseDelete.eq('user_id', auth.user.id)
      : baseDelete;

    const { error } = await finalQuery;

    if (error) {
      console.error('작업 삭제 오류:', error);
      throw error;
    }
  },
};
