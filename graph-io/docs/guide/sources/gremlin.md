# Gremlin: TinkerPop, JanusGraph and Neptune

::: warning Experimental
Network sources are experimental: the source id `gremlin`, its parameters and the facts it writes may
still change.
:::

The `gremlin` source reads a graph database that speaks Apache TinkerPop's Gremlin: Gremlin Server,
JanusGraph and Amazon Neptune's Gremlin endpoint. You write a Gremlin script; every vertex, edge and
path it returns becomes the graph.

It is not one of the sources graph-io registers for you. Import it from its own entry and pass it to
the load functions, or register it once:

```ts
import { loadFromSource, registerSource } from "@graphty/graph-io";
import { gremlinSource } from "@graphty/graph-io/sources/gremlin";

const endpoint = "wss://gremlin.example.com:8182/gremlin";

// the people marko knows, and how
const { snapshot } = await loadFromSource(gremlinSource, { query: "g.V(1).outE('knows').inV().path()" }, { endpoint });
console.log(`${snapshot.nodeCount} vertices, ${snapshot.edgeCount} edges`);

// or register it, and use its id like any other source
registerSource(gremlinSource);
await loadFromSource("gremlin", { mode: "neighborhood", ids: [1], depth: 2 }, { endpoint });
```

## HTTP or WebSocket

The endpoint's scheme picks how the script travels:

| Endpoint                                   | How                                                 | Credentials                                     |
| ------------------------------------------ | --------------------------------------------------- | ----------------------------------------------- |
| `https://host:8182/gremlin` (or `http://`) | one `POST` per script, GraphSON 3 back              | `credentials.basic`, `credentials.awsSigV4`     |
| `wss://host:8182/gremlin` (or `ws://`)     | the Gremlin WebSocket protocol, GraphSON 3 messages | `credentials.basic`, sent as a SASL PLAIN login |

Gremlin Server accepts scripts on any path; Neptune needs `/gremlin`.

- **In a browser, use `wss://` when there is a login.** Gremlin Server answers every CORS preflight
  with 405, and a request carrying a credential header always needs one, so a credential over HTTP is
  refused before any request (`E_SOURCE_RUNTIME`, `reason: "cors"`). A request without a credential
  is sent with no headers that need a preflight. The WebSocket logs in inside its own protocol, which
  a page can do.
- **Amazon Neptune:** over HTTP from Node, with `credentials.awsSigV4({ region, credentials })` when
  IAM authentication is on. Neptune sends no CORS headers, so a page cannot reach it over HTTP, and a
  page cannot sign a WebSocket. Neptune's HTTP endpoint ignores `bindings`, so on Neptune over HTTP
  only a `query` that needs no bindings works; mode `"neighborhood"` and expanding send their seed
  ids as bindings.
- **Node** has a global `WebSocket` from version 22; on an older Node a `ws:` or `wss:` endpoint is
  `E_SOURCE_RUNTIME` with `reason: "needs-websocket"`.
- A credential goes only to the endpoint's origin, and never without TLS (`http:` or `ws:`) unless
  the host is this machine or you pass `allowInsecure: true`.

## Parameters

| Parameter         | What it is                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `query`           | a Gremlin script (`g.V().hasLabel('person').limit(100)`)                                                                         |
| `bindings`        | the script's bindings, sent separately from it (`{ name: "marko" }` for `g.V().has('name', name)`)                               |
| `mode`            | `"query"` (the default when there is a query), `"all"` (every vertex, then every edge, paged) or `"neighborhood"` (around `ids`) |
| `ids`             | the seed vertex ids of `"neighborhood"`, strings or numbers as the database has them                                             |
| `depth`           | hops of `"neighborhood"`, 1 to 10, default 1                                                                                     |
| `pageSize`        | elements per page of `"all"`, and paths read by `"neighborhood"`, 1 to 100000, default 1000                                      |
| `traversalSource` | the traversal source on the server that scripts run against, in place of `g`                                                     |

