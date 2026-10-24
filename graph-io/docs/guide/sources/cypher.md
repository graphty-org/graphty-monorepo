# Cypher: Neo4j and Amazon Neptune

::: warning Experimental
The Cypher source and its presets are experimental: names and shapes on this page may still change.
:::

The `cypher` source reads a graph from any server that speaks openCypher. Two presets fix the
details for you:

| Source id | For                                                                                   |
| --------- | ------------------------------------------------------------------------------------- |
| `neo4j`   | Neo4j over its Query API (5.26 and later, Aura), or over Bolt (any version)           |
| `neptune` | Amazon Neptune Database over HTTPS, or Neptune Analytics. Node only (see below)       |
| `cypher`  | the generic source: you pick the transport with `transport`, or the endpoint picks it |

Every load is read-only where the server enforces it: Bolt sessions are `READ` sessions and the
Query API gets `accessMode: "Read"`, so a query that writes fails with `E_SOURCE_FORBIDDEN`.

## Loading from Neo4j

The Neo4j demo server publishes its databases with the database name as the login:

```ts
import { credentials, loadFromSource } from "@graphty/graph-io";

const { snapshot } = await loadFromSource(
    "neo4j",
    { database: "movies", mode: "all" },
    { endpoint: "https://demo.neo4jlabs.com:7473", credential: credentials.basic("movies", "movies") },
);
console.log(snapshot.nodeCount, snapshot.edgeCount); // 171 253
```

