# SHIELD — Anonymous Cybersecurity Services Marketplace

A production-ready, two-sided anonymous marketplace connecting organizations needing cybersecurity services with verified security professionals — all under anonymous aliases until both parties consent to reveal identities after deal closure.

---

## Architecture Overview

- **Frontend**: React + Vite (TypeScript), TailwindCSS, React Router, Lucide Icons (`apps/web-vite`)
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy (Async), PostgreSQL, MongoDB (Motor), Socket.IO (`apps/api`)
- **Machine Learning**: Local Semantic Matching Engine (`sentence-transformers/all-MiniLM-L6-v2` & Cosine Similarity)

---

## Core Features

### Anonymous Operations
- Every user gets a chosen codename (e.g., `Vendor-Shadow`, `Buyer-Phantom`).
- Real identity stored only in the encrypted auth layer.
- All marketplace interactions happen under aliases.

### Marketplace & AI Matching
- Buyers post cybersecurity requirements (pentests, audits, compliance, etc.).
- Local ML matching engine connects requirements to relevant verified vendors based on technical capability, budget, and trust score.
- Vendors browse and submit proposals anonymously.

### Deal Lifecycle
`POSTED → MATCHED → NEGOTIATING → CONTRACTED → IN_PROGRESS → REVIEW → CLOSED`
- Price negotiation with edit history.
- Milestone-based workflow.
- Secure file delivery for deliverables.

### Trust & Reputation
- Trust scores computed from: deal history, verified certifications, response rates, and peer reviews.
- Verified certifications (OSCP, CISSP, CEH, ISO27001, AWS, GPEN).
- 5-star rating system after each completed deal.

### End-to-End Encrypted Chat
- Messages encrypted client-side using TweetNaCl (XSalsa20-Poly1305).
- Secret keys never leave the browser (`localStorage`).
- Real-time Socket.IO room messaging (`deal-{id}`).

### Identity Reveal (Optional)
- After deal closure, both parties can consent to reveal real identities.
- One-time email sent with contact details upon mutual consent.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS |
| Backend API | FastAPI (Python 3.11+) |
| Primary Database | PostgreSQL (SQLAlchemy Async engine) |
| Document Database | MongoDB (Motor Async Client) |
| Real-time Socket | Socket.IO (`python-socketio` ASGI) |
| Auth System | Self-Hosted JWT Session Tokens (HttpOnly cookies) + Bcrypt |
| Encryption | TweetNaCl.js (XSalsa20-Poly1305) |
| Matching Engine | Sentence-Transformers (`all-MiniLM-L6-v2`) + Cosine Similarity |

---

## Project Structure

```text
industry_project/
├── apps/
│   ├── api/                          # FastAPI Python Backend
│   │   ├── app/
│   │   │   ├── auth/                 # JWT & Password security routines
│   │   │   ├── email/                # Mailer & HTML templates
│   │   │   ├── models/               # SQLAlchemy PostgreSQL Models
│   │   │   ├── mongodb/              # Async MongoDB Client
│   │   │   ├── routers/              # API Endpoints (Auth, Buyer, Vendor, Deals, etc.)
│   │   │   ├── schemas/              # Pydantic Validation Schemas
│   │   │   ├── sockets/              # Socket.IO Event Handlers
│   │   │   └── utils/                # Local ML Matching & Trust Engine
│   │   ├── .env.example
│   │   ├── requirements.txt
│   │   └── test_integration.py       # E2E Test Suite (10 Scenarios)
│   │
│   └── web-vite/                     # React + Vite Frontend
│       ├── src/
│       │   ├── components/           # DashboardLayout, UI components, Badges
│       │   ├── context/              # AuthContext & Session management
│       │   ├── hooks/                # useAuth, useSocket
│       │   ├── lib/                  # Axios API client, TweetNaCl Encryption
│       │   └── pages/                # Landing, Auth, Buyer, Vendor, Moderator pages
│       ├── package.json
│       └── vite.config.ts
└── README.md
```

---

## Getting Started

### 1. Backend (FastAPI) Setup
```bash
cd apps/api
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend (React + Vite) Setup
```bash
cd apps/web-vite
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173/` connecting directly to `http://localhost:8000/`.
