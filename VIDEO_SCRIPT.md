# ONE Platform — Video Demo Script
## FRICTION Hackathon | Noverse Inc.

**Recommended video length:** 3–5 minutes
**Setup before recording:** Open 3 browser tabs — /demo, /officer, /admin

---

## OPENING (0:00 – 0:30)

Show a split view or just talk to camera:

> "In Bangladesh, if you need to deposit money AND open a Fixed Deposit,
> you visit 4 counters, fill 3 forms, and sometimes come back tomorrow.
> If you need to fix your NID AND renew your trade license?
> Different building. Different day.
> This is not inefficiency. This is institutional violence
> against ordinary people's time.
> We built ONE to end this."

---

## SCENE 1 — The Citizen (0:30 – 1:30)

**Go to:** `/intake`

Narrate while you type:

> "A citizen walks up to the kiosk. They type their National ID.
> The system recognises them instantly."

Type NID: `1234567890` — show the name appearing with green checkmark.

> "Now they describe what they need — in their own words, their own language."

In the text box, type this Banglish input:
```
ami nid te nam bhul ache thik korte chai ar 50 hajar taka fd korte chai 3 bochor
```

> "Two things. NID name correction. And a 50,000 taka Fixed Deposit for 3 years.
> In one sentence. In Banglish. No forms. No counters. Just a description."

Click **Get My Token**.

While the AI processes (1-2 seconds):
> "The AI reads the sentence. It detects two services.
> It extracts the amount — 50,000. The tenure — 36 months.
> It pre-fills every form field. It generates the document checklist.
> It writes a briefing for the officer."

When the token appears — **show the screen clearly:**

> "One token. M-001. Mixed sector — banking and government.
> The document checklist tells the citizen exactly what to bring.
> The QR code is for verification at the counter."

Point out:
- Token number (huge, readable)
- Services detected as pills
- Document checklist with green/amber indicators
- Estimated wait time

---

## SCENE 2 — The Status Tracker (1:30 – 2:00)

**Go to:** `/status` — open it on your phone or a second window

> "The citizen sits down. Opens this on their phone.
> Types their token number. Real-time position in the queue.
> Refreshes every 5 seconds automatically.
> They can go get tea. They don't have to stare at a board."

Show the queue position number.

---

## SCENE 3 — The Officer's Screen (2:00 – 3:00)

**Switch to:** `/officer`

> "At the counter, the officer sees this."

Point at the left panel:
> "Every ticket in the queue. One-line AI summary per citizen.
> Sector colour-coded. Urgent tickets flagged automatically."

Click the M-001 ticket:
> "The officer clicks the ticket. Everything is here."

Walk through each section:

**Citizen profile row:**
> "Name, NID, phone, address, date of birth. Date of birth pulls from the record —
> officer doesn't ask, doesn't type."

**Services pills:**
> "Two services. NID Correction and Fixed Deposit Opening.
> The AI figured this out from a single Banglish sentence."

**Click Officer Briefing tab:**
> "The AI writes a plain-language briefing. It tells the officer
> to process the NID correction first, because the corrected NID
> will be needed for the bank records."

**Click Pre-filled Forms tab:**
> "Every field is pre-filled. Name, NID, phone, address, amount, tenure.
> The officer verifies — doesn't re-type. This alone saves 8–12 minutes per visit."

**Click Documents tab:**
> "Green checkmark means the citizen likely already has this.
> Amber question mark means they need to bring it.
> No surprises at the desk."

Click **Mark Serving**:
> "The citizen's phone updates immediately. They walk to the counter."

Click **Mark Done**:
> "Service complete. Total visit — under 30 minutes. Two services. One token."

---

## SCENE 4 — The Admin View (3:00 – 3:30)

**Switch to:** `/admin` — login: admin / demo2024

> "The branch manager sees today's numbers.
> Tickets processed. Average service time. Sector breakdown.
> And the feedback ratings — citizens rate their experience
> after every completed visit."

Point at the service management section:
> "Services can be toggled on or off per branch.
> A government holiday? Turn off passport services for the day."

---

## CLOSING (3:30 – 4:00)

Back to camera or title card:

> "ONE works on a tablet kiosk, a mobile browser, or a desktop.
> It speaks Bengali, English, and Banglish.
> Voice input for those who can't type.
> Text-to-speech for those who can't read.
> 84 services. 10 sectors. One token.
> The AI doesn't replace the officer.
> It makes the officer ten times more effective.
> Every minute saved at a government counter
> is time given back to a person who took a day off work,
> arranged childcare, and travelled across the city.
> We call it friction.
> We should call it what it is."

Show the ONE logo / URL.

---

## TIPS FOR RECORDING

- Use **Chrome** — voice input only works in Chrome/Edge
- Record at 1080p minimum
- Zoom in on the token card — it should be clearly readable
- Show the terminal logs briefly — judges like seeing `[AI] ✅ groq → [nid_correction, fd_open]`
- If the AI takes a second — narrate during it, don't sit in silence
- Record `/demo` page as a backup — it auto-runs everything without typing

---

## DEMO MODE (fastest option)

If you want a fully automated demo without typing anything:

Go to `/demo` → click **▶ Run Scenario** on any of the three buttons.

Each scenario auto-submits, calls the real AI, and shows the full output live.
This is what you show judges if you're short on time.

Three scenarios:
1. **Banking in Banglish** — Fatema Begum, FD + deposit (Bengali input)
2. **Government in English** — Mohammad Karim, passport renewal (urgency detected)
3. **Mixed sector** — Rina Akter, account + trade license (sector = mixed, M- token)
