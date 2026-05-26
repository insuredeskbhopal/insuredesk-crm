-- Normalize lowercase status values to their uppercase enum equivalents
UPDATE "uploaded_files" SET "status" = 'UPLOADED' WHERE "status" = 'uploaded';
UPDATE "uploaded_files" SET "status" = 'PROCESSING' WHERE "status" = 'extracting';
UPDATE "uploaded_files" SET "status" = 'REVIEW_REQUIRED' WHERE "status" = 'ready_for_review';
UPDATE "uploaded_files" SET "status" = 'REVIEW_REQUIRED' WHERE "status" = 'needs_manual_classification';
UPDATE "uploaded_files" SET "status" = 'APPROVED' WHERE "status" = 'saved';
UPDATE "uploaded_files" SET "status" = 'FAILED' WHERE "status" = 'failed';

-- Catch-all fallback for any other values
UPDATE "uploaded_files" SET "status" = 'UPLOADED' WHERE "status" NOT IN (
  'UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'FAILED'
);
