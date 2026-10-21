# Network Sources

::: warning Experimental
Network sources are experimental. The source ids, the parameters and what a saved project records
about a load may change in a minor release until they are declared stable.
:::

A network source turns parameters into a graph over the network: a public repository (NDEx), a
graph database (Neo4j), a REST API (OpenAlex), graph-samples' datasets, or a service of your own.
graphty-element loads from any of them by name. You install nothing else and write no client.

## Load from a built-in source

```ts
const element = document.querySelector("graphty-element");

// A pathway from NDEx, the public repository of biological networks.
await element.loadFromSource("ndex", { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" });

// A sample dataset from graph-samples, downloaded from graphty.app.
await element.loadFromSource("graph-samples", { dataset: "karate" });
```

`sourceDescriptors()` from `@graphty/graphty-element/catalog` lists every source: its id, what
parameters it takes, which credentials it accepts and the public samples it offers. It runs in
Node and loads no source's code, so a settings form can be drawn from it:

```ts
import { sourceDescriptors } from "@graphty/graphty-element/catalog";

for (const { id, descriptor } of sourceDescriptors()) {
    console.log(
        id,
        descriptor.plainName,
        descriptor.params.map((p) => p.name),
    );
}
```

## Load a sample by its id

Every public sample a source lists has an id. `session.data.loadSample(id)` loads it in one call,
with the sample's parameters, its endpoint and the login its service publishes:

```ts
// The Neo4j demo server's movies database, with the login the demo publishes.
await element.session.data.loadSample("neo4j-movies");

// graph-samples' karate club.
await element.session.data.loadSample("graph-samples-karate");
```

It takes the options `import` takes; a `credential` or `endpoint` you pass wins over the sample's.
An id no source lists rejects with `E_SOURCE_UNKNOWN`, whose `details.known` lists every sample id.
The ids are the `id` of each entry in `descriptor.samples`, from `sourceDescriptors()`.

## Write your own source

A source is an id and a function that returns nodes and edges. `ctx.fetchJson` does the request,
with retries, cancellation, a size cap and coded errors:

```html
<script type="module">
    import { defineSource, registerSource } from "@graphty/graphty-element";

    registerSource(
        defineSource({
            id: "people",
            async records(params, ctx) {
                const rows = await ctx.fetchJson(`/api/people?team=${encodeURIComponent(params.team)}`);
                return { nodes: rows, edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))) };
            },
        }),
    );
</script>
<graphty-element data-source="people" data-source-config='{"team":"core"}'></graphty-element>
```

`data-source` takes a source id the way it takes a format name. When a format and a source share
a name, the format wins; write `source:people` to name the source.

A relative URL resolves against the load's `endpoint`. Pass it from code:

```ts
await element.loadFromSource("people", { team: "core" }, { endpoint: "https://example.com" });
```

## Credentials

A credential is an object made by the `credentials` factories. It goes only to the endpoint's
origin, and it is never recorded: not in the undo history, the journal, an event,
`session.data.source()` or a saved project.

```ts
import { credentials } from "@graphty/graphty-element";

await element.session.data.import(
    { source: "neo4j", config: { query: "MATCH p = ()-[:ACTED_IN]->() RETURN p LIMIT 25", database: "movies" } },
    { endpoint: "https://demo.neo4jlabs.com:7473", credential: credentials.basic("movies", "movies") },
);
```

### Remembering a credential

`element.credentials` remembers credentials for the reader. A load given no credential looks one
up by the source and the origin about to be contacted, so a project that names another host never
receives a credential remembered for a different one.

```ts
await element.credentials.remember({ source: "neo4j", endpoint }, credentials.basic("neo4j", password));
await element.loadFromSource("neo4j", { query }, { endpoint }); // uses the remembered login

element.credentials.list(); // [{ namespace: "source", source: "neo4j", origin, kind: "basic", username: "neo4j" }]
await element.credentials.forget({ source: "neo4j", endpoint });
```

The same store holds the AI provider keys, as `element.credentials.ai`. Credentials are kept in
memory until you turn on the AI key manager's persistence (`element.credentials.ai.enablePersistence()`),
which saves both on this device. Without a passphrase the saved values are obscured, not
encrypted; for database passwords use `enablePersistenceWithPassphrase`. A credential that holds
a function (a token refresher, an AWS provider) cannot be remembered: `remember` rejects with
`E_CREDENTIAL_NOT_STORABLE`.

An application without an element uses `createCredentialStore()` from
`@graphty/graphty-element/credentials`.

## Errors

Every failure is a `GraphtyError` whose `code` names what went wrong and whose `details` carry
the values. Your application writes the words.

| Code                   | When                                           | Details                      |
| ---------------------- | ---------------------------------------------- | ---------------------------- |
| `E_SOURCE_AUTH`        | the service wants a credential, or refused one | `origin`, `status`, `stored` |
| `E_SOURCE_BLOCKED`     | the browser refused the request (often CORS)   | `url`, `cause`               |
| `E_SOURCE_NOT_FOUND`   | the named item does not exist                  | `what`, `value`              |
| `E_SOURCE_PARAM`       | a parameter or option is invalid               | `name`, `reason`             |
| `E_SOURCE_UNSUPPORTED` | the source cannot do what was asked            | `feature`                    |

`stored: true` on `E_SOURCE_AUTH` means a remembered credential was used and refused, so you can
offer to replace it. The full list is `SOURCE_ISSUE` in `@graphty/graphty-element`.

## Undo, more pages and merging

A load is one undoable step. Undo and redo replay the rows that were read; they never fetch again. `session.data.loads()` follows them: undoing a load or an expansion takes its record off the list,
and redo puts it back.

A capped load (`limits: { maxNodes: 500, onLimit: "stop" }`) records where it stopped;
`session.data.more()` loads the next page into the graph. The cap is checked after each page the
service returns, so a load can end one page past it: one OpenAlex page of 200 works, with the
works they cite as nodes, is about 11,000 nodes. A graph database applies the cap in its query. `session.data.loads()` lists every load
with its source, parameters, endpoint and whether more is available, never a secret.
Each entry of `session.data.sources()` has `total` when the source said how many nodes it holds
for the load (a Neo4j `mode: "all"` load with one label counts them in one cheap query), or when a
complete read counted them, so an application can show "100 of 28,455"; `session.data.more()`
keeps it, and a saved project records it.

`mode: "merge"` adds to the graph instead of replacing it. A node already there keeps its
attributes unless you pass `existing: "update"`.

## Saved projects

A saved project keeps every load's source, parameters and endpoint, and who the credential was
(its kind, origin and user name), never the secret. Opening the project draws the saved rows at
once and fetches nothing: a shared project file never runs a query by itself. Your application
decides whether to fetch again:

```ts
await element.session.project.open(file);
for (const load of element.session.data.pendingSourceLoads()) {
    // load.source, load.endpoint, load.hasQuery, load.isLocalNetwork, load.authRequired
    await element.session.data.runPendingSourceLoad(load.id); // read-only; asks element.credentials
}
```

## Testing without a network

`replayFetch` answers requests from recorded responses and refuses any it has no recording for.
Pass it as the `fetch` option:

```ts
import { replayFetch } from "@graphty/graphty-element";

const fetch = replayFetch([{ url: "https://example.com/api/people?team=core", body: [{ id: "ana", knows: [] }] }]);
await element.loadFromSource("people", { team: "core" }, { endpoint: "https://example.com", fetch });
fetch.calls.length; // 1
```
