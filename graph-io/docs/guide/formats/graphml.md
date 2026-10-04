# GraphML

## At a glance

<!-- generated:begin glance:graphml -->

|                         |                                                          |
| ----------------------- | -------------------------------------------------------- |
| Import from             | `@graphty/graph-io/graphml`                              |
| Format name             | `graphml`                                                |
| Extensions              | `.graphml`, `.xml`                                       |
| MIME types              | `application/graphml+xml`, `application/xml`, `text/xml` |
| Reads                   | yes                                                      |
| Writes                  | yes                                                      |
| Several graphs per file | no                                                       |
| Lists its graphs        | no                                                       |

What a saved file can hold:

| Capability        | Value                       | Meaning                                                                         |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------- |
| `mixedDirection`  | yes                         | Directed and undirected edges in one file.                                      |
| `multiEdges`      | yes                         | Parallel edges.                                                                 |
| `selfLoops`       | yes                         | Self-loops.                                                                     |
| `edgeIds`         | optional                    | Whether edge ids are required (generated when absent), optional or unsupported. |
| `idCharset`       | nmtoken                     | Which node ids can be written unchanged.                                        |
| `dtypes`          | bool, i32, f32, f64, string | The column dtypes the format keeps as declared.                                 |
| `components`      | no                          | Multi-component (stride) columns.                                               |
| `lists`           | no                          | List columns.                                                                   |
| `json`            | no                          | Nested json columns.                                                            |
| `defaults`        | yes                         | Declared defaults.                                                              |
| `options`         | no                          | Declared enumerations (GEXF options).                                           |
| `hierarchy`       | yes                         | Containment (parent / parents roles).                                           |
| `temporal`        | none                        | Temporal support level.                                                         |
| `graphAttributes` | yes                         | Graph-level attributes.                                                         |
| `positions`       | no                          | The position role.                                                              |
| `viz`             | no                          | The visual roles (color, size, shape, thickness).                               |

<!-- generated:end -->

## Loading

## Saving

## How graph-io reads it

## What a saved file keeps and loses

<!-- generated:begin reference:graphml -->

## Import options

