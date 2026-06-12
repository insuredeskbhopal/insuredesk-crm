DO $$ BEGIN
  CREATE TYPE "NotificationCategory" AS ENUM ('POLICY', 'RENEWAL', 'CUSTOMER', 'CLAIM', 'ENDORSEMENT', 'SERVICE_REQUEST', 'TASK', 'USER_MANAGEMENT', 'SYSTEM', 'APPROVAL', 'ESCALATION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskType" AS ENUM ('CALL', 'MEETING', 'FOLLOW_UP', 'RENEWAL', 'COLLECTION', 'CLAIM', 'ENDORSEMENT', 'SERVICE_REQUEST', 'TEAM', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INSURANCE_COMPANY', 'WAITING_DOCUMENTS', 'ESCALATED', 'COMPLETED', 'CANCELLED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SENT_BACK', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'NOTIFIED', 'RESOLVED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "category" "NotificationCategory" NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "record_label" TEXT,
  "action_url" TEXT,
  "source_key" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_reads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "in_app" BOOLEAN NOT NULL DEFAULT true,
  "email" BOOLEAN NOT NULL DEFAULT false,
  "whatsapp" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "TaskType" NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "record_label" TEXT,
  "customer_name" TEXT,
  "customer_mobile" TEXT,
  "policy_number" TEXT,
  "amount" DECIMAL(14,2),
  "due_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6),
  "source_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "assigned_by" UUID,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL,
  "user_id" UUID,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "uploaded_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "task_id" UUID,
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "title" TEXT NOT NULL,
  "remind_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "source_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "event_type" TEXT NOT NULL DEFAULT 'TASK',
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6),
  "location" TEXT,
  "source_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "requested_by_id" UUID,
  "approver_id" UUID,
  "approval_type" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "title" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decision_note" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "source_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "escalations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "task_id" UUID,
  "assigned_user_id" UUID,
  "manager_user_id" UUID,
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "reason" TEXT NOT NULL,
  "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
  "escalated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  "source_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "user_role" TEXT,
  "module" TEXT NOT NULL,
  "record_id" TEXT,
  "record_label" TEXT,
  "action" TEXT NOT NULL,
  "description" TEXT,
  "old_value" JSONB,
  "new_value" JSONB,
  "ip_address" TEXT,
  "browser" TEXT,
  "device" TEXT,
  "source_key" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_source_key_key" ON "notifications"("source_key");
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");
CREATE INDEX "notifications_organization_id_category_created_at_idx" ON "notifications"("organization_id", "category", "created_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

CREATE UNIQUE INDEX "notification_reads_notification_id_user_id_key" ON "notification_reads"("notification_id", "user_id");
CREATE INDEX "notification_reads_user_id_read_at_idx" ON "notification_reads"("user_id", "read_at");

CREATE UNIQUE INDEX "notification_preferences_user_id_category_key" ON "notification_preferences"("user_id", "category");
CREATE INDEX "notification_preferences_organization_id_user_id_idx" ON "notification_preferences"("organization_id", "user_id");

CREATE UNIQUE INDEX "tasks_source_key_key" ON "tasks"("source_key");
CREATE INDEX "tasks_organization_id_status_due_at_idx" ON "tasks"("organization_id", "status", "due_at");
CREATE INDEX "tasks_organization_id_type_due_at_idx" ON "tasks"("organization_id", "type", "due_at");
CREATE INDEX "tasks_user_id_status_due_at_idx" ON "tasks"("user_id", "status", "due_at");
CREATE INDEX "tasks_module_record_id_idx" ON "tasks"("module", "record_id");

CREATE UNIQUE INDEX "task_assignments_task_id_user_id_key" ON "task_assignments"("task_id", "user_id");
CREATE INDEX "task_assignments_user_id_assigned_at_idx" ON "task_assignments"("user_id", "assigned_at");
CREATE INDEX "task_comments_task_id_created_at_idx" ON "task_comments"("task_id", "created_at");
CREATE INDEX "task_attachments_task_id_created_at_idx" ON "task_attachments"("task_id", "created_at");

CREATE UNIQUE INDEX "reminders_source_key_key" ON "reminders"("source_key");
CREATE INDEX "reminders_organization_id_remind_at_idx" ON "reminders"("organization_id", "remind_at");
CREATE INDEX "reminders_user_id_remind_at_idx" ON "reminders"("user_id", "remind_at");

CREATE UNIQUE INDEX "calendar_events_source_key_key" ON "calendar_events"("source_key");
CREATE INDEX "calendar_events_organization_id_starts_at_idx" ON "calendar_events"("organization_id", "starts_at");
CREATE INDEX "calendar_events_user_id_starts_at_idx" ON "calendar_events"("user_id", "starts_at");

CREATE UNIQUE INDEX "approvals_source_key_key" ON "approvals"("source_key");
CREATE INDEX "approvals_organization_id_status_created_at_idx" ON "approvals"("organization_id", "status", "created_at");
CREATE INDEX "approvals_approver_id_status_idx" ON "approvals"("approver_id", "status");

CREATE UNIQUE INDEX "escalations_source_key_key" ON "escalations"("source_key");
CREATE INDEX "escalations_organization_id_status_escalated_at_idx" ON "escalations"("organization_id", "status", "escalated_at");
CREATE INDEX "escalations_assigned_user_id_status_idx" ON "escalations"("assigned_user_id", "status");

CREATE UNIQUE INDEX "activity_logs_source_key_key" ON "activity_logs"("source_key");
CREATE INDEX "activity_logs_organization_id_created_at_idx" ON "activity_logs"("organization_id", "created_at");
CREATE INDEX "activity_logs_module_record_id_idx" ON "activity_logs"("module", "record_id");
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");

ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
