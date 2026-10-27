# Arzon PV Case Intelligence · Tri-Persona Operations Manual & Button Directory
**Executive Healthcare Career Intelligence & Role Readiness System**  
*Standards Compliance: ICH E2B(R3) · ICH E2A · CIOMS-I · WHO-UMC · MedDRA 26.0*

---

## Document Information & Download Options
- **Interactive Printable Web Brochure**: Available live at `/brochure.html` (`http://localhost:5173/brochure.html` and `http://localhost:5000/brochure.html`).
- **Direct File Download API**: Available via `GET /api/brochure/download` (downloads the complete, self-contained HTML brochure with print CSS).
- **In-App Quick Access**: Accessible via the **"Guide & Brochure"** button in the main application header.
- **Client-Side PDF Printing**: The brochure contains a dedicated **"Print / Save as PDF"** button configured with publication-grade print CSS.

---

## Executive Overview: What is Arzon PV Case Intelligence?

**Arzon PV Case Intelligence** is an enterprise-grade pharmacovigilance simulation platform. Tailored for graduates in Pharmacy (B.Pharm, M.Pharm, Pharm.D), Medicine (MBBS, BDS), and Life Sciences, it bridges the gap between academic pharmacology and the operational responsibilities of a **Drug Safety Associate / Pharmacovigilance Specialist**.

In global pharmaceutical organizations and Contract Research Organizations (CROs like IQVIA, Parexel, Syneos, Fortrea, Cognizant, and Accenture), Drug Safety Associates evaluate spontaneous adverse event reports, clinical trial safety documents, and post-marketing safety data. Any error in MedDRA coding, missed regulatory seriousness criteria, or flawed causality assessments can jeopardize clinical trial approvals or trigger compliance actions from regulatory authorities (FDA, EMA, CDSCO).

Arzon PV Case Intelligence replicates the exact operational environment of industry platforms like **Oracle Argus Safety** and **Veeva Vault Safety**:
- Structured **ICH E2B(R3)** ICSR data ingestion.
- Multi-pillar evaluation benchmarked against verified ground-truth reference keys.
- **Air-gapped answer security**: Student submissions remain provisional and answer keys are strictly masked until a Faculty Mentor evaluates and approves their work.
- Automated provisional AI evaluation across **MedDRA (25%)**, **Seriousness (25%)**, **Causality (25%)**, and **CIOMS-I Narrative (25%)**.
- End-to-end integration with **Google Workspace** (Docs, Sheets, Slides, Calendar, Drive).

---

## Persona 1: The Student / PV Trainee Field Guide
*Target Audience: Trainee PV Associates, Medical Coders, Drug Safety Specialists*

### Key Responsibilities
1. **Case Signal Discovery**: Review patient demographics, medical history, suspect drugs (INN, route, dosage, latency), concomitant medications, and laboratory values.
2. **MedDRA Medical Coding**:
   - Map unstructured verbatim descriptions to clinically precise **Preferred Terms (PT)** (e.g., *Toxic epidermal necrolysis*).
   - Assign the primary **System Organ Class (SOC)** (e.g., *Skin and subcutaneous tissue disorders*).
3. **ICH E2A Seriousness Adjudication**:
   - Evaluate against the 6 international seriousness criteria: *Death, Life-Threatening, Hospitalization, Disability, Congenital Anomaly, Other Medically Important Event*.
   - Author a clear clinical justification referencing specific dates and therapeutic interventions.
4. **Dual Causality Assessment**:
   - Select the appropriate **WHO-UMC Classification** (*Certain, Probable, Possible, Unlikely, Conditional, Unassessable*).
   - Complete the **Naranjo 10-Question ADR Probability Algorithm** (*Definite ≥ 9, Probable 5–8, Possible 1–4, Doubtful ≤ 0*).
   - Formulate a pharmacological rationale accounting for temporal onset and alternative etiologies.
5. **CIOMS-I Narrative Formulation**:
   - Compose a chronological narrative of at least 40 words (industry standard: 90–150 words) incorporating demographics, reaction latency, laboratory findings, corrective dechallenge, and outcome.
6. **Submission & Review Tracking**:
   - Save working drafts with 1-click autosave.
   - Submit for mentor evaluation.
   - Access the unmasked score breakdown and faculty feedback once approved.

### Interfaces, Buttons & What They Produce (Student Face)
- **My Assignments Hub (`assignments`)**:
  - `[ Start Working -> ]` / `[ Resume Case -> ]`: Loads the assigned ICSR case directly into the PV Workbench with prior drafts pre-populated. Produces an active editing session with continuous SQLite auto-save.
  - `[ View Submitted Record ]`: Opens the submitted case in read-only audit mode showing submission timestamp and pending faculty status.
