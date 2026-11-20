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

## Setup

1. Install dependencies:
   `npm install`

2. Configure app-issued JWT authentication. Set `JWT_SECRET` in a local `.env` file (or your deployment's environment settings). Generate a unique secret with Node.js:
   `node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"`

   Add the generated value to `.env` as `JWT_SECRET=<generated-value>`. Keep `.env` out of source control and configure the same variable in the production host's secret/environment settings. The server requires at least 32 characters and exits at startup if `JWT_SECRET` is missing or too short; do not use a checked-in, hard-coded, or fallback secret. Tokens are signed with HS256, expire after one hour, and are stored in an HttpOnly, SameSite cookie. Each token ID is persisted in `auth_sessions`; logout revokes it server-side.

   API requests are checked by centralized authentication middleware before body parsing or route handlers. Login and customer/seller registration are guest-accessible; other API routes require an active session, with role and ownership checks applied by their handlers. Admin accounts are created by an authenticated admin. The frontend/static assets remain accessible so visitors can reach sign-in.

3. Run the app:
   `npm run dev`

4. Database model, ERD, keys, cardinalities, normalization, and referential actions are documented in [docs/database-design.md](docs/database-design.md). PostgreSQL DDL and routines are in `schema.sql`; startup applies the schema and seeds demo data if tables are empty.
