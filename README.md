# BudgetWise

A personal finance dashboard for tracking spending, managing recurring expenses, and comparing plan vs reality on a budget account. Import bank statement CSVs (Danske Bank, Nordea, Lunar), explore your data, and share the app securely with others — each user sees only their own data.

---

## Stack

| Layer | Technology |
|---|---|
| API | ASP.NET Core 10, EF Core 10 |
| Database | PostgreSQL 17 |
| Auth | Keycloak 26.5.7 / keycloak-js 26.2.3 (OIDC / JWT) |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v3 |
| Container | Docker, Docker Compose |

---

## Features

- **Dashboard** — spending summary, category breakdown, monthly income/expense trends, balance history chart
- **Transactions** — searchable, filterable, sortable table with authenticated CSV export; upload bank statements (Danske Bank, Nordea, Lunar auto-detected)
- **Recurring Expenses** — manage fixed expense plan with frequency, final payment date, and transaction match patterns; monthly transfer calculator
- **Budget Account** — compare recurring plan vs actual spending, auto-detect recurring patterns from statements, YoY comparison per expense, missing payment alerts, month-by-month breakdown, end-of-year balance projection
- **Multi-user** — each account is isolated; Keycloak handles registration, login, and password reset

---

## Running with Docker

### 1. Create a `.env` file in the project root

```env
DB_NAME=bank_db
DB_USER=admin
DB_PASSWORD=your_db_password_here

PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=your_pgadmin_password_here
```

> The database connection string and Keycloak config are injected into the API container via `compose.yaml`. You do not need to edit `appsettings.json`.

### 2. Start all services

```bash
docker compose up --build
```

| Service | URL | Notes |
|---|---|---|
| App | http://localhost:8080 | Login via Keycloak on first visit |
| Keycloak admin | http://localhost:8180 | Admin UI (credentials below) |
| pgAdmin | http://localhost:5433 | Database explorer |
| Metabase | http://localhost:5434 | Analytics |

All ports are bound to `127.0.0.1` — they are not accessible from other machines on the network.

### First boot

On first boot, Keycloak imports the `bank` realm from `keycloak/realm-export.json` and creates the `bank-web` client automatically.

**Keycloak admin credentials** (for the admin UI only):

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin` |

> Change these before exposing the service publicly.

To register a user account, click **Register** on the login page. Keycloak handles all account management — passwords, email verification (if configured), and password reset.

### Resetting Keycloak data

Keycloak persists its database to the `keycloak_data` volume. If you change `realm-export.json` and need to re-import it, delete the volume and restart:

```bash
docker compose down -v   # removes all volumes — also clears postgres!
docker compose up --build
```

To reset only Keycloak without touching Postgres:

```bash
docker compose stop keycloak
docker volume rm bank-app_keycloak_data
docker compose up keycloak -d
```

---

## Running locally (development)

### Prerequisites

- .NET 10 SDK
- Node.js 22+
- Docker (for Postgres and Keycloak)

### 1. Start Postgres and Keycloak

```bash
docker compose up postgres keycloak -d
```

Keycloak will be available at http://localhost:8180.

### 2. Start the API

```bash
cd bank.Api
dotnet run
# Listens on http://localhost:5036
```

The `appsettings.Development.json` file configures the database and Keycloak for local dev:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;..."
  },
  "Keycloak": {
    "Authority": "http://localhost:8180/realms/bank",
    "PublicUrl": "http://localhost:8180"
  }
}
```

EF Core migrations run automatically on startup.

### 3. Start the frontend dev server

```bash
cd bank.Web
npm install
npm run dev
# Opens on http://localhost:5173
# Proxies /api to http://localhost:5036
```

The login flow redirects to Keycloak at `http://localhost:8180`, then back to the app. Register a user account on the Keycloak login page.

---

## Authentication

