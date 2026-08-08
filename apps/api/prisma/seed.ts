/**
 * Seed script — fills a fresh database with the data the system needs to run:
 *   1. Every permission
 *   2. Every role, wired to its permissions
 *   3. The first System Administrator account
 *
 * It is idempotent: running it twice does no harm (it "upserts").
 * Run with: pnpm --filter @dbpcms/api db:seed
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import {
  ALL_PERMISSIONS,
  ALL_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  ROLES,
  SETTING_DEFAULTS,
  SETTING_DESCRIPTIONS,
} from "@dbpcms/shared";

// Load apps/api/.env so DATABASE_URL and the admin credentials are available.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(currentDir, "../.env") });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database…");

  // 1) Permissions ----------------------------------------------------------
  console.log(`  • Ensuring ${ALL_PERMISSIONS.length} permissions…`);
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }
  const permissionRecords = await prisma.permission.findMany();
  const permissionIdByKey = new Map(
    permissionRecords.map((p) => [p.key, p.id]),
  );

  // 2) Roles + their permissions -------------------------------------------
  console.log(`  • Ensuring ${ALL_ROLES.length} roles…`);
  for (const roleName of ALL_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName], isSystem: true },
      create: {
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
        isSystem: true,
      },
    });

    // Reset this role's permission set to match the source of truth.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const permsForRole = ROLE_PERMISSIONS[roleName];
    for (const permKey of permsForRole) {
      const permissionId = permissionIdByKey.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId },
      });
    }
  }

  // 3) First administrator ---------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in apps/api/.env",
    );
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: ROLES.SYSTEM_ADMINISTRATOR },
  });

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // never overwrite an existing admin's password on re-seed
    create: {
      email: adminEmail,
      passwordHash,
      fullName: "System Administrator",
      isActive: true,
      mustChangePassword: true, // forced to change on first login
    },
  });

  // Ensure the admin has the administrator role.
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`  • Admin ready: ${adminEmail} (must change password on first login)`);

  // 4) Default system settings ---------------------------------------------
  const settingKeys = Object.keys(SETTING_DEFAULTS) as (keyof typeof SETTING_DEFAULTS)[];
  console.log(`  • Ensuring ${settingKeys.length} system settings…`);
  for (const key of settingKeys) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {}, // never overwrite an admin's changed value on re-seed
      create: {
        key,
        value: SETTING_DEFAULTS[key],
        description: SETTING_DESCRIPTIONS[key],
      },
    });
  }

  // 5) Default grading configuration (only if none exists) --------------------
  const existingScale = await prisma.gradingScale.findFirst({
    where: { departmentId: null, deletedAt: null },
  });
  if (!existingScale) {
    console.log("  • Seeding default grading scale (4.0)…");
    await prisma.gradingScale.create({
      data: {
        name: "Standard 4.0",
        passMark: 50,
        rounding: "half_up",
        isActive: true,
        bands: {
          create: [
            { minPercent: 90, maxPercent: 100, letter: "A+", gradePoint: 4.0, isPass: true },
            { minPercent: 85, maxPercent: 89, letter: "A", gradePoint: 4.0, isPass: true },
            { minPercent: 80, maxPercent: 84, letter: "A-", gradePoint: 3.75, isPass: true },
            { minPercent: 75, maxPercent: 79, letter: "B+", gradePoint: 3.5, isPass: true },
            { minPercent: 70, maxPercent: 74, letter: "B", gradePoint: 3.0, isPass: true },
            { minPercent: 65, maxPercent: 69, letter: "B-", gradePoint: 2.75, isPass: true },
            { minPercent: 60, maxPercent: 64, letter: "C+", gradePoint: 2.5, isPass: true },
            { minPercent: 50, maxPercent: 59, letter: "C", gradePoint: 2.0, isPass: true },
            { minPercent: 40, maxPercent: 49, letter: "D", gradePoint: 1.0, isPass: false },
            { minPercent: 0, maxPercent: 39, letter: "F", gradePoint: 0, isPass: false },
          ],
        },
      },
    });
  }

  const existingComponents = await prisma.gradeComponent.count({ where: { deletedAt: null } });
  if (existingComponents === 0) {
    console.log("  • Seeding default grade components…");
    await prisma.gradeComponent.createMany({
      data: [
        { name: "Quiz", weightPercent: 10, maxScore: 10, sequence: 1 },
        { name: "Assignment", weightPercent: 15, maxScore: 15, sequence: 2 },
        { name: "Mid Exam", weightPercent: 25, maxScore: 25, sequence: 3 },
        { name: "Final Exam", weightPercent: 50, maxScore: 50, sequence: 4 },
      ],
    });
  }

  console.log("Seeding complete. ✔");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
