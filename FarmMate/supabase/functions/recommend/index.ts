// Supabase Edge Runtime 타입 선언 (에디터 자동완성/타입 체크 개선용)
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CropRecommendationEngine from "./recommendation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // 1) 요청 파싱 — 스펙 고정(예시: snake_case)
    const body = await req.json().catch(() => ({}));
    const { start_month, end_month, place, irang } = body ?? {};

    if (
      typeof start_month !== "number" ||
      typeof end_month !== "number" ||
      typeof place !== "string" ||
      typeof irang !== "number"
    ) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // 2) Supabase 클라이언트
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // 3) 데이터 조회 — 뷰/별칭 사용을 권장 (테이블명이면 'recommend', 뷰면 'recommend_view')
    const { data: cropsData, error } = await supabase
      .from("recommend") // 또는 'recommend_view'
      .select(`
        id,
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

    if (error) throw error;

    // 4) 추천 엔진 실행
    const engine = new CropRecommendationEngine();
    const result = await engine.recommendCrops(
      start_month,
      end_month,
      place,
      irang,
      cropsData
    );

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:0/functions/v1/recommand' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
