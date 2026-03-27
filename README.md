# FinVault — Fintech MVP

A modular fintech platform with transaction management, budgeting, payment workflows, analytics dashboards, admin controls, and compliance-ready foundations.

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally with a database named `grayphite`

### 1. Backend Setup

```bash
cd backend

# Configure your database password
# Edit .env and set DB_PASSWORD=your_actual_postgres_password

npm install
npm run db:migrate    # Creates the 'banking' schema and all tables
npm run db:seed       # Seeds demo users, transactions, budgets, payments
npm run dev           # Starts API server on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Starts Vite dev server on http://localhost:5173
```

Open http://localhost:5173

---

## Demo Credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@fintech.com      | Admin@123  |
| User  | alice@example.com      | User@123   |
| User  | bob@example.com        | User@123   |
| User  | carol@example.com      | User@123   |
| User  | david@example.com      | User@123   |

---

## Features

- **Authentication** — JWT-based login/register/refresh, role-based access (user/admin)
- **Dashboard** — Balance overview, cash flow charts, recent transactions, quick actions
- **Transactions** — Full CRUD with filtering, search, pagination, detail drawer
- **Budgets** — Monthly budgets with category limits, progress tracking, overspend alerts
- **Payments** — Real money transfer between users (balances actually update), payment receipts
- **Analytics** — Income/expense charts, spending by category, budget vs actual
- **Admin Panel** — User management, transaction monitoring, flag/unflag, platform analytics
- **Notifications** — In-app alerts for payments, budget alerts, system events
- **Profile** — Edit profile, change password, compliance/KYC status display

---

## Tech Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Animation | Motion (Framer Motion)                              |
| Charts    | Recharts                                            |
| State     | Zustand                                             |
| Backend   | Node.js, Express                                    |
| Database  | PostgreSQL (`grayphite` DB, `banking` schema)       |
| Auth      | JWT (access 15m + refresh 7d)                       |

---

## Project Structure

```
fintech/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # PostgreSQL pool
│   │   ├── db/migrate.js         # Schema creation
│   │   ├── db/seed.js            # Demo data
│   │   ├── middleware/           # auth, errorHandler
│   │   └── modules/              # auth, users, accounts, transactions,
│   │                             # budgets, payments, analytics, admin, notifications
│   ├── server.js
│   └── .env
└── frontend/
    └── src/
        ├── components/           # layout, ui (shadcn)
        ├── features/             # auth, dashboard, transactions, budgets,
        │                         # payments, analytics, admin, profile, notifications
        ├── store/                # authStore, uiStore (Zustand)
        ├── lib/                  # api.ts (axios), utils.ts
        └── types/                # TypeScript interfaces
```

---

## Environment Variables (backend/.env)

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grayphite
DB_USER=postgres
DB_PASSWORD=your_password    # ← Update this
DB_SCHEMA=banking
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=http://localhost:5173
```
