import { 
  registrationData, 
  searchCrops, 
  getCropsByCategory, 
  getCategories, 
  getCropById,
  type RegistrationData 
} from '@/shared/data/registration';

export interface CropSearchResult {
  id: string;
  대분류: string;
  품목: string;
  품종: string;
  파종육묘구분?: string;
}

export class ServerRegistrationRepository {
  /**
   * 작물 검색 - 로컬 데이터에서 대분류, 품목, 품종으로 검색
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
      console.log('📡 searchCrops 함수 호출 전');
      const results = searchCrops(searchTerm);
      console.log('📡 searchCrops 함수 호출 후, 결과:', results);
      
      const mappedResults = results.map(result => ({
        id: result.id,
        대분류: result.대분류,
        품목: result.품목,
        품종: result.품종,
        파종육묘구분: result.파종육묘구분,
      }));
      
      console.log('✅ 서버 검색 최종 결과:', mappedResults);
      return mappedResults;
    } catch (error) {
      console.error('❌ 서버 작물 검색 실패:', error);
      return [];
    }
  }

  /**
   * 특정 작물 정보 조회
   * @param cropId 작물 ID
   * @returns 작물 정보
   */
  async getCropById(cropId: string): Promise<CropSearchResult | null> {
    try {
      const result = getCropById(cropId);
      if (!result) return null;
      
      return {
        id: result.id,
        대분류: result.대분류,
        품목: result.품목,
        품종: result.품종,
        파종육묘구분: result.파종육묘구분,
      };
    } catch (error) {
      console.error('작물 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 대분류별 작물 목록 조회
   * @param category 대분류
   * @returns 해당 대분류의 작물 목록
   */
  async getCropsByCategory(category: string): Promise<CropSearchResult[]> {
    try {
      const results = getCropsByCategory(category);
      return results.map(result => ({
        id: result.id,
        대분류: result.대분류,
        품목: result.품목,
        품종: result.품종,
        파종육묘구분: result.파종육묘구분,
      }));
    } catch (error) {
      console.error('대분류별 작물 조회 실패:', error);
      return [];
    }
  }

  /**
   * 모든 대분류 목록 조회
   * @returns 대분류 목록
   */
  async getCategories(): Promise<string[]> {
    try {
      return getCategories();
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
      const results = registrationData.slice(0, 5); // 처음 5개만 반환
      console.log('🧪 서버 연결 테스트 결과:', results);
      return results;
    } catch (error) {
      console.error('❌ 서버 연결 테스트 실패:', error);
      return [];
    }
  }

  /**
   * 전체 데이터 조회 (관리용)
   */
  async getAllData(): Promise<RegistrationData[]> {
    return registrationData;
  }
}

// 싱글톤 인스턴스 생성
export const serverRegistrationRepository = new ServerRegistrationRepository();
