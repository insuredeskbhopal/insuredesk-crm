# Graph Report - .  (2026-06-19)

## Corpus Check
- Large corpus: 393 files ╖ ~710,148 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1322 nodes · 2847 edges · 102 communities (88 shown, 14 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Claims|Auth & Claims]]
- [[_COMMUNITY_Extraction & Review|Extraction & Review]]
- [[_COMMUNITY_Endorsements & Template|Endorsements & Template]]
- [[_COMMUNITY_Storage & Uploads|Storage & Uploads]]
- [[_COMMUNITY_Reporting & Business|Reporting & Business]]
- [[_COMMUNITY_Policies & Field|Policies & Field]]
- [[_COMMUNITY_Insurance & Metadata|Insurance & Metadata]]
- [[_COMMUNITY_Center & Operations|Center & Operations]]
- [[_COMMUNITY_Operations & Claimsmanagementpage|Operations & Claimsmanagementpage]]
- [[_COMMUNITY_Records & Scoped|Records & Scoped]]
- [[_COMMUNITY_Public & Contact|Public & Contact]]
- [[_COMMUNITY_Dashboard & Field|Dashboard & Field]]
- [[_COMMUNITY_Understanding & Understanddocument|Understanding & Understanddocument]]
- [[_COMMUNITY_Endorsements & Endorsement|Endorsements & Endorsement]]
- [[_COMMUNITY_Insurance & Services|Insurance & Services]]
- [[_COMMUNITY_Reporting & Records|Reporting & Records]]
- [[_COMMUNITY_Analytics & Analyticsreports|Analytics & Analyticsreports]]
- [[_COMMUNITY_Dashboard & Upload|Dashboard & Upload]]
- [[_COMMUNITY_Dates & Renewals|Dates & Renewals]]
- [[_COMMUNITY_Auth & User|Auth & User]]
- [[_COMMUNITY_Customer & Profiling|Customer & Profiling]]
- [[_COMMUNITY_Tsconfig & Compileroptions|Tsconfig & Compileroptions]]
- [[_COMMUNITY_Dashboard & Constants|Dashboard & Constants]]
- [[_COMMUNITY_Dashboard & Manual|Dashboard & Manual]]
- [[_COMMUNITY_Package & Dependencies|Package & Dependencies]]
- [[_COMMUNITY_Package & Devdependencies|Package & Devdependencies]]
- [[_COMMUNITY_Customer & Profiles|Customer & Profiles]]
- [[_COMMUNITY_Upload & Dashboard|Upload & Dashboard]]
- [[_COMMUNITY_Intelligence & Schemaengine|Intelligence & Schemaengine]]
- [[_COMMUNITY_Workcenterpage & Operations|Workcenterpage & Operations]]
- [[_COMMUNITY_Period & Buildpivotrows|Period & Buildpivotrows]]
- [[_COMMUNITY_Package & Scripts|Package & Scripts]]
- [[_COMMUNITY_Users & Usermanagement|Users & Usermanagement]]
- [[_COMMUNITY_Intelligence & Dynamicextractor|Intelligence & Dynamicextractor]]
- [[_COMMUNITY_Validation & Records|Validation & Records]]
- [[_COMMUNITY_Work & Today|Work & Today]]
- [[_COMMUNITY_Slug & Blog|Slug & Blog]]
- [[_COMMUNITY_Policies & Extractor|Policies & Extractor]]
- [[_COMMUNITY_Endorsementslistpage & Operations|Endorsementslistpage & Operations]]
- [[_COMMUNITY_Intelligence & Trainingmemory|Intelligence & Trainingmemory]]
- [[_COMMUNITY_Recordstable & Column|Recordstable & Column]]
- [[_COMMUNITY_Dashboard & Getreviewfieldvalue|Dashboard & Getreviewfieldvalue]]
- [[_COMMUNITY_Dashboard & Renewals|Dashboard & Renewals]]
- [[_COMMUNITY_Found & Notfoundpage|Found & Notfoundpage]]
- [[_COMMUNITY_Slug & Site|Slug & Site]]
- [[_COMMUNITY_Middleware & Site|Middleware & Site]]
- [[_COMMUNITY_Backup & Scripts|Backup & Scripts]]
- [[_COMMUNITY_Callback & Escapehtml|Callback & Escapehtml]]
- [[_COMMUNITY_Intelligence & Confidenceengine|Intelligence & Confidenceengine]]
- [[_COMMUNITY_Package & Name|Package & Name]]
- [[_COMMUNITY_Bajaj & Warehouse|Bajaj & Warehouse]]
- [[_COMMUNITY_Icici & Warehouse|Icici & Warehouse]]
- [[_COMMUNITY_Iffco & Warehouse|Iffco & Warehouse]]
- [[_COMMUNITY_Iffco & Workmen|Iffco & Workmen]]
- [[_COMMUNITY_Motor & Extraction|Motor & Extraction]]
- [[_COMMUNITY_Tata & Warehouse|Tata & Warehouse]]
- [[_COMMUNITY_About & Aboutlayout|About & Aboutlayout]]
- [[_COMMUNITY_Blog & Bloglayout|Blog & Bloglayout]]
- [[_COMMUNITY_Marine & Insurance|Marine & Insurance]]
- [[_COMMUNITY_Policies & Extraction|Policies & Extraction]]
- [[_COMMUNITY_Policy & Types|Policy & Types]]
- [[_COMMUNITY_Prisma & Seed|Prisma & Seed]]
- [[_COMMUNITY_Breadcrumbs & Public|Breadcrumbs & Public]]
- [[_COMMUNITY_Search & Records|Search & Records]]
- [[_COMMUNITY_Scripts & Regex|Scripts & Regex]]
- [[_COMMUNITY_Services & Metadata|Services & Metadata]]
- [[_COMMUNITY_Next & Config|Next & Config]]
- [[_COMMUNITY_Scripts & Resetadminpassword|Scripts & Resetadminpassword]]

