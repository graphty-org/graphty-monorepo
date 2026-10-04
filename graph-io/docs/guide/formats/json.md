# JSON

## At a glance

<!-- generated:begin glance:json -->

|                         |                          |
| ----------------------- | ------------------------ |
| Import from             | `@graphty/graph-io/json` |
| Format name             | `json`                   |
| Extensions              | `.json`                  |
| MIME types              | `application/json`       |
| Reads                   | yes                      |
| Writes                  | yes                      |
| Several graphs per file | yes (`importAllGraphs`)  |
| Lists its graphs        | yes (`listGraphs`)       |

What a saved file can hold:

| Capability                                                                                 | `node-link`            | `d3`                   | `jgf`                  | `cytoscape`            | `graphology`           | `vis`                  |
| ------------------------------------------------------------------------------------------ | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- |
| `mixedDirection`: Directed and undirected edges in one file.                               | no                     | no                     | yes                    | no                     | yes                    | no                     |
| `multiEdges`: Parallel edges.                                                              | yes                    | yes                    | yes                    | yes                    | yes                    | yes                    |
| `selfLoops`: Self-loops.                                                                   | yes                    | yes                    | yes                    | yes                    | yes                    | yes                    |
| `edgeIds`: Whether edge ids are required (generated when absent), optional or unsupported. | none                   | none                   | optional               | required               | optional               | optional               |
| `idCharset`: Which node ids can be written unchanged.                                      | any                    | any                    | any                    | any                    | any                    | any                    |
| `dtypes`: The column dtypes the format keeps as declared.                                  | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string | f64, i32, bool, string |
| `components`: Multi-component (stride) columns.                                            | no                     | no                     | no                     | no                     | no                     | no                     |
| `lists`: List columns.                                                                     | no                     | no                     | no                     | no                     | no                     | no                     |
| `json`: Nested json columns.                                                               | yes                    | yes                    | yes                    | yes                    | yes                    | yes                    |
| `defaults`: Declared defaults.                                                             | no                     | no                     | no                     | no                     | no                     | no                     |
| `options`: Declared enumerations (GEXF options).                                           | no                     | no                     | no                     | no                     | no                     | no                     |
| `hierarchy`: Containment (parent / parents roles).                                         | no                     | no                     | no                     | yes                    | no                     | no                     |
| `temporal`: Temporal support level.                                                        | none                   | none                   | none                   | none                   | none                   | none                   |
| `graphAttributes`: Graph-level attributes.                                                 | yes                    | no                     | yes                    | yes                    | yes                    | no                     |
| `positions`: The position role.                                                            | no                     | no                     | no                     | yes                    | no                     | no                     |
| `viz`: The visual roles (color, size, shape, thickness).                                   | no                     | no                     | no                     | no                     | no                     | no                     |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:json -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option       | Type                          | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dialect`    | `JsonImportDialect \| "auto"` | `"auto"`     | The dialect to read; "auto" (default) sniffs the parsed document.                                                                                                                                                                                                                                                                                            |
| `nodeIdKey`  | `string`                      |              | node-link / d3 / vis / adjacency / tree: the node key holding the id; auto: "id" (node-link / d3: "id" when any node has it, else "name").                                                                                                                                                                                                                   |
| `edgesKey`   | `string`                      |              | node-link / d3: the top-level key holding the edges; auto: "edges" when present, else "links".                                                                                                                                                                                                                                                               |
| `sourceKey`  | `string`                      |              | node-link / d3 / vis: the edge key holding the source; auto: "source", "src" or "from" (vis: "from").                                                                                                                                                                                                                                                        |
| `targetKey`  | `string`                      |              | node-link / d3 / vis: the edge key holding the target; auto: "target", "dst" or "to" (vis: "to").                                                                                                                                                                                                                                                            |
| `indexLinks` | `boolean \| "auto"`           | `"auto"`     | node-link / d3: whether edge endpoints are node array positions; "auto" (default) says yes when every endpoint is an integer below the node count and no node id is a number.                                                                                                                                                                                |
| `oboIds`     | `"curie" \| "iri"`            | `"curie"`    | obographs: "curie" (default) reads `http://purl.obolibrary.org/obo/GO_0008150` as `GO:0008150` and `.../obo/go#regulates` as `regulates`, the identifiers the `.obo` file of the same ontology writes; "iri" keeps every IRI as written.                                                                                                                     |
| `typedefs`   | `"metadata" \| "nodes"`       | `"metadata"` | obographs: "metadata" (default) keeps PROPERTY nodes and their subPropertyOf / inverseOf edges in `meta.extra.obographs`, as the OBO importer keeps `[Typedef]` frames; "nodes" makes them nodes and edges.                                                                                                                                                  |
| `nodesPath`  | `string`                      | `"nodes"`    | node-link / d3 / vis / graphology: where the node array is, as a dotted path of object keys from the document root (`"data.nodes"`); the object holding it is read as the graph record (its `directed`, `multigraph`, `graph` and edge keys). "nodes" by default. A path that names nothing is an E_MISSING_SECTION issue and the graph has no node records. |
| `edgesPath`  | `string`                      |              | node-link / d3 / vis / graphology: where the edge array is, as a dotted path of object keys from the document root (`"data.links"`); by default the edges or links key of the object holding the nodes. A path that names nothing is an E_MISSING_SECTION issue and the graph has no edge records.                                                           |
| `graphIndex` | `number`                      |              | The 0-based position of the graph, as `GraphListing.index` gives it.                                                                                                                                                                                                                                                                                         |
| `graphName`  | `string`                      |              | The name of the graph, as `GraphListing.name` gives it; a name two graphs share is refused.                                                                                                                                                                                                                                                                  |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option       | Type          | Default | Meaning                                                                                              |
| ------------ | ------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `dialect`    | `JsonDialect` |         | The dialect to write; default: the dialect the importer recorded, else "node-link".                  |
| `indent`     | `number`      | `0`     | Spaces per indentation level; 0 (default) writes compact JSON.                                       |
| `edgesKey`   | `string`      |         | node-link / d3: the key of the edge array; default: the recorded key, else "edges" (d3: "links").    |
| `nodeIdKey`  | `string`      |         | node-link / d3 / vis: the node id key; default: the recorded key, else "id".                         |
| `indexLinks` | `boolean`     |         | node-link / d3: write endpoints as node array positions; default: the recorded flag, else false.     |
| `sourceKey`  | `string`      |         | node-link / d3 / vis: the source key; default: the recorded key, else "source" (vis: "from").        |
| `targetKey`  | `string`      |         | node-link / d3 / vis: the target key; default: the recorded key, else "target" (vis: "to").          |
| `weightKey`  | `string`      |         | The key the weight is written under; default: the key the JSON importer read it from, else "weight". |

