declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export type PageViewParams = {
  page_name: string;
  page_category: string;
  page_path: string;
};

export function trackPageView(params: PageViewParams) {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;

  window.gtag("event", "page_view", {
    page_name: params.page_name,
    page_category: params.page_category,
    page_path: params.page_path,
  });
}
