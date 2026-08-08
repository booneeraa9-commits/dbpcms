import { z } from "zod";

/**
 * Parses and safely bounds the common list query parameters
 * (?page, ?pageSize, ?sort, ?search) used by every list endpoint.
 *
 * Security: pageSize is capped; sort fields are checked against an allow-list by
 * the caller, so a user can never sort by an unindexed/forbidden column or ask
 * for 1,000,000 rows at once.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  search: z.string().trim().max(200).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export interface ParsedListQuery {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  search?: string;
  orderBy?: Record<string, "asc" | "desc">;
}

/**
 * Turns raw query params into safe Prisma-ready values.
 * @param allowedSortFields whitelist of fields the caller permits sorting by.
 * @param defaultSort e.g. { createdAt: "desc" }
 */
export function parseListQuery(
  rawQuery: unknown,
  allowedSortFields: string[],
  defaultSort: Record<string, "asc" | "desc"> = { createdAt: "desc" },
): ParsedListQuery {
  const { page, pageSize, sort, search } = listQuerySchema.parse(rawQuery);

  let orderBy = defaultSort;
  if (sort) {
    const descending = sort.startsWith("-");
    const field = descending ? sort.slice(1) : sort;
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: descending ? "desc" : "asc" };
    }
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: search && search.length > 0 ? search : undefined,
    orderBy,
  };
}
