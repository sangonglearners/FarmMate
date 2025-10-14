import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

export function getSupabaseClient() {
  return supabase
}

export async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

// 기존 ?�환?�을 ?�한 export
export { supabase }

// 구�? 로그???�수
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  if (error) {
    console.error('구�? 로그???�류:', error)
    throw error
  }
  
  return data
}

// 로그?�웃 ?�수
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('로그?�웃 ?�류:', error)
    throw error
  }
}

// ?�재 ?�용??가?�오�?
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('?�용???�보 가?�오�??�류:', error)
    throw error
  }
  
  return user
}

// ?�증 ?�태 변�?구독
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

// OAuth 콜백 처리
export const handleAuthCallback = async () => {
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('OAuth 콜백 처리 ?�류:', error)
    throw error
  }
  
  return data
}