A `bolt:` or `bolt+s:` endpoint uses Bolt instead, through the
[neo4j-driver](https://www.npmjs.com/package/neo4j-driver) package. It is an optional peer
dependency: install it yourself (`npm install neo4j-driver`) only if you use Bolt. Without it, a
Bolt load fails with `E_SOURCE_RUNTIME` and `params: { reason: "needs-peer-dependency", package:
"neo4j-driver" }`. Hetionet is a public Neo4j 3.5 that only speaks Bolt:

```ts
const near = await loadFromSource(
    "neo4j",
    { mode: "neighborhood", idProperty: "name", ids: ["Metformin"], depth: 1 },
    { endpoint: "bolt+s://neo4j.het.io:7687" },
);
console.log(near.snapshot.nodeCount); // 230
```

`listSources()` lists both as samples of the `neo4j` source, with their endpoints and logins.

## What to read: `mode`

| `mode`           | What it reads                                                                      |
| ---------------- | ---------------------------------------------------------------------------------- |
| `"query"`        | your `query`, run as written, with `parameters` sent separately                    |
| `"all"`          | every node, then every relationship, in pages of `pageSize` (default 1000)         |
| `"neighborhood"` | every path of up to `depth` hops (1 to 10) from the nodes in `ids`, seeds included |

`mode` defaults to `"query"` when you give a `query`, else `"all"`. A result may mix nodes,
relationships and paths, also inside lists and maps; each node and relationship is kept once. A
query that returns only scalars (`RETURN count(n)`) fails with `E_SOURCE_NOT_A_GRAPH` and
`params.columns`. Add a `LIMIT` to your own queries: they are not paged.

`"all"` pages by the node id (never with `SKIP`), so a page costs the same however deep it is. With
`limits: { maxNodes }` a load stops after the page that reached the cap, keeps what came first and
gives `report.source.next`; pass it back as `cursor` to continue.

A first page of `"all"` on Neo4j with at most one label and no `idProperty` also counts the nodes,
in one lookup Neo4j answers from its counts whatever the database's size, and gives the count as
`report.source.total.nodes`, so you can show "100 of 28,455". With `countFirst: true` every
`"all"` load counts its nodes and relationships (`total.nodes`, `total.edges`), Neptune too. A
continued page (`cursor`), `"query"` and `"neighborhood"` count nothing.

## Parameters

| Parameter           | What it does                                                                      |
| ------------------- | --------------------------------------------------------------------------------- |
| `query`             | your Cypher query                                                                 |
| `parameters`        | its parameters, an object; never spliced into the query                           |
| `mode`              | `"query"`, `"all"` or `"neighborhood"`                                            |
| `ids`, `depth`      | the seeds and hops of `"neighborhood"`                                            |
| `labels`            | only nodes with one of these labels (`"all"` and `"neighborhood"`)                |
| `relationshipTypes` | only relationships of these types                                                 |
| `idProperty`        | key nodes on this property (`"uuid"`) instead of the server's id; see "Node ids"  |
| `database`          | the database; default the server's default                                        |
| `transport`         | `"query-api"`, `"bolt"`, `"neptune-https"` or `"neptune-analytics"`               |
| `profile`           | `"neo4j"`, `"neptune"` or `"auto"` (default): how the server spells its ids       |
| `long`              | integers past 2^53: `"f64"` (default, rounded, warns `W_PRECISION`) or `"string"` |
| `countFirst`        | count nodes and relationships first, for `onProgress` and `report.source.total`   |
| `pageSize`          | rows per page of `"all"`, 1 to 100000                                             |

Labels, relationship types and property names cannot be query parameters, so they are quoted:
each is wrapped in backticks with any backtick inside doubled, and an empty name is refused
(`E_SOURCE_PARAM`, `reason: "identifier"`). `cypherIdentifier(name)` from
`@graphty/graph-io/sources/cypher` does the same quoting for your own queries:

```ts
import { cypherIdentifier } from "@graphty/graph-io/sources/cypher";

const query = `MATCH (n:${cypherIdentifier(label)}) RETURN n LIMIT 100`;
```

## What the graph holds

Relationships become directed edges. Node labels go to the `labels` column and relationship types
to `type`, as the Neo4j CSV importer has them; the server's relationship id goes to the edge `id`.
Properties become columns:

| Server value               | Column value                              |
| -------------------------- | ----------------------------------------- |
| integer                    | a number; past 2^53 see `long`            |
| float, boolean, string     | as it is                                  |
| date, date-time            | milliseconds since 1970 (UTC)             |
| local time, time, duration | its ISO text                              |
| point                      | `{ srid, x, y }` or `{ srid, x, y, z }`   |
| list, map                  | an array or an object of the values above |
| bytes                      | left out, with `W_SOURCE_VALUE`           |

The Query API and Bolt keep every digit of an integer, so `long: "string"` gives you
`"9007199254740993"` exactly. Neptune sends plain JSON numbers, so a value past 2^53 is already
rounded when it arrives.

Generated queries (`"all"`, `"neighborhood"`) also give each node its relationship count at the
server, in `_source.degree`, so an application can show which nodes have more to load.

## Node ids

A node's id is the server's id: `elementId(n)` on Neo4j 5 and later, `id(n)` before (Hetionet's
3.5), and the `~id` string on Neptune. A Neo4j id is stable while the node exists, but may be reused
after it is deleted. If your nodes have a stable key of their own, pass it as `idProperty`: nodes
are then keyed by that property, and nodes without it are left out of generated queries.

## Expanding a node

`expandFromSource` fetches the neighborhood of some nodes, as a snapshot of only what it fetched:

```ts
import { expandFromSource } from "@graphty/graph-io";

const more = await expandFromSource(
    "neo4j",
    { params: { database: "movies" }, ids: [nodeId], depth: 1, direction: "out", limit: 50 },
    { endpoint, credential },
);
```

`direction` is `"out"`, `"in"` or `"both"` (default); `relationshipTypes` narrows the hops.

## Checking a connection and freshness

`probeSource("neo4j", params, options)` checks the endpoint and credential and answers
`server: { product, version, profile, readOnly }` (`readOnly: "enforced"` on Neo4j). Neither Neo4j
nor Neptune tells a reader when data changed, so `validateSource` reads again and compares
`report.source.validators.contentHash`, a hash of the rows the load read: `"current"` or
`"changed"`.

## Amazon Neptune

The `neptune` preset reads Neptune Database through `POST /openCypher` on port 8182, or Neptune
Analytics through `POST /queries` when the endpoint is a `neptune-graph` host. Requests are signed
with AWS Signature Version 4:

```ts
const { snapshot } = await loadFromSource(
    "neptune",
    { query: "MATCH p = (:airport {code: $code})-[:route]->() RETURN p LIMIT 100", parameters: { code: "SEA" } },
    {
        endpoint: "https://my-cluster.cluster-abc.us-east-1.neptune.amazonaws.com:8182",
        credential: credentials.awsSigV4({ region: "us-east-1", credentials: provider }),
    },
);
```

Pass `service: "neptune-graph"` to `awsSigV4` for Neptune Analytics. `credentials` may be a function
returning fresh credentials (the AWS SDK's provider chain); graph-io never reads `~/.aws` or the
environment itself.

Neptune is Node only: Neptune Database sends no CORS headers, and Neptune Analytics is not known to,
so in a browser both fail before any request with `E_SOURCE_RUNTIME` and `reason: "cors"`. In a
browser, `awsSigV4` also refuses long-term keys (`E_SOURCE_PARAM`, `reason: "long-term-key"`): use
temporary credentials. Neptune Database is reachable only from inside its VPC unless it has a public
endpoint.

## In a browser

The Query API works from a page on `https:` (Neo4j allows any origin by default). Bolt works from
such a page over `bolt+s:`, which the driver opens as `wss://`, so the server needs Bolt TLS; a
plain `bolt:` endpoint is refused there (`reason: "insecure-endpoint"`).

## Credentials and connections

The Query API takes `credentials.basic` or `credentials.bearer`; Bolt takes the same two and hands
them to the driver. A credential goes only to the endpoint (or its `origins`). Over Bolt:

- only direct connections: a `neo4j:` or `neo4j+s:` endpoint is refused (`reason: "routing"`),
  because a routing table could send the credential to other hosts;
- `bolt+ssc:` accepts any certificate, so a credential is never sent over it
  (`reason: "unverified-tls"`);
- a credential goes over plain `bolt:` only to this machine, or with `allowInsecure: true`.

## Errors

| Code                   | When                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| `E_SOURCE_QUERY`       | the server refused the query: `serverCode`, `line`, `column`, `serverMessage` |
| `E_SOURCE_AUTH`        | the login failed: `origin`, `serverCode`                                      |
| `E_SOURCE_FORBIDDEN`   | the query tried to write, or the user may not read                            |
| `E_SOURCE_TIMEOUT`     | the server timed the query out (`serverSide: true`), or `timeoutMs` passed    |
| `E_SOURCE_NOT_FOUND`   | no such database (`what: "database"`)                                         |
| `E_SOURCE_NOT_A_GRAPH` | the result holds no node, relationship or path                                |
| `E_SOURCE_RUNTIME`     | Neptune in a browser, or Bolt without neo4j-driver                            |
| `E_SOURCE_PARAM`       | a bad parameter, identifier, endpoint scheme or credential                    |

`limits.timeoutMs` is also sent as Bolt's transaction timeout, and aborting the load's `signal`
closes the Bolt session.

## Testing without a server

Pass recorded responses as the `fetch` option, so a test never calls the server:

```ts
import { loadFromSource, replayFetch } from "@graphty/graph-io";

const fetch = replayFetch([
    { method: "POST", url: "https://db.example.com/db/neo4j/query/v2", body: { data: { fields: ["n"], values: [] } } },
]);
await loadFromSource("neo4j", { query: "MATCH (n) RETURN n" }, { endpoint: "https://db.example.com", fetch });
```
