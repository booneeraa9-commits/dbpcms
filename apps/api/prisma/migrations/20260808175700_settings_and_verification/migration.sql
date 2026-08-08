-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "document_verifications" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "document_kind" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "subject_label" TEXT NOT NULL,
    "issued_by" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_verifications_code_key" ON "document_verifications"("code");

-- CreateIndex
CREATE INDEX "document_verifications_subject_type_subject_id_idx" ON "document_verifications"("subject_type", "subject_id");
