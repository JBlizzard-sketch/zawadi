# Zawadi — Corporate Gifting Platform

## Overview

Full-stack B2B corporate gifting platform for premium Kenyan-made products. Built as a pnpm monorepo with a React/Vite frontend, Express API backend, and PostgreSQL database.

**Theme**: Kenyan earth-tones — terracotta, espresso, warm ivory, sage green. Fonts: Playfair Display (serif) + Inter.

**GitHub**: `JBlizzard-sketch/zawadi` (public) — push via `node scripts/github-push.mjs "message"`

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| UI Components | Shadcn/ui (Radix) |
| API Client | Orval-generated React Query hooks |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| Charts | Recharts |
| Routing | Wouter |
| Build | esbuild |
| Node.js | 24 |

---

## Architecture

```
artifacts/
  web/            → React + Vite frontend (port via $PORT)
  api-server/     → Express REST API (port 8080, path /api)
  mockup-sandbox/ → Component preview server (Canvas)
lib/
  db/             → Drizzle schema + migrations
  api-spec/       → OpenAPI spec + Orval codegen
  api-client-react/ → Generated React Query hooks + Zod schemas
scripts/
  github-push.mjs → GitHub push helper (rate-limited: ~100 blob calls/hour)
```

---

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

---

## API Field Name Rules

- **Drizzle ORM** returns camelCase for all table columns (e.g. `unitPrice`, `leadTimeDays`, `createdAt`)
- **Exception — dashboard stats** (`/api/dashboard/stats`, `/api/dashboard/corporate/:id`): explicitly returns snake_case (`total_orders`, `revenue_by_month`) — intentional
- **Exception — quote items JSONB** (`items` array on quotes): stored as snake_case (`product_name`, `unit_price`, `line_total`) — intentional
- **VAT rate**: 16% (Kenya KRA standard)
- **Order references**: `ZWD-{year}-{4digit}` (e.g. `ZWD-2026-1001`)

---

## Pages (18 routes)

| Route | Page | Features |
|---|---|---|
| `/` | Dashboard | Revenue chart, orders by status, top products, recent orders |
| `/catalogue` | Catalogue | Product grid, search, category + occasion filters |
| `/catalogue/:id` | ProductDetail | Bulk pricing tiers with savings %, occasion tags, CTAs, producer story |
| `/collections` | Collections | Curated collection cards |
| `/collections/:id` | CollectionDetail | Products in collection |
| `/hamper-builder` | HamperBuilder | Add products, set recipients, "Request Quote" modal |
| `/quotes` | Quotes | List with status filter, "New Quote" modal |
| `/quotes/:id` | QuoteDetail | Line items, Mark Sent / Reject / Convert to Order |
| `/orders` | Orders | List with status filter |
| `/orders/:id` | OrderDetail | Status timeline (7 steps), advance status, Generate Invoice, Cancel |
| `/orders/:id/recipients` | Recipients | Recipient management |
| `/suppliers` | Suppliers | Supplier grid |
| `/suppliers/:id` | SupplierDetail | Producer story (ESG), contact, products from supplier |
| `/corporates` | Corporates | Client list |
| `/corporates/:id` | CorporateDetail | Spend chart, recent orders, KRA PIN |
| `/invoices` | Invoices | List with status + corporate filters |
| `/invoices/:id` | InvoiceDetail | KRA VAT breakdown, Mark Sent, Record Payment, Print/PDF |

---

## Seeded Data

- 7 products (5 suppliers, various categories)
- 5 curated collections (Executive, Staff, Welcome Kit, Festive, Conference)
- 5 corporate clients (Safaricom, Equity Bank, Deloitte, DLA Piper, USAID)
- 8 orders (various statuses, ZWD-2026-1001 through ZWD-2026-1008)
- 3 quotes (1 accepted, 1 sent, 1 draft)
- 5 invoices (3 paid, 1 sent, 1 draft)
- Current month (May 2026): ZWD-2026-1007, ZWD-2026-1008

---

## API Routes

### Products
- `GET /api/products` — list (params: search, category_id, supplier_id, occasion, limit, offset)
- `GET /api/products/:id` — detail with category + supplier embedded
- `GET /api/categories` — all categories

### Quotes
- `GET /api/quotes` — list (param: status)
- `GET /api/quotes/:id` — detail with items array
- `POST /api/quotes` — create (body: corporate_id, items[], notes)
- `PUT /api/quotes/:id` — update status/notes
- `POST /api/quotes/:id/convert` — convert to order

### Orders
- `GET /api/orders` — paginated list (params: corporate_id, status, limit, offset)
- `GET /api/orders/:id` — detail with items + recipients
- `POST /api/orders` — create
- `PUT /api/orders/:id` — update (status, delivery fields, etc.)
- `POST /api/orders/:id/cancel` — cancel order

### Invoices
- `GET /api/invoices` — list (params: corporate_id, status)
- `GET /api/invoices/:id` — detail
- `POST /api/invoices` — generate from order (body: order_id, due_date)
- `PUT /api/invoices/:id` — update status (sets paidAt when status=paid)

### Dashboard
- `GET /api/dashboard/stats` — KPIs, revenue by month, orders by status
- `GET /api/dashboard/corporate/:id` — per-client spend chart + recent orders
- `GET /api/dashboard/recent-orders` — latest orders list
- `GET /api/dashboard/top-products` — products ranked by units sold

### Other
- `GET /api/suppliers`, `GET /api/suppliers/:id`
- `GET /api/corporates`, `GET /api/corporates/:id`
- `GET /api/collections`, `GET /api/collections/:id`
- `GET /api/recipients?order_id=...`, `POST /api/recipients`, `DELETE /api/recipients/:id`
