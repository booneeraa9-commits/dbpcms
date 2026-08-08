import type { Prisma } from "@prisma/client";

/**
 * Generates the next employee number in the format DBPC-EMP-YYYY-NNNNN.
 * Uses a per-year counter row locked inside a transaction so numbers are
 * sequential and NEVER reused, even under concurrent registrations.
 *
 * Must be called INSIDE a Prisma transaction (pass the tx client).
 */
export async function nextEmployeeNumber(
  tx: Prisma.TransactionClient,
  year = new Date().getFullYear(),
): Promise<string> {
  // upsert the counter row, then atomically increment and read it back.
  await tx.employeeNumberSequence.upsert({
    where: { year },
    update: {},
    create: { year, lastValue: 0 },
  });
  const updated = await tx.employeeNumberSequence.update({
    where: { year },
    data: { lastValue: { increment: 1 } },
  });
  const padded = String(updated.lastValue).padStart(5, "0");
  return `DBPC-EMP-${year}-${padded}`;
}
