import { useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLoginPrompt } from '@/contexts/LoginPromptContext'

/**
 * 데이터 저장·수정 등이 필요할 때 호출합니다.
 * 로그인되어 있으면 true, 아니면 로그인 안내를 띄우고 false를 반환합니다.
 */
export function useRequireAuth() {
  const { user } = useAuth()
  const { openLoginPrompt } = useLoginPrompt()

  const ensureAuth = useCallback((): boolean => {
    if (user) return true
    openLoginPrompt()
    return false
  }, [user, openLoginPrompt])

  return { user, ensureAuth, openLoginPrompt }
}
