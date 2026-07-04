# GitHired - AI-Powered Job Placement Platform

A full-stack job placement platform connecting students with companies, featuring AI-powered analytics, resume analysis, and natural language query capabilities.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Starting the Application](#starting-the-application)
- [Available Scripts](#available-scripts)
- [Key Features](#key-features)
- [Project Architecture](#project-architecture)

---

## Overview

GitHired is a comprehensive recruitment platform designed for:
- **Students**: Profile building, job discovery, ATS resume scanning, peer comparison, interview tracking
- **Companies**: Job posting, applicant tracking, hiring analytics, interview scheduling
- **Admins**: Platform management, user approval workflows, analytics oversight

The platform leverages AI (Google Gemini, OpenAI, or Anthropic) for:
- Natural language to SQL query generation
- Resume ATS analysis and scoring
- Profile gap analysis and suggestions
- Intelligent insights generation

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS 4
- **Components**: shadcn/ui (Radix UI)
- **State Management**: React Query (@tanstack/react-query)
- **Rich Text**: TipTap editor
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth (email/password + Google OAuth)
- **File Storage**: AWS S3 with presigned URLs
- **Email**: Resend + React Email

### AI/ML
- **Primary Model**: Google Gemini 2.0 Flash (configurable)
- **Alternatives**: OpenAI GPT-4, Anthropic Claude, Custom/Hugging Face
- **Use Cases**: NLP to SQL, resume analysis, profile suggestions

### Development Tools
- **Language**: TypeScript
- **Testing**: Jest, Playwright
- **Linting**: ESLint
- **Database Migrations**: Drizzle Kit

---

## Directory Structure

```
githired/
├── app/                          # Next.js App Router pages and API routes
│   ├── api/                     # API route handlers
│   │   ├── admin/               # Admin API endpoints
│   │   │   ├── applications/
│   │   │   ├── companies/       # Company management endpoints
│   │   │   ├── jobs/
│   │   │   └── students/        # Student management endpoints
│   │   ├── ai/                  # AI-related endpoints
│   │   │   ├── query/           # NLP to SQL queries
│   │   │   ├── suggestions/    # Profile suggestions
│   │   │   └── templates/       # Query templates
│   │   ├── auth/                # Authentication endpoints
│   │   │   └── [...all]/        # Better Auth catch-all route
│   │   ├── company/             # Company-specific APIs
│   │   │   ├── applications/    # Application management
│   │   │   ├── interviews/     # Interview scheduling
│   │   │   ├── jobs/           # Job posting management
│   │   │   └── profile/        # Company profile
│   │   ├── create-profile/      # Profile creation
│   │   ├── fix-profile/         # Profile fixes
│   │   └── student/             # Student-specific APIs
│   │       ├── applications/    # Application submission
│   │       ├── ats-scan/       # Resume ATS analysis
│   │       ├── interviews/     # Interview calendar
│   │       ├── jobs/           # Job browsing
│   │       ├── peer-comparison/ # Peer analytics
│   │       ├── profile/        # Student profile
│   │       ├── profile-suggestions/ # AI suggestions
│   │       └── resume/         # Resume management
│   ├── dashboard/               # Protected dashboard pages
│   │   ├── admin/              # Admin dashboard
│   │   │   ├── applications/
│   │   │   ├── companies/
│   │   │   ├── jobs/
│   │   │   └── students/
│   │   ├── applications/       # Student applications view
│   │   ├── calendar/           # Interview calendar
│   │   ├── company/           # Company dashboard
│   │   │   ├── jobs/          # Job management
│   │   │   │   ├── [id]/      # Individual job pages
│   │   │   │   └── new/       # Post new job
│   │   │   ├── pending/       # Pending approval page
│   │   │   └── profile/       # Company profile
│   │   ├── jobs/              # Student job browsing
│   │   ├── kanban/            # Application kanban board
│   │   ├── peer-comparison/   # Peer analytics
│   │   ├── pending/           # Student pending approval
│   │   ├── profile/           # Student profile
│   │   ├── profile-insights/  # AI profile insights
│   │   ├── layout.tsx         # Dashboard layout
│   │   └── page.tsx           # Dashboard home
│   ├── forgot-password/        # Password reset request
│   ├── login/                  # Login page
│   ├── reset-password/         # Password reset form
│   ├── select-role/            # Role selection (student/company)
│   ├── signup/                 # Registration page
│   ├── verify-email/           # Email verification
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles
│
├── components/                 # React components
│   ├── ai-assistant-modal.tsx  # AI query interface
│   ├── app-sidebar.tsx         # Dashboard sidebar
│   ├── ats-score-display.tsx   # ATS score visualization
│   ├── charts/                 # Chart components
│   │   └── dynamic-chart.tsx   # Dynamic chart renderer
│   ├── emails/                 # Email templates
│   │   ├── application-status-update.tsx
│   │   ├── new-job-notification.tsx
│   │   ├── reset-email.tsx
│   │   └── verification-email.tsx
│   ├── forms/                  # Form components
│   │   ├── forgot-password-form.tsx
│   │   ├── login-form.tsx
│   │   ├── reset-password-form.tsx
│   │   └── signup-form.tsx
│   ├── profile-gap-card.tsx    # Profile gap display
│   ├── resume-selector.tsx     # Resume selection modal
│   ├── rich-text-editor.tsx    # TipTap editor
│   ├── schedule-interview-modal.tsx # Interview scheduling
│   ├── ui/                     # shadcn/ui components
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── sidebar.tsx
│   │   ├── tabs.tsx
│   │   └── tooltip.tsx
│   └── ...                     # Other utility components
│
├── db/                         # Database configuration
│   ├── drizzle.ts              # Drizzle client setup
│   └── schema.ts               # Database schema definitions
│
├── lib/                        # Core libraries and utilities
│   ├── ai/                     # AI-related modules
│   │   ├── ats-analyzer.ts     # Resume ATS analysis
│   │   ├── gemini-client.ts    # Gemini API client
│   │   ├── llm-provider.ts     # Multi-provider LLM abstraction
│   │   ├── profile-analyzer.ts # Profile gap analysis
│   │   ├── query-generator.ts  # NLP to SQL conversion
│   │   ├── query-templates.ts  # Pre-built query templates
│   │   ├── sql-validator.ts    # SQL security validation
│   │   └── suggestions.ts      # AI suggestions
│   ├── analytics/              # Analytics utilities
│   │   └── peer-comparison.ts  # Peer comparison logic
│   ├── auth.ts                 # Better Auth configuration
│   ├── auth-client.ts          # Client-side auth
│   ├── helpers.ts              # Helper functions
│   ├── storage.ts              # AWS S3 file management
│   └── utils.ts                # General utilities
│
├── server/                     # Server-side business logic
│   ├── admin.ts                # Admin operations
│   ├── ai/                     # AI server functions
│   │   └── query-executor.ts   # SQL query execution
│   ├── applications.ts         # Application management
│   ├── companies.ts           # Company operations
│   ├── interviews.ts          # Interview management
│   ├── jobs.ts                # Job operations
│   ├── students.ts            # Student operations
│   └── users.ts               # User management
│
├── migrations/                 # Database migrations
│   ├── 0000_*.sql             # Initial schema
│   ├── 0001_*.sql             # Subsequent migrations
│   └── meta/                  # Migration metadata
│
├── tests/                      # Test suites
│   ├── e2e/                   # End-to-end tests (Playwright)
│   │   └── auth.spec.ts
│   ├── integration/          # Integration tests
│   │   └── api/
│   ├── llm-accuracy/         # LLM accuracy tests
│   ├── performance/          # Performance tests
│   │   └── api-load.yml      # Artillery load tests
│   ├── security/             # Security tests
│   ├── unit/                 # Unit tests
│   │   ├── ai/               # AI module tests
│   │   ├── lib/              # Library tests
│   │   └── server/           # Server function tests
│   └── jest.setup.js          # Jest configuration
│
├── hooks/                      # React hooks
│   └── use-mobile.ts          # Mobile detection hook
│
├── scripts/                    # Utility scripts
│   ├── create-missing-profiles.ts
│   └── test-gemini-models.ts
│
├── public/                     # Static assets
│   ├── dark.png
│   ├── light.png
│   └── ...                    # Other assets
│
├── docs/                       # Documentation
│   └── testing/              # Testing documentation
│
├── .github/                    # GitHub workflows
│
├── auth-schema.ts             # Auth schema definitions
├── components.json            # shadcn/ui configuration
├── drizzle.config.ts          # Drizzle ORM configuration
├── eslint.config.mjs          # ESLint configuration
├── jest.config.js             # Jest configuration
├── middleware.ts              # Next.js middleware (auth & routing)
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies and scripts
├── playwright.config.ts       # Playwright configuration
├── postcss.config.mjs         # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
│
└── Documentation Files:
    ├── ARCHITECTURE.md        # Complete system architecture
    ├── IMPLEMENTATION_COMPLETE.md # Feature implementation status
    ├── LLM_SETUP_GUIDE.md     # LLM provider setup guide
    ├── LLM_PROVIDER_GUIDE.md  # LLM provider details
    ├── SIMPLIFIED_ARCHITECTURE.md
    ├── TESTING_IMPLEMENTATION_SUMMARY.md
    ├── TEST_RESULTS.md
    └── ...                    # Other documentation files
```

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18.x or higher
- **npm** or **yarn** package manager
- **PostgreSQL** database (or Neon serverless account)
- **AWS Account** (for S3 file storage)
- **Resend Account** (for email service)
- **LLM Provider API Key** (Gemini, OpenAI, or Anthropic)

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=GitHired <onboarding@resend.dev>

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1
# Optional: AWS CloudFront URL for CDN
AWS_CLOUDFRONT_URL=https://your-cloudfront-url.cloudfront.net

# LLM Provider (Choose one)
LLM_PROVIDER=gemini  # Options: gemini, openai, anthropic, custom

# Gemini Configuration (if using Gemini)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-exp  # Optional, default shown

# OpenAI Configuration (if using OpenAI)
# OPENAI_API_KEY=sk-your_openai_api_key
# OPENAI_MODEL=gpt-4o-mini  # Optional

# Anthropic Configuration (if using Anthropic)
# ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Optional

# Google OAuth (Optional - for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Optional Variables

```bash
# Custom LLM Provider (if using custom/Hugging Face)
# CUSTOM_LLM_API_URL=https://api-inference.huggingface.co/models/your-model
# CUSTOM_LLM_API_KEY=your_custom_api_key
# CUSTOM_LLM_MODEL=your-model-name
```

---

## Installation

1. **Clone the repository** (if not already cloned):
   ```bash
   git clone <repository-url>
   cd githired
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` (if available) or create a new `.env` file
   - Fill in all required environment variables (see [Environment Variables](#environment-variables))

4. **Install Playwright browsers** (for E2E testing):
   ```bash
   npm run playwright:install
   ```

---

## Database Setup

1. **Create a PostgreSQL database**:
   - Use Neon serverless (recommended) or local PostgreSQL
   - Get your connection string (DATABASE_URL)

2. **Run database migrations**:
   ```bash
   npx drizzle-kit push
   ```
   Or generate and apply migrations:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

3. **Verify database connection**:
   - Check that `DATABASE_URL` is correctly set in `.env`
   - The application will connect on startup

---

## Starting the Application

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API Routes**: http://localhost:3000/api/*

### Production Build

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

### Docker (if configured)

```bash
docker-compose up
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |
| `npm run test:unit` | Run only unit tests |
| `npm run test:integration` | Run only integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:e2e:headed` | Run E2E tests in headed mode |
| `npm run test:llm` | Run LLM accuracy tests |
| `npm run test:security` | Run security tests |
| `npm run test:performance` | Run performance tests |
| `npm run test:all` | Run all tests (Jest + Playwright) |
| `npm run playwright:install` | Install Playwright browsers |

---

## Key Features

### For Students
- **Profile Management**: Complete profile with skills, projects, experience, certifications
- **Job Discovery**: Browse and filter available job postings
- **Application Tracking**: Track application status through kanban board
- **ATS Resume Analysis**: AI-powered resume scoring and improvement suggestions
- **Peer Comparison**: Compare CGPA, skills, and profile completeness with peers
- **Profile Insights**: AI-generated gap analysis and improvement suggestions
- **Interview Calendar**: View and manage scheduled interviews
- **Natural Language Queries**: Ask questions in plain English, get SQL-powered insights

### For Companies
- **Job Posting**: Create and manage job postings with eligibility criteria
- **Applicant Management**: View, filter, and manage applications
- **Interview Scheduling**: Schedule interviews with multiple rounds
- **Application Status Updates**: Update application status (pending, OA, interview, selected, rejected)
- **Hiring Analytics**: View application statistics and trends
- **Company Profile**: Manage company information and verification

### For Admins
- **User Management**: Approve, reject, or ban students and companies
- **Bulk Operations**: Process multiple users simultaneously
- **Platform Oversight**: Monitor all jobs, applications, and users
- **Analytics Dashboard**: View platform-wide statistics
- **SRN Verification**: Verify student registration numbers

### AI Features
- **NLP to SQL**: Convert natural language queries to SQL with role-based security
- **Resume ATS Analysis**: Score resumes and provide improvement suggestions
- **Profile Gap Analysis**: Identify missing skills, projects, or certifications
- **Intelligent Insights**: Generate actionable insights from data
- **Multi-Provider Support**: Switch between Gemini, OpenAI, Anthropic, or custom models

---

## Project Architecture

### Authentication Flow
1. User signs up → Email verification required
2. Email verified → Role selection (student/company)
3. Profile created → Status set to "pending"
4. Admin approval → Status set to "approved"
5. Access granted → Role-based dashboard

### Request Flow
1. **Client Request** → Next.js Middleware
2. **Authentication Check** → Better Auth session validation
3. **Authorization Check** → Role and profile status verification
4. **Route Protection** → Middleware redirects based on role/status
5. **API Route/Server Action** → Business logic execution
6. **Database Query** → Drizzle ORM with PostgreSQL
7. **Response** → JSON or rendered page

### AI Query Flow
1. **Natural Language Input** → Query Generator
2. **Context Building** → Role, schema, permissions included
3. **LLM Processing** → Gemini/OpenAI/Anthropic API call
4. **SQL Generation** → Structured SQL query
5. **Security Validation** → Multi-layer SQL validation
6. **Role-Based Filtering** → Automatic WHERE clause injection
7. **Query Execution** → Database query with timeout
8. **Insights Generation** → AI-generated insights from results
9. **Response** → Chart/table visualization + insights

### File Upload Flow
1. **Client Request** → Presigned URL generation
2. **S3 Upload** → Direct upload to AWS S3
3. **URL Storage** → Save S3 URL to database
4. **File Access** → Presigned URLs or CloudFront CDN

---

## Additional Resources

- **Architecture Documentation**: See `ARCHITECTURE.md` for detailed system architecture
- **LLM Setup Guide**: See `LLM_SETUP_GUIDE.md` for AI provider configuration
- **Testing Guide**: See `docs/testing/TESTING_GUIDE.md` for testing instructions
- **Implementation Status**: See `IMPLEMENTATION_COMPLETE.md` for feature status

---

## Support

For issues, questions, or contributions, please refer to the project documentation or create an issue in the repository.

---

**GitHired** - Connecting talent with opportunity through AI-powered recruitment 🚀
