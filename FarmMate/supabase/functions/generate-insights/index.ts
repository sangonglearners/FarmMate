import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      console.error("[generate-insights] DEEPSEEK_API_KEY가 설정되지 않았습니다.");
      return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY가 설정되지 않았습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { insights } = body;

    if (!insights) {
      console.error("[generate-insights] insights 데이터가 없습니다.");
      return new Response(JSON.stringify({ error: "insights 데이터가 없습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 데이터가 없으면 DeepSeek 호출 생략
    if (!insights.hasRevenue && !insights.hasCropShare) {
      return new Response(JSON.stringify({ insight: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cropLine =
      insights.hasCropShare && insights.topCrops?.length > 0
        ? `- 상위 작물: ${insights.topCrops
            .map((c: { name: string; value: number }, i: number) => `${i + 1}위 ${c.name} ₩${Math.round(c.value).toLocaleString()}원`)
            .join(", ")}\n- 상위 3개 작물 비중: ${Number(insights.topShare).toFixed(1)}%`
        : "- 작물별 매출 데이터 없음";

    // 날씨 컨텍스트 구성
    const weather = insights.weather ?? null;
    let weatherLine = "";
    if (weather) {
      const precipMap: Record<string, string> = { "0": "없음", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기" };
      const skyMap: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };
      const precipText = precipMap[weather.precipitationType] ?? "없음";
      const skyText = skyMap[weather.skyCondition] ?? "-";
      const minTempText = weather.minTemperature ? `최저 ${weather.minTemperature}°C, ` : "";
      weatherLine = `- 오늘 날씨(${weather.location}): 현재 ${weather.temperature}°C, ${minTempText}습도 ${weather.humidity}%, 풍속 ${weather.windSpeed}m/s, 하늘 ${skyText}, 강수 ${precipText}`;
    }

    // 매출 농장별 분리
    const rev = insights.revenueByFarm ?? null;
    let revenueLine = `- 이번 달 총 ${insights.metricLabel}: ₩${Math.round(insights.totalValue).toLocaleString()}원`;
    if (rev) {
      revenueLine += ` (내 농장 ₩${Math.round(rev.ownValue).toLocaleString()}원`;
      if (rev.friendValue !== null && rev.friendValue !== undefined) {
        revenueLine += `, 친구 농장 ₩${Math.round(rev.friendValue).toLocaleString()}원`;
      }
      revenueLine += ")";
    }

    // 작업 현황 농장별 분리
    const taskStats = insights.taskStats ?? null;
    let taskLine = "";
    if (taskStats?.own) {
      const o = taskStats.own;
      taskLine = `- 내 농장 작업: 이번 달 완료 ${o.completedThisMonth}건, 지연 ${o.delayedCount}건, 이번 주 예정 ${o.upcomingThisWeek}건`;
      if (taskStats.friend) {
        const f = taskStats.friend;
        taskLine += `\n- 친구 농장 작업: 지연 ${f.delayedCount}건, 이번 주 예정 ${f.upcomingThisWeek}건`;
      }
    }

    const prompt = `
농업 경영 데이터를 바탕으로 농부에게 실용적인 인사이트를 한국어로 3~4문장으로 제공해줘.
친근하고 따뜻한 말투를 사용해줘. 번호나 기호 없이 자연스러운 문장으로만 작성해줘.
문장 구성 순서 (출력에 번호 표시 금지):
- 첫 번째: 날씨를 한 문장으로 간략히 언급 (이상기후나 주의사항이 없으면 생략 가능)
- 두 번째~세 번째: 매출·작물 성과 분석을 핵심 내용으로 (가장 비중 높게 다뤄줘)
- 마지막: 작업 현황을 한 문장으로만 덧붙이기. 농장을 지칭할 때는 반드시 '내 농장', '친구 농장'이라고 구체적으로 명시해줘.
${revenueLine}
- ${insights.periodLabel} ${insights.unitLabel} 평균: ₩${Math.round(insights.avgValue).toLocaleString()}원
${cropLine}
${weatherLine}
${taskLine}
    `.trim();

    console.log("[generate-insights] DeepSeek 호출 시작");

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 450,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[generate-insights] DeepSeek API 오류: ${res.status}`, errText);
      return new Response(
        JSON.stringify({ error: `DeepSeek API 오류: ${res.status}`, detail: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    console.log("[generate-insights] 성공");
    return new Response(JSON.stringify({ insight: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-insights] 예외 발생:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
