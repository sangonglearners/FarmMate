# FarmMate 친구 맺기 및 농장 공유 기능 PRD (Product Requirements Document)

## 📋 개요
FarmMate 어플리케이션의 친구 맺기 및 농장 공유 기능에 대한 종합적인 제품 요구사항 문서입니다. 사용자 간의 농장 정보 공유, 친구 관리, 그리고 타인의 농장 현황을 조회할 수 있는 소셜 기능을 정의합니다.

---

## 🎯 핵심 목표
- **친구 맺기 시스템**을 통한 농업인 네트워킹 구축
- **농장 공유 기능**으로 농업 경험과 노하우 교환 촉진
- **타인 농장 조회**를 통한 농업 학습 기회 제공
- **프라이버시 보호**와 **선택적 공유**로 안전한 정보 교환

---

## 🏗️ Phase 1: 사용자 식별 시스템 (기본 구조)

### 1.1 사용자 프로필 시스템
- [ ] **고유 사용자 ID 생성** - 사용자별 고유 식별자 생성 (예: farmmate_123456)
- [ ] **사용자 프로필 정보** - 닉네임, 프로필 이미지, 자기소개, 지역 정보
- [ ] **농장 소개** - 주요 재배 작물, 농장 규모, 농업 경력
- [ ] **공개 설정** - 프로필 공개 범위 설정 (전체 공개/친구만/비공개)

### 1.2 데이터베이스 구조 설계
- [ ] **users 테이블 확장** - 프로필 정보, 공개 설정, 고유 ID 추가
- [ ] **friends 테이블 생성** - 친구 관계 관리 테이블
- [ ] **friend_requests 테이블 생성** - 친구 요청 관리 테이블
- [ ] **shared_farms 테이블 생성** - 농장 공유 권한 관리 테이블

### 1.3 마이페이지 확장
- [ ] **고유 ID 표시** - 사용자의 고유 ID 표시 및 복사 기능
- [ ] **QR 코드 생성** - 친구 추가를 위한 QR 코드 생성
- [ ] **프로필 편집** - 닉네임, 소개, 공개 설정 등 편집 기능
- [ ] **농장 공개 설정** - 농장별 공개 범위 설정 (친구 공개/비공개)

---

## 🤝 Phase 2: 친구 맺기 시스템

### 2.1 친구 검색 및 추가
- [ ] **ID로 친구 검색** - 고유 ID 입력을 통한 사용자 검색
- [ ] **QR 코드 스캔** - QR 코드를 통한 친구 추가
- [ ] **주변 농업인 추천** - 지역 기반 사용자 추천 (선택사항)
- [ ] **친구 요청 발송** - 친구 추가 요청 전송 기능

### 2.2 친구 요청 관리
- [ ] **요청 알림** - 친구 요청 수신 시 알림 표시
- [ ] **요청 수락/거절** - 친구 요청에 대한 승인/거부 처리
- [ ] **요청 내역 관리** - 보낸/받은 요청 목록 및 상태 관리
- [ ] **차단 기능** - 원하지 않는 사용자 차단

### 2.3 친구 목록 관리
- [ ] **친구 목록 표시** - 승인된 친구들의 목록 표시
- [ ] **친구 분류** - 그룹별 친구 분류 기능 (동네 농업인, 같은 작물, 등)
- [ ] **친구 검색** - 친구 목록 내에서 이름으로 검색
- [ ] **친구 삭제** - 친구 관계 해제 기능

---

## 🌱 Phase 3: 농장 공유 시스템

### 3.1 농장 공개 설정
- [ ] **공개 범위 설정** - 농장별 공개 범위 (전체 공개/친구만/비공개)
- [ ] **정보 선택적 공유** - 작업 일정, 작물 현황, 수확량 등 선택적 공개
- [ ] **실시간 공유 토글** - 실시간 작업 진행 상황 공유 여부
- [ ] **임시 공유 링크** - 일정 기간 동안만 유효한 공유 링크 생성

### 3.2 공유 권한 관리
- [ ] **세밀한 권한 설정** - 조회만/댓글 가능/작업 추가 가능 등 권한 레벨
- [ ] **농장별 개별 권한** - 농장마다 다른 공유 권한 설정
- [ ] **기간 제한 공유** - 특정 기간 동안만 공유 허용
- [ ] **공유 내역 로그** - 누가 언제 내 농장을 조회했는지 기록

