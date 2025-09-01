import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/LoginPage'

// 메인 앱 컴포넌트
function AppContent() {
  const { user, loading } = useAuth()

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우
  if (!user) {
    return <LoginPage />
  }

  // 로그인된 경우 - 메인 앱 화면
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">FarmMate</h1>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">
              ✅ 구글 로그인 성공!<br/>
              <span className="text-sm">환영합니다, {user.email}님!</span>
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">사용자 정보</h2>
              <p className="text-sm text-gray-600">이메일: {user.email}</p>
              <p className="text-sm text-gray-600">ID: {user.id}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">다음 단계</h2>
              <p className="text-sm text-gray-600">
                이제 Supabase 구글 로그인이 정상적으로 작동합니다!<br/>
                농장 관리 기능을 추가할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 메인 App 컴포넌트
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
