import { Link, useLocation } from "wouter";
import { Sprout, Bell, User, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-primary">채소생활</h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <a className={`font-medium transition-colors ${
                isActive("/") ? "text-primary" : "text-gray-700 hover:text-primary"
              }`}>
                홈
              </a>
            </Link>
            <Link href="/farms">
              <a className={`font-medium transition-colors ${
                isActive("/farms") ? "text-primary" : "text-gray-700 hover:text-primary"
              }`}>
                농장관리
              </a>
            </Link>
            <Link href="/crops">
              <a className={`font-medium transition-colors ${
                isActive("/crops") ? "text-primary" : "text-gray-700 hover:text-primary"
              }`}>
                작물관리
              </a>
            </Link>
            <Link href="/calendar">
              <a className={`font-medium transition-colors ${
                isActive("/calendar") ? "text-primary" : "text-gray-700 hover:text-primary"
              }`}>
                영농일지
              </a>
            </Link>
            <Link href="/recommendations">
              <a className={`font-medium transition-colors ${
                isActive("/recommendations") ? "text-primary" : "text-gray-700 hover:text-primary"
              }`}>
                작물추천
              </a>
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" title="농작업 계산기">
              <Calculator className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Link href="/my-page">
              <Button className="bg-primary hover:bg-primary/90">
                <User className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">마이페이지</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
