import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GoogleLoginButton } from './GoogleLoginButton'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth()
  const [error, setError] = useState<string>('')

  const handleGoogleLogin = async () => {
    try {
      setError('')
      await signInWithGoogle()
    } catch (error) {
      console.error('구글 로그인 실패:', error)
      setError(error instanceof Error ? error.message : '구글 로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            FarmMate
          </CardTitle>
          <p className="text-gray-600 mt-2">
            농장과 작물을 효율적으로 관리하는 시스템입니다
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <GoogleLoginButton onClick={handleGoogleLogin} />
          
          <div className="text-center text-sm text-gray-500">
            <p>로그인하면 FarmMate의 모든 기능을 사용할 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
