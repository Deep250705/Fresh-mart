# Fresh Mart (MERN) – Grocery Marketplace

Production-minded MERN grocery app with multi-role dashboards (admin/vendor/user/delivery), MongoDB, Socket.IO order updates, and a discount engine.

## Prerequisites

- Node.js (LTS recommended)
- MongoDB running locally (or a hosted URI)

## Setup

### Backend

1. Create `backend/.env` from `backend/.env.example`
2. Install and run:

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to the backend.
