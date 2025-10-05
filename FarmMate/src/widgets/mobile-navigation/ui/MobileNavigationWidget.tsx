import React from 'react';

export default function MobileNavigationWidget() {
  return (
    <nav className="bg-white border-t fixed bottom-0 left-0 right-0 md:hidden">
      <div className="flex justify-around py-2">
        <button className="p-2 text-gray-600">홈</button>
        <button className="p-2 text-gray-600">달력</button>
        <button className="p-2 text-gray-600">농장</button>
        <button className="p-2 text-gray-600">내정보</button>
      </div>
    </nav>
  );
}
