# Loading graphs from network sources

Status: design, 2026-10-17. Nothing here is implemented. Tracking issue: #2907.

## The problem in one paragraph

graph-io reads a graph only from bytes the caller already holds: a string, a `Uint8Array`, a
stream, a `File`, or one URL fetched whole by `loadFromUrl()`. Much graph data lives behind a
service instead: public repositories (NDEx), graph databases (Neo4j, Memgraph, AWS Neptune),
SPARQL endpoints (Wikidata), REST and GraphQL APIs. Reading from those today means the caller
writes the client, the authentication, the paging, the error handling and the conversion to a
graph. This design adds **network sources** to graph-io: a small, public contract for "something
that turns parameters into a graph over the network", a registry like `FormatRegistry`, four
built-in sources, and the graphty-element entry point that makes every registered source loadable
from the element with no integration code.

## Requirements this design is held to

1. **Anyone can write a source**, with the same public API graph-io's own sources use. A first
   custom source (a REST endpoint returning JSON) is about 15 lines and names no internal concept.
   The advanced path (streaming into a `GraphSink`, paging, cancellation) is the one the simple
   path wraps.
2. **Pay only for what you use.** Each source is its own subpath and is loaded on first use.
   graph-io keeps zero runtime dependencies.
3. **Whole graphs, parts of graphs and later expansion** all go through one contract and stream
   into a `GraphSink`; nothing is held twice.
4. **Neutral facts.** Every failure is an `ImportIssue` with a stable `code` and machine-readable
   `params`; graph-io writes no reader-facing sentences. Every behavior a consumer might want
   either way is an option whose default is the neutral behavior of the mechanism.
5. **Secrets never leak.** graph-io never logs, stores, serializes or forwards a credential to a
   host it was not meant for.
6. **graphty-element is self-sufficient.** A consumer of the element loads from any registered
   source by naming it; the graphty app only renders the settings form the element describes.

## Contents

1. Where this sits in the code that exists
2. The source contract
3. Loading: entry points, registry, lazy subpaths
4. Examples: the simple path and the advanced path
5. Whole graphs, parts, paging and incremental expansion
6. Authentication and secrets
7. Browser and Node
8. Errors and reports
9. Cancellation, progress, limits, retries
10. Type mapping
11. Injection and transport safety
12. The initial sources: NDEx, Neo4j, Memgraph, AWS Neptune
13. graphty-element integration
14. Testing without live credentials
15. Prior art
16. Other online sources, ranked
17. graph-samples' dataset downloads
18. Live and changing sources
19. Work breakdown
20. Decisions for the owner

---

## 1. Where this sits in the code that exists

What graph-io has today, and what this design reuses unchanged:

| Existing piece                                                                                                      | Where                                           | Reused for                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GraphSink` (`addNode`, `addEdge`, `addNodeRecord`, `addEdgeRecord`, `declareNodeColumn`, `setMeta`, ...)           | `graph-format/src/types/builder.ts`             | every source writes into a sink, exactly as importers do                                                              |
| `GraphImporter.import(input, sink, options)`                                                                        | `graph-io/src/types.ts`                         | the advanced source method has the same shape, with parameters in place of bytes                                      |
| `ImportReport`, `ImportIssue`, `ImportError`, `ImportReportBuilder`                                                 | `graph-io/src/types.ts`, `src/common/report.ts` | sources report through the same builder and fail with the same error class                                            |
| `CommonImportOptions` (`ids`, `duplicateEdges`, `selfLoops`, `errorLimit`, `signal`, `onProgress`, ...)             | `graph-io/src/types.ts`                         | accepted by every source load, with the same meaning                                                                  |
| `FormatRegistry.importGraph()` / `loadFromUrl()`                                                                    | `graph-io/src/registry.ts`                      | a source that downloads a file hands its body to `importGraph()`; no new parser                                       |
| `DirectionResolver`, `IdCoercer`, `TextCellWriter`, `throwIfAborted`, declared-type rules (graph-format design 5.1) | `graph-io/src/common/` (public)                 | a source that writes typed columns uses the same helpers                                                              |
| neo4j CSV importer's columns: `labels` (list of dict, role `labels`), `type` (dict, role `kind`)                    | `graph-io/src/formats/neo4j/importer.ts`        | the Neo4j, Memgraph and Neptune sources write the same columns, so a graph looks the same whichever way it was loaded |
| `DataSource.fromImporter(importer, descriptor)`                                                                     | `graphty-element/src/data/DataSource.ts`        | the model for `DataSource.fromSource()` (section 13)                                                                  |
| `session.data.import({ type, config, name }, { mode: "replace" \| "merge" })`, `data.source()`                      | `graphty-element/src/session/`                  | the element entry point; `mode: "merge"` is how an expansion lands                                                    |
| `fetchDataset(name, { baseUrl, fetch, signal })`                                                                    | `graph-samples/src/datasets/remote.ts`          | compared in section 17; the injectable `fetch` pattern is reused for testing                                          |

Two additive changes to existing graph-io types are needed:

- `ImportIssue.params?: Readonly<Record<string, unknown>>`: the machine-readable parameters of an
  issue (`{ status: 401 }`, `{ retryAfterMs: 30000 }`). Today an issue carries a `code`, an English
  `message` and one `element` string; a network failure needs several values an application can
  render in its own words. Existing importers may adopt it later; nothing breaks.
- `ImportReport.source?: SourceReportInfo`: which source and endpoint produced the graph, how many
  requests and bytes it took, and the cursor for the next page (section 5). Absent for file loads.

---

## 2. The source contract

A source is a plain object. It has an id, an optional descriptor (what a form needs to ask the
reader for its parameters), and exactly ONE of three read methods, from simplest to most
capable:

```ts
/** A network source of graphs. Register one with `registerSource()`. */
export interface GraphSource<Params = Record<string, unknown>> {
    /** The name callers pass as `source`: lowercase letters, digits and dashes, unique in a registry. */
    readonly id: string;

    /** What the source is and the parameters it takes; optional for a source used only from code. */
    readonly descriptor?: SourceDescriptor | undefined;

    /** Simplest: return node and edge records (or pages of them). graph-io writes them into the sink. */
    records?(params: Params, ctx: SourceContext): Promise<RecordBatch> | AsyncIterable<RecordBatch>;

    /** For file hosts: return the bytes of a file graph-io can already read, and its format if known. */
    file?(params: Params, ctx: SourceContext): Promise<SourceFile>;

    /** Advanced: write into the sink yourself and return the report, like `GraphImporter.import()`. */
    import?(params: Params, sink: GraphSink, ctx: SourceContext): Promise<ImportReport>;

    /** Optional: fetch the neighbors of nodes already loaded (section 5). */
    expand?(request: ExpandRequest<Params>, sink: GraphSink, ctx: SourceContext): Promise<ImportReport>;

    /** Optional: check that the parameters and credentials work, without loading a graph. */
    probe?(params: Params, ctx: SourceContext): Promise<SourceProbe>;

    /** Optional: list what can be loaded (NDEx search, the graphs of a database). */
    list?(query: SourceListQuery<Params>, ctx: SourceContext): Promise<SourceListing>;
}
```

The three read methods are layers, not alternatives in kind: graph-io implements `records` and
`file` on top of `import`. `records` results are pushed through `sink.addNodeRecord()` /
`sink.addEdgeRecord()` (type inference per column, graph-format design 5.1); `file` results go
through `FormatRegistry.importGraph()` with the returned `format`, `filename` and `mimeType` as
hints. A source with more than one read method, or none, is refused at registration with
`E_SOURCE_INVALID` (`params: { id, reason: "read-methods" }`).

```ts
/** One page of records. Ids are any `NodeId` (string or number). */
export interface RecordBatch {
    readonly nodes?: readonly Readonly<Record<string, unknown>>[] | undefined;
    readonly edges?: readonly Readonly<Record<string, unknown>>[] | undefined;
    /** Where to resume for the next page; null or absent when this was the last one. */
    readonly next?: SourceCursor | null | undefined;
    /** Graph-level fields (name, description) for `sink.setMeta()`. */
    readonly meta?: Readonly<Record<string, unknown>> | undefined;
}

export interface SourceFile {
    /** The body: a fetch `Response`, a stream, bytes or text. */
    readonly body: Response | ImportInput;
    /** A registered format name ("cx2"), or omitted to detect it. */
    readonly format?: string | undefined;
    readonly filename?: string | undefined;
    readonly mimeType?: string | undefined;
}

