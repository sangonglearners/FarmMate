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
- Maximum width container (max-w-md) for mobile optimization
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