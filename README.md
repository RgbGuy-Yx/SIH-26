# Real-Time Network-Aware ETA Forecasting & Conflict Resolution Engine for Indian Railways

## 1. Project Overview & Purpose
This system is an intelligent, network-aware train arrival forecasting and traffic conflict resolution engine for Indian Railways. It dynamically models delays across rail sections by combining historical run data, live train positions, atmospheric/weather conditions, operational precedence rules, and graph-based network topology to deliver high-precision ETAs and proactive conflict alerts.

---

## 2. High-Level Architecture

The platform is structured into modular layers:

- **Data Layer**: Ingests route topology, timetables, historical station delays, station coordinates, and atmospheric data (Open-Meteo).
- **ML Layer (XGBoost Regressor)**: Predicts unconstrained station arrival delay using an 8-feature schema (`hour_of_day`, `current_accumulated_delay`, `priority_tier`, `is_foggy`, `avg_temperature`, `total_precipitation`, `avg_wind_speed`, `avg_cloud_cover`). Test MAE: **7.18 mins** ($R^2 = 0.9626$).
- **Graph & Conflict Engine (NetworkX)**: Models railway tracks, junctions, block sections, headways, and resource contention to calculate conflict delays ($\Delta_{\text{conflict}}$) based on priority tiers (1 to 4).
- **Simulation Engine**: Drives a virtual multi-train clock for continuous route replay, position interpolation, and real-time downstream delay propagation.
- **Backend Service (FastAPI)**: REST APIs, WebSockets for live position streaming, on-demand RailRadar status queries, and weather caching.
- **AI Explanation Layer (Gemini & LangChain)**: Interprets conflicts and delays into natural language operational insights for controllers and passengers.
- **Frontend Dashboard (React + Vite + Tailwind + Leaflet + Recharts)**: Real-time dual-mode UI providing an operational control-room view and a passenger-facing ETA portal.

---

## 3. Project Folder Structure

```
project-root/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/              # FastAPI route handlers
│   │   │   └── dependencies/        # Auth, DB, and service dependencies
│   │   ├── core/                    # App configuration, security, database connectors
│   │   ├── models/                  # SQLAlchemy ORM database models
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # Business logic & orchestration services
│   │   ├── ml/                      # Model inference & feature extractors
│   │   ├── graph/                   # NetworkX railway graph topology & conflict engine
│   │   ├── simulation/              # Virtual clock & train movement simulation
│   │   ├── integrations/            # Open-Meteo & RailRadar client wrappers
│   │   ├── ai/                      # Gemini & LangChain explanation layer
│   │   ├── websocket/               # Real-time WebSocket connection managers
│   │   └── main.py                  # FastAPI application entry point
│   ├── tests/                       # Backend test suites
│   ├── requirements.txt             # Python backend dependencies
│   └── .env.example                 # Backend environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI widgets & map layers
│   │   ├── pages/                   # Passenger & Control-Room dashboard views
│   │   ├── layouts/                 # Application shell & navigation
│   │   ├── hooks/                   # Custom React hooks (WebSocket, fetchers)
│   │   ├── services/                # Axios API and WebSocket clients
│   │   ├── context/                 # State management (Simulation & Auth context)
│   │   ├── utils/                   # Formatting & calculation utilities
│   │   ├── types/                   # TypeScript / JSDoc interfaces
│   │   └── assets/                  # Static images, icons, and stylesheets
│   ├── public/                      # Public web assets
│   ├── package.json                 # Node dependencies & build scripts
│   ├── vite.config.js               # Vite bundler configuration
│   ├── tailwind.config.js           # Tailwind CSS theme styling
│   ├── postcss.config.js            # PostCSS configuration
│   └── .env.example                 # Frontend environment variable template
│
├── data/
│   ├── raw/                         # Raw schedules, train tables, delay logs
│   ├── processed/                   # Cleaned training tables & feature stores
│   ├── weather/                     # Historical & cached Open-Meteo feeds
│   ├── stations/                    # Station coordinate & zone lookups
│   └── README.md
│
├── models/
│   ├── xgboost_eta_model.pkl        # Pre-trained XGBoost regressor (7.18m MAE)
│   ├── model_features.json          # 8-feature schema definition
│   └── README.md
│
├── scripts/
│   ├── train_model.py               # Reproducible ML training pipeline
│   └── README.md
│
├── docs/
│   ├── PRD/                         # Product Requirements Documents
│   ├── architecture/                # System architecture & mathematical specs
│   └── README.md
│
├── tests/
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── README.md
│
├── docker-compose.yml               # Infrastructure containers (PostgreSQL)
├── .gitignore                       # Standard ignore rules
└── README.md                        # Project documentation
```

