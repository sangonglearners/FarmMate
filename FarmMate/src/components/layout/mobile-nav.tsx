import { Link, useLocation } from "wouter";
import { Home, Tractor, Sprout, Calendar, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-40">
      <div className="grid grid-cols-5 gap-1">
        <Link href="/" className={`flex flex-col items-center py-3 px-1 ${
          isActive("/") ? "text-primary bg-primary/10" : "text-gray-600"
        }`}>
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium mt-1">홈</span>
        </Link>
        <Link href="/farms" className={`flex flex-col items-center py-3 px-1 ${
          isActive("/farms") ? "text-primary bg-primary/10" : "text-gray-600"
        }`}>
          <Tractor className="w-5 h-5" />
          <span className="text-xs mt-1">농장</span>
        </Link>
        <Link href="/crops" className={`flex flex-col items-center py-3 px-1 ${
          isActive("/crops") ? "text-primary bg-primary/10" : "text-gray-600"
        }`}>
          <Sprout className="w-5 h-5" />
          <span className="text-xs mt-1">작물</span>
        </Link>
        <Link href="/calendar" className={`flex flex-col items-center py-3 px-1 ${
          isActive("/calendar") ? "text-primary bg-primary/10" : "text-gray-600"
        }`}>
          <Calendar className="w-5 h-5" />
          <span className="text-xs mt-1">일지</span>
        </Link>
        <Link href="/my-page" className={`flex flex-col items-center py-3 px-1 ${
          isActive("/my-page") ? "text-primary bg-primary/10" : "text-gray-600"
        }`}>
          <User className="w-5 h-5" />
          <span className="text-xs mt-1">마이</span>
        </Link>
      </div>
    </nav>
  );
}
