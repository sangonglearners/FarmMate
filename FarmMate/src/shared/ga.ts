// src/shared/ga.ts

declare global {
    interface Window {
      gtag?: (...args: any[]) => void;
    }
  }
  
  // 화면 진입(page_view) 이벤트
  export function sendPageView(screenName: string) {
    if (!window.gtag) return;
  
    const path = window.location.pathname + window.location.search;
  
    window.gtag("event", "page_view", {
      page_title: screenName,
      page_path: path,
      screen_name: screenName,
    });
  }
  
  // 버튼 클릭 등 커스텀 이벤트
  export function sendEvent(
    eventName: string,
    params: Record<string, any> = {}
  ) {
    if (!window.gtag) return;
    window.gtag("event", eventName, params);
  }
  