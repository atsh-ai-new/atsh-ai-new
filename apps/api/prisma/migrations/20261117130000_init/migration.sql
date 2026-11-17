CREATE TABLE "ServiceRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "submissionKey" TEXT,
  "payloadHash" TEXT,
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "selectedServices" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceRequest_reference_key" ON "ServiceRequest"("reference");
CREATE UNIQUE INDEX "ServiceRequest_submissionKey_key" ON "ServiceRequest"("submissionKey");
CREATE INDEX "ServiceRequest_createdAt_idx" ON "ServiceRequest"("createdAt");
