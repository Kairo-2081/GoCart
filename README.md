<div align="center">

<img src="./.github/assets/readme/gocart-logo.svg" alt="GoCart" width="88" />

# GoCart

**Shop. Sell. Govern.**

A multi-vendor e-commerce marketplace where customers buy, sellers run their
own stores, and admins keep the platform honest, all on one PostgreSQL schema.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-raw%20SQL-4169e1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Node%20test%20runner-brightgreen)

[Product tour](#product-tour) ·
[Database design](./docs/database-design.md) ·
[API overview](#api-overview) ·
[Get started](#get-started)

<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/gocart-home.jpg" />
<img src="./.github/assets/readme/gocart-home-light.jpg" alt="GoCart landing page with three portals: customer, merchant and admin" width="900" />
</picture>

</div>

<div align="center">

[Product tour](#product-tour) · [How an order moves](#how-an-order-moves) ·
[Seller approval](#seller-approval) · [Data model](#data-model) ·
[Architecture](#architecture) · [Security](#security) ·
[Quality](#quality) · [Get started](#get-started) ·
[Status](#project-status-and-next-steps)

</div>

GoCart brings a storefront, merchant tools and a governance console into one
app. Customers browse products from many sellers and check out in one order;
sellers manage their own catalogue and move orders along; admins approve
merchants, curate categories and watch the marketplace. The rules that matter
(stock, seller status, checkout) live in PostgreSQL itself, so the API cannot
step around them.

## At a glance

| | |
| --- | --- |
| **Three roles, one data set** | Customers, sellers and admins each get a workspace on the same tables. |
| **Where it runs** | A React 19 single-page app and an Express 4 API served from one Node process, in dark and light themes. |
| **Rules in the database** | 13 tables, 58 SQL functions, 8 triggers and 1 stored procedure keep stock, seller status and order history consistent. |
| **Trust built in** | Merchants are approved by an admin before they can list; suspended or rejected sellers are blocked by a database trigger. |
| **Safe checkout** | One transaction locks the cart and the products, checks stock, creates the order, takes the stock and empties the cart. |
| **Sessions you can revoke** | HttpOnly `SameSite=Strict` JWT cookies, with every token ID stored so logging out invalidates it on the server. |
| **Verified** | `npm run lint` type-checks the project, `npm run build` bundles it, and `npm test` runs the admin-seeding tests. |

## Who does what

| Role | Gets | Needs approval? |
| --- | --- | --- |
| **Customer** | Catalogue with search, category filters, price slider and stock filter; trending, top-rated and top-seller panels; cart; checkout; order history with tracking IDs; product reviews; profile and address | No, anyone can register |
| **Seller** | Product listings (create, edit, change status, delete); incoming orders with a status selector; store totals for products, revenue and orders; customer reviews of their products | Yes, an admin must approve the store |
| **Admin** | Governance dashboard with market value, order throughput and review sentiment; seller approvals and suspensions; category registry; product moderation; admin accounts | Not self-service: only a signed-in admin can create another admin |

## Try it

| Role | What you can try |
| --- | --- |
| Customer | Register from the landing page, then browse, add to cart and check out. |
| Seller | Register as a merchant. The store stays `pending` until an admin approves it. |
| Admin | Set `GOCART_ADMIN_EMAIL` and `GOCART_ADMIN_PASSWORD` (12 or more characters) before the first start to create the first admin. |

The demo seed ships four categories, four sellers (one pending), six products
and a few orders, and **no passwords**, so there is no default login. Run it
yourself with the steps in [Get started](#get-started).

## Product tour

The images below are real captures of the running app. They were taken from a
local build against a throwaway PostgreSQL-compatible database, using sample
data written for the purpose: names and prices are invented, and product,
seller and logo pictures are generated placeholders, because the machine that
took the captures had no internet to load the photos the app normally links to.
Nothing comes from a production account.

<div align="center">

<table>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/gocart-sign-in.jpg" />
<img src="./.github/assets/readme/gocart-sign-in-light.jpg" alt="Sign-in dialog asking for a username or email and a password" width="100%" />
</picture>
<p><b>Sign in.</b> One dialog for every role, with the role decided by the account.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/gocart-sign-up.jpg" />
<img src="./.github/assets/readme/gocart-sign-up-light.jpg" alt="Account creation form for a customer with name, email, password, phone and address fields" width="100%" />
</picture>
<p><b>Create an account.</b> Customers and merchants register themselves; admins cannot.</p>
</td>
</tr>
</table>

<p>
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/gocart-mobile-landing.jpg" />
<img src="./.github/assets/readme/gocart-mobile-landing-light.jpg" alt="GoCart landing page in a phone-sized viewport" width="250" />
</picture>
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/gocart-mobile-storefront.jpg" />
<img src="./.github/assets/readme/gocart-mobile-storefront-light.jpg" alt="GoCart storefront on a phone with category chips, filters and a product card" width="250" />
</picture>
</p>
<p><b>On a phone.</b> The same app at a 390-pixel viewport: the portals stack, and the catalogue becomes a single column.</p>

</div>