BudgetWise uses [Keycloak](https://www.keycloak.org/) for authentication via OIDC / OAuth 2.0 with PKCE.

### How it works

```
Browser → Keycloak login → JWT access token
                            ↓
Browser → API request with Bearer token
                            ↓
ASP.NET validates token against Keycloak JWKS
                            ↓
UserId (Keycloak sub claim) scopes all DB queries
```

1. The React app fetches `/api/config` to discover the Keycloak URL at runtime (no build-time baking of URLs).
2. `keycloak-js` redirects unauthenticated users to Keycloak login/register.
3. After login, every API request carries `Authorization: Bearer <token>`.
4. The ASP.NET API validates the JWT and extracts the user's `sub` claim as their `UserId`.
5. Every database query is filtered by `UserId` — users can only see and modify their own data.

### Two Keycloak URLs

The backend and frontend need different Keycloak URLs:

| Consumer | URL | Why |
|---|---|---|
| API (token validation) | `http://keycloak:8080` | Internal Docker network hostname |
| Frontend (login redirect) | `http://localhost:8180` | Public URL the browser can reach |

These are set separately in `compose.yaml` (`Keycloak__Authority` vs `Keycloak__PublicUrl`) and in `appsettings.Development.json` for local dev.

### Production deployment

For Kubernetes or any public deployment:

- Put Keycloak behind HTTPS (e.g. a TLS-terminating ingress).
- Set `Keycloak__Authority` to the internal service URL (e.g. `http://keycloak.auth.svc.cluster.local:8080/realms/bank`).
- Set `Keycloak__PublicUrl` to the public HTTPS URL (e.g. `https://auth.yourdomain.com`).
- Update `redirectUris` and `webOrigins` in the Keycloak realm config (or via the admin UI) to match your domain.
- Store credentials (DB password, Keycloak admin password) in Kubernetes Secrets and inject them as environment variables.
- Remove `RequireHttpsMetadata = false` — this is automatically enabled when `ASPNETCORE_ENVIRONMENT != Development`.

---

## Project structure

```
bank-app/
├── bank.Api/                    # ASP.NET Core Web API
│   ├── Controllers/
│   │   ├── AuthControllerBase.cs    # Shared base: extracts UserId from JWT
│   │   ├── ConfigController.cs      # GET /api/config — Keycloak config for frontend
│   │   ├── BankAccountsController.cs
│   │   ├── DashboardController.cs
│   │   ├── RecurringExpensesController.cs
│   │   ├── TransactionsController.cs
│   │   └── UploadController.cs
│   ├── Services/
│   │   └── CsvImportService.cs      # Multi-bank CSV parsing
│   ├── appsettings.json             # Base config (no secrets)
│   └── appsettings.Development.json # Local dev overrides (gitignored via .env pattern)
├── bank.Persistence/            # EF Core data layer
│   ├── Models/                  # Transaction, BankAccount, RecurringExpense (all have UserId)
│   ├── Repository/              # Interfaces + implementations (all queries scoped to UserId)
│   ├── Migrations/              # EF Core migrations
│   └── ApplicationDbContext.cs
├── bank.Web/                    # React frontend (Vite)
│   └── src/
│       ├── api/client.ts        # Axios client (attaches Bearer token automatically)
│       ├── keycloak.ts          # Keycloak init — fetches config from /api/config at runtime
│       ├── components/          # Sidebar (user display + sign out), StatCard
│       ├── context/             # Theme context
│       └── pages/               # Dashboard, Transactions, Recurring, BudgetAccount, Upload
├── keycloak/
│   └── realm-export.json        # Auto-imported realm config on first Keycloak boot
├── compose.yaml                 # Docker Compose: postgres, keycloak, api, pgadmin, metabase
└── Dockerfile                   # Multi-stage build: Node (frontend) → .NET SDK → ASP.NET runtime
```

---

## API reference

All endpoints except `/api/config` require a valid Keycloak JWT in the `Authorization: Bearer` header. All data is automatically scoped to the authenticated user.

### Config

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/config` | None | Returns Keycloak URL/realm/clientId for frontend init |

### Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Income, expenses, net, balance for a period |
| GET | `/api/dashboard/categories` | Spending by category |
| GET | `/api/dashboard/monthly-trends` | Monthly income/expense totals |
| GET | `/api/dashboard/balance-history` | Daily closing balance over time |
| GET | `/api/dashboard/data-range` | Earliest and latest transaction date |

All dashboard endpoints accept optional `?from=yyyy-MM-dd&to=yyyy-MM-dd&accountId=n` query params.

### Transactions

| Method | Path | Description |
|---|---|---|
| GET | `/api/transactions` | Paged, filtered, sorted list |
| GET | `/api/transactions/categories` | Distinct category list |
| GET | `/api/transactions/export` | Authenticated CSV export |
| GET | `/api/transactions/matched-total` | Sum of expenses matching a text pattern |
| GET | `/api/transactions/monthly-by-text` | Monthly amounts for a text pattern |
| GET | `/api/transactions/recurring-candidates` | Auto-detected recurring patterns |
| DELETE | `/api/transactions` | Delete all of the current user's transactions |

`GET /api/transactions` query params: `page`, `pageSize`, `search`, `category`, `from`, `to`, `type` (`income`/`expense`), `accountId`, `sortBy`, `sortDesc`.

### Accounts

| Method | Path | Description |
|---|---|---|
| GET | `/api/accounts` | List the current user's bank accounts |
| POST | `/api/accounts` | Create a bank account |
| DELETE | `/api/accounts/:id` | Delete an account (must be owned by caller) |

### Recurring expenses

| Method | Path | Description |
|---|---|---|
| GET | `/api/recurring` | List recurring expenses |
| POST | `/api/recurring` | Create recurring expense |
| PUT | `/api/recurring/:id` | Update recurring expense |
| DELETE | `/api/recurring/:id` | Delete recurring expense |

### Upload

| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Import a bank statement CSV (max 10 MB) |

Accepts `?accountId=n` to associate imported transactions with a specific account. Supports Danske Bank, Nordea, and Lunar CSV formats. Duplicate transactions (same date + description + amount, per user) are skipped.

---

## Supported CSV formats

| Bank | Detection | Decimal | Date |
|---|---|---|---|
| Danske Bank | Headers contain `kategori` + `underkategori` | Danish (`3.966,85`) | `dd.MM.yyyy` |
| Nordea | Headers contain `transaktionstekst` or `bogf` | Danish | `dd-MM-yyyy` |
| Lunar | Headers contain `description` + `amount` | Standard (`.`) | `yyyy-MM-dd` |
| Generic | Fallback — matches columns by name | Danish or standard | Multiple formats |

---

## Notes

- `*.csv` files are gitignored to prevent real financial data from being committed accidentally.
- Dark mode is supported with a manual toggle (stored in `localStorage`).
- The Keycloak `start-dev` mode uses an embedded H2 database. User data persists between restarts via the `keycloak_data` Docker volume, but this is not recommended for production — use a dedicated PostgreSQL database for Keycloak.