/** An opaque, JSON-serializable position in a paged result. Only the source that made it reads it. */
export type SourceCursor = Readonly<Record<string, string | number | boolean | null>>;
```

Record field names: a node record's id is `id`; an edge record's endpoints are `source` and
`target`, and its optional id is `id` (the names the element and graph-format already use). The
source's `idKey`, `sourceKey` and `targetKey` descriptor fields rename them for a source whose
records say `from` and `to`; nothing is guessed.

### 2.1 The context

Every method receives a `SourceContext`. It is how a source reaches the network and reports, and
it is the only place the cross-cutting rules (auth, redirects, retries, limits, cancellation,
progress) are implemented, once, for every source:

```ts
export interface SourceContext {
    /**
     * fetch(), with this load's credential applied, redirects guarded, retries with backoff,
     * the signal, the byte limit and progress wired in. Relative URLs resolve against `endpoint`.
     */
    readonly fetch: (input: string | URL, init?: SourceRequestInit) => Promise<Response>;
    /** fetch() + JSON parse + a coded error for a non-JSON body (E_SOURCE_RESPONSE). */
    readonly fetchJson: <T = unknown>(input: string | URL, init?: SourceRequestInit) => Promise<T>;
    /** The base URL the caller passed (`endpoint`), or the descriptor's `defaultEndpoint`. */
    readonly endpoint: URL | null;
    /** The credential for this load; opaque (section 6). Null when none was passed. */
    readonly credential: Credential | null;
    /** Cancels the load; also passed to every `ctx.fetch`. */
    readonly signal: AbortSignal;
    /** Issues, counts and the stopping error, as in an importer. */
    readonly report: ImportReportBuilder;
    /** The caps the caller set (section 9); `ctx.limits.reached(sink)` says when to stop. */
    readonly limits: SourceLimits;
    /** Report work done: items or bytes, with a total when known. */
    progress(done: number, total?: number, unit?: "items" | "bytes"): void;
    /** Where the advanced path resumes; the `cursor` the caller passed, or null. */
    readonly cursor: SourceCursor | null;
    /** Finish the report, recording where to resume (null: the result is complete). */
    finish(result?: { readonly next?: SourceCursor | null }): ImportReport;
    /** "browser" | "node" | "worker" | "other": what this runtime is (section 7). */
    readonly runtime: SourceRuntime;
}
```

`SourceRequestInit` is `RequestInit` plus `retry?: false` (for a non-idempotent request) and
`expect?: "json" | "bytes"`. A source must not call the global `fetch`; the shared conformance
test (section 14) fails a built-in source that does, and the docs say why: the guarded fetch is
where credentials, redirects and limits are enforced.

### 2.2 The descriptor

The descriptor is data, so a form can be drawn from it with no knowledge of the source:

```ts
export interface SourceDescriptor {
    /** Default display name ("NDEx"); catalog data an application may replace by id. */
    readonly plainName: string;
    /** What kind of service: drives nothing in graph-io, lets an application group sources. */
    readonly kind: "repository" | "database" | "sparql" | "rest" | "graphql" | "file-host" | "other";
    /** The parameters, in the element's option-descriptor shape (name, type, default, min, max, values). */
    readonly params: readonly SourceParamDescriptor[];
    /** Which credentials it accepts; empty when it needs none. */
    readonly auth: readonly CredentialKind[];
    /** Whether a credential is required, optional (public data without one) or not used. */
    readonly authRequired: "required" | "optional" | "none";
    /** Where it can run, and why not (section 7). */
    readonly runtimes: Readonly<Partial<Record<SourceRuntime, SourceRuntimeSupport>>>;
    /** The base URL used when the caller passes no endpoint (NDEx's public server), else null. */
    readonly defaultEndpoint: string | null;
    /** Field names in its records, when not id / source / target. */
    readonly idKey?: string;
    readonly sourceKey?: string;
    readonly targetKey?: string;
    /** What it can do beyond a load: "expand", "probe", "list", "page". */
    readonly features: readonly ("expand" | "probe" | "list" | "page")[];
}

export interface SourceRuntimeSupport {
    readonly supported: boolean;
    /** Why not, or under what condition: a code, never a sentence. */
    readonly reason?: "cors" | "needs-proxy" | "needs-websocket" | "needs-node" | "needs-peer-dependency" | undefined;
}

export interface SourceParamDescriptor {
    readonly name: string;
    readonly plainName: string;
    readonly type: "string" | "text" | "query" | "integer" | "number" | "boolean" | "enum" | "url" | "node-id";
    readonly required?: boolean;
    readonly default?: unknown;
    readonly min?: number;
    readonly max?: number;
    readonly values?: readonly { readonly value: string; readonly label: string }[];
    /** For type "query": the language, so an editor can highlight it. */
    readonly language?: "cypher" | "opencypher" | "gremlin" | "sparql" | "graphql" | "jmespath";
    readonly advanced?: boolean;
    readonly description?: string;
}
```

Credentials are deliberately NOT parameters: they never appear in `params`, in a descriptor, in a
cursor or in a report, so code that stores or logs parameters (a project file, an undo journal,
an error report) cannot leak them by accident. `SourceParamDescriptor` therefore has no
`"password"` type; a form asks for the credential through `descriptor.auth` (section 6).

---

## 3. Loading: entry points, registry, lazy subpaths

### 3.1 The simple surface

```ts
/** Load a graph from a registered source. */
export function loadFromSource(
    source: string | GraphSource,
    params: Record<string, unknown>,
    options?: LoadFromSourceOptions,
): Promise<ImportGraphResult>;

export interface LoadFromSourceOptions extends CommonImportOptions {
    /** The service's base URL; required unless the source has a default endpoint. */
    readonly endpoint?: string | URL | undefined;
    /** How to authenticate (section 6). */
    readonly credential?: Credential | undefined;
    /** Resume a paged load where an earlier result's `report.source.next` left off. */
    readonly cursor?: SourceCursor | undefined;
    /** Caps (section 9). */
    readonly limits?: SourceLimitOptions | undefined;
    /** Retry policy (section 9); `false` turns retries off. */
    readonly retry?: RetryOptions | false | undefined;
    /** The fetch implementation; the global fetch by default (tests, proxies, Node agents). */
    readonly fetch?: typeof fetch | undefined;
    /** Same as importGraph()'s builder and freeze settings. */
    readonly builder?: BuilderSeed | undefined;
    readonly freeze?: FreezeOptions | undefined;
}
```

It returns the `ImportGraphResult` every load function returns, so a caller handles a source load
exactly like `loadFromUrl()`: `result.snapshot`, `result.report`, and `ImportError` with
`err.issue.code` on failure. `result.format` is `"source:<id>"` (or the file format a `file`
source resolved to, with `report.source.id` naming the source).

Also exported: `importFromSource(source, params, sink, options)`, the sink form (no builder, no
freeze), for a caller that owns its sink, as `importer.import()` is for formats; `expandFromSource()`
(section 5); `probeSource()` and `listFromSource()` (the `probe` and `list` methods behind the same
context); `registerSource(source)`, which registers on the default registry; and `listSources()`, which returns every registered descriptor with its id.

### 3.2 Registry and lazy loading

`FormatRegistry` gains source methods rather than a second registry class, so one object holds
everything a consumer registered:

```ts
class FormatRegistry {
    registerSource(source: GraphSource | LazySource): this;
    source(id: string): Promise<GraphSource>;   // E_SOURCE_UNKNOWN when absent
    hasSource(id: string): boolean;
    sources(): readonly SourceInfo[];           // id + descriptor, without loading any source code
    loadFromSource(...); importFromSource(...); expandFromSource(...); probeSource(...); listFromSource(...);
}

/** A source whose code is fetched on first use: the descriptor is known, the code is not loaded yet. */
export interface LazySource {
    readonly id: string;
    readonly descriptor: SourceDescriptor;
    readonly load: () => Promise<GraphSource>;
}
```

The default registry registers the built-in sources as `LazySource`s whose `load` is a dynamic
`import()` of the source's subpath. So:

- `loadFromSource("ndex", { uuid })` works with no extra import: the consumer never wires a
  source up, which is what self-sufficiency asks.
- A bundle that never loads a source contains only the descriptors (a few hundred bytes each);
  each source's code is its own chunk, fetched on first use.
- `listSources()` can describe every source to a settings form without loading any.

Subpaths, one per source, following the per-format pattern (`scripts/entries.js`, the `exports`
map, `test/build-output.test.ts`):

| Subpath                              | Exports                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@graphty/graph-io`                  | the contract types, `defineSource`, `credentials`, `loadFromSource` and friends, the registry methods, the `SOURCE_ISSUE` code table |
| `@graphty/graph-io/sources/ndex`     | `ndexSource`, `NdexParams`, `NDEX_ISSUE`                                                                                             |
| `@graphty/graph-io/sources/neo4j`    | `neo4jSource` (Query API over HTTP), `cypher` helpers, `NEO4J_SOURCE_ISSUE`                                                          |
| `@graphty/graph-io/sources/bolt`     | `boltSource` (Neo4j and Memgraph over Bolt; optional peer `neo4j-driver`)                                                            |
| `@graphty/graph-io/sources/memgraph` | `memgraphSource`: `boltSource` with Memgraph's defaults and type rules                                                               |
| `@graphty/graph-io/sources/neptune`  | `neptuneSource` (openCypher and Gremlin over HTTPS), `sigv4` signing                                                                 |
| `@graphty/graph-io/sources/sparql`   | `sparqlSource`, the `sparql` term helpers (built after the first four; section 16)                                                   |

