import React from 'react';

export default function HeaderWidget() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center">
          <img
            src="/f_log_logo_v3.png"
            alt="서비스 로고"
            className="h-7 w-auto object-contain"
          />
        </div>
      </div>
    </header>
  );
}
