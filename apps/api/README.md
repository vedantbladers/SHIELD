# SHIELD Platform — FastAPI Backend

High-performance, asynchronous FastAPI backend engine for the **SHIELD Cybersecurity Marketplace Platform**.

## Tech Stack & Architecture

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (SQLAlchemy Async engine + AsyncPG) & MongoDB (Motor)
- **Authentication**: JWT HTTP-only Session Cookie & Bcrypt Password Hashing
- **Real-Time Communication**: Socket.IO Engine (`python-socketio` ASGI app)
- **Machine Learning**: Local Semantic Matching Engine (`sentence-transformers/all-MiniLM-L6-v2` & `scikit-learn` Cosine Similarity)

## Project Structure

```
apps/api/
├── app/
│   ├── auth/           # JWT & Password security routines & dependencies
│   ├── email/          # Mailer & HTML template builders
│   ├── models/         # SQLAlchemy PostgreSQL Data Models
│   ├── mongodb/        # Async MongoDB Client
│   ├── routers/        # API Endpoints (Auth, Buyer, Vendor, Deals, Moderator, Marketplace, Files, Matching)
│   ├── schemas/        # Pydantic Schemas for Validation
│   ├── sockets/        # Real-time Socket.IO event handlers
│   ├── utils/          # ML Matching Engine & Trust Score Computation
│   ├── config.py       # Configuration & Pydantic Settings
│   ├── database.py     # Async Database Session Provider
│   └── main.py         # Application Entrypoint & Socket.IO Wrapper
├── .env.example        # Environment Variable Blueprint
├── requirements.txt    # Python Dependencies
└── test_integration.py # E2E Integration Suite (10 Scenarios)
```

## Setup & Running Locally

1. **Environment Configuration**:
   Copy `.env.example` to `.env` and fill in your database credentials:
   ```bash
   cp .env.example .env
   ```

2. **Virtual Environment Setup**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run Server**:
   ```bash
   uvicorn app.main:app --port 8000 --reload
   ```

5. **Run E2E Integration Tests**:
   ```bash
   python test_integration.py
   ```
