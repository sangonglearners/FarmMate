# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FarmMate is a full-stack farming management application with a React frontend and Express.js backend. It's designed as a mobile-first application for managing farms, crops, tasks, and recommendations.

## Key Technologies & Architecture

- **Frontend**: React 18 + TypeScript with Vite
- **Backend**: Express.js + TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth with Admin SDK
- **UI Framework**: TailwindCSS + Radix UI components
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state

## Development Commands

### Primary Development

```bash
npm run dev          # Start development server (client + backend) - runs tsx with hot reload
npm run build        # Build production bundle (Vite + esbuild compilation)
npm run start        # Start production server from dist/
npm run check        # TypeScript type checking across client, server, shared
```

### Database Operations

```bash
npm run db:push      # Push schema changes to database via Drizzle Kit
```

### Environment Setup

- Requires `DATABASE_URL` environment variable for PostgreSQL
- Requires Firebase service account key in `serviceAccountKey.json` (root directory)
- Server runs on port from `PORT` env var (default: 5000)
- Development uses tsx for hot reloading, production uses esbuild bundles

## Project Structure

### Core Architecture

```
FarmMate/
├── client/src/           # React frontend
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route-level components
│   ├── contexts/        # React contexts (Auth)
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Client utilities and config
├── server/              # Express.js backend
│   ├── config/          # Database and Firebase config
│   ├── middleware/      # Authentication middleware
│   └── routes/          # API route handlers
├── shared/              # Shared types and schemas
└── attached_assets/     # Static assets and Firebase key
```

### Database Schema (shared/schema.ts)

- **users**: User authentication data
- **farms**: User farm definitions (environment, area, rows)
- **crops**: Crop instances linked to farms (category, name, variety, status)
- **tasks**: Farm/crop tasks with scheduling and completion tracking
- **cropRecommendations**: AI-generated crop recommendations with scoring

### API Architecture

- **Public API**: `/api/*` - Basic CRUD operations (uses hardcoded "user-1" for demo)
- **Authenticated API**: `/api/auth/*` - Firebase token-protected routes with user isolation
- **Health Check**: `/health` - Application health monitoring endpoint
- All routes defined in `server/routes.ts` with modular route handlers in `server/routes/`

## Authentication System

### Firebase Integration

- Frontend uses Firebase Auth for Google sign-in
- Backend validates Firebase ID tokens via Admin SDK
- Authenticated routes require `Authorization: Bearer <token>` header
- User data isolated by Firebase UID

### Key Files

- `client/src/contexts/AuthContext.tsx` - React auth context
- `server/middleware/auth.ts` - Token validation middleware
- `server/config/firebase-admin.ts` - Firebase Admin SDK setup

## Frontend Architecture

### Mobile-First Design

- Fixed bottom navigation with tab switching
- Uses Wouter for lightweight client-side routing

### State Management

- TanStack Query for server state caching and synchronization
- React Context for authentication state
- Local component state for UI interactions

### UI Components

- Radix UI primitives with custom styling
- TailwindCSS for utility-first styling
- Custom shadcn/ui component library in `components/ui/`

## Backend Architecture

### Express Server Structure

- ESM modules with TypeScript compilation throughout
- Development: tsx for hot reloading server code
- Production: esbuild bundle compilation to `dist/`
- Vite integration for frontend development and HMR
- Single-port deployment architecture (serves both API and static files)

### Database Layer

- Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- Schema definitions in `shared/schema.ts` with auto-generated types
- Storage abstraction layer in `server/storage.ts` for all CRUD operations
- Zod validation schemas generated from Drizzle schemas for request validation

### Error Handling & Production Features

- Comprehensive error logging with request context and timing
- Production-safe error responses (no internal details exposed)
- Graceful shutdown handling for SIGTERM/SIGINT signals
- Process-level error handlers for uncaught exceptions
- Request/response logging middleware for API routes

## Development Patterns

### Component Organization

- Feature-based components in `client/src/components/`
- Shared UI components in `client/src/components/ui/`
- Page components in `client/src/pages/`

### API Pattern

- RESTful endpoints with proper HTTP methods
- Zod schema validation for request bodies
- Consistent error response format
- User isolation via hardcoded "user-1" or Firebase UID

## Supabase 데이터 접근 가이드라인

### 공통 모듈 사용 원칙

**⚠️ 중요: 모든 Supabase 데이터 조회/생성/수정/삭제 작업은 반드시 공통 모듈을 사용해야 합니다.**

직접적인 Supabase 클라이언트 사용을 금지하고, 다음 계층 구조를 따라야 합니다:

### 1. Repository 패턴 (데이터 접근 계층)

**위치**: `src/shared/api/*.repository.ts`

모든 데이터베이스 작업은 Repository 클래스를 통해 수행해야 합니다:

```typescript
// ✅ 올바른 방법 - Repository 사용
import { FarmRepository } from '@/shared/api/farm.repository'

const farmRepo = new FarmRepository()
const farms = await farmRepo.list()
const newFarm = await farmRepo.create({ name: '새 농장', environment: '실외', rowCount: 5, area: 100 })
```

```typescript
// ❌ 잘못된 방법 - 직접 Supabase 클라이언트 사용
import { getSupabaseClient } from '@/lib/supabaseClient'

const supabase = getSupabaseClient()
const { data } = await supabase.from('farms').select('*') // 금지!
```

### 2. API 레이어 (비즈니스 로직 계층)

