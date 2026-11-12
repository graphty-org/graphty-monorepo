# Network Sources

::: warning Experimental
Network sources are experimental. The source ids, the parameters and what a saved project records
about a load may change in a minor release until they are declared stable.
:::

A network source turns parameters into a graph over the network: a public repository (NDEx), a
graph database (Neo4j, Amazon Neptune), a REST API (OpenAlex), a SPARQL endpoint, or a service of
your own. graphty-element loads from any of them by name. You install nothing else and write no
client.

graph-samples' datasets are not a network source: load one with
`session.data.loadDataset("karate")`.

## Load from a built-in source

```ts
const element = document.querySelector("graphty-element");

// A pathway from NDEx, the public repository of biological networks.
await element.loadFromSource("ndex", { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" });
```

`sourceDescriptors()` from `@graphty/graphty-element/catalog` lists every source: its id, what
parameters it takes, which credentials it accepts and the public examples it offers. It runs in
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

## Load an example

A source's examples are public servers and the parameters that load a known graph from them
(`descriptor.examples` in `sourceDescriptors()`). `session.data.loadExample(source, id)` loads one
in one call, with its parameters, its endpoint, the login its service publishes and, for one too
big to load whole, its first page:

```ts
// The Neo4j demo server's movies database, with the login the demo publishes.
await element.session.data.loadExample("neo4j", "neo4j-movies");

// TP53's protein interactions from UniProt's SPARQL endpoint.
await element.session.data.loadExample("sparql", "uniprot-tp53");
```

It takes the options `import` takes; a `credential` or `endpoint` you pass wins over the
example's. An id the source does not list rejects with `E_SOURCE_UNKNOWN`, whose
`details.known` lists that source's example ids.

| Source     | Examples                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `ndex`     | `ndex-wp5483`, `ndex-nci-pid`, `ndex-huri`, `ndex-signor`, `ndex-dgidb`, `ndex-wikipathways-landscape`    |
| `neo4j`    | `neo4j-movies`, `neo4j-northwind`, `neo4j-gameofthrones`, `neo4j-fincen`, `neo4j-movies-bolt`, `hetionet` |
| `sparql`   | `uniprot-tp53`, `dbpedia-philosophers`, `wikidata-einstein`                                               |
| `rest`     | `string-tp53`, `deps-dev-webpack`                                                                         |
| `openalex` | `openalex-watts-strogatz`                                                                                 |

The Neo4j demo server (`demo.neo4jlabs.com`) is read-only and publishes each database's login as
its name, for both user and password. Amazon Neptune has no public server, so it has no example.

## Read first, load later

`session.data.readExample(source, example, options)` reads one of a source's examples and changes
nothing, so a failure can be shown before anything is opened for the data. It takes what `import`
takes and refuses what the renderer could not draw with `E_TOO_LARGE`. Pass the result to `import`,
on any session, and it loads without reading the service again:

```ts
const scratch = createGraphSession();
const read = await scratch.data.readExample("ndex", "ndex-wp5483");
await element.session.data.import(read); // read.nodes and read.edges say how big it is
scratch.dispose();
```

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

### Credential slots: the OpenAlex API key

A source names the credentials it takes as slots in its descriptor, and `credentialSlots(descriptor)`
reads them (a source that takes a credential and names none has one slot, `default`). OpenAlex has
one optional slot, `api_key`, sent as the `api_key` query parameter as OpenAlex documents. Without
a key a load still runs; with one, `credentials.forSlot` makes the credential from the key:

```ts
import { credentials, credentialSlots, listSources } from "@graphty/graphty-element";

const [slot] = credentialSlots(listSources().find((s) => s.id === "openalex")?.descriptor);
const key = credentials.forSlot(slot, "my-openalex-key"); // sent as ?api_key=my-openalex-key

await element.session.data.import({ source: "openalex", config: { work: "W2112090702" } }, { credential: key });

// or remember it for the reader, so later loads, pages, refreshes and expansions use it
await element.credentials.remember({ source: "openalex", endpoint: "https://api.openalex.org", slot: "api_key" }, key);
```

