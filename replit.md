# VisaReady - Player Compliance & Visa Eligibility Platform

## Overview

VisaReady is an enterprise compliance platform designed for football clubs to manage player visa eligibility and international transfer compliance. The platform enables sporting directors, legal teams, scouts, and coaches to track player performance data, calculate visa eligibility scores across multiple jurisdictions (Schengen, UK GBE, US P-1/O-1, Middle East, Asia), generate consular documentation, and coordinate with embassies for verification.

The system serves three primary user types:
- **Team Users** (Sporting Directors, Legal, Coaches): Manage squad players, generate compliance reports, track visa eligibility
- **Scouts/Agents**: Discover players, initiate transfer inquiries, view eligibility data
- **Embassy Officials**: View-only access to verify player documentation for visa processing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens, CSS variables for theming
- **Build Tool**: Vite with React plugin

The frontend follows a pages-based architecture with reusable components. Role-based routing directs users to appropriate dashboards (TeamRouter, ScoutDashboard, EmbassyDashboard).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API with session-based authentication
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)
- **Authentication**: Dual system supporting Replit Auth (OpenID Connect) and custom username/password auth
- **Middleware**: Role-based access control (requireAuth, requireTeamRole, requireScoutRole, requireEmbassyRole)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via drizzle-kit (`db:push` command)

Key entities: users, teams, clubs, players, playerMetrics, videos, videoInsights, eligibilityScores, complianceOrders, complianceDocuments, embassyVerifications, scoutingInquiries, conversations, messages

### Authentication & Authorization
- Session-based auth with PostgreSQL session store
- Role hierarchy: admin > sporting_director > legal/scout/coach
- Embassy users have separate isolated access to document verification
- Replit Auth integration for SSO capability

### Design System
- Material Design-inspired with custom color palette (mauve/pink accent colors)
- Status-driven visual language: Green (eligible 60%+), Yellow (conditional 35-59%), Red (ineligible <35%)
- Dark mode support via CSS class toggle
- Roboto font family via Google Fonts

## External Dependencies

### AI/ML Services
- **OpenAI API**: Video analysis and performance insights generation (`/api/videos/:id/analyze`)

### Database
- **PostgreSQL**: Primary data store (requires DATABASE_URL environment variable)

### Authentication
- **Replit Auth**: OpenID Connect integration for Replit-hosted deployments
- **Passport.js**: Authentication middleware with local and OIDC strategies

### Third-Party Integrations (Planned/Mock)
- Video platform integrations: Wyscout, Transfermarkt, Veo Cameras
- PDF generation for compliance reports (jspdf)
- Excel export capabilities (xlsx)

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `OPENAI_API_KEY`: OpenAI API access
- `ISSUER_URL`: Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID`: Replit deployment identifier