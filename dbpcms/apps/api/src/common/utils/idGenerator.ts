/**
 * Student ID number generator.
 * Format: DBPC/YEAR/NNNN
 * Example: DBPC/2025/0001
 *
 * Each year, the counter resets to 0001.
 * This means DBPC/2025/0001 and DBPC/2026/0001 are different students.
 */

import { prisma } from '../../infra/database/client';

const PREFIX = 'DBPC';
const PAD_LENGTH = 4;

export async function generateStudentIdNumber(admissionYear: number): Promise<string> {
  const year = admissionYear;
  const prefix = `${PREFIX}/${year}/`;

  // Find the highest sequence for this year
  const last = await prisma.student.findFirst({
    where: { studentIdNumber: { startsWith: prefix } },
    orderBy: { studentIdNumber: 'desc' },
    select: { studentIdNumber: true },
  });

  let nextSeq = 1;
  if (last) {
    const lastSeq = parseInt(last.studentIdNumber.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(PAD_LENGTH, '0')}`;
}
