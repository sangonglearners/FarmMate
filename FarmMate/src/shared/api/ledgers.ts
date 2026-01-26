// client/src/shared/api/ledgers.ts
import { supabase } from "./supabase";
import type { Ledger, ExpenseItem, InsertLedger, InsertExpenseItem } from "@shared/schema";

interface SupabaseLedger {
  id: string;
  user_id: string;
  task_id: string | null;
  revenue_amount: number | null;
  harvest_quantity: number | null;
  harvest_unit: string | null;
  quality_grade: string | null;
  sales_channel: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseExpenseItem {
  id: string;
  ledger_id: string;
  category: string;
  cost: number;
  created_at: string;
}

function toLedger(r: SupabaseLedger): Ledger {
  return {
    id: r.id,
    userId: r.user_id,
    taskId: r.task_id || null,
    revenueAmount: r.revenue_amount || null,
    harvestQuantity: r.harvest_quantity || null,
    harvestUnit: r.harvest_unit || null,
    qualityGrade: r.quality_grade || null,
    salesChannel: r.sales_channel || null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function toExpenseItem(r: SupabaseExpenseItem): ExpenseItem {
  return {
    id: r.id,
    ledgerId: r.ledger_id,
    category: r.category,
    cost: r.cost,
    createdAt: new Date(r.created_at),
  };
}

// 장부와 비용 항목을 함께 가져오는 타입
export interface LedgerWithExpenses extends Ledger {
  expenseItems: ExpenseItem[];
}

// 장부 목록 조회 (작업 ID로 필터링 가능)
export async function listLedgers(taskId?: string): Promise<LedgerWithExpenses[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  let query = supabase
    .from('ledgers')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (taskId) {
    query = query.eq('task_id', taskId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('장부 조회 오류:', error);
    throw error;
  }

  const ledgers = (data || []).map(toLedger);

  // 각 장부의 비용 항목 조회
  const ledgersWithExpenses: LedgerWithExpenses[] = await Promise.all(
    ledgers.map(async (ledger) => {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_items')
        .select('*')
        .eq('ledger_id', ledger.id)
        .order('created_at', { ascending: true });

      if (expenseError) {
        console.error('비용 항목 조회 오류:', expenseError);
        return { ...ledger, expenseItems: [] };
      }

      return {
        ...ledger,
        expenseItems: (expenseData || []).map(toExpenseItem),
      };
    })
  );

  return ledgersWithExpenses;
}

// 특정 장부 조회
export async function getLedger(id: string): Promise<LedgerWithExpenses | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('ledgers')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 데이터 없음
    }
    console.error('장부 조회 오류:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const ledger = toLedger(data);

  // 비용 항목 조회
  const { data: expenseData, error: expenseError } = await supabase
    .from('expense_items')
    .select('*')
    .eq('ledger_id', ledger.id)
    .order('created_at', { ascending: true });

  if (expenseError) {
    console.error('비용 항목 조회 오류:', expenseError);
    return { ...ledger, expenseItems: [] };
  }

  return {
    ...ledger,
    expenseItems: (expenseData || []).map(toExpenseItem),
  };
}

// 장부 생성
export async function createLedger(
  ledgerData: InsertLedger,
  expenseItems: InsertExpenseItem[]
): Promise<LedgerWithExpenses> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const insertData = {
    user_id: auth.user.id,
    task_id: ledgerData.taskId || null,
    revenue_amount: ledgerData.revenueAmount || null,
    harvest_quantity: ledgerData.harvestQuantity || null,
    harvest_unit: ledgerData.harvestUnit || null,
    quality_grade: ledgerData.qualityGrade || null,
    sales_channel: ledgerData.salesChannel || null,
  };

  const { data: ledgerResult, error: ledgerError } = await supabase
    .from('ledgers')
    .insert(insertData)
    .select()
    .single();

  if (ledgerError) {
    console.error('장부 생성 오류:', ledgerError);
    throw ledgerError;
  }

  const ledger = toLedger(ledgerResult);

  // 비용 항목 생성
  if (expenseItems.length > 0) {
    const expenseInsertData = expenseItems.map(item => ({
      ledger_id: ledger.id,
      category: item.category,
      cost: item.cost,
    }));

    const { error: expenseError } = await supabase
      .from('expense_items')
      .insert(expenseInsertData);

    if (expenseError) {
      console.error('비용 항목 생성 오류:', expenseError);
      // 장부는 생성되었으므로 비용 항목만 실패한 경우에도 장부는 반환
    }
  }

  // 생성된 장부와 비용 항목을 다시 조회하여 반환
  const result = await getLedger(ledger.id);
  if (!result) {
    throw new Error("생성된 장부를 조회할 수 없습니다.");
  }

  return result;
}

// 장부 수정
export async function updateLedger(
  id: string,
  ledgerData: Partial<InsertLedger>,
  expenseItems?: InsertExpenseItem[]
): Promise<LedgerWithExpenses> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  // 기존 장부 확인
  const existingLedger = await getLedger(id);
  if (!existingLedger || existingLedger.userId !== auth.user.id) {
    throw new Error("장부를 찾을 수 없거나 수정 권한이 없습니다.");
  }

  const updateData: any = {};
  if (ledgerData.taskId !== undefined) updateData.task_id = ledgerData.taskId || null;
  if (ledgerData.revenueAmount !== undefined) updateData.revenue_amount = ledgerData.revenueAmount || null;
  if (ledgerData.harvestQuantity !== undefined) updateData.harvest_quantity = ledgerData.harvestQuantity || null;
  if (ledgerData.harvestUnit !== undefined) updateData.harvest_unit = ledgerData.harvestUnit || null;
  if (ledgerData.qualityGrade !== undefined) updateData.quality_grade = ledgerData.qualityGrade || null;
  if (ledgerData.salesChannel !== undefined) updateData.sales_channel = ledgerData.salesChannel || null;
  updateData.updated_at = new Date().toISOString();

  const { data: ledgerResult, error: ledgerError } = await supabase
    .from('ledgers')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select()
    .single();

  if (ledgerError) {
    console.error('장부 수정 오류:', ledgerError);
    throw ledgerError;
  }

  // 비용 항목 업데이트 (제공된 경우)
  if (expenseItems !== undefined) {
    // 기존 비용 항목 삭제
    const { error: deleteError } = await supabase
      .from('expense_items')
      .delete()
      .eq('ledger_id', id);

    if (deleteError) {
      console.error('기존 비용 항목 삭제 오류:', deleteError);
    }

    // 새 비용 항목 생성
    if (expenseItems.length > 0) {
      const expenseInsertData = expenseItems.map(item => ({
        ledger_id: id,
        category: item.category,
        cost: item.cost,
      }));

      const { error: expenseError } = await supabase
        .from('expense_items')
        .insert(expenseInsertData);

      if (expenseError) {
        console.error('비용 항목 생성 오류:', expenseError);
      }
    }
  }

  // 수정된 장부와 비용 항목을 다시 조회하여 반환
  const result = await getLedger(id);
  if (!result) {
    throw new Error("수정된 장부를 조회할 수 없습니다.");
  }

  return result;
}

// 장부 삭제
export async function deleteLedger(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  // 기존 장부 확인
  const existingLedger = await getLedger(id);
  if (!existingLedger || existingLedger.userId !== auth.user.id) {
    throw new Error("장부를 찾을 수 없거나 삭제 권한이 없습니다.");
  }

  // 비용 항목 먼저 삭제 (외래키 제약조건)
  const { error: expenseError } = await supabase
    .from('expense_items')
    .delete()
    .eq('ledger_id', id);

  if (expenseError) {
    console.error('비용 항목 삭제 오류:', expenseError);
    throw expenseError;
  }

  // 장부 삭제
  const { error: ledgerError } = await supabase
    .from('ledgers')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (ledgerError) {
    console.error('장부 삭제 오류:', ledgerError);
    throw ledgerError;
  }
}

// 작업별 장부 존재 여부 확인
export async function hasLedgerForTask(taskId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }

  const { data, error } = await supabase
    .from('ledgers')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', auth.user.id)
    .limit(1);

  if (error) {
    console.error('장부 확인 오류:', error);
    throw error;
  }

  return (data || []).length > 0;
}
