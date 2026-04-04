import { QueryClient } from '@tanstack/react-query'

/**
 * MainApp 전역 QueryClient. 로그아웃 시 캐시를 비워 다른 계정 데이터가 섞이지 않게 한다.
 */
export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
})
