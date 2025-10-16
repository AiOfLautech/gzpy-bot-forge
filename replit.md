# GZP Bot Manager

## Overview

GZP Bot Manager is a full-stack web application for creating and managing Telegram bots with advanced economy features. Users can build Telegram bots that include user verification (channel membership checking), economy systems (virtual currency, jobs, crimes, shops), mini-games, and automated commands. The platform uses a virtual currency called "GZP" for managing user accounts and bot features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- React Router for client-side routing with layout-based navigation
- TanStack Query (React Query) for server state management

**UI Component System**
- Radix UI primitives for accessible, unstyled component foundation
- shadcn/ui component library with Tailwind CSS for styling
- Custom design system with HSL color variables for dark mode theme
- Responsive layout with sidebar navigation using Radix UI Sidebar primitive

**State Management**
- Session-based authentication stored in localStorage (no external auth provider)
- Client-side session management through custom `session` utility
- React Query for caching and synchronizing server state
- Local state with React hooks for component-level state

**Key Design Patterns**
- Layout wrapper pattern using `<AppLayout>` with `<Outlet>` for nested routes
- Shared UI components from shadcn/ui for consistent design
- Toast notifications (Sonner) for user feedback
- Form handling with React Hook Form and Zod validation

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript for API endpoints
- Custom route registration system separating concerns
- Middleware for request logging and error handling
- WebSocket support via `ws` package for real-time features

**Development Setup**
- Vite middleware integration in development mode for HMR
- Static file serving in production from `dist/public`
- tsx watch mode for server hot-reloading during development
- Separation of server and client TypeScript configurations

**Data Layer**
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL as the database provider
- WebSocket connection pooling for database connections
- Schema-first approach with shared types between client and server

**API Architecture**
- RESTful API design with `/api` prefix for all endpoints
- Storage abstraction layer (`IStorage` interface) for data operations
- Resource-based routing (bots, users, transactions, notifications)
- Centralized error handling middleware

### Data Storage Solutions

**Database Schema (PostgreSQL via Neon)**
- `user_roles` - User permissions (admin/user) with enum-based role system
- `profiles` - User profiles with GZP balance and Telegram chat ID
- `bots` - Bot configurations including Telegram tokens and settings
- `user_economy` - Per-bot user economy data (balance, job, inventory, stats)
- `bot_stats` - Aggregated statistics per bot (user count, transaction volume)
- `transactions` - Financial transaction history with type categorization
- `notifications` - User notification system with read/unread status
- `mini_game_sessions` - Active game session tracking with state persistence

**Data Access Pattern**
- Storage layer abstraction allows for future database migrations
- Drizzle ORM provides compile-time type safety with database schema
- Schema definitions in `shared/schema.ts` for shared client/server types
- Migration support via Drizzle Kit with `db:push` script

**Economy System Data**
- Shop items with categories (tools, weapons, vehicles, property)
- Job system with salary progression and level requirements
- Crime activities with success rates and reward ranges
- User inventory tracked as JSON blob in user_economy table

### External Dependencies

**Telegram Bot Integration**
- Telegram Bot API for bot creation and webhook management
- Webhook-based message handling at `/api/telegram/webhook/:botId`
- Bot token validation and username fetching from Telegram API
- Channel membership verification for user access control

**Database Service**
- Neon Serverless PostgreSQL for scalable database hosting
- WebSocket-based connection pooling via `@neondatabase/serverless`
- Connection string configuration via `DATABASE_URL` environment variable

**UI Component Libraries**
- Radix UI primitives (accordion, dialog, dropdown, select, etc.)
- Lucide React for consistent icon set
- date-fns for date manipulation and formatting
- cmdk for command palette functionality

**Development Tools**
- ESLint with TypeScript support for code quality
- Tailwind CSS with PostCSS for styling
- Drizzle Kit for database schema management and migrations
- Lovable component tagger for development mode component tracking

**Authentication**
- Custom session management (no external auth provider)
- Client-side session storage with user ID and email
- Demo mode support for unauthenticated users
- Admin role verification through database queries