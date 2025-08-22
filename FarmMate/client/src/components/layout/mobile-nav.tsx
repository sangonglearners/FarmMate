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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="grid grid-cols-5 gap-1">
        <Link href="/">
          <a className={`flex flex-col items-center py-2 px-1 ${
            isActive("/") ? "text-primary bg-primary/10" : "text-gray-600"
          }`}>
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium mt-1">홈</span>
          </a>
        </Link>
        <Link href="/farms">
          <a className={`flex flex-col items-center py-2 px-1 ${
            isActive("/farms") ? "text-primary bg-primary/10" : "text-gray-600"
          }`}>
            <Tractor className="w-5 h-5" />
            <span className="text-xs mt-1">농장</span>
          </a>
        </Link>
        <Link href="/crops">
          <a className={`flex flex-col items-center py-2 px-1 ${
            isActive("/crops") ? "text-primary bg-primary/10" : "text-gray-600"
          }`}>
            <Sprout className="w-5 h-5" />
            <span className="text-xs mt-1">작물</span>
          </a>
        </Link>
        <Link href="/calendar">
          <a className={`flex flex-col items-center py-2 px-1 ${
            isActive("/calendar") ? "text-primary bg-primary/10" : "text-gray-600"
          }`}>
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1">일지</span>
          </a>
        </Link>
        <Link href="/my-page">
          <a className={`flex flex-col items-center py-2 px-1 ${
            isActive("/my-page") ? "text-primary bg-primary/10" : "text-gray-600"
          }`}>
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">마이</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
