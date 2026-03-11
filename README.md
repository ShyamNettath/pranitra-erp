# PRANITRA PM Tool — v1.0.0

Enterprise Project Management for Engineering Teams.

## Stack
- **Frontend**: React 18 + Vite + Zustand + TanStack Query
- **Backend**: Node.js 20 + Express + Knex
- **Database**: PostgreSQL 16
- **Proxy**: Nginx 1.25
- **Deployment**: Docker + Docker Compose (self-hosted, on-premise Windows Server)

---

## Quick Start (Development)

### Prerequisites
- Docker Desktop
- Node.js 20+

### 1. Clone and configure
```bash
cp .env.example .env
# Edit .env with your SMTP credentials, passwords, and secrets
```

### 2. Start all services
```bash
docker-compose up -d
```

### 3. Run database migration + seed
```bash
# Wait for DB to be ready, then:
docker exec pranitra_api node src/config/migrate.js
docker exec pranitra_api node src/config/seed.js
```

### 4. Access the application
Open **http://localhost** in your browser.

Default admin login:
- Email: `admin@pranitra.com`
- Password: `Admin@1234`
- ⚠️ Change the password immediately after first login.

---

## Development (without Docker)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env   # configure DB settings
node src/config/migrate.js
node src/config/seed.js
npm run dev               # starts on port 4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # starts on port 3000, proxies /api to 4000
```

---

## Architecture

```
Nginx (port 80/443)
  ├── /api/*       → Node.js/Express API (port 4000)
  ├── /uploads/*   → Static file volume
  └── /*           → React SPA (port 3000)

API → PostgreSQL (port 5432)
```

### Modular Block Architecture
Each block is versioned independently (v1.0, v1.1…):

| Block | Status |
|-------|--------|
| AUTH_BLOCK | ✅ v1.0 |
| USER_BLOCK | 🔄 Pending |
| WORKSPACE_BLOCK | 🔄 Pending |
| PROJECT_BLOCK | ✅ v1.0 |
| DESIGN_BLOCK | 🔄 Pending |
| SIMULATION_BLOCK | 🔄 Pending |
| PLANNING_BLOCK | 🔄 Pending |
| LAYOUT_BLOCK | 🔄 Pending |
| TASK_BLOCK | 🔄 Pending |
| GANTT_BLOCK | 🔄 Pending |
| MILESTONE_BLOCK | ✅ v1.0 (within PROJECT_BLOCK) |
| TIME_BLOCK | 🔄 Pending |
| RESOURCE_BLOCK | 🔄 Pending |
| REPORT_BLOCK | 🔄 Pending |
| NOTIFY_BLOCK | 🔄 Pending |
| FILE_BLOCK | 🔄 Pending |
| COMMENT_BLOCK | 🔄 Pending |
| ADMIN_BLOCK | 🔄 Pending |
| SEARCH_BLOCK | 🔄 Pending |
| RECYCLE_BLOCK | 🔄 Pending |

---

## Environment Variables

See `.env.example` for all required variables. Critical ones:

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | 64-char random string for access tokens |
| `JWT_REFRESH_SECRET` | Different 64-char string for refresh tokens |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Company email server |
| `TEAMS_WEBHOOK_URL` | Optional Microsoft Teams notifications |

---

## Security Notes
- Email OTP 2FA is mandatory for all users — cannot be disabled
- JWT access tokens expire in 15 minutes by default
- All sessions are logged in `audit_logs` table
- Workspace data is fully isolated at the database level
- Change all default passwords before production deployment

---

## Version History
- **v1.0.0** — Initial release: Infrastructure, Auth, Project Management core
