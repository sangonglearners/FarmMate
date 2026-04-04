-- AI 인사이트 크레딧 & 추천인 시스템 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. referral_codes: 유저별 초대 코드
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. referral_rewards: 성공한 초대 기록 (referred_user_id UNIQUE → 중복 방지)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    referrer_user_id TEXT NOT NULL,
    referred_user_id TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL,
    rewarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ai_insight_usage: 월별 AI 인사이트 사용 횟수
CREATE TABLE IF NOT EXISTS public.ai_insight_usage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    month TEXT NOT NULL,  -- 'YYYY-MM' 형식
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- 4. RLS 활성화
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insight_usage ENABLE ROW LEVEL SECURITY;

-- 5. referral_codes RLS 정책
-- 인증된 사용자 누구나 코드 조회 가능 (추천 코드 검증 목적)
CREATE POLICY "Any authenticated user can view referral codes" ON public.referral_codes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own referral code" ON public.referral_codes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 6. referral_rewards RLS 정책
-- 자신이 관련된 보상 조회 가능 (추천인 또는 피추천인)
CREATE POLICY "Users can view own referral rewards" ON public.referral_rewards
    FOR SELECT USING (
        auth.uid()::text = referrer_user_id OR
        auth.uid()::text = referred_user_id
    );

-- 새 유저가 자신을 referred_user_id로 설정해 보상 생성
CREATE POLICY "New users can insert own referral reward" ON public.referral_rewards
    FOR INSERT WITH CHECK (auth.uid()::text = referred_user_id);

-- 7. ai_insight_usage RLS 정책
CREATE POLICY "Users can view own insight usage" ON public.ai_insight_usage
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own insight usage" ON public.ai_insight_usage
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own insight usage" ON public.ai_insight_usage
    FOR UPDATE USING (auth.uid()::text = user_id);

-- 8. 인덱스
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON public.referral_rewards(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insight_usage_user_month ON public.ai_insight_usage(user_id, month);

-- 9. ai_insight_usage updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ai_insight_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_insight_usage_updated_at
    BEFORE UPDATE ON public.ai_insight_usage
    FOR EACH ROW EXECUTE FUNCTION update_ai_insight_usage_updated_at();

-- 10. 추천 코드 적용 함수 (SECURITY DEFINER → 피추천인이 추천인 레코드를 생성 가능)
CREATE OR REPLACE FUNCTION apply_referral_code(p_code TEXT, p_referred_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_user_id TEXT;
    v_inserted_count INTEGER;
BEGIN
    -- 코드로 추천인 조회
    SELECT user_id INTO v_referrer_user_id
    FROM referral_codes
    WHERE code = p_code;

    IF v_referrer_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 자기 자신은 추천 불가
    IF v_referrer_user_id = p_referred_user_id THEN
        RETURN FALSE;
    END IF;

    -- referral_rewards 삽입 (UNIQUE 제약으로 중복 방지)
    INSERT INTO referral_rewards (referrer_user_id, referred_user_id, code)
    VALUES (v_referrer_user_id, p_referred_user_id, p_code)
    ON CONFLICT (referred_user_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RETURN v_inserted_count > 0;
END;
$$;

-- 완료 확인
SELECT '크레딧 & 추천인 테이블 생성 완료' as status;
