-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('API', 'USER_ACTION', 'AI_PIPELINE', 'SYSTEM', 'AUTH');

-- AlterTable
ALTER TABLE "pdf_records" ADD COLUMN     "created_by_id" UUID,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deleted_by_id" UUID,
ADD COLUMN     "organization_id" UUID,
ADD COLUMN     "updated_by_id" UUID;

-- AlterTable
ALTER TABLE "uploaded_files" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "created_by_id" UUID,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deleted_by_id" UUID,
ADD COLUMN     "file_hash" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "organization_id" UUID,
ADD COLUMN     "storage_metadata" JSONB,
ADD COLUMN     "storage_path" TEXT,
ADD COLUMN     "storage_provider" TEXT,
ADD COLUMN     "updated_by_id" UUID;

-- Alter status column type instead of dropping it
ALTER TABLE "uploaded_files" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "uploaded_files" ALTER COLUMN "status" TYPE "UploadStatus" USING "status"::"UploadStatus";
ALTER TABLE "uploaded_files" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "organization_id" UUID,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'AGENT';

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "source" "AuditSource" NOT NULL DEFAULT 'USER_ACTION',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "user_id" UUID,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "pdf_records_organization_id_idx" ON "pdf_records"("organization_id");

-- CreateIndex
CREATE INDEX "pdf_records_deleted_at_idx" ON "pdf_records"("deleted_at");

-- CreateIndex
CREATE INDEX "pdf_records_created_by_id_idx" ON "pdf_records"("created_by_id");

-- DropIndexIfExists
DROP INDEX IF EXISTS "uploaded_files_status_idx";

-- CreateIndex
CREATE INDEX "uploaded_files_status_idx" ON "uploaded_files"("status");

-- CreateIndex
CREATE INDEX "uploaded_files_organization_id_idx" ON "uploaded_files"("organization_id");

-- CreateIndex
CREATE INDEX "uploaded_files_deleted_at_idx" ON "uploaded_files"("deleted_at");

-- CreateIndex
CREATE INDEX "uploaded_files_created_by_id_idx" ON "uploaded_files"("created_by_id");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_records" ADD CONSTRAINT "pdf_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_records" ADD CONSTRAINT "pdf_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_records" ADD CONSTRAINT "pdf_records_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_records" ADD CONSTRAINT "pdf_records_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
