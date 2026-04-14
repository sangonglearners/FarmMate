export type PageMeta = {
  page_name: string;
  page_category: string;
};

export function getPageMeta(path: string): PageMeta {
  if (path === "/login") {
    return {
      page_name: "login",
      page_category: "login",
    };
  }

  if (path === "/") {
    return {
      page_name: "home",
      page_category: "home",
    };
  }

  if (path === "/farms" || path === "/crops") {
    return {
      page_name: "farm_crop",
      page_category: "farm_crop",
    };
  }

  if (path === "/calendar") {
    return {
      page_name: "calendar",
      page_category: "calendar",
    };
  }

  if (path === "/stats") {
    return {
      page_name: "dashboard",
      page_category: "dashboard",
    };
  }

  // /recommendations 는 input과 동일 취급
  if (path === "/recommendations" || path === "/recommendations/input") {
    return {
      page_name: "recommendations_input",
      page_category: "recommendations",
    };
  }

  if (path === "/recommendations/loading") {
    return {
      page_name: "recommendations_loading",
      page_category: "recommendations",
    };
  }

  if (path === "/recommendations/result") {
    return {
      page_name: "recommendations_result",
      page_category: "recommendations",
    };
  }

  if (path === "/recommendations/history") {
    return {
      page_name: "recommendations_history",
      page_category: "recommendations",
    };
  }

  // /recommendations/history/:id
  if (/^\/recommendations\/history\/[^/]+$/.test(path)) {
    return {
      page_name: "recommendations_history_detail",
      page_category: "recommendations",
    };
  }

  if (path === "/my-page") {
    return {
      page_name: "my_page",
      page_category: "my_page",
    };
  }

  if (path === "/ledger-management") {
    return {
      page_name: "ledger_management",
      page_category: "ledger",
    };
  }

  if (path === "/farm-crop-management") {
    return {
      page_name: "farm_crop_management",
      page_category: "farm_crop_management",
    };
  }

  if (path === "/auth/callback") {
    return {
      page_name: "auth_callback",
      page_category: "auth",
    };
  }

  return {
    page_name: "unknown",
    page_category: "unknown",
  };
}
