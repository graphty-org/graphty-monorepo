# Writing a source

::: warning Experimental
Network sources are experimental: the contract on this page may still change before it is frozen.
:::

A network source turns parameters into a graph over the network: a REST endpoint, a database, a
repository of networks. You write a plain object with an `id` and one read method; graph-io does the
rest: it sends your requests through a guarded `fetch` that handles authentication, redirects,
retries, cancellation, size caps and progress, and turns every failure into a coded error.

There are three read methods, simplest first. A source has exactly one of them:

| Method    | Return                                                      | Use it when                                    |
| --------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `records` | `{ nodes, edges }`, or an async iterable of such pages      | the service answers with JSON records          |
| `file`    | `{ body, format? }`: a graph file the format importers read | the service hands you a GraphML, CX2, CSV file |
| `import`  | an import report, after writing into the sink yourself      | you need typed columns or full control         |

## A first source

`GET /api/people.json?team=core` answers `[{ "id": "ana", "name": "Ana", "knows": ["bo"] }, ...]`:

<!-- generated:begin example:sources/first-source -->

```ts
import { defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    async records(params: { team: string }, ctx) {
        const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
            `/api/people.json?team=${encodeURIComponent(params.team)}`,
        );
        return {
            nodes: rows.map((r) => ({ id: r.id, name: r.name })),
            edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
        };
    },
});

registerSource(people);
const { snapshot, format } = await loadFromSource("people", { team: "core" }, { endpoint: "https://example.com" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/first-source -->

```text
source:people: 5 nodes, 5 edges
```

<!-- generated:end -->

- `ctx.fetchJson()` resolves the URL against the `endpoint` you pass when loading, and fails with a
  coded error when the answer is not JSON. Never call the global `fetch` in a source: `ctx.fetch`
  is what applies the credential, the caps and the retries.
- An edge to a node you did not list adds that node (here `eve`).
- `result.format` is `"source:<id>"`.

## Authentication

A credential is an option of the load, never part of the source or its parameters, so a source
never sees a secret and code that stores parameters (a project file, an undo history) cannot leak
one:

<!-- generated:begin example:sources/with-token -->

```ts
import { credentials, defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

registerSource(
    defineSource({
        id: "people",
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string; knows: string[] }[]>(`/api/people.json?team=${params.team}`);
            return { edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))) };
        },
    }),
);

// the token goes only to https://example.com, never to another host, a redirect or plain http
const { snapshot, report } = await loadFromSource(
    "people",
    { team: "core" },
    { endpoint: "https://example.com", credential: credentials.bearer("my-token") },
);
console.log(`${snapshot.edgeCount} edges in ${report.source?.requests} request`);
console.log(JSON.stringify(credentials.bearer("my-token"))); // the secret is never shown
```

<!-- generated:end -->

<!-- generated:begin output:sources/with-token -->

```text
5 edges in 1 request
{"kind":"bearer","origins":[]}
```

<!-- generated:end -->

`credentials` has `bearer(token)` (a string, or a function returning a fresh token per request),
`basic(user, password)`, `apiKey({ header } | { query }, key)`, `awsSigV4(...)` and
`custom(apply, kind)`. Each takes an optional `{ origins }`; without it the credential goes only to
the endpoint's origin. graph-io also:

- never sends a credential over plain `http:` except to this machine (`localhost`), unless you pass
  `allowInsecure: true`;
- never follows a redirect to another origin while a credential is attached (`E_SOURCE_REDIRECT`);
- sends credentialed requests with `cache: "no-store"` and without cookies;
- refuses a URL with a user name or password in it (`E_SOURCE_PARAM`, `reason: "credentials-in-url"`).

A credential used in a browser is still visible to the reader and to every script on the page.
Only the reader's own credentials belong there.

## Paging

Return an async iterable; each page is written as it arrives. Page from a cursor in the body: a
browser cannot read a `Link` header from another origin unless the service exposes it.

<!-- generated:begin example:sources/paging -->

```ts
import { defineSource, loadFromSource, replayFetch } from "@graphty/graph-io";

type LinkPage = { links: { from: number; to: number }[]; next: string | null };

const links = defineSource({
    id: "issue-links",
    async *records(params: { repo: string }, ctx) {
        let url: string | null = `/repos/${encodeURIComponent(params.repo)}/links`;
        while (url !== null) {
            const page: LinkPage = await ctx.fetchJson<LinkPage>(url);
            yield { edges: page.links.map((l) => ({ source: l.from, target: l.to })) };
            url = page.next;
        }
    },
});

