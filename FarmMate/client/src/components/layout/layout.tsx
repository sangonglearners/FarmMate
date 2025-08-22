import { ReactNode } from "react";
import Header from "./header";
import MobileNav from "./mobile-nav";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