- **PV Workbench (`workbench`)**:
  - `Case Selector Dropdown`: Loads selected ICSR scenario, patient demographics, and suspect drugs.
  - `Tab 1: Intake Dossier`: Full patient demographics card, suspect/concomitant drug table with dechallenge details, diagnostic labs with reference ranges, and verbatim reporter statement.
  - `Tab 2: MedDRA Coding Console`: Verbatim input, Preferred Term (PT) selector, System Organ Class (SOC) dropdown, and clinical rationale. Button `[ + Add Coded Event ]` commits the coded entry into the active submission record.
  - `Tab 3: ICH E2A Seriousness Matrix`: 6 regulatory checkboxes (Death, Life-threatening, Hospitalization, Disability, Congenital anomaly, IME). Automatically computes the legal seriousness status (`Serious` vs `Non-Serious`). Mandatory regulatory rationale box.
  - `Tab 4: Causality & Naranjo Algorithm`: WHO-UMC category selector and interactive 10-question Naranjo Algorithm radio buttons. Automatically computes the ADR score (`Definite ≥ 9`, `Probable 5–8`, `Possible 1–4`, `Doubtful ≤ 0`).
  - `Tab 5: CIOMS-I Narrative Composer`: E2B section starter chips (`+ Demographics`, `+ Suspect Drug Admin`, `+ Reaction Onset`, `+ Dechallenge Action`, `+ Final Outcome`), live word count, character count, and minimum 40 words regulatory badge.
  - `Tab 6: Pre-Flight Verification & Lock`: 5-point audit checklist. Button `[ Save Working Draft ]` persists state to SQLite. Button `[ Lock & Submit ICSR Case ]` freezes editing, triggers 4-pillar provisional assessment, and stages case in the mentor queue.
- **What It Produces**: Locked ICH E2B(R3) ICSR submission, MedDRA hierarchy mapping, Naranjo algorithmic calculation, compliant CIOMS-I narrative, and verifiable candidate portfolio work evidence for CRO hiring managers.

---

## Persona 2: The Faculty Mentor Manual
*Target Audience: Medical Reviewers, Safety Operations Leads, PV Faculty Mentors*

### Key Responsibilities
1. **Queue Management**: Monitor the pending review queue under `/reviews`, sorted chronologically with student and case identifiers.
2. **Three-Way Comparison Audit**:
   - Compare the student's submission directly against the **Ground-Truth Reference Key**.
   - Inspect the automated **4-Pillar AI Provisional Scoring**:
     - *MedDRA PT/SOC accuracy (25 pts)*
     - *ICH E2A Seriousness concordance (25 pts)*
     - *WHO-UMC & Naranjo algorithmic calculation (25 pts)*
     - *CIOMS-I narrative structure and word count (25 pts)*
3. **Score Calibration**:
   - Adjust total score (0–100%) to account for clinical nuance, differential diagnoses, or subtle terminology differences.
4. **Qualitative Medical Feedback**:
   - Author actionable pedagogical feedback detailing strengths and omissions.
5. **Disposition**:
   - **Approve**: Finalizes the submission in SQLite and releases the full scorecard to the student.
   - **Request Revision**: Returns the case to the student workbench with constructive instructions for resubmission.

### Interfaces, Buttons & What They Produce (Mentor Face)
- **Review Studio (`reviews`)**:
  - `Triage Score Filter`: Toggles between `All Submissions`, `High Performers (≥ 85%)`, and `Needs Attention (< 85%)` to triage struggling students.
  - `Search Bar`: Real-time filtering by student name, student email, or case number.
  - `[ Run / Re-Evaluate AI Assessment ]`: Triggers provisional 4-pillar evaluation if missing.
  - `Three-Column Comparison Studio`:
    - Column 1: Student Submission (exact entries).
    - Column 2: Gold-Standard Ground Truth Answer Key (unmasked authoritative answers).
    - Column 3: AI Assessment Scorecard (4 pillars: 25 pts each = 100 pts total) + findings.
  - `Interactive Score Calibration Slider`: 0% to 100% slider allowing faculty to override provisional AI scores.
  - `Mentor Qualitative Notes`: Textarea for pedagogical coaching feedback.
  - `[ Approve Work & Release Score ]`: Finalizes the grade, commits mentor feedback to SQLite, and unlocks the complete scorecard and ground-truth answer keys to the student.
  - `[ Request Revision ]`: Bounces the case back to the student's workbench in draft state with specific faculty revision instructions.
- **Cohort Submissions (`assignments`)**: Full cohort oversight showing student submission timestamps and grades.
- **Teaching Slide Decks (`workspace`)**: 1-click generation of 5-slide Case Conference presentations for Google Slides.
- **What It Produces**: Calibrated & finalized student grade records in SQLite, unlocked student scorecards with pedagogical feedback, and case conference presentation outlines.

---

## Persona 3: The Arzon Admin Command Manual
*Target Audience: Executive Directors, Operations Leads, Program Managers*

### Key Responsibilities
1. **Executive Dashboard & Audit Ledger**: Monitor operational KPIs, cohort velocity, average pillar performance, and cryptographic audit trails.
2. **Synthetic Case Generation**:
   - Launch LLM generation via **Google Gemini API** with strict schema validation.
   - Fall back to the internal **Clinical Pharmacology Deterministic Engine** when API keys are unconfigured.
   - Conduct human-in-the-loop review to modify or approve staged cases before publishing to the library.
