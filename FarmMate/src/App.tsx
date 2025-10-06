import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route } from 'wouter';
import HomePage from './pages/home/ui/HomePage';
import { FarmsPage } from './pages/farms';
import CalendarPage from './pages/calendar/ui/CalendarPage';
import MyPage from './pages/my-page/ui/MyPage';
import NotFound from './pages/not-found';
import Layout from './components/layout/layout';
import { RecommendationsInputPage } from './pages/recommendations';

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
});

// 메인 앱 컴포넌트 (로그인 후 표시되는 기존 FarmMate 웹앱)
function MainApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Route path="/" component={HomePage} />
          <Route path="/farms" component={FarmsPage} />
          <Route path="/crops" component={FarmsPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/recommendations/input" component={RecommendationsInputPage} />
          <Route path="/recommendations" component={RecommendationsInputPage} />
          <Route path="/my-page" component={MyPage} />
          <Route path="/auth/callback" component={HomePage} />
          {/* NotFound는 추후 useRoute 조합으로 추가 */}
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  // 로딩 중일 때
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

  // 로그인하지 않은 경우
  if (!user) {
    return <LoginPage />;
  }

  // 로그인한 경우 - 기존 FarmMate 홈화면으로 연결
  return <MainApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;

