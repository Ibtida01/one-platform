# ONE — Hackathon Demo Script
## FRICTION Hackathon · Noverse Inc.

**Total demo time: ~8 minutes**  
**Theme position: Bureaucratic friction is not inefficiency — it is institutional violence against ordinary people's time.**

---

## Setup (before judges arrive)

1. `npm run dev` running, browser open on `/demo`
2. Have `/officer` open in a second tab
3. Have `/admin` logged in (admin / demo2024) in a third tab
4. Internet connection active (Claude API calls are live)

---

## Opening Statement (30 seconds)

> "In Bangladesh, if you want to deposit money AND open a Fixed Deposit, you visit 4 different counters, fill 3 different forms, and often come back the next day. The same problem exists across every government office in the developing world — passport corrections, trade licenses, birth certificates. This is not bureaucratic inefficiency. This is institutional violence against ordinary people's time. ONE fixes this. One visit. One token. Everything resolved."

---

## Scenario 1 — Banking in Bengali (2 minutes)

**Navigate to `/demo` → Click "▶ Run Scenario" on Scenario 1**

**Talking points while AI processes:**
> "Fatema Begum, NID 1234567890, walks up to the kiosk. She speaks in Bengali — she wants to deposit money AND open a 3-year Fixed Deposit. She doesn't need to know which counter handles what. She just tells the system what she needs."

**When result appears, point out:**
- Token `B-0XX` generated immediately
- Two services detected: `cash_deposit` + `fd_open`
- Form fields pre-filled with her name, NID, phone, address
- FD tenure (3 years) extracted from Bengali text
- Document checklist shows what she likely already has
- Officer briefing written in plain English for the desk officer
- QR code for verification

**Switch to `/officer` tab:**
> "Meanwhile at the officer's desk, this ticket appears in the queue instantly. The officer sees the one-line summary, clicks the ticket, and has everything they need — no form-hunting, no 'come back tomorrow'."

---

## Scenario 2 — Government / Passport (2 minutes)

**Navigate back to `/demo` → Click "▶ Run Scenario" on Scenario 2**

**Talking points:**
> "Mohammad Karim's passport expired last month. He types this in English. Watch how the AI not only detects passport_renewal, but flags the urgency in the officer briefing."

**When result appears, highlight:**
- `passport_renewal` correctly detected
- Officer briefing mentions expired passport and urgency
- Document checklist includes existing passport, NID, photos, payment receipt
- Token `G-0XX` — Government sector
- Confidence score shown

---

## Scenario 3 — Mixed Sector (2 minutes)

**Navigate to `/demo` → Click "▶ Run Scenario" on Scenario 3**

**Talking points:**
> "This is where ONE really shines. Rina Akter needs to open a bank account AND renew her trade license. In the old world: two buildings, possibly two different days. Here, she says it once."

**When result appears, highlight:**
- `sector: mixed` — system handles cross-department automatically
- Token starts with `M-` (Mixed sector)
- Two service groups shown: one banking form, one government form
- Both document checklists merged into one view
- Officer briefing describes the order of processing

---

## Officer Dashboard Walkthrough (1 minute)

**Navigate to `/officer`**

> "The officer's screen shows all three tickets we just created. Each ticket has a one-line AI summary in the queue. Clicking a ticket gives you: the citizen's full profile, the services as clickable pills, pre-filled forms so you can skip re-entering data, and the document checklist. The officer marks it Serving, then Done. That's it."

**Demonstrate:**
- Click a ticket
- Show the three tabs: Briefing / Forms / Docs
- Click "Mark Serving" → status changes
- Point out the queue auto-refreshes every 3 seconds

---

## Admin Panel (30 seconds)

**Navigate to `/admin` (already logged in)**

> "Admin sees today's stats — total tickets, completion rate, average service time, most common services. Services can be toggled on/off for this specific branch."

---

## Closing (30 seconds)

> "ONE works on a tablet kiosk, a mobile browser, or a desktop. It handles Bengali and English — voice or text. It runs entirely on standard infrastructure. The AI does not replace the officer. It makes the officer 10x more effective. Every second saved at a government counter is time given back to a citizen who had to take a day off work, arrange childcare, and travel across the city. We call it friction. We should call it what it is."

---

## Technical Questions (prep answers)

**Q: What if the AI gets it wrong?**  
A: The system has a `needs_manual_review` flag. If AI fails or returns malformed JSON, the ticket is still created with the raw citizen input preserved. The officer sees an amber "Review" badge and handles it manually. The intake flow never breaks.

**Q: What if Claude API is down?**  
A: Graceful fallback — citizen still gets a token, officer still sees the ticket. AI features degrade, core flow continues.

**Q: How does it handle code-switching (Bengali + English mixed)?**  
A: Claude `claude-sonnet-4-20250514` handles mixed-language input natively. We pass `bn-BD` and `en-US` as voice recognition targets and let the AI normalize the output.

**Q: Database?**  
A: PostgreSQL. Schema is minimal and auditable — every ticket keeps the raw citizen input and the full AI JSON output for dispute resolution.

**Q: Could this work in other countries?**  
A: Yes. The service list is configurable. The AI system prompt is language-agnostic. Switching to Hindi, Tamil, Swahili, or any other language is a configuration change.

---

## Key Metrics to Mention

- **34 services** across banking and government sectors
- **Sub-3 second** AI response time (Claude Sonnet)
- **2 languages** supported out of the box (Bengali + English)
- **0 counter visits** for form pre-filling — officer has everything on screen
- **3-second** queue auto-refresh on officer dashboard
- **1 token** per visit regardless of how many services needed
