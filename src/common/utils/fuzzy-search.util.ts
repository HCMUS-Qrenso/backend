import { Prisma } from '@prisma/client';

/**
 * Fuzzy Search Utility
 *
 * This utility provides fuzzy search capabilities using PostgreSQL's pg_trgm extension
 * and unaccent for Vietnamese text normalization.
 *
 * Usage:
 * - Use buildFuzzySearchSubquery() to generate raw SQL for finding matching IDs
 * - Use the returned IDs in a Prisma query with `id: { in: ids }`
 *
 * Example:
 * ```typescript
 * const searchQuery = buildFuzzySearchSubquery({
 *   table: 'categories',
 *   searchFields: ['name_unaccent', 'description_unaccent'],
 *   searchTerm: 'banh mi',
 *   tenantIdField: 'tenant_id',
 *   tenantId: '123-456',
 *   similarityThreshold: 0.3
 * });
 *
 * const ids = await prisma.$queryRawUnsafe<Array<{ id: string }>>(searchQuery);
 * const categories = await prisma.category.findMany({
 *   where: {
 *     id: { in: ids.map(r => r.id) },
 *     // ... other filters
 *   }
 * });
 * ```
 */

export interface FuzzySearchOptions {
  /** Database table name */
  table: string;
  /** Array of unaccent column names to search (e.g., ['name_unaccent', 'description_unaccent']) */
  searchFields: string[];
  /** The search term (will be unaccented automatically in SQL) */
  searchTerm: string;
  /** Name of the tenant_id column (for multi-tenant filtering) */
  tenantIdField?: string;
  /** Tenant ID value to filter by */
  tenantId?: string;
  /** Similarity threshold (0-1, default: 0.3). Lower = more fuzzy */
  similarityThreshold?: number;
  /** Additional WHERE conditions as raw SQL (optional) */
  additionalWhere?: string;
}

/**
 * Build a raw SQL subquery for fuzzy search using pg_trgm similarity
 * Returns IDs that match the search term with configurable fuzzy matching
 *
 * @param options - Fuzzy search configuration options
 * @returns Raw SQL query string to be used with $queryRawUnsafe
 */
export function buildFuzzySearchSubquery(options: FuzzySearchOptions): string {
  const {
    table,
    searchFields,
    searchTerm,
    tenantIdField,
    tenantId,
    similarityThreshold = 0.3,
    additionalWhere,
  } = options;

  // Escape single quotes in search term for SQL
  const escapedSearchTerm = searchTerm.replace(/'/g, "''");

  // For short queries, use prefix matching in addition to similarity
  // This helps with queries like "phở" matching "phở bò"
  const isShortQuery = searchTerm.length < 4;

  // Build search conditions for each field
  let searchConditions: string;

  if (isShortQuery) {
    // For short queries, use both prefix matching (ILIKE) and similarity
    // This ensures "phở" matches "phở bò" even with low trigram similarity
    const prefixConditions = searchFields
      .map(
        (field) => `${field} ILIKE immutable_unaccent('${escapedSearchTerm}%')`,
      )
      .join(' OR ');

    const similarityConditions = searchFields
      .map(
        (field) =>
          `similarity(${field}, immutable_unaccent('${escapedSearchTerm}')) > ${similarityThreshold}`,
      )
      .join(' OR ');

    searchConditions = `(${prefixConditions} OR ${similarityConditions})`;
  } else {
    // For longer queries, use trigram similarity only
    const similarityConditions = searchFields
      .map(
        (field) =>
          `similarity(${field}, immutable_unaccent('${escapedSearchTerm}')) > ${similarityThreshold}`,
      )
      .join(' OR ');

    searchConditions = `(${similarityConditions})`;
  }

  // Build WHERE clause parts
  const whereParts: string[] = [searchConditions];

  if (tenantIdField && tenantId) {
    whereParts.push(`${tenantIdField} = '${tenantId}'`);
  }

  if (additionalWhere) {
    whereParts.push(`(${additionalWhere})`);
  }

  const whereClause = whereParts.join(' AND ');

  // Build the complete query
  // Note: We also select the best similarity score for potential ordering
  const query = `
    SELECT id,
           GREATEST(${searchFields.map((field) => `similarity(${field}, immutable_unaccent('${escapedSearchTerm}'))`).join(', ')}) as similarity_score
    FROM "${table}"
    WHERE ${whereClause}
    ORDER BY similarity_score DESC
  `;

  return query.trim();
}

/**
 * Execute fuzzy search and return matching IDs
 * This is a convenience wrapper around buildFuzzySearchSubquery
 *
 * @param prisma - Prisma client instance
 * @param options - Fuzzy search configuration options
 * @returns Array of matching record IDs
 */
export async function executeFuzzySearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  options: FuzzySearchOptions,
): Promise<string[]> {
  const query = buildFuzzySearchSubquery(options);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const results = (await prisma.$queryRawUnsafe(query)) as Array<{
    id: string;
    similarity_score: number;
  }>;
  return results.map((r) => r.id);
}

/**
 * Build a fuzzy search condition for Prisma where clause
 * Returns a condition object that can be used directly in Prisma queries
 *
 * @param prisma - Prisma client instance
 * @param options - Fuzzy search configuration options
 * @returns Prisma where condition object with id IN subquery
 */
export async function buildFuzzySearchCondition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  options: FuzzySearchOptions,
): Promise<{ id: { in: string[] } }> {
  const ids = await executeFuzzySearch(prisma, options);

  // If no results, return an impossible condition (empty array)
  return {
    id: { in: ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'] },
  };
}

/**
 * Escape special characters for raw SQL queries
 *
 * @param value - Value to escape
 * @returns Escaped value safe for SQL
 */
export function escapeSqlValue(value: string): string {
  return value.replace(/'/g, "''");
}
