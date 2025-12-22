# Excalidraw Clone - Collaborative Sketch App

A production-ready collaborative whiteboarding application built with Next.js, WebSockets, and PostgreSQL. Features real-time collaboration, authentication, and an Excalidraw-like drawing experience.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- pnpm (recommended) or npm

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/excal_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### 3. Setup Database

Make sure PostgreSQL is running, then push the schema:

```bash
pnpm --filter @repo/db db:push
```

Or if you prefer migrations:

```bash
pnpm --filter @repo/db db:migrate
```

### 4. Start Development Servers

Open 3 terminal windows and run:

**Terminal 1 - HTTP Backend:**
```bash
pnpm --filter http-backend dev
```

**Terminal 2 - WebSocket Backend:**
```bash
pnpm --filter ws-backend dev
```

**Terminal 3 - Frontend:**
```bash
pnpm --filter sketchapp-frontend dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- HTTP API: http://localhost:3001
- WebSocket: ws://localhost:8080

## 📦 What's Included

### ✅ Completed Features

- **Authentication System**
  - Secure password hashing with bcrypt
  - JWT-based authentication (access + refresh tokens)
  - Session management
  - Protected routes

- **Real-time Collaboration**
  - WebSocket-based communication
  - User presence tracking
  - Cursor position sharing
  - Canvas state synchronization
  - Real-time chat

- **Backend Infrastructure**
  - Express HTTP server with REST API
  - WebSocket server for real-time features
  - PostgreSQL database with Prisma ORM
  - Comprehensive error handling

- **Frontend Infrastructure**
  - Next.js 14 with App Router
  - TypeScript throughout
  - Custom WebSocket hook with auto-reconnection
  - API client with automatic token refresh
  - Tailwind CSS for styling

### 🚧 In Progress

- Excalidraw-like UI components
- Canvas drawing engine
- Collaborative drawing tools
- Room management UI

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌──────────────┐
│ HTTP API    │  │  WebSocket   │
│ (Express)   │  │  Server      │
│ Port: 3001  │  │  Port: 8080  │
└──────┬──────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                ▼
        ┌───────────────┐
        │  PostgreSQL   │
        │   Database    │
        └───────────────┘
```

## 📁 Project Structure

```
excal/
├── apps/
│   ├── sketchapp-frontend/     # Next.js frontend application
│   │   ├── app/                # Next.js app router pages
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and API client
│   │   └── types/              # TypeScript type definitions
│   │
│   ├── http-backend/           # Express HTTP API server
│   │   └── src/
│   │       ├── services/       # Business logic services
│   │       ├── middleware.ts   # Express middleware
│   │       └── index.ts        # Main server file
│   │
│   └── ws-backend/             # WebSocket server
│       └── src/
│           └── index.ts        # WebSocket logic
│
├── packages/
│   ├── db/                     # Database package
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   ├── common/                 # Shared types and utilities
│   ├── backend-common/         # Backend shared code
│   └── ui/                     # Shared UI components
│
├── .env.example                # Environment variables template
├── PROGRESS.md                 # Detailed progress documentation
└── README.md                   # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/user/me` - Get current user

### Rooms
- `POST /api/room` - Create new room
- `GET /api/room/:slug` - Get room by slug
- `GET /api/rooms` - List user's rooms

### Canvas
- `GET /api/canvas/:roomId` - Get canvas data
- `POST /api/canvas/:roomId/save` - Save canvas state

### Chat
- `GET /api/chats/:roomId` - Get chat messages

## 🔐 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT authentication with access & refresh tokens
- ✅ Session management with expiration
- ✅ CORS configuration
- ✅ Input validation with Zod schemas
- ✅ Protected API routes
- ✅ Automatic token refresh

## 🛠️ Development

### Database Commands

```bash
# Generate Prisma client
pnpm --filter @repo/db db:generate

# Push schema to database (development)
pnpm --filter @repo/db db:push

# Create migration (production)
pnpm --filter @repo/db db:migrate

# Open Prisma Studio (database GUI)
pnpm --filter @repo/db db:studio
```

### Build for Production

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter sketchapp-frontend build
```

## 📚 Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: PostgreSQL, Prisma ORM
- **Authentication**: JWT, bcrypt
- **Monorepo**: Turborepo, pnpm workspaces

## 🎯 Next Steps

See [PROGRESS.md](./PROGRESS.md) for detailed implementation status and next steps.

Key upcoming features:
1. Excalidraw-like drawing UI
2. Canvas drawing engine with tools
3. Collaborative drawing features
4. Room management UI
5. Production optimizations

## 📝 License

MIT

## 🤝 Contributing

This is a prototype project. Feel free to fork and modify as needed.

## 📞 Support

For issues or questions, please check the [PROGRESS.md](./PROGRESS.md) file for implementation details.
