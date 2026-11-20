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

## Configuration

Copy `.env.example` to `.env` and fill it in. Keep `.env` out of source control, and set the same variables in your host's environment or secret settings for production.

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Required. At least 32 characters. The server exits at startup if it is missing or too short. |
| `SUPABASE_DB_URL`, or `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_NAME` | PostgreSQL connection settings. The server also reads `DATABASE_URL`. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase project settings. |
| `GOCART_ADMIN_EMAIL`, `GOCART_ADMIN_PASSWORD` | Create the first admin on startup. If the password is missing or shorter than 12 characters, no admin is created. |
| `PORT` | HTTP port. Defaults to `3000`. |

Generate a unique `JWT_SECRET` with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

Do not use a checked-in, hard-coded or fallback secret.

## First run

On startup the server applies `schema.sql` and seeds demo data if the tables are empty. The seed data contains no passwords (a test enforces this), so there is no default login.

- To get an admin, set `GOCART_ADMIN_EMAIL` and `GOCART_ADMIN_PASSWORD` (12 or more characters) before the first start. Further admins are created by a signed-in admin.
- Customers and sellers can register themselves.

## Authentication

- Sessions use JWTs signed with HS256. They expire after one hour and travel in an HttpOnly, `SameSite=Strict` cookie.
- Each token ID is stored in the `auth_sessions` table, so logging out revokes the token on the server.
- Centralized middleware checks every API request before body parsing or route handlers run. Login (`POST /api/auth/login`) and customer and seller registration are the only guest endpoints; every other API request needs a valid session.
- Handlers then apply role and ownership checks. Admin accounts can only be created by a signed-in admin.
- The frontend and static assets stay public so visitors can reach the sign-in screen.

3. Run the app:
   `npm run dev`

4. Database model, ERD, keys, cardinalities, normalization, and referential actions are documented in [docs/database-design.md](docs/database-design.md). PostgreSQL DDL and routines are in `schema.sql`; startup applies the schema and seeds demo data if tables are empty.
