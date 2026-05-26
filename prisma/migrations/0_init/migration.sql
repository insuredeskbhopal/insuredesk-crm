-- CreateTable
CREATE TABLE "pdf_records" (
    "id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "pdf_bytes" BYTEA,
    "pdf_file_name" TEXT,
    "pdf_mime_type" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detected_company" TEXT,
    "detected_policy_type" TEXT,
    "detected_service_category" TEXT,
    "extracted_data" JSONB,
    "policy_schema_id" UUID,
    "raw_text" TEXT,
    "schema_version" INTEGER,
    "selected_company" TEXT,
    "selected_policy_type" TEXT,
    "selected_service_category" TEXT,
    "source_file" TEXT,
    "uploaded_file_id" UUID,
    "detected_bank_source" TEXT,
    "reviewed_data" JSONB,
    "selected_bank_source" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extraction_log" JSONB,
    "extraction_method" TEXT,
    "extraction_quality" JSONB,

    CONSTRAINT "pdf_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insurance_company_id" UUID,
    "service_category_id" UUID NOT NULL,

    CONSTRAINT "policy_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_schemas" (
    "id" UUID NOT NULL,
    "policy_type_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bank_source_id" UUID,
    "insurance_company_id" UUID,
    "service_category_id" UUID,

    CONSTRAINT "policy_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" UUID NOT NULL,
    "policy_schema_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "regex_pattern" TEXT,
    "section" TEXT,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" UUID NOT NULL,
    "source_file" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "pdf_bytes" BYTEA,
    "raw_text" TEXT,
    "extraction_method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "detected_company_id" UUID,
    "detected_service_category_id" UUID,
    "detected_policy_type_id" UUID,
    "detected_company_name" TEXT,
    "detected_service_category_name" TEXT,
    "detected_policy_type_name" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "extracted_data" JSONB,
    "schema_version" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detected_bank_source_id" UUID,
    "detected_bank_source_name" TEXT,
    "extraction_log" JSONB,
    "extraction_quality" JSONB,
    "schema_fallback_level" TEXT,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_records_saved_at_idx" ON "pdf_records"("saved_at");

-- CreateIndex
CREATE INDEX "pdf_records_uploaded_file_id_idx" ON "pdf_records"("uploaded_file_id");

-- CreateIndex
CREATE INDEX "pdf_records_policy_schema_id_idx" ON "pdf_records"("policy_schema_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_sources_name_key" ON "bank_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_companies_name_key" ON "insurance_companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "policy_types_name_insurance_company_id_service_category_id_key" ON "policy_types"("name", "insurance_company_id", "service_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_schemas_policy_type_id_version_key" ON "policy_schemas"("policy_type_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_policy_schema_id_key_key" ON "field_definitions"("policy_schema_id", "key");

-- CreateIndex
CREATE INDEX "uploaded_files_created_at_idx" ON "uploaded_files"("created_at");

-- CreateIndex
CREATE INDEX "uploaded_files_status_idx" ON "uploaded_files"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "pdf_records" ADD CONSTRAINT "pdf_records_policy_schema_id_fkey" FOREIGN KEY ("policy_schema_id") REFERENCES "policy_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_records" ADD CONSTRAINT "pdf_records_uploaded_file_id_fkey" FOREIGN KEY ("uploaded_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_types" ADD CONSTRAINT "policy_types_insurance_company_id_fkey" FOREIGN KEY ("insurance_company_id") REFERENCES "insurance_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_types" ADD CONSTRAINT "policy_types_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_schemas" ADD CONSTRAINT "policy_schemas_bank_source_id_fkey" FOREIGN KEY ("bank_source_id") REFERENCES "bank_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_schemas" ADD CONSTRAINT "policy_schemas_insurance_company_id_fkey" FOREIGN KEY ("insurance_company_id") REFERENCES "insurance_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_schemas" ADD CONSTRAINT "policy_schemas_policy_type_id_fkey" FOREIGN KEY ("policy_type_id") REFERENCES "policy_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_schemas" ADD CONSTRAINT "policy_schemas_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_policy_schema_id_fkey" FOREIGN KEY ("policy_schema_id") REFERENCES "policy_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_detected_bank_source_id_fkey" FOREIGN KEY ("detected_bank_source_id") REFERENCES "bank_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_detected_company_id_fkey" FOREIGN KEY ("detected_company_id") REFERENCES "insurance_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_detected_policy_type_id_fkey" FOREIGN KEY ("detected_policy_type_id") REFERENCES "policy_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_detected_service_category_id_fkey" FOREIGN KEY ("detected_service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