## God Nodes (most connected - your core abstractions)
1. `verifyJWT()` - 78 edges
2. `getTenantFilter()` - 50 edges
3. `getAuditMetadata()` - 45 edges
4. `logAudit()` - 44 edges
5. `normalizeRecord()` - 32 edges
6. `loadScopedPolicyRecords()` - 25 edges
7. `startOfDay()` - 23 edges
8. `getReviewValidation()` - 20 edges
9. `loadReportingCenterData()` - 19 edges
10. `sanitizeRecordPayload()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `CustomerProfilingPage()` --calls--> `normalizeIndianPhone()`  [INFERRED]
  src/app/(dashboard)/dashboard/manual-entry/customer-profiling/page.js → src/lib/customer-profiles/utils.js
- `BusinessIntelligenceIndexPage()` --calls--> `loadReportingCenterData()`  [INFERRED]
  src/app/(dashboard)/dashboard/reports/page.js → src/app/lib/reporting/business-intelligence.js
- `OperationsModulePage()` --calls--> `NotFound()`  [INFERRED]
  src/app/(dashboard)/operations/[module]/page.js → src/app/not-found.js
- `MarketingPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/[slug]/page.js → src/app/not-found.js
- `PUT()` --calls--> `sanitizeCustomerProfilePayload()`  [INFERRED]
  src/app/api/customer-profiles/[id]/route.js → src/lib/customer-profiles/utils.js

## Import Cycles
- 1-file cycle: `src/app/(dashboard)/operations/customer-profiling/page.js -> src/app/(dashboard)/operations/customer-profiling/page.js`
- 1-file cycle: `src/app/(dashboard)/operations/manual-policy-entry/page.js -> src/app/(dashboard)/operations/manual-policy-entry/page.js`

## Communities (102 total, 14 thin omitted)

### Community 0 - "Auth & Claims"
Cohesion: 0.06
Nodes (91): POST(), getAuditMetadata(), logAudit(), GET(), comparePassword(), encodedSecret, getUserClaimsCache(), refreshUserClaims() (+83 more)

### Community 1 - "Extraction & Review"
Cohesion: 0.07
Nodes (61): AI_EXTRACTION_FIELDS, AMOUNT_FIELDS, buildExtractionReviewMessages(), buildPassiveReview(), buildPassiveReviewMessages(), buildValueCandidates(), compactAmount(), compactIdentifier() (+53 more)

### Community 2 - "Endorsements & Template"
Cohesion: 0.06
Nodes (38): createPdfCaptureClone(), generateEndorsementSchedulePdf(), getMissingScheduleFields(), waitForImages(), actionFromType(), buildChangeSummary(), buildEndorsementScheduleData(), buildFinalReviewedData() (+30 more)

