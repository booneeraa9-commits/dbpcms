-- CreateTable
CREATE TABLE "grading_scales" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "pass_mark" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "rounding" TEXT NOT NULL DEFAULT 'half_up',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_scale_bands" (
    "id" UUID NOT NULL,
    "scale_id" UUID NOT NULL,
    "min_percent" DOUBLE PRECISION NOT NULL,
    "max_percent" DOUBLE PRECISION NOT NULL,
    "letter" TEXT NOT NULL,
    "grade_point" DOUBLE PRECISION NOT NULL,
    "is_pass" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "grading_scale_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_components" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weight_percent" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "grade_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grading_scales_department_id_idx" ON "grading_scales"("department_id");

-- CreateIndex
CREATE INDEX "grading_scale_bands_scale_id_idx" ON "grading_scale_bands"("scale_id");

-- CreateIndex
CREATE INDEX "grade_components_department_id_idx" ON "grade_components"("department_id");

-- AddForeignKey
ALTER TABLE "grading_scale_bands" ADD CONSTRAINT "grading_scale_bands_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "grading_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
