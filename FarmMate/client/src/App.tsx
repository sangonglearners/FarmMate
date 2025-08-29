import { Calendar as CalendarIcon, Home, Sprout, User } from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';

import { FarmsPage } from '@pages/farms';
import { CalendarPage } from '@pages/calendar';
import { HomePage } from '@pages/home';
import { queryClient } from '@shared/api/client';
import { Toaster } from '@shared/ui/toaster';
import { TooltipProvider } from '@shared/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { MyPage } from '@pages/my-page';

// TODO: Migrate these pages to FSD structure
// import NotFound from "@/pages/not-found";
// import HomePage from "@/pages/home";
// import Crops from "@/pages/crops";
// import Calendar from "@/pages/calendar";
// import Recommendations from "@/pages/recommendations";
// import MyPage from "@/pages/my-page";
// Auth components removed

// Mobile Navigation Component
function MobileNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "홈" },
    { path: "/farms", icon: Sprout, label: "농장&작물" },
    { path: "/calendar", icon: CalendarIcon, label: "영농일지" },
    { path: "/my-page", icon: User, label: "마이페이지" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path || (path !== "/" && location.startsWith(path));
          
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center p-2 min-w-0 ${
                isActive ? "text-primary" : "text-gray-500"
              }`}>
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium truncate">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-md mx-auto bg-white min-h-screen">
        <Switch>
          <Route path="/farms" component={FarmsPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/my-page" component={MyPage} />
          <Route path="/" component={HomePage} />
          {/* TODO: Migrate these routes to FSD structure */}
          {/* <Route path="/crops" component={Crops} /> */}
          {/* <Route path="/recommendations" component={Recommendations} /> */}
          <Route component={() => <div className="p-4"><h1>Page not found</h1></div>} />
        </Switch>
      </main>
      <MobileNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
