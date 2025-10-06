import { supabase } from './supabase';

export interface RecommendationRequest {
  start_month: number;
  end_month: number;
  input_place: string;
  input_irang: number;
}

export interface CropDetail {
  name: string;
  item: string;
  variety: string;
  score: number;
  profit_score: number;
  labor_score: number;
  rarity_score: number;
  수익성_사용: number;
  노동편의성: number;
  품종희소성: number;
}

export interface RecommendationCard {
  title: string;
  crops: string[];
  indicators: {
    수익성: number;
    노동편의성: number;
    품종희소성: number;
  };
  expected_revenue: string;
}

export interface RecommendationResult {
  recommended_combinations: CropDetail[][];
  cards: RecommendationCard[];
  total_profit: number;
  recommended_crops?: CropDetail[];
  error?: string;
}

export interface RecommendationResponse {
  ok: boolean;
  result: RecommendationResult;
}

/**
 * Supabase Edge Function을 호출하여 작물 추천을 받습니다.
 */
export async function getRecommendations(
  params: RecommendationRequest
): Promise<RecommendationResponse> {
  try {
    // Supabase 세션에서 access token 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('로그인이 필요합니다.');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommend`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('작물 추천 API 호출 오류:', error);
    throw error;
  }
}

/**
 * 선택한 추천 결과를 rec_result 테이블에 저장합니다.
 */
export async function saveRecommendationResult(data: {
  farm_id?: string;
  crop_names: string[];
  expected_revenue: string;
  indicators: {
    수익성: number;
    노동편의성: number;
    품종희소성: number;
  };
  combination_detail: CropDetail[];
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data: result, error } = await supabase
      .from('rec_result')
      .insert({
        user_id: user.id,
        farm_id: data.farm_id || null,
        crop_names: data.crop_names,
        expected_revenue: data.expected_revenue,
        indicators: data.indicators,
        combination_detail: data.combination_detail,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return result;
  } catch (error) {
    console.error('추천 결과 저장 오류:', error);
    throw error;
  }
}

