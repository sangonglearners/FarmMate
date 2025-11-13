// 작업 필터링 관련 공통 유틸리티 함수

import type { Task } from "@shared/schema";
import type { FarmEntity } from "@/shared/api/farm.repository";

/**
 * 유효한 농장 ID 집합을 생성합니다.
 * @param ownFarms 사용자가 소유한 농장 목록
 * @param sharedFarms 사용자가 공유받은 농장 목록
 * @returns 유효한 농장 ID의 Set
 */
export const getValidFarmIds = (
  ownFarms: FarmEntity[],
  sharedFarms: FarmEntity[]
): Set<string> => {
  return new Set([
    ...ownFarms.map(f => f.id),
    ...sharedFarms.map(f => f.id)
  ]);
};

/**
 * 소유한 농장 ID 집합을 생성합니다.
 * @param ownFarms 사용자가 소유한 농장 목록
 * @returns 소유한 농장 ID의 Set
 */
export const getOwnFarmIds = (ownFarms: FarmEntity[]): Set<string> => {
  return new Set(ownFarms.map(f => f.id));
};

/**
 * 공유받은 농장 ID 집합을 생성합니다.
 * @param sharedFarms 사용자가 공유받은 농장 목록
 * @returns 공유받은 농장 ID의 Set
 */
export const getSharedFarmIds = (sharedFarms: FarmEntity[]): Set<string> => {
  return new Set(sharedFarms.map(f => f.id));
};

/**
 * 유효한 농장에 속한 작업만 필터링합니다.
 * farmId가 null인 작업은 유효한 것으로 간주합니다.
 * @param tasks 필터링할 작업 목록
 * @param validFarmIds 유효한 농장 ID 집합
 * @returns 필터링된 작업 목록
 */
export const filterTasksByValidFarms = (
  tasks: Task[],
  validFarmIds: Set<string>
): Task[] => {
  return tasks.filter(task => 
    !task.farmId || validFarmIds.has(task.farmId)
  );
};

/**
 * 작업을 소유한 농장과 공유받은 농장으로 분류합니다.
 * @param tasks 분류할 작업 목록
 * @param ownFarmIds 소유한 농장 ID 집합
 * @param sharedFarmIds 공유받은 농장 ID 집합
 * @returns 분류된 작업 객체 { ownTasks, sharedTasks }
 */
export const categorizeTasksByOwnership = (
  tasks: Task[],
  ownFarmIds: Set<string>,
  sharedFarmIds: Set<string>
): { ownTasks: Task[]; sharedTasks: Task[] } => {
  const ownTasks = tasks.filter(task => 
    !task.farmId || ownFarmIds.has(task.farmId)
  );
  const sharedTasks = tasks.filter(task => 
    task.farmId && sharedFarmIds.has(task.farmId)
  );
  
  return { ownTasks, sharedTasks };
};

/**
 * viewer 또는 commenter 권한으로 공유받은 농장을 제외합니다.
 * (Todo 리스트에서는 편집 가능한 작업만 표시하기 위함)
 * @param tasks 필터링할 작업 목록
 * @param viewerAndCommenterFarmIds viewer/commenter 권한 농장 ID 집합
 * @returns 필터링된 작업 목록
 */
export const excludeViewerAndCommenterTasks = (
  tasks: Task[],
  viewerAndCommenterFarmIds: Set<string>
): Task[] => {
  return tasks.filter(task => 
    !task.farmId || !viewerAndCommenterFarmIds.has(task.farmId)
  );
};

