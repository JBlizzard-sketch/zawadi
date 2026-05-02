# 🇰🇪 Zawadi — Premium Kenyan Corporate Gifting Platform

> A curated B2B marketplace connecting Kenyan corporates with premium, genuinely Kenyan-made gifts — artisan coffee, honey, leather goods, ceramics, chocolate, and more — with branded packaging, personalised cards, and dedicated account management.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Zawadi** (Swahili for *gift*) is a production-grade B2B corporate gifting platform that specialises in premium Kenyan-made products. It serves procurement managers at banks, telcos, multinationals, NGOs, and law firms across Nairobi and beyond — giving them a curated, reliable, and Kenya-first alternative to the same imported mugs and pens that flood every office at year-end.

---

## The Problem

Every corporate in Nairobi spends money on end-of-year gifts, client appreciation hampers, staff onboarding kits, and event giveaways. The current reality:

- Procurement managers Google "corporate gifts Nairobi," call three suppliers in Industrial Area, and receive the same cheap imported stock
- No curated platform offers premium, genuinely Kenyan-made products at scale
- Kenyan artisans and small producers — coffee, honey, leather, ceramics, chocolate, Maasai-inspired jewellery, natural skincare — have no reliable B2B sales channel
- The gap has money on both sides: artisans need buyers, corporates need quality

---

## The Solution

A curated B2B marketplace with:

- **Gift collections** browsed by occasion, budget, and recipient profile
- **Instant quote configurator** — quantity, branded packaging, personalised message cards
- **Hamper builder** — mix products from multiple Kenyan producers into a single cohesive order
- **Gift personalisation engine** — each of 200 recipients gets a uniquely personalised message card, auto-generated
- **Producer stories** — shareable ESG/sustainability narrative around who made the gift
- **Annual gifting calendar** — proactive reminders for procurement managers
- **Account manager tier** — high-value orders get a dedicated human
- **White-label option** — large companies can run a branded internal gift shop for staff
- **Retail channel** — individual buyers at premium price points

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Clients                             │
│   Corporate Web App (Next.js)  │  Supplier Portal (Next.js)│
└───────────────┬────────────────┴──────────────┬────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────────────────────────────────────┐
│                     API Gateway / Reverse Proxy            │
│              (Express 5 — artifacts/api-server)            │
└───────────────────────────────┬───────────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
     ┌──────────┐        ┌────────────┐       ┌──────────────┐
     │ Products │        │  Orders    │       │  Suppliers   │
     │  Service │        │  Service   │       │   Service    │
     └──────────┘        └────────────┘       └──────────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │   PostgreSQL (Drizzle) │
                    └───────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Express 5, TypeScript, Node.js 24 |
| **Database** | PostgreSQL + Drizzle ORM |
| **Validation** | Zod v4, drizzle-zod |
| **API Contract** | OpenAPI 3.1 + Orval codegen |
| **Auth** | Clerk (corporate SSO + email/password) |
| **Image Assets** | Cloudinary |
| **Payments** | Stripe (cards) + M-Pesa integration |
| **Email** | Resend |
| **Monorepo** | pnpm workspaces |
| **Build** | esbuild (server), Vite (client) |
| **CI/CD** | GitHub Actions |
| **Hosting** | Vercel (frontend) + Railway (backend) |
| **Containers** | Docker-ready |

---

## Project Structure

```
zawadi/
├── artifacts/
│   ├── api-server/          # Express 5 backend — all API routes
│   │   ├── src/
│   │   │   ├── routes/      # Route handlers (products, orders, suppliers, …)
│   │   │   ├── middlewares/ # Auth, rate-limiting, logging
│   │   │   └── lib/         # Shared utilities
│   │   └── package.json
│   └── mockup-sandbox/      # Design prototyping (canvas / Vite)
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec (source of truth)
│   │   └── openapi.yaml
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   └── db/                  # Drizzle ORM schema + migrations
├── scripts/                 # Utility scripts (post-merge, db seed, …)
├── .github/
│   └── workflows/           # CI/CD pipelines
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL 16+

### Installation

```bash
# Clone the repository
git clone https://github.com/JBlizzard-sketch/zawadi.git
cd zawadi

# Install all workspace dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, CLERK_SECRET_KEY, CLOUDINARY_URL, etc.

# Push database schema
pnpm --filter @workspace/db run push

