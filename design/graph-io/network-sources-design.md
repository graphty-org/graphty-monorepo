# Loading graphs from network sources

Status: design, 2026-10-17. Nothing here is implemented. Tracking issue: #2907. Browser and Node
behavior was measured on 2026-10-17 (section 7 says how); everything marked unverified was not.

## The problem in one paragraph

graph-io reads a graph only from bytes the caller already holds: a string, a `Uint8Array`, a
stream, a `File`, or one URL fetched whole by `loadFromUrl()`. Much graph data lives behind a
service instead: public repositories (NDEx), graph databases (Neo4j, Memgraph, AWS Neptune),
SPARQL endpoints (Wikidata), REST and GraphQL APIs. Reading from those today means the caller
writes the client, the authentication, the paging, the error handling and the conversion to a
graph. This design adds **network sources** to graph-io: a small public contract for "something
that turns parameters into a graph over the network", a registry, four built-in sources, and the
graphty-element entry point that makes every registered source loadable with no integration code.

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

---

## 1. Where this sits in the code that exists

Reused unchanged: `GraphSink` (`graph-format/src/types/builder.ts`); the importer shape
`import(input, sink, options)`; `ImportReport`, `ImportIssue`, `ImportError` and
`ImportReportBuilder`; `CommonImportOptions` (`ids`, `duplicateEdges`, `addMissingNodes`,
`errorLimit`, `signal`, `onProgress`); `FormatRegistry.importGraph()` for a fetched file;
`throwIfAborted` and the declared-type rules of graph-format design 5.1; the neo4j CSV importer's
`labels` and `type` columns; graphty-element's `DataSource.fromImporter`, `session.data.import`
and `data.source()`; graph-samples' `fetchDataset` (section 17).

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
`fetch`; the conformance suite (section 14) fails a built-in source that does.

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
    readonly description?: string;
}
```

Every union here is open (`... | (string & {})`, as the element's `FormatId` is), so a release
can add a value without breaking an exhaustive switch; the docs say to handle unknown values.
Current values: `SourceKind` repository, database, sparql, rest, graphql, file-host, other;
`SourceFeature` expand, probe, list, page; `SourceRuntime` browser, node, worker, other;
`SourceParamType` string, text, query, integer, number, boolean, enum, url, node-id;
`QueryLanguage` cypher, opencypher, gremlin, sparql, graphql, jmespath; `SourceRuntimeReason`
cors, needs-relay, needs-websocket-tls-proxy, needs-websocket, needs-secure-context,
insecure-endpoint, needs-node, needs-peer-dependency. A lazy source whose loaded methods disagree
with its declared `features` is refused (`reason: "features"`).

**`needs` absent means not declared:** nothing is checked before sending, and a request the
browser refuses is reported as `E_SOURCE_BLOCKED` (section 7.2, item 1). graph-io adds the
credential's own header to the checked set itself, so no source declares headers for auth.

Credentials are never parameters: never in `params`, a descriptor, a cursor or a report, so code
that stores parameters (a project file, an undo journal) cannot leak them. There is no
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
    neo4j: Neo4jParams;
    bolt: BoltParams;
    memgraph: BoltParams;
    neptune: NeptuneParams;
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
    readonly fetch?: typeof fetch; // tests, relays, Node agents
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
`SOURCE_ISSUE`); `/sources/ndex` (`NdexParams`, `parseShareUrl`); `/sources/neo4j` (Query API);
`/sources/bolt` and `/sources/memgraph` (optional peer `neo4j-driver`, declared in
`peerDependenciesMeta` as optional); `/sources/neptune`; later `/sources/sparql`.

---

## 4. Examples

### 4.1 The simple path: a first custom source

`GET /api/people` returns `[{ "id": "ana", "name": "Ana", "knows": ["bo"] }, ...]`:

```ts
import { defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

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

Twelve lines of source, with cancellation, retries on 429 and 503, a byte cap, progress, redirect
protection and coded errors from `ctx.fetchJson`. An edge to a node not in `nodes` adds that node:
`addMissingNodes` is true by default for a `records` source (a `file` source follows its format's
default, false for CX2). Authentication is one more option, never in the source, and the token is
sent only to the endpoint's origin:

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

const result = await loadFromSource(
    "neo4j",
    { query: "MATCH p = (:Person {name: $name})-[:KNOWS*1..2]-() RETURN p", parameters: { name: "Ana" } },
    { endpoint: "https://xxxx.databases.neo4j.io", credential: credentials.basic("neo4j", password) },
);
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
- **Neo4j:** `elementId(n)`, in practice stable while the node exists; `idProperty` (`uuid`) is the
  stable choice, and the docs say so.
- **Memgraph:** `id(n)` as a string; reused after deletion and changed by restarts; same advice.
- **Neptune:** `~id`, never reused.

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
    ): Credential; // service default "neptune-db"
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
  internally and applies the origin and TLS rules itself (section 12.3).
