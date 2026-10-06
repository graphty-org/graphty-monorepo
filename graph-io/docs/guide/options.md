# Options reference

Every load and save function takes one options object. The tables below list the options of the
load and save functions, with their type and default. Each format adds options of its own, listed
on its [format page](./formats/index.md) and summarized at the end of this page; they go in the
same object.

A default of "per format" means each format has its own; the option's entry below the table says
which, and its "Read by" list names the formats that use it.

<!-- generated:begin options -->

## Every importer

`CommonImportOptions`: every importer accepts these next to its own options. An option a format does not read is reported in the import report as `W_OPTION_IGNORED` when you set it, and a name that no format takes, such as a misspelling, as `W_UNKNOWN_OPTION`.

An option whose default is the same in every format (`duplicateEdges: "keep"`, `long: "f64"`, `restoreMangledIds: true` and the like) is not reported when you set it to that default, so an options object you share between formats can spell those out. `ids`, `defaultDirected`, `weightFrom` and `addMissingNodes` have a default per format, and are reported whenever you set them for a format that does not read them: leave them out of a shared object, or skip `W_OPTION_IGNORED` when you show the report.

| Option                                           | Type                                                                | Default    |
| ------------------------------------------------ | ------------------------------------------------------------------- | ---------- |
| [`ids`](#import-ids)                             | `"string" \| "number" \| "keep" \| "canonical"`                     | per format |
| [`nodeIdFrom`](#import-nodeidfrom)               | `"id" \| "label" \| "index"`                                        | `"id"`     |
| [`addMissingNodes`](#import-addmissingnodes)     | `boolean`                                                           | per format |
| [`duplicateEdges`](#import-duplicateedges)       | `"keep" \| "error" \| "first" \| "last" \| "sum" \| "min" \| "max"` | `"keep"`   |
| [`selfLoops`](#import-selfloops)                 | `"keep" \| "error" \| "drop"`                                       | `"keep"`   |
| [`onMixedDirection`](#import-onmixeddirection)   | `"error" \| "expand" \| "directed" \| "undirected"`                 | `"expand"` |
| [`defaultDirected`](#import-defaultdirected)     | `boolean`                                                           | per format |
| [`weightFrom`](#import-weightfrom)               | `null \| string`                                                    | per format |
| [`weightDtype`](#import-weightdtype)             | `"f32" \| "f64"`                                                    | `"f64"`    |
| [`long`](#import-long)                           | `"string" \| "f64"`                                                 | `"f64"`    |
| [`restoreMangledIds`](#import-restoremangledids) | `boolean`                                                           | `true`     |
| [`hyperedges`](#import-hyperedges)               | `"error" \| "skip" \| "star" \| "clique"`                           | `"skip"`   |
| [`errorLimit`](#import-errorlimit)               | `number`                                                            | `100`      |
| [`signal`](#import-signal)                       | `AbortSignal`                                                       |            |
| [`onProgress`](#import-onprogress)               | `(bytesDone: number, bytesTotal?: number \| undefined) => void`     |            |
| [`encoding`](#import-encoding)                   | `string`                                                            |            |

- <a id="import-ids"></a>`ids`: How id text becomes a node id. "canonical": integer text such as "42" becomes the number 42 and everything else ("042", "4.2", "a") stays text. "string": every id stays text. "number": every id is read as a number, so "042" and "42" become one node (with a warning) and text that is not a number is an error. "keep": ids keep the type the file gives them. The default is "keep" for JSON, OBO, XGMML, CX, CX2 and Cytoscape sessions, and "canonical" for the other formats.
- <a id="import-nodeidfrom"></a>`nodeIdFrom`: Which value becomes the node id: the file's own id ("id"), the node's label ("label"), or its position among the nodes, counting from 0 ("index"). Use it when a file's ids are meaningless numbers and the labels are the real names. In d3 JSON, "index" also reads edges whose ends are node positions. In GML and Pajek it only renames: every node still needs its id key or vertex number, because edges refer to nodes by it, and a GML node without an `id` key is skipped with `E_MISSING_ID`. CSV reads this option only when there is a node table, and it does not just rename: with "label" the node table's label column (`label`, or the `labelColumn` option) gives the ids, so the edge table must name its nodes by those labels. Read by: [json](./formats/json.md), [csv](./formats/csv.md), [gml](./formats/gml.md), [pajek](./formats/pajek.md).
- <a id="import-addmissingnodes"></a>`addMissingNodes`: Whether an edge may name a node the file never declares; that node is then created. When false, such an edge is skipped as an error. The default is false for GEXF, XGMML, CX, CX2 and Cytoscape sessions, whose files must declare every node, and true for the other formats.
- <a id="import-duplicateedges"></a>`duplicateEdges`: What to do with a second edge between the same two nodes: "keep" keeps both, "first" / "last" keep one, "sum" / "min" / "max" keep one with the weights combined, and "error" stops the import. Merged edges are reported once as `W_EDGES_MERGED`.
- <a id="import-selfloops"></a>`selfLoops`: What to do with an edge from a node to itself: "keep", "drop" (reported once as `W_SELF_LOOPS_DROPPED` with the number removed), or "error" to stop the import.
- <a id="import-onmixeddirection"></a>`onMixedDirection`: How edge direction is read. "expand" (the default) keeps the file's direction, and for a file that has both directed and undirected edges makes a directed graph in which each undirected edge is two edges, marked so an export can write them back as one. "directed" / "undirected" read every edge of any file that way, including a file whose edges all have the other direction, with a `W_DIRECTION_FORCED` warning. "error" stops the import at the first edge whose direction differs from the file's.
- <a id="import-defaultdirected"></a>`defaultDirected`: Whether the graph is directed when the file does not say. The default is undirected for GraphML, GEXF, GML, JSON and XGMML, and directed for CSV, Pajek and Cytoscape sessions. DOT, Neo4j, CX, CX2 and OBO files always settle the direction themselves (DOT by `graph` or `digraph`; the others are always directed), so those formats do not read this option and report it as `W_OPTION_IGNORED`. Read by: [json](./formats/json.md), [graphml](./formats/graphml.md), [gexf](./formats/gexf.md), [csv](./formats/csv.md), [gml](./formats/gml.md), [pajek](./formats/pajek.md), [xgmml](./formats/xgmml.md), [cys](./formats/cys.md).
- <a id="import-weightfrom"></a>`weightFrom`: The edge attribute read as the edge weight. The default is "weight", except "value" for GML and Pajek and none for OBO. Pass null to read every attribute as a plain attribute and leave the graph unweighted. A name no edge has leaves the graph unweighted, with a `W_WEIGHT_NOT_FOUND` warning: one options object with `weightFrom: "weight"` shared across formats reads GML and Pajek files, which keep their weights in `value`, without weights. An edge whose weight cell is empty or missing gets the default weight 1, and an export writes no weight for it. Read by: [json](./formats/json.md), [graphml](./formats/graphml.md), [gexf](./formats/gexf.md), [csv](./formats/csv.md), [gml](./formats/gml.md), [dot](./formats/dot.md), [pajek](./formats/pajek.md), [neo4j](./formats/neo4j.md), [xgmml](./formats/xgmml.md), [cx2](./formats/cx2.md), [cx](./formats/cx.md), [cys](./formats/cys.md).
- <a id="import-weightdtype"></a>`weightDtype`: Whether weights a 32-bit float cannot hold exactly are also kept exactly. "f64" keeps them in an edge column that `snapshot.edges.byRole("weight")` finds, so 0.1 and 16777217 stay exact. "f32" keeps no such column and uses less memory: the 32-bit weight arrays `snapshot.weights` and `snapshot.edgeList().weights`, which every import fills, are then the only weights.
- <a id="import-long"></a>`long`: How a column the file declares as a 64-bit integer is stored: "f64" (a number, exact up to 2^53) or "string" (every digit kept, as text). GML declares no types, so there it applies to a key whose integer values go beyond 2^53. Read by: [graphml](./formats/graphml.md), [gexf](./formats/gexf.md), [gml](./formats/gml.md), [neo4j](./formats/neo4j.md), [xgmml](./formats/xgmml.md), [cx2](./formats/cx2.md), [cx](./formats/cx.md), [cys](./formats/cys.md).
- <a id="import-restoremangledids"></a>`restoreMangledIds`: Whether to give back the original ids that an export with `sanitizeIds: "mangle"` had to rewrite. The export writes them to the file in an attribute whose name each format page gives. When false, the rewritten ids stay the ids and the originals are an ordinary node attribute, named after the format's spelling: `graphty.originalId` in GraphML, `graphty_originalId` in GML and Pajek, `graphty:originalId` in CX, CX2 and Cytoscape sessions, and a `graphty:originalId` entry of the `property_value` attribute in OBO. Read by: [graphml](./formats/graphml.md), [gml](./formats/gml.md), [pajek](./formats/pajek.md), [cx2](./formats/cx2.md), [cx](./formats/cx.md), [obo](./formats/obo.md), [cys](./formats/cys.md).
- <a id="import-hyperedges"></a>`hyperedges`: What to do with a GraphML or JGF hyperedge (an edge with more than two ends): "skip" leaves it out with a warning, "error" stops the import, and "star" and "clique" turn it into ordinary edges. "clique" joins every pair of ends. "star" works differently per format: GraphML adds a new hub node joined to every end, while JGF makes the hyperedge's first node the hub, so no node is added. A directed JGF hyperedge (`source` and `target` arrays) becomes one edge from every source to every target under both. In JGF every edge made from a hyperedge carries the hyperedge's id, label, relation and metadata; GraphML drops a hyperedge's `<data>` and its `<desc>`, with a warning. Read by: [json](./formats/json.md), [graphml](./formats/graphml.md).
- <a id="import-errorlimit"></a>`errorLimit`: How many errors an import tolerates. Each error skips one node, edge or value and is listed in the report; one error more than this stops the import with an ImportError. Pass 0 to stop at the first error.
- <a id="import-signal"></a>`signal`: Cancels the import. When it aborts, the import stops and rejects with the signal's reason (an AbortError, or a TimeoutError from `AbortSignal.timeout()`).
- <a id="import-onprogress"></a>`onProgress`: Called as the input is read, with the bytes read so far and the total. For a string or a Uint8Array the total is known from the first call. For a stream (which includes loadFromUrl() and loadFromFile()) it is undefined until the last call, which always has `bytesDone === bytesTotal`. Text counts its UTF-8 length.
- <a id="import-encoding"></a>`encoding`: The character encoding of byte input, as a label such as "utf-8", "windows-1252" or "utf-16le". Without it graph-io uses a byte order mark, then the encoding the file declares (an XML declaration, DOT's `charset`), then UTF-8, and reads bytes that are not UTF-8 as windows-1252 with a warning. A byte order mark wins over this option. A string input is already text: setting this option for one adds a `W_OPTION_IGNORED` warning, once per input (a CSV import with a `nodes` table has two inputs).

## Every exporter

`CommonExportOptions`: every exporter accepts these next to its own options. `checkExport()` returns a `W_UNKNOWN_OPTION` note for a name that no format takes, such as a misspelling.

| Option                                         | Type                                    | Default   |
| ---------------------------------------------- | --------------------------------------- | --------- |
| [`sanitizeIds`](#export-sanitizeids)           | `"error" \| "mangle"`                   | `"error"` |
| [`onMixedDirection`](#export-onmixeddirection) | `"error" \| "directed" \| "undirected"` | `"error"` |

- <a id="export-sanitizeids"></a>`sanitizeIds`: What to do with node ids the format cannot hold. "error": the export throws (`E_INVALID_ID`) and no node is renamed. "mangle": such ids are rewritten and the originals are written to the file too, so an import with `restoreMangledIds` (on by default) reads the original ids back. Pajek is the exception: it always numbers nodes 1 to N and keeps the old ids as labels.
- <a id="export-onmixeddirection"></a>`onMixedDirection`: What a format with one direction per file does with a graph that has both directed and undirected edges: "error" throws (`E_DIRECTED`), "directed" writes every edge as directed (an undirected edge once, as one directed edge), "undirected" writes the whole graph undirected. A format that keeps each edge's own direction (GraphML, GEXF, CSV, Pajek, XGMML, Cytoscape sessions, and the JGF and graphology JSON dialects) ignores it and writes both kinds; to make such a graph all one direction, read it with the import option `onMixedDirection`.

## importGraph and importAllGraphs

`ImportGraphOptions`: everything above, plus these, plus the chosen format's own import options.

| Option                                        | Type               | Default    |
| --------------------------------------------- | ------------------ | ---------- |
| [`format`](#importgraph-format)               | `"auto" \| string` | `"auto"`   |
| [`filename`](#importgraph-filename)           | `null \| string`   |            |
| [`mimeType`](#importgraph-mimetype)           | `null \| string`   |            |
| [`builder`](#importgraph-builder)             | `BuilderSeed`      |            |
| [`freeze`](#importgraph-freeze)               | `FreezeOptions`    |            |
| [`maxEmptyCells`](#importgraph-maxemptycells) | `number`           | `16777216` |
| [`graphIndex`](#importgraph-graphindex)       | `number`           | `0`        |
| [`graphName`](#importgraph-graphname)         | `string`           |            |

- <a id="importgraph-format"></a>`format`: The format to read the input as ("graphml", "csv", ...; `listFormats()` names them all), or "auto" to work it out from `filename`, `mimeType` and the first bytes of the input. Name it to be strict: detection reads a file graph-io cannot place as the closest format it recognizes.
- <a id="importgraph-filename"></a>`filename`: The file name or full path the input came from; only its extension is used, as a format hint. loadFromUrl() takes it from the URL and loadFromFile() from a File's name when you do not pass it.
- <a id="importgraph-mimetype"></a>`mimeType`: The MIME type the input was served as, a format hint. loadFromUrl() takes it from the response's Content-Type and loadFromFile() from the Blob's `type` when you do not pass it.
- <a id="importgraph-builder"></a>`builder`: Settings for building the graph: `weighted` ("auto", true or false: whether the graph gets weights), `expectedNodes` and `expectedEdges` (room to make up front for a large file). Most programs never set it.
- <a id="importgraph-freeze"></a>`freeze`: Settings for the last step of an import, which turns what was read into the snapshot: `label` (a name for debugging, read back as `snapshot.label`), `prepare` (views of the graph to compute up front, such as `["reverse"]`), `checksum` (record checksums, which `snapshot.validate({ checksum: true })` compares later to catch changed memory) and `profile` (record how long each step took, in `result.freeze.timings`). Most programs never set it.
- <a id="importgraph-maxemptycells"></a>`maxEmptyCells`: The most attribute slots that hold no value the import may allocate before it stops with an ImportError whose `issue.code` is `E_TOO_MANY_EMPTY_CELLS`. Every attribute is a column with one slot per node (or edge), so a file whose nodes each have a differently named attribute would otherwise need nodes x attributes memory. Infinity turns the check off. Files whose elements mostly share their attributes are never stopped.
- <a id="importgraph-graphindex"></a>`graphIndex`: The 0-based position of the graph to read from a file that holds several (`listGraphs()` gives each graph's `index`). A position past the last graph stops the import with an ImportError whose `issue.code` is `E_GRAPH_NOT_FOUND`; its message lists the file's graphs.
- <a id="importgraph-graphname"></a>`graphName`: The name of the graph to read from a file that holds several (`listGraphs()` gives each graph's `name`). A name no graph has stops the import with an ImportError whose `issue.code` is `E_GRAPH_NOT_FOUND`, and a name two graphs share with one whose `issue.code` is `E_AMBIGUOUS_GRAPH_NAME`.

## loadFromUrl

`LoadFromUrlOptions`: everything `importGraph()` takes, plus:

| Option                            | Type          | Default |
| --------------------------------- | ------------- | ------- |
| [`request`](#loadfromurl-request) | `RequestInit` |         |

- <a id="loadfromurl-request"></a>`request`: Passed to fetch() as its second argument: headers, credentials, mode and so on. If you set `signal` in the import options and not here, the same signal also cancels the download.

## loadFromFile

`loadFromFile()` takes the same options as [importGraph()](#importgraph-and-importallgraphs).

## Saving: exportGraph, exportGraphToBytes, checkExport and the others

`ExportGraphOptions`: the options every exporter takes, above, plus the chosen format's own export options in the same object.

## downloadGraph

`DownloadGraphOptions`: everything the other save functions take, plus:

| Option                           | Type     | Default                             |
| -------------------------------- | -------- | ----------------------------------- |
| [`filename`](#download-filename) | `string` | "graph" plus the format's extension |

- <a id="download-filename"></a>`filename`: The file name the browser saves as. The default is "graph" plus the first entry of the format's `extensions` ("graph.graphml"), or "graph.&lt;format&gt;" when it lists none.

## Each format's own options

| Format                          | Import options                                                                                                                                                                                     | Export options                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [json](./formats/json.md)       | [json import options](./formats/json.md#import-options): `dialect`, `nodeIdKey`, `edgesKey`, `sourceKey`, `targetKey`, `indexLinks`, `oboIds`, `typedefs`, `nodesPath`, `edgesPath`                | [json export options](./formats/json.md#export-options): `dialect`, `indent`, `edgesKey`, `nodeIdKey`, `indexLinks`, `sourceKey`, `targetKey`, `weightKey`, `ontologyIri` |
| [graphml](./formats/graphml.md) | [graphml import options](./formats/graphml.md#import-options): `yfiles`                                                                                                                            | [graphml export options](./formats/graphml.md#export-options): `pretty`, `edgedefault`                                                                                    |
| [gexf](./formats/gexf.md)       | [gexf import options](./formats/gexf.md#import-options): `viz`                                                                                                                                     | [gexf export options](./formats/gexf.md#export-options): `version`                                                                                                        |
| [csv](./formats/csv.md)         | [csv import options](./formats/csv.md#import-options): `delimiter`, `decimal`, `header`, `table`, `sourceColumn`, `targetColumn`, `typeColumn`, `idColumn`, `labelColumn`, `nodes`, `rowNumberIds` | [csv export options](./formats/csv.md#export-options): `dialect`, `table`, `delimiter`, `newline`, `header`                                                               |
| [gml](./formats/gml.md)         | [gml import options](./formats/gml.md#import-options): `positions`, `dictionaries`                                                                                                                 | [gml export options](./formats/gml.md#export-options): `weightKey`, `sanitizeKeys`                                                                                        |
| [dot](./formats/dot.md)         | [dot import options](./formats/dot.md#import-options): `mismatchedEdgeOperator`, `positions`                                                                                                       | [dot export options](./formats/dot.md#export-options): `indent`, `name`, `strict`                                                                                         |
| [pajek](./formats/pajek.md)     | [pajek import options](./formats/pajek.md#import-options): `firstVertex`                                                                                                                           | [pajek export options](./formats/pajek.md#export-options): `networkHeader`, `name`                                                                                        |
| [neo4j](./formats/neo4j.md)     | [neo4j import options](./formats/neo4j.md#import-options): `nodes`, `relationships`, `delimiter`, `arrayDelimiter`, `quote`                                                                        | [neo4j export options](./formats/neo4j.md#export-options): `part`, `delimiter`, `arrayDelimiter`, `quote`, `weightColumn`, `idColumn`                                     |
| [xgmml](./formats/xgmml.md)     | [xgmml import options](./formats/xgmml.md#import-options): `labelAliases`, `cytoscapeEscapes`, `repairBareAmpersands`, `pairSurrogateReferences`, `zAs`                                            | [xgmml export options](./formats/xgmml.md#export-options): `cytoscapeEscapes`                                                                                             |
| [cx2](./formats/cx2.md)         | [cx2 import options](./formats/cx2.md#import-options): `zAs`                                                                                                                                       | none                                                                                                                                                                      |
| [cx](./formats/cx.md)           | [cx import options](./formats/cx.md#import-options): `zAs`                                                                                                                                         | none                                                                                                                                                                      |
| [obo](./formats/obo.md)         | [obo import options](./formats/obo.md#import-options): `obsolete`, `typedefs`                                                                                                                      | [obo export options](./formats/obo.md#export-options): `relation`, `ontology`                                                                                             |
| [cys](./formats/cys.md)         | [cys import options](./formats/cys.md#import-options): `zAs`, `maxUncompressedBytes`                                                                                                               | none                                                                                                                                                                      |

<!-- generated:end -->
