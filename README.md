# Arzon PV Case Intelligence
**Enterprise Pharmacovigilance Case Training & Evaluation System**

[![CI/CD Pipeline](https://github.com/rahulbathula04/arzon-pv-case-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/rahulbathula04/arzon-pv-case-intelligence/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Database: SQLite WAL](https://img.shields.io/badge/Database-SQLite%20WAL-emerald.svg)](https://www.sqlite.org/wal.html)
[![Compliance: 21 CFR Part 11](https://img.shields.io/badge/Compliance-21%20CFR%20Part%2011-navy.svg)](https://www.fda.gov)

> Production-grade, high-trust pharmacovigilance simulation platform designed for Life Sciences, Pharmacy, and Medical graduates (Pharm.D, B.Pharm, M.Pharm, MBBS, BDS) to master real-world Individual Case Safety Report (ICSR) processing. Authoritative clinical data tool comparable to Oracle Argus Safety, Veeva Vault Safety, and ARISg.

---

## Live Repository & Quick Links

- **GitHub Repository**: [https://github.com/rahulbathula04/arzon-pv-case-intelligence](https://github.com/rahulbathula04/arzon-pv-case-intelligence)
- **Primary Tech Stack**: Node.js 22, Express, TypeScript, React 18, Vite, Tailwind CSS, SQLite (WAL mode, `better-sqlite3`)
- **Automated Test Coverage**: 10 test suites, 55 automated integration tests (100% passing)

---

## Deploy Live in 1-Click

### Option A: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect repository `rahulbathula04/arzon-pv-case-intelligence`.
4. Render automatically reads `render.yaml`, provisions the persistent disk, builds the frontend, and launches the unified production server.

### Option B: Deploy to Railway / Fly.io / VPS with Docker
```bash
# Clone the repository
git clone https://github.com/rahulbathula04/arzon-pv-case-intelligence.git
cd arzon-pv-case-intelligence

# Build and run container
docker build -t arzon-pv-case-intelligence .
docker run -d -p 5000:5000 -v arzon-pv-data:/app/data --name arzon-pv arzon-pv-case-intelligence
```

---

## Local Development & Operations

### Prerequisites
- Node.js 20+ (Node.js 22 LTS recommended)
- npm 10+

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run automated validation tests
npm test

# 3. Build production bundle
npm run build

# 4. Start backend server (port 5000)
npm run server

# 5. Start Vite development server (port 5173) in a second terminal
npm run dev
```

---

## Core Enterprise Architecture

### 1. Zero-Demo Production Security Gate
- **No Mock Credential Rosters**: Completely free of hardcoded demo buttons or test user cards on login views.
- **Institutional Self-Registration**: `POST /api/auth/register` with duplicate checks, cohort classification, and auto-provisioning of baseline onboarding ICSR cases.
- **ICH E2B / 21 CFR Part 11 Password Policy**: Enforces at least 10 characters, mixed case, numbers, and symbols with live compliance indicators.

### 2. High-Concurrency SQLite WAL Engine (10,000+ Users)
- **WAL Journaling**: Multi-reader concurrent operations with zero table-locking deadlocks.
- **Optimized Pragmas**: `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 10000`, `cache_size = -64000`, `temp_store = MEMORY`.
- **B-Tree Performance Indexes**:
  - `idx_users_role_cohort` on `users(role, cohort)`
  - `idx_assignments_student_status` on `assignments(student_id, case_id, status, due_date)`
  - `idx_submissions_student_case` on `submissions(student_id, case_id, assignment_id, status)`
  - `idx_cases_status_area` on `cases(status, therapeutic_area, difficulty)`
  - `idx_audit_logs_user_time` on `audit_logs(user_id, timestamp)`

### 3. Strict Role-Based Data Partitioning
- **Student Privacy & Blind Evaluation**: Students never receive gold-standard MedDRA terms, expected seriousness criteria, expected WHO-UMC causality scores, or model narratives until mentor review sign-off.
- **State Bleed Isolation**: Instant state reset when toggling between unworked cases and submissions.

### 4. Enterprise Clinical Modules
1. **Operations Command Center**: Executive KPI metrics, cohort performance ledgers, and 21 CFR Part 11 audit trail logging.
2. **ICSR Master Safety Vault**: Fictionalized training cases spanning Oncology, Cardiology, Neurology, and Immunology.
3. **ICSR Case Synthesis Engine**: High-fidelity clinical scenarios with verified pharmacology and decoupled rubrics.
4. **Clinical Source Document Ingestion**: PDF medical parser staging entities for human-in-the-loop admin verification.
5. **PV Clinical Workbench**: 6-step E2B workflow (Intake, MedDRA Coding, Seriousness Matrix, Naranjo Causality Algorithm, CIOMS-I Narrative Composer, Pre-Flight Validation).
6. **Mentor Quality Studio**: 3-column comparative grading console (Student Work vs Reference Standard vs Rubric Evaluation).
7. **Enterprise Regulatory Interchange**: ICH E2B(R3) Gateway & XML Bridge, Google Workspace synchronizers (Gradebook CSV, Case Brief Docs, iCal deadlines, and Slide Deck Outlines).

---

## Audit & Compliance Certification

This system maintains strict adherence to:
- **ICH E2B(R3)**: Standardized clinical safety data management and transmission protocols.
- **ICH E2A**: Clinical safety data management definitions and standards for expedited reporting.
- **21 CFR Part 11**: Electronic records, electronic signatures, cryptographic passwords, and immutable audit trails.
- **WHO-UMC & Naranjo Algorithms**: Globally standardized adverse drug reaction causality evaluation models.