- **Neptune:** `aws-sigv4`, or none. SigV4 is about 150 lines over Web Crypto, tested against AWS's
  signature test suite, with no AWS SDK. graph-io never reads `~/.aws` or the environment; a Node
  caller passes the SDK's provider chain as the function form.

### 6.4 Credentials in browsers

A private field keeps a secret out of logs, not out of devtools, extensions or other script on
the page. Only the reader's own credentials belong in a browser; shared keys (a team password, a
Cosmos DB account key, long-term AWS keys) go behind a relay the deployer runs. graphty-element
never writes a credential to `localStorage`, IndexedDB or a URL.

---

## 7. Browser limitations and how the design handles them

**How this was measured.** On 2026-10-17, probe pages served from `http://localhost`, a plain-http
host and an https host ran real `fetch()` and `WebSocket` calls in headless Chromium 143 and
Firefox 144 (Playwright 1.57); Node 22 ran the same requests. Targets: NDEx (3.0.8), Wikidata's
SPARQL endpoint, `demo.neo4jlabs.com`, about twenty other public APIs and file hosts, and servers
run from their release archives (Neo4j 5.26, Memgraph 3.12, Gremlin Server 3.7.7, websockify).
Docker and podman were unavailable. WebKit could not start without root, so **Safari is
unverified** and is checked on the macOS CI host first. No AWS account was used: Neptune facts are
from AWS's documentation and Graph Explorer.

### 7.1 Where each source runs

| Source                              | Node 18+           | Browser, page on https                |
| ----------------------------------- | ------------------ | ------------------------------------- |
| Custom `records` / `file`           | yes                | when the service's CORS allows it     |
| NDEx                                | yes                | yes, at `www.ndexbio.org`             |
| Neo4j, HTTP Query API               | yes                | yes, over https (default origin `*`)  |
| Neo4j, Bolt                         | yes                | yes, `wss://` with Bolt TLS on        |
| Memgraph, Bolt                      | yes                | only through a TLS WebSocket proxy    |
| Gremlin Server                      | yes                | `wss://`; HTTP only without preflight |
| AWS Neptune                         | in the VPC, or IAM | only through a relay                  |
| SPARQL (Wikidata)                   | with a `userAgent` | yes, without an auth header           |
| SNAP, Netzschleuder, KONECT, Zenodo | yes                | no (no CORS)                          |

### 7.2 The limitations

Each item: the evidence (verified unless marked), then the answer. Every answer ends in a coded
error the application renders in its own words.

1. **The browser hides why a request failed.** CORS refusals, mixed content, refused connections,
   TLS errors and a 429 or 5xx without CORS headers all reach the page as one bare `TypeError`.
   Answer: check what can be checked first (items 2, 5, 17). After a bare `TypeError`, send one
   bodyless `GET` of the target origin's root (`mode: "no-cors"`, no credentials, no headers; never
   the original request, so a query never runs twice; skipped under `retry: false`). Opaque answer:
   `cause: "cors"` (reachable but unreadable, which covers a hidden 429, so it is retried once).
   Rejection: unreachable. When the page is public and the target is loopback, RFC 1918, `.local`
   or `localhost`, the cause is `"local-network"`, from the address. Result: `E_SOURCE_BLOCKED`
   (`params: { url, cause }`).
