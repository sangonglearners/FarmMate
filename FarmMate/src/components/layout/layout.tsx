import { ReactNode } from 'react';

import Header from './header';
import MobileNav from './mobile-nav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="w-full bg-white min-h-screen shadow-xl relative">
      <Header />
      <main className="pt-16 pb-20">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
