# REST APIs and OpenAlex

::: warning Experimental
The REST mapping format and the `rest` and `openalex` sources are experimental: names and shapes on
this page may still change. A mapping carries `version: 1`.
:::

Many web APIs return graph data spread over several requests: a list of records, a field that names
other records (`"knows": ["bo"]`, `referenced_works`), nested records that are nodes themselves (the
authors of a paper), and a cursor to the next page. A **REST mapping** says how to read such an API
as plain JSON data, so a graph loads with no code:

- `requests`: named requests, each a path and query templates, the selector of its records, the
  entity they are, and how it pages
- `entities`: how each kind of record becomes a node (its id, its fields) and which edges it makes
- `load`: the request a load runs; `expand` and `hydrate`: the requests an expansion runs

`restSource(mapping, { id })` turns a mapping into a source you register, and the built-in `rest`
source takes the mapping as a parameter: `loadFromSource("rest", { mapping, ...values })`. Both come
from `@graphty/graph-io/sources/rest`; `loadFromSource("rest", ...)` and
`loadFromSource("openalex", ...)` also work from the root without importing it.

## A first mapping

<!-- generated:begin example:sources/rest-mapping -->

```ts
import { loadFromSource, registerSource, replayFetch } from "@graphty/graph-io";
import { type RestMapping, restSource } from "@graphty/graph-io/sources/rest";

// GET /teams/{team}/people?offset=0&limit=2 answers { "items": [{ "id", "name", "knows": [...] }] }
const mapping: RestMapping = {
    version: 1,
    endpoint: "https://people.example.com",
    load: "people",
    requests: {
        people: {
            path: "/teams/{team}/people",
            records: "items",
            entity: "person",
            paging: { style: "offset", param: "offset", size: { param: "limit", value: 2 } },
        },
    },
    entities: {
        person: { id: "id", fields: { name: "name" }, edges: [{ to: "knows[]", type: "knows", entity: "person" }] },
    },
};
registerSource(restSource(mapping, { id: "people", plainName: "People" }));

// recorded answers stand in for the service
const fetch = replayFetch([
    {
        url: "https://people.example.com/teams/core/people?offset=0&limit=2",
        body: {
            items: [
                { id: "ana", name: "Ana", knows: ["bo"] },
                { id: "bo", name: "Bo", knows: ["cy"] },
            ],
        },
    },
    { url: "https://people.example.com/teams/core/people?offset=2&limit=2", body: { items: [] } },
]);
const { snapshot } = await loadFromSource("people", { team: "core" }, { fetch });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges from ${fetch.calls.length} pages`);
// cy is known only as the end of an edge: a stub, until it is fetched
console.log(snapshot.nodes.value("_source.stub", snapshot.ids.requireIndex("cy")));
```

<!-- generated:end -->

<!-- generated:begin output:sources/rest-mapping -->

```text
3 nodes, 2 edges from 2 pages
true
```

<!-- generated:end -->

## Selectors

A selector is a dotted path into a record, with `[]` to step into every element of an array:

| Selector                  | Reaches                                    |
| ------------------------- | ------------------------------------------ |
| `results`                 | the `results` array (a request's records)  |
| `meta.next_cursor`        | one nested value                           |
| `referenced_works[]`      | every element of an array                  |
| `authorships[].author.id` | a field of every element                   |
| `.`                       | the record itself (or the whole body)      |
| `#`                       | the record's position in its array (an id) |

A missing key reaches nothing. A request's `records` selector that reaches an array gives one record
per element; anything else is one record.

## Templates

`{name}` in a path, a query value or a string in a POST body takes the parameter of that name. An
expansion's requests also get `{ids}` (the seed ids, at most `batch.max` per request, joined by
`batch.join`) and `{id}` (the first of them). Every value is encoded for where it goes: a value
cannot add a path segment or a query parameter, and a value of `.` or `..` in a path is refused.
Every request must stay on the mapping's `endpoint`, origin and path, and so must every next-page
URL a response names; anything else fails with `E_SOURCE_PARAM` and `reason: "origin"`.

## Records, edges and stubs

Each record of an entity becomes a node: its `id` (with `stripPrefix` removed), `labels: [entity]`
(or the entity's `label`), and its `fields` (attribute name to selector), or every top-level value
when `fields` is absent. An entity with `node: false` is a container: only its edge rules and
embedded records count, for a body that holds a node array and an edge array.

| Edge rule                    | Makes                                                         |
| ---------------------------- | ------------------------------------------------------------- |
| `{ to, type }`               | an edge from the record to every id `to` reaches              |
| `{ each, from, to, type }`   | for each element `each` reaches, an edge from `from` to `to`  |
| `{ pairs, type }`            | an edge between every two ids `pairs` reaches (co-authorship) |
| `entity`, `fields` on a rule | the target's entity, and attributes of the edge               |

Each edge has a `type` attribute. An id loses the `stripPrefix` of its entity: a target the rule's `entity`'s, a `from` the record's own, a pair the rule's `entity`'s (else the record's). `embedded: [{ at, entity }]` turns nested records into nodes of
their own entity, with that entity's edge rules.

An edge to an id with no record yet makes a **stub**: a node with only its id, `_source.stub: true`
and `_source.entity`. A later record of the same id replaces it (and sets `_source.stub` to false);
a stub never overwrites a full record. An expansion never writes a stub for one of its seeds or for
an id in its `exclude` list.

## Paging

