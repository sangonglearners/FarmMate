import type { RegistrationData } from '@/shared/data/registration'
import { supabase } from '@/shared/api/supabase'

export interface CropSearchResult {
  id: string;
  대분류: string;
  품목: string;
  품종: string;
  파종육묘구분?: string;
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
      console.log('📡 Supabase RPC vegelab_search_registration 호출 전');
      const { data, error } = await supabase.rpc('vegelab_search_registration', { query: searchTerm });
      if (error) {
        console.error('❌ Supabase RPC 오류:', error);
        return [];
      }
      const rows = Array.isArray(data) ? data : [];
      const mapped: CropSearchResult[] = rows.map((r: any) => ({
        id: String(r.id),
        대분류: r["대분류"] ?? '',
        품목: r["품목"] ?? '',
        품종: r["품종"] ?? '',
        파종육묘구분: r["파종육묘구분"] ?? undefined,
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
        .from('Vegelab_Calendar.registration')
        .select('id, 대분류, 품목, 품종, 파종육묘구분')
        .eq('id', cropId)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('❌ Supabase getCropById 오류:', error);
        return null;
      }
      if (!data) return null;
      return {
        id: String(data.id),
        대분류: data["대분류"] ?? '',
        품목: data["품목"] ?? '',
        품종: data["품종"] ?? '',
        파종육묘구분: data["파종육묘구분"] ?? undefined,
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
        .from('Vegelab_Calendar.registration')
        .select('id, 대분류, 품목, 품종, 파종육묘구분')
        .eq('대분류', category)
        .limit(200);
      if (error) {
        console.error('❌ Supabase getCropsByCategory 오류:', error);
        return [];
      }
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: any) => ({
        id: String(r.id),
        대분류: r["대분류"] ?? '',
        품목: r["품목"] ?? '',
        품종: r["품종"] ?? '',
        파종육묘구분: r["파종육묘구분"] ?? undefined,
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
        .from('Vegelab_Calendar.registration')
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
        .from('Vegelab_Calendar.registration')
        .select('id, 대분류, 품목, 품종, 파종육묘구분')
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
      .from('Vegelab_Calendar.registration')
      .select('id, 대분류, 품목, 품종, 파종육묘구분')
      .limit(1000);
    return (data ?? []) as unknown as RegistrationData[];
  }
}

// 싱글톤 인스턴스 생성
export const serverRegistrationRepository = new ServerRegistrationRepository();
