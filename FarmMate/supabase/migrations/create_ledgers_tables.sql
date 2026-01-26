-- 장부(ledgers) 및 비용 항목(expense_items) 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. ledgers 테이블 생성
CREATE TABLE IF NOT EXISTS public.ledgers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    task_id TEXT,
    revenue_amount INTEGER,
    harvest_quantity INTEGER,
    harvest_unit TEXT,
    quality_grade TEXT,
    sales_channel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. expense_items 테이블 생성
CREATE TABLE IF NOT EXISTS public.expense_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ledger_id TEXT NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS 활성화
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

-- 4. ledgers 테이블 RLS 정책
CREATE POLICY "Users can view own ledgers" ON public.ledgers
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own ledgers" ON public.ledgers
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own ledgers" ON public.ledgers
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own ledgers" ON public.ledgers
    FOR DELETE USING (auth.uid()::text = user_id);

-- 5. expense_items 테이블 RLS 정책
CREATE POLICY "Users can view own expense items" ON public.expense_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ledgers
            WHERE ledgers.id = expense_items.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert own expense items" ON public.expense_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ledgers
            WHERE ledgers.id = expense_items.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own expense items" ON public.expense_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.ledgers
            WHERE ledgers.id = expense_items.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own expense items" ON public.expense_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.ledgers
            WHERE ledgers.id = expense_items.ledger_id
            AND ledgers.user_id = auth.uid()::text
        )
    );

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ledgers_user_id ON public.ledgers(user_id);
CREATE INDEX IF NOT EXISTS idx_ledgers_task_id ON public.ledgers(task_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_ledger_id ON public.expense_items(ledger_id);

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ledgers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ledgers_updated_at BEFORE UPDATE ON public.ledgers
    FOR EACH ROW EXECUTE FUNCTION update_ledgers_updated_at();

-- 8. 테이블 생성 완료 확인
SELECT 
    'ledgers 및 expense_items 테이블 생성 완료' as status,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('ledgers', 'expense_items');
