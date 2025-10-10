# Python Vegelab Calendar

This repository contains the **FarmMate** project - a comprehensive farming management application with a React frontend and Express.js backend, refactored to use Feature-Sliced Design (FSD) architecture.

## 🏗️ Project Structure

```
python-vegelab-calendar/
├── FarmMate/                 # Main farming management application
│   ├── client/              # React frontend with FSD architecture
│   ├── server/              # Express.js backend
│   ├── shared/              # Shared types and schemas
│   └── README.md           # FarmMate-specific documentation
├── 채소생활 프레임워크.pdf    # Project framework documentation
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database
- Git

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ryoo1128/python-vegelab-calendar.git
   cd python-vegelab-calendar
   ```

2. **Navigate to FarmMate:**
   ```bash
   cd FarmMate
   ```

3. **Install dependencies:**
   ```bash
   bun install  # or npm install
   ```

4. **Set up environment variables:**
   ```bash
   # Create .env file with:
   DATABASE_URL="your_postgresql_connection_string"
   PORT=5000
   ```

5. **Run the development server:**
   ```bash
   bun run dev  # or npm run dev
   ```

6. **Access the application:**
   - **Frontend**: http://localhost:3000 (or next available port)
   - **Backend API**: http://localhost:5000

## 📱 FarmMate Features

### Dashboard & Planning
- **Home Dashboard**: Overview with task statistics and quick access
- **Calendar Planner**: Mini calendar view showing task distribution
- **Task Management**: Today's tasks, overdue alerts, upcoming schedule

### Farm Management  
- **Farm Registration**: Add and manage multiple farms
- **Crop Tracking**: Comprehensive crop lifecycle management
- **Task Scheduling**: Schedule and track farming activities

### Pages Available
- **홈 (Home)**: `/` - Dashboard with planner and schedule lists
- **농장&작물 (Farms)**: `/farms` - Farm and crop management
- **영농일지 (Calendar)**: `/calendar` - Full calendar with task management

## 🏛️ Architecture

### Feature-Sliced Design (FSD)
The project follows FSD architecture with clear layer separation:

```
client/src/
├── app/           # Application configuration
├── pages/         # Route-level components
├── widgets/       # Large UI blocks  
├── features/      # Business features
├── entities/      # Business entities
└── shared/        # Reusable utilities
```

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript (ESM)
- **Database**: PostgreSQL with Drizzle ORM  
- **UI Framework**: TailwindCSS + Radix UI
- **State Management**: TanStack Query
- **Routing**: Wouter (lightweight React router)

## 🛠️ Development Commands

```bash
# Development
bun run dev          # Start both frontend and backend
bun run dev:client   # Start only frontend (Vite)
bun run dev:server   # Start only backend (Express)

# Build
bun run build        # Build for production
bun run start        # Start production server

# Database
bun run db:push      # Push schema changes

# Type checking
bun run check        # TypeScript validation
```

## 🔧 Troubleshooting

### Port Conflicts
If you encounter "Port already in use" errors:

```bash
# Kill all development processes
pkill -f node && pkill -f bun && pkill -f vite && pkill -f tsx

# Or kill specific ports
lsof -ti:3000,5000 | xargs kill -9
```

### Common Issues
- **Dependencies not installed**: Run `bun install` in the FarmMate directory
- **Database connection**: Ensure PostgreSQL is running and DATABASE_URL is set
- **Port conflicts**: Use the commands above or change ports in package.json

## 📄 Documentation

### Main Documentation
- **FarmMate Documentation**: See `FarmMate/CLAUDE.md` for detailed project information
- **Framework Guide**: See `채소생활 프레임워크.pdf` for project framework details

### Product Requirements Documents (PRD)
- **[작업 등록 기능](docs/prd-task-list.md)** - TodoList, 일정 관리, 농작업 계산기
- **[Registration 데이터](docs/prd-registration-data.md)** - 작물 데이터 구조 및 활용 방안
- **[작물 추천 기능](docs/prd_crop_recommendation.md)** - AI 기반 작물 추천 시스템
- **[캘린더 박스 위치](docs/prd_calendar_box_positioning.md)** - 캘린더 UI/UX 개선
- **[농장 목록](docs/prd-farm-list.md)** - 농장 관리 시스템
- **[소셜 공유](docs/prd-social-sharing.md)** - 공유 기능
- **[Supabase Edge Function](docs/prd_supabase_edgefunction.md)** - 서버리스 함수 구현

## 🤝 Contributing

This project uses Feature-Sliced Design principles:
1. Follow the established FSD layer structure
2. Use TypeScript with strict mode
3. Implement responsive, mobile-first design
4. Test your changes before committing

## 📝 License

MIT License - see individual project files for details.

---

**Note**: This project was refactored from a monolithic structure to FSD architecture for better maintainability and team collaboration.