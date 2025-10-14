// Supabase Edge Runtime 타입 선언 (에디터 자동완성/타입 체크 개선용)
import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '@/shared/constants/meta.env';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ⚠️ recommendation.ts가 default export인지 확인하세요.
// default export가 아니라면 아래를 -> `import { CropRecommendationEngine } from "./recommendation.ts";` 로 바꾸세요.
import CropRecommendationEngine from "./recommendation.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type"
};
function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-encoding": "utf-8",
      ...cors,
      ...init.headers || {}
    },
    status: init.status ?? 200
  });
}
Deno.serve(async (req)=>{
  console.log("🚀 요청 받음:", req.method, req.url);
  // 맨 위 근처에 로깅 추가(원인 파악 편의)
  const { method } = req;
  const url = new URL(req.url);
  console.log("➡️ method:", method, "path:", url.pathname);
  // 0) CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors
    });
  }
  // 1) 헬스체크 (GET / 또는 GET /favicon.ico)
  if (method === "GET" && (url.pathname === "/" || url.pathname === "/favicon.ico")) {
  // ... 기존 헬스체크 응답
  }
  // 2) 실제 엔드포인트: POST면 경로 허용 폭을 넓힘
  const pathOk = url.pathname === "/" || url.pathname.endsWith("/recommend") || // /recommend
  url.pathname.endsWith("/functions/v1/recommend"); // /functions/v1/recommend (일부 환경)
  if (method !== "POST" || !pathOk) {
    console.log("❌ 잘못된 요청:", method, url.pathname);
    return json({
      error: "Not Found"
    }, {
      status: 404
    });
  }
  try {
    // --- 요청 파싱 ---
    let body = {};
    try {
      body = await req.json();
    } catch  {
      body = {};
    }
    // 두 가지 키 네이밍 모두 허용: input_* 또는 단순 이름
    const start_month = body.start_month ?? body?.startMonth;
    const end_month = body.end_month ?? body?.endMonth;
    const place = body.input_place ?? body.place;
    const irang = body.input_irang ?? body.irang;
    if (typeof start_month !== "number" || typeof end_month !== "number" || typeof place !== "string" || typeof irang !== "number") {
      return json({
        error: "Invalid payload"
      }, {
        status: 400
      });
    }
    // --- Supabase 클라이언트 ---
    const supabaseUrl = VITE_SUPABASE_URL;
    const supabaseKey = VITE_SUPABASE_ANON_KEY;
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
      return json({
        error: "SUPABASE_URL / SUPABASE_ANON_KEY not set"
      }, {
        status: 500
      });
    }
    // ✅ 호출자 권한으로 RLS 평가되도록 헤더 주입
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? ""
        }
      }
    });
    // --- 데이터 조회 ---
    console.log("🔍 데이터베이스에서 작물 데이터 조회 중...");
    let { data: cropsData, error } = await supabase.from("recommend") // 필요 시 'recommend_view'로 교체
    .select(`
      category,
      item,
      variety,
      labor_score,
      rarity_score,
      sow_start,
      harvest_end,
      profit_open,
      profit_greenhouse
    `);
    if (error) {
      console.error("❌ 데이터베이스 조회 오류:", error);
      throw error;
    }
    console.log(`📊 조회된 작물 데이터 수: ${cropsData?.length || 0}개`);
    
    // 데이터가 없으면 에러 반환
    if (!cropsData || cropsData.length === 0) {
      console.error("❌ 데이터베이스에 작물 데이터가 없습니다.");
      return json({ 
        error: "데이터베이스에 작물 데이터가 없습니다. 관리자에게 문의하세요.",
        ok: false 
      }, { status: 500 });
    }

    // --- 추천 엔진 실행 ---
    const engine = new CropRecommendationEngine();
    let result;
    if (engine && typeof engine.run === "function") {
      // run(payload) 시그니처 지원
      result = await engine.run({
        start_month,
        end_month,
        place,
        irang,
        cropsData
      });
    } else if (engine && typeof engine.recommendCrops === "function") {
      // recommendCrops(...) 시그니처 지원
      result = await engine.recommendCrops(start_month, end_month, place, irang, cropsData);
    } else {
      throw new Error("CropRecommendationEngine에 run 또는 recommendCrops 메서드가 없습니다.");
    }
    return json({
      ok: true,
      result
    });
  } catch (err) {
    return json({
      error: String(err?.message ?? err ?? "Unknown error")
    }, {
      status: 500
    });
  }
});
