# Loading graphs from network sources

> The Mergify merge queue, the `hold` label and per-change pull requests were retired on 2026-10-18; changes now land through one integration branch (design/ci/golden-local.md). Read the merge-queue parts below as history.

Status: design, 2026-10-17. Nothing here is implemented. Tracking issue: #2907. Browser and Node
behavior was measured on 2026-10-17 (section 7 says how), the Cypher path was run against a live
Memgraph 2.22.1 (section 12.3), OpenAlex was checked live (section 13.3) and every sample source in
section 12.5 was read from a browser page; everything marked unverified was not.

## The problem in one paragraph

graph-io reads a graph only from bytes the caller already holds: a string, a `Uint8Array`, a stream,
a `File`, or one URL fetched whole by `loadFromUrl()`. Much graph data lives behind a service
instead: public repositories (NDEx), graph databases (Neo4j, AWS Neptune), SPARQL endpoints
(Wikidata), REST and GraphQL APIs. Reading from those today means the caller writes the client, the
authentication, the paging, the error handling and the conversion to a graph. This design adds
**network sources** to graph-io: a small public contract for "something that turns parameters into a
graph over the network", a registry, three built-in sources (NDEx; one Cypher source for Neo4j and
Neptune; a declarative REST mapping with an OpenAlex preset), and the graphty-element side: loading,
click-to-expand, combining sources, remembered credentials, and reopening a saved project with its
data kept fresh.

## Requirements this design is held to

1. **Anyone can write a source** with the API graph-io's own sources use. A first custom source (a
   REST endpoint returning JSON) is about 15 lines and names no internal concept. The advanced path
   (writing into a `GraphSink`) is the one the simple path wraps.
2. **Pay only for what you use.** Each source is its own subpath, loaded on first use. graph-io
   keeps zero runtime dependencies.
3. **Whole graphs, parts and later expansion** go through one contract. Nothing is held twice in
   graph-io, and the element shows a paged source page by page.
4. **Neutral facts.** Every failure is an `ImportIssue` with a stable `code` and machine-readable
   `params`; graph-io writes no reader-facing sentences. Every behavior a consumer might want
   either way is an option whose default is the neutral behavior of the mechanism.
5. **Secrets do not leak.** graph-io never logs, serializes, stores or forwards a credential to
   another host, and never sends one unencrypted unless told to. A credential used in a browser is
   still visible to the reader and to every script on the page (section 6.4).
6. **graphty-element is self-sufficient.** A consumer with only the element installed loads from
   any registered source by naming it; the graphty app only renders the form the element describes.
7. **No server component.** graphty runs with no server of its own, so nothing here needs a proxy,
   relay, bridge or any other program the reader or deployer must run. A service graphty-element
   cannot reach directly from a browser is either Node-only or out of the design. Configuring the
   service's own settings (its CORS, TLS, public endpoint, an AWS identity pool) is not a server
   component and is allowed.

---

## 1. Where this sits in the code that exists

Reused unchanged: `GraphSink` (`graph-format/src/types/builder.ts`); the importer shape
`import(input, sink, options)`; `ImportReport`, `ImportIssue`, `ImportError` and
`ImportReportBuilder`; `CommonImportOptions` (`ids`, `duplicateEdges`, `addMissingNodes`,
`errorLimit`, `signal`, `onProgress`); `FormatRegistry.importGraph()` for a fetched file;
`throwIfAborted` and the declared-type rules of graph-format design 5.1; the neo4j CSV importer's
`labels` and `type` columns; graphty-element's `DataSource.fromImporter`, `session.data.import`
and `data.source()`; graph-samples' `fetchDataset` (section 20).

Additive changes to existing types:

- `ImportIssue.params?: Readonly<Record<string, unknown>>`, the issue's values (`{ status: 401 }`).
- `ImportIssue.code` typed `SourceIssueCode | (string & {})`: source codes autocomplete, every
  existing code still compiles.
- `ImportReport.source?: SourceReportInfo`, present on every source load (section 8).
- `onProgress(done, total?, unit?)`: a third optional argument, `"bytes" | "items"`.
- graph-format documents `sink.addNodeRecord()` / `addEdgeRecord()` as "for the transitional
  element path and JSON". The `records` path is built on them, so the framework issue makes them
  permanent API in graph-format's docs. This design depends on that.

---

## 2. The source contract

A source is a plain object: an id, an optional descriptor (what a form needs to ask for its
parameters), and exactly ONE of three read methods, simplest first. The type enforces "exactly
one":

```ts
interface SourceBase<P> {
    readonly id: string; // lowercase letters, digits, dashes
    readonly descriptor?: SourceDescriptor; // optional for a source used only from code
    readonly idKey?: string; // record field names when not id / source / target
    readonly sourceKey?: string;
    readonly targetKey?: string;
    expand?(request: ExpandRequest<P>, sink: GraphSink, ctx: SourceContext): Promise<ImportReport>;
    probe?(params: P, ctx: SourceContext): Promise<SourceProbe>; // check params and credentials
    list?(query: SourceListQuery<P>, ctx: SourceContext): Promise<SourceListing>; // search
    validate?(params: P, seen: SourceValidators, ctx: SourceContext): Promise<SourceFreshness>; // section 16
}

type RecordsFn<P> = (params: P, ctx: SourceContext) => Promise<RecordBatch> | AsyncIterable<RecordBatch>;
type FileFn<P> = (params: P, ctx: SourceContext) => Promise<SourceFile>;
type ImportFn<P> = (params: P, sink: GraphSink, ctx: SourceContext) => Promise<ImportReport>;

export type GraphSource<P = Record<string, unknown>> =
    | (SourceBase<P> & { records: RecordsFn<P>; file?: never; import?: never })
    | (SourceBase<P> & { file: FileFn<P>; records?: never; import?: never })
    | (SourceBase<P> & { import: ImportFn<P>; records?: never; file?: never });

export function defineSource<P>(source: GraphSource<P>): GraphSource<P>;
export function registerSource(source: GraphSource<any> | LazySource): void;
```

`defineSource` is an identity function for inference that runs the registration checks early.
`registerSource` refuses a malformed source or a duplicate id: `E_SOURCE_INVALID`
(`params: { id, reason: "read-methods" | "duplicate" | "features" }`). Source ids and format names
are separate name spaces, so the built-in `neo4j` source and the existing `neo4j` CSV format both
keep their names.

graph-io implements `records` and `file` on top of `import`: records go through
`addNodeRecord()` / `addEdgeRecord()` (type inference per column), a file through
`importGraph()` with the returned `format`, `filename` and `mimeType` as hints.

```ts
export type NodeRecord = { readonly id: NodeId } & Readonly<Record<string, unknown>>;
export type EdgeRecord = { readonly source: NodeId; readonly target: NodeId; readonly id?: NodeId } & Readonly<
    Record<string, unknown>
>;

export interface RecordBatch {
    readonly nodes?: readonly NodeRecord[];
    readonly edges?: readonly EdgeRecord[];
    readonly next?: SourceCursor | null; // where to resume; null or absent on the last page
    readonly meta?: Readonly<Record<string, unknown>>; // name, description
}

export interface SourceFile {
    readonly body: Response | ImportInput;
    readonly format?: string; // "cx2", or omitted to detect it
    readonly filename?: string;
    readonly mimeType?: string;
}

/** Opaque and JSON-serializable; only the source that made it reads it. */
export type SourceCursor = Readonly<Record<string, string | number | boolean | null>>;
```

A source that sets `idKey`, `sourceKey` or `targetKey` gets loosely typed records; nothing is
guessed.

### 2.1 The context

Every method receives a `SourceContext`, the one place auth, redirects, retries, limits,
cancellation and progress are implemented for every source:

```ts
export interface SourceContext {
    /** fetch() with the credential, redirect guard, retries, signal, byte cap and progress; relative URLs resolve against `endpoint`. */
    readonly fetch: (input: string | URL, init?: SourceRequestInit) => Promise<Response>;
    readonly fetchJson: <T = unknown>(input: string | URL, init?: SourceRequestInit) => Promise<T>; // non-JSON: E_SOURCE_RESPONSE
    readonly endpoint: URL | null; // the caller's, else the descriptor's default
    readonly signal: AbortSignal;
    readonly report: ImportReportBuilder;
    readonly limits: SourceLimits; // reached(): graph-io counts what the sink received
    progress(done: number, total?: number, unit?: "items" | "bytes"): void;
    readonly cursor: SourceCursor | null; // the caller's `cursor`
    finish(result?: { readonly next?: SourceCursor | null }): ImportReport;
    readonly runtime: SourceRuntime;
}
```

The context exposes no credential: `ctx.fetch` applies it. A source must not call the global
`fetch`; the conformance suite (section 17) fails a built-in source that does.

### 2.2 The descriptor

The descriptor is data, so a form can be drawn from it. Only `plainName` and `params` are
required:

```ts
export interface SourceDescriptor {
    readonly plainName: string; // catalog data; an application may replace it by id
    readonly params: readonly SourceParamDescriptor[];
    readonly version?: number; // default 1; bump when params or cursors change shape
    readonly kind?: SourceKind; // default "other"
    readonly auth?: readonly CredentialKind[]; // default []
    readonly authRequired?: "required" | "optional" | "none"; // default "none"
    readonly defaultEndpoint?: string | null; // default null
    readonly runtimes?: Readonly<Partial<Record<SourceRuntime, { supported: boolean; reason?: SourceRuntimeReason }>>>;
    readonly needs?: { headers?: readonly string[]; websocket?: boolean; secureContext?: boolean };
    readonly rateLimit?: { requests: number; perMs: number; concurrent?: number }; // paces ctx.fetch
    readonly features?: readonly SourceFeature[]; // default: from the methods present
    readonly migrateParams?: (params: Record<string, unknown>, fromVersion: number) => Record<string, unknown>;
    readonly samples?: readonly SourceSample[]; // public examples to offer (section 12.5)
}

export interface SourceParamDescriptor {
    readonly name: string;
    readonly plainName: string;
    readonly type: SourceParamType;
    readonly required?: boolean;
    readonly default?: unknown;
    readonly min?: number;
    readonly max?: number;
    readonly values?: readonly { readonly value: string; readonly label: string }[];
    readonly language?: QueryLanguage; // for type "query"
    readonly advanced?: boolean;
    readonly role?: "filter"; // compiled into the query, so filtering happens at the source (section 15)
    readonly description?: string;
}
```

