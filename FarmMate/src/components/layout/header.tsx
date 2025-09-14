import { Link, useLocation } from "wouter";
import { Sprout, Bell, User, Calculator } from "lucide-react";
import { Button } from "@shared/ui/button";

export default function Header() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-primary">FarmMate</h1>
            </div>
          </Link>
          
          {/* 모바일 앱용 간단한 아이콘들 */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" title="농작업 계산기">
              <Calculator className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
