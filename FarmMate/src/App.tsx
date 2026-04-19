import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPromptProvider } from './contexts/LoginPromptContext';
import { LoginPage } from './components/LoginPage';
import { LoginPromptDialog } from './components/LoginPromptDialog';
import { QueryClientProvider } from '@tanstack/react-query';
import { Router, Route } from 'wouter';
import HomePage from './pages/home/ui/HomePage';
import { FarmsPage } from './pages/farms';
import CalendarPage from './pages/calendar/ui/CalendarPage';
import StatsPage from './pages/stats';
import MyPage from './pages/my-page/ui/MyPage';
import JournalPhotosPage from './pages/my-page/ui/JournalPhotosPage';
import LedgerManagementPage from './pages/ledger-management/ui/LedgerManagementPage';
import { FarmCropManagementPage } from './pages/farm-crop-management';
import NotFound from './pages/not-found';
import Layout from './components/layout/layout';
import { 
  RecommendationsInputPage, 
  RecommendationsLoadingPage, 
  RecommendationsResultPage,
  RecommendationsHistoryPage,
  RecommendationsHistoryDetailPage 
} from './pages/recommendations';
import { appQueryClient } from './lib/appQueryClient';
import { Toaster } from '@/components/ui/toaster';
import AnalyticsPageTracker from '@/components/AnalyticsPageTracker';

/** 탭(세션) 동안만 유지. 창·탭을 닫고 링크로 다시 들어오면 랜딩이 다시 뜸 (localStorage 미사용) */
const GUEST_BROWSE_KEY = 'farmmate:browse_without_login';

function readGuestBrowseFlag(): boolean {
  try {
    return sessionStorage.getItem(GUEST_BROWSE_KEY) === '1';
  } catch {
    return false;
  }
}

// 메인 앱 컴포넌트 (로그인 후 표시되는 기존 FarmMate 웹앱)
function MainApp() {
  return (
    <QueryClientProvider client={appQueryClient}>
      <Router>
        <Layout>
          <AnalyticsPageTracker />
          <Route path="/" component={HomePage} />
          <Route path="/farms" component={FarmsPage} />
          <Route path="/crops" component={FarmsPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/stats" component={StatsPage} />
          <Route path="/recommendations/input" component={RecommendationsInputPage} />
          <Route path="/recommendations/loading" component={RecommendationsLoadingPage} />
          <Route path="/recommendations/result" component={RecommendationsResultPage} />
          <Route path="/recommendations/history/:id" component={RecommendationsHistoryDetailPage} />
          <Route path="/recommendations/history" component={RecommendationsHistoryPage} />
          <Route path="/recommendations" component={RecommendationsInputPage} />
          <Route path="/my-page/journal-photos" component={JournalPhotosPage} />
          <Route path="/my-page" component={MyPage} />
          <Route path="/ledger-management" component={LedgerManagementPage} />
          <Route path="/farm-crop-management" component={FarmCropManagementPage} />
          <Route path="/auth/callback" component={HomePage} />
          {/* NotFound는 추후 useRoute 조합으로 추가 */}
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

function AppRouter() {
  const { loading, user } = useAuth();
  const [path, setLocation] = useLocation();
  const [guestBrowse, setGuestBrowse] = useState(readGuestBrowseFlag);

  useEffect(() => {
    if (!user) {
      setGuestBrowse(readGuestBrowseFlag());
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (user && path === '/login') {
      setLocation('/');
    }
  }, [loading, user, path, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const handleBrowseWithoutLogin = () => {
    try {
      sessionStorage.setItem(GUEST_BROWSE_KEY, '1');
    } catch {
      /* ignore */
    }
    setGuestBrowse(true);
    setLocation('/');
  };

  if (!user && path === '/login') {
    return (
      <LoginPage
        onBrowseWithoutLogin={guestBrowse ? undefined : handleBrowseWithoutLogin}
      />
    );
  }

  if (!user && !guestBrowse && path === '/') {
    return <LoginPage onBrowseWithoutLogin={handleBrowseWithoutLogin} />;
  }

  return (
    <>
      <MainApp />
      <LoginPromptDialog />
      <Toaster />
    </>
  );
}

function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      localStorage.setItem('farmmate:pending_ref', ref)
      // URL에서 ref 파라미터 제거 (히스토리 오염 방지)
      const url = new URL(window.location.href)
      url.searchParams.delete('ref')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])
  return null
}

function App() {
  return (
    <AuthProvider>
      <LoginPromptProvider>
        <ReferralCapture />
        <AppRouter />
      </LoginPromptProvider>
    </AuthProvider>
  );
}

export default App;

