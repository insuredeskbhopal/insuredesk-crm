# Graph Report - C:\temp\insuredesk-code  (2026-06-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1267 nodes · 2716 edges · 102 communities (83 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b7751a53`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 88|Community 88]]

## God Nodes (most connected - your core abstractions)
1. `verifyJWT()` - 78 edges
2. `getTenantFilter()` - 49 edges
3. `getAuditMetadata()` - 45 edges
4. `logAudit()` - 44 edges
5. `normalizeRecord()` - 31 edges
6. `loadScopedPolicyRecords()` - 25 edges
7. `startOfDay()` - 23 edges
8. `getReviewValidation()` - 19 edges
9. `loadReportingCenterData()` - 19 edges
10. `formatMoney()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `CustomerProfilingPage()` --calls--> `normalizeIndianPhone()`  [INFERRED]
  src/app/(dashboard)/dashboard/manual-entry/customer-profiling/page.js → src/lib/customer-profiles/utils.js
- `BusinessIntelligenceIndexPage()` --calls--> `loadReportingCenterData()`  [INFERRED]
  src/app/(dashboard)/dashboard/reports/page.js → src/app/lib/reporting/business-intelligence.js
- `OperationsModulePage()` --calls--> `NotFound()`  [INFERRED]
  src/app/(dashboard)/operations/[module]/page.js → src/app/not-found.js
- `getStatusStyle()` --calls--> `normalizeUploadStatus()`  [EXTRACTED]
  src/app/(dashboard)/upload-history/page.js → src/lib/uploads/status.js
- `statusLabel()` --calls--> `normalizeUploadStatus()`  [EXTRACTED]
  src/app/(dashboard)/upload-history/page.js → src/lib/uploads/status.js

## Import Cycles
- 1-file cycle: `src/app/(dashboard)/operations/customer-profiling/page.js -> src/app/(dashboard)/operations/customer-profiling/page.js`
- 1-file cycle: `src/app/(dashboard)/operations/manual-policy-entry/page.js -> src/app/(dashboard)/operations/manual-policy-entry/page.js`

## Communities (102 total, 19 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (54): formatMoney(), parseMoney(), queueLabel(), GET(), POST(), { extractPolicyFromText }, require, cleanText() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (58): GET(), cleanMobile(), GET(), isUsefulContactName(), buildPivotRows(), filterPremiumRecords(), formatDateKey(), formatDateTime() (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): createPdfCaptureClone(), generateEndorsementSchedulePdf(), getMissingScheduleFields(), waitForImages(), actionFromType(), buildChangeSummary(), buildEndorsementScheduleData(), buildFinalReviewedData() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (38): BulkUploadPage(), COLUMN_WIDTHS, DEFAULT_RECORD_COLUMNS, formatDate(), formatDateTime(), RecordsTable(), renderCell(), CustomerManagementPage() (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (39): BusinessIntelligenceReportPage(), addDays(), applyDateAndFieldFilters(), applyPolicyFilters(), applyProfileFilters(), buildAccessDeniedReport(), buildActionCenter(), buildCategoryCards() (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (45): AI_EXTRACTION_FIELDS, AMOUNT_FIELDS, buildExtractionReviewMessages(), buildPassiveReview(), buildPassiveReviewMessages(), buildValueCandidates(), compactAmount(), compactIdentifier() (+37 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (34): POST(), GET(), POST(), requireAuthenticatedUser(), bestMatch(), bestPolicyType(), classifyPolicyText(), exactPolicyTypeMatch() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (33): canWriteOperations(), requireSession(), ALLOWED_STATUSES, PATCH(), GET(), POST(), addDays(), addHours() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (19): metadata, BrandLogo(), EMPTY_FORM, FIELD_SETUP, NAV_ITEMS, SEARCHABLE_CURRENT_PATHS, AppShell(), ROUTE_MAP (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (23): classifyDocument(), buildKeywordSignature(), crypto, detectLayout(), estimatePageCount(), findRepeatedLines(), detectSections(), SECTION_DEFINITIONS (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (16): POST(), GET(), verifyJWT(), canAccessResource(), getOrgFilter(), getTenantFilter(), LOB_TERMS, UserRole (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (22): buildCustomerProfileLobOptionsQuery(), GET(), getCustomerProfileClaimFilter(), POST(), requireSession(), unique(), asText(), asUuidText() (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (24): buildDocumentsFromPayload(), GET(), parseDate(), POST(), resolveEndorsementLinks(), canDeleteEndorsement(), canWriteEndorsement(), dateValue() (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (6): ServiceDetailPage(), commonRelated, getRelatedServices(), getServicePageSchema(), servicesBySlug, serviceSlugs

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (26): addFields(), addUnique(), buildClientProfiles(), COMMON_REVIEW_FIELDS, getMissingRequiredFields(), getReviewCounts(), getReviewFieldValue(), getReviewValidation() (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (9): metadata, metadata, metadata, BUSINESS_DETAILS, MARKETING_PAGES, metadata, findPage(), generateMetadata() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.28
Nodes (18): GET(), POST(), canDeleteClaim(), canWriteClaim(), claimInclude, dateValue(), formatDateInput(), getClaimWhere() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (17): getAuthenticatedUser(), requireSuperAdmin(), requireUserManager(), canManageRole(), canMutateUsers(), canOpenUserManagement(), getAssignableRoles(), getVisibleUserWhere() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (11): CUSTOMER_TYPES, CustomerProfilingPage(), EMPTY_COUNTERS, EMPTY_FORM, EMPTY_SEARCH_RESULTS, getPageNumbers(), LOB_FIELDS, LOB_OPTIONS (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (13): getAuditMetadata(), logAudit(), canAccessSharedResource(), GET(), formatReviewValidationError(), normalizeLostRenewalStatus(), POST(), GET() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (15): FieldSetupPanel(), download(), FIELD_SETUP, pageSubtitle(), POLICY_SCHEMA_LIBRARY, queueSummaryLabel(), saveDashboardView(), shouldUseExtractedVariant() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (9): structuredData, structuredData, INSURER_LOGOS, LandingEffects(), contactRoutes, contactSchema, serviceOptions, SERVICES_LIST (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (12): buildProfileView(), CustomerProfileDetailPage(), FOLLOW_UP_OUTCOMES, formatMoney(), formatPolicyDetails(), formatTimelineRemark(), getStatusTone(), LOB_FIELDS (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs, googleapis, html2canvas, jose, jspdf, jspdf-autotable, lucide-react (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, eslint-config-next, eslint-plugin-react, jsdom, postcss, prettier (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (5): CLAIM_FIELDS, ClaimsManagementPage(), DETAIL_FIELDS, EMPTY_CLAIM, FILTERS

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (10): { buildFieldMap }, calculateSchemaMatch(), FORMAT_TO_SCHEMA, fs, path, ratio(), readSchema(), resolveSchema() (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (6): endOfToday(), isToday(), startOfToday(), STATUS_LABELS, VIEWS, WorkCenterPage()

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (14): scripts, build, build:clean, clean, db:migrate-saas, dev, dev:clean, format (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (12): buildAiMergePreview(), buildEligibilityReason(), collectAiSuggestions(), compact(), conflictsWithCompanyOrPolicyType(), containsSourceSnippet(), evidenceSupportsSuggestedValue(), getValidationFields() (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): AnalyticsReports(), buildDonutGradient(), DonutReport(), getInsurerShortCode(), ReportBar(), KpiCard(), ReportPanel(), ReportRow()

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (11): aliasBoost(), clamp(), confidenceForValue(), escapeRegExp(), extractField(), extractWithSchema(), matchNearLabel(), normalizeLabel() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.27
Nodes (6): InsurerLogo(), getInsurerLogo(), ClientProfile(), PolicyDetail(), Metric(), PdfLink()

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (8): FIELD_GROUPS, FUEL_TYPE_OPTIONS, PAYMENT_MODE_OPTIONS, EmptyState(), PreviewField(), applyAiSuggestionToReviewField(), getEligibleAiSuggestion(), FIELD_OPTIONS

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): NotFound(), BlogSidebarForm(), BlogPostPage(), getRelatedServicesForBlog(), MarketingPage(), stripHtml(), generateMetadata()

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (5): DEFAULT_METRICS, getLastActivityText(), getModuleCount(), ICONS, OperationsCard()

### Community 37 - "Community 37"
Cohesion: 0.36
Nodes (10): clean(), escapeRegExp(), extractAfterAlias(), extractFieldsForSchema(), extractFieldValue(), FALLBACK_PATTERNS, fallbackForField(), firstMatch() (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.31
Nodes (7): comparePassword(), encodedSecret, getUserClaimsCache(), refreshUserClaims(), signJWT(), USER_CLAIMS_CACHE_TTL_MS, POST()

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (3): EndorsementsListPage(), STATUSES, TYPES

### Community 40 - "Community 40"
Cohesion: 0.27
Nodes (8): buildCorrectionId(), fs, isDuplicateRecentCorrection(), loadCorrections(), MEMORY_DIR, MEMORY_FILE, path, saveCorrection()

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (9): GET(), hasMotorPayloadSignals(), normalizeCompareValue(), POST(), require, { saveCorrection }, saveHumanCorrections(), standardizePolicyCompany() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.28
Nodes (3): BLOG_POSTS, categories, PUBLIC_ROUTES

### Community 43 - "Community 43"
Cohesion: 0.54
Nodes (6): canAccessCustomerProfile(), getCustomerProfileScopedFilter(), POST(), serializeCustomerProfile(), GET(), PUT()

### Community 44 - "Community 44"
Cohesion: 0.39
Nodes (6): requireAdmin(), requireDeleteConfirmation(), securityHeaders, GET(), sanitizeFileName(), getSignedUrl()

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (3): COL_HEADERS, CustomerProfilePage(), formatDate()

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (4): beVietnamPro, manrope, metadata, SITE_KEYWORDS

### Community 48 - "Community 48"
Cohesion: 0.47
Nodes (4): FUTURE_OPERATIONS_MODULES, getOperationsModule(), OPERATIONS_MODULES, OperationsModulePage()

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (4): PUBLIC_ROUTE_PATHS, config, encodedSecret, PROTECTED_ROUTE_PREFIXES

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (5): progressWidth(), queueLabel(), reviewStatusLabel(), FixedPolicyPreview(), normalizeUploadStatus()

### Community 52 - "Community 52"
Cohesion: 0.83
Nodes (3): escapeHtml(), GET(), renderOAuthCodePage()

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **203 isolated node(s):** `nextConfig`, `name`, `private`, `version`, `clean` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `verifyJWT()` connect `Community 10` to `Community 0`, `Community 1`, `Community 3`, `Community 38`, `Community 7`, `Community 6`, `Community 41`, `Community 43`, `Community 11`, `Community 12`, `Community 44`, `Community 16`, `Community 17`, `Community 20`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `getTenantFilter()` connect `Community 10` to `Community 1`, `Community 3`, `Community 4`, `Community 7`, `Community 41`, `Community 11`, `Community 12`, `Community 44`, `Community 16`, `Community 20`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `getMissingFields()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `verifyJWT()` (e.g. with `GET()` and `PUT()`) actually correct?**
  _`verifyJWT()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getTenantFilter()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`getTenantFilter()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `getAuditMetadata()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`getAuditMetadata()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `logAudit()` (e.g. with `POST()` and `DELETE()`) actually correct?**
  _`logAudit()` has 9 INFERRED edges - model-reasoned connections that need verification._