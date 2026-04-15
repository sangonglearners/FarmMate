// src/lib/analytics.ts

declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
  }
}

export type PageViewParams = {
  page_name: string;
  page_category: string;
  page_path: string;
};

export function trackPageView(params: PageViewParams) {
  console.log("🔥🔥🔥 trackPageView 실행됨 (진짜 함수)");
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];

  const eventPayload = {
    event: "custom_page_view",
    page_name: params.page_name,
    page_category: params.page_category,
    page_path: params.page_path,
  };

  window.dataLayer.push(eventPayload);

  console.log("custom_page_view push", eventPayload);
}
