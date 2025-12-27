# VisaReady / Sports Reels - Production Deployment Guide

This guide covers deploying the application to a production environment where real users can interact with real data.

---

## Table of Contents
1. [Project Architecture Overview](#1-project-architecture-overview)
2. [System Requirements](#2-system-requirements)
3. [Database Setup](#3-database-setup)
4. [Environment Variables](#4-environment-variables)
5. [Backend Deployment](#5-backend-deployment)
6. [Frontend Deployment](#6-frontend-deployment)
7. [Step-by-Step Deployment Process](#7-step-by-step-deployment-process)
8. [Post-Deployment Verification](#8-post-deployment-verification)

---

## 1. Project Architecture Overview

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React + TypeScript | React 18.x |
| **Build Tool** | Vite | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **UI Components** | shadcn/ui (Radix UI) | Latest |
| **Backend** | Express.js + TypeScript | Express 4.x |
| **Database** | PostgreSQL | 14+ recommended |
| **ORM** | Drizzle ORM | 0.39.x |
| **Session Store** | connect-pg-simple | 10.x |
| **Runtime** | Node.js | 18+ required |

### Architecture Pattern
- **Monolithic deployment**: Single Node.js process serves both API and static frontend
- **Session-based authentication**: PostgreSQL-backed session storage
- **RESTful API**: All routes under `/api/*`
- **SPA Frontend**: React app bundled and served from `/dist/public`

---

## 2. System Requirements

### Server Requirements
- **Node.js**: v18.0.0 or higher (v20 LTS recommended)
- **npm**: v9.0.0 or higher
- **RAM**: Minimum 512MB, recommended 1GB+
- **Storage**: 500MB for application + database storage

### Database Requirements
- **PostgreSQL**: v14.0 or higher (v16 recommended)
- **Extensions**: `gen_random_uuid()` function (included by default in PostgreSQL 13+)

---

## 3. Database Setup

### Option A: Managed PostgreSQL (Recommended)
Use a managed service like:
- **Neon** (serverless PostgreSQL)
- **Supabase**
- **AWS RDS**
- **DigitalOcean Managed Databases**
- **Railway**

### Option B: Self-Hosted PostgreSQL
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE USER visaready WITH PASSWORD 'your_secure_password';
CREATE DATABASE visaready_production OWNER visaready;
GRANT ALL PRIVILEGES ON DATABASE visaready_production TO visaready;
\q
```

### Database Schema Migration

The schema is defined in `shared/schema.ts` using Drizzle ORM. **You must run migrations before starting the app.**

```bash
# From project root, run the database push command
DATABASE_URL="postgresql://user:password@host:5432/database" npm run db:push
```

**Important Notes:**
- Run `npm run db:push` every time you deploy schema changes
- This command is idempotent (safe to run multiple times)
- No manual SQL scripts are needed - Drizzle handles everything
- The schema creates approximately 25+ tables including users, players, teams, videos, eligibility scores, admin tables, etc.

### Database Tables Created
The migration creates these core tables:
- `users`, `teams`, `clubs`, `players`
- `player_metrics`, `videos`, `video_insights`
- `eligibility_scores`, `visa_rules`
- `compliance_orders`, `compliance_documents`
- `scouting_inquiries`, `conversations`, `messages`
- `federation_letter_requests`, `federation_letter_documents`
- `admin_message_inbox`, `platform_audit_logs`
- `gdpr_requests`, `user_consents`, `user_sessions`
- And more...

---

## 4. Environment Variables

### Location
Create a `.env` file in the **project root directory** (same level as `package.json`):

```
project-root/
├── .env                 <-- Place .env file here
├── package.json
├── shared/
├── server/
├── client/
└── ...
```

### Required Environment Variables

```env
# ============================================
# DATABASE CONFIGURATION (Required)
# ============================================

# Primary database connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
DATABASE_URL=postgresql://visaready_user:your_password@your-db-host.com:5432/visaready_production?sslmode=require

# Individual PostgreSQL credentials (optional if using DATABASE_URL)
PGHOST=your-db-host.com
PGPORT=5432
PGUSER=visaready_user
PGPASSWORD=your_secure_password
PGDATABASE=visaready_production

# ============================================
# SESSION CONFIGURATION (Required)
# ============================================

# Random 32+ character string for session encryption
# Generate with: openssl rand -hex 32
SESSION_SECRET=your_random_32_character_secret_string_here

# ============================================
# AI SERVICES (Optional - for video analysis)
# ============================================

# Google Gemini AI API (for video analysis features)
AI_INTEGRATIONS_GEMINI_API_KEY=your_gemini_api_key
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com

# OpenAI API (alternative AI provider)
OPENAI_API_KEY=your_openai_api_key

# ============================================
# OBJECT STORAGE (Optional - for file uploads)
# ============================================

# Cloud storage bucket configuration
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your_bucket_id
PRIVATE_OBJECT_DIR=.private
PUBLIC_OBJECT_SEARCH_PATHS=public

# ============================================
# APPLICATION SETTINGS (Optional)
# ============================================

# Node environment
NODE_ENV=production

# Server port (default: 5000)
PORT=5000
```

### Generating Secure Values

```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Example output: a7f8c9d2e3b4a5f6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
```

### Minimum Required Variables for Basic Deployment
At minimum, you need these to run the app:
1. `DATABASE_URL` - PostgreSQL connection string
2. `SESSION_SECRET` - Session encryption key

---

## 5. Backend Deployment

### Build Process
The backend is built alongside the frontend in a single build step:

```bash
# Install dependencies
npm install

# Build both frontend and backend
npm run build
```

This creates:
- `dist/index.cjs` - Compiled backend server
- `dist/public/` - Compiled frontend assets

### Server Entry Point
- **Development**: `server/index.ts` (run with tsx)
- **Production**: `dist/index.cjs` (compiled JavaScript)

### Express Server Features
- Serves API routes under `/api/*`
- Serves static frontend from `dist/public/`
- Session management with PostgreSQL store
- CORS configured for same-origin requests

---

## 6. Frontend Deployment

### Build Output
The frontend is a Vite-built React SPA. After running `npm run build`:
- Static files are in `dist/public/`
- Main entry: `dist/public/index.html`
- Assets: `dist/public/assets/`

### Serving Options

**Option A: Same Server (Default)**
The Express backend serves the frontend automatically. No additional configuration needed.

**Option B: CDN/Separate Hosting**
You can optionally serve `dist/public/` from a CDN like:
- Cloudflare Pages
- Vercel
- Netlify
- AWS CloudFront

Note: API requests must still go to your backend server.

---

## 7. Step-by-Step Deployment Process

### Step 1: Prepare Your Server
```bash
# Ensure Node.js 18+ is installed
node --version  # Should show v18.x.x or higher

# Clone the repository
git clone https://github.com/sportsreelstechnical/sports-reels.git
cd sports-reels
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Create Environment File
```bash
# Create .env file in project root
nano .env

# Add your environment variables (see Section 4)
```

### Step 4: Run Database Migrations
```bash
# Apply database schema
npm run db:push

# Expected output:
# [✓] Changes applied
```

### Step 5: Build the Application
```bash
npm run build

# Expected output:
# Built dist/index.cjs
# Built frontend assets
```

### Step 6: Start the Server
```bash
# Start in production mode
npm run start

# Or with a process manager (recommended)
pm2 start dist/index.cjs --name visaready
```

### Step 7: Configure Reverse Proxy (Optional but Recommended)

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 8: Set Up SSL (Required for Production)
```bash
# Using Certbot with Nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 8. Post-Deployment Verification

### Health Check Endpoints
```bash
# Check if server is running
curl http://yourdomain.com/api/user

# Expected: Returns user session info or empty response
```

### Create Initial Admin User
Access the application and create admin accounts through the admin portal or database:

```sql
-- Create admin user directly in database
INSERT INTO users (username, password, email, role)
VALUES (
  'admin',
  'hashed_password_here',  -- Use proper password hashing in production
  'admin@yourdomain.com',
  'admin'
);
```

### Verify Database Connection
```bash
# Check database tables exist
psql $DATABASE_URL -c "\dt"

# Should list 25+ tables
```

---

## Deployment Platforms Quick Reference

### Railway
```bash
# Connect GitHub repo
# Set environment variables in Railway dashboard
# Railway auto-detects npm run build and npm run start
```

### Render
```bash
# Build command: npm install && npm run build
# Start command: npm run start
# Set environment variables in Render dashboard
```

### DigitalOcean App Platform
```yaml
# app.yaml
name: visaready
services:
  - name: web
    source:
      github:
        repo: sportsreelstechnical/sports-reels
        branch: main
    build_command: npm install && npm run build
    run_command: npm run start
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
```

### Docker (Self-Hosted)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "run", "start"]
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify `DATABASE_URL` is correct
- Check if PostgreSQL is accessible from your server
- Ensure SSL mode matches your database configuration

**Session Not Persisting**
- Verify `SESSION_SECRET` is set
- Check PostgreSQL session table exists (`session`)
- Ensure cookies are being set correctly (check domain/secure flags)

**Frontend Not Loading**
- Verify `npm run build` completed successfully
- Check `dist/public/` directory exists
- Ensure `NODE_ENV=production` is set

**Port Already in Use**
- Change PORT in .env or use a different port
- Kill existing process: `lsof -i :5000 | kill`

---

## Summary Checklist

- [ ] PostgreSQL 14+ database provisioned
- [ ] `.env` file created in project root
- [ ] `DATABASE_URL` configured
- [ ] `SESSION_SECRET` generated and configured
- [ ] `npm install` completed
- [ ] `npm run db:push` executed successfully
- [ ] `npm run build` completed
- [ ] Server started with `npm run start`
- [ ] SSL certificate configured
- [ ] Application accessible at your domain