3. **PDF Clinical Case Importer**:
   - Upload spontaneous reports, clinical trial PDFs, CIOMS-I forms, or literature articles.
   - Automatically extract structured ICSR entities with SHA-256 source tracking.
   - Stage, verify, and publish extracted scenarios to the Case Vault.
4. **Case Vault Curation & Purge**:
   - Organize and filter cases across therapeutic areas (Oncology, Cardiology, Neurology, Immunology).
   - Maintain immutable version histories (`case_versions`).
   - Execute cascade deletions of test cases, wiping associated submissions, assessments, and reviews.
5. **Cohort Task Allocation**:
   - Assign cases by batch or individually to cohorts (e.g., Pharm.D 2026-Q1).
   - Set due dates with Google Calendar alert links.
6. **Google Workspace Sync**:
   - Export case briefs to **Google Docs**.
   - Export cohort gradebooks to **Google Sheets**.
   - Generate slide outlines in **Google Slides**.
   - Maintain supporting literature in **Google Drive**.
7. **Identity & Security Hardening**:
   - Enforce cryptographic HMAC-SHA256 JWT tokens.
   - Enforce mandatory password rotation for initial accounts (min 10 chars, uppercase, lowercase, number, symbol).

### Interfaces, Buttons & What They Produce (Admin Face)
- **Executive Command Dashboard (`dashboard`)**:
  - 6 Real-time KPI Cards: Total Cases (Approved vs Drafts), Active Assignments, Completion Velocity Rate %, Pending Faculty Reviews, Overdue Submissions, Average Cohort Score.
  - Real-time student performance ledger.
  - Tamper-evident 21 CFR Part 11 compliant audit log.
- **AI Case Generator (`generator`)**:
  - Controls: Therapeutic Area selector, Difficulty selector, Suspect Drug & Reaction Type inputs, Complexity tier, Batch count selector (1-5), Reporter Type dropdown, Custom Clinical Notes.
  - `[ Generate Synthetic ICSR Case(s) ]`: Synthesizes clinical scenarios using Google Gemini LLM or deterministic pharmacology fallback.
  - Split-Screen Staging: Left pane (Clinical dossier), Right pane (Gold-Standard reference key).
  - `[ Publish to Case Vault ]`: Commits scenario into `cases` and `reference_keys` in SQLite.
- **PDF Case Importer (`importer`)**:
  - File upload zone for clinical PDFs and CIOMS-I forms.
  - `[ Upload & Extract Clinical Entities ]`: Server extracts text, computes SHA-256 hash, and runs clinical parser.
  - `[ Load Sample PDF Case ]`: Built-in demo scenario for immediate testing.
  - `[ Save & Publish to Case Vault ]`: Commits verified structured case to SQLite.
- **Cohort Allocator (`assignments`)**:
  - `[ + Create Cohort Assignment ]`: Assigns case to student or entire cohort with deadline and instructions. Produces assignments in SQLite and Google Calendar URLs.
- **Case Vault Management (`cases`)**:
  - `[ View Full Dossier ]`: Inspects clinical data and answer keys.
  - `[ Delete / Cascade Purge Case ]`: Permanently purges scenario and cascaded submissions, assessments, and reviews with cryptographic audit log entry.
- **Google Workspace Hub (`workspace`)**:
  - `[ Export Full Gradebook to CSV/Sheets ]`: Live CSV download of student grades and cohort metrics.
  - `[ Generate Executive Case Brief (Docs) ]`: Formatted HTML/Markdown brief.
  - `[ Generate 5-Slide Presentation Deck (Slides) ]`: 5-slide case conference outline.
  - `[ Add to Google Calendar URL ]` & `[ Download .ICS File ]`: Calendar sync for deadlines.
- **What It Produces**: Version-controlled simulation catalog, CSV gradebooks, executive briefs, presentation decks, and compliance audit logs.

---

## Tri-Persona Responsibilities & Permissions Matrix

| Platform Capability | Student Role | Mentor Role | Arzon Admin Role |
|:---|:---:|:---:|:---:|
| **Browse Case Library** | Approved Only | Full Dossier + Keys | Full Dossier + Admin Tools |
| **Ground-Truth Reference Keys** | Air-Gapped Masked | Full Visibility | Full Visibility & Curation |
| **PV Workbench Case Processing** | Full Submissions | Faculty Preview Mode | Admin Preview Mode |
| **Provisional AI Score Visibility** | Masked until Review | Immediate Visibility | Immediate Visibility |
| **Calibrate Scores & Sign-Off** | Prohibited | Authorized Reviewer | Authorized Override |
| **Generate Synthetic Cases (Gemini/Engine)** | Prohibited | Prohibited | Full Pipeline Access |
| **Import & Parse Clinical PDFs** | Prohibited | Prohibited | Full Pipeline Access |
| **Delete / Purge Case Vault Records** | Prohibited | Prohibited | Cascade Deletion (Admin Only) |
| **Cohort Allocations & Deadlines** | Prohibited | View Cohort Status | Create & Manage |
| **Google Workspace Synchronization** | Prohibited | Teaching Deck Outlines | Full Integration |