---

## 4. Quick Start (TL;DR)

To get the full application up and running locally, open **two terminal windows**:

### Terminal 1: Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (first time only)
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (CMD):
.venv\Scripts\activate.bat
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Copy environment variables (first time only)
# Windows:
copy .env.example .env
# Linux/macOS:
cp .env.example .env

# Run FastAPI backend server
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies (first time only)
npm install

# Copy environment variables (first time only)
# Windows:
copy .env.example .env
# Linux/macOS:
cp .env.example .env

# Start frontend development server
npm run dev
```

---

## 5. Detailed Setup & Execution Guide

### Prerequisites
- **Python**: 3.11+ (Tested on Python 3.13)
- **Node.js**: 18.x or higher (Tested on Node v24.x) & npm
- **Docker & Docker Compose** (Optional: for local PostgreSQL database container)
- **Git**

---

### Step 1: Database Setup (Optional)

If you wish to run a dedicated PostgreSQL instance using Docker:

```bash
# From the project root
docker-compose up -d postgres
```

> **Note**: The default PostgreSQL container will be exposed on port `5432` with username `postgres` and database `railway_eta`.

---

### Step 2: Backend Setup & Execution

1. **Open a terminal** and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
     *(If script execution is disabled on PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first)*
   - **Windows (Command Prompt / CMD)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up environment variables**:
   Create a `.env` file from the provided `.env.example`:
   ```bash
   # Windows:
   copy .env.example .env
   # Linux/macOS:
   cp .env.example .env
   ```

6. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

7. **Verify backend is running**:
   - **Root Status**: [http://localhost:8000/](http://localhost:8000/)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
   - **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Alternative API Docs (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 3: Frontend Setup & Execution

1. **Open a second terminal** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Windows:
   copy .env.example .env
   # Linux/macOS:
   cp .env.example .env
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**

---

### Step 4: Retraining / Running the ML ETA Model (Optional)

To re-run the end-to-end dataset generation, feature engineering, and XGBoost ETA training pipeline:

```bash
# With the virtual environment activated from the project root:
python scripts/train_model.py
```
This updates:
- `models/xgboost_eta_model.pkl` (trained model artifact)
- `models/model_features.json` (feature definition schema)
- `data/processed/train_features.csv` (synthetic training dataset)

---

## 6. Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/railway_eta` | PostgreSQL connection string |
| `JWT_SECRET` | `change_me_in_production_secret_key` | Secret key for JWT authentication |
| `RAILRADAR_API_URL` | `https://api.railradar.in/v1` | Base URL for on-demand live train lookups |
| `RAILRADAR_API_KEY` | *(Optional)* | API authentication key for RailRadar |
| `OPEN_METEO_BASE_URL`| `https://api.open-meteo.com/v1` | Base URL for atmospheric weather API |
| `GEMINI_API_KEY` | *(Optional)* | Google Gemini API key for natural language explanations |

### Frontend (`frontend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend REST API base endpoint |
| `VITE_WS_BASE_URL` | `ws://localhost:8000/ws` | WebSocket live train streaming endpoint |

---

## 7. Troubleshooting & FAQs

- **PowerShell Script Execution Error**: If you see `File .venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled on this system`, run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  Then re-run `.venv\Scripts\Activate.ps1`.
- **Port 8000 or 5173 already in use**:
  - For backend: run on a different port using `uvicorn app.main:app --reload --port 8001` (and update `VITE_API_BASE_URL` in `frontend/.env`).
  - For frontend: Vite will automatically prompt or select the next available port (e.g. `5174`).
- **Missing Module Errors in Python**: Ensure your virtual environment is active (you should see `(.venv)` in your terminal prompt) before running `pip install -r requirements.txt`.

---

## 8. Current Implementation Status
> **INITIAL PROJECT SETUP**: This codebase represents the verified foundational scaffold, dependency environment, folder structure, and trained ML artifacts. Application business logic, API route handlers, simulation loops, graph algorithms, and React UI components are scheduled for subsequent implementation phases.
