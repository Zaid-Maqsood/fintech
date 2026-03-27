# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fintech MVP — a modular, production-style web app intended for client demos. It covers authentication, transaction management, budgeting, payment simulation, analytics dashboards, an admin portal, and compliance-ready foundations.

**Status:** Early initialization phase. The `ai starter/` directory has minimal scaffolding; `frontend/` and `backend/` are placeholders pending setup.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL — existing DB `grayphite`, new schema `banking` |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod + React Hook Form |
| Animations | Framer Motion (`motion` already installed in `ai starter/`) |

---

## Commands

Once the stack is initialized, expected commands are:

```bash
# Frontend (from frontend/)
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint

# Backend (from backend/)
npm run dev        # Start Express server with nodemon
npm run start      # Production start
npm run db:migrate # Run DB migrations
npm run db:seed    # Seed demo data

# Run a single test (once testing is configured)
npm test -- --grep "test name"
```

---

## Repository Structure

```
fintech/
├── ai starter/          # Current working dir with motion library installed
├── frontend/            # React app (to be initialized)
│   └── src/
│       ├── features/    # Feature modules (auth, dashboard, transactions, etc.)
│       ├── components/  # Shared UI components
│       ├── hooks/       # Shared hooks
│       ├── services/    # API abstraction layer
│       ├── store/       # State management
│       └── types/       # Central TypeScript interfaces
├── backend/             # Node.js/Express API (to be initialized)
│   └── src/
│       ├── modules/     # Feature modules mirroring frontend layers
│       ├── middleware/  # Auth, RBAC, rate limiting, error handling
│       ├── db/          # Migrations, seeds, schema definitions
│       └── services/    # Business logic layer
└── full requirments.txt # Full product specification
```

---

## Architecture

### Frontend Feature Modules
Each feature lives under `src/features/<name>/` and contains its own pages, components, hooks, and service calls. Modules: `auth`, `dashboard`, `transactions`, `budgets`, `payments`, `analytics`, `admin`, `notifications`.

### Backend Modules
Mirror the frontend feature split. Each module owns its routes, controllers, and service logic. Business logic must stay in the service layer — controllers only handle HTTP concerns.

### Payment Architecture
The payment module must use an **adapter/service pattern** so real integrations (Stripe, Plaid, PayPal, banking APIs) can be plugged in later without restructuring. Keep the core payment logic behind an interface/adapter boundary.

### Database
- PostgreSQL database: `grayphite`
- Schema for this app: `banking` (create new — do not touch existing schemas)
- Key entities: `User`, `Role`, `Account/Wallet`, `Transaction`, `TransactionCategory`, `Budget`, `BudgetCategory`, `Payment`, `Notification`, `ActivityLog`, `ComplianceFlag`
- All entities need: `createdAt`, `updatedAt`, `status` fields

### Auth
- JWT with refresh token strategy
- Protected routes via route guards (frontend) and middleware (backend)
- Role-based access: `user` and `admin` roles
- Passwords must be hashed (bcrypt)

### Compliance-Ready Fields
These are placeholders — do not build KYC/AML logic, but include fields in schemas and UI:
- `kycStatus`, `amlStatus` on User
- `riskScore`, `isFlagged`, `complianceNotes` on Transaction

---

## Seed Data

The database must be seeded with:
- 1 admin user + 3–5 demo users
- Realistic transactions (income, expense, transfer across categories)
- Budgets with category limits
- Payment records with varying statuses (pending, completed, failed)
- Flagged transactions for admin review
- Notifications

---

## UI Standards

- Design target: premium fintech SaaS (not a generic admin template)
- Use shadcn/ui primitives; customize with Tailwind — avoid raw Bootstrap
- Animations: Framer Motion for page transitions, counter animations, modal transitions, chart reveals — tasteful only
- Charts: Recharts with tooltips, interactive filters, date range selectors
- Every module needs: loading skeleton, empty state, error state, success state
- Responsive: desktop-first but must work on mobile

## Build Order (from requirements)

1. Initialize stack (Vite frontend, Express backend)
2. Define DB schema + migrations
3. Build backend APIs + auth middleware
4. Auth flows (sign up, sign in, protected routes)
5. Finance dashboard
6. Transactions module
7. Budgeting module
8. Payment simulation
9. Analytics dashboards
10. Admin portal
11. Activity feed + notifications
12. Polish UI/animations
13. Seed demo data
14. README + env examples
