-- CreateTable
CREATE TABLE "grade_submissions" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_by" UUID,
    "submitted_at" TIMESTAMP(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "published_by" UUID,
    "published_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "returned_by" UUID,
    "return_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_entries" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "component_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "max_score" DOUBLE PRECISION NOT NULL,
    "entered_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_results" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "percentage" DOUBLE PRECISION,
    "letter" TEXT,
    "grade_point" DOUBLE PRECISION,
    "is_pass" BOOLEAN,
    "applied_snapshot" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grade_submissions_section_id_key" ON "grade_submissions"("section_id");

-- CreateIndex
CREATE INDEX "grade_entries_enrollment_id_idx" ON "grade_entries"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_entries_enrollment_id_component_id_key" ON "grade_entries"("enrollment_id", "component_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_results_enrollment_id_key" ON "grade_results"("enrollment_id");

-- AddForeignKey
ALTER TABLE "grade_submissions" ADD CONSTRAINT "grade_submissions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_entries" ADD CONSTRAINT "grade_entries_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "grade_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_results" ADD CONSTRAINT "grade_results_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
