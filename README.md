# E-commerce Management System

Full-stack e-commerce platform (Node.js/Express/MongoDB backend, vanilla JS + Tailwind frontend), built in incremental, tested phases. See `Readme` in the repo root for the full original specification.

## Status

- [x] Phase 1 — Project setup (Express app, MongoDB connection, layered folder structure, centralized error handling, health check)
- [x] Phase 2 — Authentication (customer + admin, JWT, roles, default admin)
- [x] Phase 3 — Master data (accounts, categories, products, payment options)
- [x] Phase 4 — Customer frontend
- [x] Phase 5 — Orders
- [x] Phase 6 — Payments
- [ ] Phase 7 — Vouchers + PDF
- [ ] Phase 8 — Admin panel frontend
- [ ] Phase 9 — Notifications
- [ ] Phase 10 — UI polish
- [ ] Phase 11 — Full test suite + docs

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in MONGODB_URI, JWT_SECRET, etc.
npm run dev             # start development server
npm test                 # run Jest + Supertest suite (uses in-memory MongoDB)
npm run test:coverage
```

Full setup instructions, API documentation, seed accounts, and customer/admin flow docs will be filled in as later phases land.
