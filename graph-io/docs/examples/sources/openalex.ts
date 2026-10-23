import { credentials, ImportError, loadFromSource, replayFetch } from "@graphty/graph-io";

const works = "https://api.openalex.org/works";
const select = "id,display_name,publication_year,cited_by_count,updated_date,referenced_works";
// recorded answers stand in for OpenAlex: the seed, a first page of citing works, then a second
// page that needs a key
const fetch = replayFetch(
    [
        {
            url: `${works}?filter=openalex:W2112090702&per-page=50&select=${select}`,
            body: { results: [{ id: "https://openalex.org/W2112090702", display_name: "Collective dynamics" }] },
        },
        {
            url: `${works}?filter=cites:W2112090702&per-page=200&select=${select}&cursor=*`,
            body: {
                meta: { next_cursor: "page-2" },
                results: [{ id: "https://openalex.org/W1", referenced_works: ["https://openalex.org/W2112090702"] }],
            },
        },
        { url: `${works}?filter=cites:W2112090702&per-page=200&select=${select}&cursor=page-2`, status: 401 },
        {
            url: `${works}?filter=cites:W2112090702&per-page=200&select=${select}&cursor=page-2`,
            credential: true,
            body: {
                meta: { next_cursor: null },
                results: [{ id: "https://openalex.org/W2", referenced_works: ["https://openalex.org/W2112090702"] }],
            },
        },
    ],
    { secretQuery: ["api_key"] },
);

const first = await loadFromSource("openalex", { work: "W2112090702" }, { fetch });
console.log(
    first.snapshot.nodeCount,
    first.report.issues.map((i) => i.code),
);

// a free key lets the load continue where it stopped
const rest = await loadFromSource(
    "openalex",
    { work: "W2112090702" },
    {
        fetch,
        cursor: first.report.source?.next ?? undefined,
        credential: credentials.apiKey({ query: "api_key" }, "my-key"),
    },
);
console.log(rest.snapshot.nodeCount, rest.report.source?.next);

try {
    await loadFromSource("openalex", { work: "W1,cited_by_count:>5" });
} catch (err) {
    if (err instanceof ImportError) {
        console.log(err.issue?.code, err.issue?.params);
    }
}
