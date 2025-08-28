export const KEY_CROPS = [
  {
    category: "배추",
    name: "미니양배추",
    variety: "디아라",
    description: "작은 크기의 양배추로 가정에서 재배하기 좋음"
  },
  {
    category: "배추",
    name: "미니양배추", 
    variety: "티아라",
    description: "티아라 품종의 미니 양배추"
  },
  {
    category: "배추",
    name: "콜라비",
    variety: "그린",
    description: "줄기 부분을 먹는 배추과 채소"
  },
  {
    category: "배추",
    name: "콜라비",
    variety: "퍼플",
    description: "보라색 줄기의 콜라비"
  },
  {
    category: "뿌리채소",
    name: "당근",
    variety: "오렌지",
    description: "주황색 당근"
  },
  {
    category: "뿌리채소", 
    name: "비트",
    variety: "레드",
    description: "붉은색 비트"
  },
  {
    category: "뿌리채소",
    name: "무",
    variety: "백무",
    description: "흰색 무"
  },
  {
    category: "잎채소",
    name: "상추",
    variety: "청상추",
    description: "녹색 상추"
  },
  {
    category: "잎채소",
    name: "시금치",
    variety: "일반",
    description: "영양이 풍부한 시금치"
  },
  {
    category: "과채류",
    name: "토마토",
    variety: "체리",
    description: "작은 체리 토마토"
  },
  {
    category: "과채류",
    name: "고추",
    variety: "청양고추",
    description: "매운 청양고추"
  }
];

export const CROP_CATEGORIES = [
  "배추", "뿌리채소", "잎채소", "과채류", "콩류", "기타"
];

export const TASK_TYPES = [
  "파종", "육묘", "수확"
];

// 일괄등록용 농작업 계산기 데이터
export const BATCH_TASK_SCHEDULES = {
  "파종": {
    duration: 10,
    description: "씨앗을 뿌리는 작업"
  },
  "육묘": {
    duration: 20,
    description: "모종을 기르는 작업"
  },
  "수확": {
    duration: 20,
    description: "수확과 선별 작업"
  }
};
