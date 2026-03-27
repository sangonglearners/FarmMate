import { User } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function Header() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50 mx-auto">
      <div className="px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <img
                src="/f_log_logo_v3.png"
                alt="서비스 로고"
                className="h-8 w-auto object-contain"
              />
            </div>
          </Link>

          <Link
            href="/my-page"
            className={`p-2 rounded-full transition-colors ${
              isActive("/my-page") ? "text-primary bg-primary/10" : "text-gray-600 hover:text-primary hover:bg-gray-100"
            }`}
            aria-label="마이페이지 이동"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