# Start the API server in dev mode
pnpm --filter @workspace/api-server run dev
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SESSION_SECRET` | Express session secret | ✅ |
| `GITHUB_TOKEN` | GitHub PAT for CI/CD | ✅ |
| `CLERK_SECRET_KEY` | Clerk auth backend key | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth frontend key | ✅ |
| `CLOUDINARY_URL` | Image asset storage | ✅ |
| `STRIPE_SECRET_KEY` | Payment processing | ✅ |
| `MPESA_CONSUMER_KEY` | M-Pesa Daraja API | ✅ |
| `MPESA_CONSUMER_SECRET` | M-Pesa Daraja API | ✅ |
| `RESEND_API_KEY` | Transactional email | ✅ |

---

## Development Workflow

```bash
# Full typecheck across all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Regenerate API hooks + Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Auto-push to GitHub (runs after every significant change)
bash scripts/git-push.sh "Your commit message"
```

---

## API Reference

The full API contract lives in [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).

Key resource groups:

| Resource | Base Path | Description |
|---|---|---|
| Health | `GET /api/healthz` | Service health check |
| Products | `/api/products` | Product catalogue |
| Collections | `/api/collections` | Curated gift sets |
| Hampers | `/api/hampers` | Custom hamper builder |
| Orders | `/api/orders` | Order lifecycle |
| Quotes | `/api/quotes` | Instant quote engine |
| Suppliers | `/api/suppliers` | Supplier onboarding + management |
| Corporates | `/api/corporates` | Corporate account management |
| Recipients | `/api/recipients` | Bulk recipient upload + personalisation |
| Invoices | `/api/invoices` | KRA-compliant invoicing |

---

## Database Schema

Core entities:

- **products** — catalogue items with origin, category, unit pricing, MOQ, lead times
- **suppliers** — vetted Kenyan artisans and producers
- **collections** — curated product bundles by occasion/theme
- **corporates** — corporate accounts (KRA PIN, payment terms, account manager)
- **orders** — full order lifecycle with status FSM
- **order_items** — line items linking orders ↔ products
- **recipients** — bulk import of gift recipients with personalisation fields
- **hampers** — custom hamper configurations
- **invoices** — NET30 invoicing with KRA compliance fields
- **quote_requests** — instant quote capture

---

## Deployment

### API Server (Railway)

```bash
# Build the Docker image
docker build -t zawadi-api ./artifacts/api-server

# The Railway deployment picks up the Dockerfile automatically
```

### Frontend (Vercel)

Connect the GitHub repo to Vercel. Set the root directory to `artifacts/web` and all env vars in the Vercel dashboard.

### GitHub Actions CI

On every push to `main`:
1. Install dependencies
2. Full typecheck
3. Build all packages
4. Run test suite
5. Deploy to Railway (API) + Vercel (frontend)

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Project scaffold, monorepo, API server, DB schema | 🔄 In Progress |
| 2 | Product catalogue — models, routes, admin UI | ⏳ Planned |
| 3 | Supplier onboarding portal | ⏳ Planned |
| 4 | Corporate account management + auth | ⏳ Planned |
| 5 | Instant quote configurator | ⏳ Planned |
| 6 | Hamper builder (multi-product, multi-supplier) | ⏳ Planned |
| 7 | Branded packaging configurator | ⏳ Planned |
| 8 | Gift personalisation engine (bulk recipient cards) | ⏳ Planned |
| 9 | Order management + status tracking | ⏳ Planned |
| 10 | KRA-compliant invoicing + NET30 terms | ⏳ Planned |
| 11 | Producer stories + ESG reporting | ⏳ Planned |
| 12 | Annual gifting calendar + reminders | ⏳ Planned |
| 13 | Account manager tier + CRM integration | ⏳ Planned |
| 14 | Payment gateway (Stripe + M-Pesa) | ⏳ Planned |
| 15 | White-label gift shop (multi-tenant) | ⏳ Planned |
| 16 | Retail-facing storefront | ⏳ Planned |
| 17 | Logistics + fulfilment tracking | ⏳ Planned |
| 18 | Analytics dashboard (corporates + admin) | ⏳ Planned |
| 19 | Mobile app (iOS + Android) | ⏳ Planned |
| 20 | AI-powered gifting recommendations | ⏳ Planned |

---

## Contributing

This is a private commercial project. Contributions are by invitation only.

---

## License

Proprietary — All rights reserved © 2026 Zawadi Ltd.
