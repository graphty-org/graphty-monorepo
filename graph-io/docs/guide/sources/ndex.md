# NDEx

::: warning Experimental
Network sources are experimental: the source id `ndex`, its parameters and the facts it writes may
still change.
:::

[NDEx](https://www.ndexbio.org) is the public repository of biological networks that Cytoscape users
publish to. The `ndex` source loads one network by its UUID, searches NDEx, and fetches the
neighborhood of some nodes. Public networks need no account, and nothing needs to be imported:
`loadFromSource("ndex", ...)` loads the source's code on first use. It works in Node and in browsers.

<!-- generated:begin example:sources/ndex-load -->

```ts
import { loadFromSource } from "@graphty/graph-io";

// WikiPathways WP5483, a small public network
const { snapshot, format, report } = await loadFromSource("ndex", { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(`last changed on NDEx: ${snapshot.meta.modified}`);
console.log(`${report.source?.requests} requests, ${report.source?.bytes} bytes`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/ndex-load -->

```text
cx2: 57 nodes, 34 edges
last changed on NDEx: 2025-04-17T00:31:38.620Z
2 requests, 53608 bytes
```

<!-- generated:end -->

## Parameters

| Parameter     | What it is                                                                             |
| ------------- | -------------------------------------------------------------------------------------- |
| `uuid`        | the network's UUID, the last part of its NDEx address; required                        |
| `format`      | `"cx2"` (the default) or `"cx"`: which download to read; both give the same graph      |
| `idAttribute` | for an expansion only: seed it by this node attribute (`"name"`) instead of by node id |

The endpoint defaults to `https://www.ndexbio.org/`. For another NDEx server, pass its address as
`endpoint`, ending in `/`.

## What a load does

1. It reads the network's summary (a few kilobytes): its node and edge counts, the size of its
   download, when it last changed and who may see it.
2. If a cap you set (`maxNodes`, `maxEdges` or `maxBytes`) is below what the summary says, the load
   fails with `E_SOURCE_LIMIT` before a byte of the network is read. A network cut short is not a
   graph, so this happens under `onLimit: "stop"` too. Public networks reach millions of edges and
   hundreds of megabytes.
3. It streams the download into the CX2 (or CX) importer. `onProgress` counts bytes, with a total
   from the summary (NDEx's own figure, within a few percent of the download).

The graph's `meta.modified` is the network's last change on NDEx, and the graph values
`visibility` (`"PUBLIC"` or `"PRIVATE"`), `rights` and `rightsHolder` are set when NDEx gives them.
`report.source.validators.modified` records the same time, so a later `validateSource()` can tell
whether the network changed.

<!-- generated:begin example:sources/ndex-limits -->

```ts
import { ImportError, loadFromSource } from "@graphty/graph-io";

// PCNet 2.2 is a 690 MB download; the summary NDEx keeps stops the load before its first byte
try {
    await loadFromSource(
        "ndex",
        { uuid: "8b4b54fa-e87d-11ee-9621-005056ae23aa" },
        { limits: { maxBytes: 100_000_000 } },
    );
} catch (err) {
    if (err instanceof ImportError) {
        console.log(err.issue?.code, err.issue?.params);
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:sources/ndex-limits -->

```text
E_SOURCE_LIMIT { limit: 'maxBytes', value: 690606821 }
```

<!-- generated:end -->

## Searching, checking and expanding

- `listFromSource("ndex", { params: {}, search, size, cursor })` searches NDEx. Each item's `params`
  load that network; `next` continues the search.
- `probeSource("ndex", { uuid })` reads the summary only: `counts.nodes`, `counts.edges` and
  `counts.bytes` (the download size).
- `validateSource("ndex", { uuid }, seen)` compares the summary's modification time with
  `seen.modified`: `"current"`, `"changed"` (with `changedAt`), or `"unverifiable"` without one.
- `expandFromSource("ndex", { params, ids, depth, limit })` fetches the neighborhood of some nodes:
  the seeds, their neighbors to `depth` (1 to 10) and the edges among them. Node ids are the ids of
  the downloaded network, so an expansion merges into a loaded network by id. `limit` caps the
  edges NDEx returns. NDEx always expands in both directions and cannot filter by relationship
  type, so `direction` other than `"both"` and `relationshipTypes` fail with `E_SOURCE_UNSUPPORTED`.
  With `idAttribute` in `params`, `ids` are values of that attribute (gene names, for example).

<!-- generated:begin example:sources/ndex-explore -->

```ts
import { expandFromSource, listFromSource, probeSource } from "@graphty/graph-io";

// search NDEx, then look at the first hit before loading it
const listing = await listFromSource("ndex", { params: {}, search: "WP5483", size: 5 });
const [first] = listing.items;
console.log(`${listing.total} found: ${first.name}`);

const probe = await probeSource("ndex", first.params);
console.log(probe.counts);

// the neighborhood of one node, by its node id: only the seed, its neighbors and their edges
const part = await expandFromSource("ndex", { params: first.params, ids: [1245568], depth: 1 });
console.log(`${part.snapshot.nodeCount} nodes, ${part.snapshot.edgeCount} edge`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/ndex-explore -->

```text
1 found: WP5483 - Hallmark of cancer: non-mutational epigenetic reprogramming - Homo sapiens
{ nodes: 57, edges: 34, bytes: 54039 }
2 nodes, 1 edge
```

<!-- generated:end -->

## Private networks and share links

A private network needs your NDEx account: `credentials.basic(user, password)`, or
`credentials.bearer(token)`. A network shared by link carries an access key in its address.
`parseShareUrl(link)`, from `@graphty/graph-io/sources/ndex`, turns the link into the params, the
endpoint and a credential holding the key, sent only to that NDEx server and never shown in a
report, a log or the params. A key put anywhere else (in `uuid`, or in `endpoint`) is refused with
`E_SOURCE_PARAM` (`reason: "credentials-in-url"`), so it never ends up stored with the params.

<!-- generated:begin example:sources/ndex-share -->

```ts
import { loadFromSource } from "@graphty/graph-io";
import { parseShareUrl } from "@graphty/graph-io/sources/ndex";

// a link NDEx gives when a network is shared by link; the access key becomes a credential
const link = parseShareUrl(
    "https://www.ndexbio.org/viewer/networks/86719f5b-1439-11f0-9806-005056ae3c32?accesskey=0123abcd",
);
console.log(link.params, link.endpoint, link.credential);

const { snapshot } = await loadFromSource("ndex", link.params, {
    endpoint: link.endpoint,
    credential: link.credential,
});
console.log(`${snapshot.nodeCount} nodes`);
```

<!-- generated:end -->

<!-- generated:begin output:sources/ndex-share -->

```text
{ uuid: '86719f5b-1439-11f0-9806-005056ae3c32' } https://www.ndexbio.org/ { kind: 'api-key', origins: [ 'https://www.ndexbio.org' ] }
57 nodes
```

<!-- generated:end -->

## Errors

| Code                 | When                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `E_SOURCE_NOT_FOUND` | no network has this UUID (`params: { what: "network", value }`)                          |
| `E_SOURCE_AUTH`      | NDEx refused the credential, or a private network needs one (`serverCode` is NDEx's own) |
| `E_SOURCE_FORBIDDEN` | the account may not read this network                                                    |
| `E_SOURCE_LIMIT`     | the summary is over a cap (`params: { limit, value }`)                                   |
| `E_SOURCE_PARAM`     | a malformed `uuid`, an access key in a URL, or an expansion NDEx cannot run              |
| `E_FETCH`            | any other failure, such as a server error (`params: { url, status }`)                    |

A server error's body (NDEx sends a Java stack trace with some) is never read into a report.

## Samples

`listSources()` lists the public networks the source offers as samples, with their counts. PCNet
2.2 (3.3 million edges, a 690 MB download) is marked `whole: false`: start from a neighborhood.

| Sample                          | UUID                                   | Nodes / edges      |
| ------------------------------- | -------------------------------------- | ------------------ |
| WikiPathways WP5483             | `86719f5b-1439-11f0-9806-005056ae3c32` | 57 / 34            |
| NCI PID cancer signaling        | `640e2cef-795d-11e8-a4bf-0ac135e8bacf` | 2,794 / 25,296     |
| HuRI human interactome          | `73bc2c06-5fb2-11e9-9f06-0ac135e8bacf` | 8,275 / 52,569     |
| Signor (signed, directed edges) | `523fff27-afe8-11e9-8bb4-0ac135e8bacf` | 10,339 / 33,381    |
| DGIdb drugs and target genes    | `7e5e64ff-f6cf-11ea-99da-0ac135e8bacf` | 12,100 / 32,814    |
| WikiPathways landscape          | `2b3ed6af-5031-11eb-9e72-0ac135e8bacf` | 32,077 / 74,109    |
| PCNet 2.2                       | `8b4b54fa-e87d-11ee-9621-005056ae23aa` | 18,558 / 3,323,928 |
