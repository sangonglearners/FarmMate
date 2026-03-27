import { ReactNode } from 'react';

import MobileNav from './mobile-nav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="w-full bg-[#F5F5F5] min-h-screen shadow-xl relative overflow-x-hidden">
      <main className="pt-2 pb-24 md:pb-20 w-full">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
