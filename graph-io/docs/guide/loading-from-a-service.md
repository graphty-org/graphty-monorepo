# Loading from a service

::: warning Experimental
Network sources are experimental: names and shapes on this page may still change.
:::

`loadFromSource(source, params, options)` loads a graph from a network service instead of a file:
a repository of networks, a graph database, a REST API. It returns the same
`{ snapshot, format, report }` as the other load functions, with `format` set to `"source:<id>"`
(or the file format a source downloaded) and `report.source` saying what the load did:

| `report.source` | What it holds                                                    |
| --------------- | ---------------------------------------------------------------- |
| `id`, `version` | the source and its version                                       |
| `endpoint`      | the service's address, origin and path only                      |
| `requests`      | requests sent                                                    |
| `bytes`         | response bytes read                                              |
| `next`          | where to continue a capped load (pass it as `cursor`), else null |
| `total`         | `{ nodes, edges }` the service holds for the load, when it said  |

The built-in sources are `ndex` (NDEx, the repository of biological networks), `cypher` with its
`neo4j` and `neptune` presets, `rest` with its `openalex` preset, and `sparql`: see
[NDEx](./sources/ndex.md), [Cypher](./sources/cypher.md), [REST](./sources/rest.md) and
[SPARQL](./sources/sparql.md). All of
them are experimental. `listSources()` lists them with their descriptors and samples. To read from your own service, see
[Writing a source](./writing-a-source.md).

## Options

| Option          | What it does                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `endpoint`      | the service's address; required unless the source has a default                                      |
| `credential`    | from `credentials.bearer`, `basic`, `apiKey`, `awsSigV4` or `custom`; sent only to the endpoint      |
| `limits`        | `maxNodes`, `maxEdges`, `maxBytes`, `maxRequests`, `timeoutMs` and `onLimit` (`"stop"` or `"error"`) |
| `cursor`        | the `report.source.next` of a capped load, to continue it                                            |
| `retry`         | `{ retries, baseDelayMs, maxDelayMs }` (3, 500, 30000), or `false`                                   |
| `idPrefix`      | prepended to every node id, to keep the ids of two loads apart                                       |
| `allowInsecure` | send a credential over plain `http:` to a host other than this machine                               |
| `signal`        | cancels the load; it rejects with the signal's reason                                                |
| `onProgress`    | `(done, total?, unit)`: bytes for a downloaded file, items otherwise                                 |
| `fetch`         | a `fetch` to use instead of the global one, such as `replayFetch(recordings)` in tests               |
| `userAgent`     | sent as `User-Agent` in Node (browsers do not allow setting it)                                      |

Every cap is off unless you set it. Under `onLimit: "stop"` (the default) a load keeps what came
first, warns `W_SOURCE_LIMIT` and gives `report.source.next`; under `"error"` it fails with
`E_SOURCE_LIMIT`.

Requests that are safe to repeat are retried on 429, 502, 503, 504 and network failures, with a
random backoff that honors a readable `Retry-After`. A load that succeeded after retries warns
`W_SOURCE_RETRIED`.

## In a browser

A browser hides why it refused a request: a CORS refusal, a page on `https:` asking for `http:`,
a refused connection and a hidden 429 all look the same. graph-io checks what it can before
sending and, after a refusal, sends one bodyless request to the origin's root to tell them apart.
The error is `E_SOURCE_BLOCKED` with `params.cause`: `"cors"` (the service does not allow this page),
`"unreachable"`, `"local-network"` (a public page asking for a local address, which Chrome asks the
reader about) or `"unknown"`. An `https:` page cannot reach an `http:` service at all
(`E_SOURCE_RUNTIME`, `reason: "insecure-endpoint"`); the service needs TLS.

[Writing a source](./writing-a-source.md#errors) lists every error code.