2. **Mixed content.** An https page (graphty.app) cannot fetch `http://` or open `ws://`. Answer:
   refused before sending (`E_SOURCE_RUNTIME`, `reason: "insecure-endpoint"`), except loopback,
   which Firefox allows: it goes to the network, and a refusal is `cause: "local-network"`.
3. **Local Network Access.** From an https page Chromium 143 refused `http://localhost`, Firefox
   allowed it, and from a public origin Chrome asks the reader (documented). Answer: item 1's
   cause; the docs say to allow the prompt or serve the app from localhost.
4. **No cookies cross-origin.** NDEx sends `Allow-Origin: *` with `Allow-Credentials: true`, which
   browsers reject for cookies. Answer: credentials only as headers, `credentials: "omit"`.
5. **Servers allow only some request headers.** Wikidata's preflight refuses `Authorization`;
   Gremlin Server answers every preflight 405. Answer: sources declare `needs.headers` and prefer
   requests with no preflight (Wikidata GET or form POST; Gremlin `text/plain`). A declared source
   gets an unsendable credential refused first (`reason: "cors"`, `params.header`); an undeclared
   one is sent and classified by item 1.
6. **Redirects without CORS headers.** `https://ndexbio.org` 301s to `www` without CORS headers;
   `github.com/.../raw/...` 302s with an empty `Allow-Origin`. Answer: NDEx uses the `www` host;
   the file-host source rewrites GitHub links to `raw.githubusercontent.com`.
7. **Credentials across redirects.** On a cross-host 302 all three runtimes dropped
   `Authorization` but would keep other headers and query keys. Answer: section 6.2.
8. **Credentials in the URL.** `https://user:pass@host` throws in both browsers. Answer: refused up
   front (`reason: "credentials-in-url"`).
9. **Cache across credentials.** Chromium answered a bad-token request from the cache of an
   identical tokenless GET (200, not 401). Answer: `cache: "no-store"` with a credential.
10. **Only safelisted response headers are readable.** NDEx and Wikidata expose none, so
    `Retry-After`, `Link` and `X-Next-Cursor` read as null unless `Access-Control-Expose-Headers`
    lists them. Answer: honor headers when readable, else plain backoff; page from the body.
