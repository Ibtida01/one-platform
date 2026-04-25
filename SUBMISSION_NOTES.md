# ONE Platform — Hackathon Submission Notes
## Copy and paste the section below into the "Additional Notes" field

---

ONE is a full-stack web application built in 72 hours that unifies citizen service intake across banking and government sectors in Bangladesh. Here is a technical summary of what we built:

**Core Architecture**

The platform runs as a Node.js/Express backend serving a React 18 frontend built with Vite and Tailwind CSS. PostgreSQL (hosted on Neon) stores citizens, tickets, officers, appointments, feedback, and service logs. In production, the entire stack is hosted on Render with zero infrastructure cost.

**AI Integration — Three-Tier Fallback**

The AI layer uses a provider chain rather than a single API dependency. The primary provider is Groq (Llama 3.3 70B — 0.3 second response time, free tier). If Groq fails, the system automatically falls back to Ollama running locally (Llama 3.1). If both fail, a rule-based NLP engine with hand-crafted keyword maps for all 84 services takes over. The app never shows "AI unavailable" — one of the three always works.

Every AI response passes through a post-processing layer that catches and corrects common detection errors. For example, when a citizen says "50 hajar taka diye fd khulte chai" (I want to open an FD with 50,000 taka), a naive model incorrectly detects both fd_open and cash_deposit. Our post-processor identifies that "taka" here is an amount argument, not a standalone deposit request, and removes the false positive before the result reaches the officer.

**Natural Language Understanding**

The system handles three language modes natively: pure Bengali (Unicode), pure English, and Banglish (Bengali phonetics written in Latin script — e.g. "nid te nam bhul ache thik korte chai ar fd khulte chai"). Amount extraction handles "50 hajar" (50,000), "1 lakh" (100,000), "2 crore" (20,000,000). Tenure extraction handles "3 bochor" (36 months), "6 mas" (6 months). Urgency detection flags inputs containing "acil", "urgent", "jotoshigghir" and marks the ticket accordingly.

**Service Coverage**

84 services across 10 sectors: banking (31 services including 6 loan types, 3 account types, 4 card operations), government identity (11), travel (7), business (9), land (8), tax (5), utilities (8), vehicle (8), health (7), and labour (6).

**Security**

Per-IP rate limiting (5 requests/minute on AI intake endpoints, 30/minute on general API), input validation with NID format enforcement (10–17 digits, digits only), request size limits (100kb maximum), security headers (CSP, X-Frame-Options, X-XSS-Protection, Referrer-Policy), X-Powered-By header removal, and audit logging with request IDs on every HTTP transaction.

**Testing**

57 automated tests covering: token number generation and counter isolation, NID input validation (length, format, space stripping), status update validation including SQL injection attempts, AI JSON response parsing with malformed input handling, Banglish keyword detection across 9 phrases, and service slug format validation across 16 slugs. Tests run without any database or API connection — fully isolated.

**CI/CD Pipeline**

GitHub Actions pipeline with three jobs: (1) test — syntax-checks all 13 server files and runs the 57-test suite, (2) build — compiles the React frontend with Vite and uploads the artifact, (3) deploy — triggers a Render deploy via webhook and verifies the health endpoint responds 200. Pull requests run jobs 1 and 2 only. Pushes to main run all three. The pipeline completes in under 4 minutes end to end.

**Database Schema**

Seven tables: citizens (NID, profile), services (84 slugs with required docs and form fields as JSONB), tickets (full AI output stored as JSONB for audit), service_logs (officer notes), officers (accounts with roles), appointments (time slot bookings), feedback (1–5 star ratings with comments), notifications (SMS/push log structure).

**Additional Features**

Appointment booking with slot availability checking and conflict detection. Real-time token status tracking (5-second polling, shows queue position and estimated wait). Post-service feedback collection. Officer login system with role separation (officer, supervisor, admin). Citizen visit history displayed automatically when a returning citizen's NID is scanned. Text-to-speech token announcement for low-literacy users (reads token number aloud in Bengali after generation).

**Performance**

AI response time: 0.3–0.8 seconds via Groq. Officer queue refresh: every 3 seconds via polling. Frontend bundle: 259KB gzipped to 80KB. Build time: 6 seconds. Full CI/CD pipeline: under 4 minutes.

**Infrastructure Cost**

Total monthly cost to run in production: $0. Render free tier (hosting), Neon free tier (PostgreSQL), Groq free tier (14,400 AI requests/day), GitHub Actions free tier (2,000 minutes/month).
