# Bank App

A personal finance dashboard for tracking spending, managing recurring expenses, and comparing plan vs reality on a budget account. Built with ASP.NET Core 10, PostgreSQL, and React.

---

## Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core 10, EF Core 10 |
| Database | PostgreSQL (via Npgsql) |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v3 |
| Container | Docker, Docker Compose |

---

## Features

- **Dashboard** — spending summary, category breakdown, monthly income/expense trends, balance history chart
- **Transactions** — searchable, filterable, sortable table with CSV export; upload bank statements (Danske Bank CSV format auto-detected)
- **Recurring Expenses** — manage your fixed expense plan with frequency, final payment date, and transaction match patterns; monthly transfer calculator
- **Budget Account** — compare recurring plan vs actual spending, auto-detect recurring patterns from statements, YoY comparison per expense, missing payment alerts, month-by-month breakdown, end-of-year balance projection

---

## Running with Docker

### 1. Create a `.env` file in the project root

```env
DB_NAME=bank_db
DB_USER=admin
DB_PASSWORD=your_password_here

PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=your_pgadmin_password_here
```

### 2. Start all services

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| App | http://localhost:8080 |
| pgAdmin | http://localhost:5433 |
| Metabase | http://localhost:5434 |

The API and frontend are served together from port 8080. EF Core migrations run automatically on startup.

---

## Running locally (development)

### Prerequisites

- .NET 10 SDK
- Node.js 22+
- PostgreSQL running locally or via Docker

### 1. Start only the database

```bash
docker compose up postgres -d
```

### 2. Start the API

```bash
cd bank.Api
dotnet run
# Listens on http://localhost:5036
```

### 3. Start the frontend dev server

```bash
cd bank.Web
npm install
npm run dev
# Opens on http://localhost:5173
# Proxies /api requests to http://localhost:5036
```

---

## Project structure

```
bank-app/
├── bank.Api/               # ASP.NET Core Web API
│   ├── Controllers/        # REST endpoints
│   └── Services/           # CSV import logic
├── bank.Persistence/       # EF Core data layer
│   ├── Models/             # Entity models
│   ├── Repository/         # Repository interfaces + implementations
│   ├── Migrations/         # EF Core migrations
│   └── ApplicationDbContext.cs
├── bank.Web/               # React frontend (Vite)
│   └── src/
│       ├── api/            # Axios client + TypeScript interfaces
│       ├── components/     # Shared UI components
│       ├── context/        # Theme context
│       └── pages/          # Dashboard, Transactions, Recurring, BudgetAccount, Upload
├── compose.yaml            # Docker Compose (postgres, api, pgadmin, metabase)
└── Dockerfile              # Multi-stage build (Node → .NET SDK → ASP.NET runtime)
```

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Income, expenses, net, balance for a period |
| GET | `/api/dashboard/categories` | Spending by category |
| GET | `/api/dashboard/monthly-trends` | Monthly income/expense breakdown |
| GET | `/api/dashboard/balance-history` | Daily balance over time |
| GET | `/api/dashboard/data-range` | First and last transaction date (optionally per account) |
| GET | `/api/transactions` | Paged, filtered, sorted transactions |
| GET | `/api/transactions/categories` | Distinct category list |
| GET | `/api/transactions/export` | CSV export |
| GET | `/api/transactions/matched-total` | Sum of expenses matching a text pattern |
| GET | `/api/transactions/monthly-by-text` | Monthly breakdown for a text pattern |
| GET | `/api/transactions/recurring-candidates` | Auto-detected recurring patterns |
| DELETE | `/api/transactions` | Delete all transactions |
| POST | `/api/upload` | Import a bank statement CSV |
| GET | `/api/accounts` | List bank accounts |
| POST | `/api/accounts` | Create bank account |
| DELETE | `/api/accounts/:id` | Delete bank account |
| GET | `/api/recurring` | List recurring expenses |
| POST | `/api/recurring` | Create recurring expense |
| PUT | `/api/recurring/:id` | Update recurring expense |
| DELETE | `/api/recurring/:id` | Delete recurring expense |

---

## Notes

- Bank statement CSV files should not be committed to the repo. Add them to `.gitignore`:
  ```
  *.csv
  ```
- The `appsettings.json` connection string is used for local development. In Docker the connection string is injected via environment variables in `compose.yaml`.
- Dark mode is supported and follows system preference by default with a manual toggle.
