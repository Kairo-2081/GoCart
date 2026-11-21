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

### Inside each workspace

#### Customer

<table>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-customer-storefront.jpg" />
<img src="./.github/assets/readme/app-customer-storefront-light.jpg" alt="Storefront catalogue with category chips, sorting, a price slider and product cards" width="100%" />
</picture>
<p><b>Shop the catalogue.</b> Products from several sellers in one grid, with category chips, sorting, a price cap and a stock filter.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-customer-product.jpg" />
<img src="./.github/assets/readme/app-customer-product-light.jpg" alt="Product detail with price, inventory, seller card, quantity picker and an Add to Cart button" width="100%" />
</picture>
<p><b>Review the details.</b> Price, stock left, the merchant and their address, and a quantity picker before adding to the cart.</p>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-customer-cart.jpg" />
<img src="./.github/assets/readme/app-customer-cart-light.jpg" alt="Cart drawer listing the item, subtotal, shipping fee and a free-shipping hint" width="100%" />
</picture>
<p><b>Check the cart.</b> Subtotal, shipping and a hint on how much more earns free shipping (orders over 150).</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-customer-checkout.jpg" />
<img src="./.github/assets/readme/app-customer-checkout-light.jpg" alt="Checkout dialog with the shipping address, delivery notes and an order summary" width="100%" />
</picture>
<p><b>Check out.</b> Confirm the address, add delivery notes and place the order in one step.</p>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-customer-orders.jpg" />
<img src="./.github/assets/readme/app-customer-orders-light.jpg" alt="Order history with tracking number, a Processing badge, items and the delivery address" width="100%" />
</picture>
<p><b>Follow the order.</b> Each order has a tracking ID, a status badge, its items and the delivery address.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-customer-profile.jpg" />
<img src="./.github/assets/readme/app-customer-profile-light.jpg" alt="Customer profile form with contact details and the default address" width="100%" />
</picture>
<p><b>Keep a profile.</b> Contact details and a default address, saved back to the customer record.</p>
</td>
</tr>
</table>

#### Seller

<table>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-seller-catalog.jpg" />
<img src="./.github/assets/readme/app-seller-catalog-light.jpg" alt="Seller studio for Banani Craft House with an Approved badge, totals and a product table" width="100%" />
</picture>
<p><b>Run the catalogue.</b> An approved store sees its products, stock and status next to totals for revenue and orders.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-seller-new-product.jpg" />
<img src="./.github/assets/readme/app-seller-new-product-light.jpg" alt="Create New Product Listing dialog with title, category, status, price, stock, voucher, image URL and description" width="100%" />
</picture>
<p><b>List a product.</b> Title, category, status, price, stock, an optional voucher code, an image URL and a description.</p>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-seller-fulfillment.jpg" />
<img src="./.github/assets/readme/app-seller-fulfillment-light.jpg" alt="Incoming orders tab showing an order, its items, the destination address and a status selector" width="100%" />
</picture>
<p><b>Fulfil orders.</b> Each order lists this seller's items and the destination; a selector moves it through the statuses.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-seller-reviews.jpg" />
<img src="./.github/assets/readme/app-seller-reviews-light.jpg" alt="Customer product reviews tab for the seller" width="100%" />
</picture>
<p><b>Read the feedback.</b> Customer reviews of the seller's products, in one place.</p>
</td>
</tr>
</table>

#### Admin

<table>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-admin-overview.jpg" />
<img src="./.github/assets/readme/app-admin-overview-light.jpg" alt="Platform admin governance console with market value, active sellers, order throughput and review sentiment" width="100%" />
</picture>
<p><b>Oversee the marketplace.</b> Market value, active sellers, order throughput and review sentiment at a glance, with the approval queue below.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-admin-sellers.jpg" />
<img src="./.github/assets/readme/app-admin-sellers-light.jpg" alt="Seller approvals table with status filter and Approve, Reject and Suspend buttons" width="100%" />
</picture>
<p><b>Approve merchants.</b> Pending stores are approved or rejected; live ones can be suspended.</p>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-admin-categories.jpg" />
<img src="./.github/assets/readme/app-admin-categories-light.jpg" alt="Category registry with a form to add a category and the list of existing categories" width="100%" />
</picture>
<p><b>Curate categories.</b> Add, rename and remove categories, each with its product count.</p>
</td>
<td width="50%" valign="top">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="./.github/assets/readme/app-admin-products.jpg" />
<img src="./.github/assets/readme/app-admin-products-light.jpg" alt="Product listing moderation table with a Deactivate Listing button" width="100%" />
</picture>
<p><b>Moderate products.</b> Every listing with its merchant, price and status, and a button to deactivate it.</p>
</td>
</tr>
</table>

## How an order moves

```mermaid
sequenceDiagram
    actor Seller
    actor Admin
    actor Customer
    participant API as GoCart API
    participant DB as PostgreSQL

    Seller->>API: Register a store (status pending)
    Admin->>API: Approve the seller
    Seller->>API: List a product with price and stock
    Customer->>API: Add to cart
    API->>DB: Trigger checks quantity against stock
    Customer->>API: Place the order
    API->>DB: CALL process_checkout (lock cart and products)
    DB-->>API: Order created, stock taken, cart emptied
    Seller->>API: Set the order to processing, then shipped
    DB-->>DB: Trigger writes each change to order_status_audit
    Seller->>API: Set the order to delivered
    Customer->>API: Reviews the product
```

### Statuses

| Thing | Statuses, in the usual order | Notes |
| --- | --- | --- |
| Seller | `pending` → `approved` · `rejected` · `suspended` | Only approved sellers can list; a trigger blocks product writes from suspended or rejected ones |
| Order | `placed` → `processing` → `shipped` → `delivered` · `cancelled` | Sellers and admins move it; every change is logged |
| Product | `active` · `inactive` · `deactivated` | Checkout refuses products that are no longer active |

Shipping is a flat 5 for orders up to 150 and free above that. The browser
works the fee out and sends it with the order, which the server accepts as long
as it is not negative (see [Project status](#project-status-and-next-steps)).

## Seller approval

```mermaid
flowchart TD
    A([Merchant registers]) --> B[Seller row created<br/>status = pending]
    B --> C{Admin decision}
    C -->|Approve| D[approved<br/>can list products]
    C -->|Reject| E[rejected<br/>product writes blocked]
    D -->|Suspend| F[suspended<br/>product writes blocked]
    F -->|Approve again| D
    D --> G[Products visible in the storefront]
    B -. every change .-> H[(seller_status_audit)]
    D -. every change .-> H
```

A seller who is not `approved` cannot create a product, and the check lives in a
trigger (`trigger_enforce_seller_status`), so it holds for every caller, not
only the web app.
