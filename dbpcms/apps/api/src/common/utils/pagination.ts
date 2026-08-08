/**
 * Pagination helpers.
 * Every list endpoint uses these for consistent behavior.
 */

import type { PaginationQuery, PaginationMeta } from '@dbpcms/shared';
import { SYSTEM } from '@dbpcms/shared';

export interface NormalizedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export function normalizePagination(query: PaginationQuery): NormalizedPagination {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(
    SYSTEM.MAX_PAGE_SIZE,
    Math.max(1, query.pageSize ?? SYSTEM.DEFAULT_PAGE_SIZE),
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: query.search?.trim() || undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder ?? 'asc',
  };
}

export function buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}
