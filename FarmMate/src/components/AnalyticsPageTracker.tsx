import { useEffect } from "react";
import { useLocation } from "wouter";
import { getPageMeta } from "@/lib/routeAnalytics";
import { trackPageView } from "@/lib/analytics";

export default function AnalyticsPageTracker() {
  const [location] = useLocation();

  useEffect(() => {
    if (location === "/login") return;

    const pageMeta = getPageMeta(location);

    trackPageView({
      page_name: pageMeta.page_name,
      page_category: pageMeta.page_category,
      page_path: location,
    });
  }, [location]);

  return null;
}