`defineSource(source)` is an identity function that only exists for type inference and for the
registration-time checks to run early; the docs use it in every example.

---

## 4. Examples

### 4.1 The simple path: a first custom source

A REST endpoint `GET /api/people` returns `[{ "id": "ana", "name": "Ana", "knows": ["bo"] }, ...]`.
The complete source, registered and loaded:

```ts
import { defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    async records(params: { team: string }, ctx) {
        const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
            `https://example.com/api/people?team=${encodeURIComponent(params.team)}`,
        );
        return {
            nodes: rows.map((r) => ({ id: r.id, name: r.name })),
            edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
        };
    },
});

registerSource(people);
const { snapshot, report } = await loadFromSource("people", { team: "core" });
```

Fifteen lines of source, and it already gets cancellation, retries on 429 and 503, a byte limit,
progress, redirect protection and coded errors, because `ctx.fetchJson` does them. An edge to a
node not in `nodes` (`"bo"` on another team) follows the common option `addMissingNodes` (true by
default, as for every importer). Authentication is one more option at the call site, never in
the source:

```ts
import { credentials } from "@graphty/graph-io";

await loadFromSource("people", { team: "core" }, { credential: credentials.bearer(token) });
```

### 4.2 Paging on the simple path

Return an async iterable to stream pages; each page is written as it arrives, and the load stops
cleanly at a node or edge cap (section 9):

```ts
const issues = defineSource({
    id: "issue-links",
    async *records(params: { repo: string }, ctx) {
        let url: string | null = `https://api.example.com/repos/${params.repo}/links?per_page=500`;
        while (url !== null) {
            const res = await ctx.fetch(url);
            const page = (await res.json()) as { from: number; to: number }[];
            yield { edges: page.map((l) => ({ source: l.from, target: l.to })) };
            url = nextLink(res.headers.get("link")); // the caller's own Link-header parser
        }
    },
});
```

### 4.3 The advanced path: writing into the sink

For typed columns, declared types, direction and full control over the report, implement
`import()`. This is the same contract a format importer implements, so everything in the
"Writing a format" guide applies:

```ts
import { defineSource, throwIfAborted } from "@graphty/graph-io";

export const flights = defineSource({
    id: "flights",
    descriptor: flightsDescriptor, // a SourceDescriptor (section 2.2), so a form can ask for `airline`
    async import(params: { airline: string }, sink, ctx) {
        sink.setDirected(true);
        const km = sink.declareEdgeColumn({ name: "distanceKm", dtype: "f32", nullable: true });
        let page = Number(ctx.cursor?.page ?? 0);
        for (;;) {
            const res = await ctx.fetchJson<RoutePage>(`routes?airline=${params.airline}&page=${page}`);
            for (const [i, r] of res.routes.entries()) {
                if (i % 64 === 0) throwIfAborted(ctx.signal);
                sink.setEdgeValue(km, sink.addEdge(r.from, r.to), r.km);
            }
            ctx.progress(res.done, res.total, "items");
            if (res.last || ctx.limits.reached(sink)) {
                return ctx.finish({ next: res.last ? null : { page: page + 1 } });
            }
            page += 1;
        }
    },
});
```

`ctx.limits.reached(sink)` is true once a cap is met (it records `W_SOURCE_LIMIT`, or throws
`E_SOURCE_LIMIT` under `onLimit: "error"`). `ctx.finish({ next })` finishes the report and records
the resume cursor in `report.source.next`; a caller fetches the next page with `loadFromSource("flights", params, { cursor: result.report.source.next })`.

### 4.4 Using a built-in source

```ts
import { credentials, loadFromSource } from "@graphty/graph-io";

// A public NDEx network by UUID: no setup, no import of the NDEx module.
const { snapshot } = await loadFromSource("ndex", { uuid: "f93f402c-86d4-11e7-a10d-0ac135e8bacf" });

// A Cypher query against Neo4j Aura over the HTTP Query API (`password` comes from your own form).
const result = await loadFromSource(
    "neo4j",
    { query: "MATCH p = (:Person {name: $name})-[:KNOWS*1..2]-() RETURN p", parameters: { name: "Ana" } },
    { endpoint: "https://xxxx.databases.neo4j.io", credential: credentials.basic("neo4j", password) },
);
```

### 4.5 Developer-experience check against the personas

Each example above was read as the developer personas in `design/designloom/personas/` would meet
it, from the published guide only:

- **Researcher writing a one-off plugin** (a lab's own REST service): section 4.1 is the whole
  job. It names no snapshot, column, dtype or sink; ids and endpoints are the field names the
  element already uses. Auth is one option at the call site.
- **Front-end developer integrating the element**: never writes a source. Section 4.4's one call,
  or the element's `loadFromSource`, with errors branched on `err.issue.code`; the settings form
  comes from `sourceDescriptors()`.
- **Data scientist porting from NetworkX or Graphistry**: the `records` shape is Graphistry's
  nodes-and-edges binding and Gephi's column aliases; the paging generator (4.2) is plain
  `async *` code.
- **Graph library author**: section 4.3 is the importer contract they already know from "Writing
  a format", with parameters in place of bytes, the same report and the same helpers.

The rule this enforces: nothing in 4.1 or 4.2 changes when the advanced path changes, because
graph-io implements `records` and `file` on top of `import`. The blind-author test (an author who
sees only the published docs writes 4.1 and compiles it against the published types) is part of
the framework sub-issue's definition of done.

---

## 5. Whole graphs, parts, paging and incremental expansion

**Whole.** A whole graph is either a file (`file`: NDEx CX2, a GraphML on a web server, a database
export) read by the existing importers, or a source-defined "everything" query (Neo4j's
`MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m`, paged). Each built-in database source
has a `mode` parameter: `"query"` (the caller's query), `"all"` (the whole database, paged by the
source), `"neighborhood"` (around given node ids to depth N, section 5.1).

**Part.** A query result, a neighborhood, one page, or a filter. Filters are parameters
(`labels`, `relationshipTypes`, `where` property equalities), compiled by the source into a
parameterized query (section 11). A query result that returns paths, nodes and relationships
mixed is flattened: every node and relationship in any returned value becomes a graph element,
de-duplicated by id. A row of scalars only (`RETURN n.name, count(*)`) is not a graph:
`E_SOURCE_NOT_A_GRAPH` with `params: { columns }`.

**Paging.** A source that pages returns `next` (records) or passes it to `report.finish()`
(advanced). graph-io stops writing at the caps and records `next` so the caller can continue.
Database sources page with keyset pagination on the element id (`WHERE id(n) > $after ORDER BY
id(n) LIMIT $pageSize` or the engine's equivalent), never with `SKIP`, so a page is stable under
concurrent writes that do not touch it and costs the same at any depth.

### 5.1 Incremental expansion

The reader clicks a node and asks for its neighbors. Two parts:

1. **graph-io fetches** with `expandFromSource(source, { params, ids, depth, direction, limit,
relationshipTypes }, options)`, which calls the source's `expand()` and returns a snapshot of
   ONLY what was fetched: the seed nodes, their neighbors and the edges between them. A source
   without `expand` answers `E_SOURCE_UNSUPPORTED` with `params: { feature: "expand" }`.
2. **graphty-element merges** that snapshot into the loaded graph with the existing
   `session.data.import(..., { mode: "merge", duplicateIds: "merge" })`. Merging graphs is graph
   state, which the element owns; graph-io stays a stateless reader. Nodes already present are
   matched by id and their attributes merged last-write-wins (the `addNodeRecord` rule); an edge
   already present is matched by its id when the source gives edge ids, else by `duplicateEdges`.

**Id stability** is what makes the merge correct, so each source documents its id rule and the
built-in ones pick the most stable id the service offers:

| Source     | Node id used                                                                         | Stable across fetches?                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NDEx (CX2) | the CX2 node `id` within one network                                                 | yes, for one network version; the network's `modificationTime` is recorded in `meta` so a later fetch can detect a changed network                                    |
| Neo4j      | `elementId(n)` by default; `idProperty` parameter to use a property (`uuid`) instead | elementId: within one database while the node exists; Neo4j may reuse it after deletion. A property is the stable choice for long-lived sessions, and the docs say so |
| Memgraph   | `id(n)` by default; `idProperty` as above                                            | internal ids can be reused after deletion; same advice                                                                                                                |
| Neptune    | `~id` (openCypher) / `T.id` (Gremlin)                                                | yes: Neptune ids are user-assigned or generated strings, never reused                                                                                                 |

When the same id space is loaded from two sources, collisions are the caller's choice: the
`idPrefix` option (`"neo4j:"`) is applied to every node id a source writes. Its default is no
prefix, the neutral behavior.

Expansion requests are idempotent: fetching neighbors of a node twice returns the same elements,
and the merge is a no-op. `ExpandRequest.exclude` (ids already loaded) lets a source skip
re-sending known nodes when the result would be large; it is an optimization, never needed for
correctness.

---

## 6. Authentication and secrets

### 6.1 Credentials are objects, made by factories

```ts
export const credentials: {
    bearer(token: string | (() => Promise<string>)): Credential;
    basic(username: string, password: string): Credential;
    apiKey(where: { header: string } | { query: string }, value: string): Credential;
    awsSigV4(options: {
        region: string;
        service?: "neptune-db" | "neptune-graph" | (string & {}); // default "neptune-db"
        credentials: AwsCredentials | (() => Promise<AwsCredentials>);
    }): Credential;
    custom(apply: (request: Request) => Promise<Request> | Request, kind?: string): Credential;
};