// recorded answers stand in for the service
const fetch = replayFetch([
    {
        url: "https://tracker.example.com/repos/core/links",
        body: { links: [{ from: 1, to: 2 }], next: "/repos/core/links?page=2" },
    },
    { url: "https://tracker.example.com/repos/core/links?page=2", body: { links: [{ from: 2, to: 3 }], next: null } },
]);
const { snapshot } = await loadFromSource(links, { repo: "core" }, { endpoint: "https://tracker.example.com", fetch });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges from ${fetch.calls.length} pages`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/paging -->

```text
3 nodes, 2 edges from 2 pages
```

<!-- generated:end -->

To let a capped load continue later, give each page a `next` cursor (any JSON object of strings,
numbers, booleans and nulls) and start from `ctx.cursor` when there is one. graph-io stops between
pages when `limits.maxNodes`, `maxEdges`, `maxBytes` or `maxRequests` is reached, warns
`W_SOURCE_LIMIT`, and hands the last page's `next` back as `report.source.next`.

## The advanced path: writing into the sink

For typed columns, direction and full control of the report, implement `import()`, the contract a
format importer implements. `ctx.limits.reached()` tells you when a cap is reached, and
`ctx.finish({ next })` records where to continue:

<!-- generated:begin example:sources/advanced -->

```ts
import { defineSource, loadFromSource, replayFetch, throwIfAborted } from "@graphty/graph-io";

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

const fetch = replayFetch([
    {
        url: "https://flights.example.com/api/routes?airline=GA&page=0",
        body: { routes: [{ from: "AMS", to: "LHR", km: 371 }], done: 1, total: 2, last: false },
    },
    {
        url: "https://flights.example.com/api/routes?airline=GA&page=1",
        body: { routes: [{ from: "LHR", to: "JFK", km: 5540 }], done: 2, total: 2, last: true },
    },
]);

