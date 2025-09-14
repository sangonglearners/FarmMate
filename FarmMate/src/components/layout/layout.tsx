import { ReactNode } from "react";
import Header from "./header";
import MobileNav from "./mobile-nav";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      {/* 모바일 앱 컨테이너 */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative">
        <Header />
        <main className="pt-16 pb-20">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
