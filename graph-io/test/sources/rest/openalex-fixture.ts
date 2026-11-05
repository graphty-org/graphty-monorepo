/**
 * A tiny stand-in for api.openalex.org's /works: `openalex:<ids>` answers each work with no
 * references, `cites:<id>` answers two pages of one citing work each (cursor `*`, then `p2`). The
 * node test server and the browser CORS server both answer with it.
 */

/** OpenAlex ids are URLs under this prefix. */
const PREFIX = "https://openalex.org/";

/**
 * A work record.
 * @param id - its bare id
 * @param refs - the bare ids it references
 * @returns the record
 */
function work(id: string, refs: readonly string[] = []): Record<string, unknown> {
    return {
        id: `${PREFIX}${id}`,
        display_name: `Work ${id}`,
        updated_date: "2026-10-01T00:00:00",
        referenced_works: refs.map((r) => `${PREFIX}${r}`),
    };
}

/**
 * The body of a /works request.
 * @param url - the request URL
 * @returns the JSON body
 */
export function openalexAnswer(url: URL): unknown {
    const filter = url.searchParams.get("filter") ?? "";
    const cursor = url.searchParams.get("cursor");
    if (filter.startsWith("cites:")) {
        const cited = filter.slice("cites:".length).split("|")[0];
        const page = cursor === "p2" ? 2 : 1;
        return {
            meta: { next_cursor: page === 1 ? "p2" : null },
            results: [work(`W${cited.slice(1)}0${String(page)}`, [cited])],
        };
    }
    const ids = filter.startsWith("openalex:") ? filter.slice("openalex:".length).split("|") : [];
    return { meta: { next_cursor: null }, results: ids.map((id) => work(id)) };
}
