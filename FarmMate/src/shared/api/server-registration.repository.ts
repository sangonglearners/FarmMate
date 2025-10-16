import type { RegistrationData } from '@/shared/data/registration'
import { supabase } from '@/shared/api/supabase'

export interface CropSearchResult {
  id: string;
  대분류: string;
  품목: string;
  품종: string;
  파종육묘구분?: string;
  총재배기간?: number;
  육묘기간?: number;
  생육기간?: number;
}

export class ServerRegistrationRepository {
  /**
   * 작물 검색 - Supabase RPC + FTS 사용
   * @param searchTerm 검색어 (한글)
   * @returns 검색 결과 배열
   */
  async searchCrops(searchTerm: string): Promise<CropSearchResult[]> {
    console.log('🔍 ServerRegistrationRepository.searchCrops 호출:', searchTerm);
    
    if (!searchTerm.trim()) {
      console.log('❌ 검색어가 비어있음');
      return [];
    }

    try {
      console.log('📡 Supabase RPC vegelab_search_registration 호출');
      const { data, error } = await supabase.rpc('vegelab_search_registration', { query: searchTerm });
      
      if (error) {
        console.error('❌ Supabase RPC 오류:', error);
        // RPC 함수가 없으면 직접 쿼리로 fallback
        console.log('📡 RPC 실패, 직접 쿼리로 fallback');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('registration')
          .select('*')
          .or(`품목.ilike.%${searchTerm}%,품종.ilike.%${searchTerm}%,대분류.ilike.%${searchTerm}%`)
          .order('품목')
          .limit(50);
          
        if (fallbackError) {
          console.error('❌ Fallback 쿼리도 실패:', fallbackError);
          return [];
        }
        
        const rows = Array.isArray(fallbackData) ? fallbackData : [];
        const mapped: CropSearchResult[] = rows.map((r: any) => ({
          id: String(r.작물번호),
          대분류: r["대분류"] ?? '',
          품목: r["품목"] ?? '',
          품종: r["품종"] ?? '',
          파종육묘구분: r["파종 / 육묘 구분"] ?? undefined,
          총재배기간: r["총 재배기간 (파종 ~ 수확) (단위:일)"] ?? undefined,
          육묘기간: r["육묘기간 (파종 ~ 정식) (단위:일)"] ?? undefined,
          생육기간: r["생육 기간 (밭을 사용하는 기간) (단위:일)"] ?? undefined,
        }));
        console.log('✅ Fallback 쿼리 결과:', mapped.length);
        return mapped;
      }
      
      const rows = Array.isArray(data) ? data : [];
      const mapped: CropSearchResult[] = rows.map((r: any) => ({
        id: String(r.작물번호),
        대분류: r["대분류"] ?? '',
        품목: r["품목"] ?? '',
        품종: r["품종"] ?? '',
        파종육묘구분: r["파종 / 육묘 구분"] ?? undefined,
        총재배기간: r["총 재배기간 (파종 ~ 수확) (단위:일)"] ?? undefined,
        육묘기간: r["육묘기간 (파종 ~ 정식) (단위:일)"] ?? undefined,
        생육기간: r["생육 기간 (밭을 사용하는 기간) (단위:일)"] ?? undefined,
      }));
      console.log('✅ Supabase RPC 결과:', mapped.length);
      return mapped;
    } catch (error) {
      console.error('❌ 서버 작물 검색 실패:', error);
      return [];
    }
  }

  /**
   * 특정 작물 정보 조회 (Supabase)
   * @param cropId 작물 ID
   * @returns 작물 정보
   */
  async getCropById(cropId: string): Promise<CropSearchResult | null> {
    try {
      const { data, error } = await supabase
        .from('registration')
        .select('*')
        .eq('작물번호', cropId)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('❌ Supabase getCropById 오류:', error);
        return null;
      }
      if (!data) return null;
      return {
        id: String(data.작물번호),
        대분류: data["대분류"] ?? '',
        품목: data["품목"] ?? '',
        품종: data["품종"] ?? '',
        파종육묘구분: data["파종 / 육묘 구분"] ?? undefined,
        총재배기간: data["총 재배기간 (파종 ~ 수확) (단위:일)"] ?? undefined,
        육묘기간: data["육묘기간 (파종 ~ 정식) (단위:일)"] ?? undefined,
        생육기간: data["생육 기간 (밭을 사용하는 기간) (단위:일)"] ?? undefined,
      };
    } catch (error) {
      console.error('작물 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 대분류별 작물 목록 조회 (Supabase)
   * @param category 대분류
   * @returns 해당 대분류의 작물 목록
   */
  async getCropsByCategory(category: string): Promise<CropSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('registration')
        .select('*')
        .eq('대분류', category)
        .limit(200);
      if (error) {
        console.error('❌ Supabase getCropsByCategory 오류:', error);
        return [];
      }
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: any) => ({
        id: String(r.작물번호),
        대분류: r["대분류"] ?? '',
        품목: r["품목"] ?? '',
        품종: r["품종"] ?? '',
        파종육묘구분: r["파종 / 육묘 구분"] ?? undefined,
        총재배기간: r["총 재배기간 (파종 ~ 수확) (단위:일)"] ?? undefined,
        육묘기간: r["육묘기간 (파종 ~ 정식) (단위:일)"] ?? undefined,
        생육기간: r["생육 기간 (밭을 사용하는 기간) (단위:일)"] ?? undefined,
      }));
    } catch (error) {
      console.error('대분류별 작물 조회 실패:', error);
      return [];
    }
  }

  /**
   * 모든 대분류 목록 조회 (Supabase Distinct)
   * @returns 대분류 목록
   */
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('registration')
        .select('대분류', { count: 'exact', head: false })
        .neq('대분류', '')
        .order('대분류', { ascending: true });
      if (error) {
        console.error('❌ Supabase getCategories 오류:', error);
        return [];
      }
      const set = new Set<string>();
      (data ?? []).forEach((row: any) => {
        if (row && row["대분류"]) set.add(row["대분류"]);
      });
      return Array.from(set);
    } catch (error) {
      console.error('대분류 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 연결 테스트 - 모든 데이터 조회
   */
  async testConnection(): Promise<RegistrationData[]> {
    console.log('🧪 서버 연결 테스트 시작');
    try {
      const { data, error } = await supabase
        .from('registration')
        .select('*')
        .limit(5);
      if (error) {
        console.error('❌ Supabase testConnection 오류:', error);
        return [];
      }
      return (data ?? []) as unknown as RegistrationData[];
    } catch (error) {
      console.error('❌ 서버 연결 테스트 실패:', error);
      return [];
    }
  }

  /**
   * 전체 데이터 조회 (관리용)
   */
  async getAllData(): Promise<RegistrationData[]> {
    const { data } = await supabase
      .from('registration')
      .select('*')
      .limit(1000);
    return (data ?? []) as unknown as RegistrationData[];
  }
}

// 싱글톤 인스턴스 생성
export const serverRegistrationRepository = new ServerRegistrationRepository();
