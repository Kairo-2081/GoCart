# GoCart: Multi-Vendor E-Commerce Platform

GoCart is a full-stack marketplace where customers browse and buy, sellers list and manage their own products, and admins oversee the platform. A React single-page app talks to an Express API backed by PostgreSQL, with role-based access control and cookie-based JWT sessions.

## Features

**Customers**
- Browse products and categories, and see top-selling and trending products and top sellers.
- Keep a cart, place orders and follow their status: `placed`, `processing`, `shipped`, `delivered` or `cancelled`.
- Review products and edit their own profile.

**Sellers**
- Register a seller account and manage their own products: create, edit, change status and delete.
- Move orders through the fulfilment statuses.

**Admins**
- Manage categories and admin accounts.
- Set a seller's status to `pending`, `approved`, `rejected` or `suspended`. A database trigger rejects product writes from suspended or rejected sellers.
- View customers and platform statistics such as top customers and category performance, and reset the demo data.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, Motion, Lucide icons |
| Backend | Node.js, Express 4, `pg` |
| Database | PostgreSQL (the environment template targets Supabase, but any PostgreSQL works) |
| Auth | `jsonwebtoken` (HS256) in HttpOnly cookies, `bcryptjs` for password hashes |
| Tooling | `tsx`, `esbuild`, Node's built-in test runner |
| Hosting | Vercel configuration included (`vercel.json`) |

## Project structure

```text
.
├── server/              Express API
│   ├── index.ts         App entry: auth middleware, routers, Vite (dev) or static files (production)
│   ├── middleware/      JWT authentication and role checks
│   ├── routes/          One router per resource: auth, products, orders, cart, reviews, ...
│   └── db/              Database access, password handling, seeding
├── src/                 React app
│   ├── components/      admin, customer, seller, storefront and layout components
│   ├── contexts/        Auth and theme context
│   ├── hooks/           Cart and market-data hooks
│   ├── lib/api.ts       API client
│   └── db/, data/       Database layer and seed data
├── schema.sql           PostgreSQL schema, constraints, triggers and queries
├── docs/                Database design document (ERD, keys, normalization)
├── tests/               Node test-runner tests
└── vercel.json          Vercel build and routing configuration
```

## Getting started

### Prerequisites

- Node.js 20.6 or newer (the test script uses `node --import`).
- A PostgreSQL database that the server can reach, for example a Supabase project.

### Install and run

```bash
git clone https://github.com/Kairo-2081/GoCart.git
cd GoCart
npm install
cp .env.example .env     # then fill in the values described under Configuration
npm run dev
```

`npm run dev` starts one Express server that serves both the API and the React app (through Vite's middleware). Open http://localhost:3000, or the port you set in `PORT`.

2. Configure app-issued JWT authentication. Set `JWT_SECRET` in a local `.env` file (or your deployment's environment settings). Generate a unique secret with Node.js:
   `node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"`

   Add the generated value to `.env` as `JWT_SECRET=<generated-value>`. Keep `.env` out of source control and configure the same variable in the production host's secret/environment settings. The server requires at least 32 characters and exits at startup if `JWT_SECRET` is missing or too short; do not use a checked-in, hard-coded, or fallback secret. Tokens are signed with HS256, expire after one hour, and are stored in an HttpOnly, SameSite cookie. Each token ID is persisted in `auth_sessions`; logout revokes it server-side.

   API requests are checked by centralized authentication middleware before body parsing or route handlers. Login and customer/seller registration are guest-accessible; other API routes require an active session, with role and ownership checks applied by their handlers. Admin accounts are created by an authenticated admin. The frontend/static assets remain accessible so visitors can reach sign-in.

3. Run the app:
   `npm run dev`

4. Database model, ERD, keys, cardinalities, normalization, and referential actions are documented in [docs/database-design.md](docs/database-design.md). PostgreSQL DDL and routines are in `schema.sql`; startup applies the schema and seeds demo data if tables are empty.