11. **`Content-Length` is no progress total.** Large NDEx downloads are chunked; with
    `Content-Encoding` the length is the compressed size. Answer: progress counts decoded bytes,
    with a total only from the service (NDEx's `cx2FileSize`, within 4%).
12. **`User-Agent`.** Browsers cannot set it; Wikidata answers 403 and Overpass 406 to Node's
    default. Answer: the `userAgent` option, with no default string.
13. **A browser WebSocket sends no headers.** Bolt and Gremlin log in inside their protocol; a
    SigV4-signed WebSocket cannot be opened from a page (documented). Answer: in-protocol login.
14. **Neptune sends no CORS headers** and is VPC-only by default (documented; Graph Explorer
    "can't use direct connections"). A URL cannot show whether it is Neptune or a relay, so the
    source takes `via: "direct" | "relay"`. `"direct"` (default) is refused in a browser before any
    request (`reason: "needs-relay"`). `"relay"` takes only the relay's own auth: `awsSigV4` there
    is refused (`reason: "relay-signs"`), since the relay holds the AWS keys. In a browser,
    `awsSigV4` without a `sessionToken` is refused (`reason: "long-term-key"`). graph-io ships no
    relay and no default public proxy.
15. **Memgraph's WebSocket fails with its own TLS.** With `--bolt-cert-file` every `wss://` attempt
    closed before the handshake; websockify in front of plain Bolt worked. Answer:
    `via: "direct" | "tls-proxy"`; `"direct"` on an https page is refused
    (`reason: "needs-websocket-tls-proxy"`); the docs give websockify and nginx recipes.
16. **Bolt failures hang** 20 to 34 s (the driver's 30 s retry time), then give a
    `ServiceUnavailable` that cannot say why. Answer: retry time bounded by `timeoutMs`, a timer
    and the signal, `E_SOURCE_BLOCKED` with `cause: "unknown"`.
17. **No Web Crypto on a plain-http page.** Answer: `needs.secureContext`, checked first
    (`reason: "needs-secure-context"`).
18. **Allowed origins do not stop queries.** Neo4j restricted to one origin still ran a query from
    another; Gremlin Server's WebSocket checks no origin, so any page can query an unauthenticated
    local server. Not graph-io's to fix: the docs advise authentication, and section 13.2 keeps a
    project file from running a query by itself.
19. **Archives.** `DecompressionStream` does gzip, not zip, tar or bzip2. Answer: the `file` path
    detects gzip and zip; zip uses a small reader over `deflate-raw`; tar and bzip2 are out of
    scope.
20. **Abort reasons differ** (Chromium's own `AbortError` mid-body). Answer: `ctx.fetch` rethrows
    `signal.reason`.

Bodies stream in all three runtimes (5 MB of NDEx CX2 in about 200 ms), so a `file` source hands
the `Response` to the importer instead of reading it whole.

### 7.3 What needs a component someone else runs

- Neptune from a browser: a signing relay (Graph Explorer's proxy, API Gateway with a Lambda),
  run by the deployer.
- Memgraph from an https page: a TLS WebSocket proxy, run by the admin or the reader.
- A plain-http database from an https page: TLS on the server. Neo4j with a restricted origin: the
  app's origin added to its allow list. Both the admin's.
- A local database from graphty.app in Chrome: the reader allows the prompt, or runs the app
  locally.
- Hosts with no CORS: Node, graph-samples rehosting (section 17), or the caller's relay via
  `fetch`.

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
| `W_SOURCE_RETRIED`     | success after retries                          | `attempts`, `statuses`                          |
| `W_SOURCE_VALUE`       | a server value with no dtype                   | `type`, `column`, `as`                          |

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
}
```

---

## 9. Cancellation, progress, limits, retries

- **Cancellation.** `signal` aborts every request, the Bolt session and the write loop; the load
  rejects with the signal's reason everywhere. Measured server side: Neo4j over Bolt stopped 0.5 s
  after the abort; Memgraph ran on (17.6 s), so its source puts a `LIMIT` and, with `timeoutMs`, a
  server timeout on generated queries; the Query API has no cancel call. The docs say so.
- **Progress** counts bytes for a `file` source, items otherwise, with a total only when the
  service gives one. A Cypher count query runs only with `countFirst: true`.
- **Limits.** Every default is "no limit"; `onLimit: "stop"` keeps what came first, warns and
  records `next`. graph-io picks no cap, since the right one depends on the consumer's screen and
  machine; the element exposes the options and the graphty app sets them. Database sources push
  `maxNodes` into the query as a `LIMIT`.
- **Retries.** 3 by default, full-jitter backoff from 500 ms to 30 s, on 429, 502, 503, 504 and
  network errors, for idempotent requests (GET, and POSTs marked `idempotent`), honoring
  `Retry-After` when readable. This is HTTP's own semantics; `retry: false` turns it off.
- **Rate limits.** `descriptor.rateLimit` paces requests (Wikidata: 5 parallel per IP). NDEx showed
  no limit at 40 parallel requests; its source still caps concurrency at 4.

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

---

## 11. Injection and transport safety

- **Parameters only.** Caller values go as query parameters, never spliced. A user query runs as
  written with its `parameters` sent separately; generated queries are fixed text.
- **Identifiers** (Cypher labels, types, keys) cannot be parameters: generated queries check one
  against the descriptor or the service's schema and backtick-quote it, else `E_SOURCE_PARAM`
  (`reason: "identifier"`).
- **SPARQL has no parameters:** the SPARQL source exports escaping term helpers and a tagged
  template that accepts only them.
- **Read-only by default:** Bolt `READ` sessions, the Query API's `accessMode: "Read"`. graph-io
  never parses a query to judge it. `write: true` is a load option and is never recorded.
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

### 12.2 Neo4j over the Query API (`/sources/neo4j`)

`POST /db/{database}/query/v2`, on by default since Neo4j 5.26 and on Aura; no driver.

`Neo4jParams`: `query`; `parameters` (default `{}`); `mode` (default `"query"` with a query, else
`"all"`); `ids` (for `"neighborhood"`); `database` (default `"neo4j"`); `idProperty` (default
none, `elementId`); `countFirst` (default false); `long` (default `"f64"`).

- `Accept: application/vnd.neo4j.query.v1.1` asks for **typed JSON** (section 10).
- Nodes, relationships and paths in any column are flattened (section 5).
- `accessMode: "Read"` unless the load option `write: true`.
- CORS is on by default (`*`), with readable errors (verified on 5.26 and the public demo on
  2026.05); Aura is unverified.
- The response is one JSON document, not a stream (1M rows: 8.9 MB, 2.2 to 2.6 s in a browser), so
  generated queries page by element id with a `LIMIT`; the docs advise a `LIMIT` in user queries.
- The deprecated `/db/{db}/tx` is unsupported; servers before 5.26 use Bolt. `probe` runs
  `CALL dbms.components()`.

### 12.3 Bolt: Neo4j and Memgraph (`/sources/bolt`, `/sources/memgraph`)

Memgraph has no HTTP query API; Bolt is its only protocol (over WebSocket since 2.3, port 7687).
Writing a Bolt client is a large, security-relevant job; the official `neo4j-driver` does it and is
what Memgraph's docs recommend. So the Bolt sources use it as an **optional peer dependency**,
imported dynamically by the Bolt subpath only: 139 KB gzipped (measured) for a consumer who uses
Bolt, nothing for anyone else. Absent: `E_SOURCE_RUNTIME` (`reason: "needs-peer-dependency"`).

- Bolt streams (`subscribe()` delivered batches of `fetchSize` in both runtimes), so it is also the
  streaming path for large Neo4j results.
- **Direct connections by default** (`bolt://`, `bolt+s://`). The routing schemes connect to
  whatever hosts the server's routing table lists, and would send them the credential, so they
  need `routing: true`, with the driver's `resolver` limited to the endpoint's host and the
  credential's `origins`. The `+ssc` schemes accept any certificate and are refused with a
  credential (`reason: "insecure-endpoint"`).
- The driver's lossless `Integer` is converted by section 10's rules, never
  `disableLosslessIntegers`. Sessions are `READ`. Abort uses `executeQuery`'s `signal`; the
  spurious `Request.Invalid` from closing mid-stream is swallowed.
- On https pages the driver uses `wss://`; Neo4j answered on the Bolt port. Memgraph: section 7.2,
  item 15.

`memgraphSource` is `boltSource` with Memgraph's defaults: ids from `id(n)`, its error codes and
its spatial and duration types. `BoltParams`: `query`, `parameters`, `mode`, `ids`, `database`,
`idProperty`, `routing`, and `via` for Memgraph.

### 12.4 AWS Neptune (`/sources/neptune`)

Over HTTPS, no driver:

- **openCypher:** `POST /openCypher` (port 8182), form fields `query` and `parameters`; nodes
  `{ "~id", "~labels", "~properties" }`, relationships add `~start`, `~end`, `~type`.
- **Gremlin:** `POST /gremlin` with `{ gremlin, bindings }`, GraphSON results; generated
  traversals use bindings only. The later Gremlin source for other servers also speaks GraphSON v3
  over WebSocket (verified, about 50 lines), never both against one server.
- **Browser:** only with `via: "relay"` (section 7.2, item 14). **Auth:** SigV4, `neptune-db`.
- **Streamed errors:** an error after the first chunk is appended to the body. Node reads
  `X-Neptune-Status` from trailers; in browsers a 200 body that fails to parse is
  `E_SOURCE_QUERY`, never a partial graph presented as complete.
- SPARQL goes through the later SPARQL source; Neptune Analytics (`neptune-graph`) is a
  `variant: "analytics"` parameter if cheap.

`NeptuneParams`: `language` (`"opencypher"` default or `"gremlin"`), `query`, `parameters`, `mode`,
`ids`, `via`, `variant`.

---

## 13. graphty-element integration

### 13.1 One registry, read by the element

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

### 13.2 Loading

```ts
interface SourceLoadOptions {
    readonly mode?: "replace" | "merge"; // default "replace"
    readonly existing?: "keep" | "update"; // for merge; default "keep"
    readonly credential?: Credential;
    readonly endpoint?: string;
    readonly write?: boolean; // never recorded
    readonly limits?: SourceLimitOptions;
    readonly retry?: RetryOptions | false;
    readonly cursor?: SourceCursor;
    readonly idPrefix?: string;
    readonly signal?: AbortSignal;
}

// On the element, with the same typed overload as graph-io's loadFromSource:
loadFromSource(source: string, params: Record<string, unknown>, options?: SourceLoadOptions): Promise<ImportSummary>;

// Through the session (element.session), one undoable step:
await element.session.data.import(
    { source: "neo4j", config: { query, parameters }, name: "Friends of Ana" },
    { credential: credentials.basic("neo4j", password), endpoint: "https://xxxx.databases.neo4j.io" },
);
```

- `DataSourceInput` gains `source?: string`, exclusive with `type`.
- **The credential is never recorded, and nothing re-fetches without it.** Today an import is a
  command that builds its reader from the recorded input, and redo reads again. A source load
  instead reads outside the command, with the credential, then hands the command the rows it read
  (the path `prepare()` already uses). The command records only
  `{ source, config, endpoint, version, next }`; undo and redo replay the rows and never fetch.
  The credential and `write` are in none of `data.source()`, the undo journal, a project file or
  an event.
- **A project file never runs a query by itself.** Otherwise opening a shared file could run a
  stored query against a database on the reader's machine. Source loads in an opened project wait:
  `data.pendingSourceLoads()` returns `{ id, source, endpoint, hasQuery, isLocalNetwork,
authRequired }[]`, and each runs read-only through `data.runPendingSourceLoad(id, { credential })`.
  Whether to ask the reader first is the application's choice.
- A recorded older `version` is upgraded by `migrateParams`, else refused
  (`reason: "stale-params"`).
- Errors are the element's `GraphtyError` (`./session`), whose `code` (typed to include
  `SourceIssueCode`) and `details` are the issue's. Progress is `data-loading-progress`, with `unit`.

### 13.3 The rest of the source surface

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

---

## 14. Testing without live credentials

1. **Recorded responses** on every pull request: real responses captured once (secrets removed),
   replayed through the `fetch` option, failing on any unrecorded request. Error paths (401, 403,
   404, 429, 503, malformed bodies, cross-host redirects) are recorded or hand-written.
2. **A conformance suite** for every built-in source: the descriptor validates; parameters are
   checked before any request; a sentinel secret never appears in any report, issue, error,
   cursor or serialized output (Bolt included); the global `fetch` is never called; abort rejects
   within a page; a capped load's cursor resumes exactly.
3. **Real databases in containers:** a new `graph-io-sources` CI shard runs the official Neo4j,
   Memgraph and Gremlin Server images plus websockify on pull requests that change
   `graph-io/src/sources/`, in the merge queue and on the release train; locally, Docker or the
   release archives.
4. **Neptune:** recorded responses and AWS's SigV4 test vectors; no live lane is planned.
5. **Live public services** (NDEx, Wikidata): a weekly workflow that files an issue when a
   response shape changes, never gating a pull request.
6. **Browser behavior:** a new graph-io vitest browser project and CI shard test section 7's
   checks against local servers with and without CORS, in Chromium and Firefox, and WebKit on the
   macOS host.

---

## 15. Prior art

- **Cytoscape's NDEx client:** a share URL as a first-class input (adopted); its hand-kept service
  registry decayed.
- **Gephi database import:** fixed `id`, `source`, `target` column names (adopted).
- **Graphistry:** every connector ends in nodes and edges tables (adopted: a sink), but connectors
  are methods on one class, so a third party cannot add one on equal terms.
- **KeyLines, ReGraph:** no connectors; merge and expand by stable id (adopted), but every customer
  writes the integration this design removes.
- **TinkerPop drivers:** bindings against injection (adopted). **LlamaIndex, LangChain graph
  stores:** depth-aware neighbor calls and capability flags (adopted: `expand`, `features`).

---

## 16. Other online sources, ranked

By how much graphty's personas would want each against the effort; "Browser" is CORS, checked
2026-10-17 unless marked.

| Rank | Source                                     | Browser                     | Effort |
| ---- | ------------------------------------------ | --------------------------- | ------ |
| 1    | Generic SPARQL (Wikidata, any RDF store)   | yes, no auth header         | medium |
| 2    | STRING protein interactions                | yes                         | low    |
| 3    | Generic REST mapping (JMESPath)            | per service                 | medium |
| 4    | OpenAlex citations and co-authorship       | yes                         | low    |
| 5    | File host (any URL, GitHub raw, zip)       | yes, common hosts           | low    |
| 6    | deps.dev dependency graphs                 | yes, no key                 | low    |
| 7    | Gremlin servers (JanusGraph, TinkerPop)    | WebSocket                   | low    |
| 8    | Netzschleuder                              | no: Node only               | low    |
| 9    | GraphQL                                    | per service                 | medium |
| 10   | ArangoDB                                   | with a trusted origin set   | low    |
| 11   | BioGRID, Semantic Scholar (own keys)       | Semantic Scholar keyless no | low    |
| 12   | Overpass (OpenStreetMap)                   | yes, flaky                  | medium |
| 13   | Dgraph, TigerGraph, NebulaGraph, Cosmos DB | unverified                  | medium |
| --   | SNAP, KONECT archives                      | no                          | rehost |

SPARQL serves knowledge engineering and every RDF store with one source; STRING and OpenAlex serve
bioinformatics and research with keyless CORS APIs; the file host and deps.dev are nearly free.
Recommendation: after the initial four, **generic SPARQL** with a Wikidata preset (its limits
declared), then **STRING**, **OpenAlex**, the **file host** and **deps.dev**, and selected SNAP and
Netzschleuder datasets through graph-samples hosting. STRING or deps.dev goes early: none of the
initial four uses the `records` path third parties will use.

---

## 17. graph-samples' dataset downloads

`fetchDataset(name, { baseUrl, fetch, signal })` downloads a wire file from graphty.app. It needs
no importer, auth, paging or query, from a fixed trusted host; folding it into the registry would
make graph-samples depend on graph-io for nothing. Decision: **two mechanisms, one catalogue.**
graphty-element, which depends on both, registers a `graph-samples` source built with the public
`defineSource`, so its catalogue lists datasets and sources together and the dataset source is the
dogfood third-party source. It maps `fetchDataset`'s plain `Error` to `E_FETCH` /
`E_SOURCE_NOT_FOUND`; graph-samples adopting codes is a separate additive change.

---

## 18. Live and changing sources

Out of scope. A load ends in one frozen snapshot, while a live source emits changes, including
removals, to an existing graph. A later design would add an optional
`watch(params, ctx): AsyncIterable<GraphChange>` keyed by section 5.1's stable ids and applied by
the element. Nothing here blocks it. Polling is a reload the application schedules.

---

## 19. Decisions for the owner

Everything else here is additive API. These publish contracts that are hard to change later:

1. **The source contract** (`GraphSource`, its methods, `SourceContext`), which third parties will
   implement. Recommendation: ship it experimental, and freeze it only after the four initial
   sources AND one built-in `records` source (STRING or deps.dev) are built on it.
2. **How a source load is persisted:** `{ source, config, endpoint, version, next }` in
   `data.source()` and project files, a field separate from a format's `type`; never the credential
   or `write`; opening a project never runs a load by itself. Project files outlive releases, so
   this is a data format. Recommendation: this shape, and no URL scheme (`ndex://`) until shareable
   links are needed.
3. **`neo4j-driver` as an optional peer dependency of graph-io**, loaded only by the Bolt subpath
   (139 KB gzipped, only for Bolt users). Without it Memgraph is unsupported and Neo4j before 5.26
   unreachable. Recommendation: the optional peer.
4. **Source ids as public names:** `ndex`, `neo4j`, `bolt`, `memgraph`, `neptune`, later `sparql`,
   in a name space separate from formats, so the `neo4j` source and CSV format coexist.
   Recommendation: these ids, one per service, except `bolt`, which serves several.

---

## Appendix A. Sub-issues (drafted, not filed)

One framework issue, one per initial source, one per further source. All carry `enhancement`, a
priority and an effort, and say `Refs #2907`.

**A.1 graph-io and graphty-element: network source framework** (`priority:high`, `effort:high`).

> Sections 2 to 11, 13 and 14 of `design/graph-io/network-sources-design.md`: graph-format's record
> methods made permanent; the contract types, `defineSource`, `registerSource`, lazy sources and
> the load functions, marked experimental; `credentials` with origin binding, the TLS and redirect
> rules; the guarded `ctx.fetch` with retries, caps, progress, pre-request checks and the
> blocked-request classification; `ImportIssue.params`, the typed codes, `ImportReport.source`.
> graphty-element: re-exports, `sourceDescriptors()`, a streaming `fromSource`, the `source` input
> field, loads that read outside the command and record no secret, pending loads on project open,
> the `existing` choice, `testSource`, `listSource`, `expand`, `more`, the bundle. Tests: replay,
> conformance, a graph-io browser project and CI shard. Docs: "Loading from a service" and
> "Writing a source", passing the blind-author test against the published types. Done when a
> third party's 15-line source loads in graphty-element from the bundle with no other code.

**A.2 graph-io: NDEx source** (`priority:high`, `effort:medium`; after A.1).

> Section 12.1: CX2 download, `parseShareUrl`, summary checked against the caps, v2 search, CX1
> neighborhood `expand`. Check Keycloak tokens and Safari.

**A.3 graph-io: Neo4j source over the HTTP Query API** (`priority:high`, `effort:medium`; after
A.1).

> Section 12.2: query, all, neighborhood and `expand`, typed JSON, read mode, `LIMIT` from caps.
> Container tests on 5.26 and the latest release. Check Aura's CORS.

**A.4 graph-io: Bolt source for Neo4j and Memgraph** (`priority:medium`, `effort:medium`; after
A.1 and the owner's answer on `neo4j-driver`).

> Section 12.3: optional peer, streaming, direct connections by default, retry time bounded,
> Memgraph's `tls-proxy` with recipes. The `graph-io-sources` container shard.

**A.5 graph-io: AWS Neptune source** (`priority:medium`, `effort:medium`; after A.1).

> Section 12.4: openCypher and Gremlin over HTTPS, SigV4 against AWS's test suite, streamed
> errors, `via: "relay"`. Recorded responses only.

**A.6 to A.11** (`priority:low`, after A.1, section 16): generic SPARQL with a Wikidata preset
(`effort:medium`); STRING (`effort:low`, before the contract freezes); OpenAlex (`effort:low`); a
file-host source with zip (`effort:low`); deps.dev (`effort:low`); graph-samples hosting of
selected SNAP and Netzschleuder datasets after a license review (`effort:medium`).
