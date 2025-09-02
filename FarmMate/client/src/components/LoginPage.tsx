import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, testLogin, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      await signInWithGoogle()
    } catch (error: any) {
      console.error('구글 로그인 실패:', error)
      const errorMessage = error?.message || '구글 로그인에 실패했습니다. 다시 시도해주세요.'
      setError(errorMessage)
    }
  }

  const handleTestLogin = () => {
    try {
      setError(null)
      testLogin()
    } catch (error) {
      console.error('테스트 로그인 실패:', error)
      setError('테스트 로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl flex flex-col justify-center p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">FarmMate</h1>
          <p className="text-gray-600">농장 관리 시스템에 로그인하세요</p>
        </div>
        
        <button
          onClick={handleTestLogin}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4 font-medium"
        >
          🧪 테스트 로그인으로 시작하기
        </button>
        
        <div className="text-center text-gray-400 text-sm mb-3">또는</div>
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Google로 로그인 (설정 필요)
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
          </div>
        )}
        
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-600">
            💡 <strong>개발 모드</strong>: 테스트 로그인을 사용하여 모든 기능을 체험해보세요!
          </p>
        </div>
      </div>
    </div>
  )
}