### Community 3 - "Storage & Uploads"
Cohesion: 0.09
Nodes (41): GET(), POST(), { extractPolicyFromText }, require, cleanText(), extractPdfText(), extractTextFromPdf(), isTextQualityAcceptable() (+33 more)

### Community 4 - "Reporting & Business"
Cohesion: 0.07
Nodes (39): BusinessIntelligenceReportPage(), addDays(), applyDateAndFieldFilters(), applyPolicyFilters(), applyProfileFilters(), buildAccessDeniedReport(), buildActionCenter(), buildCategoryCards() (+31 more)

### Community 5 - "Policies & Field"
Cohesion: 0.10
Nodes (34): POST(), GET(), POST(), requireAuthenticatedUser(), bestMatch(), bestPolicyType(), classifyPolicyText(), exactPolicyTypeMatch() (+26 more)

### Community 6 - "Insurance & Metadata"
Cohesion: 0.05
Nodes (15): beVietnamPro, manrope, metadata, metadata, metadata, metadata, metadata, metadata (+7 more)

### Community 7 - "Center & Operations"
Cohesion: 0.12
Nodes (33): canWriteOperations(), requireSession(), ALLOWED_STATUSES, PATCH(), GET(), POST(), addDays(), addHours() (+25 more)

### Community 8 - "Operations & Claimsmanagementpage"
Cohesion: 0.07
Nodes (15): FUTURE_OPERATIONS_MODULES, getOperationsModule(), OPERATIONS_MODULES, OperationsModulePage(), CLAIM_FIELDS, ClaimsManagementPage(), DETAIL_FIELDS, EMPTY_CLAIM (+7 more)

### Community 9 - "Records & Scoped"
Cohesion: 0.15
Nodes (23): BulkUploadPage(), CustomerManagementPage(), CustomerProfilePage(), DashboardPage(), FieldSetupPage(), ManualPolicyEntryPage(), loadPolicyRecordTabCounts(), PolicyRecordsPage() (+15 more)

### Community 10 - "Public & Contact"
Cohesion: 0.12
Nodes (16): structuredData, structuredData, metadata, categories, BrandLogo(), LandingEffects(), contactRoutes, contactSchema (+8 more)

### Community 11 - "Dashboard & Field"
Cohesion: 0.11
Nodes (26): FieldSetupPanel(), buildClientProfiles(), COMMON_REVIEW_FIELDS, download(), FIELD_SETUP, getReviewCounts(), inferRequiredFields(), loadDashboardView() (+18 more)

### Community 12 - "Understanding & Understanddocument"
Cohesion: 0.10
Nodes (23): classifyDocument(), buildKeywordSignature(), crypto, detectLayout(), estimatePageCount(), findRepeatedLines(), detectSections(), SECTION_DEFINITIONS (+15 more)

### Community 13 - "Endorsements & Endorsement"
Cohesion: 0.17
Nodes (24): buildDocumentsFromPayload(), GET(), parseDate(), POST(), resolveEndorsementLinks(), canDeleteEndorsement(), canWriteEndorsement(), dateValue() (+16 more)

### Community 14 - "Insurance & Services"
Cohesion: 0.16
Nodes (6): ServiceDetailPage(), commonRelated, getRelatedServices(), getServicePageSchema(), servicesBySlug, serviceSlugs

### Community 15 - "Reporting & Records"
Cohesion: 0.15
Nodes (19): buildAnalytics(), buildClientProfiles(), findReportById(), getReportRecords(), groupRecords(), makeReportItem(), AnalyticsReportPage(), buildContextItems() (+11 more)

### Community 16 - "Analytics & Analyticsreports"
Cohesion: 0.11
Nodes (15): AnalyticsReports(), buildDonutGradient(), DonutReport(), getInsurerShortCode(), ReportBar(), KpiCard(), ReportPanel(), ReportRow() (+7 more)

### Community 17 - "Dashboard & Upload"
Cohesion: 0.11
Nodes (12): formatMoney(), parseMoney(), queueLabel(), progressWidth(), queueLabel(), getPageNumbers(), getStatusStyle(), statusLabel() (+4 more)

### Community 18 - "Dates & Renewals"
Cohesion: 0.20
Nodes (18): cleanMobile(), GET(), isUsefulContactName(), GET(), GET(), normalizeSummaryCounts(), calculateDaysLeft(), calculateRenewalStatus() (+10 more)