Every union here is open (`... | (string & {})`, like the element's `FormatId`), so a release can
add a value; the docs say to handle unknown values. Current values: `SourceKind` repository,
database, sparql, rest, graphql, file-host, other; `SourceFeature` expand, probe, list, page;
`SourceRuntime` browser, node, worker, other; `SourceParamType` string, text, query, integer,
number, boolean, enum, url, node-id; `QueryLanguage` cypher, opencypher, gremlin, sparql, graphql,
jmespath; `SourceRuntimeReason` cors, needs-websocket, needs-secure-context, insecure-endpoint,
needs-node, needs-peer-dependency. A lazy source whose loaded methods disagree with its declared
`features` is refused (`reason: "features"`).

**`needs` absent means not declared:** nothing is checked before sending, and a request the
browser refuses is reported as `E_SOURCE_BLOCKED` (section 7.2, item 1). graph-io adds the
credential's own header to the checked set itself, so no source declares headers for auth.

Credentials are never parameters: never in `params`, a descriptor, a cursor or a report, so code
that stores parameters (a project file, an undo journal) cannot leak them. The one exception is a
sample's `publicLogin` (section 12.5), a login the service publishes for everyone. There is no
`"password"` parameter type; a form asks for the credential through `descriptor.auth`.

### 2.3 Remaining types

```ts
export interface ExpandRequest<P> {
    readonly params: P;
    readonly ids: readonly NodeId[];
    readonly depth?: number; // default 1
    readonly direction?: "out" | "in" | "both"; // default "both"
    readonly limit?: number;
    readonly relationshipTypes?: readonly string[];
    readonly exclude?: readonly NodeId[]; // already loaded; an optimization only
}
export type SourceProbe = {
    ok: true;
    server?: Record<string, string>;
    counts?: { nodes?: number; edges?: number; bytes?: number };
};
export type SourceListQuery<P> = { params: Partial<P>; search?: string; cursor?: SourceCursor; size?: number };
export type SourceListing = { items: readonly SourceListItem[]; next: SourceCursor | null; total?: number };
export type SourceListItem = {
    params: Record<string, unknown>;
    name: string;
    nodeCount?: number;
    edgeCount?: number;
    modified?: string;
};
export type SourceInfo = { id: string; descriptor: SourceDescriptor; loaded: boolean };
export type SourceLimitOptions = {
    maxNodes?: number;
    maxEdges?: number;
    maxBytes?: number;
    maxRequests?: number;
    timeoutMs?: number;
    onLimit?: "stop" | "error";
};
export type SourceLimits = Readonly<SourceLimitOptions> & { reached(): boolean };
export type RetryOptions = { retries?: number; baseDelayMs?: number; maxDelayMs?: number }; // 3, 500, 30000
export type SourceRequestInit = RequestInit & { retry?: false; idempotent?: boolean };
export type AwsCredentials = { accessKeyId: string; secretAccessKey: string; sessionToken?: string };
```

---

## 3. Loading: entry points, registry, lazy subpaths

```ts
/** Parameter types by source id; a consumer extends it by declaration merging. */
export interface SourceParamsMap {
    ndex: NdexParams;
    cypher: CypherParams;
    neo4j: CypherParams; // presets of cypher (section 12.2)
    neptune: CypherParams;
    rest: RestParams; // section 13
    openalex: OpenAlexParams;
}

export function loadFromSource<K extends keyof SourceParamsMap>(
    source: K,
    params: SourceParamsMap[K],
    options?: LoadFromSourceOptions,
): Promise<ImportGraphResult>;
export function loadFromSource(
    source: string | GraphSource<any>,
    params: Record<string, unknown>,
    options?: LoadFromSourceOptions,
): Promise<ImportGraphResult>;

export interface LoadFromSourceOptions extends CommonImportOptions {
    readonly endpoint?: string | URL; // required unless the source has a default
    readonly credential?: Credential;
    readonly cursor?: SourceCursor;
    readonly limits?: SourceLimitOptions;
    readonly retry?: RetryOptions | false;
    readonly idPrefix?: string; // prepended to every node id; default none
    readonly allowInsecure?: boolean; // send a credential without TLS; default false
    readonly fetch?: typeof fetch; // tests, Node agents
    readonly userAgent?: string; // User-Agent in Node, Api-User-Agent in browsers where allowed
    readonly builder?: BuilderSeed;
    readonly freeze?: FreezeOptions;
}
```

It returns the `ImportGraphResult` every load function returns, with `ImportError` and
`err.issue.code` on failure; `result.format` is `"source:<id>"`, or the format a `file` source
resolved to. Also exported: `importFromSource` (the sink form), `expandFromSource`,
`probeSource`, `listFromSource` and `listSources(): readonly SourceInfo[]`. `FormatRegistry` gains
the same methods plus `registerSource`, `source(id)` (`E_SOURCE_UNKNOWN` when absent) and
`hasSource(id)`, so one object holds formats and sources.

The default registry registers the built-in sources as `LazySource`s
(`{ id, descriptor, load: () => Promise<GraphSource> }`) whose `load` is a dynamic `import()` of
the source's subpath. So `loadFromSource("ndex", { uuid })` needs no extra import, a bundle that
never loads a source holds only descriptors, and `listSources()` loads no source code.

Subpaths: the root (contract, `defineSource`, `credentials`, `loadFromSource` and friends,
`SOURCE_ISSUE`); `/sources/ndex` (`NdexParams`, `parseShareUrl`); `/sources/cypher` (the Cypher
source, its presets and transports; the Bolt transport imports the optional peer `neo4j-driver`
dynamically, declared optional in `peerDependenciesMeta`); `/sources/rest` (`restSource`, the
mapping types, the `openalex` preset); later `/sources/gremlin` and `/sources/sparql`. The SigV4
signer is its own chunk, loaded by `credentials.awsSigV4` on first use.

---

## 4. Examples

### 4.1 The simple path: a first custom source

`GET /api/people` returns `[{ "id": "ana", "name": "Ana", "knows": ["bo"] }, ...]`:

```ts
import { credentials, defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    async records(params: { team: string }, ctx) {
        const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
            `/api/people?team=${encodeURIComponent(params.team)}`,
        );
        return {
            nodes: rows.map((r) => ({ id: r.id, name: r.name })),
            edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
        };
    },
});

registerSource(people);
const { snapshot } = await loadFromSource("people", { team: "core" }, { endpoint: "https://example.com" });
```

Twelve lines of source, with cancellation, retries, a byte cap, progress, redirect protection and
coded errors from `ctx.fetchJson`. An edge to a node not in `nodes` adds that node
(`addMissingNodes` is true for a `records` source). Authentication is one more option,
never in the source, and the token is sent only to the endpoint's origin:

```ts
await loadFromSource(
    "people",
    { team: "core" },
    { endpoint: "https://example.com", credential: credentials.bearer(token) },
);
```

### 4.2 Paging on the simple path

Return an async iterable; each page is written as it arrives. Page from a cursor in the body: a
browser cannot read a `Link` header cross-origin unless the service exposes it.

```ts
const links = defineSource({
    id: "issue-links",
    async *records(params: { repo: string }, ctx) {
        let url: string | null = `/repos/${encodeURIComponent(params.repo)}/links`;
        while (url !== null) {
            const page = await ctx.fetchJson<{ links: { from: number; to: number }[]; next: string | null }>(url);
            yield { edges: page.links.map((l) => ({ source: l.from, target: l.to })) };
            url = page.next;
        }
    },
});
```

### 4.3 The advanced path: writing into the sink

For typed columns, direction and full control of the report, implement `import()`, the contract
a format importer implements:

```ts
import { defineSource, throwIfAborted } from "@graphty/graph-io";

type RoutePage = { routes: { from: string; to: string; km: number }[]; done: number; total: number; last: boolean };

export const flights = defineSource({
    id: "flights",
    descriptor: {
        plainName: "Flights",
        defaultEndpoint: "https://flights.example.com/api/",
        params: [{ name: "airline", plainName: "Airline", type: "string", required: true }],
    },
    async import(params: { airline: string }, sink, ctx) {
        sink.setDirected(true);
        const km = sink.declareEdgeColumn({ name: "distanceKm", dtype: "f32", nullable: true });
        let page = Number(ctx.cursor?.page ?? 0);
        for (;;) {
            const res = await ctx.fetchJson<RoutePage>(
                `routes?airline=${encodeURIComponent(params.airline)}&page=${page}`,
            );
            for (const [i, r] of res.routes.entries()) {
                if (i % 64 === 0) throwIfAborted(ctx.signal);
                sink.setEdgeValue(km, sink.addEdge(r.from, r.to), r.km);
            }
            ctx.progress(res.done, res.total, "items");
            if (res.last || ctx.limits.reached()) return ctx.finish({ next: res.last ? null : { page: page + 1 } });
            page += 1;
        }
    },
});
```

`reached()` records `W_SOURCE_LIMIT` (or throws `E_SOURCE_LIMIT` under `onLimit: "error"`).
`finish({ next })` records the cursor in `report.source.next`; the caller continues with
`{ cursor: result.report.source?.next }`.

### 4.4 Using a built-in source

```ts
const { snapshot } = await loadFromSource("ndex", { uuid: "f93f402c-86d4-11e7-a10d-0ac135e8bacf" });

// Neo4j's public demo server over the Query API; its login is the database name.
const movies = await loadFromSource(
    "neo4j",
    {
        query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
        parameters: { name: "Tom Hanks" },
        database: "movies",
    },
    { endpoint: "https://demo.neo4jlabs.com:7473", credential: credentials.basic("movies", "movies") },
);

// The same Cypher source over Bolt (wss:// in a browser): Hetionet, a public Neo4j 3.5 with no Query API.
const near = await loadFromSource(
    "neo4j",
    { transport: "bolt", mode: "neighborhood", idProperty: "name", ids: ["Metformin"], depth: 1 },
    { endpoint: "bolt+s://neo4j.het.io:7687" },
);

// Works citing a paper, from OpenAlex through the REST mapping (section 13.3).
const citing = await loadFromSource("openalex", { work: "W2741809807" });
```

### 4.5 Your source in graphty-element

A page with no bundler, using only graphty-element:

```html
<script type="module">
    import {
        defineSource,
        registerSource,
    } from "https://cdn.jsdelivr.net/npm/@graphty/graphty-element/dist/graphty.bundle.js";
    registerSource(
        defineSource({
            id: "people",
            async records(params, ctx) {
                const rows = await ctx.fetchJson(
                    `https://example.com/api/people?team=${encodeURIComponent(params.team)}`,
                );
                return { nodes: rows, edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))) };
            },
        }),
    );
</script>
<graphty-element data-source="people" data-source-config='{"team":"core"}'></graphty-element>
```

`data-source` takes a source id as it takes a format name; a format name wins when both exist,
and `source:people` names the source explicitly.

### 4.6 Developer-experience check

4.1 and 4.5 name no snapshot, column, dtype or sink; 4.3 is the importer contract a graph library
author already knows. Before the framework issue is done, a blind author writes 4.1 and a
password form for the element from the published docs and compiles them against the published
types.

---

## 5. Whole graphs, parts, paging and incremental expansion

**Whole.** A file (`file`: NDEx CX2, a GraphML on a web server) read by the existing importers, or
a source-defined "everything" query, paged. Built-in database sources take `mode`: `"query"` (the
caller's), `"all"` (the whole database, paged) or `"neighborhood"` (around given ids to depth N).

**Part.** A query result, a neighborhood, a page or a filter (`labels`, `relationshipTypes`,
property equalities, compiled into a parameterized query). A result mixing paths, nodes and
relationships is flattened and de-duplicated by id. A result of scalars only is
`E_SOURCE_NOT_A_GRAPH` (`params: { columns }`).

**Paging.** A source returns `next` (records) or passes it to `ctx.finish({ next })`. Caps are
checked between pages on the `records` path and wherever an `import()` source calls `reached()`,
so a cap is overshot by at most one page. Database sources page by keyset on the element id, never
with `SKIP`, so a page is stable under unrelated writes and costs the same at any depth. A cursor
carries the source's `version`; one from another version is `E_SOURCE_PARAM`
(`reason: "stale-cursor"`).

### 5.1 Incremental expansion

1. **graph-io fetches** with `expandFromSource(source, request, options)`, which returns a snapshot
   of ONLY what was fetched: the seeds, their neighbors and the edges between them. A source
   without `expand` answers `E_SOURCE_UNSUPPORTED` (`params: { feature: "expand" }`).
2. **graphty-element merges** it with `session.data.import(..., { mode: "merge", existing:
"update" })`; graph state is the element's, and graph-io stays stateless. Today a merge skips a
   node already present, so the element gains the `existing` load choice: `"keep"` (default,
   today's behavior) or `"update"` (writes the incoming attributes). An edge already present is
   matched by its id when the source gives one, else by `duplicateEdges`.

**Id stability** makes the merge correct, so each source documents its id rule:

- **NDEx:** the CX2 node `id`, stable within a network version. The neighborhood query returns CX1
  with different ids, so `expand` requires `idAttribute` (`name`, `represents`).
- **Neo4j:** `elementId(n)` (5.0 and later; `id(n)` before, as on Hetionet's 3.5), in practice
  stable while the node exists; `idProperty` (`uuid`) is the stable choice, and the docs say so.
- **Neptune:** `~id`, never reused.
- **REST mappings:** the record field the mapping names, prefix stripped (section 13).

`idPrefix` separates two id spaces loaded together. Expansion is idempotent.

---

## 6. Authentication and secrets

### 6.1 Credentials are objects, made by factories

```ts
type Bind = { origins?: readonly string[] }; // default: the load's endpoint origin

