# Reel Connect Sports Hub

A modern sports management platform built with React, TypeScript, and Supabase. Connect agents, teams, and players in a comprehensive sports ecosystem.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd reel-connect-sports-hub
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Required environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_BACKEND_URL` - Backend API URL (if applicable)

4. Start the development server:
```bash
bun run dev
# or
npm run dev
```

The application will be available at `http://localhost:8080`

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page-level components (routes)
├── hooks/          # Custom React hooks
├── services/       # Business logic and API services
├── utils/          # Pure utility functions
├── contexts/       # React Context providers
├── types/          # TypeScript type definitions
├── integrations/   # Third-party service integrations
└── lib/            # Shared utilities
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run build:dev` - Build in development mode
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build

## Features

- **Authentication**: Email/password and Google OAuth via Supabase
- **User Profiles**: Agent and Team profiles with onboarding flow
- **Player Management**: Comprehensive player profiles and tracking
- **Video Analysis**: AI-powered video analysis using Gemini
- **Contract Management**: Digital contract creation and negotiation
- **Transfer Market**: Player transfer pitches and timeline
- **Notifications**: Real-time notifications system
- **Wallet**: Payment integration for transactions

## Development Guidelines

See [.cursorrules](.cursorrules) for detailed engineering guidelines and code standards.

### Key Principles

- Use TypeScript for all new files
- Follow React best practices (hooks, functional components)
- Use React Query for all data fetching
- Implement proper error handling and loading states
- Write self-documenting code with clear naming
- Keep components focused and under 300 lines when possible

## Database

The project uses Supabase PostgreSQL with Row Level Security (RLS) enabled. Migration files are located in `supabase/migrations/`.

## Contributing

1. Follow the code style guidelines in `.cursorrules`
2. Write clear commit messages using conventional commits
3. Ensure TypeScript compiles without errors
4. Remove console.logs and debug code before committing
5. Test your changes thoroughly

## License

[Add your license here]