### Community 19 - "Auth & User"
Cohesion: 0.25
Nodes (17): getAuthenticatedUser(), requireSuperAdmin(), requireUserManager(), canManageRole(), canMutateUsers(), canOpenUserManagement(), getAssignableRoles(), getVisibleUserWhere() (+9 more)

### Community 20 - "Customer & Profiling"
Cohesion: 0.10
Nodes (11): CUSTOMER_TYPES, CustomerProfilingPage(), EMPTY_COUNTERS, EMPTY_FORM, EMPTY_SEARCH_RESULTS, getPageNumbers(), LOB_FIELDS, LOB_OPTIONS (+3 more)

### Community 21 - "Tsconfig & Compileroptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 22 - "Dashboard & Constants"
Cohesion: 0.15
Nodes (9): EMPTY_FORM, FIELD_SETUP, NAV_ITEMS, SEARCHABLE_CURRENT_PATHS, AppShell(), ROUTE_MAP, cachedJson(), getCache() (+1 more)

### Community 23 - "Dashboard & Manual"
Cohesion: 0.15
Nodes (12): buildProfileView(), CustomerProfileDetailPage(), FOLLOW_UP_OUTCOMES, formatMoney(), formatPolicyDetails(), formatTimelineRemark(), getStatusTone(), LOB_FIELDS (+4 more)

### Community 24 - "Package & Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, googleapis, html2canvas, jose, jspdf, jspdf-autotable, lucide-react (+10 more)

### Community 25 - "Package & Devdependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-config-next, eslint-plugin-react, jsdom, postcss, prettier (+10 more)

### Community 26 - "Customer & Profiles"
Cohesion: 0.19
Nodes (12): asText(), asUuidText(), CUSTOMER_PROFILE_FOLLOW_UP_OUTCOMES, CUSTOMER_PROFILE_STATUS_OPTIONS, CUSTOMER_PROFILE_TYPE_OPTIONS, formatPhoneForWhatsapp(), normalizeIndianPhone(), normalizePhone() (+4 more)

### Community 27 - "Upload & Dashboard"
Cohesion: 0.18
Nodes (10): FIELD_GROUPS, FUEL_TYPE_OPTIONS, PAYMENT_MODE_OPTIONS, reviewStatusLabel(), EmptyState(), PreviewField(), applyAiSuggestionToReviewField(), getEligibleAiSuggestion() (+2 more)

### Community 28 - "Intelligence & Schemaengine"
Cohesion: 0.18
Nodes (10): { buildFieldMap }, calculateSchemaMatch(), FORMAT_TO_SCHEMA, fs, path, ratio(), readSchema(), resolveSchema() (+2 more)

### Community 29 - "Workcenterpage & Operations"
Cohesion: 0.16
Nodes (6): endOfToday(), isToday(), startOfToday(), STATUS_LABELS, VIEWS, WorkCenterPage()

### Community 30 - "Period & Buildpivotrows"
Cohesion: 0.30
Nodes (14): buildPivotRows(), filterPremiumRecords(), formatDateKey(), formatDateTime(), getBasisLabel(), getIndiaDateParts(), getPremium(), getSavedDate() (+6 more)

### Community 31 - "Package & Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build:clean, clean, db:migrate-saas, dev, dev:clean, format (+6 more)

### Community 32 - "Users & Usermanagement"
Cohesion: 0.16
Nodes (8): EMPTY_FORM, getPageNumbers(), LOB_OPTIONS, ROLE_CARD_DESCRIPTIONS, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, UserManagement()

### Community 33 - "Intelligence & Dynamicextractor"
Cohesion: 0.29
Nodes (11): aliasBoost(), clamp(), confidenceForValue(), escapeRegExp(), extractField(), extractWithSchema(), matchNearLabel(), normalizeLabel() (+3 more)

### Community 34 - "Validation & Records"
Cohesion: 0.28
Nodes (11): addFields(), addUnique(), getMissingRequiredFields(), getReviewValidation(), asJson(), asNumber(), asRegistrationNumber(), asText() (+3 more)