export const credentials: {
    bearer(token: string | (() => Promise<string>), bind?: Bind): Credential;
    basic(username: string, password: string, bind?: Bind): Credential;
    apiKey(where: { header: string } | { query: string }, value: string, bind?: Bind): Credential;
    awsSigV4(
        options: { region: string; service?: string; credentials: AwsCredentials | (() => Promise<AwsCredentials>) },
        bind?: Bind,
    ): Credential; // service default "neptune-db"; "neptune-graph" for Neptune Analytics
    custom(apply: (request: Request) => Promise<Request> | Request, kind: string, bind?: Bind): Credential;
};

export interface Credential {
    readonly kind: CredentialKind; // bearer, basic, api-key, aws-sigv4, custom (open union)
    readonly origins: readonly string[];
}
```

A token may be a function, so expiring tokens (OAuth, AWS STS) refresh per request; graph-io
caches no token. The secret lives in a private class field: `JSON.stringify` and `util.inspect`
show `{ kind, origins }` only, no code path copies a secret into an issue, report, cursor or
`meta`, and graph-io keeps no credential after the load settles. graphty-element re-exports
`credentials`, `Credential` and `SourceIssueCode` from its root and `./session`.

### 6.2 Origin binding, redirects and TLS

- A credential goes only to the load's `endpoint` origin or its `origins`. A credential with
  neither is refused before any request: `E_SOURCE_PARAM` (`reason: "credential-unbound"`).
- `ctx.fetch` checks the origin again after `custom(apply)` returns; a changed origin is
  `E_SOURCE_REDIRECT`.
- A redirect while a credential is attached is not followed: `redirect: "manual"` in Node (a
  same-origin redirect is followed with the credential re-applied), `redirect: "error"` in
  browsers, where a manual redirect is opaque. A cross-origin one is `E_SOURCE_REDIRECT`
  (`params: { from, to }`, `to` null in browsers). The Fetch standard strips `Authorization` on a
  cross-origin redirect, but not custom headers or query keys.
- **No credential in clear text.** `ctx.fetch` and the WebSocket and Bolt openers refuse a
  credential over `http:`, `ws:` or Bolt without TLS (`reason: "insecure-endpoint"`), except to a
  loopback host or with `allowInsecure: true`.
- `E_SOURCE_AUTH` carries the `origin` that asked, so an application can show which host wants a
  password before the reader types it.

### 6.3 What credentials each initial source takes

- **NDEx:** `basic` or `bearer` (a Google OAuth ID token); none for public networks. Whether its
  newer Keycloak sign-in issues tokens the REST API accepts is unverified. A link-share access key
  is `credentials.apiKey({ query: "accesskey" }, key)`; `parseShareUrl(url)` returns
  `{ params: { uuid }, credential }`, and a URL parameter carrying a key is refused
  (`reason: "credentials-in-url"`).
- **Neo4j (HTTP):** `basic` or `bearer`.
- **Bolt:** `basic`, `bearer`. The driver needs the raw secret, so `boltSource` unwraps it
  internally and applies the origin and TLS rules itself (section 12.2).
- **Neptune:** `aws-sigv4`, or none (Neptune Database inside its VPC). SigV4 is about 150 lines over
  Web Crypto, tested against AWS's signature test suite, with no AWS SDK. graph-io never reads
  `~/.aws` or the environment; a Node caller passes the SDK's provider chain as the function form,
  and a page passes temporary credentials from the owner's Amazon Cognito identity pool (an AWS
  account setting, not a server).

### 6.4 Credentials in browsers, and remembering them

A private field keeps a secret out of logs, not out of devtools, extensions or other script on
the page. Only the reader's own credentials belong in a browser: a database user per reader, or
temporary AWS credentials from an identity pool. Shared keys (a team password, a Cosmos DB account
key, long-term AWS keys) never do; a source that only works with one is Node-only.

graph-io stores nothing. graphty-element remembers source credentials with the mechanism it
already uses for AI provider keys:

- **What exists.** `ApiKeyManager` (`graphty-element/src/ai/keys/ApiKeyManager.ts`, exported from
  `@graphty/graphty-element/ai`) keeps keys in memory by default. `enablePersistence()` writes one
  encrypted blob of every key to `localStorage` under `@graphty-ai-keys:keys`;
  `enablePersistenceWithPassphrase()` derives the key with PBKDF2 (`deriveKeyFromPassphrase.ts`,
  600,000 iterations) and holds it in memory only; `disablePersistence(true)` and `clear()` forget.
  The graphty app's "Remember API keys" checkbox (`AiProviderSettings.tsx`) is the consent. PR
  #1677 moves the cipher from `encrypt-storage` to Web Crypto AES-GCM. Without a passphrase the
  encryption key is a built-in constant, so a stored value is obscured, not protected.
- **One store for both.** The manager is generalized into a `CredentialStore` (a new `./credentials`
  entry point, additive). `ApiKeyManager` becomes its `ai` namespace with its storage keys
  unchanged, so remembered AI keys survive. Source credentials live in a `source` namespace, keyed
  by source id, endpoint origin and (for `basic`) user name. Same persistence switch, same
  encryption, same passphrase, same forget flows: a reader who chose "remember on this device"
  chose it for both, and an application may show the two lists together or apart.
- **What can be stored:** `basic`, `bearer` with a string token, `api-key`. A function (a token
  refresher, `custom`, an AWS provider) cannot be: `E_CREDENTIAL_NOT_STORABLE` (`params: { kind }`).
- **Lookup is by the origin about to be contacted.** When a load, a pending project load, an
  expansion or a refresh needs a credential and none is passed, the element asks the store for
  `(source, origin)`. A project file that names another endpoint therefore never receives a
  credential remembered for a different host. A stored credential that fails is kept, and
  `E_SOURCE_AUTH` says `params.stored: true` so the application can offer to replace it.

```ts
const store = element.credentials; // or createCredentialStore() without an element
await store.remember({ source: "neo4j", endpoint }, credentials.basic("neo4j", password));
store.list(); // [{ namespace: "source", source: "neo4j", origin, kind: "basic", username: "neo4j" }]; never a secret
await store.forget({ source: "neo4j", endpoint });
await store.forgetAll(); // AI keys and source credentials, and the source cache (section 16.4)
```

A credential is still never in a project file, `data.source()`, the undo journal or an event
(section 14.2). The constant default key, a weakness the AI keys share, is fixed once in the store
(a non-extractable AES-GCM `CryptoKey` in IndexedDB); until then the docs advise the passphrase
mode for database passwords.

---

## 7. Browser limitations and how the design handles them

**How this was measured.** On 2026-10-17, probe pages served from `http://localhost`, a plain-http
host and an https host ran real `fetch()` and `WebSocket` calls in headless Chromium 143 and
Firefox 144 (Playwright 1.57); Node 22 ran the same requests. Targets: NDEx (3.0.8), Wikidata,
`demo.neo4jlabs.com`, about twenty other public APIs and file hosts, and Neo4j 5.26, Memgraph 3.12
and Gremlin Server 3.7.7 from their release archives. WebKit could not start without root, so
**Safari is unverified** (the macOS CI host checks it first). With no AWS account, Neptune facts
come from AWS's documentation and SDK and unauthenticated requests to Neptune Analytics.

### 7.1 Where each source runs

| Source                              | Node 18+           | Browser, page on https                |
| ----------------------------------- | ------------------ | ------------------------------------- |
| Custom `records` / `file`           | yes                | when the service's CORS allows it     |
| NDEx                                | yes                | yes, at `www.ndexbio.org`             |
| Neo4j, HTTP Query API               | yes                | yes, over https (default origin `*`)  |
| Neo4j, Bolt                         | yes                | yes, `wss://` with Bolt TLS on        |
| Memgraph                            | not supported      | no: it cannot serve `wss://` (12.2)   |
| Gremlin Server                      | yes                | `wss://`; HTTP only without preflight |
| Neptune Database                    | VPC, or public+IAM | no: no CORS headers (12.4)            |
| Neptune Analytics                   | yes, IAM           | unverified: CORS on the graph host    |
| SPARQL (Wikidata)                   | with a `userAgent` | yes, without an auth header           |
| SNAP, Netzschleuder, KONECT, Zenodo | yes                | no (no CORS)                          |

### 7.2 The limitations

Each item: the evidence (verified unless marked), then the answer. Every answer ends in a coded
error the application renders in its own words.

1. **The browser hides why a request failed.** CORS refusals, mixed content, refused connections,
   TLS errors and a 429 or 5xx without CORS headers all reach the page as one bare `TypeError`.
   Answer: check what can be checked first (items 2, 5, 17), then send one bodyless `no-cors` `GET`
   of the origin's root (never the original request; skipped under `retry: false`). Opaque answer:
   `cause: "cors"` (which covers a hidden 429, so it is retried once); rejection: unreachable; a
   loopback, RFC 1918 or `.local` target from a public page: `"local-network"`. Result:
   `E_SOURCE_BLOCKED` (`params: { url, cause }`).
2. **Mixed content.** An https page (graphty.app) cannot fetch `http://` or open `ws://`. Answer:
   refused before sending (`E_SOURCE_RUNTIME`, `reason: "insecure-endpoint"`), except loopback,
   which Firefox allows: it goes to the network, and a refusal is `cause: "local-network"`.
3. **Local Network Access.** From an https page Chromium 143 refused `http://localhost`, Firefox
   allowed it, and from a public origin Chrome asks the reader (documented). Answer: item 1's
   cause; the docs say to allow the prompt, or to use a database with TLS on a public host.
4. **No cookies cross-origin.** NDEx sends `Allow-Origin: *` with `Allow-Credentials: true`, which
   browsers reject for cookies. Answer: credentials only as headers, `credentials: "omit"`.
5. **Servers allow only some request headers.** Wikidata's preflight refuses `Authorization`;
   Gremlin Server answers every preflight 405. Answer: sources declare `needs.headers` and prefer
   requests with no preflight; an unsendable credential is refused first (`reason: "cors"`).
6. **Redirects without CORS headers** (`ndexbio.org` to `www`, GitHub `raw` links). Answer: NDEx
   uses the `www` host; the file-host source rewrites GitHub links to `raw.githubusercontent.com`.
7. **Credentials across redirects.** A cross-host 302 dropped `Authorization` but would keep
   other headers and query keys. Answer: section 6.2.
8. **Credentials in the URL** (`https://user:pass@host`) throw in both browsers. Answer: refused
   up front (`reason: "credentials-in-url"`).
9. **Cache across credentials.** Chromium answered a bad-token request from a tokenless GET's
   cache. Answer: `cache: "no-store"` with a credential.
10. **Only safelisted response headers are readable**: `Retry-After`, `Link` and rate-limit
    headers read as null unless `Access-Control-Expose-Headers` lists them. Answer: honor headers
    when readable, else plain backoff; page from the body.
