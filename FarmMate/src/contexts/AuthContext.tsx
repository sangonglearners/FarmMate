import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, signInWithGoogle, signOut, onAuthStateChange } from '@lib/supabaseClient'

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
    const { data: { subscription } } = onAuthStateChange((event: string, session: any) => {
      console.log('인증 상태 변경:', event, session)
      setSession(session ?? null)
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
