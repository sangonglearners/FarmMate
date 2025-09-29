# Supabase 구글 로그인 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트를 생성합니다.
2. 프로젝트가 생성되면 Settings > API에서 다음 정보를 확인합니다:
   - Project URL
   - anon public key

## 2. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 3. Supabase에서 구글 OAuth 설정

### 3.1 Google Cloud Console에서 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Credentials"로 이동
4. "Create Credentials" > "OAuth 2.0 Client IDs" 클릭
5. Application type을 "Web application"으로 선택
6. Authorized redirect URIs에 다음을 추가:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
   (your-project-ref는 Supabase 프로젝트 URL에서 확인 가능)

### 3.2 Supabase에서 구글 프로바이더 설정

1. Supabase 대시보드에서 "Authentication" > "Providers"로 이동
2. Google 프로바이더를 활성화
3. Google Cloud Console에서 받은 Client ID와 Client Secret을 입력
4. Save 클릭

## 4. 리다이렉트 URL 설정

Supabase 대시보드에서 "Authentication" > "URL Configuration"에서 다음을 설정:

- Site URL: `http://localhost:5175` (개발용)
- Redirect URLs: `http://localhost:5175/auth/callback`

## 5. 사용법

### 컴포넌트에서 사용

```tsx
import { GoogleLoginButton } from './components/GoogleLoginButton'
import { useAuth } from './contexts/AuthContext'

function LoginPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>로딩 중...</div>
  }

  if (user) {
    return <div>환영합니다, {user.email}!</div>
  }

  return (
    <div>
      <h1>로그인</h1>
      <GoogleLoginButton />
    </div>
  )
}
```

### 인증 상태 확인

```tsx
import { useAuth } from './contexts/AuthContext'

function ProtectedComponent() {
  const { user, signOut } = useAuth()

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  return (
    <div>
      <p>안녕하세요, {user.email}!</p>
      <button onClick={signOut}>로그아웃</button>
    </div>
  )
}
```

## 6. 문제 해결

### 환경변수가 인식되지 않는 경우

1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. Vite 개발 서버를 재시작
3. 브라우저 캐시를 삭제

### 구글 로그인이 작동하지 않는 경우

1. Google Cloud Console의 OAuth 설정 확인
2. Supabase의 구글 프로바이더 설정 확인
3. 리다이렉트 URL이 올바르게 설정되었는지 확인
4. 브라우저 콘솔에서 오류 메시지 확인

### CORS 오류가 발생하는 경우

Supabase 대시보드에서 "Authentication" > "URL Configuration"에서 올바른 도메인을 추가했는지 확인하세요.

## 7. 추가 설정

### 데이터베이스 스키마 설정

Supabase에서 사용자 테이블을 생성하려면 SQL 에디터에서 다음을 실행:

```sql
-- 사용자 프로필 테이블 생성
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 사용자만 자신의 프로필에 접근 가능하도록 정책 설정
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```
