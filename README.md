# ONE — Unified Citizen Service Platform

> **Bureaucratic friction is not inefficiency. It is institutional violence against ordinary people's time.**

ONE is an AI-powered unified intake platform that eliminates counter-ping-pong in banks and government offices. A citizen states what they need — in Bengali, English, or Banglish — and receives a single token. The AI pre-fills all forms, generates a document checklist, and gives the officer a complete briefing. Everything resolved in one visit.

Built for the **FRICTION Hackathon** by Noverse Inc.

---

## The Problem

In Bangladesh, a citizen who needs to deposit money AND open a Fixed Deposit must visit 4 different counters, fill 3 different forms, and often return the next day. The same friction exists across every government office. This is not a technical problem. It is a design failure that costs citizens their time, dignity, and income.

---

## Live Demo

| Page | URL | Who Uses It |
|------|-----|-------------|
| Citizen Intake | `/intake` | Citizen at kiosk |
| Officer Dashboard | `/officer` | Desk officer |
| Appointment Booking | `/appointment` | Citizen (advance booking) |
| Status Tracker | `/status` | Citizen (phone) |
| Admin Panel | `/admin` | Branch manager |
| Demo Mode | `/demo` | Start here for a demo |

---

## Features

**Citizen:** Trilingual NLP (Bengali/English/Banglish), voice input + TTS for low-literacy users, appointment booking, real-time queue tracking, post-service feedback.

**Officer:** Live queue with 3-second refresh, citizen visit history, AI-written briefing, pre-filled form data, colour-coded document checklist, case notes.

**Platform:** 84 services across 10 sectors, three-tier AI fallback (Groq → Ollama → rule-based), post-processing filter for AI error correction, rate limiting, audit logging, security headers, CI/CD pipeline.

---

## Architecture

```
Citizen / Officer
       │
  React 18 + Vite + Tailwind
       │
  Express.js (Node.js)
       │              │
  PostgreSQL      AI Provider
  (Neon)          1. Groq (0.3s)
                  2. Ollama (local)
                  3. Rule-based NLP
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) |
| AI Primary | Groq — Llama 3.3 70B |
| AI Secondary | Ollama — Llama 3.1 (offline) |
| AI Tertiary | Rule-based NLP (always on) |
| Voice | Web Speech API |
| Hosting | Render |
| CI/CD | GitHub Actions |

---

## Quick Start

```bash
git clone https://github.com/yourusername/one-platform.git
cd one-platform
npm install && cd client && npm install && cd ..
cp .env.example .env   # fill in your values
npm run dev
```

Open `http://localhost:5173`

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/one_platform
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
AI_PROVIDER=groq
NODE_ENV=development
PORT=3001
```

---

## Adding Citizens

If a citizen's NID is not in the database, the system creates a temporary record automatically and flags the ticket for verification at the desk. No citizen is ever turned away.

To add citizens manually:

```sql
INSERT INTO citizens (national_id, full_name, phone, address, dob)
VALUES ('1234567890123', 'Mohammad Rahman', '+8801711000001', 'Dhanmondi, Dhaka', '1980-05-15');
```

---

## Tests

```bash
node tests/run-tests.js
# 57 tests — token generation, input validation, AI parsing,
# Banglish detection, service slugs, status validation
```

---

## CI/CD

Every push to `main`: test → build → deploy to Render automatically.
Pull requests: test + build only.

---

## Services (84 total across 10 sectors)

Banking · Government Identity · Travel · Business · Land · Tax · Utilities · Vehicle · Health · Labour

---

## License

MIT — FRICTION Hackathon, Noverse Inc.