// a cap stops after the first page and says where to continue
const first = await loadFromSource(flights, { airline: "GA" }, { fetch, limits: { maxEdges: 1 } });
console.log(`first: ${first.snapshot.edgeCount} edge, ${first.report.issues[0]?.code}`);
const rest = await loadFromSource(flights, { airline: "GA" }, { fetch, cursor: first.report.source?.next });
console.log(`rest: ${rest.snapshot.edgeCount} edge, next ${JSON.stringify(rest.report.source?.next)}`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/advanced -->

```text
first: 1 edge, W_SOURCE_LIMIT
rest: 1 edge, next null
```

<!-- generated:end -->

## Describing your source for a form

The optional `descriptor` is data an application draws a form from: `plainName`, `params` (each
with a `name`, `plainName`, `type` and optionally `required`, `default`, `min`, `max`, `values`),
`defaultEndpoint`, `auth` (the credential kinds it takes) and `samples`. graph-io checks the
parameters against it before sending any request: a missing required parameter, a number out of
range or an unknown enum value fails with `E_SOURCE_PARAM` and `params: { name, reason }`.

Bump `descriptor.version` when your parameters or cursors change shape: a cursor from another
version is refused (`reason: "stale-cursor"`).

Every union in these types (`SourceKind`, `SourceParamType`, `SourceFeature`, ...) is open: a later
release may add values, so handle values you do not know.

## Errors

Every failure is an `ImportError` whose `issue.code` is one of `SOURCE_ISSUE` and whose
`issue.params` holds its values. graph-io writes no sentence for a reader; the English `message` is
for logs.

<!-- generated:begin example:sources/errors -->

```ts
import { defineSource, ImportError, loadFromSource, replayFetch } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    records: (params: { team: string }, ctx) => ctx.fetchJson(`/api/people?team=${params.team}`),
});

const fetch = replayFetch([{ url: "https://example.com/api/people?team=core", status: 401 }]);
try {
    await loadFromSource(people, { team: "core" }, { endpoint: "https://example.com", fetch });
} catch (err) {
    if (err instanceof ImportError) {
        // a code and its values, never a sentence: the application writes its own words
        console.log(err.issue?.code, err.issue?.params);
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:sources/errors -->

```text
E_SOURCE_AUTH {
  origin: 'https://example.com',
  status: 401,
  scheme: null,
  serverCode: null
}
```

<!-- generated:end -->

| Code                   | When                                           | `params`                                                  |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `E_FETCH`              | another status, or an unreachable host         | `url`, `status`                                           |
| `E_SOURCE_BLOCKED`     | refused by the browser, cause hidden           | `url`, `cause`                                            |
| `E_SOURCE_AUTH`        | 401 or a database login failure                | `origin`, `status`, `scheme`, `serverCode`                |
| `E_SOURCE_FORBIDDEN`   | 403 or a database authorization failure        | `origin`, `status`, `serverCode`                          |
| `E_SOURCE_NOT_FOUND`   | the named item does not exist                  | `origin`, `what`, `value`                                 |
| `E_SOURCE_QUOTA`       | 429 after retries                              | `origin`, `retryAfterMs`                                  |
| `E_SOURCE_TIMEOUT`     | `limits.timeoutMs`, or the server's own        | `origin`, `timeoutMs`, `serverSide`                       |
| `E_SOURCE_QUERY`       | the server rejected the query                  | `origin`, `serverCode`, `line`, `column`, `serverMessage` |
| `E_SOURCE_NOT_A_GRAPH` | no node, relationship or path in the result    | `columns`                                                 |
| `E_SOURCE_RESPONSE`    | a body of the wrong shape                      | `origin`, `expected`, `contentType`                       |
| `E_SOURCE_REDIRECT`    | a redirect or changed origin with a credential | `from`, `to`                                              |
| `E_SOURCE_RUNTIME`     | cannot run in this runtime                     | `runtime`, `reason`, `package`                            |
| `E_SOURCE_PARAM`       | a parameter or option is invalid               | `name`, `reason`                                          |
| `E_SOURCE_LIMIT`       | a cap under `onLimit: "error"`                 | `limit`, `value`                                          |
| `E_SOURCE_UNKNOWN`     | no source of that id                           | `id`, `known`                                             |
| `E_SOURCE_UNSUPPORTED` | the source lacks the feature                   | `feature`, `needs`                                        |
| `E_SOURCE_INVALID`     | a malformed source at registration             | `id`, `reason`                                            |
| `W_SOURCE_LIMIT`       | a cap stopped the load                         | `limit`, `value`                                          |
| `W_SOURCE_AUTH`        | a later page needs a credential; pages kept    | `origin`, `status`                                        |
| `W_SOURCE_RETRIED`     | success after retries                          | `attempts`, `statuses`                                    |
| `W_SOURCE_VALUE`       | a server value with no type                    | `type`, `column`, `as`                                    |

URLs in `params` are origin and path only: a key in a query string never reaches a report.

## Testing a source

`replayFetch(recordings)` is a `fetch` that answers from recorded responses and fails on any
request it has no recording for, so a test never touches the network. A recording can require that
a credential was, or was not, sent, without comparing its value. Pass it as the `fetch` option:

<!-- generated:begin example:sources/testing -->

```ts
import { credentials, defineSource, loadFromSource, replayFetch } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    records: async (params: { team: string }, ctx) => ({
        nodes: await ctx.fetchJson<{ id: string }[]>(`/api/people?team=${params.team}`),
    }),
});

// a recording answers only a request that carries a credential; any other request fails the test
const fetch = replayFetch([
    { url: "https://example.com/api/people?team=core", credential: true, body: [{ id: "ana" }] },
]);
const { snapshot } = await loadFromSource(
    people,
    { team: "core" },
    { endpoint: "https://example.com", credential: credentials.basic("me", "secret"), fetch },
);
console.log(`${snapshot.nodeCount} node`, fetch.calls);
```

<!-- generated:end -->

<!-- generated:begin output:sources/testing -->

```text
1 node [
  {
    method: 'GET',
    url: 'https://example.com/api/people',
    credential: true
  }
]
```

<!-- generated:end -->

`recordingFrom(request, response)` turns a real exchange into a recording without its headers or
the query parameters you name as secret.

## Registering

`registerSource(source)` adds it to the default registry, so `loadFromSource("people", ...)` and
graphty-element's `data-source="people"` find it by id. Source ids are lowercase letters, digits and
dashes, in their own name space apart from format names. To keep your source's code out of a page
until it is used, register a lazy source: `registerSource({ id, descriptor, load: () =>
import("./my-source.js").then((m) => m.mySource) })`. `listSources()` lists every source with its
descriptor without loading any source code.
