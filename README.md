# I aint doin allat

A web-based automation toolkit for teaching assistants. Built because TAing BIO 101 — a massive introductory biology course — meant manually emailing hundreds of students their assignment marks, allocating exam seats across multiple auditoriums, and repeating the whole thing every single assessment. That was not happening.

Live at: https://autota.vercel.app

---

## What it does

### Marks Email Tool

Upload a student spreadsheet (Excel or CSV), write a template with `{{variable}}` placeholders mapped to your column names, and send personalized grade emails to every student via your own SMTP server. Supports Gmail App Passwords, Outlook, Yahoo, and any custom SMTP configuration.

- Drag-and-drop or paste CSV data
- Dynamic `{{variable}}` interpolation against any column in the file
- Duplicate tracking via localStorage — resuming after a network drop will not re-send to already-contacted students
- Test email modal to verify your SMTP setup before a bulk send
- SMTP credentials encrypted with AES-256-GCM (Web Crypto API, PBKDF2 key derivation) before being written to localStorage
- Template download to get started quickly with the expected file format

### Exam Seat Allocation

Upload a student list, configure any number of auditoriums with their seat counts, and the tool randomly allocates students using a Fisher-Yates shuffle. Downloads a multi-sheet Excel file with one sheet per auditorium and a master sheet.

- Validates that total seats meet or exceed student count before running
- Re-shuffle without re-uploading
- Preview table before downloading
- Output is directly usable for invigilators

---

## Stack

- Next.js 16 (App Router)
- React 19, TypeScript 5
- Tailwind CSS
- nodemailer (server-side, Vercel serverless functions)
- SheetJS loaded via CDN at runtime (avoids SSR localStorage crash)
- Web Crypto API for credential encryption

---

## Running locally

```bash
npm install
npm run build
npm start
```

Note: `npm run dev` will show localStorage errors in the terminal due to a Next.js 16 jsdom limitation in dev mode. The app works correctly in production mode (`npm run build && npm start`) and on Vercel.

---

## Deployment

The project deploys to Vercel with zero configuration. It auto-detects Next.js and uses the build and start commands from `package.json`.

```bash
vercel --prod
```

---

## Security model

This is a frontend-first tool that uses your own SMTP credentials. No credentials are ever sent to or stored on any server. The flow is:

1. Credentials are entered in the browser
2. They are encrypted with AES-256-GCM (256-bit key, PBKDF2 with 100,000 iterations) before being written to localStorage
3. When sending, credentials are decrypted in-browser and passed to the `/api/send-email` serverless function over HTTPS in the same request
4. The serverless function uses nodemailer to send the email and immediately discards the credentials

The encryption does not protect against XSS attacks on the page itself — no client-side encryption can. However, since this is a personal tool deployed for known users, the threat surface is limited. For a multi-tenant production service, credentials would be stored server-side in environment variables.

---

## Future upgrade paths

The following features are planned or considered as the tool grows beyond BIO 101.

### AI-assisted feedback generation

Rather than writing a static email body, a TA could provide a rubric and the tool would call an LLM (OpenAI, Google Gemini, or a self-hosted model) to generate personalised feedback per student based on their marks and submission notes. The email tool already supports dynamic templates — this would add an AI-generation step before the send loop.

### Assignment marking assistance

Upload a set of student submissions (PDF or text) alongside a rubric, and use an LLM to produce a draft mark and feedback for each. The TA reviews and adjusts before anything is sent. Intended as a draft aid, not autonomous grading.

### Attendance tracking

Upload a class list and mark attendance via a simple checklist or by uploading a sign-in sheet scan. Generate summary reports for the instructor. Natural follow-on to the email tool since absentee notifications are a common TA task.

### Quiz and short-answer grading

Upload student responses and a model answer, use semantic similarity or a prompted LLM to score each response, and flag borderline cases for manual review.

### Gradebook aggregation

Collect marks across multiple assignments, compute weighted totals, flag students below a threshold, and generate a final summary sheet. Removes the need to touch Excel formulas manually.

### Email scheduling

Currently emails are sent immediately. Adding a scheduled send (e.g. release results at a specific time) would be useful for coordinated release of marks.

### Role-based access

For larger TA teams, a lightweight login so multiple TAs can use the tool and see a shared sent log without sharing SMTP credentials.

---

## License

MIT. Use it, fork it, improve it.

---

Made by Omer Haydar
