/**
 * Database seed.
 * Run with: npm run db:seed
 *
 * Creates:
 *   1. All roles from the system
 *   2. All permissions from the system
 *   3. Default role → permission mappings
 *   4. A super-admin user so the system is immediately usable
 *
 * This script is idempotent — running it twice won't create duplicates.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, type Role, type Permission } from '@dbpcms/shared';

const prisma = new PrismaClient();

const ROLE_METADATA: Record<Role, { name: string; description: string }> = {
  super_admin: { name: 'Super Admin', description: 'Full system access. Cannot be deleted.' },
  principal: { name: 'Principal', description: 'Highest academic authority at the college.' },
  academic_dean: { name: 'Academic Dean', description: 'Oversees academic affairs and result approvals.' },
  registrar: { name: 'Registrar', description: 'Manages student registration and records.' },
  department_head: { name: 'Department Head', description: 'Leads a specific academic department.' },
  teacher: { name: 'Teacher', description: 'Delivers courses, creates questions, enters results.' },
  exam_committee: { name: 'Exam Committee', description: 'Reviews and approves exam questions.' },
  student: { name: 'Student', description: 'Enrolled learner with access to own records only.' },
};

async function seedRoles() {
  console.log('🌱 Seeding roles...');
  for (const slug of Object.values(ROLES)) {
    const meta = ROLE_METADATA[slug];
    await prisma.role.upsert({
      where: { slug },
      update: { name: meta.name, description: meta.description },
      create: { slug, name: meta.name, description: meta.description, isSystem: true },
    });
  }
  console.log(`   ✅ ${Object.values(ROLES).length} roles seeded`);
}

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');
  for (const slug of Object.values(PERMISSIONS)) {
    const [resource, action] = slug.split(':');
    await prisma.permission.upsert({
      where: { slug },
      update: { resource, action },
      create: { slug, resource, action, description: `${action} ${resource}` },
    });
  }
  console.log(`   ✅ ${Object.values(PERMISSIONS).length} permissions seeded`);
}

async function seedRolePermissions() {
  console.log('🌱 Seeding role → permission mappings...');
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.slug, p.id]));

  for (const [roleSlug, permissionSlugs] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
    if (!role) continue;

    for (const permSlug of permissionSlugs as Permission[]) {
      const permId = permMap.get(permSlug);
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }
  }
  console.log('   ✅ Role → permission mappings seeded');
}

async function seedSuperAdmin() {
  console.log('🌱 Seeding demo users...');

  const demoUsers: Array<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleSlug: string;
  }> = [
    { email: 'admin@dbpc.edu.et', password: 'Admin@12345', firstName: 'System', lastName: 'Administrator', roleSlug: ROLES.SUPER_ADMIN },
    { email: 'principal@dbpc.edu.et', password: 'Principal@123', firstName: 'Abebe', lastName: 'Bekele', roleSlug: ROLES.PRINCIPAL },
    { email: 'dean@dbpc.edu.et', password: 'Dean@12345', firstName: 'Sara', lastName: 'Tesfaye', roleSlug: ROLES.ACADEMIC_DEAN },
    { email: 'registrar@dbpc.edu.et', password: 'Registrar@123', firstName: 'Dawit', lastName: 'Haile', roleSlug: ROLES.REGISTRAR },
    { email: 'dept.head@dbpc.edu.et', password: 'DeptHead@123', firstName: 'Meron', lastName: 'Alemu', roleSlug: ROLES.DEPARTMENT_HEAD },
    { email: 'teacher@dbpc.edu.et', password: 'Teacher@123', firstName: 'Yonas', lastName: 'Girma', roleSlug: ROLES.TEACHER },
    { email: 'exam@dbpc.edu.et', password: 'Exam@12345', firstName: 'Hanna', lastName: 'Worku', roleSlug: ROLES.EXAM_COMMITTEE },
  ];

  for (const u of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`   ⏭️  ${u.email} already exists, skipping`);
      continue;
    }

    const role = await prisma.role.findUnique({ where: { slug: u.roleSlug } });
    if (!role) continue;

    const passwordHash = await bcrypt.hash(u.password, 12);

    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
        userRoles: {
          create: { roleId: role.id },
        },
      },
    });

    console.log(`   ✅ ${u.email.padEnd(28)} (${u.roleSlug.padEnd(20)}) → ${u.password}`);
  }

  console.log(`\n   ⚠️  CHANGE ALL PASSWORDS IN PRODUCTION\n`);
}

async function main() {
  console.log('\n🚀 Starting DBPCMS database seed\n');
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedSuperAdmin();
  console.log('\n✨ Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
