# ONE — Unified Citizen Service Platform

> "Bureaucratic friction is not inefficiency. It is institutional violence against ordinary people's time."

ONE is a single AI-powered intake platform that eliminates the counter-ping-pong citizens face in banks and government offices. A citizen states their need in Bengali or English, gets one token, and an officer resolves everything in a single visit.

Built for **FRICTION Hackathon** by Noverse Inc.

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local or managed, e.g. Neon, Railway, Supabase)
- Anthropic API key (`claude-sonnet-4-20250514`)

### 1. Clone and install
```bash
git clone <repo-url>
cd one-platform
npm run install:all
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/one_platform
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3001
NODE_ENV=development
```

### 3. Create the database
```bash
createdb one_platform
# The server auto-runs migrations + seed on first start
```

### 4. Run
```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `ANTHROPIC_API_KEY` | Claude API key (`sk-ant-...`) | ✅ |
| `PORT` | Backend server port (default: 3001) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |

---

## Pages

| URL | Description |
|-----|-------------|
| `/intake` or `/` | Citizen kiosk — enter NID, describe need, get token |
| `/officer` | Officer dashboard — live queue + ticket details |
| `/admin` | Admin panel (login: `admin` / `demo2024`) |
| `/demo` | Live demo mode — 3 pre-built scenarios |

---

## Architecture

```
one-platform/
├── server/
│   ├── index.js          # Express entry, starts DB + server
│   ├── db.js             # PostgreSQL pool, migrations, seed
│   ├── routes/
│   │   ├── intake.js     # POST /api/intake — core AI flow
│   │   ├── tickets.js    # Ticket CRUD + queue
│   │   ├── citizens.js   # NID lookup
│   │   ├── services.js   # Service management
│   │   └── stats.js      # Analytics
│   └── lib/
│       ├── ai.js         # Claude API integration
│       └── tokenGen.js   # Token number generation (B-001, G-001, M-001)
├── client/
│   └── src/
│       ├── App.jsx       # Router
│       ├── pages/        # IntakeTerminal, OfficerDashboard, AdminPanel, DemoMode
│       └── components/   # TokenCard, DocChecklist, FormDataTable, QueuePanel, VoiceInput
├── seed.sql              # Standalone SQL for manual seeding
└── .env.example
```

---

## How the AI Intake Works

1. Citizen enters NID → system fetches profile from DB
2. Citizen describes need in Bengali or English (text or voice)
3. POST `/api/intake` → Claude `claude-sonnet-4-20250514` analyzes:
   - Detects which services are needed (from 34 available)
   - Determines sector (banking / government / mixed)
   - Pre-fills form fields using citizen profile
   - Generates document checklist with `likely_have` assessment
   - Writes a 2-3 sentence officer briefing
   - Provides a 10-word queue summary
4. Token generated: `B-001` (banking), `G-001` (govt), `M-001` (mixed)
5. Ticket stored in PostgreSQL, token displayed with QR code

---

## Demo Citizens (pre-seeded)

| Name | NID |
|------|-----|
| Fatema Begum | 1234567890 |
| Mohammad Karim | 0987654321 |
| Rina Akter | 1122334455 |
| Jamal Uddin | 5544332211 |
| Sadia Islam | 9988776655 |

---

## Deployment (Railway / Render)

1. Set all environment variables in your platform
2. Build command: `npm run install:all && npm run build`
3. Start command: `NODE_ENV=production node server/index.js`
4. The Express server serves the built React app in production

---

## API Reference

```
POST  /api/intake              Process citizen input, create ticket + token
GET   /api/queue               All waiting/serving tickets (sorted by created_at)
GET   /api/tickets/:id         Single ticket with citizen join
PATCH /api/tickets/:id/status  Update status: waiting | serving | done
POST  /api/tickets/:id/notes   Add officer notes
GET   /api/tickets/:id/notes   Get notes for a ticket
GET   /api/citizens/lookup/:nid Fetch citizen by National ID
GET   /api/stats               Today's analytics
GET   /api/services            All services grouped by sector
PATCH /api/services/:slug      Toggle service active/inactive
GET   /api/health              Health check
```
