import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import {
  AiCreditsRepository,
  ADMIN_USER_IDS,
  MONTHLY_FREE_CREDITS,
} from '@/shared/api/ai-credits.repository'

const repo = new AiCreditsRepository()

export function useAiCredits() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const currentMonth = format(new Date(), 'yyyy-MM')

  const isAdmin = !!user?.id && ADMIN_USER_IDS.includes(user.id)

  const { data: usage, isLoading } = useQuery({
    queryKey: ['ai-insight-usage', user?.id, currentMonth],
    queryFn: () => repo.getMonthlyUsage(currentMonth),
    enabled: !!user?.id && !isAdmin,
    staleTime: 1000 * 60, // 1분
  })

  const totalCredits = isAdmin
    ? Infinity
    : MONTHLY_FREE_CREDITS + (usage?.bonusCredits ?? 0)

  const usedCount = usage?.usedCount ?? 0
  const remainingCredits = isAdmin ? Infinity : Math.max(0, totalCredits - usedCount)
  const canUseAI = isAdmin || remainingCredits > 0

  const { mutateAsync: consumeCredit } = useMutation({
    mutationFn: () => repo.incrementUsage(currentMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ai-insight-usage', user?.id, currentMonth],
      })
    },
  })

  return {
    isAdmin,
    usedCount,
    totalCredits,
    remainingCredits,
    bonusCredits: usage?.bonusCredits ?? 0,
    canUseAI,
    isLoading,
    consumeCredit,
    currentMonth,
  }
}

export function useReferralCode() {
  const { user } = useAuth()

  const { data: referralCode } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: () => repo.getOrCreateReferralCode(),
    enabled: !!user?.id,
    staleTime: Infinity,
  })

  const referralLink = referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : null

  const copyReferralLink = async (): Promise<boolean> => {
    if (!referralLink) return false
    try {
      await navigator.clipboard.writeText(referralLink)
      return true
    } catch {
      return false
    }
  }

  return { referralCode, referralLink, copyReferralLink }
}
