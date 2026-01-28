# FarmMate 배포 가이드 (Vercel)

## 배포가 안 될 때 체크리스트

### 1. Root Directory 설정 (가장 흔한 원인)

이 저장소는 **앱 코드가 `FarmMate` 폴더 안에** 있습니다.  
Vercel 대시보드에서 **Root Directory**를 반드시 설정해야 합니다.

1. Vercel 대시보드 → 프로젝트 선택 → **Settings** → **General**
2. **Root Directory**에서 **Edit** 클릭
3. `FarmMate` 입력 (저장소 루트가 아닌, **package.json이 있는 하위 폴더**)
4. **Save** 후 다시 **Redeploy**

Root Directory를 비워두면 저장소 루트에서 `package.json`을 찾는데, 이 프로젝트는 루트에 `package.json`이 없어 빌드가 실패합니다.

---

### 2. 환경 변수 설정

빌드/실행 시 아래 환경 변수가 필요합니다.  
Vercel → **Settings** → **Environment Variables**에서 추가하세요.

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `VITE_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon public key |
| `VITE_GOOGLE_CLIENT_ID` | 권장 | Google 로그인 사용 시 |
| `VITE_KMA_SERVICE_KEY` | 선택 | 기상청 API 사용 시 |

- **Production**, **Preview**, **Development** 중 필요한 환경에 체크 후 저장
- 환경 변수 수정 후에는 **Redeploy** 필요

---

### 3. 빌드 명령어 / 출력 폴더

- **Build Command**: `npm run build` (기본값 사용 가능)
- **Output Directory**: `dist` (Vite 기본값)
- **Install Command**: `npm install` (기본값)

Root Directory를 `FarmMate`로 설정했다면, 위 값은 Vercel이 자동으로 인식합니다.  
직접 지정한다면 **Settings** → **Build & Development**에서 위와 같이 설정하면 됩니다.

---

### 4. 로컬에서 빌드 확인

배포 전에 로컬에서 빌드가 되는지 확인하세요.

```bash
cd FarmMate
npm install
npm run build
```

성공하면 `dist/` 폴더가 생성됩니다.  
로컬 빌드는 되는데 Vercel에서만 실패한다면, 대부분 **Root Directory** 또는 **환경 변수** 문제입니다.

---

### 5. Vercel 빌드 로그 확인

1. Vercel 대시보드 → **Deployments** → 실패한 배포 클릭
2. **Building** 단계 로그 확인
3. 자주 나오는 메시지:
   - `No package.json found` → Root Directory를 `FarmMate`로 설정
   - `Cannot find module` / 경로 오류 → Root Directory가 `FarmMate`인지 다시 확인
   - 런타임 오류(빌드는 성공, 사이트 접속 시 오류) → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등 환경 변수 설정 여부 확인

---

## 요약

| 원인 | 해결 |
|------|------|
| Root Directory 미설정 | Settings → General → Root Directory = `FarmMate` |
| 환경 변수 누락 | Settings → Environment Variables에 Supabase 등 추가 |
| 빌드 스크립트/출력 경로 | Root를 `FarmMate`로 두면 기본값으로 동작 |
