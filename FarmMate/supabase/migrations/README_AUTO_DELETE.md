# 📘 추천 기록 자동 삭제 설정 가이드

## 🎯 목적
7일 이상 된 작물 추천 기록을 매일 자동으로 삭제하여 데이터베이스를 깔끔하게 유지합니다.

---

## 📋 사전 준비
- Supabase 프로젝트 접근 권한
- `rec_result` 테이블이 이미 생성되어 있어야 함

---

## 🚀 설정 단계

### **Step 1: Supabase Dashboard 접속**
1. 브라우저에서 [https://supabase.com/dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 (FarmMate 프로젝트)

---

### **Step 2: SQL Editor로 이동**
1. 왼쪽 사이드바에서 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭

---

### **Step 3: SQL 스크립트 실행**
1. `FarmMate/supabase/migrations/setup_auto_delete_recommendations.sql` 파일 내용을 복사
2. SQL Editor에 붙여넣기
3. 우측 하단 **"Run"** 버튼 클릭 (또는 Ctrl+Enter / Cmd+Enter)

**예상 결과:**
```
Success. No rows returned
```

---

### **Step 4: cron 작업 등록 확인**
1. SQL Editor에서 새 쿼리 생성
2. 아래 SQL 실행:
   ```sql
   SELECT * FROM cron.job;
   ```
3. `delete-old-recommendations` 작업이 목록에 표시되는지 확인

**예상 결과:**
| jobid | schedule   | command                                    | nodename  | nodeport | database | username | active |
|-------|------------|-------------------------------------------|-----------|----------|----------|----------|--------|
| 1     | 0 0 * * *  | SELECT delete_old_recommendations();      | localhost | 5432     | postgres | postgres | true   |

---

### **Step 5: (선택) 수동 테스트 실행**
자동 삭제가 제대로 작동하는지 즉시 확인하려면:

1. SQL Editor에서 아래 SQL 실행:
   ```sql
   SELECT delete_old_recommendations();
   ```

2. 실행 이력 확인:
   ```sql
   SELECT * FROM cron.job_run_details 
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

**예상 결과:**
- `status` 컬럼이 `succeeded`로 표시됨
- 7일 이상 된 레코드가 삭제됨

---

## 🔍 모니터링 및 관리

### **cron 작업 실행 이력 확인**
```sql
SELECT 
  jobid,
  runid,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'delete-old-recommendations')
ORDER BY start_time DESC 
LIMIT 10;
```

### **cron 작업 일시 중지**
```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'delete-old-recommendations';
```

### **cron 작업 재개**
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'delete-old-recommendations';
```

### **cron 작업 삭제 (완전 제거)**
```sql
SELECT cron.unschedule('delete-old-recommendations');
```

---

## ⚠️ 주의사항

1. **타임존**: cron은 UTC 시간 기준으로 실행됩니다.
   - `0 0 * * *` = 매일 00:00 UTC (한국 시간 09:00)
   
2. **하드 삭제**: 삭제된 데이터는 복구할 수 없습니다.

3. **무료 티어**: Supabase 무료 티어에서도 `pg_cron` 사용 가능합니다.

4. **RLS (Row Level Security)**: 
   - 함수는 `SECURITY DEFINER`로 설정되어 RLS를 우회합니다.
   - 모든 사용자의 오래된 레코드가 삭제됩니다.

---

## ✅ 확인 체크리스트

- [ ] SQL 스크립트 실행 완료
- [ ] `cron.job` 테이블에서 작업 확인
- [ ] (선택) 수동 테스트 실행 및 로그 확인
- [ ] UI에서 "7일 후 삭제" 안내 문구 확인

---

## 🆘 문제 해결

### **"extension pg_cron does not exist" 오류**
- Supabase에서 `pg_cron`이 비활성화된 경우
- 해결: Database > Extensions > pg_cron 활성화

### **cron 작업이 실행되지 않음**
1. 작업이 `active = true`인지 확인
2. `cron.job_run_details`에서 에러 메시지 확인
3. 함수 직접 실행하여 에러 확인

### **권한 오류**
- 함수가 `SECURITY DEFINER`로 설정되어 있는지 확인
- Supabase 프로젝트 소유자 계정으로 실행

---

## 📞 추가 도움말
- Supabase pg_cron 공식 문서: https://supabase.com/docs/guides/database/extensions/pg_cron
- cron 표현식 생성기: https://crontab.guru/

