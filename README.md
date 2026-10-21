# SyncBoard Realtime — Enterprise Collaborative Project Management Platform

A high-performance, real-time Jira & Linear hybrid workspace built with **Next.js 16 (App Router, Turbopack, React 19)**, **PostgreSQL 16 (Prisma ORM 7)**, **WebSockets / Server-Sent Events**, and a multi-tiered **Role-Based Access Control (RBAC)** engine.

[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.10-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-PostgreSQL_16-2496ED?style=flat&logo=docker)](https://www.docker.com/)

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start: Step-by-Step Local Setup](#-quick-start-step-by-step-local-setup)
  - [1. Clone Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start PostgreSQL with Docker](#4-start-postgresql-with-docker)
  - [5. Synchronize Schema and Seed Demo Data](#5-synchronize-schema-and-seed-demo-data)
  - [6. Start Next.js Development Server](#6-start-the-development-server)
- [Demo Accounts & 1-Click Role Switcher](#-demo-accounts--1-click-role-switcher)
- [Granular RBAC Permission Matrix](#-granular-rbac-permission-matrix)
- [Available NPM Scripts](#-available-npm-scripts)
- [Project Directory Structure](#-project-directory-structure)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [Running Automated Tests](#-running-automated-tests)

---

## 🌟 Key Features

### 🏢 Multi-Tenant Workspaces, Squads & Projects
- **Slug-Based Dynamic Routing**: Clean URLs for workspaces and projects (`/workspace/acme/project/KAN`).
- **Functional Squads & Teams**: Group colleagues into functional departments (e.g., *Core Engineering*, *Product & Design*).
- **Project Isolation**: Unique key prefixes for tasks (e.g., `KAN-1`, `KAN-2`, `MOB-1`), custom accent colors, icons, leads, and custom workflows.

### 📋 Fluid Drag-and-Drop Kanban Board
- **Physics-Based Drag-and-Drop**: Built using `@hello-pangea/dnd` for smooth card reordering within columns and between columns.
- **Work-In-Progress (WIP) Limits**: Column capacity thresholds with visual warning badges and progress rings.
- **Optimistic UI Updates**: Immediate client-side reordering with automated rollback if a network error occurs.
- **Quick Card Creator**: Inline task creation at the bottom of any column without leaving the board view.

### 👁️ Multiple Synchronized Views
- **Kanban Board**: Visual card lanes with priority flags, story points, checklist progress rings, tags, and due date alerts.
- **List View**: Dense tabular view with inline priority changes, assignee selection, and sorting.
- **Calendar View**: Monthly interactive calendar plotting tasks by their due dates with overdue highlights.
- **Activity Stream**: Workspace-wide audit log tracking card moves, edits, comments, and member additions.

### ⚡ Real-Time Engine (Dual-Mode: Pusher + Native SSE Fallback)
- **Multi-Provider Architecture**: Connects to **Pusher Channels** in production and seamlessly falls back to a **Native Server-Sent Events (SSE)** stream in local development.
- **Broadcast Events**: `task:created`, `task:updated`, `task:moved`, `task:deleted`, `comment:created`, `notification:created`.
- **Zero Third-Party Requirement for Local Dev**: Runs 100% locally out-of-the-box without requiring any external paid API keys.

### 🔒 3-Tier Enterprise RBAC & Project Security
- **Tier 1: Workspace Roles** (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Tier 2: Squad / Team Roles** (`LEAD`, `SENIOR_ENGINEER`, `ENGINEER`, `COLLABORATOR`, `PRODUCT_ANALYST`).
- **Tier 3: Project-Level Access Control**:
  - **Workspace Owners & Admins**: Global administrative rights across all workspace projects.
  - **Project Leads**: Full management permissions for their designated project.
  - **Squad Members**: Automatic contributor/write access to projects belonging to their squad.
  - **Explicit Project Collaborators**: External squad members invited with contributor or viewer roles.
  - **Non-Member Workspace Guests**: Strict read-only access (card dragging disabled, task creation buttons hidden, server-enforced 403 Forbidden on writes).
- **Safe Project Deletion**: Screen-centered confirmation modal with project key verification, restricted exclusively to Workspace `OWNER` & `ADMIN`.

### 📝 Task Details, Checklists, Mentions & Attachments
- **Interactive Checklists**: Multi-item checklists with real-time percentage completion bars.
- **Rich Comments with `@mentions`**: Type `@` to invoke user autocomplete suggestions and trigger instant in-app notifications.
- **Supabase Cloud Attachments**: Direct image uploads (JPEG, PNG, GIF, WebP, SVG up to 10MB) backed by Supabase Storage.
- **Command Palette (`Ctrl+K` / `Cmd+K`)**: Rapid workspace navigation and instant fuzzy search across cards, titles, keys, and descriptions.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User["Client Browser (React 19 / Next.js 16)"]
    
    subgraph AppServer["Next.js App Router Server"]
        AuthMiddleware["JWT Auth & Session Verification"]
        RBAC["3-Tier RBAC Engine (Workspace + Squad + Project)"]
        API["REST & Mutation API Routes"]
        SSEHub["Server-Sent Events Realtime Hub"]
    end
    
    subgraph StorageLayer["Data & Persistence Layer"]
        Prisma["Prisma ORM 7 (@prisma/adapter-pg)"]
        Postgres[("PostgreSQL 16 (Docker: Port 5433)")]
        Supabase[("Supabase Storage (Bucket: attachments)")]
    end
    
    subgraph ExternalServices["Optional Integrations"]
        Pusher["Pusher Channels (WebSockets)"]
        Resend["Resend API (Invitations & Verification)"]
    end

    User <-->|HTTP / Turbopack| AppServer
    User <-->|SSE Stream / Pusher| SSEHub
    AppServer --> AuthMiddleware
    AuthMiddleware --> RBAC
    RBAC --> API
    API --> Prisma
    Prisma --> Postgres
    API --> Supabase
    API -.-> Pusher
    API -.-> Resend
```

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.4.2 (App Router, Turbopack, React 19.2.8) |
| **Styling** | Tailwind CSS v4, Lucide React Icons, clsx, tailwind-merge |
| **Database** | PostgreSQL 16 Alpine via Docker Compose |
| **ORM** | Prisma ORM 7.10.0 with `@prisma/adapter-pg` driver adapter |
| **Authentication** | JWT (`jose`), secure HTTP-only cookies, password hashing with `bcryptjs` |
| **Drag & Drop** | `@hello-pangea/dnd` |
| **Realtime** | Pusher Channels (`pusher` / `pusher-js`) + Native Server-Sent Events (SSE) Fallback |
| **File Storage** | Supabase Storage (`@supabase/supabase-js`) |
| **Email Service** | Resend API (`resend`) with automated console simulator fallback |
| **Testing** | Vitest 3.2.7 |

---

## 📋 Prerequisites

Before setting up SyncBoard locally, make sure you have the following installed on your machine:

- **Node.js**: `v18.18.0` or higher (Node.js `v20.x` LTS or `v22.x` recommended). Verify with:
  ```bash
  node -v
  ```
- **npm**: `v9.x` or `v10.x` (bundled with Node.js). Verify with:
  ```bash
  npm -v
  ```
- **Docker & Docker Compose**: Ensure Docker Desktop is installed and running. Verify with:
  ```bash
  docker --version
  docker compose version
  ```
- **Git**: Installed and available in your terminal path.

---

## 🚀 Quick Start: Step-by-Step Local Setup

Follow these exact steps to get SyncBoard up and running locally in under 3 minutes.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd "Realtime Project Management System"
```

### 2. Install Dependencies

Install all project dependencies. A `postinstall` script will automatically trigger `prisma generate` to configure the Prisma Client:

```bash
npm install
```

### 3. Configure Environment Variables

Create your local `.env` configuration file from `.env.example`:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux (Bash):**
```bash
cp .env.example .env
```

The default values in `.env.example` are pre-configured to work immediately with the local Docker setup:

```env
# -----------------------------------------------------------------------------
# Database Configuration (Docker PostgreSQL 16 on Port 5433)
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/project_management?schema=public"

# -----------------------------------------------------------------------------
# Security & Session Authentication (Must be >= 32 characters)
# -----------------------------------------------------------------------------
JWT_SECRET="syncboard-super-secure-jwt-secret-key-32-chars-minimum"

# -----------------------------------------------------------------------------
# Application URL
# -----------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# -----------------------------------------------------------------------------
# Realtime Sync (Optional - SSE fallback runs automatically when blank)
# -----------------------------------------------------------------------------
PUSHER_APP_ID=""
NEXT_PUBLIC_PUSHER_KEY=""
PUSHER_SECRET=""
NEXT_PUBLIC_PUSHER_CLUSTER="mt1"

# -----------------------------------------------------------------------------
# Email Notifications & Invites (Optional - Terminal simulator runs when blank)
# -----------------------------------------------------------------------------
RESEND_API_KEY=""
EMAIL_FROM="SyncBoard <onboarding@resend.dev>"

# -----------------------------------------------------------------------------
# File Storage for Attachments (Images up to 10MB)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SECRET_KEY="your-secret-key"
SUPABASE_STORAGE_BUCKET="attachments"
```

> [!NOTE]
> **Why Port 5433?**
> The Docker container maps host port `5433` to container port `5432` (`5433:5432`). This prevents port collisions with any local PostgreSQL instance already running on your machine's default `5432` port.

### 4. Start PostgreSQL with Docker

Start the containerized PostgreSQL 16 Alpine database in detached mode:

```bash
npm run docker:up
```
*(Or manually run `docker compose up -d`)*

Verify that the container is healthy:
```bash
docker ps
```
You should see `syncboard_postgres` running on `0.0.0.0:5433->5432/tcp`.

### 5. Synchronize Schema and Seed Demo Data

Push the Prisma schema to your PostgreSQL database:

```bash
npm run db:push
```

Seed the database with complete, production-grade mock data (Workspaces, Squads, Projects, Kanban Boards, Tasks, Checklist Items, Labels, and Comments):

```bash
npm run db:seed
```

You will see output confirming:
- 4 Demo Users created (all with password `password123`)
- 1 Organization Workspace (`Acme Cloud Platform` / slug: `acme`)
- 2 Functional Squads (`Core Engineering` & `Product & Design`)
- 2 Projects (`SyncBoard Web App` [KAN] & `Mobile Companion App` [MOB])
- 5 Kanban Columns with WIP limits
- 10+ Seeded Tasks with assignments, tags, checklists, and activity history

### 6. Start the Development Server

Launch the Next.js development server powered by Turbopack:

```bash
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

You will be automatically logged in as **Alex Rivera** (Workspace Owner) and redirected directly to the live board:
`http://localhost:3000/workspace/acme/project/KAN`

---

## 👥 Demo Accounts & 1-Click Role Switcher

All seed accounts use the default password: **`password123`**

| Name | Email | Workspace Role | Squad Team | Default Project Role |
| :--- | :--- | :---: | :---: | :---: |
| **Alex Rivera** | `alex@acme.io` | **OWNER** | Core Engineering (Lead) | Project Lead (`KAN`) / Full Admin |
| **Sarah Chen** | `sarah@acme.io` | **ADMIN** | Product & Design (Lead) | Project Lead (`MOB`) / Admin |
| **Marcus Vance** | `marcus@acme.io` | **MEMBER** | Core Engineering | Contributor (`KAN`) / Guest (`MOB`) |
| **Elena Rostova** | `elena@acme.io` | **VIEWER** | Product & Design | Viewer (`KAN`) / Read-Only Guest |

### ⚡ 1-Click Role Switcher in Sidebar
You do **not** need to log out and log back in to test different permission tiers. Look at the **bottom-left corner of the sidebar**: click the **"Switch Test Account"** dropdown to switch between Alex, Sarah, Marcus, and Elena on the fly!

---

## 🔐 Granular RBAC Permission Matrix

SyncBoard implements a unified 3-tier security model combining Workspace Roles, Squad Memberships, and Project Memberships:

```mermaid
flowchart TD
    User([User Requests Action]) --> WS_Role{Workspace Role?}
    
    WS_Role -->|OWNER or ADMIN| FullAccess[Full Access Granted: MANAGE]
    
    WS_Role -->|MEMBER| ProjLead{Is Project Lead?}
    WS_Role -->|VIEWER| StrictViewer[Strict Read-Only: VIEWER]
    
    ProjLead -->|Yes| FullAccess
    ProjLead -->|No| SquadCheck{Is Member of Project Squad?}
    
    SquadCheck -->|Yes| ContributorAccess[Write Access Granted: CONTRIBUTOR]
    SquadCheck -->|No| ExplicitProjMember{Explicit ProjectMember Record?}
    
    ExplicitProjMember -->|CONTRIBUTOR| ContributorAccess
    ExplicitProjMember -->|VIEWER| StrictViewer
    ExplicitProjMember -->|None| NonMemberGuest[Guest: Non-Member READ-ONLY]
```

### Action Capabilities by Role

| Action | Workspace OWNER | Workspace ADMIN | Project Lead | Squad Member | Explicit Project Member | Non-Member Workspace Guest | Workspace VIEWER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Board & Tasks** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Drag & Reorder Cards** | ✅ | ✅ | ✅ | ✅ | ✅ *(Contributor)* | ❌ *(Disabled)* | ❌ *(Disabled)* |
| **Create & Edit Tasks** | ✅ | ✅ | ✅ | ✅ | ✅ *(Contributor)* | ❌ *(403 Forbidden)* | ❌ *(403 Forbidden)* |
| **Post Comments & Checklists**| ✅ | ✅ | ✅ | ✅ | ✅ *(Contributor)* | ❌ | ❌ |
| **Upload Image Attachments** | ✅ | ✅ | ✅ | ✅ | ✅ *(Contributor)* | ❌ | ❌ |
| **Manage Project Members** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Delete Project** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Workspace Settings & Invites**| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 📦 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Turbopack on port `3000` |
| `npm run build` | Compiles optimized production application build |
| `npm run start` | Starts production server from `.next` build |
| `npm run lint` | Runs ESLint 9 across all codebase files with zero-warning threshold |
| `npm run test` | Executes Vitest test suite (Auth, RBAC, Data Layer, and Resend workflows) |
| `npm run docker:up` | Starts PostgreSQL container in background via Docker Compose |
| `npm run docker:down` | Stops PostgreSQL container |
| `npm run db:push` | Pushes Prisma schema changes directly into the PostgreSQL database |
| `npm run db:seed` | Seeds database with complete mock workspaces, teams, boards, and cards |
| `npm run db:studio` | Launches Prisma Studio GUI at `http://localhost:5555` to inspect database records |

---

## 📂 Project Directory Structure

```text
├── app/
│   ├── (auth)/
│   │   ├── login/                  # Authentication page
│   │   ├── verify-email/           # Email token verification
│   │   └── invite/                 # Workspace invite acceptance
│   ├── api/
│   │   ├── auth/                   # Login, register, logout, verify-email
│   │   ├── realtime/               # Server-Sent Events (SSE) stream endpoint
│   │   └── workspace/[workspaceId]/# Workspaces, Squads, Projects, Columns, Tasks, Comments
│   ├── workspace/[slug]/
│   │   └── project/[projectKey]/   # Main project board page (Kanban, List, Calendar)
│   ├── layout.tsx                  # Root HTML layout & font providers
│   └── page.tsx                    # Root redirection to active workspace
├── components/
│   ├── board/                      # Kanban board, column container, card items
│   ├── calendar/                   # Interactive monthly calendar view
│   ├── list/                       # Tabular list view with inline edit controls
│   ├── layout/                     # Navbar, Sidebar, User Switcher, Command Palette
│   ├── project/                    # ProjectMembersModal, DeleteProjectModal
│   └── tasks/                      # TaskDetailModal, Checklists, Attachments, Comments
├── lib/
│   ├── db/                         # Database repository functions & CRUD operations
│   ├── email/                      # Resend integration & responsive HTML email templates
│   ├── rbac/                       # Server-side 3-tier RBAC authorization engine
│   ├── storage/                    # Supabase storage client for file attachments
│   ├── auth.ts                     # JWT signing & cookie session management
│   ├── env.ts                      # Environment configuration & fail-fast validator
│   ├── prisma.ts                   # Prisma client singleton instance
│   └── realtime.ts                 # Dual-mode realtime emitter (Pusher + SSE)
├── prisma/
│   ├── schema.prisma               # Prisma data schema
│   └── seed.ts                     # Comprehensive demo data seeder script
├── tests/
│   ├── auth.test.ts                # JWT authentication unit tests
│   ├── data-layer.test.ts          # Database repository integration tests
│   ├── email-verification.test.ts  # Verification & invitation workflow tests
│   └── rbac.test.ts                # Workspace, squad, and project RBAC unit tests
├── docker-compose.yml              # PostgreSQL 16 Alpine container configuration
├── eslint.config.mjs               # ESLint 9 configuration
└── vitest.config.ts                # Vitest test suite configuration
```

---

## ❓ Troubleshooting & FAQ

### 1. Database Connection Refused (`connect ECONNREFUSED 127.0.0.1:5433`)
- **Cause**: The PostgreSQL Docker container is not running.
- **Solution**: Run `npm run docker:up` and verify with `docker ps` that `syncboard_postgres` is in `Up` status.

### 2. Port 5433 Already in Use
- **Cause**: Another service or previous container is occupying host port `5433`.
- **Solution**: Edit `docker-compose.yml` to use another port (e.g. `5434:5432`) and update the port in your `.env` `DATABASE_URL`.

### 3. JWT Secret Validation Error (`JWT_SECRET must be at least 32 characters`)
- **Cause**: `JWT_SECRET` in `.env` is either empty or shorter than 32 characters.
- **Solution**: Ensure your `.env` contains a key of at least 32 characters, such as:
  ```env
  JWT_SECRET="syncboard-super-secure-jwt-secret-key-32-chars-minimum"
  ```

### 4. How Do Image Attachments Work with Supabase?
- To enable image uploads for tasks:
  1. Create a free project at [supabase.com](https://supabase.com).
  2. Create a public storage bucket named **`attachments`**.
  3. In Supabase Project Settings → API, copy your Project URL, Anon Key, and Service Role Key into `.env`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
     NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
     SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
     SUPABASE_STORAGE_BUCKET="attachments"
     ```
  4. Only image files (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`) up to **10MB** are accepted.

### 5. Email Verification & Invitations (Resend)
- If you don't provide a `RESEND_API_KEY`, the application automatically operates in **Console Simulator Mode**. Verification and invite links will be logged directly to your terminal console so you can test registration and onboarding flows locally without an external email provider!

### 6. Resetting the Database from Scratch
- If you want to wipe everything and reseed fresh demo data:
  ```bash
  npx prisma db push --force-reset
  npm run db:seed
  ```

---

## 🧪 Running Automated Tests

Run the full Vitest automated test suite:

```bash
npm run test
```

Run code quality linting:

```bash
npm run lint
```

Run TypeScript compiler validation:

```bash
npx tsc --noEmit
```

---

## 📄 License

This project is licensed under the MIT License. Feel free to use it for personal or commercial projects.
