/**
 * One page of a file host's file names, for a source's `list`.
 */

import { type SourceListing, type SourceListQuery } from "./types.js";

/** Items per page when the query does not say. */
const DEFAULT_PAGE = 100;

/**
 * One page of names, narrowed by the query's search text.
 * @param names - every name, in order
 * @param query - the listing query (search, size, cursor)
 * @param params - the params that load a name
 * @returns the page
 */
export function pageNames<P>(
    names: readonly string[],
    query: SourceListQuery<P>,
    params: (name: string) => Readonly<Record<string, unknown>>,
): SourceListing {
    const search = query.search?.toLowerCase() ?? "";
    const found = names.filter((name) => name.toLowerCase().includes(search));
    const start = Number(query.cursor?.start ?? 0);
    const size = query.size ?? DEFAULT_PAGE;
    const items = found.slice(start, start + size).map((name) => ({ params: params(name), name }));
    const end = start + items.length;
    return { items, next: end < found.length ? { start: end } : null, total: found.length };
}
