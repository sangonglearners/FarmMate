import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  serverRegistrationRepository,
  type CropSearchResult,
} from '@/shared/api/server-registration.repository';

/**
 * 작물 검색어로 Supabase registration 테이블을 조회하는 훅
 * debounce 적용 (300ms)
 */
export function useRegistrationSearch(searchTerm: string) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['registration-search', debouncedTerm],
    queryFn: () => serverRegistrationRepository.searchCrops(debouncedTerm),
    enabled: debouncedTerm.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });

  return {
    results: data ?? [],
    isLoading,
    error,
  };
}

/**
 * 대분류 목록을 Supabase에서 조회하는 훅
 */
export function useRegistrationCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['registration-categories'],
    queryFn: () => serverRegistrationRepository.getCategories(),
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });

  return {
    categories: data ?? [],
    isLoading,
    error,
  };
}

/**
 * 대분류별 작물 목록을 Supabase에서 조회하는 훅
 */
export function useRegistrationByCategory(category: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['registration-by-category', category],
    queryFn: () => serverRegistrationRepository.getCropsByCategory(category),
    enabled: !!category,
    staleTime: 1000 * 60 * 5,
  });

  return {
    crops: data ?? [],
    isLoading,
    error,
  };
}

/**
 * 단일 작물 정보를 작물번호로 조회하는 훅
 */
export function useRegistrationCropById(cropId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['registration-crop', cropId],
    queryFn: () => serverRegistrationRepository.getCropById(cropId!),
    enabled: !!cropId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    crop: data ?? null,
    isLoading,
    error,
  };
}

/**
 * 전체 작물 목록을 Supabase에서 한 번 불러오는 훅 (브라우즈용)
 * staleTime 30분 - 앱 세션 동안 재요청 없이 캐시 사용
 */
export function useRegistrationAll() {
  const { data, isLoading } = useQuery({
    queryKey: ['registration-all'],
    queryFn: () => serverRegistrationRepository.getAllData(),
    staleTime: 1000 * 60 * 30,
  });

  return {
    allCrops: data ?? [],
    isLoading,
  };
}

export type { CropSearchResult };