### Community 35 - "Work & Today"
Cohesion: 0.33
Nodes (8): cleanPolicyType(), normalizePolicyFamily(), withRenewalPolicyDisplay(), buildTodayWorkSummary(), getRenewalActionLabel(), RENEWAL_WORK_ACTIONS, GET(), getActivityDetail()

### Community 36 - "Slug & Blog"
Cohesion: 0.27
Nodes (7): NotFound(), BLOG_POSTS, BlogSidebarForm(), BlogPostPage(), getRelatedServicesForBlog(), stripHtml(), generateMetadata()

### Community 37 - "Policies & Extractor"
Cohesion: 0.36
Nodes (10): clean(), escapeRegExp(), extractAfterAlias(), extractFieldsForSchema(), extractFieldValue(), FALLBACK_PATTERNS, fallbackForField(), firstMatch() (+2 more)

### Community 38 - "Endorsementslistpage & Operations"
Cohesion: 0.22
Nodes (3): EndorsementsListPage(), STATUSES, TYPES

### Community 39 - "Intelligence & Trainingmemory"
Cohesion: 0.27
Nodes (8): buildCorrectionId(), fs, isDuplicateRecentCorrection(), loadCorrections(), MEMORY_DIR, MEMORY_FILE, path, saveCorrection()

### Community 40 - "Recordstable & Column"
Cohesion: 0.33
Nodes (6): COLUMN_WIDTHS, DEFAULT_RECORD_COLUMNS, formatDate(), formatDateTime(), RecordsTable(), renderCell()

### Community 41 - "Dashboard & Getreviewfieldvalue"
Cohesion: 0.28
Nodes (9): getReviewFieldValue(), hasValue(), inferPolicyFamily(), inferPolicySchemaWithinGroup(), inferUploadSchema(), isFieldManualForUpload(), isManualRequiredField(), isRecognizedFuelType() (+1 more)

### Community 42 - "Dashboard & Renewals"
Cohesion: 0.29
Nodes (3): COL_HEADERS, CustomerProfilePage(), formatDate()

### Community 43 - "Found & Notfoundpage"
Cohesion: 0.38
Nodes (3): metadata, NotFoundPage(), quickLinks

### Community 44 - "Slug & Site"
Cohesion: 0.47
Nodes (4): MARKETING_PAGES, findPage(), MarketingPage(), generateMetadata()

### Community 45 - "Middleware & Site"
Cohesion: 0.33
Nodes (4): PUBLIC_ROUTE_PATHS, config, encodedSecret, PROTECTED_ROUTE_PREFIXES

### Community 47 - "Callback & Escapehtml"
Cohesion: 0.83
Nodes (3): escapeHtml(), GET(), renderOAuthCodePage()

### Community 49 - "Package & Name"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 50 - "Bajaj & Warehouse"
Cohesion: 0.50
Nodes (3): { extractPolicyFromText }, pdf, require

### Community 51 - "Icici & Warehouse"
Cohesion: 0.50
Nodes (3): { extractPolicyFromText }, pdf, require

### Community 52 - "Iffco & Warehouse"
Cohesion: 0.50
Nodes (3): { extractPolicyFromText }, pdf, require

### Community 53 - "Iffco & Workmen"
Cohesion: 0.50
Nodes (3): { extractPolicyFromText }, pdf, require

### Community 54 - "Motor & Extraction"
Cohesion: 0.50
Nodes (3): { extractPolicyFromText }, pdf, require

### Community 55 - "Tata & Warehouse"
Cohesion: 0.50
Nodes (3): { extractPolicyFromText }, pdf, require

## Knowledge Gaps
- **225 isolated node(s):** `nextConfig`, `name`, `private`, `version`, `clean` (+220 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `verifyJWT()` connect `Auth & Claims` to `Storage & Uploads`, `Work & Today`, `Policies & Field`, `Center & Operations`, `Records & Scoped`, `Endorsements & Endorsement`, `Dates & Renewals`, `Auth & User`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `getMissingFields()` connect `Endorsements & Template` to `Extraction & Review`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `BrandLogo()` connect `Public & Contact` to `Users & Usermanagement`, `Dashboard & Constants`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `verifyJWT()` (e.g. with `GET()` and `PUT()`) actually correct?**
  _`verifyJWT()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getTenantFilter()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`getTenantFilter()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getAuditMetadata()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`getAuditMetadata()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `logAudit()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`logAudit()` has 9 INFERRED edges - model-reasoned connections that need verification._