### 3.3 공유 데이터 필터링
- [ ] **민감 정보 제외** - 개인정보, 위치 정보 등 민감 데이터 자동 필터링
- [ ] **수익 정보 보호** - 매출, 비용 등 경영 정보 별도 권한 관리
- [ ] **작업 메모 제어** - 개인적인 메모와 공유 가능한 메모 구분
- [ ] **이미지 공유 설정** - 농장 사진, 작물 사진 공유 여부 설정

---

## 👀 Phase 4: 타인 농장 조회 시스템

### 4.1 친구 농장 목록
- [ ] **친구 농장 리스트** - 공유 허용된 친구들의 농장 목록 표시
- [ ] **농장 미리보기** - 농장명, 주요 작물, 최근 활동 요약
- [ ] **즐겨찾기 농장** - 자주 보는 농장을 즐겨찾기로 저장
- [ ] **농장 검색/필터** - 작물별, 지역별, 농장 규모별 필터링

### 4.2 농장 상세 조회
- [ ] **읽기 전용 뷰** - 타인 농장의 작업 일정, 작물 현황을 읽기 전용으로 표시
- [ ] **캘린더 뷰** - 친구 농장의 작업 일정을 캘린더 형태로 표시
- [ ] **작물별 진행 현황** - 파종부터 수확까지의 진행 상황 시각화
- [ ] **성장 기록** - 작물의 성장 과정과 관련 사진들 타임라인 표시

### 4.3 상호작용 기능
- [ ] **댓글 시스템** - 친구 농장의 작업이나 작물에 댓글 남기기
- [ ] **좋아요/응원** - 농장 활동에 대한 응원 표시
- [ ] **경험 공유** - 비슷한 경험이나 조언 공유 기능
- [ ] **질문/답변** - 농업 관련 질문과 답변 교환

---

## 📚 Phase 5: 학습 및 추천 시스템

### 5.1 농업 노하우 공유
- [ ] **성공 사례 공유** - 좋은 결과를 얻은 농법이나 경험 공유
- [ ] **실패 경험 공유** - 실패 경험을 통한 학습 기회 제공
- [ ] **작물별 팁 모음** - 작물별로 정리된 재배 팁과 노하우
- [ ] **계절별 추천** - 계절에 맞는 농업 활동 추천

### 5.2 비교 분석 기능
- [ ] **진행도 비교** - 같은 작물을 재배하는 친구들과 진행도 비교
- [ ] **작업 시기 비교** - 지역별, 농장별 작업 시기 차이 분석
- [ ] **수확량 비교** - 익명화된 수확량 데이터 비교 (선택적)
- [ ] **작업 효율성 분석** - 작업 방법에 따른 효율성 비교

### 5.3 추천 시스템
- [ ] **비슷한 농장 추천** - 재배 작물, 농장 규모가 비슷한 농장 추천
- [ ] **작업 시기 알림** - 친구들의 작업 시기를 참고한 알림
- [ ] **신품종 정보** - 친구들이 재배하는 새로운 품종 정보 공유
- [ ] **농법 추천** - 친구들이 사용하는 농법 정보 제공

---

## 🔐 Phase 6: 보안 및 프라이버시

### 6.1 데이터 보안
- [ ] **RLS 정책 확장** - friends, shared_farms 테이블에 Row Level Security 적용
- [ ] **공유 권한 검증** - 데이터 요청 시 공유 권한 실시간 검증
- [ ] **암호화된 공유** - 민감한 정보는 암호화하여 저장 및 전송
- [ ] **접근 로그** - 농장 데이터 접근 기록 저장 및 모니터링

### 6.2 프라이버시 제어
- [ ] **세밀한 공개 설정** - 항목별 세밀한 공개 범위 설정
- [ ] **임시 비공개** - 일시적으로 모든 공유를 중단하는 기능
- [ ] **데이터 삭제** - 공유 데이터 완전 삭제 기능
- [ ] **익명화 옵션** - 개인 식별 정보를 제거한 익명 공유