**위치**: `src/features/*/api/*.api.ts`

Repository를 래핑하여 비즈니스 로직을 처리하는 API 함수들을 제공합니다:

```typescript
// ✅ 올바른 방법 - API 레이어 사용
import { farmApi } from '@/features/farm-management/api/farm.api'

const farms = await farmApi.getFarms()
const newFarm = await farmApi.createFarm(farmData)
```

### 3. 사용 가능한 Repository 클래스들

- `FarmRepository`: 농장 데이터 관리
- `CropRepository`: 작물 데이터 관리  
- `TaskRepository`: 작업 데이터 관리

### 4. Repository 사용 예시

#### 농장 데이터 관리

```typescript
import { FarmRepository } from '@/shared/api/farm.repository'

const farmRepo = new FarmRepository()

// 조회
const farms = await farmRepo.list()

// 생성
const newFarm = await farmRepo.create({
  name: '내 농장',
  environment: '실외',
  rowCount: 10,
  area: 200
})

// 수정
const updatedFarm = await farmRepo.update(farmId, {
  name: '수정된 농장명',
  area: 300
})

// 삭제
await farmRepo.remove(farmId)
```

#### 작물 데이터 관리

```typescript
import { CropRepository } from '@/shared/api/crop.repository'

const cropRepo = new CropRepository()

// 농장별 작물 조회
const crops = await cropRepo.listByFarm(farmId)

// 작물 생성
const newCrop = await cropRepo.create({
  name: '토마토',
  variety: '체리토마토',
  category: '채소',
  farm_id: farmId
})
```

### 5. 새로운 Repository 추가 시 규칙

새로운 데이터 테이블에 대한 Repository를 추가할 때는 다음 규칙을 따라야 합니다:

1. **BaseRepository 상속**: 모든 Repository는 `BaseRepository`를 상속받아야 합니다
2. **사용자 격리**: 모든 쿼리에 `user_id` 필터링이 포함되어야 합니다
3. **에러 처리**: 일관된 에러 처리 패턴을 사용해야 합니다
4. **타입 안전성**: TypeScript 타입을 명확히 정의해야 합니다

```typescript
// 새로운 Repository 템플릿
import { BaseRepository } from './base.repository'

export class NewEntityRepository extends BaseRepository {
  async list(): Promise<NewEntity[]> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('new_entities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return data.map(mapRowToEntity)
  }

  async create(input: CreateNewEntityInput): Promise<NewEntity> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('new_entities')
      .insert([{ ...input, user_id: userId }])
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return mapRowToEntity(data)
  }

  // update, remove 메서드도 동일한 패턴으로 구현
}
```

### 6. 컴포넌트에서의 사용법

React 컴포넌트에서는 API 레이어를 통해 데이터에 접근해야 합니다:

```typescript
// 컴포넌트에서의 올바른 사용법
import { farmApi } from '@/features/farm-management/api/farm.api'
import { useQuery, useMutation } from '@tanstack/react-query'

function FarmList() {
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: farmApi.getFarms
  })

  const createFarmMutation = useMutation({
    mutationFn: farmApi.createFarm,
    onSuccess: () => {
      // 성공 처리
    }
  })

  return (
    // JSX 렌더링
  )
}
```

### 7. 코드 리뷰 체크리스트

다른 개발자의 코드를 리뷰할 때 다음 사항들을 확인해야 합니다:

- [ ] Supabase 클라이언트를 직접 사용하지 않는가?
- [ ] Repository 패턴을 올바르게 사용하는가?
- [ ] API 레이어를 통해 데이터에 접근하는가?
- [ ] 사용자 격리가 올바르게 구현되어 있는가?
- [ ] 에러 처리가 일관되게 구현되어 있는가?

### TypeScript Configuration

- Shared types between frontend and backend via `@shared/*` alias
- Path aliases: `@/*` for client source, `@shared/*` for shared types, `@assets/*` for static assets
- ESM modules throughout with bundler resolution
- Strict mode enabled with incremental compilation

## Key Architectural Decisions

### Module Architecture

- **Type Safety**: Shared types and schemas ensure consistency between frontend/backend
- **Path Aliases**: Clean imports using `@/*` and `@shared/*` conventions
- **ESM-First**: Full ES modules support throughout the stack
- **Single Build**: Unified build process for both client and server code

### Development Workflow

- **Hot Reloading**: Full-stack development with tsx (server) + Vite (client)
- **Type Checking**: Unified TypeScript checking across all modules
- **Database Migrations**: Push-based schema updates via Drizzle Kit
- **Error Boundaries**: Comprehensive error handling at multiple levels

### Authentication Flow

- **Firebase Auth**: Google OAuth integration with ID token validation
- **Dual API**: Public routes (demo) + authenticated routes (production)
- **User Isolation**: All authenticated data scoped by Firebase UID
- **Token Middleware**: Centralized authentication middleware for protected routes

## Testing & Quality

- TypeScript strict mode enabled across all modules
- Type checking via `npm run check` for full project validation
- Request logging and error tracking for API debugging
- No explicit test framework currently configured (recommended: Vitest for client, Jest for server)

## Deployment Architecture

- **Single-Port Deployment**: Application serves both API and static files on one port
- **Environment Detection**: Automatic development vs production mode switching
- **Static File Serving**: Express serves Vite-built client files in production
- **Health Monitoring**: `/health` endpoint with environment and database status
- **Process Management**: Graceful shutdown and error recovery protocols