## Import issue codes

The codes this format's import report can hold, also exported as `JSON_ISSUE` from `@graphty/graph-io/json`.

| Code                        | Key                    | Severity | Meaning                                                                                                                               |
| --------------------------- | ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `E_EMPTY_INPUT`             | `EMPTY_INPUT`          | error    | The text is empty or whitespace (fatal).                                                                                              |
| `E_SYNTAX`                  | `SYNTAX`               | error    | JSON.parse refused the text (fatal).                                                                                                  |
| `E_JSON_DIALECT`            | `DIALECT`              | error    | No dialect matches the document's top-level shape.                                                                                    |
| `E_JSON_SHAPE`              | `SHAPE`                | error    | A section (nodes, edges, elements, graph) has the wrong JSON type.                                                                    |
| `E_MISSING_SECTION`         | `MISSING_SECTION`      | error    | A node-link document lacks its nodes or its edges array, or a Cytoscape document its elements.                                        |
| `E_BAD_ELEMENT`             | `BAD_ELEMENT`          | error    | A node record or an element is not an object.                                                                                         |
| `E_MISSING_ID`              | `MISSING_ID`           | error    | A node record has no id.                                                                                                              |
| `E_UNSUPPORTED_ID`          | `UNSUPPORTED_ID`       | error    | A node id is a JSON boolean or null (legal in NetworkX, not a NodeId); coerced only under ids "string".                               |
| `E_MISSING_ENDPOINT`        | `MISSING_ENDPOINT`     | error    | An edge record has no source or no target.                                                                                            |
| `E_BAD_INDEX`               | `BAD_INDEX`            | error    | An index endpoint is not an integer below the node count, or names a skipped node.                                                    |
| `E_BAD_VALUE`               | `BAD_VALUE`            | error    | A declared field has the wrong JSON type (JGF label / relation / metadata, Cytoscape position / classes).                             |
| `W_BAD_FLAG`                | `BAD_FLAG`             | warning  | A graph-level flag (`directed`, `multigraph`, graphology `options`) has the wrong type; the default is used.                          |
| `E_UNKNOWN_PARENT`          | `UNKNOWN_PARENT`       | error    | A Cytoscape `data.parent` names an unknown node.                                                                                      |
| `W_DUPLICATE_NODE`          | `DUPLICATE_NODE`       | warning  | A node id repeated by a later record; the records are merged (the later attributes win).                                              |
| `E_DUPLICATE_EDGE_ID`       | `DUPLICATE_EDGE_ID`    | error    | An edge id (Cytoscape data.id, graphology key, vis id) repeated by a later edge; the edge is skipped.                                 |
| `W_ID_MERGED`               | `ID_MERGED`            | warning  | Two distinct id texts merged into one number under ids "number".                                                                      |
| `W_EDGE_ID_STRINGIFIED`     | `EDGE_ID_STRINGIFIED`  | warning  | Edge ids of mixed JSON types were stored as text.                                                                                     |
| `W_MULTIPLE_GRAPHS`         | `MULTIPLE_GRAPHS`      | warning  | A JGF or OBO Graphs `graphs` array holds more than one graph; only the chosen one is read.                                            |
| `E_GRAPH_NOT_FOUND`         | `GRAPH_NOT_FOUND`      | error    | `graphIndex` is beyond the `graphs` array, or `graphName` names none of its graphs (fatal).                                           |
| `E_AMBIGUOUS_GRAPH_NAME`    | `AMBIGUOUS_GRAPH_NAME` | error    | `graphName` names more than one graph of the `graphs` array (fatal).                                                                  |
| `W_JSON_OBOGRAPHS_SUBJ`     | `OBOGRAPHS_SUBJ`       | warning  | obographs: an edge uses the outdated `subj` key of the OBO Graphs README; it is read as `sub`.                                        |
| `W_DANGLING_REFERENCE`      | `DANGLING_REFERENCE`   | warning  | obographs: an edge endpoint missing from `nodes` (a placeholder node is made, or the edge dropped under addMissingNodes false).       |
| `E_TOO_LARGE`               | `TOO_LARGE`            | error    | The document is longer than one JavaScript string can hold (fatal; category unsupported).                                             |
| `E_HYPEREDGE`               | `HYPEREDGE`            | error    | JGF hyperedges under the "error" policy.                                                                                              |
| `W_HYPEREDGES_SKIPPED`      | `HYPEREDGES_SKIPPED`   | warning  | JGF hyperedges skipped under the default "skip" policy.                                                                               |
| `E_HYPEREDGE_SHAPE`         | `HYPEREDGE_SHAPE`      | error    | A JGF hyperedge with neither a nodes array nor source / target arrays.                                                                |
| `W_POSITIONAL_NODES`        | `POSITIONAL_NODES`     | warning  | The nodes have no id key at all; array positions became the ids.                                                                      |
| `W_JSON_UNREAD_KEY`         | `UNREAD_KEY`           | warning  | A node-link / d3 top-level key the importer does not read (the other of edges / links, an unknown key); it is dropped.                |
| `W_SINK_OPTION`             | `SINK_OPTION`          | warning  | A builder-policy option (addMissingNodes, duplicateEdges, selfLoops, weightDtype) differs from the sink's (the shared W_SINK_OPTION). |
| `W_OPTION_IGNORED`          | `OPTION_IGNORED`       | warning  | A common option the dialect has no use for (nodeIdFrom outside node-link, long, restoreMangledIds).                                   |
| `E_INVALID_UTF8`            | `INVALID_UTF8`         | error    | The input holds invalid UTF-8 (fatal).                                                                                                |
| `E_INVALID_ENCODING`        | `INVALID_ENCODING`     | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                              |
| `W_ENCODING_FALLBACK`       | `ENCODING_FALLBACK`    | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                           |
| `W_JSON_NONSTANDARD_NUMBER` | `NONSTANDARD_NUMBER`   | warning  | The document uses the non-standard tokens NaN / Infinity / -Infinity (Python's json writes them); read as numbers.                    |
| `W_JSON_BIG_INTEGER`        | `BIG_INTEGER`          | warning  | Integer literals beyond 2^53 were read as their exact digits (strings), not as rounded numbers.                                       |
| `W_UNKNOWN_ENCODING`        | `UNKNOWN_ENCODING`     | warning  | A declared encoding the platform cannot decode was ignored.                                                                           |

## Loss codes

The codes `check()` can return before a save, also exported as `JSON_LOSS` from `@graphty/graph-io/json`. An `E_` code means the save throws unless you change the graph or the options.

| Code                        | Key                       | Severity            | Meaning                                                                                                          |
| --------------------------- | ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `W_NONFINITE_AS_NULL`       | `NONFINITE_AS_NULL`       | warning             | Non-finite numbers (columns, weights) are written as null.                                                       |
| `W_DIRECTION_DROPPED`       | `DIRECTION_DROPPED`       | warning             | Cytoscape, vis and d3 carry no direction; the file re-imports with the dialect's default direction.              |
| `W_MUTUAL_EXPANDED`         | `MUTUAL_EXPANDED`         | warning             | GEXF mutual pairs are written as two directed edges.                                                             |
| `W_NUMERIC_IDS_STRINGIFIED` | `NUMERIC_IDS_STRINGIFIED` | warning             | JGF keys its nodes by string; numeric ids re-import as text unless ids: "canonical".                             |
| `E_ID_TEXT_COLLISION`       | `ID_TEXT_COLLISION`       | error (save throws) | JGF: two ids have the same text; export() throws E_INVALID_ID.                                                   |
| `W_NODE_ORDER`              | `NODE_ORDER`              | warning             | JGF: integer-like id keys are enumerated first and ascending by JSON parsers; node order changes on re-import.   |
| `W_RESERVED_KEY`            | `RESERVED_KEY`            | warning             | A column named like a reserved key of the dialect (id, source, target, ...) is skipped.                          |
| `W_WEIGHT_KEY_CLASH`        | `WEIGHT_KEY_CLASH`        | warning             | A plain edge column named like the weight key reads back as THE weight (or is skipped when weights are written). |
| `W_POSITIONS_DROPPED`       | `POSITIONS_DROPPED`       | warning             | A position column without a slot (every dialect but Cytoscape) is a plain array attribute; the role is lost.     |
| `W_POSITION_Z_DROPPED`      | `POSITION_Z_DROPPED`      | warning             | Cytoscape positions are 2D; non-zero z values are dropped.                                                       |
| `W_PARENTS_DROPPED`         | `PARENTS_DROPPED`         | warning             | Cytoscape has a single parent; a `parents` list column cannot be written.                                        |
| `W_EDGE_IDS_DROPPED`        | `EDGE_IDS_DROPPED`        | warning             | node-link / d3 have no edge id slot; the id column is written as a plain attribute.                              |
| `W_INTEGRAL_F64_AS_I32`     | `INTEGRAL_F64_AS_I32`     | warning             | An f64 column of integral values reads back as i32 (JSON declares no types).                                     |
| `W_ROLE_DROPPED`            | `ROLE_DROPPED`            | warning             | A role column the dialect has no slot for is a plain attribute; the role is lost.                                |
| `W_EMPTY_COLUMN_DROPPED`    | `EMPTY_COLUMN_DROPPED`    | warning             | A column without a set cell is not written (JSON declares no columns).                                           |

<!-- generated:end -->