### 6.3 신고 및 차단 시스템
- [ ] **부적절한 사용 신고** - 악용 사례 신고 기능
- [ ] **자동 차단 시스템** - 의심스러운 활동 자동 감지 및 차단
- [ ] **관리자 검토** - 신고된 사례에 대한 관리자 검토 프로세스
- [ ] **사용자 평가** - 친구들 간의 상호 평가 시스템

---

## 📱 Phase 7: UI/UX 구현

### 7.1 마이페이지 확장
- [ ] **친구 관리 탭** - 친구 목록, 요청 관리, 차단 목록
- [ ] **공유 설정 탭** - 농장별 공유 설정, 권한 관리
- [ ] **활동 내역 탭** - 내가 남긴/받은 댓글, 조회 기록
- [ ] **프로필 편집** - 개인 정보, 농장 소개 편집

### 7.2 친구 농장 탐색 화면
- [ ] **카드형 농장 목록** - 친구들의 농장을 카드 형태로 표시
- [ ] **필터 및 검색** - 작물, 지역, 활동 상태별 필터
- [ ] **즐겨찾기 표시** - 자주 보는 농장 우선 표시
- [ ] **최근 활동 표시** - 각 농장의 최근 활동 요약

### 7.3 농장 상세 뷰
- [ ] **탭 기반 네비게이션** - 개요/캘린더/작물현황/갤러리 탭
- [ ] **반응형 디자인** - 모바일과 데스크톱 최적화
- [ ] **실시간 업데이트** - 새로운 활동이 있을 때 실시간 표시
- [ ] **공유 기능** - 특정 내용을 다른 친구들과 공유

### 7.4 소셜 인터랙션 UI
- [ ] **댓글 시스템** - 대댓글, 좋아요, 신고 기능 포함
- [ ] **알림 센터** - 댓글, 좋아요, 친구 요청 등 통합 알림
- [ ] **채팅 기능** - 1:1 간단한 메시지 교환 (선택사항)
- [ ] **활동 피드** - 친구들의 최근 농장 활동 피드

---

## 🗄️ 데이터베이스 스키마 설계

### 새로 추가될 테이블들

#### users 테이블 확장
```sql
ALTER TABLE users ADD COLUMN:
- unique_id VARCHAR(50) UNIQUE NOT NULL -- farmmate_123456 형태
- nickname VARCHAR(100)
- bio TEXT
- profile_image_url VARCHAR(500)
- location VARCHAR(200)
- farm_experience INTEGER -- 농업 경력 (년)
- main_crops TEXT[] -- 주요 재배 작물들
- is_profile_public BOOLEAN DEFAULT false
- created_at TIMESTAMP DEFAULT NOW()
- updated_at TIMESTAMP DEFAULT NOW()
```

#### friends 테이블
```sql
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active', -- active, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);
```

#### friend_requests 테이블
```sql
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);
```

#### shared_farms 테이블
```sql
CREATE TABLE shared_farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_id UUID REFERENCES users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) DEFAULT 'read', -- read, comment, collaborate
  can_view_tasks BOOLEAN DEFAULT true,
  can_view_crops BOOLEAN DEFAULT true,
  can_view_notes BOOLEAN DEFAULT false,
  can_view_images BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(farm_owner_id, shared_with_id, farm_id)
);
```

#### social_activities 테이블
```sql
CREATE TABLE social_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50), -- view_farm, like_task, comment_task
  target_type VARCHAR(50), -- farm, task, crop
  target_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### comments 테이블
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(50), -- task, crop, farm
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 기술 구현 사항

### 6.1 API 엔드포인트 설계
```typescript
// 친구 관련 API
POST /api/friends/search - 사용자 검색
POST /api/friends/request - 친구 요청 보내기
PUT /api/friends/request/:id - 친구 요청 수락/거절
DELETE /api/friends/:id - 친구 삭제
GET /api/friends - 친구 목록 조회

// 농장 공유 관련 API
PUT /api/farms/:id/sharing - 농장 공유 설정 변경
GET /api/shared-farms - 공유받은 농장 목록
GET /api/farms/:id/shared - 특정 농장의 공유 데이터 조회
POST /api/farms/:id/share - 농장 공유 권한 부여

