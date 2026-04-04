import { BaseRepository } from './base.repository'
import { format } from 'date-fns'

// 관리자 유저 ID 목록 (무제한 크레딧)
export const ADMIN_USER_IDS: string[] = [
  '88f889c9-4161-4654-bb11-df5397de0101',
  'b92461f2-3cf6-4687-8609-69f762b57b3e',
  '094c982d-2eb9-4a57-b639-7d9ef2955396',
  '26f8ff68-29ac-4105-9977-e0172a31ce58',
  'b29ecd8c-d892-412b-8249-eb197afc96a7',
  '926f7e20-2107-481d-91cd-fce2a5753917',
  'cda41d1a-ae59-4f2e-b15a-c40178e1e2ca',
  '3c948a60-9d24-4a53-ae09-3697f622d76a',
]

export const MONTHLY_FREE_CREDITS = 3
export const REFERRAL_BONUS_PER_INVITE = 2

export interface InsightUsage {
  usedCount: number
  bonusCredits: number
}

export interface ReferralCode {
  id: string
  userId: string
  code: string
  createdAt: string
}

function generateReferralCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export class AiCreditsRepository extends BaseRepository {
  /**
   * 이번 달 사용량을 가져옵니다. 없으면 0으로 초기화합니다.
   */
  async getMonthlyUsage(month?: string): Promise<InsightUsage> {
    const userId = await this.withUserId()
    const targetMonth = month ?? format(new Date(), 'yyyy-MM')

    const { data, error } = await this.supabase
      .from('ai_insight_usage')
      .select('used_count')
      .eq('user_id', userId)
      .eq('month', targetMonth)
      .maybeSingle()

    if (error) throw new Error(error.message)

    const usedCount = data?.used_count ?? 0
    const bonusCredits = await this.getReferralBonusCredits(userId)

    return { usedCount, bonusCredits }
  }

  /**
   * 추천으로 지급받은 보너스 크레딧 수를 계산합니다.
   * (추천인이 성공시킨 추천 수 × REFERRAL_BONUS_PER_INVITE)
   */
  private async getReferralBonusCredits(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('referral_rewards')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_user_id', userId)

    if (error) return 0
    return (count ?? 0) * REFERRAL_BONUS_PER_INVITE
  }

  /**
   * AI 인사이트 사용 횟수를 1 증가시킵니다.
   */
  async incrementUsage(month?: string): Promise<void> {
    const userId = await this.withUserId()
    const targetMonth = month ?? format(new Date(), 'yyyy-MM')

    const { data: existing } = await this.supabase
      .from('ai_insight_usage')
      .select('id, used_count')
      .eq('user_id', userId)
      .eq('month', targetMonth)
      .maybeSingle()

    if (existing) {
      const { error } = await this.supabase
        .from('ai_insight_usage')
        .update({ used_count: existing.used_count + 1 })
        .eq('id', existing.id)

      if (error) throw new Error(error.message)
    } else {
      const { error } = await this.supabase
        .from('ai_insight_usage')
        .insert({ user_id: userId, month: targetMonth, used_count: 1 })

      if (error) throw new Error(error.message)
    }
  }

  /**
   * 유저의 추천 코드를 가져옵니다. 없으면 새로 생성합니다.
   */
  async getOrCreateReferralCode(): Promise<string> {
    const userId = await this.withUserId()

    const { data: existing } = await this.supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing?.code) return existing.code

    // 코드 충돌 시 최대 5번 재시도
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode()
      const { error } = await this.supabase
        .from('referral_codes')
        .insert({ user_id: userId, code })

      if (!error) return code
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        throw new Error(error.message)
      }
    }

    throw new Error('추천 코드 생성에 실패했습니다.')
  }

  /**
   * 추천 코드를 적용합니다. (신규 유저 → 추천인 크레딧 지급)
   * SECURITY DEFINER 함수를 통해 처리됩니다.
   */
  async applyReferralCode(code: string, referredUserId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('apply_referral_code', {
      p_code: code,
      p_referred_user_id: referredUserId,
    })

    if (error) {
      console.warn('추천 코드 적용 실패:', error.message)
      return false
    }

    return data === true
  }
}
