# MAX EV Admin

> Multi-module AI-powered business operating system — built, deployed, and operated by [Max EV Digital](https://maxevdigital.com)

**Live:** [admin.maxevdigital.com](https://admin.maxevdigital.com) &nbsp;|&nbsp; **Demo login:** `demo@maxevdigital.com` / `MaxEVDemo2026!`

---

## What It Is

A full-stack SaaS admin panel built to run a digital agency's complete operation — from client management and billing to AI-assisted outreach, voice TTS, real-time analytics, and a job application pipeline. Built in production, used daily.

This is not a template or tutorial project. It is a live system managing real clients, real revenue, and real workflows.

---

## Feature Modules

| Module | What It Does |
|---|---|
| **AI CEO Intel** | Streaming Anthropic Claude chat with full business context — asks questions, gets real answers about clients, pipeline, and revenue |
| **Client CRM** | Full client lifecycle — onboarding, projects, notes, activity log |
| **Lead Pipeline** | Kanban-style pipeline with hot leads, demo scheduling, and status tracking |
| **Proposals & Invoices** | PDF generation, e-sign via token links, Stripe payment integration |
| **Recurring Billing** | Monthly/quarterly/annual billing cycles with auto-send |
| **AI Outreach** | Email campaigns, drip sequences, scheduler — all AI-drafted |
| **SMS** | Twilio inbox and outbound messaging |
| **Newsletter Studio** | HTML email builder with subscriber list management |
| **Booking System** | Appointments, services, staff management, Google Calendar sync |
| **Helpdesk** | Ticket inbox with priority routing and macros |
| **Inventory & Ops** | Products, suppliers, purchase orders |
| **Finance Suite** | P&L tracking, expense log, revenue reports, package pricing |
| **Voice TTS** | ElevenLabs integration for AI-generated audio content |
| **Job Pipeline** | Internal applicant tracker with PDF resume storage and status board |
| **System Health** | Live monitoring dashboard for all integrated services |
| **Demo Center** | White-label demo mode for prospect walkthroughs |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Database | PostgreSQL (Docker) |
| ORM | Prisma 6 — 30+ relational models |
| AI | Anthropic Claude (`claude-sonnet-4-6`) — streaming, tool use |
| Voice | ElevenLabs TTS |
| Payments | Stripe (invoices, webhooks, recurring) |
| Queue | BullMQ + Redis |
| Email | Nodemailer — Hostinger SMTP, multi-account |
| SMS | Twilio |
| Styling | Tailwind CSS 4 |
| Auth | Custom session-based auth (bcrypt + HttpOnly cookies) |
| Deploy | VPS — PM2 process manager, Nginx reverse proxy |

---

## Architecture

```
maxev-admin/
├── src/
│   ├── app/
│   │   ├── (admin)/          # All protected admin pages (30+ routes)
│   │   ├── (auth)/           # Login, register, reset
│   │   ├── api/              # 25+ API route groups
│   │   │   ├── ai/           # Anthropic streaming chat
│   │   │   ├── clients/      # Client CRUD
│   │   │   ├── comms/        # Email, SMS, newsletter
│   │   │   ├── finance/      # Invoices, proposals, billing
│   │   │   ├── jobs/         # Job application pipeline
│   │   │   ├── outreach/     # Campaigns, sequences, scheduler
│   │   │   └── ...
│   ├── components/           # Sidebar, Topbar, AI panels, charts
│   └── lib/                  # Prisma client, auth helpers, email
├── prisma/
│   └── schema.prisma         # 30+ models — clients, leads, proposals,
│                             # invoices, tasks, tickets, sequences...
```

---

## Getting Started

```bash
# 1. Clone
git clone git@github.com:maxev-digital/maxev-admin.git
cd maxev-admin

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in your DATABASE_URL, ANTHROPIC_API_KEY, etc.

# 4. Set up database
npx prisma db push
npx prisma generate

# 5. Run
npm run dev
```

Requires: Node 20+, PostgreSQL, Redis

---

## Deployment

Runs on a Linux VPS via PM2 + Nginx.

```bash
npm run build
pm2 start npm --name maxev-admin-prod -- start -- --port 3005
```

---

## Built By

**Max EV Digital** — Forward-deployed AI systems, voice pipelines, and full-stack SaaS.

[maxevdigital.com](https://maxevdigital.com) · [info@max-ev-holdings.com](mailto:info@max-ev-holdings.com)