// 소셜 활동 관련 API
POST /api/comments - 댓글 작성
GET /api/comments/:targetType/:targetId - 댓글 목록 조회
POST /api/activities/like - 좋아요 표시
GET /api/activities/feed - 활동 피드 조회
```

### 6.2 실시간 기능 구현
- [ ] **WebSocket 연결** - 실시간 알림 및 업데이트
- [ ] **Supabase Realtime** - 댓글, 좋아요 실시간 동기화
- [ ] **푸시 알림** - 친구 요청, 댓글, 좋아요 알림
- [ ] **오프라인 지원** - 네트워크 복구 시 자동 동기화

### 6.3 성능 최적화
- [ ] **데이터 페이지네이션** - 대량 데이터 효율적 로딩
- [ ] **이미지 압축** - 프로필, 농장 이미지 최적화
- [ ] **캐싱 전략** - 자주 접근하는 데이터 캐싱
- [ ] **검색 인덱스** - 사용자 검색 성능 최적화

---

## 📊 성공 지표 및 측정 방법

### 사용자 참여 지표
- [ ] **친구 맺기 성공률** - 친구 요청 대비 수락률 측정
- [ ] **농장 공유 활성화율** - 공유 설정을 활성화한 사용자 비율
- [ ] **타인 농장 조회 빈도** - 평균 농장 조회 횟수 및 체류 시간
- [ ] **소셜 인터랙션 참여도** - 댓글, 좋아요, 공유 활동 빈도

### 플랫폼 성장 지표
- [ ] **네트워크 효과** - 친구 수에 따른 사용자 유지율 변화
- [ ] **바이럴 계수** - 한 사용자가 초대하는 평균 친구 수
- [ ] **커뮤니티 활성도** - 일일/주간/월간 소셜 활동 수
- [ ] **지식 공유 효과** - 공유된 농업 정보의 활용도

### 기술적 지표
- [ ] **API 응답 속도** - 친구 검색, 농장 조회 응답 시간
- [ ] **실시간 동기화 성능** - 댓글, 알림 실시간 전달 속도
- [ ] **데이터 보안 검증** - 권한 없는 접근 차단율
- [ ] **시스템 안정성** - 동시 접속자 증가에 따른 성능 변화

---

## 🚀 향후 개발 로드맵

### Phase 1-2: 기본 친구 맺기 (2개월)
1. 사용자 프로필 시스템 구축
2. 친구 요청/수락/관리 기능 개발
3. 기본 보안 및 프라이버시 설정

### Phase 3-4: 농장 공유 시스템 (2개월)
1. 농장 공유 권한 관리 시스템
2. 타인 농장 조회 기능 개발
3. 읽기 전용 뷰 및 필터링 기능

### Phase 5-6: 소셜 기능 확장 (2개월)
1. 댓글, 좋아요, 활동 피드 시스템
2. 고급 보안 및 신고 시스템
3. 학습 및 추천 알고리즘 구현

### Phase 7: UI/UX 완성 (1개월)
1. 모바일 최적화 및 반응형 디자인
2. 실시간 알림 및 푸시 기능
3. 성능 최적화 및 테스트

---

## 📝 결론

FarmMate의 친구 맺기 및 농장 공유 기능은 농업인들 간의 **지식 공유와 네트워킹**을 촉진하는 핵심 소셜 기능입니다. 

### 🎯 **핵심 가치 제안**
- 🤝 **농업인 네트워킹**: 지역과 작물을 기반으로 한 농업인 연결
- 📚 **지식 공유**: 실전 경험과 노하우의 상호 교환
- 🔒 **안전한 공유**: 세밀한 권한 설정으로 원하는 만큼만 공유
- 📈 **학습 기회**: 다른 농장의 사례를 통한 농업 기술 향상

### 🔐 **보안 및 프라이버시 우선**
사용자의 농장 정보는 매우 민감한 데이터이므로, 모든 공유 기능은 **사용자의 명시적 동의**를 바탕으로 하며, **언제든 취소 가능한** 형태로 구현됩니다.

이 기능을 통해 FarmMate는 단순한 농장 관리 도구를 넘어 **농업인 커뮤니티 플랫폼**으로 진화할 수 있을 것입니다.
