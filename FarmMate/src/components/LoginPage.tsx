import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { trackPageView } from '@/lib/analytics';

interface LoginPageProps {
  onBrowseWithoutLogin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBrowseWithoutLogin }) => {
  const { signInWithGoogle, signInWithKakao, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [activeProvider, setActiveProvider] = useState<'google' | 'kakao' | null>(null)
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    isMobileTall: false,
  })
  const soilSpots = [
    { left: 5.93, top: 64.96, soft: true },
    { left: 10.77, top: 68.12, soft: false },
    { left: 5.93, top: 71.27, soft: false },
    { left: 17.8, top: 73.67, soft: true },
    { left: 21.98, top: 65.72, soft: false },
    { left: 34.07, top: 69.53, soft: true },
    { left: 41.1, top: 73.67, soft: false },
    { left: 54.07, top: 71.93, soft: true },
    { left: 67.69, top: 73.34, soft: false },
    { left: 74.73, top: 69.86, soft: false },
    { left: 76.04, top: 64.31, soft: true },
    { left: 88.57, top: 67.14, soft: false },
    { left: 88.57, top: 72.25, soft: true },
    { left: 92.09, top: 63.66, soft: false },
  ]

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      setActiveProvider('google')
      await signInWithGoogle()
    } catch (error: any) {
      console.error('구글 로그인 실패:', error)
      const errorMessage = error?.message || '구글 로그인에 실패했습니다. 다시 시도해주세요.'
      setError(errorMessage)
    } finally {
      setActiveProvider(null)
    }
  }

  const handleKakaoLogin = async () => {
    try {
      setError(null)
      setActiveProvider('kakao')
      await signInWithKakao()
    } catch (error: any) {
      console.error('카카오 로그인 실패:', error)
      const errorMessage = error?.message || '카카오 로그인에 실패했습니다. 다시 시도해주세요.'
      setError(errorMessage)
    } finally {
      setActiveProvider(null)
    }
  }

  const handleExploreWithoutLogin = () => {
    onBrowseWithoutLogin?.()
  }

  useEffect(() => {
    trackPageView('login')
  }, [])

  useEffect(() => {
    const updateViewportMode = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth
      const aspectRatio = viewportHeight / Math.max(viewportWidth, 1)
      setViewport({
        width: viewportWidth,
        height: viewportHeight,
        isMobileTall: viewportHeight < 860 || aspectRatio > 1.92,
      })
    }
    updateViewportMode()
    window.addEventListener('resize', updateViewportMode)
    return () => window.removeEventListener('resize', updateViewportMode)
  }, [])

  const frameStyle = {
    width: '100%',
    height: '100dvh',
    maxWidth: viewport.width > 768 ? 'calc(100dvh * 455 / 919)' : 'none',
  } as const

  return (
    <div className="min-h-screen w-full bg-[#F4F6E1]">
      <div className="relative h-[100dvh] w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative overflow-hidden bg-[#F4F6E1] [font-family:Roboto,sans-serif]"
            style={frameStyle}
          >
          <img
            src="/f_log_logo_login_final.png"
            alt="F_log 로고"
            className="absolute left-[27.47%] top-[8.38%] w-[45.27%] h-auto object-contain"
          />

          <div className="absolute left-[12.97%] top-[26.01%] w-[74.07%] text-center">
            <p
              className="text-[#7DA463] font-light tracking-[0.21px]"
              style={{ fontSize: 'clamp(14px, 2.1vh, 22.4px)', lineHeight: '1.5' }}
            >
              쉽고, 빠르고, 연결된
            </p>
            <p
              className="text-[#7DA463] font-bold tracking-[0.21px] whitespace-nowrap"
              style={{ fontSize: 'clamp(15px, 2.35vh, 24px)', lineHeight: '1.5' }}
            >
              나만의 농장 관리 플랫폼 F_log
            </p>
          </div>

          <img
            src="/f_log_character.png"
            alt="F_log 캐릭터"
            className="absolute left-[21.98%] w-[56.26%] h-[32.10%] object-contain z-30"
            style={{ top: viewport.isMobileTall ? '37.9%' : '38.41%' }}
          />

          <div
            className="absolute left-0 w-full bg-[#BF7D57] shadow-[0_0_20px_rgba(0,0,0,0.25)] z-10"
            style={{
              top: viewport.isMobileTall ? '61.9%' : '62.57%',
              height: viewport.isMobileTall ? '15.8%' : '13.93%',
            }}
          />

          {soilSpots.map((spot, index) => (
            <span
              key={`${spot.left}-${spot.top}-${index}`}
              className={`absolute z-20 rounded-[10px] ${spot.soft ? 'bg-[#975F4080]' : 'bg-[#975F40]'}`}
              style={{
                left: `${spot.left}%`,
                top: `${viewport.isMobileTall ? spot.top + 0.2 : spot.top}%`,
                width: '7.03%',
                height: viewport.isMobileTall ? '1.55%' : '1.41%',
              }}
            />
          ))}

          {/* 구글 로그인 버튼 */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            aria-label="Google로 시작하기"
            className="absolute left-1/2 -translate-x-1/2 top-[77%] w-[68.31%] h-[5.5%] rounded-[11.2px] border border-[#1E243A3B] bg-white flex items-center justify-center gap-[2.46%] focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed z-40"
          >
            {loading && activeProvider === 'google' ? (
              <>
                <Loader2 className="h-[45%] w-auto animate-spin text-[#5F6368]" />
                <span
                  className="font-normal tracking-[0.21px] text-black/50 whitespace-nowrap"
                  style={{ fontSize: 'clamp(11px, 1.9vh, 20px)', lineHeight: '1.5' }}
                >
                  로그인 중...
                </span>
              </>
            ) : (
              <>
                <svg className="h-[48%] w-auto shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.5-.2-2.2H12z" />
                  <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.6l-3.1-2.4c-.9.6-2 .9-3.6.9-2.7 0-5-1.8-5.8-4.3l-3.2 2.5C4.7 19.6 8.1 22 12 22z" />
                  <path fill="#4285F4" d="M6.2 13.6c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8L3 7.5C2.4 8.8 2 10.3 2 11.8s.4 3 1 4.3l3.2-2.5z" />
                  <path fill="#FBBC05" d="M12 5.7c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.8 14.6 2 12 2 8.1 2 4.7 4.4 3 7.5L6.2 10c.8-2.5 3.1-4.3 5.8-4.3z" />
                </svg>
                <span
                  className="font-normal tracking-[0.21px] text-black/50 whitespace-nowrap"
                  style={{ fontSize: 'clamp(11px, 1.9vh, 20px)', lineHeight: '1.5' }}
                >
                  Google로 시작하기
                </span>
              </>
            )}
          </button>

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            aria-label="카카오로 시작하기"
            className="absolute left-1/2 -translate-x-1/2 top-[83.7%] w-[68.31%] h-[5.5%] rounded-[11.2px] flex items-center justify-center gap-[2.46%] focus:outline-none focus:ring-2 focus:ring-[#FEE500] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed z-40"
            style={{ backgroundColor: '#FEE500' }}
          >
            {loading && activeProvider === 'kakao' ? (
              <>
                <Loader2 className="h-[45%] w-auto animate-spin text-black/60" />
                <span
                  className="font-normal tracking-[0.21px] text-black/60 whitespace-nowrap"
                  style={{ fontSize: 'clamp(11px, 1.9vh, 20px)', lineHeight: '1.5' }}
                >
                  로그인 중...
                </span>
              </>
            ) : (
              <>
                <svg className="h-[48%] w-auto shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="#000000">
                  <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.733 1.714 5.13 4.318 6.565L5.29 21l4.98-2.79c.562.08 1.138.12 1.73.12 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
                </svg>
                <span
                  className="font-normal tracking-[0.21px] whitespace-nowrap"
                  style={{ fontSize: 'clamp(11px, 1.9vh, 20px)', lineHeight: '1.5', color: '#000000' }}
                >
                  카카오로 시작하기
                </span>
              </>
            )}
          </button>

          {/* 로그인 없이 둘러보기 링크 */}
          <button
            type="button"
            onClick={handleExploreWithoutLogin}
            className="absolute left-1/2 top-[91%] z-40 w-[88%] max-w-md -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0 text-center text-[11px] font-normal leading-snug text-gray-400/90 underline decoration-gray-400/80 decoration-1 underline-offset-[3px] transition-colors hover:text-gray-500 hover:decoration-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-2 sm:text-xs"
            aria-label="로그인 없이 앱 둘러보기"
          >
            로그인 없이 기능을 둘러볼 수 있어요
          </button>
        </div>
        </div>

        {error && (
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-[min(92vw,430px)] p-4 bg-red-50 border border-red-200 rounded-md z-50">
            <p className="text-base text-red-600 whitespace-pre-line">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
