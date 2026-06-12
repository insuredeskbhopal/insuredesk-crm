ALTER TABLE "endorsements" ADD COLUMN "mailing_address" TEXT;
ALTER TABLE "endorsements" ADD COLUMN "date_of_issue" TIMESTAMPTZ(6);
ALTER TABLE "endorsements" ADD COLUMN "issued_office" TEXT;
ALTER TABLE "endorsements" ADD COLUMN "financer_details" TEXT;
ALTER TABLE "endorsements" ADD COLUMN "premium" TEXT;
