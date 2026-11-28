<div align="center">

# 🏢 InsureDesk CRM / BimaHeadquarter
### Enterprise-Grade Insurance Brokerage & CRM Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Automated_Testing-729B1B?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)

**InsureDesk CRM** is a production-grade Insurance Agency and Brokerage Management Platform designed for high-volume insurance operations, multi-insurer PDF parsing, automated renewal lifecycles, real-time WhatsApp customer engagements, and enterprise analytics.

---

</div>

## 📑 Table of Contents
- [Executive Overview](#-executive-overview)
- [Key Features & Modules](#-key-features--modules)
- [System Architecture](#-system-architecture)
- [AI & Deterministic Policy Extraction Engine](#-ai--deterministic-policy-extraction-engine)
- [WhatsApp Gateway & Automated Engagement](#-whatsapp-gateway--automated-engagement)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
- [Operational Scripts & CLI Tooling](#-operational-scripts--cli-tooling)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Architecture Constitution](#-security--architecture-constitution)

---

## 🌟 Executive Overview

InsureDesk CRM bridges the operational gap between insurance brokers, intermediaries, insurers, and end policyholders:

- **Lightning-Fast Policy Ingestion**: Automated extraction of complex schedule PDFs from India's top General and Health Insurers with 100% field accuracy (OD, TP, GST, Add-ons, NCBs, Hypothecation, Vehicle Specs).
- **Proactive Renewal Management**: Distinct renewal workflows isolated from primary business production figures, with automated renewal pipelines and customer follow-up alerts.
- **Auditable Financials & Production**: End-of-Day (EOD), Month-to-Date (MTD), Year-to-Date (YTD) production metrics, intermediary commissions, and branch reconciliations.
- **Omnichannel WhatsApp Gateway**: Instant policy delivery, automated birthday greetings with customized card rendering, and claim status alerts via a dedicated WhatsApp microservice.
- **Client Self-Service Portal**: Clean public interface for client policy lookup, document retrieval, and instant claim notifications.

---

## 🚀 Key Features & Modules

```
                        ┌────────────────────────────────────────┐
                        │         INSUREDESK CRM SUITE           │
                        └───────────────────┬────────────────────┘
                                            │
         ┌──────────────────┬───────────────┴──────────────┬──────────────────┐
         ▼                  ▼                              ▼                  ▼
┌────────────────┐  ┌────────────────┐            ┌────────────────┐  ┌────────────────┐
│   OPERATIONS   │  │    RENEWALS    │            │    CLAIMS &    │  │   WHATSAPP     │
│   & OCR ENGINE │  │    PIPELINE    │            │  ENDORSEMENTS  │  │   GATEWAY      │
└────────────────┘  └────────────────┘            └────────────────┘  └────────────────┘
```

### 1. 🤖 Intelligent Policy Ingestion (OCR & PDF Extraction)
- Multi-page PDF schedule parser with exact insurer matching and isolated category scoping.
- Instant extraction of vehicle details (Make, Model, Chassis, Engine, RTO, Body Type, Seating, Cubic Capacity, Manufacturing Year).
- Granular financial breakdown: Basic OD, Third-Party Liability, Net Premium, CGST/SGST/IGST, Add-ons (Zero Dep, Engine Protect, RSA, Consumables, Key Protect, Tyre Protect, RTI).
- Active TP details detection for Standalone Own Damage policies (TP Policy Number, TP Validity, TP Insurer).

### 2. 🔄 Renewals & Pipeline Management
- **Rule-Bound Isolation**: Renewals are treated as active tasks and strictly excluded from production calculations until issued.
- Automatic expiration tracking with 30, 15, 7, and 1-day alert triggers.
- Multi-channel notification pipeline (SMS, Email, WhatsApp).

### 3. 💬 WhatsApp Gateway & Client Engagement
- Standalone multi-session Node.js microservice (`whatsapp-gateway`).
- Dynamic birthday card canvas renderer (`src/lib/birthday/card-renderer.js`) with automated schedule queue.
- Welcome messages with digital policy card attachments sent upon policy issuance.

### 4. 📊 Financial Analytics & Operations Hub
- Branch and Intermediary commission calculation matrices.
- Production analytics across LOBs (Private Car, Commercial Vehicle, Two Wheeler, Health, Fire, Burglary, Marine).
- Transactional policy date adjustment engine with full audit trail logging.

### 5. 🛡️ Client & Customer Portal
- Clean, public client login (`/login`) completely decoupled from administrative CRM routes (`/crm/*`).
- Fast policy downloads, claims initiation, and real-time support requests.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend & Portals"]
        AdminUI["Admin & Operations Dashboard\n(Next.js 15 App Router)"]
        PublicUI["BimaHeadquarter Public Website\n& Customer Portal"]
    end

    subgraph CoreEngine["Application Core"]
        AuthModule["RBAC & Session Auth"]
        OCREngine["PDF Extraction Registry\n& Isolated Insurer Trainers"]
        RenewalEngine["Renewal Pipeline & Task Manager"]
        BirthdayEngine["Birthday Automation\n& Canvas Renderer"]
    end

    subgraph ServiceLayer["Services & Storage"]
        PrismaORM["Prisma Client & Accelerate"]
        PostgresDB[("PostgreSQL\nPrimary Storage")]
        WAGateway["WhatsApp Gateway Microservice\n(Node.js / Express / Baileys)"]
        StorageEngine["Document Vault / Storage"]
    end

    AdminUI --> AuthModule
    PublicUI --> AuthModule
    AuthModule --> PrismaORM
    AdminUI --> OCREngine
    OCREngine --> PrismaORM
    AdminUI --> RenewalEngine
    RenewalEngine --> PrismaORM
    AdminUI --> BirthdayEngine
    BirthdayEngine --> WAGateway
    RenewalEngine --> WAGateway
    PrismaORM --> PostgresDB
    OCREngine --> StorageEngine
```

---

## 🎯 AI & Deterministic Policy Extraction Engine

Extraction rules are strictly isolated under `src/lib/policies/pdf/training/<insurer>/<category>.cjs` to ensure zero cross-insurer regressions:

| Insurer | Supported Categories | Extraction Highlights |
| :--- | :--- | :--- |
| **ICICI Lombard** | Motor (OD, Package), Health (Elevate) | Full add-on breakdown, TP policy cross-referencing, NCB validation |
| **HDFC ERGO** | Motor (Private Car, Commercial), Health (Optima Secure) | Package vs Net OD differentiation, CSC intermediary mapping |
| **IFFCO-TOKIO** | Motor (Commercial Signa, Two Wheeler, Private Car) | Dense GST table extraction, wrapped chassis/engine recovery |
| **The New India Assurance** | Motor (Commercial Liability, Private Car), Health | Schedule column merging resolution, comprehensive TP schedules |
| **Bajaj Allianz** | Motor (Commercial Liability, Drive Assure), Health | GSTIN, Hypothecation, Gross Vehicle Weight & Capacity |
| **Tata AIG** | Motor (Auto Secure), Health, Warehouse | Multi-schedule property parsing, Risk location extraction |
| **Care Health** | Health | Proposer relations, sum insured tiers, deductible mapping |
| **United India** | Motor, Health, Warehouse, Burglary | Non-motor line of business property and content schedules |
| **Go Digit** | Motor (Private Car, Commercial) | Fast digital schedule and covernote ingestion |
| **Royal Sundaram** | Motor | Layout-aware table and coverage extraction |

---

## 📂 Repository Structure

```text
insuredesk-crm/
├── src/
│   ├── app/                      # Next.js App Router (Pages, APIs, Dashboard)
│   │   ├── (public)/             # Public website & client portal (/login)
│   │   ├── crm/                  # Protected CRM dashboards & operations
│   │   └── api/                  # RESTful API endpoints
│   ├── components/               # Enterprise UI Components (Modals, Tables, Forms)
│   └── lib/
│       ├── birthday/             # Canvas-based automated greeting engine
│       ├── policies/             # Core policy schemas & business logic
│       │   └── pdf/
│       │       ├── training/     # Scoped PDF training modules by insurer
│       │       └── utils/        # Neutral parsing helpers (regex, dates, amounts)
│       └── whatsapp/             # WhatsApp automation & message queue
├── prisma/                       # Database schema, migrations, seeders
├── public/                       # Static brand assets, fonts, icons
├── scripts/                      # Operational tooling (CLI date mover, DB audits)
├── storage/                      # Policy document storage vault (local/cloud)
├── tests/                        # Automated unit, integration & isolation tests
├── whatsapp-gateway/             # Dedicated Node.js WhatsApp microservice
├── AGENTS.md                     # Core CRM development rules & guidelines
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS design system
└── package.json                  # Dependencies and execution scripts
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL**: `v14+`

### Private workspace and test inputs

The web app and gateway install from their respective lockfiles. Local business exports, reconciliation reports, database backups, publishing assets and case-specific utilities live in `operations/`. Run batch commands from the repository root. November and December import workbooks live in `operations/renewals/`. The upload vault remains at `storage/`.

For a fresh developer checkout or a CI job running policy-document tests, obtain the private fixture pack through your existing authorized channel. Copy the **contents** of `operations/private-fixtures/tests/` into `tests/`, preserving the four directory names. Some integration cases also read locally provisioned PDFs in `storage/`. Existing workspaces can use relative links to the private pack. Do not add customer documents to Git.

The private relocation manifest under `operations/audit-2026-11-28/` records original paths, new paths, compatibility links, Git status at relocation and SHA-256 hashes. The accompanying audit report covers restoration and verification.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/insuredeskbhopal/insuredesk-crm.git
   cd insuredesk-crm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your database and service keys:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/insuredesk"
   DIRECT_URL="postgresql://user:password@localhost:5432/insuredesk"
   NEXTAUTH_SECRET="your-secure-nextauth-secret"
   WHATSAPP_GATEWAY_URL="http://localhost:3001"
   WHATSAPP_GATEWAY_API_KEY="your-gateway-key"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛠️ Operational Scripts & CLI Tooling

InsureDesk CRM includes CLI utilities for database operations and audits:

### Move / Backdate Policy Record
Update a policy's saved date, uploaded file timestamp, and create an immutable audit record:
```bash
node scripts/move-policy-date.cjs <POLICY_NUMBER> <DD/MM/YYYY>
# Example:
node scripts/move-policy-date.cjs 3001/O/452859230/00/000 25/08/2026
```

---

## 🧪 Testing & Quality Assurance

Run the automated test suite across all training modules and extraction pipelines:

```bash
# Run all unit and PDF extraction tests
npm test

# Run extraction training isolation test suite
npx vitest run tests/extraction-training-isolation.test.js

# Run specific insurer extraction test suites
npx vitest run tests/icici-lombard-motor-training.test.js
npx vitest run tests/iffco-tokio-motor-extraction.test.js
npx vitest run tests/bajaj-allianz-motor-training.test.js
npx vitest run tests/hdfc-ergo-motor-extraction.test.js
npx vitest run tests/new-india-motor-extraction.test.js
```

---

## 🔒 Security & Architecture Constitution

- **Public vs CRM Separation**: Internal administrative routes (`/crm/*`) are strictly decoupled and never exposed on public-facing links or buttons.
- **Deterministic Training Isolation**: Extraction rules for an insurer/category cannot bleed into or mutate another scope.
- **Modal Centering & Backdrop Blur**: All dialog overlays render through `document.body` via `ModalPortal` with full vertical/horizontal centering and backdrop blur.
- **Data Safety First**: Original uploaded PDFs, document history, and audit trails are preserved immutably. Soft deletes and audit logs are enforced across all primary records.

---

<div align="center">

**Built with precision for InsureDesk IMF Pvt. Ltd. & BimaHeadquarter**  
*Empowering modern insurance operations with speed, reliability, and enterprise compliance.*

</div>