11. **`Content-Length` is no progress total** (chunked, or compressed). Answer: progress counts
    decoded bytes, with a total only from the service (NDEx's `cx2FileSize`, within 4%).
12. **`User-Agent`.** Browsers cannot set it; Wikidata answers 403 and Overpass 406 to Node's
    default. Answer: the `userAgent` option, with no default string.
13. **A browser WebSocket sends no headers.** Bolt and Gremlin log in inside their protocol; a
    SigV4-signed WebSocket cannot be opened from a page (documented). Answer: in-protocol login.
14. **Neptune Database sends no CORS headers** and has no setting to add them (documented). Answer:
    the `neptune-https` transport is refused in a browser before any request (`E_SOURCE_RUNTIME`,
    `reason: "cors"`); it is Node-only. In a browser, `awsSigV4` without a `sessionToken` is
    refused (`E_SOURCE_PARAM`, `reason: "long-term-key"`). Section 12.4 has every Neptune path.
15. **Memgraph cannot serve `wss://`,** the only WebSocket an https page may open (its docs say so;
    with a trusted certificate in `--bolt-cert-file` both browsers failed the handshake). Answer:
    no Memgraph preset (section 12.2).
16. **Bolt failures hang** 20 to 34 s, then give a `ServiceUnavailable` that cannot say why. Answer:
    retry time bounded by `timeoutMs` and the signal; `E_SOURCE_BLOCKED`, `cause: "unknown"`.
17. **No Web Crypto on a plain-http page.** Answer: `needs.secureContext`, checked first
    (`reason: "needs-secure-context"`).
18. **Allowed origins do not stop queries.** Neo4j restricted to one origin still ran a query from
    another; Gremlin Server's WebSocket checks no origin. The docs advise authentication, and
    section 14.2 keeps a project file from running a query by itself.
19. **Archives.** `DecompressionStream` does gzip only. Answer: the `file` path reads gzip, and zip
    with a small reader over `deflate-raw`; tar and bzip2 are out of scope.
20. **Abort reasons differ** (Chromium's own `AbortError` mid-body). Answer: `ctx.fetch` rethrows
    `signal.reason`.

Bodies stream in all three runtimes (5 MB of NDEx CX2 in about 200 ms), so a `file` source hands
the `Response` to the importer instead of reading it whole.

### 7.3 What the service's owner must configure

Nothing in the design needs a server (requirement 7). What some sources need is a setting:

- A plain-http database from an https page: TLS on the server. Neo4j with a restricted origin: the
  app's origin added to its allow list. Both the admin's.
- Neptune Analytics from a browser: public connectivity, an IAM policy and a Cognito identity pool.
- A local database from graphty.app in Chrome: the reader allows the local-network prompt.
- Hosts with no CORS: Node, or graph-samples rehosting the files on graphty.app (section 20).

Worth reporting upstream: NDEx's `*` with `Allow-Credentials: true`, and its bare-host redirect.

---

## 8. Errors and reports

Sources use the importers' contract: issues go into an `ImportReportBuilder`, and `report.fail()`
throws `ImportError`. The codes are in `SOURCE_ISSUE`, exported with
`type SourceIssueCode = keyof typeof SOURCE_ISSUE` and `SourceIssueParams`, which maps each code
to its `params` type:

| Code                   | When                                           | `params`                                        |
| ---------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `E_FETCH` (existing)   | another status, or an unreachable host         | `url`, `status`                                 |
| `E_SOURCE_BLOCKED`     | refused by the browser, cause hidden           | `url`, `cause`                                  |
| `E_SOURCE_AUTH`        | 401 or a database login failure                | `origin`, `status`, `scheme`, `serverCode`      |
| `E_SOURCE_FORBIDDEN`   | 403 or a database authorization failure        | `status`, `serverCode`                          |
| `E_SOURCE_NOT_FOUND`   | the named item does not exist                  | `what`, `value`                                 |
| `E_SOURCE_QUOTA`       | 429 after retries                              | `retryAfterMs`                                  |
| `E_SOURCE_TIMEOUT`     | `timeoutMs`, or the server's own timeout       | `timeoutMs`, `serverSide`                       |
| `E_SOURCE_QUERY`       | the server rejected the query                  | `serverCode`, `line`, `column`, `serverMessage` |
| `E_SOURCE_NOT_A_GRAPH` | no node, relationship or path in the result    | `columns`                                       |
| `E_SOURCE_RESPONSE`    | a body of the wrong shape                      | `expected`, `contentType`                       |
| `E_SOURCE_REDIRECT`    | a redirect or changed origin with a credential | `from`, `to`                                    |
| `E_SOURCE_RUNTIME`     | cannot run in this runtime                     | `runtime`, `reason`, `package`                  |
| `E_SOURCE_PARAM`       | a parameter or option is invalid               | `name`, `reason`                                |
| `E_SOURCE_LIMIT`       | a cap under `onLimit: "error"`                 | `limit`, `value`                                |
| `E_SOURCE_UNKNOWN`     | no source of that id                           | `id`, `known`                                   |
| `E_SOURCE_UNSUPPORTED` | the source lacks the feature                   | `feature`, `needs`                              |
| `E_SOURCE_INVALID`     | a malformed source at registration             | `id`, `reason`                                  |
| `W_SOURCE_LIMIT`       | a cap stopped the load                         | `limit`, `value`                                |
| `W_SOURCE_AUTH`        | a later page needs a credential; pages kept    | `origin`, `status`                              |
| `W_SOURCE_RETRIED`     | success after retries                          | `attempts`, `statuses`                          |
| `W_SOURCE_VALUE`       | a server value with no dtype                   | `type`, `column`, `as`                          |

- Codes outside this table (`E_CREDENTIAL_NOT_STORABLE`, `I_SOURCE_EXPANDED`, `W_COLLAPSE_KEPT`,
  `W_JOIN_AMBIGUOUS`, `W_MERGE_CONFLICT` and the `I_`/`W_SOURCE_` codes of section 16) are
  graphty-element's, reported through its `GraphtyError` and events, not in `SOURCE_ISSUE`.
- Every URL in params is origin plus path; the query string is dropped, so a key in it never
  reaches a report.
- `serverCode` is the service's own code, passed through. `serverMessage` appears only on
  `E_SOURCE_QUERY`, at most 500 characters, only from a JSON 4xx body (never a 5xx or a stack
  trace); whether to show it is the application's choice. The English `message` stays, for logs.

```ts
export interface SourceReportInfo {
    readonly id: string;
    readonly version: number;
    readonly endpoint: string | null; // origin + path only
    readonly requests: number;
    readonly bytes: number;
    readonly next: SourceCursor | null; // null when complete
    readonly server?: Readonly<Record<string, string>>; // { product: "Neo4j", version: "5.24" }
    readonly budget?: { readonly remaining: number; readonly resetMs?: number }; // section 13.2
    readonly validators?: SourceValidators; // section 16.1
}
```

---

## 9. Cancellation, progress, limits, retries

- **Cancellation.** `signal` aborts every request and the write loop, and the load rejects with
  the signal's reason at once in every runtime. Stopping the server's work differs by service, so
  each Cypher profile has its own stop (section 12.2): Neo4j over Bolt stopped 0.5 s after
  `executeQuery`'s `signal`; the Query API has no cancel call. `timeoutMs` is also sent as the
  transaction timeout where the server has one.
- **A server's own timeout or termination is never retried.** The driver's managed transactions
  (`executeRead`) retry a `TransientError` for 30 s, which turned a 1 s timeout into 37 to 57 s
  (measured, section 12.3); the Bolt transport runs auto-commit queries under graph-io's retry rules
  instead.
- **Progress** counts bytes for a `file` source, items otherwise, with a total only when the
  service gives one. A Cypher count query runs only with `countFirst: true`.
- **Limits.** Every default is "no limit"; `onLimit: "stop"` keeps what came first, warns and
  records `next`. graph-io picks no cap, since the right one depends on the consumer's screen and
  machine; the element exposes the options and the graphty app sets them. Database sources push
  `maxNodes` into the query as a `LIMIT`.
- **Retries.** 3 by default, full-jitter backoff from 500 ms to 30 s, on 429, 502, 503, 504 and
  network errors, for idempotent requests (GET, and POSTs marked `idempotent`), honoring
  `Retry-After` when readable. This is HTTP's own semantics; `retry: false` turns it off.
- **Rate limits.** `descriptor.rateLimit` paces requests (Wikidata: 5 parallel per IP; NDEx capped
  at 4). A service that spends a budget (OpenAlex) is reported, not judged: `report.source.budget`
  is `{ remaining, resetMs }` from its headers when readable.

---

## 10. Type mapping

graph-format design 5.1's rules, applied to typed values:

- 64-bit integers: `i32` when the column fits, else `f64`; above 2^53 the `long` parameter picks
  `"f64"` (default, `W_PRECISION`) or `"string"`.
- Floats, booleans, strings: `f64`, `bool`, `string` (or `dict` by the builder's rule).
- Temporals: the declared temporal types (`f64` epoch ms); mixed zones become ISO strings with
  `W_SOURCE_VALUE`. Durations: ISO strings. Points: `json`, or `f64` columns with
  `pointAs: "split"`. Bytes: dropped with `W_SOURCE_VALUE`.
- Lists of one scalar type: `list`; mixed lists and maps: `json`. Labels and relationship type:
  the neo4j CSV importer's `labels` and `type` columns.

Precision is why the Neo4j source asks for typed JSON: plain JSON sent `9007199254740993` and
`res.json()` returned `...992` (measured). Neptune's JSON and NDEx's CX2 send plain numbers, so a
value above 2^53 is already rounded on the wire; the docs say so.

Measured over Bolt: integers past 2^53 arrive exact as the driver's `Integer`; dates, times with
offsets or named zones, 2D, 3D and WGS-84 points, lists, mixed lists and nested maps all map by the
rules above.

---

## 11. Injection and transport safety

- **Parameters only.** Caller values go as query parameters, never spliced. A user query runs as
  written with its `parameters` sent separately; generated queries are fixed text.
- **Identifiers** (Cypher labels, types, keys) cannot be parameters. Generated queries
  backtick-quote every identifier (a backtick inside is doubled), and that quoting is the guarantee.
  A schema check is not, because schema calls differ by server and version. An empty identifier or
  one with a NUL is `E_SOURCE_PARAM` (`reason: "identifier"`). Variable-length bounds (`*1..2`)
  cannot be parameters either; `depth` is inlined as a checked integer, 1 to 10.
- **SPARQL has no parameters:** the SPARQL source exports escaping term helpers and a tagged
  template that accepts only them.
- **Read-only by default where the server enforces it:** Bolt `READ` sessions and the Query API's
  `accessMode: "Read"` on Neo4j; on a server that ignores the access mode, `probe` reports
  `server.readOnly: "not-enforced"`. graph-io never parses a query to judge it. `write: true` is a
  load option and is never recorded.
- **Responses are untrusted:** capped by `maxBytes`, parsed with `JSON.parse` only, and no returned
  URL is followed without checking its origin.

---

## 12. The initial sources

Checked against the services' documentation and, where marked, by live requests on 2026-10-17.
Each sub-issue re-checks them.

### 12.1 NDEx (`/sources/ndex`)

NDEx (https://www.ndexbio.org) is the public repository of biological networks Cytoscape users
publish to: version 3.0.8, about 320,000 networks. Endpoints, all verified from both browsers and
Node:

- `GET /v3/networks/{uuid}` (CX2) or `/v2/network/{uuid}` (CX1): `file`, read by the existing
  importers.
- `GET /v3/networks/{uuid}/summary` (counts, `cx2FileSize`, license; about 4 KB): `probe`, caps,
  progress total.
- `POST /v2/search/network`: `list` (v3 search answered 500).
- `POST /v2/search/network/{uuid}/query` (`searchString`, `searchDepth`; CX1 only): `expand`.

`NdexParams`: `uuid`, `format` (`"cx2"` default or `"cx"`), `idAttribute`. Default endpoint
`https://www.ndexbio.org/`. With `maxBytes` or `maxNodes` exceeded, the summary stops the load
before the first byte (public networks reach 1 million edges and 128 MB). `modificationTime` and
`rights` go to the graph's `meta`. Errors are classified by status (an unknown route answers 500
with a Java stack trace, which never reaches a report).

### 12.2 Cypher: one source, several transports (`/sources/cypher`)

Neo4j and Neptune both speak openCypher; they differ in how a query travels and in a handful of
server facts. So there is one `cypher` source (one query builder, one result flattener, one type
mapper) over pluggable transports, and `neo4j` and `neptune` are presets of it: lazy sources whose
descriptors fix the transport and the server profile, with no query code of their own.

```ts
export interface CypherParams {
    readonly query?: string; // the caller's; else a generated query from `mode`
    readonly parameters?: Readonly<Record<string, unknown>>; // default {}
    readonly mode?: "query" | "all" | "neighborhood"; // default "query" with a query, else "all"
    readonly ids?: readonly NodeId[]; // for "neighborhood"
    readonly depth?: number; // default 1, at most 10
    readonly labels?: readonly string[]; // filters compiled into generated queries (role "filter")
    readonly relationshipTypes?: readonly string[];
    readonly idProperty?: string; // key nodes on a property (uuid) instead of the server id
    readonly database?: string; // default: the server's default database
    readonly transport?: "query-api" | "bolt" | "neptune-https" | "neptune-analytics"; // presets set it
    readonly profile?: "neo4j" | "neptune" | "auto"; // default "auto": from the connection
    readonly long?: "f64" | "string"; // integers past 2^53; default "f64"
    readonly countFirst?: boolean; // run a count for the progress total; default false
}
```

**Transports** (internal; each runs a statement with parameters and yields rows):

- **`query-api`:** Neo4j's `POST /db/{database}/query/v2`, on by default since 5.26 and on Aura; no
  driver. `Accept: application/vnd.neo4j.query.v1.1` asks for **typed JSON** (section 10). CORS
  is on by default (`*`) with readable errors (verified on 5.26 and the public demo on 2026.05;
  Aura unverified). The response is one JSON document, not a stream (1M rows: 8.9 MB, 2.2 to 2.6 s
  in a browser), so generated queries page with a `LIMIT`. The deprecated `/db/{db}/tx` is not
  supported.
- **`bolt`:** the official `neo4j-driver`, an optional peer dependency imported only by this
  transport: 139 KB gzipped (measured), nothing for anyone else; absent, `E_SOURCE_RUNTIME`
  (`reason: "needs-peer-dependency"`). Writing a Bolt client is a large, security-relevant job. Bolt
  streams (`subscribe()` delivers batches of `fetchSize`), and it is the only path to a Neo4j older
  than 5.26 (Hetionet's 3.5). Direct connections by default (`bolt://`, `bolt+s://`): a routing
  scheme would send the credential to every host the routing table lists, so it needs `routing:
true` with the `resolver` limited to the credential's `origins`; the `+ssc` schemes accept any
  certificate and are refused with a credential. Queries run as auto-commit `session.run`, not
  managed transactions (section 9). The lossless `Integer` is converted by section 10, never with
  `disableLosslessIntegers`. On https pages the driver uses `wss://`, so the server needs Bolt TLS;
  the Neo4j demo server and Hetionet both answered a browser this way (verified).
- **`neptune-https`:** Neptune Database's `POST /openCypher` (port 8182), form fields `query` and
  `parameters`; nodes `{ "~id", "~labels", "~properties" }`, relationships add `~start`, `~end`,
  `~type`. An error after the first chunk is appended to a 200 body: Node reads
  `X-Neptune-Status` from trailers. Node only (section 12.4).
- **`neptune-analytics`:** `POST /queries` on `<graph-id>.<region>.neptune-graph.amazonaws.com`,
  JSON `{ query, language: "OPEN_CYPHER", parameters }`, signed with `awsSigV4` for
  `neptune-graph`. Results are assumed to share the `~id` shape (unverified).

**Memgraph is not supported.** Its Bolt port also accepts a WebSocket upgrade
(`Server: Memgraph Bolt WS`), and from an `http://localhost` page both browsers created, read and
deleted test nodes over `ws://` through neo4j-driver (verified). But an https page can open only
`wss://`, and Memgraph cannot serve it: its TLS page says "WebSocket over SSL is currently not
supported in Memgraph", and Memgraph 3.12 with a trusted certificate in `--bolt-cert-file`
finished the TLS handshake, then closed without a WebSocket answer in curl, Chromium and Firefox
(verified). Reaching it from graphty.app would take a TLS WebSocket proxy, which requirement 7
rules out (Memgraph Lab's page itself goes through Lab's Node backend). Node-only support is dropped
too: its own profile (section 12.3) and CI lane, for a database graphty.app cannot reach.
So there is no `memgraph` preset, profile, lane or docs page; a user query over `bolt` may still
reach a Memgraph from Node or an http page, untested. Revisit if Memgraph ships WebSocket over TLS.

**What stays per service** (the profile). Everything else is shared:

| Fact             | Neo4j                                          | Neptune                                         |
| ---------------- | ---------------------------------------------- | ----------------------------------------------- |
| Transports       | `query-api` (5.26+), `bolt`                    | `neptune-https` (Database), `neptune-analytics` |
| Auth             | `basic`, `bearer`                              | `aws-sigv4`, or none inside the VPC             |
| Id expression    | `elementId(n)`; `id(n)` before 5.0             | `id(n)`, the `~id` string                       |
| Id stability     | while the node exists                          | stable, never reused                            |
| Read-only        | enforced (`READ`, `accessMode`)                | the read-replica endpoint                       |
| Stopping a query | Bolt `signal` (0.5 s); none on the Query API   | the status API's cancel (documented)            |
| Server timeout   | `maxExecutionTime` (2026.04+), Bolt tx timeout | the cluster's query timeout (documented)        |
| Type quirks      | typed JSON over HTTP                           | plain JSON numbers, rounded past 2^53           |
| Detected by      | the Bolt agent, else `CALL dbms.components()`  | the preset                                      |

Generated queries differ only in the id expression, written here as `ID(n)`:

```cypher
// mode "all", one page of nodes (edges page the same way on ID(r)):
MATCH (n) WHERE ID(n) > $after RETURN n ORDER BY ID(n) LIMIT $pageSize
// mode "neighborhood" and expand; depth is a checked integer, inlined:
MATCH (s) WHERE ID(s) IN $ids MATCH p = (s)-[*1..2]-(x) WITH p LIMIT $limit RETURN p
// degree hint for click-to-expand (section 14.4), added to every generated node query
// (pattern comprehension; on Neptune unverified, and omitted if refused):
RETURN n, size([(n)--() | 1]) AS degree
```

With `idProperty`, `ID(n)` is `n.<idProperty>` (quoted). On Neo4j `elementId` is a string, so keyset
order is string order, which is stable. A user query runs as written; the docs advise a `LIMIT` in
it. `probe` reports the profile, version, edition and `readOnly`. `validate` (section 16) re-runs
and hashes, since neither service exposes a change counter to a reader.

### 12.3 The Cypher path run against Memgraph 2.22.1

Memgraph is not a target, but it speaks Bolt, so on 2026-10-17 a Node 22 script (neo4j-driver
5.28.3) ran the generic Cypher path against a live Memgraph, under a test label deleted afterwards.
It confirmed whole-graph flattening, parameterized queries, neighborhoods by id and by property,
expansion excluding known ids, the degree hint, keyset paging, streaming, coded errors with line and
column, and managed transactions retrying a 1 s server timeout for 37 to 57 s (1.27 s through
`session.run`, hence section 9). What only Memgraph needed, kept as the record: `id(n)` (no
`elementId()`), unenforced read-only, a driver `signal` it ignored for 54 s against 235 ms for
`TERMINATE TRANSACTIONS`, and no `db.labels()`.

### 12.4 Amazon Neptune: protocols, and what works with no server

**Neptune Database** (`<host>.<region>.neptune.amazonaws.com:8182`, TLS only) speaks four protocols
on that port: openCypher over HTTPS (`POST /openCypher`), openCypher over Bolt
(TCP only: "Neptune only supports TCP connections for Bolt"), Gremlin over `wss://.../gremlin` or
`POST /gremlin`, and SPARQL 1.1 over `POST /sparql`. Authentication is none or IAM: a SigV4
signature (service `neptune-db`) on every request and on the WebSocket upgrade. It is VPC-only
unless given a public endpoint (engine 1.4.6.0 and later), which requires IAM. **Neptune
Analytics** speaks only openCypher, `POST /queries` on its graph host, always IAM (service
`neptune-graph`), with public connectivity a graph setting (all documented).

All but Bolt are HTTPS or WebSocket a browser can send; CORS and signing decide, apart from
whether the network reaches the endpoint:

- **Database openCypher, Gremlin or SPARQL over HTTPS: no.** No CORS headers, and no parameter adds
  them (AWS's Graph Explorer keeps a proxy for this reason).
- **Database openCypher over Bolt: no.** TCP only.
- **Database Gremlin over `wss://`, IAM off: only inside the VPC** (a VPN). A WebSocket has no CORS
  check, but a public endpoint requires IAM; whether Neptune checks `Origin` is unverified.
- **Database Gremlin over `wss://`, IAM on: no, as documented.** The signature goes in upgrade
  headers, which a browser cannot send; a presigned upgrade URL is unverified.
- **Analytics `POST /queries` with Cognito credentials: possibly.** SigV4 runs in Web Crypto and
  the regional host's preflight allows `Authorization` (verified); CORS on the graph host is
  unverified (a made-up graph id does not resolve) and decides it.

So the design supports `neptune` over `neptune-https` from Node; `neptune-analytics` from Node,
and from a browser once one request to a real graph shows CORS on its host; and Gremlin `wss://`
inside the VPC (where Chrome may show its local-network prompt, section 7.2 item 3), through the
later Gremlin source (on Neptune it uses the WebSocket, since the HTTP
endpoint ignores `bindings`). Neptune SPARQL goes through the SPARQL source, from Node. No public
Neptune exists to sample; AWS's examples load air-routes, a GraphML file graph-io reads straight
from `raw.githubusercontent.com/krlawrence/graph/master/sample-data/air-routes.graphml` (CORS `*`).

### 12.5 Sample sources for each adapter

Each was read from an `http://localhost` page in Chromium 143 on 2026-10-17 (Firefox and Safari
unverified). A source lists its samples on its descriptor (`samples?: readonly SourceSample[]`,
catalog data), so `listSources()` and the element's `sourceDescriptors()` offer them beside
graph-samples' datasets (section 20) without loading code:

```ts
export interface SourceSample {
    readonly id: string; // "neo4j-movies"
    readonly plainName: string;
    readonly params: Readonly<Record<string, unknown>>;
    readonly endpoint?: string;
    readonly publicLogin?: { readonly username: string; readonly password: string }; // published for everyone; never stored
    readonly counts?: { readonly nodes?: number; readonly edges?: number };
    readonly whole?: boolean; // false: too big to load whole, start from a neighborhood
}
```

| Source     | Sample                                     | Where                                  | Nodes / edges      |
| ---------- | ------------------------------------------ | -------------------------------------- | ------------------ |
| NDEx       | WikiPathways WP5483 (tiny)                 | `86719f5b-1439-11f0-9806-005056ae3c32` | 57 / 34            |
| NDEx       | NCI PID cancer signaling                   | `640e2cef-795d-11e8-a4bf-0ac135e8bacf` | 2,794 / 25,296     |
| NDEx       | HuRI human interactome                     | `73bc2c06-5fb2-11e9-9f06-0ac135e8bacf` | 8,275 / 52,569     |
| NDEx       | Signor (signed, directed edges)            | `523fff27-afe8-11e9-8bb4-0ac135e8bacf` | 10,339 / 33,381    |
| NDEx       | DGIdb drugs and target genes               | `7e5e64ff-f6cf-11ea-99da-0ac135e8bacf` | 12,100 / 32,814    |
| NDEx       | WikiPathways landscape (clusters)          | `2b3ed6af-5031-11eb-9e72-0ac135e8bacf` | 32,077 / 74,109    |
| NDEx       | PCNet 2.2, a `maxBytes` test               | `8b4b54fa-e87d-11ee-9621-005056ae23aa` | 18,558 / 3,323,928 |
| Cypher     | Neo4j demo `movies`                        | `https://demo.neo4jlabs.com:7473`      | 171 / 253          |
| Cypher     | Neo4j demo `gameofthrones`                 | same                                   | 798 / 6,620        |
| Cypher     | Neo4j demo `fincen` (money flows)          | same                                   | 7,524 / 40,835     |
| Cypher     | Neo4j demo `openstreetmap` (positions)     | same                                   | 69,165 / 76,040    |
| Cypher     | Neo4j demo `offshoreleaks`, `whole: false` | same                                   | 1,969,309 / 3.27 M |
| Cypher     | Hetionet (Neo4j 3.5, Bolt only)            | `bolt+s://neo4j.het.io:7687`           | 47,031 / 2,250,197 |
| `openalex` | Watts-Strogatz paper's citations           | work `W2112090702`                     | 31 + 42,968 citing |
| REST       | STRING: TP53's functional partners         | `string-db.org/api/json/network`       | 21 / 113           |
| REST       | deps.dev: webpack 5.90.0                   | `api.deps.dev/v3/.../dependencies`     | 84 / 121           |
| REST       | MusicBrainz: The Beatles                   | `musicbrainz.org/ws/2/artist/...`      | 119 relations      |
| SPARQL     | Wikidata: language influences              | `query.wikidata.org/sparql`            | 926 rows           |
| SPARQL     | UniProt: TP53 interactions                 | `sparql.uniprot.org/sparql`            | 372 rows           |

The Neo4j demo answers both the Query API and Bolt `wss://`; its `publicLogin` is the database name
(`movies` / `movies`). deps.dev already returns nodes and edges. OpenAlex needs a free `api_key`
past a few calls; nothing else needs a credential. Also browser-verified: the other Neo4j demo
databases (northwind, stackoverflow2, recommendations, twitter, network, companies, wordnet; and
neoflix, twitch and the 50-million-node stackoverflow as `whole: false`); NDEx's BioPlex and
Reactome; OpenAlex coauthors; for REST, Crossref, OpenCitations and Europe PMC references, Reactome
interactors, Wikipedia links (`origin=*`), Bluesky follows, GitHub contributors (60 an hour) and the
npm, PyPI and crates.io registries; for SPARQL the QLever Wikidata mirror, DBpedia, WikiPathways,
OpenCitations, Getty, data.bnf.fr and Rhea.

Not usable as samples: Memgraph, Neptune and Gremlin have no public instance (their docs use the
reader's own database, such as TinkerPop's toy graphs on a local Gremlin Server); Europeana's
SPARQL, `query.linkedopendata.eu` and IntAct PSICQUIC refused the page; GitHub GraphQL needs the
reader's token; Nobel Prize SPARQL answered in a binary format, and Semantic Scholar withheld the
sample paper's references, until rechecked. No service in this check listed its rate-limit headers
in `Access-Control-Expose-Headers`, so `report.source.budget` may be empty in browsers; the REST
issue rechecks OpenAlex, earlier seen exposing them.

---

## 13. Generic REST mapping (`/sources/rest`)

### 13.1 What exists today

- **graph-io's JSON importer** (`graph-io/src/formats/json/importer.ts`) reads one document in
  nine dialects (node-link, d3, JGF, Cytoscape, graphology, vis, OBO Graphs, adjacency, tree),
  sniffed or forced, with dotted `nodesPath` / `edgesPath` and renamed id and end keys.
- **graphty-element's JSON data source** (`graphty-element/src/data/JsonDataSource.ts`) finds the
  node and edge arrays of one `url`, `data` or `file` with JMESPath expressions.

Both read one response that already holds a node array and an edge array. Neither makes a second
request, pages, derives edges from a field of a node record (`"knows": ["bo"]`,
`referenced_works`), turns nested records into nodes (the authors inside a work), follows a
reference to another resource, or knows about rate limits and keys. Real APIs need all of these.

### 13.2 The mapping

A `RestMapping` is JSON data, so it can be typed into a form, kept in a project file and shipped as
a preset. `restSource(mapping, info)` turns one into a `records` source; the generic `rest` source
takes `RestParams` (`{ mapping: RestMapping } & Record<string, unknown>`, the mapping plus the
values its templates use), so a mapping runs with no code.

```ts
export interface RestMapping {
    readonly version: 1;
    readonly endpoint: string; // every request must stay on this origin
    readonly requests: Readonly<Record<string, RestRequest>>; // named requests
    readonly entities: Readonly<Record<string, RestEntity>>; // how records become nodes and edges
    readonly load: string; // the request a load runs
    readonly expand?: string | { readonly in?: string; readonly out?: string }; // per batch of seeds
    readonly hydrate?: string; // fetch the full record of stub nodes (by id, batched)
    readonly auth?:
        { readonly kind: "bearer" } | { readonly kind: "api-key"; readonly header?: string; readonly query?: string };
    readonly rateLimit?: { requests: number; perMs: number; concurrent?: number };
    readonly budgetHeaders?: { readonly remaining: string; readonly reset?: string };
    readonly params?: readonly SourceParamDescriptor[]; // what a form asks for
}

export interface RestRequest {
    readonly method?: "GET" | "POST"; // default GET
    readonly path: string; // template: "/works/{id}"
    readonly query?: Readonly<Record<string, string>>; // templates: { filter: "cites:{work}" }
    readonly body?: unknown; // POST JSON; templates in string leaves
    readonly records: string; // selector of the record array, "." for one record
    readonly entity: string; // which entity the records are
    readonly paging?: RestPaging;
    readonly batch?: { readonly max: number; readonly join: string }; // {ids} holds up to max ids
}

export type RestPaging =
    | { style: "cursor"; param: string; first: string; next: string } // next: selector in the body
    | { style: "offset"; param: string; size: { param: string; value: number }; unit?: "items" | "pages"; base?: 0 | 1 }
    | { style: "link-header"; rel?: string } // default rel "next"
    | { style: "next-url"; next: string }; // a full URL in the body, origin-checked

export interface RestEntity {
    readonly id: string; // selector within the record
    readonly stripPrefix?: string; // "https://openalex.org/" makes "W2741809807"
    readonly fields?: Readonly<Record<string, string>>; // attribute name -> selector
    readonly edges?: readonly RestEdgeRule[];
    readonly embedded?: readonly { readonly at: string; readonly entity: string }[]; // nested records that are nodes
}

export type RestEdgeRule =
    | {
          each?: string;
          from?: string;
          to: string;
          type: string;
          entity?: string;
          fields?: Readonly<Record<string, string>>;
      }
    | { each?: string; pairs: string; type: string }; // an edge between every two ids at `pairs`
```

**Selectors** are graph-io's existing dotted paths (`nodesPath`) plus `[]` to flatten an array:
`results`, `meta.next_cursor`, `authorships[].author.id`. Not JMESPath: graph-io keeps zero
dependencies. A mapping that needs more is a `records` source in code (section 4.1), the advanced
path the mapping itself is built on.

**Templates.** `{name}` takes a parameter; expand and hydrate requests also get `{id}` and `{ids}`
(joined by `batch.join`, at most `batch.max` per request). Every value is URL-encoded for its
position, a value cannot add a path segment, and the finished URL must have the endpoint's origin,
else `E_SOURCE_PARAM` (`reason: "origin"`). A `next-url` from a body is checked the same way.

**Records to nodes and edges:**

1. Each record of a request's entity is a node: `id` (prefix stripped), `labels: [entity]`, and
   `fields`. With no `fields`, every top-level scalar is kept.
2. Each edge rule makes edges. `from` defaults to the record's id; `each` repeats the rule over an
   array, with `from` and `to` read inside each element (an authorship's author and its
   institutions). A `pairs` rule joins every two ids it finds, undirected: co-authorship.
3. An edge target with no record yet becomes a **stub**: a node with only its id and
   `_source.stub: true` and `_source.entity` (the reserved namespace of section 14.4). Hydrating
   or expanding it fetches its record, which replaces the stub's fields.
4. `embedded` records are nodes of their entity, with that entity's own edge rules.
5. A node met twice keeps the last record's fields (`addNodeRecord`'s rule); stubs never
   overwrite a full record.

**Paging** follows the declared style; caps apply between pages, and `next` holds the request name
and its position, so a capped load or a capped expansion continues later. `link-header` paging in a
browser needs the service to expose `Link` (section 7.2, item 10); a hidden header is
`E_SOURCE_RESPONSE` (`params.expected: "link-header"`), never a silent single page. When a later
page answers 401 or 403 (OpenAlex without a key), the load keeps what it has, records `next` and
warns `W_SOURCE_AUTH`, so an application can ask for a key and continue.

**Rate limits and budgets.** `rateLimit` paces `ctx.fetch`. `budgetHeaders` names the response
headers that tell what is left; when readable, `report.source.budget` carries
`{ remaining, resetMs }` and the application decides what to do near zero. A 429 is retried and
then `E_SOURCE_QUOTA`, as everywhere.

**Auth** is a credential like any other source's: `auth` tells the form what to ask for, the key
goes only to the mapping's origin, and a query-string key never reaches a report (section 8). The
credential store (section 6.4) keys a remembered credential by source id and origin, so a mapping
in a shared project file that points elsewhere gets nothing.

**How it plugs in.** `restSource` returns a `GraphSource` with `records` (the load request,
paged), `expand` (the `in` or `out` request with `{ids}` of the seeds, breadth-first to `depth`,
`limit` capping new nodes), `probe` (the load request with a page size of one where the paging style
allows) and `validate` (section 16.3). A mapping from a project file waits like any source load
(section 14.2).

### 13.3 OpenAlex (`openalex`, a preset of `rest`)

OpenAlex is an open index of scholarly works, authors, institutions and topics. Checked with live
requests on 2026-10-17:

- `https://api.openalex.org` sends `Access-Control-Allow-Origin: *`, its preflight allows
  `Authorization`, so it works from a browser. One check saw it expose `X-RateLimit-*` and
  `Retry-After` to the page and a later one did not (section 12.5); the REST sub-issue settles it.
- **The polite pool is gone.** Without a key, every caller on one IP address shares a daily budget
  of $0.10 (`x-ratelimit-limit: 1000`); the response says `mailto` no longer raises it. A free key
  gives $1 a day, sent as `api_key=`; a wrong key answers 401. A single-entity GET cost 0 credits; a
  list page cost 1 ($0.0001).
- **Cursor paging needs a key:** `cursor=*` with `per-page=200` worked, and the second page
  answered 401 "API key required for cursor paging". `page=` paging stops at 10,000 results (page
  60 of 200 answered 400).
- `filter=cites:W...` (rewritten to `referenced_works:`) lists citing works; `openalex:W1|W2`
  fetches many by id in one list request.
- Works carry `referenced_works` (ids), `cited_by_count`, `authorships[].author`,
  `authorships[].institutions[]` and `updated_date`; there is no `ETag` or `Last-Modified`.
  `concepts` still answers but is superseded by `topics`, which the preset uses. Ids are URLs.

`OpenAlexParams`: `work` or `author` (the seed), `graph` (`"citation"` default, or
`"coauthorship"`), `include` (any of `"authors"`, `"institutions"`, `"topics"`; default none).
Credential: `credentials.apiKey({ query: "api_key" }, key)`, optional. The preset's mapping for
the citation graph, abridged (the co-authorship load lists an author's works with
`filter=authorships.author.id:{author}` and adds `{ "pairs": "authorships[].author.id", "type":
"coauthor" }`):

```json
{
    "version": 1,
    "endpoint": "https://api.openalex.org",
    "load": "citing",
    "expand": { "in": "citing", "out": "by-id" },
    "hydrate": "by-id",
    "auth": { "kind": "api-key", "query": "api_key" },
    "budgetHeaders": { "remaining": "x-ratelimit-remaining", "reset": "x-ratelimit-reset" },
    "requests": {
        "citing": {
            "path": "/works",
            "query": { "filter": "cites:{ids}", "per-page": "200", "select": "{select}" },
            "batch": { "max": 50, "join": "|" },
            "records": "results",
            "entity": "work",
            "paging": { "style": "cursor", "param": "cursor", "first": "*", "next": "meta.next_cursor" }
        },
        "by-id": {
            "path": "/works",
            "query": { "filter": "openalex:{ids}", "per-page": "50", "select": "{select}" },
            "batch": { "max": 50, "join": "|" },
            "records": "results",
            "entity": "work"
        }
    },
    "entities": {
        "work": {
            "id": "id",
            "stripPrefix": "https://openalex.org/",
            "fields": {
                "title": "display_name",
                "year": "publication_year",
                "citedBy": "cited_by_count",
                "updated": "updated_date"
            },
            "edges": [
                { "to": "referenced_works[]", "type": "cites", "entity": "work" },
                { "to": "authorships[].author.id", "type": "authored_by", "entity": "author" },
                {
                    "each": "authorships[]",
                    "from": "author.id",
                    "to": "institutions[].id",
                    "type": "affiliated_with",
                    "entity": "institution"
                }
            ],
            "embedded": [{ "at": "authorships[].author", "entity": "author" }]
        },
        "author": {
            "id": "id",
            "stripPrefix": "https://openalex.org/",
            "fields": { "name": "display_name" }
        }
    }
}
```

On a load, `{ids}` is the `work` parameter. `{select}` is filled from `include`, which also drops
the rules for what is not included (here all three are shown); the `affiliated_with` rule reads each
authorship's author and its institutions, so the edge runs from the author, not the work. Hydration
is batched (one credit per 50 works) rather than one free GET per work, because it is 50 times fewer
requests against the documented 10 requests per second; `batch.max: 1` with a single-entity path
switches it. Freshness is `updated_date` (section 16.3).

---

## 14. graphty-element integration

### 14.1 One registry, read by the element

- The element keeps no second list: it reads graph-io's default registry at each load and catalog
  call, so a source registered at any time appears. `registerSource`, `defineSource`, `credentials`
  and the source types are re-exported from `./extend` (`credentials` also from the root and
  `./session`), so a consumer never installs graph-io directly.
- `./catalog` exposes `sourceDescriptors()` beside `formatDescriptors()`; a settings form draws its
  fields from the descriptor and builds no client.
- `DataSource.fromSource(source)` makes a reader. Unlike `fromImporter`, which builds the whole
  snapshot and then copies it into records, it hands each `RecordBatch` to the element's chunked
  ingest as it arrives; `file` and `import` sources keep the whole-snapshot path.
- `./bundle` re-exports the same names and includes the built-in sources' code; `neo4j-driver` is
  external in `vite.bundle.config.ts`, so Bolt reports `needs-peer-dependency` instead of being
  inlined or breaking the build.

### 14.2 Loading

```ts
// LoadChoices: the element's existing load choices (mode, mapping, unmatched, duplicateIds, ...),
// which also gain section 15's idPrefix, joinOn, columnPrefix and keep.
interface SourceLoadOptions extends LoadChoices {
    readonly existing?: "keep" | "update"; // for mode "merge"; default "keep" (section 5.1)
    readonly credential?: Credential;
    readonly endpoint?: string;
    readonly write?: boolean; // never recorded
    readonly limits?: SourceLimitOptions;
    readonly retry?: RetryOptions | false;
    readonly cursor?: SourceCursor;
    readonly signal?: AbortSignal;
}

// On the element, with the same typed overload as graph-io's loadFromSource:
loadFromSource(source: string, params: Record<string, unknown>, options?: SourceLoadOptions): Promise<{ loadId: number }>; // as loadFromUrl

// Through the session (element.session), one undoable step:
await element.session.data.import(
    { source: "neo4j", config: { query, parameters }, name: "Friends of Ana" },
    { credential: credentials.basic("neo4j", password), endpoint: "https://xxxx.databases.neo4j.io" },
);
```

- `DataSourceInput` gains `source?: string`, exclusive with `type`.
- **The credential is never recorded, and nothing re-fetches without it.** A source load reads
  outside the command, with the credential, then hands the command the rows it read (the path
  `prepare()` already uses), instead of the reader the command rebuilds on redo today. The command
  records only `{ source, config, endpoint, version, next }`; undo and redo replay the rows and
  never fetch. The credential and `write` are in none of `data.source()`, the undo journal, a
  project file or an event.
- **A project file never runs a query by itself.** Otherwise opening a shared file could run a
  stored query against a database on the reader's machine. Source loads in an opened project wait:
  `data.pendingSourceLoads()` returns `{ id, source, endpoint, hasQuery, isLocalNetwork,
authRequired }[]`, and each runs read-only through `data.runPendingSourceLoad(id, { credential })`.
  Whether to ask the reader first is the application's choice.
- A recorded older `version` is upgraded by `migrateParams`, else refused
  (`reason: "stale-params"`).
- Errors are the element's `GraphtyError` (`./session`), whose `code` (typed to include
  `SourceIssueCode`) and `details` are the issue's. Progress is `data-loading-progress`, with
  `unit`.

### 14.3 The rest of the source surface

Each call takes `credential` and `endpoint` options and, missing a needed credential, rejects with
`E_SOURCE_AUTH` (with `origin`):

- `data.testSource({ source, config }, options)`: `probeSource()`, resolving to a `SourceProbe`.
- `data.listSource({ source, config }, query, options)`: `listFromSource()`, neutral rows.
- `data.expand(ids, { depth, direction, limit, ...options })`: `expandFromSource()`, then a merge
  with `existing: "update"`.
- `data.more(options)`: the next page after a capped load; `data.source().next` says if there is
  one.

These are capabilities, so they live in the element; what to show while they run is the
application's.

### 14.4 Click-to-expand

**What exists.** A double-click on a node calls two host hooks, `fetchEdges(node, graph)` then
`fetchNodes(ids, graph)` (`graphty-element/src/config/GraphBehavior.ts`, `NodeBehavior.ts`), and the
result lands as one undoable `data.expand` command that carries the fetched records, so redo never
fetches again. Every consumer writes those hooks; there is no collapse, no limit, and no fact
saying which nodes have more to show.

**The design.** The element supplies the fetch from the node's own source, so a graph loaded from a
source can be explored without loading it all:

```ts
interface ExpandBehavior {
    readonly trigger?: "none" | "click" | "double-click"; // default "none"
    readonly depth?: number; // default 1
    readonly direction?: "out" | "in" | "both"; // default "both"
    readonly limit?: number; // new nodes per expansion; default none (graph-io's no-limit)
    readonly relationshipTypes?: readonly string[];
    readonly layout?: "continue" | "none"; // default "continue", today's data.expand behavior
}
// <graphty-element> config: behavior.expand; from code or an application's button:
await element.session.data.expand(["2680"], { depth: 1, limit: 50 });
await element.session.data.collapse("2680");
```

- **Which source.** Every node records the loads and expansions that brought it
  (`_source.loads`, section 15). An expansion asks the first of those that is a source load, with
  its endpoint, parameters and remembered credential (section 6.4); a node from a file answers
  `E_SOURCE_UNSUPPORTED` (`params: { feature: "expand" }`). Host hooks, when set, still win, so
  today's behavior is unchanged.
- **Facts, not styling.** The element writes neutral fields under the reserved `_source.` prefix,
  which graph-io also uses for stubs (section 13.2):
    - `_source.expansion`: `"none"`, `"partial"` (a capped expansion left more: `_source.next`
      holds its cursor) or `"complete"` (every neighbor within the request's filters was fetched).
    - `_source.degree`: the node's degree at the source when the source returns it at no extra
      cost (the Cypher degree hint, verified over Bolt; OpenAlex's `cited_by_count` plus the
      length of `referenced_works`), else null.
    - `_source.hidden`: `degree` minus the neighbors loaded, null when the degree is unknown.
    - `_source.stub`, `_source.entity`, `_source.loads`.

    An application that wants a halo on nodes with more to show adds its own style layer with a
    selector such as `` _source.expansion != `complete` ``. The element ships no such style, by the
    same rule as algorithm styles: what to emphasize is the reader's choice.

- **Limits and more.** A capped expansion keeps its cursor per node; expanding the same node again
  continues from it rather than refetching.
- **Collapse.** `data.collapse(id)` removes what that node's expansions added and nothing else: a
  node or edge goes only when no other load or expansion also brought it and it is not pinned. A
  node the reader edited stays and is reported (`W_COLLAPSE_KEPT`, `params: { ids, reason }`). One
  undoable step; undoing an expansion already removes exactly it.
- **Layout.** New nodes start near the seed, offset by a seed from the expansion's key
  (`data/seedPosition.ts`), so a replay places them the same way; existing nodes keep positions
  and pins. `layout: "continue"` feeds them to the running layout (`LayoutEngine.addNodes`);
  `"none"` leaves them where they start.
- **Events** (session events, and DOM events `graphty-source-expand-start` and so on):
  `source:expand-start` with `{ seeds }`; `source:expanded` with code `I_SOURCE_EXPANDED` and
  `params: { seeds, added, partial }` (`added` counts nodes and edges); `source:expand-failed` with
  any source code and its params. One expansion per seed at a time; a second click while one runs
  joins it.

---

## 15. Combining sources

**What exists.** `session.data.import` merges with `mode: "merge"` and the load choices in
`graphty-element/src/session/types.ts`: `duplicateIds` (`"first"`, `"merge"`, `"refuse"`),
`unmatched` (`"add"`, `"leave-out"`), `mapping` and `directed`. `data.source()` describes one
source; nothing records which load brought which node, and the element has no `idPrefix`.

The design treats a graph as a list of **loads** (a file, a URL, a source load) plus their
expansions, each with a key:

- **`data.loads()`** lists them (the records of section 16.1). `data.source()` keeps its meaning.
- **Ids match exactly by default**, the neutral behavior. Three tools change that, all load
  options recorded with the load:
    - `idPrefix: "neo4j:"` gives a load its own id space, so nothing matches across loads.
    - `joinOn: { incoming: "uniprot", existing: "represents" }` matches an incoming node to the
      existing node whose `represents` equals its `uniprot`; the incoming node takes the existing
      id, and its edges are rewritten through the same map. A value that matches two existing
      nodes joins neither: `W_JOIN_AMBIGUOUS` (`params: { value, ids }`). With
      `unmatched: "leave-out"` a join only enriches the nodes already there.
    - `columnPrefix: "string."` writes the incoming attributes under a prefix, so two sources'
      `score` columns never collide.
- **Attribute conflicts** follow `existing: "keep" | "update"` (section 5.1). Each conflicting
  column is reported once: `W_MERGE_CONFLICT` (`params: { column, count, kept }`).
- **Provenance.** Every node and edge carries `_source.loads`, the keys of every load and
  expansion that brought it. Collapse, refresh and `data.removeLoad(key)` use it: removing a load
  removes what only that load brought. Attributes have no per-value provenance (a known limit), so
  a removed load's values on shared nodes stay until a refresh.
- **Filter at the source when it can, after loading when it cannot.** Parameters with
  `role: "filter"` (Cypher `labels` and `relationshipTypes`, NDEx's search, OpenAlex's `filter`,
  a SPARQL query's own patterns) cut what crosses the network and are recorded with the load, so a
  refresh repeats them; an application can offer them uniformly. What the source cannot filter,
  the load option `keep: { nodes?: string; edges?: string }` filters before the merge, with the
  selector language of style layers, also recorded. Later hiding and selecting are the reader's own
  session steps.
- **Refreshing a combined graph** refreshes each load in recorded order (section 16.2), then its
  expansions; joins run again; an element dropped upstream by one load leaves only when no other
  load still brings it.

---

## 16. Reopening a network project: restore, cache, freshness

**What exists.** A saved project (`graphty-element/src/session/projectFile.ts`, `.graphty.json`)
embeds every node and edge row, `data.source()`, positions and pins. Opening it re-adds the rows
and fetches nothing. So a reopened network project already shows its graph offline; what is
missing is the record needed to refresh it, and a way to tell whether it is still current.

### 16.1 What a project records

A `graphty-sources` member holds one record per load, in order:

```ts
interface SourceLoadRecord {
    readonly key: string; // also in _source.loads
    readonly source: string; // the source id
    readonly version: number;
    readonly config: Readonly<Record<string, unknown>>; // parameters, a REST mapping included
    readonly endpoint: string | null; // origin and path
    readonly options: Readonly<Record<string, unknown>>; // idPrefix, joinOn, keep, existing, limits
    readonly loadedAt: string; // ISO time the fetch finished
    readonly pages: number; // pages read, so a refresh reads as many
    readonly next: SourceCursor | null;
    readonly validators: SourceValidators;
    readonly credential: { readonly kind: string; readonly origin: string; readonly username?: string } | null;
    readonly expansions: readonly {
        readonly key: string;
        readonly ids: readonly NodeId[];
        readonly depth: number;
        readonly direction: "out" | "in" | "both";
        readonly limit?: number;
        readonly at: string;
        readonly next: SourceCursor | null;
        readonly validators: SourceValidators;
    }[];
}

export interface SourceValidators {
    readonly etag?: string;
    readonly lastModified?: string;
    readonly modified?: string; // the service's own time: NDEx modificationTime, OpenAlex's newest updated_date
    readonly serverVersion?: string;
    readonly contentHash?: string; // SHA-256 of the canonical rows this load wrote
}

export interface SourceFreshness {
    readonly status: "current" | "changed" | "unverifiable";
    readonly via?: "etag" | "modified" | "version" | "hash";
    readonly changedAt?: string;
    readonly validators: SourceValidators; // the new ones, recorded after a refresh
}
```

`credential` is the identity only (kind, origin, user name), so a reopened project can ask for the
right credential; never the secret, and never `write`.

### 16.2 On reopen

1. **Offline first.** The rows render at once, as today; each load reports `status: "cached"` and
   its `loadedAt`.
2. **Nothing fetches by itself** (section 14.2). `data.revalidate(key?)` and `data.refresh(key?)`
   are explicit; an application may call them on open, which costs one small request for most
   sources.
3. **Credentials** come from the store (section 6.4) by source and origin; with none, the call
   rejects with `E_SOURCE_AUTH` (`params: { origin, stored: false }`) and the application asks.
4. **`revalidate`** answers per load with `I_SOURCE_CURRENT`, `W_SOURCE_CHANGED` or
   `W_SOURCE_UNVERIFIABLE`, with `params: { key, loadedAt, changedAt?, via }` (`via`: `"etag"`,
   `"modified"`, `"version"` or `"hash"`).
5. **`refresh`** re-runs the load to the same number of pages, replays each expansion in order with
   its recorded request, and applies the difference by id as one undoable step: new elements,
   elements no load brings any more, changed attributes. It reports `I_SOURCE_REFRESHED`
   (`params: { key, added, removed, updated }`). An expansion whose seed is gone is skipped
   (`W_SOURCE_SEED_GONE`, `params: { key, ids }`). A value the reader edited that the source also
   changed is a conflict: `W_SOURCE_CONFLICT` (`params: { key, ids, columns }`), settled by
   `onConflict: "keep-local" | "take-source"`, default `"keep-local"` so nothing the reader did is
   lost without being asked.

### 16.3 Verification by source

A source's optional `validate(params, seen, ctx)` returns the cheapest answer it can:

| Source                      | How                                                                      | Cost                                      |
| --------------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| NDEx                        | the summary's `modificationTime`                                         | one 4 KB GET                              |
| file, REST with validators  | `If-None-Match` / `If-Modified-Since`, 304 when unchanged                | one request; in a browser only if exposed |
| OpenAlex                    | the newest `updated_date` of the loaded works (`select=id,updated_date`) | one list call per 50 works                |
| Neo4j, Neptune              | re-run and compare `contentHash`; `serverVersion` changes are noted      | a full re-run                             |
| SPARQL, sources without any | `contentHash`                                                            | a full re-run                             |

`revalidate({ cheap: true })` skips the re-runs and answers `W_SOURCE_UNVERIFIABLE` for those
loads. A hash is over canonical rows (sorted ids, sorted keys), so the same data hashes the same.

### 16.4 The cache

- The project file is the durable cache of a saved project. Within a session, undo and redo
  already replay the rows a command carries.
- An optional persistent cache serves loads and expansions again without the network, for unsaved
  work and offline exploration: `sourceCache: { store: "none" | "indexeddb", maxBytes?, maxAgeMs?
}`, default `"none"`. An entry is keyed by a SHA-256 of the source id and version, the endpoint,
  the canonical parameters and request and the credential's identity (never its secret), and holds
  the rows and their validators. Least recently used entries go past `maxBytes`; an entry older than
  `maxAgeMs` is revalidated before use. Data fetched with a credential is the reader's private data:
  its entries are dropped when that credential is forgotten, and `forgetAll()` empties the cache.

---

## 17. Testing without live credentials

1. **Recorded responses** on every pull request: real responses captured once (secrets removed),
   replayed through the `fetch` option, failing on any unrecorded request. Error paths (401, 403,
   404, 429, 503, malformed bodies, cross-host redirects) are recorded or hand-written.
2. **A conformance suite** for every built-in source: the descriptor validates; parameters are
   checked before any request; a sentinel secret never appears in any report, issue, error,
   cursor or serialized output (Bolt included); the global `fetch` is never called; abort rejects
   within a page; a capped load's cursor resumes exactly.
3. **Real databases in containers:** a new `graph-io-sources` CI shard runs the official Neo4j
   (5.26 and latest) images, and Gremlin Server's once the Gremlin source exists, on pull requests
   that change
   `graph-io/src/sources/`, in the merge queue and on the release train; locally, Docker or the
   release archives.
4. **Neptune:** recorded responses and AWS's SigV4 test vectors; no live lane. One request to a
   real Neptune Analytics graph decides browser support (section 12.4) and needs an AWS account.
   **OpenAlex and other REST presets:** recorded responses, including the keyless 401 on a
   second cursor page.
5. **Live public services** (the samples of section 12.5): a weekly workflow that files an issue
   when a response shape changes, never gating a pull request.
6. **Browser behavior:** a new graph-io vitest browser project and CI shard test section 7's
   checks against local servers with and without CORS, in Chromium and Firefox, and WebKit on the
   macOS host.

---

## 18. Prior art

Adopted: a share URL as a first-class input (Cytoscape's NDEx client, whose hand-kept registry
decayed); fixed `id`, `source`, `target` names (Gephi); every connector ending in nodes and edges
(Graphistry, whose connectors are methods third parties cannot add); merge and expand by stable id
(KeyLines, ReGraph); bindings against injection (TinkerPop); depth-aware neighbor calls and
capability flags (LlamaIndex, LangChain graph stores).

---

## 19. Other online sources, ranked

The initial sources are NDEx, Cypher (Neo4j; Neptune from Node, Neptune Analytics conditionally)
and the REST mapping with OpenAlex. The rest, by how much graphty's personas would want each
against the effort ("Browser" is CORS, checked 2026-10-17):

1. **Generic SPARQL** (Wikidata, any RDF store; Neptune from Node): browser yes, without an auth
   header; medium effort. The RDF counterpart of the Cypher source, with term helpers in place of
   parameters (section 11).
2. **STRING, deps.dev, MusicBrainz, citation APIs** as REST presets: browser yes; low effort each
   (a configuration and recorded tests).
3. **File host** (any URL, GitHub raw, zip): common hosts yes; low.
4. **Gremlin** (JanusGraph, TinkerPop; Neptune inside its VPC): `wss://`; low.
5. **Netzschleuder, SNAP, KONECT:** no CORS, so Node only, or rehosted by graph-samples.
6. **GraphQL** (per service; GitHub's needs the reader's token), **ArangoDB** (with a trusted
   origin set), **BioGRID** and **Semantic Scholar** (own keys), **Overpass** (flaky), and
   **Dgraph, TigerGraph, NebulaGraph, Cosmos DB** (unverified): later, medium or less.

---

## 20. graph-samples' dataset downloads

`fetchDataset(name, { baseUrl, fetch, signal })` downloads a wire file from graphty.app. It needs
no importer, auth, paging or query, from a fixed trusted host; folding it into the registry would
make graph-samples depend on graph-io for nothing. Decision: **two mechanisms, one catalogue.**
graphty-element, which depends on both, registers a `graph-samples` source built with the public
`defineSource`, so its catalogue lists datasets and sources together and the dataset source is the
dogfood third-party source. It maps `fetchDataset`'s plain `Error` to `E_FETCH` /
`E_SOURCE_NOT_FOUND`; graph-samples adopting codes is a separate additive change.

---

## 21. Live and changing sources

Out of scope. A load ends in one frozen snapshot, while a live source emits changes, including
removals, to an existing graph. A later design would add an optional
`watch(params, ctx): AsyncIterable<GraphChange>` keyed by section 5.1's stable ids and applied by
the element. Nothing here blocks it. Polling is a reload the application schedules.

---

## 22. Decisions for the owner

Everything else here is additive API. Settled on 2026-10-17: `neo4j-driver` is an optional peer
dependency of graph-io, loaded only by the Cypher source's Bolt transport (the owner: "peer
dependencies for graph-io are fine"). These still publish contracts that are hard to change later:

1. **The source contract** (`GraphSource`, its methods, `SourceContext`), which third parties will
   implement. Recommendation: ship it experimental, and freeze it after NDEx, Cypher and the REST
   mapping (a `records` source, the path third parties use) are built on it.
2. **What a project file records about network data:** the `graphty-sources` member of section
   16.1 (load records with their config, options, expansions, cursors, validators and the
   credential's identity, never its secret), and that opening a project never fetches by itself.
   Project files outlive releases. Recommendation: this shape, versioned, and no URL scheme
   (`ndex://`) until shareable links are needed.
3. **The REST mapping format** (section 13.2), also stored in project files and written by hand by
   consumers. Recommendation: ship it with a `version` field, experimental with the contract.
4. **The `_source.` attribute namespace** on nodes and edges (section 14.4): saved in project files
   and used by applications' style layers. Recommendation: this prefix, reserved, documented.
5. **Source ids as public names:** `ndex`, `cypher` with presets `neo4j` and `neptune`; `rest` with
   preset `openalex`; later `sparql`, `gremlin`. A separate name space from formats, so the
   `neo4j` source and CSV format coexist. Recommendation: these ids.

---

## Appendix A. Sub-issues (drafted, not filed)

One framework issue, one per initial source, one per further source. All carry `enhancement`, a
priority and an effort, and say `Refs #2907`.

**A.1 graph-io and graphty-element: network source framework** (`priority:high`, `effort:high`).

> Sections 2 to 11, 14.1 to 14.3 and 17 of `design/graph-io/network-sources-design.md`: graph-format's record
> methods made permanent; the contract types, `defineSource`, `registerSource`, lazy sources and
> the load functions, marked experimental; `credentials` with origin binding, the TLS and redirect
> rules; the guarded `ctx.fetch` with retries, caps, progress, pre-request checks and the
> blocked-request classification; `ImportIssue.params`, the typed codes, `ImportReport.source`.
> graphty-element: sections 14.1 to 14.3 and the bundle. Tests: replay, conformance, a graph-io
> browser project and CI shard. Docs: "Loading from a service" and
> "Writing a source", passing the blind-author test against the published types. Done when a
> third party's 15-line source loads in graphty-element from the bundle with no other code.

**A.2 graph-io: NDEx source** (`priority:high`, `effort:medium`; after A.1).

> Section 12.1: CX2 download, `parseShareUrl`, summary checked against the caps, v2 search, CX1
> neighborhood `expand`, `validate` by `modificationTime`. Check Keycloak tokens and Safari.

**A.3 graph-io: Cypher source with Query API and Bolt transports, Neo4j preset**
(`priority:high`, `effort:high`; after A.1).

> Section 12.2: the shared query builder, flattener and type mapper, the `query-api` and `bolt`
> transports, the Neo4j profile (`id(n)` before Neo4j 5), `probe`, `validate`, the Neo4j demo and
> Hetionet samples. Container lanes for Neo4j 5.26 and latest.

**A.4 graph-io: Neptune** (`priority:medium`, `effort:medium`; after A.3).

> Section 12.4: the `neptune` preset with the Node-only `neptune-https` transport and the
> `neptune-analytics` transport, SigV4 against AWS's test suite, Cognito-fed temporary
> credentials, streamed errors. Recorded responses, plus one request to a real Analytics graph to
> settle CORS on its host (browser support, or Node only).

**A.5 graph-io: REST mapping source with the OpenAlex preset** (`priority:high`,
`effort:medium`; after A.1).

> Section 13: the mapping format and its checks, the `rest` source taking a mapping as data, and
> the `openalex` preset (citation and co-authorship graphs, `api_key`, `updated_date` validation).
> Recheck whether OpenAlex exposes its rate-limit headers to a page (section 12.5).

**A.6 graphty-element: click-to-expand, collapse and provenance** (`priority:high`,
`effort:medium`; after A.1).

> Section 14.4. Real-input tests: a click on the canvas expands a node.

**A.7 graphty-element: combining sources** (`priority:medium`, `effort:medium`; after A.6).

> Section 15: `data.loads()`, `idPrefix`, `joinOn`, `keep`, `columnPrefix`, `data.removeLoad`.

**A.8 graphty-element: reopening network projects** (`priority:medium`, `effort:high`; after A.6).

> Section 16: the `graphty-sources` member, `revalidate`, `refresh`, the optional cache.

**A.9 graphty-element: one credential store for AI keys and sources** (`priority:medium`,
`effort:medium`; after PR #1677).

> Section 6.4: `CredentialStore`, `ApiKeyManager` as its `ai` namespace with unchanged storage
> keys, the `source` namespace. Follow-up: a non-extractable `CryptoKey` for the default key.

**A.10 to A.14** (`priority:low`, after A.1): section 19's first five, one issue each, with their
section 12.5 samples. SPARQL and the graph-samples rehosting (after a license review) are
`effort:medium`, the rest `effort:low`.
