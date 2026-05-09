# Cloth POS Monorepo

A production-ready Point of Sale (POS) system for a clothing outlet store.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express + better-sqlite3
- Database: SQLite (auto-created, no manual setup)
- Charts: Recharts
- UI utilities: lucide-react, framer-motion, react-hot-toast

## Monorepo Structure

```
cloth-pos/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express + SQLite backend
├── package.json     # Root scripts (concurrently)
└── README.md
```

## Quick Start

Prerequisite: Node.js 18+

Run everything locally with one command:

```bash
npm install && npm run dev
```

This starts:

- Backend API at http://localhost:4000
- Frontend app at http://localhost:5173

## Root Scripts

- `npm run dev` -> runs both server and client with concurrently
- `npm run server` -> starts Express server (`cd server && node index.js`)
- `npm run client` -> starts Vite dev server (`cd client && npm run dev`)
- `npm run build` -> builds the client bundle

## Seeded Data

On first run, SQLite is created at `server/cloth-pos.db` and seeded with:

- 6 categories: Shirts, Pants, Dresses, Jackets, Accessories, Footwear
- 8 colors with HEX codes: Black, White, Navy, Red, Emerald, Beige, Burgundy, Slate
- 24 realistic clothing products
- 8 color variants per seeded product with stock quantities
- 5 sample customers

## Frontend Views

- `/` POS checkout page
  - Product grid with search, category tabs, color filters
  - Live cart with quantity controls
  - Customer selector + quick add
  - Discount and tax controls
  - Complete sale + printable receipt modal
- `/dashboard`
  - KPI cards
  - 7-day sales bar chart
  - Revenue-by-category donut chart
  - Low stock table
  - Recent transactions
- `/inventory`
  - Product table with filters
  - Inline stock/price updates
  - Color variant dots
  - Add product modal
- `/sales`
  - Paginated sales table
  - Expandable line-item details
  - Date range filters
  - CSV export
- `/customers`
  - Customer list with purchase summary
  - Add customer form

## API Reference

Base URL: `http://localhost:4000/api`

Health:

- `GET /health`

Categories (CRUD):

- `GET /categories`
- `GET /categories/:id`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`

Colors (CRUD):

- `GET /colors`
- `GET /colors/:id`
- `POST /colors`
- `PUT /colors/:id`
- `DELETE /colors/:id`

Products (CRUD + filters):

- `GET /products?category=<id|name>&color=<id|name>&search=<text>`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id` (price/stock or full update)
- `DELETE /products/:id`

Customers (CRUD + summaries):

- `GET /customers`
- `GET /customers/:id`
- `POST /customers`
- `PUT /customers/:id`
- `DELETE /customers/:id`

Sales (CRUD):

- `POST /sales` (creates sale and auto-deducts stock)
- `GET /sales?page=1&pageSize=20&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /sales/:id`
- `PUT /sales/:id`
- `DELETE /sales/:id` (restocks linked items)

Sale Items (CRUD):

- `GET /sale-items`
- `GET /sale-items/:id`
- `POST /sale-items`
- `PUT /sale-items/:id`
- `DELETE /sale-items/:id`
- Legacy alias supported: `/sale_items`

Dashboard:

- `GET /dashboard`
  - today/weekly/monthly revenue
  - total transactions
  - sales last 7 days
  - revenue by category
  - top products
  - low stock alerts
  - recent transactions

## Notes

- Stock deduction is transactional to avoid partial sale writes.
- All client features use real API calls via axios.
- Toasts are shown for success and error states.
- UI is fully responsive for desktop and tablet checkout use.
