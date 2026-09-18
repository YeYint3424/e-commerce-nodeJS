# E-commerce Management System

Full-stack e-commerce platform: a Node.js/Express/MongoDB backend (layered, Spring Boot-inspired architecture) with a vanilla JS + Tailwind CSS frontend for both customers and staff/admin.

## Features

- **Customer site** — browse products, cart, checkout, order review, COD/QR payment with proof upload, order history, PDF vouchers, profile management.
- **Admin panel** — dashboard with sales aggregation, account/category/product/payment-option management, order management with status transitions, sales history, real-time notifications (Socket.IO).
- **Auth** — JWT-based authentication with role-based access control (`CUSTOMER`, `STAFF`, `HR`, `ADMIN`, `DEFAULT_ADMIN`).
- **Notifications** — real-time via Socket.IO, persisted per user/role.

## Architecture

```
routes → controllers → services → service-implementations → repositories → models → MongoDB
```

## Project structure

```
backend/
  configs/           # app, database, JWT config
  controllers/        # request handlers
  middlewares/         # auth, role, validation, upload, error handling
  models/               # Mongoose schemas
  repositories/          # data access layer
  services/               # service interfaces
  service-implementations/ # business logic
  routes/                    # Express routers
  sockets/                    # Socket.IO setup
  utils/                       # shared helpers (JWT, pagination, PDF, etc.)
  tests/                        # Jest + Supertest suite (in-memory MongoDB)

public/
  customer/           # customer-facing pages
  admin/               # admin panel pages (served under /ecommerce-admin)
  js/                   # vanilla JS (api clients, components, page scripts)
  css/                   # stylesheets
  assets/                 # fonts, icons, images
```

## Requirements

- Node.js 18+
- MongoDB (local or remote)

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, etc.
npm run dev             # start the dev server (nodemon)
```

The server also serves the `public/` frontend, so once it's running:

- Customer site: `http://localhost:5000/`
- Admin panel: `http://localhost:5000/ecommerce-admin/login`

### Environment variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `1d`) |
| `PORT` | Server port |
| `NODE_ENV` | `development` / `production` / `test` |
| `CLIENT_ORIGIN` | Allowed CORS origin |
| `DEFAULT_ADMIN_NAME` / `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | Seed credentials for the default admin account |

## Testing

```bash
cd backend
npm test              # Jest + Supertest, uses mongodb-memory-server
npm run test:coverage
```

## API overview

All API routes are mounted under `/api`:

`/auth`, `/accounts`, `/profile`, `/categories`, `/payment-options`, `/products`, `/orders`, `/payments`, `/vouchers`, `/dashboard`, `/notifications`

See the corresponding `backend/routes/*.routes.js` files for the full route list.