export type CredentialKind = "bearer" | "basic" | "api-key" | "aws-sigv4" | "custom";

export interface Credential {
    readonly kind: CredentialKind;
    /** The origin the credential is bound to, set on first use: it is never sent anywhere else. */
    readonly origin: string | null;
}
```

A token may be a function, so a caller with expiring tokens (OAuth, AWS STS) supplies a refresher
and graph-io calls it per request; graph-io never caches a token beyond one request.

The secret lives in a private class field (`#secret`), not a property. So:

- `JSON.stringify(credential)` is `{"kind":"bearer","origin":null}` (a `toJSON` method), and
  Node's `util.inspect` and the browser console show the same (a `Symbol.for("nodejs.util.inspect.custom")`
  method). A credential that ends up in a log, an error's details or a project file shows its kind
  only.
- No graph-io code path copies a secret into an `ImportIssue`, `ImportError.details`, a report,
  a cursor or `meta`. An `Authorization` header is never echoed: E_SOURCE_AUTH carries `status`
  and `scheme` (`"Basic"`, from `WWW-Authenticate`), not the request.
- graph-io keeps no credential after the load's promise settles. Persistence (a session-scoped
  password field, a keychain, an OAuth flow) is the application's choice.

### 6.2 Origin binding and redirects

A credential is applied only to requests whose origin equals the endpoint's origin (or the
explicit `allowedOrigins` of the credential). `ctx.fetch` to another origin goes out without it;
a source that needs to call two hosts (a login host, then an API host) lists both. A redirect
while a credential is attached is refused, not followed: requests carrying a credential are sent
with `redirect: "manual"` in Node, where the `Location` is visible and a same-origin redirect is
followed with the credential re-applied, and `redirect: "error"` in browsers, where a manual
redirect is opaque. Either way a cross-origin redirect fails with `E_SOURCE_REDIRECT` and
`params: { from, to }` (`to` is null in browsers, which hide it). The Fetch standard already strips
`Authorization` on a cross-origin redirect, but not custom headers (`X-API-Key`) nor query
parameters, and not every runtime implements the stripping, so graph-io does not rely on it.

### 6.3 What credentials each initial source takes

| Source                 | Credential kinds                                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NDEx                   | `basic` (account), `bearer` (an OAuth ID token); none for public networks | NDEx moved its sign-in to Keycloak in 2024; whether the REST API takes a Keycloak bearer token is unverified, so the NDEx sub-issue checks it. The `accesskey` of a network shared by link (spelled in lowercase in the query string) is a parameter of the network, but is treated like a secret: never in reports, cursors or `data.source()`                                                                                                      |
| Neo4j (HTTP)           | `basic`, `bearer` (SSO / Aura API)                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Bolt (Neo4j, Memgraph) | `basic`, `bearer`                                                         | the driver needs the raw secret: `boltSource` is the one built-in source that unwraps a credential, through an internal function not exported to other sources                                                                                                                                                                                                                                                                                       |
| Neptune                | `aws-sigv4` (IAM), or none when IAM auth is off                           | SigV4 is implemented in graph-io over WebCrypto (`crypto.subtle` HMAC-SHA256 and SHA-256, present in browsers and Node 18+), about 150 lines and tested against AWS's published signature test suite; no AWS SDK dependency. graph-io does not read `~/.aws` or environment variables: a Node caller passes credentials from the AWS SDK's provider chain as the function form, so graph-io stays dependency-free and never goes looking for secrets |

---

## 7. Browser and Node

| Source                           | Node 18+ | Browser                                  | Why                                                                                                                                                                                                                                                                                           |
| -------------------------------- | -------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom `records` / `file` source | yes      | when the service sends CORS headers      |                                                                                                                                                                                                                                                                                               |
| NDEx                             | yes      | yes                                      | every endpoint answers `Access-Control-Allow-Origin: *` and allows an `Authorization` header in preflight (checked 2026-10-17); cookie credentials would not work with a wildcard origin, which is one more reason graph-io sends credentials as headers                                      |
| Neo4j, HTTP Query API            | yes      | when the server allows the page's origin | self-managed Neo4j sends CORS headers (configurable); Aura's CORS behavior for the Query API is unverified and is the first thing the Neo4j sub-issue checks                                                                                                                                  |
| Neo4j / Memgraph, Bolt           | yes      | yes, over WebSocket                      | `neo4j-driver`'s browser build speaks Bolt over WebSocket; Neo4j and Memgraph (since 2.3) accept WebSocket Bolt on the Bolt port. Not to a self-signed certificate the browser does not trust                                                                                                 |
| Neptune                          | yes      | needs a proxy                            | Neptune sends no CORS headers, and most clusters are VPC-only (public endpoints, IAM-only, exist since engine 1.4.6.0). AWS's own graph-explorer routes every browser call through a signing proxy. A browser reaches Neptune through a proxy the deployer runs, and the proxy's auth applies |
| SPARQL (Wikidata)                | yes      | yes                                      | WDQS answers `Access-Control-Allow-Origin: *` and allows `Api-User-Agent`, which a browser sends in place of the `User-Agent` Wikimedia's policy asks for                                                                                                                                     |

Every descriptor states this in `runtimes`. When a source cannot run here, the load fails before
any request with `E_SOURCE_RUNTIME` and `params: { source, runtime, reason }` (`reason` from
`SourceRuntimeSupport.reason`), not with a fetch error. When the source CAN run but the request is
blocked (a CORS refusal looks like a network error with no status), the error is `E_FETCH` with
`params: { url, status: null, likelyCause: "network-or-cors" }`: the browser does not say which,
and graph-io does not pretend to know.

The Bolt subpath imports `neo4j-driver` with a dynamic `import()`. Absent, it fails with
`E_SOURCE_RUNTIME`, `reason: "needs-peer-dependency"`, `params.package: "neo4j-driver"`.

---

## 8. Errors and reports

