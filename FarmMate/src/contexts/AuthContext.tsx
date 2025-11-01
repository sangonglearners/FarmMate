import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, signInWithGoogle, signOut, getCurrentUser, onAuthStateChange, handleAuthCallback } from '@/lib/supabaseClient'

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

        // OAuth 콜백 확인 (디버그 로그 추가)
        const urlParams = new URLSearchParams(window.location.search)
        const urlHash = window.location.hash
        const hasOAuthCallback = urlParams.has('code') || 
                                urlParams.has('access_token') || 
                                urlHash.includes('access_token') ||
                                urlHash.includes('refresh_token')

        // 디버그 정보 출력
        console.log('🔍 OAuth 콜백 디버그:', {
          url: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          hasCode: urlParams.has('code'),
          hasAccessToken: urlParams.has('access_token'),
          hashIncludesAccessToken: urlHash.includes('access_token'),
          hashIncludesRefreshToken: urlHash.includes('refresh_token'),
          hasOAuthCallback
        })

        // OAuth 성공 플래그 먼저 확인
        const hasRecentOAuthSuccess = localStorage.getItem('farmmate-oauth-success') === 'true'
        console.log('🔍 OAuth 성공 플래그:', hasRecentOAuthSuccess)

        if (hasOAuthCallback) {
          console.log('🔗 OAuth 콜백 감지 - Supabase가 처리하도록 대기...')
          
          // OAuth 성공 플래그를 미리 설정 (콜백 감지 즉시)
          localStorage.setItem('farmmate-oauth-success', 'true')
          localStorage.setItem('farmmate-oauth-timestamp', Date.now().toString())
          
          // Supabase가 OAuth 콜백을 처리할 시간을 줌
          // URL 정리는 하지 않음 - Supabase가 처리 후 자동으로 정리됨
          
          if (session) {
            setSession(session)
            setUser(session.user)
            console.log('✅ OAuth 로그인 완료:', session.user?.email)
          } else {
            console.log('⚠️ OAuth 콜백 처리 중 - Supabase 이벤트 대기')
            // onAuthStateChange에서 처리될 것임
          }
        } else if (hasRecentOAuthSuccess) {
          console.log('🎉 최근 OAuth 성공 - 세션 유지')
          // 최근 OAuth 성공한 경우 세션 유지
          if (session) {
            setSession(session)
            setUser(session.user)
            console.log('✅ 세션 복원 완료:', session.user?.email)
          }
        } else if (session) {
          // 세션이 있으면 유지 (테스트 로그인 포함)
          console.log('✅ 기존 세션 유지:', session.user?.email)
          setSession(session)
          setUser(session.user)
        } else {
          console.log('🔄 세션이 없음 - 로그아웃 상태')
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
    const { data: { subscription } } = onAuthStateChange((event: string, session: any) => {
      console.log('인증 상태 변경:', event, session)
      
      // SIGNED_IN 이벤트 발생 시 OAuth 성공 플래그 설정
      if (event === 'SIGNED_IN' && session) {
        console.log('🎉 SIGNED_IN 이벤트 - OAuth 로그인 성공!')
        localStorage.setItem('farmmate-oauth-success', 'true')
        localStorage.setItem('farmmate-oauth-timestamp', Date.now().toString())
        setSession(session)
        setUser(session.user)
        
        // 5분 후 OAuth 성공 플래그 자동 정리
        setTimeout(() => {
          localStorage.removeItem('farmmate-oauth-success')
          localStorage.removeItem('farmmate-oauth-timestamp')
          console.log('🧹 OAuth 성공 플래그 자동 정리 (5분 경과)')
        }, 5 * 60 * 1000) // 5분
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 SIGNED_OUT 이벤트')
        // OAuth 성공 직후가 아닌 경우에만 실제 로그아웃 처리
        const oauthTimestamp = localStorage.getItem('farmmate-oauth-timestamp')
        const timeSinceOAuth = oauthTimestamp ? Date.now() - parseInt(oauthTimestamp) : Infinity
        
        if (timeSinceOAuth > 3000) { // 3초 이후에만 로그아웃 처리 (여유시간 증가)
          setSession(null)
          setUser(null)
          localStorage.removeItem('farmmate-oauth-success')
          localStorage.removeItem('farmmate-oauth-timestamp')
        } else {
          console.log('⏰ OAuth 직후 SIGNED_OUT 이벤트 - 무시함 (보호시간:', Math.round((3000 - timeSinceOAuth) / 1000), '초 남음)')
        }
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      
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
      localStorage.removeItem('test-user')
      await signOut()
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
    signOut: handleSignOut,
    testLogin: handleTestLogin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
