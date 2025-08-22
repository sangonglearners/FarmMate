# Farm Management Application

## Overview

This is a full-stack farm management application built with React, Express, and TypeScript. The app helps farmers manage their farms, crops, tasks, and get crop recommendations. It features a modern UI built with shadcn/ui components and uses Drizzle ORM for database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with shared code between client and server:

- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (currently using in-memory storage for development)
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for monorepo setup
- **Styling**: Tailwind CSS with custom farm-themed color palette
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Fetch API with custom query client wrapper
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM configured for PostgreSQL
- **Storage**: Currently uses in-memory storage (MemStorage class) for development
- **API Design**: RESTful APIs with proper error handling
- **Development**: Custom Vite integration for development server

### Database Schema
The application defines several entities:
- **Users**: Basic user authentication structure
- **Farms**: Farm information including environment type, size, and location
- **Crops**: Crop management with categories, varieties, and status tracking
- **Tasks**: Farm task scheduling and completion tracking
- **Crop Recommendations**: AI-powered crop recommendations based on farm conditions

## Data Flow

1. **Client Requests**: React components use TanStack React Query to fetch data
2. **API Layer**: Express routes handle CRUD operations for all entities
3. **Storage Layer**: Currently uses in-memory storage, designed to be replaced with PostgreSQL
4. **Validation**: Zod schemas shared between client and server for type safety
5. **State Management**: React Query manages server state with optimistic updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Schema validation library
- **wouter**: Lightweight routing library

