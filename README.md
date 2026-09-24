# Northwharf

Internal supply-chain operations platform for enquiry → supplier RFQ → customer quote → PO → supplier purchase, with historical price intelligence.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL 16 (Docker Compose)
- Prisma ORM
- NextAuth (credentials, role-based)
- PDFKit for branded RFQ / quote / purchase PDFs

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres)

> **Note:** This project maps Postgres to host port **5433** to avoid clashing with a local Postgres already on 5432.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env (already set for local Docker defaults)
cp .env.example .env

# 3. Start database
npm run db:up
# or: docker compose up -d

# 4. Migrate + seed
npx prisma migrate dev
npm run db:seed

# 5. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Staff accounts are created by the seed script. Ask your admin for login details — credentials are not published in this README.

Seed data includes part **1234** previously quoted at **$10**, plus a sample enquiry with supplier quotes ready for customer quote building.

## Workflow

1. **Enquiry** — capture customer request and line items  
2. **RFQ** — send to one or more suppliers (recorded in-app; download PDF)  
3. **Supplier quotes** — log inbound unit costs (written to price history)  
4. **Customer quote** — pick best costs, apply margin; under-quote warning if sell ≤ prior sell  
5. **Approval / PO** — mark quote approved; record customer PO  
6. **Supplier purchase** — issue purchase to supplier; mark enquiry completed  

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js |
| `npm run build` | Production build |
| `npm run db:up` | Start Postgres container |
| `npm run db:down` | Stop Postgres container |
| `npm run db:seed` | Reseed demo data |
| `npm run db:reset` | Reset DB + re-migrate + seed |

## Document numbering

Documents use NW prefixes, e.g. `NW-ENQ-2026-0001`, `NW-RFQ-…`, `NW-QT-…`, `NW-CPO-…`, `NW-PO-…`.

## Price intelligence

Every customer quote sell price and supplier cost is appended to **Price History**. When building a new quote, lines show last/best sell price. Quoting at or below the previous sell price requires an explicit reason.

## Editing & Excel export

- **Edit in-app:** customers, suppliers, catalog parts, enquiry details/status/lines, draft/sent quote sell prices, customer PO refs, supplier purchase status.
- **Export Excel:** every major list (and individual enquiries) has an **Export Excel** button that downloads a `.xlsx` workbook (multi-sheet where useful: headers + lines).
- Export API: `/api/export/{customers|suppliers|catalog|enquiries|enquiry|quotes|orders|price-history}`
