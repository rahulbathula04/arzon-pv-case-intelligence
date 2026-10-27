# Arzon PV Case Intelligence
**Executive Healthcare Career Intelligence & Role Readiness System**

> Built from the ground up as an AI-powered pharmacovigilance simulation and training platform. Designed for Life Sciences, Pharmacy, and Medical graduates (B.Pharm, M.Pharm, Pharm.D, MBBS, BDS) to master real-world Individual Case Safety Report (ICSR) processing.

---

## System Architecture & Features

### 1. PV Case Library (Module 03)
- Search, filter, categorize, and version approved fictional ICSR cases.
- **Strict Role-Based Data Partitioning**: Public/student endpoints return only patient profile, suspect medications, lab findings, and verbatim narratives. Gold-standard MedDRA terms, expected seriousness criteria, expected WHO-UMC causality, and grading rubrics are strictly isolated in a restricted reference table.
- Mandatory warning banner on all cases: `CONTROLLED FICTIONAL TRAINING SCENARIOS ONLY · NOT REAL PATIENT DATA`.

### 2. AI Case Generator (Module 01)
- Synthesizes realistic, clinically sound fictional ICSR cases across Oncology, Cardiology, Neurology, Immunology, Gastroenterology, Endocrinology, and Psychiatry.
- Generates patient demographics, suspect drugs, concomitant regimens, adverse event timelines, diagnostic lab investigations, and gold-standard reference keys.
- Enforces the 4 minimum regulatory criteria (Patient ID, Reporter ID, Suspect Drug, Adverse Event) and stages cases in `draft` status for human approval.

### 3. PDF Case Importer (Module 02)
- Uploads PDF medical case reports, CIOMS-I forms, or safety literature.
- Server extracts raw text and runs an intelligent clinical parser to identify patient initials, age, gender, suspect drugs, doses, indications, adverse events, seriousness flags, and lab tests.
- **Human-in-the-Loop Admin Verification**: Split-screen staging interface where admins inspect the raw PDF text against extracted structured fields, make corrections, and publish to the library.

### 4. Student Assignment System (Module 04)
- Assigns cases individually or across entire cohorts with deadlines and tailored clinical instructions.
- Tracks assignment states: `assigned`, `in_progress`, `submitted`, `completed`, and live computed `overdue`.

### 5. PV Workbench (Module 05)
- High-density clinical data interface inspired by industry-standard safety databases (Argus, ARISg, MedDRA):
  - **Intake Dossier**: Full patient history, medications table, diagnostic labs, and verbatim statement.
  - **MedDRA Coding Console**: Verbatim extraction, Lowest Level Term (LLT), Preferred Term (PT), System Organ Class (SOC), and clinical justification.
  - **ICH E2A Seriousness Matrix**: Regulatory checklist (Death, Life-threatening, Hospitalization, Disability, Congenital Anomaly, IME) with clinical rationale.
  - **Causality Assessment Console**: WHO-UMC classification selector and interactive 10-question **Naranjo Algorithm Calculator** with instantaneous score tallying.
  - **CIOMS-I Narrative Composer**: Chronological narrative editor with live word count, character count, and E2B section starter chips.
  - **Pre-Flight Validation**: Pre-submission audit checklist with draft auto-save and final lock.

### 6. AI Assessment Engine (Module 06)
- Automatically evaluates student submissions across 4 weighted clinical pillars (100 pts total):
  1. *MedDRA Coding Accuracy* (25 pts)
  2. *Seriousness Determination* (25 pts)
  3. *Causality Assessment* (25 pts)
  4. *CIOMS Narrative Quality* (25 pts)
- Generates itemized findings: identified omissions, clinical errors, student strengths, and detailed AI rationale.
- **Strictly Provisional Status**: AI scores remain provisional and hidden from students until vetted and approved by a clinical mentor.

### 7. Mentor Review Studio (Module 07)
- Three-column comparative review interface:
  - *Column 1*: Student Submission
  - *Column 2*: Gold-Standard Reference Key & Rubric
  - *Column 3*: AI Assessment Findings & Interactive Score Adjustment Sliders
- Mentors can adjust the score, record actionable clinical feedback, and select **Approve Work** or **Request Revision** (which resets the submission to draft for student rework).

### 8. Admin Command Center (Module 08)
- Operational KPIs: Total Cases, Active Cohorts, Completion Rate %, Overdue Work, Pending Reviews, Average Cohort Score.
- Real-time student performance ledger.
- Tamper-evident 21 CFR Part 11 compliant audit log.

### 9. Google Workspace Hub (Module 09)
- **Authoritative Single Source of Truth**: The platform's internal SQLite database is the authoritative system of record.
- **Google Sheets**: 1-click export of student gradebooks and case library into CSV/Sheets format.
- **Google Docs**: 1-click generation of formatted Executive Case Briefs (HTML/Markdown) and Mentor Audit Reports.
- **Google Slides**: 1-click generation of 5-slide Case Conference Presentation outlines.
- **Google Calendar**: 1-click "Add to Google Calendar" URL generator and standard `.ics` iCalendar file export for assignment deadlines.
- **Antigravity Customizations**: Local assistant environment integration with `gdrive`, `gsheets`, `gdocs`, `gslides`, and `gcalendar` plugins.

---

## Getting Started

### Prerequisites
- Node.js v20+ (Node v22.20.0 tested)
- npm 10+

### Installation
```bash
# Install dependencies
npm install

# Run automated tests (20 unit & integration tests)
npm test

# Run frontend build
npm run build

# Start the full-stack server
npm run server
```

The application server will start at `http://localhost:5000`. In development, run `npm run dev` for Vite hot-module replacement on port 5173.

---

## Test Suite Execution Results

All 20 tests across 5 test suites pass:
```
 ✓ tests/phase3-workbench.test.ts (4 tests)
 ✓ tests/phase5-security-workspace.test.ts (5 tests)
 ✓ tests/phase1-case-library.test.ts (5 tests)
 ✓ tests/phase4-assessment-review.test.ts (3 tests)
 ✓ tests/phase2-ai-pdf.test.ts (3 tests)

 Test Files  5 passed (5)
      Tests  20 passed (20)
```