| `paging`                                                    | Next page                                    |
| ----------------------------------------------------------- | -------------------------------------------- |
| `{ style: "cursor", param, first, next }`                   | the value at the `next` selector of the body |
| `{ style: "offset", param, size: { param, value }, unit? }` | the offset plus a page; a short page is last |
| `{ style: "link-header", rel? }`                            | the `Link` header's `rel="next"` URL         |
| `{ style: "next-url", next }`                               | the URL at the `next` selector of the body   |

A browser reads a `Link` header only when the service lists it in `Access-Control-Expose-Headers`.
When it cannot read one, the load fails with `E_SOURCE_RESPONSE` and `expected: "link-header"`
rather than loading a single page as if it were all.

Caps (`limits`) apply between pages, and `report.source.next` says where a capped load stopped; pass
it back as `cursor` to continue. When a later page answers 401 or 403, the load keeps the pages it
has, warns `W_SOURCE_AUTH` with the `origin` that asked, and gives `report.source.next`, so you can
ask for a key and continue.

## Expanding and hydrating

`expandFromSource(source, { params, ids, depth, direction, limit })` runs the mapping's `expand`
request (or `expand.in` and `expand.out`, by `direction`) with the seeds in `{ids}`, breadth first
to `depth`; the nodes one hop adds are the seeds of the next. `limit` caps the new nodes (warning
`W_SOURCE_LIMIT`), and a capped first hop gives `report.source.next` to continue from.
`relationshipTypes` keeps only edges of those types. A depth of 0 **hydrates**: it runs the
`hydrate` request for the seeds, fetching the full records of stubs.

## Rate limits, budgets and keys

`rateLimit: { requests, perMs }` spaces the requests. `budgetHeaders: { remaining, reset }` names
the response headers that say what a metered service has left; when they are readable,
`report.source.budget` is `{ remaining, resetMs }`, and what to do near zero is yours to decide.

`auth` tells a form what to ask for (`{ kind: "bearer" }`, or `{ kind: "api-key", query }` or
`header`). The credential itself is a load option, as for every source, and goes only to the
mapping's origin; with the generic `rest` source, pass the mapping's endpoint as `endpoint` so the
credential is bound to it.

## Checking a mapping

`checkRestMapping(mapping)` checks a mapping without running it and returns one issue per problem,
`{ code, at }`: `at` is where (`requests.citing.paging.next`), `code` is what (`version`,
`endpoint`, `missing`, `unknown-request`, `unknown-entity`, `selector`, `template`, `paging`,
`batch`, `number`). A load with a bad mapping fails before any request with `E_SOURCE_PARAM`,
`params: { name: "mapping", reason: <code>, at }`; `restSource` refuses one with `E_SOURCE_INVALID`.

## Freshness

`validateSource(source, params, seen)` sends the load's first request again with the `ETag` and
`Last-Modified` recorded in `report.source.validators`: a 304 or the same `ETag` is `current`.
When the mapping names a `modified` selector, the newest value the load read is recorded as
`validators.modified`, and a newer one now is `changed`.

## Samples

The `rest` source's descriptor lists two samples, each with its mapping in its params
(`listSources()` shows them):

| Sample             | What it loads                                                              | Nodes / edges |
| ------------------ | -------------------------------------------------------------------------- | ------------- |
| `string-tp53`      | STRING: the functional partners of the protein TP53 (`STRING_MAPPING`)     | 21 / 113      |
| `deps-dev-webpack` | deps.dev: the resolved dependencies of webpack 5.90.0 (`DEPS_DEV_MAPPING`) | 84 / 121      |

## OpenAlex

[OpenAlex](https://openalex.org) is an open index of scholarly works, authors, institutions and
topics. The `openalex` source reads it from Node or a browser:

| Param     | What it does                                                                         |
| --------- | ------------------------------------------------------------------------------------ |
| `work`    | the seed work, `W2112090702` (or its `https://openalex.org/` URL)                    |
| `author`  | the seed author, `A5055156518`, instead of a work                                    |
| `graph`   | `"citation"` (default: works and their references) or `"coauthorship"` (authors)     |
| `include` | any of `"authors"`, `"institutions"`, `"topics"`: more kinds of nodes (default none) |

A citation load reads the seed work, then the works citing it, 200 a page; every work a loaded work
cites is a `cites` edge, to a stub until it is hydrated or expanded. Expanding a work fetches the
works citing it (`direction: "in"`) and its own record with its references (`"out"`). A
co-authorship load reads an author's works and joins every two of their authors with a `coauthor`
edge; expanding an author reads their works.

Without a key, OpenAlex answers the first page of a list and refuses the next with 401, so a load
keeps the first page and warns `W_SOURCE_AUTH`. A free key from OpenAlex continues it:

<!-- generated:begin example:sources/openalex -->

```ts
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
```

<!-- generated:end -->

<!-- generated:begin output:sources/openalex -->

```text
2 [ 'W_SOURCE_AUTH' ]
2 null
E_SOURCE_PARAM { name: 'work', reason: 'format' }
```

<!-- generated:end -->

`OPENALEX_MAPPING` is the citation mapping the source runs, with its rules for authors,
institutions and topics; the source fills `{ids}` and `{select}` from its params and leaves out
the rules for what is not included. OpenAlex lists its rate-limit headers for pages to read, so
`report.source.budget` holds what is left of the day's budget in browsers too. Freshness is the
newest `updated_date` of the seed and the first page of citing works.
