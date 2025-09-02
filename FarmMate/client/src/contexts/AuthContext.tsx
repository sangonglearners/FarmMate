import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, signInWithGoogle, signOut, getCurrentUser, onAuthStateChange, handleAuthCallback } from '../lib/supabaseClient'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
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
    let isInitialized = false

    // 페이지 로드 시마다 로그인 상태 리셋 (OAuth 콜백 제외)
    const initializeAuth = async () => {
      if (isInitialized) return
      isInitialized = true

      try {
        // 현재 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('세션 확인 중 오류:', error)
        }

        // OAuth 콜백 확인
        const urlParams = new URLSearchParams(window.location.search)
        const urlHash = window.location.hash
        const hasOAuthCallback = urlParams.has('code') || 
                                urlParams.has('access_token') || 
                                urlHash.includes('access_token') ||
                                urlHash.includes('refresh_token')

        if (hasOAuthCallback) {
          console.log('🔗 OAuth 콜백 감지 - 세션 유지')
          // OAuth 콜백인 경우 세션 유지
          if (session) {
            setSession(session)
            setUser(session.user)
            console.log('✅ OAuth 로그인 완료:', session.user?.email)
          }
          // URL 정리
          window.history.replaceState({}, document.title, window.location.pathname)
        } else if (session) {
          console.log('🔄 기존 세션 발견 - 세션 유지')
          // 기존 세션이 있으면 유지
          setSession(session)
          setUser(session.user)
          console.log('✅ 기존 세션 복원:', session.user?.email)
        } else {
          console.log('🔄 페이지 로드 - 세션 없음, 로그인 필요')
          // 세션이 없는 경우에만 리셋
          setSession(null)
          setUser(null)
        }
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
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('인증 상태 변경:', event, session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
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

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await signOut()
      localStorage.removeItem('test-user')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 테스트 로그인 함수
  const handleTestLogin = () => {
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
    signOut: handleSignOut,
    testLogin: handleTestLogin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
