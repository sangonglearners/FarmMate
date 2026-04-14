import { useEffect } from "react";
import { useLocation } from "wouter";
import { getPageMeta } from "@/lib/routeAnalytics";
import { trackPageView } from "@/lib/analytics";

export default function AnalyticsPageTracker() {
  console.log("🔥 AnalyticsPageTracker render");
  const [location] = useLocation();

  useEffect(() => {
    console.log("🔥 AnalyticsPageTracker useEffect", location);
    if (location === "/login") return;

    try {
      const pageMeta = getPageMeta(location);
      console.log("🔥 trackPageView 호출 직전", pageMeta, location);

      trackPageView({
        page_name: pageMeta.page_name,
        page_category: pageMeta.page_category,
        page_path: location,
      });
    } catch (error) {
      console.error("❌ AnalyticsPageTracker error", error);
    }
  }, [location]);

  return null;
}
