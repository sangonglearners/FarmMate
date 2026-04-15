import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, signInWithGoogle, signInWithKakao, signOut, onAuthStateChange } from '@lib/supabaseClient'
import { AiCreditsRepository } from '@/shared/api/ai-credits.repository'
import { appQueryClient } from '@/lib/appQueryClient'

const PENDING_REF_KEY = 'farmmate:pending_ref'

async function processReferralIfNeeded(userId: string) {
  const pendingRef = localStorage.getItem(PENDING_REF_KEY)
  if (!pendingRef) return

  try {
    const repo = new AiCreditsRepository()
    const applied = await repo.applyReferralCode(pendingRef, userId)
    if (applied) {
      console.log('✅ 추천인 코드 적용 완료:', pendingRef)
    }
  } catch (err) {
    console.warn('추천 코드 처리 중 오류:', err)
  } finally {
    localStorage.removeItem(PENDING_REF_KEY)
  }
}

async function isNewUser(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return data === null
}

export interface SignOutOptions {
  /** 기본 true. 회원탈퇴 등에서 false로 두고 별도로 이동 처리 */
  redirectToLogin?: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithKakao: () => Promise<void>
  signOut: (options?: SignOutOptions) => Promise<void>
  testLogin: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('세션 확인 중 오류:', error)
        }
        setSession(session ?? null)
        setUser(session?.user ?? null)
      } catch (error) {
        console.warn('인증 초기화 중 오류:', error)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // 인증 상태 변경 구독
    const { data: { subscription } } = onAuthStateChange(async (event: string, session: any) => {
      console.log('인증 상태 변경:', event, session)
      setSession(session ?? null)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_OUT') {
        // 이전 로그인 사용자의 서버 캐시가 남아 보이지 않도록 즉시 정리
        appQueryClient.clear()
      }

      // 구글 로그인 완료 시 신규 유저 여부 확인 후 추천인 코드 처리
      if (event === 'SIGNED_IN' && session?.user?.id) {
        const userId = session.user.id
        const pendingRef = localStorage.getItem(PENDING_REF_KEY)
        if (pendingRef) {
          const newUser = await isNewUser(userId)
          if (newUser) {
            await processReferralIfNeeded(userId)
          } else {
            // 기존 유저는 ref 무시
            localStorage.removeItem(PENDING_REF_KEY)
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignInWithGoogle = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('구글 로그인 실패:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleSignInWithKakao = async () => {
    try {
      setLoading(true)
      await signInWithKakao()
    } catch (error) {
      console.error('카카오 로그인 실패:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async (options?: SignOutOptions) => {
    const { redirectToLogin = true } = options ?? {}
    try {
      setLoading(true)
      localStorage.removeItem('test-user')
      localStorage.removeItem('fm_user_name')
      localStorage.removeItem('fm_user_avatar')
      sessionStorage.removeItem('farmmate:browse_without_login')
      try {
        localStorage.removeItem('farmmate:browse_without_login')
      } catch {
        /* ignore */
      }
      await signOut()
      if (redirectToLogin) {
        window.location.replace('/login')
      }
    } catch (error) {
      console.error('로그아웃 실패:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 테스트 로그인 함수
  const handleTestLogin = async () => {
    const testUser = {
      id: 'test-user-123',
      email: 'test@farmmate.com',
      user_metadata: {
        full_name: '테스트 농부',
        avatar_url: null
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      aud: 'authenticated',
      role: 'authenticated'
    }
    
    // 테스트 사용자를 localStorage에 저장 (requireUser에서 사용)
    localStorage.setItem('test-user', JSON.stringify({
      id: testUser.id,
      email: testUser.email,
      user_metadata: testUser.user_metadata,
      created_at: testUser.created_at,
      updated_at: testUser.updated_at,
      email_confirmed_at: testUser.email_confirmed_at,
      last_sign_in_at: testUser.last_sign_in_at,
      app_metadata: testUser.app_metadata,
      aud: testUser.aud,
      role: testUser.role
    }))
    
    // 테스트 사용자를 user_profiles에 추가
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: testUser.id,
          email: testUser.email,
          display_name: testUser.user_metadata.full_name || testUser.email,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error && !error.message.includes('duplicate')) {
        console.warn('테스트 사용자 프로필 추가 실패:', error)
      }
    } catch (error) {
      console.warn('테스트 사용자 프로필 추가 중 오류:', error)
    }
    
    setUser(testUser as User)
    setSession({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: testUser as User
    } as Session)
    setLoading(false)
    console.log('✅ 테스트 로그인 완료')
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithKakao: handleSignInWithKakao,
    signOut: handleSignOut,
    testLogin: handleTestLogin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