The key goes on every request of the load (each page, an expansion, a stub's details) and only to
api.openalex.org. A saved project records `credentialSlot: "api_key"` and never the key. A
remembered credential is looked up by the source, the origin about to be contacted and the slot,
so a project file edited to name another endpoint gets no key.

## Errors

Every failure is a `GraphtyError` whose `code` names what went wrong and whose `details` carry
the values. Your application writes the words.

| Code                   | When                                           | Details                              |
| ---------------------- | ---------------------------------------------- | ------------------------------------ |
| `E_SOURCE_AUTH`        | the service wants a credential, or refused one | `origin`, `status`, `slot`, `stored` |
| `E_SOURCE_BLOCKED`     | the browser refused the request (often CORS)   | `url`, `cause`                       |
| `E_SOURCE_NOT_FOUND`   | the named item does not exist                  | `what`, `value`                      |
| `E_SOURCE_PARAM`       | a parameter or option is invalid               | `name`, `reason`                     |
| `E_SOURCE_UNSUPPORTED` | the source cannot do what was asked            | `feature`                            |
| `E_SOURCE_PENDING`     | a load of an opened project has not been run   | `id`                                 |
| `E_LOAD_UNKNOWN`       | no load in the graph has that key              | `key`, `known`                       |
| `E_TOO_LARGE`          | it is past what the renderer can draw          | `limit`, `count`, `of`, `graph`      |

`stored: true` on `E_SOURCE_AUTH` means a remembered credential was used and refused, so you can
offer to replace it; `slot` names the credential slot to ask the reader for. The full list is `SOURCE_ISSUE` in `@graphty/graphty-element`.

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

## Showing what is loaded

`session.data.sources()` lists every load still in the graph, oldest first. Each entry's `key`
(`"s1"`, `"s2"`, ...) is the one id to keep: `more`, `refresh`, `checkSource` and `removeSource`
take it, a filter's `source` rule names it, and a saved project keeps it.

```ts
const { data } = element.session;
await data.import(
    { source: "neo4j", config: { mode: "all", labels: ["Gene"] } },
    {
        endpoint: "https://db.example.org",
        limits: { maxNodes: 100, onLimit: "stop" },
    },
);

const load = data.sources().at(-1);
show(`${load.counts.nodes} of ${load.total ?? "?"}`); // "100 of 28455"

if (load.features?.more) await data.more({ load: load.key }); // the next 100
const { changed } = await data.checkSource(load.key); // has the database changed? null: cannot tell
const { added, removed, updated } = await data.refresh(load.key); // apply only the difference
await data.removeSource(load.key); // take it out, keeping what another load also supplied
```

- `counts` is what the load supplied that the graph still holds; `added` is what it added when it
  ran; `total` (and `totalEdges`) is what the source said it holds for the load, when it said or
  a complete read counted.
- `data.sourcesOf(nodeId)` names the loads that supplied a node (`{ kind: "edge" }` for an edge),
  and `data.nodeSource(nodeId)` the network load it came from.
- `data.previewSource(input)` reads a few rows (25 by default) without loading anything, to check
  a form before the reader commits to a load.

## Saved projects

A saved project records every load: a file's name, size and SHA-256, a URL without its user name,
password or any parameter that names a credential, and a network load's source, params, endpoint
and the name of the credential slot it used -- never a secret, a user name or an origin. Opening
the project draws the saved rows at once and fetches nothing: a shared project file never runs a
query by itself, and a click on one of its nodes does not either.

Each network load of an opened project waits until your application runs it. Until then
`more`, `refresh`, `checkSource` and `expand` refuse it with `E_SOURCE_PENDING` and send nothing.
Show the reader what would run -- the exact params, the endpoint, whether it is on their own
machine or network -- and run it once they agree:

```ts
await element.session.project.open(file);
for (const load of element.session.data.pendingSourceLoads()) {
    // load.source, load.endpoint, load.params (the query or mapping as saved), load.isLocalNetwork,
    // load.authRequired, load.credentialSlot
    if (await askTheReader(load)) {
        await element.session.data.runPendingSourceLoad(load.id); // read-only; asks element.credentials
    }
}
```

The reader's own autosave is different: it is their work coming back, not a file someone sent.
When the element's autosave restores a project, a load the reader ran stays live and does not
wait again; only a load that was still waiting when the autosave was written waits. When your page
keeps the reader's projects itself (a list of projects saved in the browser), open them the same
way with `ownWork`; never pass it for a file the reader picked or was sent:

```ts
await element.session.project.open(savedText, { ownWork: true });
```

A project file never turns click-to-expand on: the trigger comes from your page's
`behavior.expand` configuration or the load options your code passed, never from the file.

## Testing without a network

`replayFetch` answers requests from recorded responses and refuses any it has no recording for.
Pass it as the `fetch` option:

```ts
import { replayFetch } from "@graphty/graphty-element";

const fetch = replayFetch([{ url: "https://example.com/api/people?team=core", body: [{ id: "ana", knows: [] }] }]);
await element.loadFromSource("people", { team: "core" }, { endpoint: "https://example.com", fetch });
fetch.calls.length; // 1
```

## Showing and changing what a load fetches

`session.data.sourceSettings(key)` says what a load connects to and fetches: its `source`, `endpoint`,
`config`, `limits` and `expand`. The params are redacted as a saved file has them and no credential
is in it, so it is safe to show. It is `undefined` for anything that is not a network load.

To change a load, read it again with new settings through `replaceSource`. The key and the name stay,
styles and filters stay, and it is one undo step:

```javascript
const [{ key }] = session.data.sources();
const settings = session.data.sourceSettings(key);
await session.data.replaceSource(key, {
    source: settings.source,
    config: { ...settings.config, query: "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100" },
});
```

With no `credential` given, the one remembered for that endpoint is used. A `credential` is taken in
the third argument, with `endpoint`, `limits` and `signal`, as `import` takes them.