A script runs as written, once; put a `limit()` in it. Mode `"all"` reads
`g.V().range(a, b).elementMap()` page by page, then the same for `g.E()`; with a cap (`maxNodes`) it
stops after the page that reaches it, and `report.source.next` is the cursor to pass as `cursor` to
load the rest. The pages follow the server's own order, which is stable while the graph does not
change.

## How results become a graph

Every vertex, edge and path in the answer is read, at any depth: in a list, a map, or a path. So are
the maps of `elementMap()` and `valueMap(true)`.

| Gremlin                                     | Becomes                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| a vertex                                    | a node; its id is the vertex id, its label is in `labels`, its properties are attributes |
| a vertex property with several values       | a list attribute                                                                         |
| an edge                                     | a directed edge from its out vertex to its in vertex; label in `type`, id in `id`        |
| an edge whose ends the result does not hold | the edge, and a node for each end, known by its id and label                             |
| a number, string or other value alone       | nothing; a script that returns only such values is `E_SOURCE_NOT_A_GRAPH`                |

Numeric vertex ids stay numbers, so the ids of a loaded graph can be passed back as `ids` or
expanded. GraphSON sends 64-bit integers as JSON numbers, so a value above 2^53 is already rounded
when it arrives.

## Expanding

`expandFromSource(gremlinSource, { params, ids, depth, direction, limit, relationshipTypes })` reads
the paths of up to `depth` hops from the seeds, in `direction` (`"out"`, `"in"` or `"both"`), over
edges whose label is in `relationshipTypes` when it is given, at most `limit` paths (default 500).

## Writes and what is enforced

A Gremlin request carries no read-only switch, and graph-io does not parse your script to judge it:
a script that changes the graph changes it, with the credential you give. The scripts graph-io
writes itself (`"all"`, `"neighborhood"`, expanding) only read. To have the server refuse writes,
its owner configures a read-only traversal source (on Gremlin Server, a global such as
`ro = g.withStrategies(ReadOnlyStrategy)` in the init script), and you name it in `traversalSource`;
on Neptune, point the endpoint at the cluster's reader endpoint. `probeSource` reports
`server.readOnly: "not-enforced"`, since it cannot see what the traversal source does.

Your values travel only as `bindings`; graph-io writes the seed ids and edge labels of the scripts
it generates as bindings too, and `depth`, `pageSize` and `limit` as checked integers.

## No public examples

There is no public Gremlin server to offer as an example: TinkerPop's own documentation uses a
server you run yourself with its toy graphs, and Neptune is reachable only from its own network or
with IAM. The source's descriptor lists no `examples`.

## Errors

| Code                          | When                                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_SOURCE_PARAM`              | no endpoint, or a scheme other than http(s) or ws(s) (`name: "endpoint"`); missing `ids` or `query`; a `traversalSource` that is not an identifier; over a WebSocket, a credential that is not `basic` (`reason: "kind"`) |
| `E_SOURCE_AUTH`               | the server refused the login (HTTP 401, or the WebSocket's 401 or an unanswered 407)                                                                                                                                      |
| `E_SOURCE_FORBIDDEN`          | the server refused the script (403)                                                                                                                                                                                       |
| `E_SOURCE_QUERY`              | the server could not run the script; `serverCode` is its exception class or code; `serverMessage` holds its message for a client error, never for a server fault                                                          |
| `E_SOURCE_TIMEOUT`            | the server's own evaluation timeout                                                                                                                                                                                       |
| `E_SOURCE_NOT_A_GRAPH`        | the script returned values but no vertex, edge or path                                                                                                                                                                    |
| `E_SOURCE_RESPONSE`           | the HTTP answer was not GraphSON                                                                                                                                                                                          |
| `E_SOURCE_RUNTIME`            | a credential over HTTP in a browser (`reason: "cors"`), a plain `ws:` from an https page, no `WebSocket` in this runtime                                                                                                  |
| `E_FETCH`, `E_SOURCE_BLOCKED` | the server could not be reached, or the WebSocket closed before answering                                                                                                                                                 |