Sources use the importers' contract unchanged: issues go into an `ImportReportBuilder`, a fatal
condition is `report.fail()`, which throws `ImportError` (`code: "E_IMPORT"`, `err.issue` the
stopping issue, `err.report` everything until then). The new codes, in `SOURCE_ISSUE` (exported
from the root, spread into every source's own table, as `INPUT_ISSUE` is for formats):

| Code                   | When                                                                                      | `params`                                        |
| ---------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `E_FETCH` (existing)   | network failure, CORS refusal, a status not covered below                                 | `url`, `status` (null when none), `likelyCause` |
| `E_SOURCE_AUTH`        | 401, or a database's authentication failure                                               | `status`, `scheme`, `serverCode`                |
| `E_SOURCE_FORBIDDEN`   | 403, or a database's authorization failure                                                | `status`, `serverCode`                          |
| `E_SOURCE_NOT_FOUND`   | 404 for the named item (an NDEx UUID, a database name)                                    | `what`, `value`                                 |
| `E_SOURCE_QUOTA`       | 429, or a quota answer, after retries ran out                                             | `retryAfterMs`                                  |
| `E_SOURCE_TIMEOUT`     | the caller's `timeoutMs`, or the server's own query timeout                               | `timeoutMs`, `serverSide`                       |
| `E_SOURCE_QUERY`       | the server rejected the query (syntax, unknown function, type error)                      | `serverCode`, `line`, `column`, `offset`        |
| `E_SOURCE_NOT_A_GRAPH` | a query result with no node, relationship or path in it                                   | `columns`                                       |
| `E_SOURCE_RESPONSE`    | a body that does not have the shape the source expects                                    | `expected`, `contentType`                       |
| `E_SOURCE_REDIRECT`    | a redirect refused while a credential was attached                                        | `from`, `to`                                    |
| `E_SOURCE_RUNTIME`     | the source cannot run in this runtime                                                     | `source`, `runtime`, `reason`, `package`        |
| `E_SOURCE_PARAM`       | a parameter is missing or invalid (checked against the descriptor before any request)     | `name`, `reason`                                |
| `E_SOURCE_LIMIT`       | a cap was reached and `limits.onLimit` is `"error"`                                       | `limit`, `value`                                |
| `E_SOURCE_UNKNOWN`     | no source of that id is registered                                                        | `id`, `known`                                   |
| `E_SOURCE_UNSUPPORTED` | the source lacks the feature asked for (expand, list, probe, cursor)                      | `feature`                                       |
| `E_SOURCE_INVALID`     | a source object is malformed at registration                                              | `id`, `reason`                                  |
| `W_SOURCE_LIMIT`       | a cap stopped the load; the graph holds what came before it                               | `limit`, `value`, `next` present                |
| `W_SOURCE_RETRIED`     | a request succeeded after retries (once per load, with the count)                         | `attempts`, `statuses`                          |
| `W_SOURCE_VALUE`       | a server value with no graph-format dtype (a Neo4j `Bytes`, a spatial value read as JSON) | `type`, `column`, `as`                          |

`serverCode` is the service's own error code (`Neo.ClientError.Statement.SyntaxError`,
Neptune's `MalformedQueryException`), passed through so an application can map it; the service's
own message goes in `params.serverMessage`, never interpreted. Every issue also keeps the existing
English `message`, which is for developers' logs; applications render from `code` and `params`.

`ImportReport.source` records, for every source load:

```ts
export interface SourceReportInfo {
    readonly id: string; // "neo4j"
    readonly endpoint: string | null; // origin + path only: never userinfo or query string
    readonly requests: number;
    readonly bytes: number;
    readonly next: SourceCursor | null; // where to resume; null when the result was complete
    readonly server?: Readonly<Record<string, string>>; // e.g. { product: "Neo4j", version: "5.24" }, from probe or headers
}
```

---

## 9. Cancellation, progress, limits, retries

- **Cancellation.** `options.signal` (from `CommonImportOptions`) aborts every in-flight request
  (it is passed to each `ctx.fetch`), the Bolt session (`session.close()`), and the write loop
  (`throwIfAborted` every 64 elements, the importers' rule). The load rejects with the signal's
  reason, as `loadFromUrl()` does. A database source also asks the server to stop where the
  protocol allows it: closing a Bolt session cancels its query; Neo4j's Query API has no cancel
  call, so an aborted HTTP query runs on in the server until its own timeout, and the docs say so.
- **Progress.** `options.onProgress(done, total?)` from `CommonImportOptions` reports bytes for a
  `file` source and items (nodes plus edges written) otherwise; `total` is passed when the service
  says it (NDEx summaries give node and edge counts; a Cypher count query is NOT run by default,
  since it costs a second query, and is the `countFirst: true` parameter).
- **Limits.** `limits: { maxNodes, maxEdges, maxBytes, maxRequests, timeoutMs, onLimit }`. Every
  default is "no limit" and `onLimit` defaults to `"stop"` (keep what came before, warn
  `W_SOURCE_LIMIT`, record `next`); `"error"` throws `E_SOURCE_LIMIT`. graph-io does not pick a cap
  because the right one depends on the consumer's screen and machine; graphty-element exposes the
  same options and the graphty app chooses its values. Database sources push `maxNodes` into the
  query as a `LIMIT` parameter so the server stops early instead of graph-io discarding rows.
- **Retries.** `retry: { retries: 3, baseDelayMs: 500, maxDelayMs: 30000 }` by default: on 429,
  502, 503 and 504 and on a network error, for idempotent requests (GET, and POSTs a source marks
  idempotent: a read-only query), with full-jitter exponential backoff, honoring `Retry-After`
  (seconds or a date) up to `maxDelayMs`. This is HTTP's own semantics, not a preference, so it is
  the default; `retry: false` turns it off. A 4xx other than 429 is never retried.
- **Rate limits.** A source can declare `descriptor.rateLimit: { requests, perMs }` (Semantic
  Scholar and NDEx publish limits); `ctx.fetch` spaces requests to it. No shared state across
  loads.

---

## 10. Type mapping

The rules are graph-format design section 5.1's, applied to typed values instead of text:

| Service type                                  | dtype                                                                                                                                                                                              | Notes                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Integer (Neo4j/Memgraph 64-bit; Neptune long) | `i32` when every value in the column fits, else `f64`                                                                                                                                              | above 2^53 the `long` option decides, as for file imports: `"f64"` (default, `W_PRECISION` per column) or `"string"`        |
| Float                                         | `f64`                                                                                                                                                                                              |                                                                                                                             |
| Boolean                                       | `bool`                                                                                                                                                                                             |                                                                                                                             |
| String                                        | `string`, or `dict` by the builder's cardinality rule                                                                                                                                              |                                                                                                                             |
| Date, LocalDateTime, DateTime, Time           | the temporal declared types of 5.1 (`f64` epoch milliseconds with the declared temporal kind; time zone id kept in column metadata when one zone; else ISO text as `string` with `W_SOURCE_VALUE`) |                                                                                                                             |
| Duration                                      | `string` (ISO 8601)                                                                                                                                                                                | no duration dtype exists                                                                                                    |
| Point (2D, 3D, any SRID)                      | `json` `{ srid, x, y, z? }`                                                                                                                                                                        | with `W_SOURCE_VALUE` once per column; a source may expose `pointAs: "split"` to write `name.x` / `name.y` as `f64` columns |
| List of one scalar type                       | `list` of that dtype                                                                                                                                                                               |                                                                                                                             |
| List of mixed types, Map                      | `json`                                                                                                                                                                                             |                                                                                                                             |
| Bytes                                         | dropped                                                                                                                                                                                            | `W_SOURCE_VALUE` (`as: "dropped"`)                                                                                          |
| Node labels                                   | node `labels`: list of dict, role `labels`                                                                                                                                                         | the neo4j CSV importer's column                                                                                             |
| Relationship type                             | edge `type`: dict, role `kind`                                                                                                                                                                     | the neo4j CSV importer's column                                                                                             |
| NDEx / CX2 attribute declarations             | as the CX2 importer reads them                                                                                                                                                                     | the NDEx source is a `file` source                                                                                          |

Integer precision is why the Neo4j source asks for typed JSON: the Query API's plain JSON returns
64-bit integers as JSON numbers, which `JSON.parse` rounds above 2^53, while typed JSON sends them
as strings. Neptune's JSON and NDEx's CX2 send numbers; a value above 2^53 there is already
rounded on the wire, which graph-io cannot detect and the docs say.

The typed paths (Neo4j Query API's typed JSON, Bolt's driver types, Neptune's typed JSON and
GraphSON) carry each value's type, so columns are declared from it; the inference path of
`addNodeRecord` is used only for untyped JSON (custom `records` sources, SPARQL literals without a
datatype).

---

## 11. Injection and transport safety

- **Parameters only.** Every built-in source sends caller values as query parameters, never by
  splicing text. A user query is passed through as written (it is the caller's query, and running
  it is the point), with its `parameters` sent separately. Generated queries (neighborhood, all,
  filters) are fixed text with `$parameters`.
- **Identifiers cannot be parameters** in Cypher (labels, relationship types, property keys) or
  in SPARQL (IRIs in some positions). Generated queries that need one check it against the
  descriptor's value list or the service's own schema (`db.labels()`), and quote it with the
  language's escaping (Cypher backticks with doubled backticks inside). A value that fails is
  `E_SOURCE_PARAM`, `reason: "identifier"`.
- **SPARQL has no parameters.** The SPARQL source exports `sparql` term helpers (`iri()`,
  `literal(value, datatypeOrLang)`) that validate and escape per the SPARQL 1.1 grammar, and a
  tagged template that accepts only those terms or numbers in `${}` positions.
- **Read-only by default.** The database sources open read sessions where the protocol has them
  (Bolt `defaultAccessMode: READ`, Neo4j Query API `accessMode: "Read"`, Neptune's read replica
  endpoint when given). A query that writes then fails on the server (`E_SOURCE_FORBIDDEN` or
  `E_SOURCE_QUERY`). This is a safety default, not a filter graph-io implements: graph-io never
  parses a query to judge it.
- **Redirects and credentials:** section 6.2. **Endpoint userinfo** (`https://user:pass@host`) is
  refused with `E_SOURCE_PARAM` (`reason: "credentials-in-url"`): credentials go in `credential`.
- **Responses are untrusted.** Sizes are capped by `maxBytes`, JSON is parsed with `JSON.parse`
  only, and nothing a server returns is evaluated or used as a URL without checking its origin
  (an NDEx search result's link, a GraphQL `next` URL).

---

## 12. The initial sources

Facts below were checked against the services' current documentation and, where marked, by live
requests on 2026-10-17. Each source's sub-issue re-checks them before building.

### 12.1 NDEx (`@graphty/graph-io/sources/ndex`)

NDEx (https://www.ndexbio.org) is the public repository of biological networks Cytoscape users
publish to. The live server reports version 3.0.8 and about 320,000 networks.

| Need                     | Endpoint                                                                                                                                                      | Method                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Download a network       | `GET /v3/networks/{uuid}` (CX2: a JSON array starting `{"CXVersion":"2.0"}`, then `metaData` with element counts per aspect)                                  | `file`, format `cx2`, read by the existing CX2 importer |
| Metadata before download | `GET /v2/network/{uuid}/summary` (name, owner, node and edge counts, `cx2FileSize`, `properties` including the license text)                                  | `probe`, and `total` for progress                       |
| Search                   | `POST /v2/search/network?start=&size=` with `{ searchString, accountName?, permission?, includeGroups? }`; answers `{ numFound, start, networks: [summary] }` | `list`                                                  |
| Private network          | Basic auth, or `?accesskey=` for one shared by link                                                                                                           | credential, or the `accessKey` parameter                |

Parameters: `uuid` (or `url`: a full NDEx network or share URL, parsed into `uuid` and
`accessKey`, as Cytoscape's NDEx search box accepts a share URL), `accessKey`, `format` (`"cx2"`
default, `"cx"` for the CX1 endpoint `GET /v2/network/{uuid}` on servers without CX2). The default
endpoint is `https://www.ndexbio.org/`; a self-hosted NDEx is another `endpoint`.

- The summary's `cx2FileSize` and counts let the caps refuse a network before downloading it:
  with `maxBytes` or `maxNodes` set and exceeded, the load fails or stops before the first byte of
  the network (`E_SOURCE_LIMIT` or `W_SOURCE_LIMIT` with `next: null`, since a file cannot be
  paged).
- v2 search is used: the v3 search endpoint answered 500 when probed. The meaning of `start` (a
  page number or an offset) is ambiguous in the docs and is pinned by a recorded test.
- The summary's `modificationTime` and `rights` are written to the graph's `meta`, so an
  application can show the license and detect a changed network.
- The server caps results at 10,000; NDEx publishes no rate limit.

### 12.2 Neo4j over the Query API (`@graphty/graph-io/sources/neo4j`)

The default Neo4j source speaks the HTTP Query API, `POST /db/{database}/query/v2`, enabled by
default since Neo4j 5.26 and on Aura. It needs no driver, so it costs no dependency.

- Request: `{ statement, parameters, maxExecutionTime? }`, sent with `Accept:
application/vnd.neo4j.query.v1.1` (or the newest version the server advertises) to get **typed
  JSON**: every value is `{ "$type": "Integer", "_value": "123" }`, integers and temporals as
  strings. Plain JSON is not used: it returns 64-bit integers as JSON numbers, which lose
  precision when parsed, and returns temporal and spatial values as text with no type.
- Nodes arrive as `{ elementId, labels, properties }`, relationships as `{ elementId,
startNodeElementId, endNodeElementId, type, properties }`, paths as alternating arrays. The
  source flattens every node, relationship and path in any column of any row (section 5).
- `accessMode: "Read"` is sent for every generated query and by default for a user query
  (`write: true` is a parameter, off by default, for a caller who knows their query writes).
- The response is one JSON document, not a stream, so `maxNodes` is enforced by a `LIMIT`
  parameter in generated queries and by paging (`mode: "all"` and `expand` page by element id).
  A user query is run as written; the docs advise a `LIMIT` in it.
- The older transactional endpoint `/db/{db}/tx` is deprecated as of 5.26 and is not supported.
  Servers older than 5.26 are reached over Bolt (12.3).
- `probe` runs `CALL dbms.components()` and reports product, version and edition.

### 12.3 Bolt: Neo4j and Memgraph (`@graphty/graph-io/sources/bolt`, `/sources/memgraph`)

Memgraph has no HTTP query API; Bolt is its only query protocol (Bolt over WebSocket since
Memgraph 2.3, on the same port 7687). Neo4j before 5.26, and anyone who prefers Bolt, need it
too. Implementing Bolt by hand (PackStream, the handshake, routing) is a large, security-relevant
protocol client; the official `neo4j-driver` already does it and is the client Memgraph's own docs
recommend. So the Bolt sources use `neo4j-driver` as an **optional peer dependency**, imported
dynamically by the Bolt subpath only:

- A consumer who never loads a Bolt source never installs or downloads it. graph-io's runtime
  dependency list stays empty.
- It costs about 115 KB gzipped (`neo4j-driver-lite`, which covers everything the source uses, is
  about 82 KB) for a consumer who does. The peer range is the driver's current major.
- Absent, the source fails with `E_SOURCE_RUNTIME`, `reason: "needs-peer-dependency"`.
- The driver's lossless `Integer` is converted by the type rules of section 10 (never
  `disableLosslessIntegers`, which rounds silently); its temporal and `Point` classes map the same
  way as typed JSON's.
- Sessions are opened with `defaultAccessMode: READ`. Abort closes the session, which cancels the
  query on the server.

`memgraphSource` is `boltSource` with Memgraph's defaults: ids from `id(n)`, its error codes mapped, and Memgraph's own spatial and
duration types. Memgraph's docs advise against running queries from a browser; the source allows
it (the runtime table says so) and leaves the choice to the application.

### 12.4 AWS Neptune (`@graphty/graph-io/sources/neptune`)

Neptune is reached over HTTPS, with no driver:

- **openCypher:** `POST https://<endpoint>:8182/openCypher`, form fields `query` and `parameters`
  (JSON). Results are `{ "results": [ ... ] }` with nodes as `{ "~id", "~entityType": "node",
"~labels", "~properties" }` and relationships with `~start`, `~end`, `~type`. HTTP/1.1 only.
- **Gremlin:** `POST /gremlin` with `{ "gremlin": <script>, "bindings": { ... } }`, GraphSON
  results. HTTP rather than the WebSocket protocol: it needs no driver, and TinkerPop 4.0 removes
  WebSocket in favor of HTTP anyway. The user's script goes with its bindings; generated
  traversals use bindings only.
- **IAM auth:** SigV4, service `neptune-db`, implemented in graph-io over WebCrypto (section 6.3).
  `credentials.awsSigV4` takes a provider function so temporary credentials refresh.
- **Streamed errors:** Neptune streams results, and an error after the first chunk is appended to
  the body, which leaves invalid JSON. The source sends `TE: trailers` and reads
  `X-Neptune-Status` in Node; in browsers (no trailers) a body that fails to parse after a 200 is
  `E_SOURCE_QUERY` with `params.serverMessage` taken from the appended tail when it parses, never
  a partial graph presented as complete.
- **SPARQL** (`/sparql`) is the RDF side of Neptune and goes through the generic SPARQL source
  (section 16) with the same SigV4 credential.
- **Neptune Analytics** (`POST /queries` with a `graphIdentifier` header, openCypher only, SigV4
  service `neptune-graph`) is a small variant: a `variant: "analytics"` parameter, built in the
  same sub-issue if cheap, else ranked in section 16.

Ids are Neptune's `~id` strings, which are stable. Labels go to `labels`, relationship types to
`type`, as in 12.2.

---

## 13. graphty-element integration

graph-io owns the sources; graphty-element makes every registered source loadable with no
integration code of the consumer's own. The element already wraps graph-io importers as data
sources (`DataSource.fromImporter`), so sources follow the same seam.

### 13.1 One registry, read by the element

The element does not keep a second list. It reads graph-io's default registry through
`listSources()` and offers every source there, the built-in ones included, and a consumer's own
source registered with `registerSource()` from `@graphty/graph-io` (re-exported by
`@graphty/graphty-element/extend`) appears in the element's catalogue the same way. The catalogue
entry is the source's `SourceDescriptor`, exposed by the element's `./catalog` entry point as
`sourceDescriptors()` beside `formatDescriptors()`, so a settings form (the graphty app's Import
dialog, "A source" segment, `design/ui/object-first-ux/round-3/import.md` section 2.13) draws
its fields from the descriptor and builds no client.

`DataSource.fromSource(source)` turns a source into a reader class for consumers who register
element data sources directly; the element calls it for every registered source on first use, so
nobody has to.

### 13.2 Loading

```ts
// The session API: a source load is one undoable step, like a file load.
await session.data.import(
    { type: "neo4j", config: { query, parameters }, name: "Friends of Ana" },
    { mode: "replace", credential: credentials.basic("neo4j", password), endpoint: "https://..." },
);

// The element method, for consumers who do not use the session:
await element.loadFromSource("ndex", { uuid }, { replace: true });
```

- `type` is the source id; `config` its parameters. Both are recorded in `data.source()` and in
  a project file exactly as for a file or URL load, so a reload re-runs the same source load.
- `credential` and `endpoint` are load OPTIONS, not config. `credential` is never recorded: not
  in `data.source()`, not in the undo journal, not in a project file, not in an event. A reload
  of a source that needs one fails with `E_SOURCE_AUTH` until the application supplies it again
  (the application decides whether to keep a session-scoped secret). `endpoint` IS recorded
  (origin and path only), since a reload needs it.
- Every source option graph-io takes (limits, retry, cursor, idPrefix) is a load option of the
  same name, with graph-io's neutral defaults.
- Errors reach the consumer as the element's coded errors: the `ImportError` issue's `code` and
  `params` become the `GraphtyError`'s `code` and `details`, so `E_SOURCE_AUTH` reads the same in
  both packages. Progress is the existing `data-loading-progress` event, with `unit` added.

### 13.3 The rest of the source surface

| Element call                                                          | graph-io call                                               | For                                                                                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `session.data.testSource({ type, config }, { credential, endpoint })` | `probeSource()`                                             | "Test connection": resolves to a `SourceProbe` (`{ ok, server: { product, version }, counts }`) or rejects with the coded error |
| `session.data.listSource({ type, config }, query)`                    | `listFromSource()`                                          | NDEx search, a database's list of graphs: neutral rows (`id`, `name`, `nodeCount`, `edgeCount`, `owner`, `modified`)            |
| `session.data.expand(ids, { depth, direction, limit })`               | `expandFromSource()`, then `import(..., { mode: "merge" })` | fetch the neighbors of loaded nodes from the source the graph came from; `E_SOURCE_UNSUPPORTED` when it cannot                  |
| `session.data.more()`                                                 | `loadFromSource(..., { cursor })`, then merge               | fetch the next page after a capped load; `session.data.source().next` says whether there is one                                 |

All four are capabilities, not choices: a consumer never sequences a probe, a fetch and a merge
by hand, so they live in the element. What to show while they run, and whether to offer them at
all, is the application's.

---

## 14. Testing without live credentials

1. **Recorded responses** (every source, every pull request). Each source's tests run against
   fixtures: real responses captured once from the live service (with secrets and personal data
   removed) and replayed through the `fetch` option, the same injection graph-samples uses
   (`fetchDataset(name, { fetch })`). The replay matches method, path and body, and fails on an
   unrecorded request, so a test can never reach the network. Fixtures live in
   `graph-io/test/sources/<source>/`, with a README naming the service version they were captured
   from. Error paths (401, 403, 404, 429 with `Retry-After`, 503, a malformed body, a query error,
   a redirect to another host) are recorded or written by hand.
2. **A source conformance suite** (`graph-io/test/sources/conformance.test.ts`) runs every
   registered built-in source through the same checks: the descriptor validates; parameters are
   checked before any request; a credential never appears in a report, an error's details, a
   cursor or `JSON.stringify` of anything returned (the test uses a sentinel secret and searches
   every output); the global `fetch` is never called; abort rejects within one page; caps stop
   with `W_SOURCE_LIMIT` and a cursor that resumes exactly where the load stopped.
3. **Real databases in containers** (Neo4j and Memgraph). A `graph-io-sources` CI shard starts
   the official `neo4j` and `memgraph/memgraph` images as GitHub Actions service containers, loads
   a fixed seed graph with every property type, and runs the Bolt and HTTP sources against them.
   It runs on pull requests that change `graph-io/src/sources/`, in the merge queue and on the
   release train. Locally it runs with Docker when present and skips with a printed reason when
   not.
4. **Neptune** has no local emulator. Its tests are recorded responses plus the SigV4 signer
   checked against AWS's published signature test vectors (the `aws-sig-v4-test-suite`). An
   optional live lane runs against a real Neptune cluster only when the owner provides one; it
   is not planned.
5. **Live public services** (NDEx, Wikidata): a weekly workflow, like `links-weekly.yml`, loads a
   few known public networks and files an issue when a service's response shape changed. It never
   gates a pull request: a third party's outage must not block merges.
6. **The docs examples** run in `test/docs-examples.test.ts` against recorded responses, as the
   existing examples run against corpus files.

---

## 15. Prior art

| Prior art                                              | Contract                                                                                                                                                           | Right                                                                                                        | Wrong, or not for us                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cytoscape (Import Network from URL; CyNDEx-2 for NDEx) | URL import is file import; NDEx search takes a keyword, a UUID, a gene or a share URL                                                                              | a share URL is a first-class input (adopted: NDEx `url` parameter)                                           | URL import has no auth; each service is a separate app with its own UI                                                                                           |
| ndex2 (Python), `@js4cytoscape/ndex-client` (JS)       | thin wrappers per endpoint: `search_networks`, `get_network_summary`, `get_network_as_cx2_stream(id, access_key)`                                                  | close to the REST API, easy to follow                                                                        | no graph model; the JS client documents `accessKey` but sends `accesskey`, so the documented spelling is ignored (adopted: recorded tests pin the wire spelling) |
| Gephi database import                                  | the user writes a node query and an edge query and aliases columns to `id`, `label`, `source`, `target`, `weight`; every other column becomes an attribute         | declarative column binding, no code (adopted: fixed record field names, `idKey` / `sourceKey` / `targetKey`) | JDBC only; two queries with no consistency between them                                                                                                          |
| Graphistry (pygraphistry)                              | every connector (`cypher()` over Bolt for Neo4j, Memgraph and Neptune; `gremlin()`, `tigergraph()`) produces the same nodes and edges tables bound by column names | one output shape for every source (adopted: everything lands in a `GraphSink`)                               | Python only; connectors are methods on one class, so a third party cannot add one on equal terms                                                                 |
| KeyLines / ReGraph                                     | the application fetches; the library loads `{ type: "node", id }` / `{ type: "link", id1, id2 }` items                                                             | transport-neutral                                                                                            | every application rewrites fetching, paging, auth and errors: the defect this design exists to remove                                                            |
| Apache TinkerPop drivers                               | traversals sent as bytecode with parameter bindings                                                                                                                | bindings make injection structurally hard (adopted: parameters only)                                         | tied to WebSocket in 3.x, replaced by HTTP in 4.0; a heavy dependency for read-only loading                                                                      |
| LlamaIndex `PropertyGraphStore`                        | `get`, `get_triplets`, depth-aware `get_rel_map`, `structured_query(query, param_map)`, capability flags (`supports_structured_queries`)                           | capability flags and a raw-query escape hatch (adopted: `features`, the `query` mode)                        | a read-write store interface; far more than a loader needs                                                                                                       |
| LangChain `GraphStore` / `Neo4jGraph`                  | `query(cypher, params)`, `get_schema`, `refresh_schema`                                                                                                            | parameterized queries; schema introspection for a form                                                       | results are rows, not a graph                                                                                                                                    |

The design takes the shared lesson: one output shape (a sink), parameters never spliced, a
declared capability list, and a contract a third party implements on the same terms as the
built-in sources.

---

## 16. Other online sources, ranked

Ranked by how much graphty's personas would want each (the bioinformatics, genomics, knowledge
engineering, fraud and intelligence analysts in `design/designloom/personas/`) against how hard it
is. "Browser" means the service answers CORS (checked 2026-10-17 unless marked).

| Rank | Source                                                            | What                                                                                                                                                             | Browser                                          | Effort                  | Why this rank                                                                                                                                                                                                                                                   |
| ---- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Generic SPARQL** (Wikidata, any RDF store, Neptune's SPARQL)    | SELECT with node and edge variables, or CONSTRUCT returning triples, mapped to nodes and edges                                                                   | yes (WDQS)                                       | medium                  | knowledge engineers' main tool; one source covers every RDF store. Wikidata: 60 s timeout, 5 parallel queries per IP, 429 with `Retry-After`, `Api-User-Agent` required; since 2025 scholarly articles are a separate endpoint (`query-scholarly.wikidata.org`) |
| 2    | **STRING**                                                        | protein interaction network for a gene list: `/api/json/network?identifiers=&species=&required_score=`                                                           | yes                                              | low                     | the bioinformatics personas ask for it by name; one call per network; asks for one second between calls and a pinned version host                                                                                                                               |
| 3    | **Generic REST mapping**                                          | a declared mapping (JMESPath, which the element already uses for `nodeIdPath`) from any JSON API's records to nodes and edges, with Link-header or cursor paging | per service                                      | medium                  | the "no code" version of section 4.1 for analysts; Gephi's column-binding lesson                                                                                                                                                                                |
| 4    | **OpenAlex**                                                      | citation and co-authorship graphs from works, authors and institutions                                                                                           | yes                                              | low                     | free (CC0), no key for casual use (10 requests per second); cursor paging beyond 10,000 results needs a free key                                                                                                                                                |
| 5    | **Netzschleuder**                                                 | about 300 curated research networks with metadata, as CSV, GraphML or GML files                                                                                  | no (Node or proxy)                               | low                     | the best-documented catalogue of research networks; a `file` + `list` source like NDEx. graph-samples could host the popular ones for browsers                                                                                                                  |
| 6    | **Gremlin servers** (JanusGraph, Cosmos DB, any TinkerPop server) | Gremlin over HTTP, as Neptune's Gremlin path                                                                                                                     | server-dependent                                 | low once Neptune exists | Cosmos DB speaks only text scripts and GraphSON v2 in its own shape, and Microsoft now steers new work elsewhere: lower within the rank                                                                                                                         |
| 7    | **GraphQL**                                                       | Relay connections; the caller declares which types are nodes and which fields are edges                                                                          | per service                                      | medium                  | trees, not graphs, so the mapping is the caller's work; useful for product APIs (GitHub's)                                                                                                                                                                      |
| 8    | **BioGRID**                                                       | curated interactions, REST with a free access key, at most 10,000 per request                                                                                    | yes                                              | low                     | strong demand among the same personas as STRING, but needs a key, so after STRING                                                                                                                                                                               |
| 9    | **ArangoDB**                                                      | AQL over HTTP (`/_api/cursor` with `bindVars`, cursor batches)                                                                                                   | when configured                                  | low                     | plain HTTP with bind variables; smaller user base than Neo4j                                                                                                                                                                                                    |
| 10   | **Semantic Scholar**                                              | citation graph                                                                                                                                                   | yes                                              | low                     | overlaps OpenAlex; the keyless pool is shared and an API key starts at 1 request per second                                                                                                                                                                     |
| 11   | **OpenStreetMap (Overpass)**                                      | ways and nodes as a road or rail graph                                                                                                                           | documented yes (not confirmed: probes timed out) | medium                  | geographic graphs are a showcase, but turning ways into a routable graph is real work                                                                                                                                                                           |
| 12   | **GitHub dependency graph**                                       | SPDX SBOM `relationships` as a dependency graph                                                                                                                  | not checked                                      | low                     | needs a token; the synchronous SBOM endpoint closes after 2026-11-13, so build on the report endpoints                                                                                                                                                          |
| 13   | **Dgraph, TigerGraph, NebulaGraph**                               | DQL over HTTP; RESTPP / GSQL; NebulaGraph only through a separate HTTP gateway                                                                                   | unverified                                       | medium each             | small graphty audiences; wait for demand                                                                                                                                                                                                                        |
| 14   | **Neptune Analytics**                                             | openCypher via `POST /queries`, SigV4 `neptune-graph`                                                                                                            | no (proxy)                                       | low after Neptune       | built with Neptune if cheap (12.4)                                                                                                                                                                                                                              |
| --   | **SNAP, KONECT, Network Repository, Kaggle**                      | bulk archives (`.txt.gz`, `tar.bz2`, zips; Kaggle needs a token)                                                                                                 | SNAP and KONECT no; Network Repository yes       | --                      | not sources: bulk archives with no query API are better served by graph-samples hosting the useful ones as wire files (section 17) or by `loadFromUrl`                                                                                                          |

Recommendation: after the initial four, build **generic SPARQL**, then **STRING**, then the
**generic REST mapping**, then **OpenAlex**. Each is one lower-priority sub-issue.

---

## 17. graph-samples' dataset downloads

`fetchDataset(name, { baseUrl, fetch, signal })` downloads a gzipped graph-format wire file from
graphty.app and decodes it. It shares the shape of a `file` source but needs none of its
machinery: no importer (wire bytes decode straight into a snapshot), no auth, no paging, no
query, and a fixed, trusted host. Folding it into the source registry would make graph-samples
depend on graph-io for nothing.

Decision: **two mechanisms, one catalogue.** graph-samples keeps `fetchDataset`; graphty-element,
which depends on both packages, registers a `graph-samples` source built with the public
`defineSource` (an `import()` that calls `fetchDataset` and copies the snapshot into the sink), so
the element's catalogue lists datasets and network sources together and the dataset source
doubles as the dogfood example of a third-party source. The injectable `fetch` option is the
pattern both share for tests.

---

## 18. Live and changing sources

Polling and subscriptions are out of scope. They would not fit the load contract: a load writes
into a `GraphSink`, an append-only builder that ends in one frozen snapshot, while a live source
emits changes, including removals and attribute updates, to a graph that already exists. A later
design would add an optional `watch(params, ctx): AsyncIterable<GraphChange>` method, where
`GraphChange` is `{ kind: "add" | "update" | "remove", nodes, edges }` keyed by the same stable
ids section 5.1 requires, and graphty-element would apply the changes to its graph (it already
has `addNodes`, `updateNodes`, `removeNodes`). Nothing in this design blocks that: ids are stable,
the context carries the signal that would end a subscription, and the element owns graph state.
Polling a source on a timer needs no new contract at all: it is a reload, which the application
schedules.

---

## 19. Work breakdown

Once this design is accepted, the sub-issues are:

1. **Framework** (graph-io and graphty-element): the contract types, `defineSource`, the registry
   methods and lazy sources, `loadFromSource` / `importFromSource` / `expandFromSource` /
   `probeSource` / `listFromSource`, `credentials` with origin binding, the guarded fetch (retry,
   redirect, limits, progress), `ImportIssue.params` and `ImportReport.source`, the `SOURCE_ISSUE`
   codes, the replay `fetch` and the conformance suite, the guide pages ("Loading from a service",
   "Writing a source"), and the element side (section 13). Effort: high.
2. **NDEx** (depends on 1): `file` + `list` + `probe`; public, private and access-key networks.
   Effort: medium.
3. **Neo4j over the Query API** (depends on 1): query, all, neighborhood, expand; typed JSON
   mapping. Effort: medium.
4. **Bolt, with Memgraph** (depends on 1 and the owner's answer on the peer dependency): Neo4j and
   Memgraph over Bolt, WebSocket in browsers; the container CI shard. Effort: medium.
5. **AWS Neptune** (depends on 1): openCypher and Gremlin over HTTPS, the SigV4 signer and its
   test vectors. Effort: medium.
6. Lower priority, one issue each, in the order of section 16's ranking.

---

## 20. Decisions for the owner

Everything else here is additive API, decided by the design. These four publish contracts that
are hard to change once consumers use them:

1. **The source contract itself** (`GraphSource`: `records` / `file` / `import`, `expand`,
   `probe`, `list`, and `SourceContext`). Third parties will implement it, so a later change
   breaks their sources. Recommendation: ship it marked experimental (`@experimental` in the docs
   and the API report) for the first two graph-io minor releases, and freeze it after the four
   initial sources have been built on it.
2. **How a source load is named and persisted:** `{ type: <source id>, config: <params>, endpoint }`
   in `data.source()` and project files, with credentials never stored. Project files outlive
   releases, so this is a data format. Recommendation: this shape, and **no URL scheme** (no
   `ndex://` or `graphty-source:` URIs) until a real need for shareable links appears; a scheme
   would be a second public naming contract to keep in step with the first.
3. **`neo4j-driver` as an optional peer dependency of graph-io** for the Bolt sources (needed for
   Memgraph at all, and for Neo4j before 5.26). The alternative is no Bolt: Memgraph unsupported
   and old Neo4j reachable only through a newer server. Recommendation: the optional peer
   dependency, loaded only by the Bolt subpath.
4. **Source ids as public names** (`ndex`, `neo4j`, `bolt`, `memgraph`, `neptune`, later `sparql`):
   they appear in code, in project files and in the element's catalogue. Recommendation: these
   ids, with one id per service, not per protocol, except `bolt`, which serves several servers.