### UI Dependencies
- **@radix-ui/***: Headless UI primitives for accessibility
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development

## Recent Changes

### Production Deployment Enhancements (July 31, 2025)
Enhanced Express server configuration for better production deployment:

✓ **Environment Configuration**: Added proper NODE_ENV handling with production defaults
✓ **Security Headers**: Configured trust proxy and disabled x-powered-by header
✓ **Error Handling**: Implemented comprehensive error handling with process-level handlers
✓ **Graceful Shutdown**: Added SIGTERM and SIGINT handlers for clean shutdowns
✓ **Health Check Endpoint**: Added `/health` endpoint for deployment monitoring
✓ **Enhanced Logging**: Improved startup logging and error reporting
✓ **Process Signal Handling**: Added proper process management for production

**Health Check Features:**
- **Endpoint**: `GET /health` returns server status, timestamp, and environment
- **Script**: Created `health-check.js` for automated health monitoring
- **Monitoring**: Ready signal sent to process manager when server starts successfully

**Production Optimizations:**
- Enhanced error logging with request context
- Proper error message filtering for production vs development
- Server startup error handling with detailed diagnostics
- Process exit handling for failed initialization

The application now properly handles deployment initialization issues and provides better visibility into startup problems.

## Deployment Strategy

The application is configured for deployment with:

1. **Build Process**: 
   - Frontend builds to `dist/public` using Vite
   - Backend compiles to `dist/index.js` using esbuild
   
2. **Production Setup**:
   - Static files served from Express in production
   - Environment-based configuration for database connections
   - Proper error handling and logging

3. **Development**:
   - Vite dev server with HMR for frontend
   - TSX for backend development with auto-restart
   - Integrated development experience with shared types

The application is designed to be deployed on platforms like Replit, with proper environment variable configuration for the PostgreSQL database connection.

Note: The current implementation uses in-memory storage for development purposes. In production, this would be replaced with actual PostgreSQL database operations using the configured Drizzle setup.

## Recent Changes (July 29, 2025)

### User Interface Improvements Following PDF Framework
- **Home Calendar Updates**: Modified calendar view toggle to show only one button (2주→한달보기 or 한달→간략히보기)
- **Task Management Enhancements**:
  - Added crop search functionality with search input field
  - Implemented bulk registration with checkbox-style multiple crop selection
  - Added individual registration mode with multiple work type selection
  - Created Work Calculator Dialog for bulk task scheduling with recommended dates
  - Added date range selection for individual work registration
- **Farm Work Calculator**: Added calculator button to header navigation
- **Calendar Page Redesign**: Complete redesign following PDF specifications:
  - Monthly/Yearly view modes instead of traditional calendar
  - Row-based layout with farm environment selection (노지, 시설1, 시설2)
  - Row counts: 노지(43), 시설1(20), 시설2(10)
  - Monthly view: 10-day sliding window with 5-day navigation
  - Visual display: 60% crop colors, 40% work colors per row
  - Yearly view: 12-month overview showing crop cultivation periods

### Latest Updates (July 30, 2025)
- **Task Schema Enhancement**: Added endDate and completed fields to Task table for date range support and completion tracking
- **Date Issues Fixed**: 
  - Default date now set to today for all task creation dialogs
  - Fixed date offset bug (registration 14th appearing as 13th) using toLocaleDateString('sv-SE')
- **Task Editing Improvements**:
  - Added from/to date range selection in edit dialog
  - Added row selection capability in task editing
  - Enhanced farm environment display with row count information
- **Home Screen Task Management**:
  - Added clickable checkboxes for task completion
  - Completed tasks automatically moved to bottom with visual styling
  - Task completion state synchronized across all views
- **Calendar Yearly View Redesign**:
  - Changed from grid layout to table-based structure matching monthly view
  - Header shows "이랑/월" with month numbers 1-12
  - Only crops displayed (no work items) in yearly view
  - Proper row-based layout with scroll capability
- **Task Title Display Fix**: 
  - Removed "작물" placeholder text for individual task registration
  - Proper crop names now displayed in task titles
  - Enhanced task grouping display format

### Previous Updates (July 29, 2025)
- **Home Screen Cleanup**: Removed farming diary cultivation info display from home screen per user feedback
- **Task Dialog Improvements**: 
  - Enhanced AddTaskDialog with proper registration mode naming: "일괄등록" for both bulk and individual modes
  - Added mandatory cultivation environment selection for all task operations
  - Implemented proper date range scheduling that creates tasks for ALL days in the selected range
  - Added support for text-based crop input that registers as valid crop in schedules
  - Fixed individual registration to support single work with start-end date range
  - Fixed batch registration to allow multiple work selection with single start date
- **Calendar Page Complete Redesign**: Following provided PDF design specifications:
  - **Monthly View**: Table-based layout with "이랑/일" header structure
  - **Cross-month Display**: Shows 1-10 days with seamless month transitions (July 31 → August 1, 2, 3...)
  - **Month Navigation**: Added dedicated month navigation buttons and auto-advance to next month
  - **Visual Layout**: Proper table borders, centered crop names in colored blocks
  - **Row Structure**: 40 rows for 노지 with scroll capability, vertical row numbers with horizontal day progression  
  - **Yearly View**: "이랑/월" header with 12-month horizontal layout
  - **Navigation**: PREV/NEXT buttons for day range navigation within months
  - **Design Consistency**: Matches provided mobile interface design with proper spacing and colors
  - **Enhanced Display Logic**: 
    - Crops displayed once per continuous period (not repeated daily)
    - Upper area shows crops, lower area shows farm work within each cell
    - Today's date highlighted with green background
    - Crops span multiple days visually as continuous blocks
  - **Real Data Integration**: 
    - Connected calendar display with actual task/crop/farm data from home screen
    - Tasks and crops registered through home screen now appear in farming diary
    - Row assignment based on crop index for consistent placement
    - Work periods calculated from actual task date ranges
    - Environment-specific filtering (노지/시설1/시설2) working properly

### Technical Implementation
- Enhanced AddTaskDialog with multiple registration modes and proper form validation
- Created WorkCalculatorDialog component for intelligent task scheduling
- Implemented advanced form validation and user experience improvements
- Added comprehensive search and filtering capabilities
- Fixed date range task creation logic to span entire selected period
- Added environment field validation across all task operations

## Firebase Authentication Backend Implementation (January 5, 2025)

✓ **Firebase Admin SDK Integration**: Complete backend authentication system using Firebase service account
✓ **PostgreSQL Database Integration**: Direct connection to Replit PostgreSQL with proper connection pooling
✓ **Authentication Middleware**: Token verification middleware for all protected routes
✓ **Secure API Endpoints**: User-specific data access based on Firebase UID
✓ **Database Schema**: Created `tasks` table with user isolation and proper indexing
✓ **Error Handling**: Comprehensive error responses and logging
✓ **Health Check Endpoints**: Monitoring endpoints for authentication and database status

**Key Features:**
- **Security**: Firebase ID token verification with comprehensive error handling
- **User Isolation**: Each user can only access their own data through UID-based filtering
- **Modular Architecture**: Separate configuration for Firebase Admin, database, and authentication middleware
- **API Documentation**: Complete setup guide with testing examples
- **Production Ready**: Proper connection pooling, error handling, and security measures

**API Structure:**
- `/api/auth/health` - Authentication and system health check
- `/api/auth/tasks` - User-specific task management (GET, POST, PUT)
- All endpoints require `Authorization: Bearer <firebase_id_token>` header

The backend now provides a secure foundation for the farm management application with proper user authentication and data isolation.