These come on top of the [options every importer takes](../options.md#every-importer).

| Option   | Type               | Default  | Meaning                                                                                                                                                                                                                |
| -------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yfiles` | `"json" \| "skip"` | `"json"` | How keys with a `yfiles.type` (yEd / yFiles graphics) are read: "json" (default) keeps the nested XML of each `<data>` as a json column with origin.namespace "yfiles"; "skip" reports them once and declares nothing. |

## Export options

These come on top of the [options every exporter takes](../options.md#every-exporter).

| Option        | Type                         | Default | Meaning                                                                                                                                                                                                                                |
| ------------- | ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pretty`      | `boolean`                    | `true`  | Indent nested elements (default true); false writes one element per line without indentation.                                                                                                                                          |
| `edgedefault` | `"directed" \| "undirected"` |         | The top-level `edgedefault`. By default the one the importer recorded in `meta.extra.graphml` (so a mixed file re-imports with the same edge layout), else the snapshot's direction, with the majority direction for a mixed snapshot. |

## Import issue codes

The codes this format's import report can hold, also exported as `GRAPHML_ISSUE` from `@graphty/graph-io/graphml`.

| Code                               | Key                      | Severity | Meaning                                                                                                                     |
| ---------------------------------- | ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `E_XML_SYNTAX`                     | `XML_SYNTAX`             | error    | Fatal: the input is not well-formed XML.                                                                                    |
| `E_INVALID_UTF8`                   | `INVALID_UTF8`           | error    | Fatal: the input holds invalid UTF-8.                                                                                       |
| `E_INVALID_ENCODING`               | `INVALID_ENCODING`       | error    | Invalid bytes in the encoding a BOM, a declaration or the encoding option chose (fatal).                                    |
| `W_ENCODING_FALLBACK`              | `ENCODING_FALLBACK`      | warning  | Bytes that are not UTF-8 and declare no encoding were read as windows-1252.                                                 |
| `W_UNKNOWN_ENCODING`               | `UNKNOWN_ENCODING`       | warning  | A declared encoding the platform cannot decode was ignored.                                                                 |
| `E_NOT_GRAPHML`                    | `NOT_GRAPHML`            | error    | Fatal: the root element is not `<graphml>`.                                                                                 |
| `E_NO_GRAPH`                       | `NO_GRAPH`               | error    | Fatal: the document has no `<graph>`.                                                                                       |
| `E_GRAPHML_KEY_MISSING_ID`         | `KEY_MISSING_ID`         | error    | A `<key>` without an id.                                                                                                    |
| `E_DUPLICATE_KEY`                  | `DUPLICATE_KEY`          | error    | Two `<key>` elements with the same id.                                                                                      |
| `W_GRAPHML_KEY_DOMAIN_UNSUPPORTED` | `KEY_DOMAIN_UNSUPPORTED` | warning  | A key declared for hyperedges, ports or endpoints (never used).                                                             |
| `E_MISSING_ID`                     | `MISSING_ID`             | error    | A `<node>` without an id.                                                                                                   |
| `E_MISSING_ENDPOINT`               | `MISSING_ENDPOINT`       | error    | An `<edge>` without a source or a target.                                                                                   |
| `E_GRAPHML_UNKNOWN_KEY`            | `UNKNOWN_KEY`            | error    | A `<data>` whose key was never declared.                                                                                    |
| `W_GRAPHML_KEY_DOMAIN`             | `KEY_DOMAIN`             | warning  | A `<data>` whose key is declared for another domain.                                                                        |
| `E_GRAPHML_DATA_MISSING_KEY`       | `DATA_MISSING_KEY`       | error    | A `<data>` without a key attribute.                                                                                         |
| `E_GRAPHML_KEY_FOR_INVALID`        | `KEY_FOR_INVALID`        | error    | A `<key>` whose `for` is not a GraphML domain.                                                                              |
| `W_GRAPHML_NESTED_GRAPH_DATA`      | `NESTED_GRAPH_DATA`      | warning  | Data of a nested `<graph>`; only the top-level graph has attributes.                                                        |
| `W_GRAPHML_HYPEREDGE_DATA_DROPPED` | `HYPEREDGE_DATA_DROPPED` | warning  | Data of a hyperedge expanded to a star or clique.                                                                           |
| `E_GRAPHML_DATA_NESTED`            | `DATA_NESTED`            | error    | Nested elements in the `<data>` of a typed (non-yfiles) key.                                                                |
| `W_DUPLICATE_NODE`                 | `DUPLICATE_NODE`         | warning  | A `<node>` declared twice.                                                                                                  |
| `E_DUPLICATE_EDGE_ID`              | `DUPLICATE_EDGE_ID`      | error    | An edge id already used by another edge.                                                                                    |
| `E_GRAPHML_INVALID_DIRECTED`       | `INVALID_DIRECTED`       | error    | A `directed` attribute that is neither true nor false.                                                                      |
| `E_GRAPHML_INVALID_EDGEDEFAULT`    | `INVALID_EDGEDEFAULT`    | error    | An `edgedefault` that is neither directed nor undirected.                                                                   |
| `W_GRAPHML_EDGEDEFAULT_MISSING`    | `EDGEDEFAULT_MISSING`    | warning  | A `<graph>` without edgedefault; the `defaultDirected` option applies.                                                      |
| `W_MULTIPLE_GRAPHS`                | `MULTIPLE_GRAPHS`        | warning  | A second top-level `<graph>`; its nodes and edges are merged into the first.                                                |
| `W_COUNT_HINT`                     | `COUNT_HINT`             | warning  | A `parse.nodes` / `parse.edges` hint the sink cannot reserve (ignored).                                                     |
| `E_HYPEREDGE`                      | `HYPEREDGE`              | error    | A hyperedge under `hyperedges: "error"`.                                                                                    |
| `W_GRAPHML_HYPEREDGE_SKIPPED`      | `HYPEREDGE_SKIPPED`      | warning  | Hyperedges skipped under `hyperedges: "skip"`.                                                                              |
| `E_GRAPHML_HYPEREDGE_ENDPOINT`     | `HYPEREDGE_ENDPOINT`     | error    | An endpoint of a hyperedge without a node, or with an unknown type.                                                         |
| `W_GRAPHML_PORT_DECLARATION`       | `PORT_DECLARATION`       | warning  | `<port>` declarations (and their data) are not kept; sourceport / targetport edge attributes are.                           |
| `W_GRAPHML_PARSE_HINT_IGNORED`     | `PARSE_HINT_IGNORED`     | warning  | A GraphML `parse.*` hint on `<graph>`, `<node>` or `<edge>` the importer does not act on (parse.nodeids, parse.order, ...). |
| `W_GRAPHML_UNKNOWN_XML_ATTRIBUTE`  | `UNKNOWN_XML_ATTRIBUTE`  | warning  | An XML attribute GraphML does not define on `<graph>`, `<node>` or `<edge>`; it is not kept.                                |
| `W_GRAPHML_LOCATOR_DROPPED`        | `LOCATOR_DROPPED`        | warning  | A `<locator>` element.                                                                                                      |
| `W_GRAPHML_DESC_DROPPED`           | `DESC_DROPPED`           | warning  | A `<desc>` of a node, an edge or a hyperedge.                                                                               |
| `W_UNKNOWN_ELEMENT`                | `UNKNOWN_ELEMENT`        | warning  | An element the GraphML schema does not define at that place.                                                                |
| `W_STRAY_TEXT`                     | `STRAY_TEXT`             | warning  | Non-whitespace text where the schema allows only elements.                                                                  |
| `W_ID_MERGED`                      | `ID_MERGED`              | warning  | Two distinct id texts merged into one number under `ids: "number"`.                                                         |
| `W_OPTION_IGNORED`                 | `OPTION_IGNORED`         | warning  | An option GraphML has no use for (`nodeIdFrom`: nodes are identified by their id attribute).                                |
| `W_GRAPHML_YFILES_SKIPPED`         | `YFILES_SKIPPED`         | warning  | A yFiles key under `yfiles: "skip"`.                                                                                        |
| `W_COLUMN_RENAMED`                 | `COLUMN_RENAMED`         | warning  | A key renamed `<name>#<id>` because the name was taken.                                                                     |
| `W_ROLE_TAKEN`                     | `ROLE_TAKEN`             | warning  | A key declared without its role because the table already holds it.                                                         |
| `W_UNKNOWN_ATTR_TYPE`              | `UNKNOWN_ATTR_TYPE`      | warning  | A declared type the format does not define (kept as string).                                                                |
| `W_BAD_DEFAULT`                    | `BAD_DEFAULT`            | warning  | A default that does not parse as the declared type.                                                                         |
| `W_PRECISION`                      | `PRECISION`              | warning  | A long value beyond 2^53 rounded.                                                                                           |
| `W_SINK_OPTION`                    | `SINK_OPTION`            | warning  | A builder-policy option the sink does not honour.                                                                           |
| `W_DIRECTION_REFUSED`              | `DIRECTION_REFUSED`      | warning  | The sink refused the file's direction.                                                                                      |
| `W_DIRECTION_FORCED`               | `DIRECTION_FORCED`       | warning  | Edges forced to the policy's direction.                                                                                     |
| `E_MIXED_DIRECTION`                | `MIXED_DIRECTION`        | error    | A mixed file under onMixedDirection "error" (fatal).                                                                        |

## Loss codes

The codes `check()` can return before a save, also exported as `GRAPHML_LOSS` from `@graphty/graph-io/graphml`. An `E_` code means the save throws unless you change the graph or the options.

| Code                              | Key                     | Severity            | Meaning                                                                                        |
| --------------------------------- | ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `W_GRAPHML_YFILES_JSON`           | `YFILES_JSON`           | warning             | yFiles nested XML kept as a JSON tree: structure preserved, not byte-exact.                    |
| `W_MUTUAL_AS_UNDIRECTED`          | `MUTUAL_AS_UNDIRECTED`  | warning             | A mutual pair written as one undirected edge; the mark is lost.                                |
| `W_PARENTS_DROPPED`               | `PARENTS_DROPPED`       | warning             | A `parents` (multi-parent) column cannot be written as nested graphs.                          |
| `W_ROLE_DROPPED`                  | `ROLE_DROPPED`          | warning             | A role column GraphML has no slot for (kind, node ids, ...) written as a plain attribute.      |
| `W_GRAPHML_HIERARCHY_REORDERED`   | `HIERARCHY_REORDERED`   | warning             | Containment order differs from index order; node indices change after a round trip.            |
| `W_GRAPHML_PARENT_CYCLE`          | `PARENT_CYCLE`          | warning             | Nodes whose parent chain never reaches a root are written at the top level.                    |
| `W_ID_TEXT_TYPE`                  | `ID_TEXT_TYPE`          | warning             | Node ids that change type after a round trip under the canonical rule.                         |
| `W_GRAPHML_EDGE_ID_TEXT`          | `EDGE_ID_TEXT`          | warning             | A numeric edge id column reads back as string.                                                 |
| `W_GRAPHML_YFILES_GRAPHICS_STALE` | `YFILES_GRAPHICS_STALE` | warning             | A `yfiles.*` graphics column that no longer matches its yFiles tree: only the tree is written. |
| `E_GRAPHML_YFILES_TREE`           | `YFILES_TREE`           | error (save throws) | A yfiles json value that is not a serialisable tree: export() will throw E_COLUMN_TYPE.        |

<!-- generated:end -->
