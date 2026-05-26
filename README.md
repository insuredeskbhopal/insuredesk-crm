<p align="center">
  <img src="docs/banner.png" width="100%" alt="BIMAHEADQUARTER Banner"/>
</p>

# BIMAHEADQUARTER

<div align="center">

![Next.js 15](https://img.shields.io/badge/Next.js-15.3-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Prisma ORM](https://img.shields.io/badge/Prisma-6.8-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql)
![Vanilla CSS](https://img.shields.io/badge/CSS3-Vanilla-1572B6?style=for-the-badge&logo=css3)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <img src="https://img.shields.io/github/stars/ABHISHEK9009/bimaheadquarter?style=social" />
  <img src="https://img.shields.io/github/forks/ABHISHEK9009/bimaheadquarter?style=social" />
  <img src="https://img.shields.io/github/issues/ABHISHEK9009/bimaheadquarter" />
</p>

**BIMAHEADQUARTER** is a production-ready insurance operations platform built to automate policy intake, OCR extraction, customer portfolio management, analytics, and reporting workflows for insurance agencies and enterprise brokerage teams. It visualizes real-time insurance performance analytics.

[Key Features](#key-features) • [Platform Screenshots](#-platform-screenshots) • [Tech Stack](#-tech-stack) • [System Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [API Directory](#-api-directory) • [Roadmap](#-roadmap)

</div>

---

## 📋 Project Overview

**BIMAHEADQUARTER** is a client-centric, production-ready software solution designed for modern insurance brokerages, agencies, and financial firms. It replaces labor-intensive manual policy entry with a robust, rule-based OCR PDF extraction engine that pulls key policy variables directly from carrier documents (e.g., ICICI Lombard, MSME Suraksha Kavach policies, and MPWLC hypothecations) and stores them in a relational database for instant search, filtering, and reporting.

The platform provides a modern dashboard that enables administrators to manage customers, track policy lifecycles, identify impending expirations, and export structured JSON data, while maintaining access to original PDF documents.

---

## 💡 Why BIMAHEADQUARTER

Traditional insurance workflows rely heavily on manual data entry, fragmented spreadsheets, and repetitive administrative work.

BIMAHEADQUARTER centralizes the entire policy lifecycle into a modern AI-powered workflow system that reduces processing time, improves reporting accuracy, and scales insurance operations efficiently.

---

## 🔥 Key Features

### ⚡ 1. Bulk PDF Policy Intake & Extraction
- **Batch Processing**: Drag-and-drop multiple policy PDFs at once. The platform processes them in parallel.
- **Rule-Based Extractors**: Scans raw PDF text streams using optimized regular expressions to identify insured name, policy number, premium, sum insured, dates, contact numbers, risk locations (district/tehsil), and carrier.
- **Payload Sanitization**: Automatic normalization of currency symbols, date string formats, and contact phone numbers.

### 📊 2. Real-Time Dashboard & Reporting
- **Performance metrics**: Track Total Premium under management, Total Sum Insured, active policies, and average policy size.
- **Quality Audits**: Proactively flags policies missing critical information (e.g., missing phone number, blank policy number, absent premium, or missing PDF attachments).
- **Location & Carrier Insights**: Automatically groups and ranks premium distributions by district (e.g., tehsil, district level) and insurance company.

### 👥 3. Smart Customer Relationship Management (CRM)
- **Automatic Client Profiling**: Reconstructs complete customer portfolios automatically by grouping policy records by the insured name.
- **Profile Cards**: Displays client contact info, total premium contributed, and historical policy logs.
- **Easy Policy Association**: View all coverages associated with a single client profile inside a consolidated page.

### 🔧 4. Flexible Administrator Control Panel
- **Custom Metadata Fields**: Configure custom keys and descriptors for policies.
- **Original PDF Archival**: High-fidelity storage of the raw PDF bytes in PostgreSQL so users can download original policy files anytime.
- **Clean Search & Filters**: Instant full-text search across all policy descriptions, risk locations, and client names.

---

## 🖼️ Platform Screenshots

### Dashboard
<img src="docs/dashboard.png" width="100%" />

### Analytics & Reporting
<img src="docs/analytics.png" width="100%" />

### PDF Upload System
<img src="docs/upload.png" width="100%" />

---

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js 15 (App Router)](https://nextjs.org/) for Server-Side Rendering (SSR) and React Server Components (RSC).
- **Core Library**: [React 19](https://react.dev/) utilizing modern Hooks and concurrent rendering.
- **Database ORM**: [Prisma ORM](https://www.prisma.io/) as a type-safe database layer.
- **Database Engine**: [PostgreSQL](https://www.postgresql.org/) (Compatible with Neon serverless Postgres connection pooling).
- **Styling**: High-performance Vanilla CSS with a customized dark mode design system (`app/ui/dashboard.css`).
- **Icons**: [Lucide React](https://lucide.dev/) for crisp, scalable vectors.
- **PDF Extraction Engine**: `pdf-parse` for fast metadata extraction from binary PDF buffers.

---

## 📐 System Architecture

Below is the workflow and data flow of the policy intake and analytics engine:

```mermaid
flowchart TD
    subgraph Client
        UI[Next.js Dashboard UI]
        Upload[Drag & Drop PDFs]
    end

    subgraph "API Layer (Next.js Routes)"
        API_Upload[POST /api/records/upload]
        API_Records[GET/POST/DELETE /api/records]
        API_Download[GET /api/records/:id/pdf]
    end

    subgraph "Intake Engine (lib/)"
        Val_File[upload-validation.js]
        Parser[pdf-extractor.cjs]
        Val_Record[record-validation.js]
        Normalizer[records.js]
    end

    subgraph "Database Layer"
        Prisma[Prisma Client]
        DB[(PostgreSQL Database)]
    end

    Upload -->|Multipart FormData| API_Upload
    API_Upload --> Val_File
    Val_File -->|Valid PDF Buffer| Parser
    Parser -->|Raw Extracted JSON| Val_Record
    Val_Record -->|Sanitized Payload| Prisma
    Prisma -->|Upsert/Create| DB
    DB -->|Read Policy Data| API_Records
    API_Records -->|JSON Response| UI
    UI -->|Trigger Download| API_Download
    API_Download -->|Binary PDF Stream| Client
```

---

## ⚙️ OCR & PDF Extraction Logic

The system utilizes a specialized, deterministic, rule-based regex extraction parser located in [lib/pdf-extractor.cjs](file:///c:/Users/Wim11/Desktop/PDF%20Read/lib/pdf-extractor.cjs).

1. **Text Extraction**: The binary buffer of the uploaded file is processed using `pdf-parse`, converting the visual pages into a contiguous text stream.
2. **Text Cleaning**: Whitespace, newlines, null bytes, and tab characters are normalized to prevent extraction misalignment.
3. **Regex Pattern Matching**:
   - **Insured Party**: Looks for standard structural markers like `Name of the Insured...Policy No` or `following insured:...PROP`.
   - **Financial Balances**: Matches currency symbols (`\(` followed by `\)` or `` ` ``) and normalizes them into decimals (e.g. `25000` -> `25000.00`).
   - **Risk Coordinates**: Extracts `District` and `Tehsil` attributes based on geographical keywords.
   - **Policy Identifiers**: Detects policy numbers, durations, starts, and expirations using strict validation groups.
4. **Group Derivation**: If a client group (like `MPWLC`) is mentioned inside the text or file name, it is automatically tagged to keep records consolidated under corporate umbrellas.

---

## 📁 Directory Structure

```text
bimaheadquarter/
├── app/
│   ├── analytics/
│   │   ├── [reportId]/
│   │   │   └── page.js          # Drill-down analytics report view
│   │   └── page.js              # Real-time KPIs, charts, and quality matrices
│   ├── api/
│   │   ├── records/
│   │   │   ├── [id]/
│   │   │   │   └── pdf/
│   │   │   │       └── route.js # PDF download streaming API
│   │   │   │   └── route.js     # Single record DELETE route
│   │   │   ├── upload/
│   │   │   │   └── route.js     # Parallel bulk-upload parser API
│   │   │   └── route.js         # Fetch policy list & manual additions
│   │   └── settings/
│   │       └── route.js         # Settings & schema customization API
│   ├── components/              # Shared dashboard widgets & tables
│   ├── lib/                     # Global reporting helper functions
│   ├── ui/
│   │   ├── dashboard.js         # Core Single Page client dashboard interface
│   │   └── dashboard.css        # Dashboard styling & color system
│   ├── layout.js                # App shell
│   └── page.js                  # Main entry page loader
├── lib/
│   ├── analytics.js             # Statistics, client aggregations, and quality scoring
│   ├── pdf-extractor.cjs        # Main rule-based PDF OCR extractor
│   ├── prisma.js                # Singleton Prisma client instance
│   ├── record-validation.js     # Field sanitizer and policy structure checks
│   ├── records.js               # Normalizer for database output formats
│   ├── search.js                # Indexing helpers for fast text lookups
│   ├── security.js              # Validation headers and administrative checks
│   └── upload-validation.js     # File-size limits and magic number signature verification
├── prisma/
│   ├── schema.prisma            # PolicyRecord Database schema
│   └── migrations/              # Database migration records
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js (v18.x or above recommended)
- PostgreSQL Database (Neon serverless or local instance)

### 💾 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ABHISHEK9009/bimaheadquarter.git
   cd bimaheadquarter
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of the project:
   ```env
   # PostgreSQL Connection String (supports poolers e.g., Neon)
   DATABASE_URL="postgresql://user:password@hostname:5432/dbname?sslmode=require&connection_limit=1&pool_timeout=20"
   ```

4. **Initialize Prisma Database Schema:**
   Push the schema to your database instance and generate the Prisma Client:
   ```bash
   npx prisma db push
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser to explore the dashboard.

6. **Create a Production Build:**
   ```bash
   npm run build
   ```
   Run `npm start` to run the production build locally.

---

## 📡 API Directory

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/records` | Fetches all parsed policy records from the database. |
| `POST` | `/api/records` | Manually inserts a new policy record (no PDF parsing required). |
| `POST` | `/api/records/upload` | Processes multipart/form-data PDF file uploads and triggers the extraction engine. |
| `DELETE` | `/api/records/[id]` | Deletes a policy record from the database. |
| `GET` | `/api/records/[id]/pdf` | Streams back the raw PDF file binary corresponding to the policy. |

---

## 🛡️ Security, Performance & Scalability

### 🔒 Data Security
- **Binary Encapsulation**: Original policy PDFs are stored in binary format directly within the database, bypassing filesystem vulnerability risks.
- **Validation Controls**: All files undergo strict size checks (under 5MB) and type validation via file headers to prevent malicious execution payloads.
- **Safe HTML and Inputs**: Payloads are sanitized before write-time, preventing typical persistent Cross-Site Scripting (XSS).

### 🚀 Optimization and Scalability
- **Connection Stability**: Database pooled connections are restricted with low timeouts (`pool_timeout=20`) and optimized limits (`connection_limit=1`) to prevent query exhaustion when hosted on serverless providers like Neon.
- **Parallel Extraction**: Intake processing uses async Node streams, allowing concurrent file parsing without locking the main event thread.
- **Client Grouping**: Indexes client listings dynamically in-memory during page load to scale rendering times.

---

## ✅ Production Status

| System | Status |
|---|---|
| OCR Extraction Engine | ✅ Stable |
| PostgreSQL Database | ✅ Connected |
| Prisma ORM | ✅ Optimized |
| Analytics Dashboard | ✅ Operational |
| PDF Upload Pipeline | ✅ Active |
| API Layer | ✅ Production Ready |
| Build System | ✅ Stable |
| Authentication Layer | 🚧 Planned |

---

## 🗺️ Roadmap

- [ ] **AI-assisted Parsing**: Integrate LLM API fallbacks for complex and unstructured carrier formats.
- [ ] **Automated Reminders**: Email/SMS notifications to customers when policy renewals approach.
- [ ] **Role-Based Access Control (RBAC)**: Support for Broker, Agent, and Auditor profiles with custom read-write scopes.
- [ ] **Payment Gateways**: Online premium payment collection links generated right from the dashboard.

---

## ☁️ Deployment

The platform can be deployed on:

- Vercel
- Railway
- Render
- AWS
- DigitalOcean

Recommended:
- Vercel + Neon PostgreSQL

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the Project.
2. Create a Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

### BIMAHEADQUARTER
AI-Powered Insurance Workflow Infrastructure

Built with Next.js, Prisma & PostgreSQL

</div>
