# graph-io format conformance: specifications, test suites, corpora and checklists

Research date: 2026-09-23. Scope: every format @graphty/graph-io reads or writes -- GEXF, GraphML,
GML, DOT, Pajek, CSV, JSON (several dialects) and Neo4j.

Reference files (42 MB) are under `tmp/format-conformance/downloads/<format>/`. Each folder has a
provenance file giving the origin URL, license and commit of every file:
`downloads/{gexf,graphml}/SOURCES.tsv`, `downloads/{dot,gml,pajek}/SOURCES.txt` and
`downloads/MANIFEST-csv-json-neo4j.tsv`. Helper scripts and behaviour probes are in
`tmp/format-conformance/scripts/` and `tmp/format-conformance/probes/`.

How the "graph-io today" columns were established: by reading `graph-io/src` (every citation is
file:line under `graph-io/src/`). Nothing was run against graph-io. "Silent" means no issue and no
loss note is recorded.

Licence rule of thumb for vendoring fixtures into this MIT package:
- **Safe to copy:** MIT, BSD, Apache-2.0, BSL-1.0, PSF-2.0, and the CC-BY spec examples. Keep the
  attribution.
- **Reference only unless someone decides otherwise:** GPL, LGPL, CDDL, EPL and CC-BY-NC-SA. That
  covers Gephi, igraph, OGDF, Cytoscape, Tulip, Graphviz, JGraphT, SocioPatterns and Batagelj.
- **No stated license:** Newman, SNAP, KONECT, Netzschleuder datasets, neo4j-graph-examples and
  bavla/Nets. Cite them; do not vendor them without checking.

---

## 0. Cross-format findings (read this first)

These affect several formats at once. They are the likeliest "another tool opens it, ours
rejects it" failures.

1. **Only UTF-8 is accepted** (`common/input.ts:146`, `fatal:true`). The UTF-8 BOM is stripped. Any
   other encoding fails with `E_INVALID_UTF8`:
   - A UTF-16 file with a BOM fails. Excel's "Unicode text" export is exactly this: UTF-16LE TSV.
   - An XML file whose prolog says `encoding="ISO-8859-1"` fails. The declaration is never read.
   - A Latin-1 GML file fails, although ISO 8859-1 is the charset the GML spec itself names.
   - A Pajek file without a BOM fails. Pajek writes "ANSI" (a Windows code page) unless a BOM is
     present.
   - A DOT file with `charset=latin1` fails.
   - Windows-1252 CSV from Excel fails.

   What should happen:
   - **UTF-16 with a BOM:** always decode it (TextDecoder supports it).
   - **XML:** honour the encoding declared in the prolog.
   - **Other text formats:** add an `encoding` option. Whether a failed strict UTF-8 decode may fall
     back to Latin-1 / cp1252 *with a warning* is a design decision. It is not silent, so it does
     not break the package's "never a silent U+FFFD" rule. Graphviz already does exactly this.
2. **Default is fine, but test it:** numeric-looking ids follow the canonical rule.
   - `"1"` becomes 1, while `"01"`, `"1.0"` and `"1e0"` stay distinct strings.
   - This matches Graphviz (numerals are strings, so `1.0` is not `1`) and CSV practice.
   - JSON defaults to `ids:"keep"`, so `1` and `"1"` are two nodes. networkx can produce exactly that.
     Right behaviour: a warning when both spellings occur in one file.
3. **Things silently ignored today**, each of which should produce at least a warning:
   - **GEXF:**
     - unknown attributes on `<attribute>`, `<attvalue>`, `<spell>`, viz and `<gexf>`
     - `bigdecimal` / `biginteger` read as string
     - viz `hex` ignored when `r` is present
   - **GraphML:**
     - `attr.list`
     - `parse.nodeids` and the other parse.* hints
     - nested `<desc>`
     - unknown XML attributes on node or edge, such as APOC's `labels=`
     - a whitespace-only typed value
   - **GML:** unknown HTML entities left verbatim.
   - **DOT:** the HTML-string flag is dropped.
   - **CSV:**
     - untrimmed cells
     - an unknown-name header read as a data row
     - adjacency-list rows misread as edges
     - Excel's `sep=` line
   - **JSON:**
     - when both `links` and `edges` are present, `links` is dropped
     - `position.z`
     - integers beyond 2^53 (JSON.parse rounds them)
     - duplicate object keys (the last one wins)
   - **Neo4j:** the id space on `START_ID(space)` / `END_ID(space)`.
4. **Likely crash, not verified by running:** a GML string containing `&#99999999;` makes
   `String.fromCodePoint` throw a RangeError. `common/escape.ts:91-110` decodes it, and
   `report.ts:238-244` rethrows anything that is not a GraphFormatError. The caller would then get a
   raw RangeError instead of an `ImportError`. The same helper may be used elsewhere; check every
   caller.
5. **Formats we do not read at all**, each of which a user will try:
   - Neo4j APOC JSON Lines, and the other APOC JSON shapes: `ARRAY_JSON`, `{nodes,rels}` and
     `JSON_ID_AS_KEYS`.
   - APOC CSV (`_id,_labels,_start,_end,_type`).
   - networkx `adjacency_data` and `tree_data` JSON.
   - Gephi / networkx / igraph adjacency-list CSV and Gephi matrix CSV.
   - The `.graphmlz` (gzip), `.xml.zst` and `.gml.zst` (Netzschleuder) containers.

---

## 1. GEXF

### 1.1 Specification

| Document | URL | Version / notes |
|---|---|---|
| Canonical spec repo (RNC is normative; XSD and RNG are generated by trang) | https://github.com/gephi/gexf | CC-BY-4.0 |
| Schema index | https://gexf.net/schema.html -> `https://gexf.net/{1.1,1.2,1.3}/<module>.{rnc,rng,xsd}` | Site CC-BY-SA-3.0 |
| Primer (non-normative) | https://gexf.net/primer.html ; PDF https://github.com/gephi/gexf/releases/download/1.3/gexf-13-primer.pdf ; TeX `primer/{1.1draft,1.2draft,1.3}` in the repo | |
| GEXF 1.0 DTD | `specs/1.0/gexf10.dtd` in gephi/gexf | Namespace `http://www.gephi.org/gexf` |

**Namespaces by version:**

| Version | Namespace | `version` attribute | Modules |
|---|---|---|---|
| 1.1draft | `http://www.gexf.net/1.1draft` | `"1.1"` | gexf, data, dynamics, hierarchy, phylogenics, viz |
| 1.2draft | `http://www.gexf.net/1.2draft` | `"1.2"` | same as 1.1draft; viz is `http://www.gexf.net/1.2draft/viz` |
| 1.3 | `http://gexf.net/1.3` (no www) | `"1.3"` | gexf, dynamics, viz; viz is `http://gexf.net/1.3/viz` |

In 1.3, data, hierarchy and phylogenics were merged into gexf.

**What 1.3 changed from 1.2:**
- **Edges:**
  - New edge `kind`; (source, target, kind) must be unique, which is what allows parallel edges.
  - Edge `weight` is a double.
  - Edge `id` is optional.
- **Types:** new bigdecimal, biginteger, byte, short and char, plus `list*` versions of every type.
  List syntax changed from pipe-separated `a|b` to `[a, 'b c']`.
- **Time:**
  - New `timerepresentation` (interval | timestamp) and new `timestamp`, `timestamps="<[..]>"`,
    `intervals="<[s,e];[s,e]>"` and `timezone`.
  - `startopen` / `endopen` are removed, and so are start/end on `<attributes>`.
  - `mode="slice"` is new.
- **viz:** new `hex` on color; `z` is optional; dynamic viz is removed.

**What 1.2 changed from 1.1:**
- `timetype` became `timeformat` (default double).
- `slices` became `spells`.
- Colour gained alpha `a`.
- `label` became optional.
- `<meta>` must come before `<graph>`.

**Places where the spec contradicts itself:**
- The 1.3 changelog says `idtype` allows `long`, but the schema lists only string and integer.
- The primer writes `alpha="0.5"`, but the schema attribute is `a`.
- The 1.3 primer says overlapping spells are both "not allowed" and "considered as a unique spell".

### 1.2 Test fixtures (reusable)

| Source | URL / path | License | Covers | Files |
|---|---|---|---|---|
| gexf.net samples | https://gexf.net/data/{hello-world,basic,data,dynamics,hierarchy1,hierarchy4,phylogeny,viz,celegans,yeast,WebAtlas_EuroSiS}.gexf | CC-BY-SA-3.0 (site); data terms unstated | one file per feature page plus 3 real datasets | 11 (downloaded) |
| gephi/gexf primer | `primer/{1.1draft,1.2draft,1.3}/simple.gexf` | CC-BY-4.0 | primer example | 3 (1 downloaded) |
| graphology | github.com/graphology/graphology `src/gexf/test/resources/` + expected values in `test/definitions/parser.js` | MIT | 1.3 lists (pipe, comma, quotes, mixed), hex colour, `kind`, missing_nodes, undeclared_attribute, pedantic and sanitized meta, mixed direction | 21 (16 downloaded) |
| networkx | `networkx/readwrite/tests/test_gexf.py` | BSD-3 | 30 tests, **inline XML**: 1.3, dynamic, INF/NaN, lists, slices and spells, parents, type promotion | 1 (downloaded) |
| gexf4j | francesco-ficarola/gexf4j `src/test/resources/{dynamicGraph,staticGraph,testStaticUtf}.gexf` | Apache-2.0 | dynamic, UTF-8 | 3 (downloaded) |
| Gephi importer tests | gephi/gephi `modules/ImportPlugin/src/test/resources/org/gephi/io/importer/plugin/file/gexf/` | CDDL-1.0/GPL-3.0 | basic, data, dynamicedgeweight, infinity, meta, slice, timezone, zeroweight | 8 (downloaded, reference only) |
| Gephi exporter tests | `modules/ExportPlugin/src/test/resources/.../gexf/` | GPL-3.0 | include-null attvalues, infinity | 2 (downloaded, reference only) |
| OGDF | ogdf/ogdf `test/resources/fileformats/gexf/valid/` | GPL | colour, metadata, hierarchy | 4 (downloaded, reference only) |
| Tulip | Tulip-Dev/tulip `tests/plugins/data/*.gexf` | LGPL-3.0 | older gexf.net copies plus hierarchy2 and hierarchy3 | 21 (2 downloaded) |
| JGraphT | jgrapht-io `nio/gexf/SimpleGEXFImporterTest.java` | EPL-2.0/LGPL-2.1 | 7 inline tests | not downloaded |
| gephi-toolkit-demos | `src/main/resources/.../{timeframe1-3,LesMiserables,Java}.gexf` | no license file | time slices | 5 (3 downloaded) |
| Validation oracle | 1.2draft and 1.3 XSDs | CC-BY-4.0 | validates our exporter's output | downloaded in `downloads/gexf/specs/` |

### 1.3 Real-world corpora

- **Gephi datasets:** https://docs.gephi.org/desktop/User_Manual/Datasets/. Includes diseasome
  (**GEXF 1.0**), photoviz-dynamic (1.1draft), ht2009_15min (1.2draft, dynamic), celegans, eurosis,
  yeast, cpan and codeminer. The asset URLs contain hashes and break easily. Three are downloaded.
- **gexf.net datasets:** https://gexf.net/datasets.html (celegans, yeast, WebAtlas_EuroSiS).
- **SocioPatterns:** http://www.sociopatterns.org/datasets/hypertext-2009-dynamic-contact-network/
  (`ht2009_15min.gexf.gz`, `ht2009_20sec.gexf.gz`). CC-BY-NC-SA-3.0.
- **graphology and sigma.js:** arctic.gexf (918 KB) and rio.gexf (510 KB). MIT.
- **Produced by tools:**
  - Gephi 0.10 writes 1.3 with a float `a`, `kind` and timezone.
  - networkx `write_gexf` writes 1.2draft by default, and 1.1 or 1.3 on request. Its 1.3 output
    uses the xsi namespace `http://w3.org/...` without www. It writes lists and dicts as Python
    repr strings, and INF/-INF/NaN.

### 1.4 Checklist

graph-io source: `formats/gexf/importer.ts` and `schema.ts`.

**Root and versions**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Versions 1.0, 1.1draft, 1.2draft, 1.3; each namespace; namespace missing or wrong (`www.gexf.net/1.3`, `http:///www...` viz); `version` disagreeing with the namespace | Root matched by local name; `version` copied to meta; no version check (701-706, 553) | Accept every variant; record the version. Test every namespace spelling. |
| GEXF 1.0 `<attvalue id=...>` instead of `for=` (diseasome) | `ATTVALUE_SHAPE`; value dropped (1570-1572) | Accept `id` as an alias for `for` when the version is 1.0 or no `for` is given. |
| `<meta>`: creator, keywords, description, lastmodifieddate; two `<meta>` blocks; children using `text=""`; a date that is not xsd; unknown children | Read | Keep the first meta. Unknown child: warn. |

**Graph element**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `defaultedgetype` directed / undirected / mutual; missing (spec: undirected); misspelled `defaultedgestyle` (SocioPatterns) | Supported; other `<graph>` attributes silently ignored | Warn once on an unknown `<graph>` attribute. |
| `mode` static / dynamic / slice; `timeformat` integer / double / date / dateTime; `timerepresentation`; `timezone`; graph `start` / `end` / `timestamp` | Read into meta. `timezone` is not listed. | Apply `timezone` to stamps that carry no zone (Gephi timezone.gexf). |
| 1.1 `<slices><slice>` | `UNKNOWN_ELEMENT`; subtree skipped (1266) | Read slices as spells (networkx also does this). |
| `<nodes>` / `<edges>` `count` wrong versus the actual children | Count is a reserve hint (`COUNT_HINT`) | Hint only; no error when it is wrong. |
| `<edges>` before `<nodes>`, or no `<nodes>` | `MISSING_NODES` | Keep it. |

**Nodes and edges**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Duplicate node id, including in nested nodes | `DUPLICATE_NODE` | Keep it. |
| Edge to an undeclared node | `addMissingNodes` false by default, so it is an error | Keep the strict default. graphology offers the same opt-in. |
| Edge id optional (1.3) or required (1.2); duplicate edge id | `DUPLICATE_EDGE_ID`, edge skipped | Keep it. |
| Per-edge `type`, including mutual; mixed direction | Supported via `DirectionResolver` | Keep it. |
| `weight` default 1, zero weight, INF | Read | Test zeroweight.gexf and infinity.gexf. |
| Parallel edges: with `kind` (1.3), without `kind` (1.2), self-loops | `kind` goes to a dict column | Keep them as a multigraph. Never deduplicate. |

**Attributes**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Types integer, long, float, double, boolean, string, anyURI, liststring (1.2); bigdecimal, biginteger, byte, short, char, list* (1.3); aliases int, bool, character, listint (Gephi and networkx) | All mapped. bigdecimal and biginteger become string **silently**. An unknown type becomes string with `UNKNOWN_ATTR_TYPE`. | Emit a precision or loss warning for big*. Test that the aliases map. |
| `<default>`, `<options>` (1.2 pipe form, 1.3 bracket form); a default or value outside the options | Parsed | A value outside the options: warn. |
| attvalue: `for` names an undeclared attribute; `<attvalue>` without an `<attvalues>` wrapper; several `<attvalues>` blocks | `UNKNOWN_ATTRIBUTE`; the other two are unknown | Warn and keep. Test all three (ht2009, Gephi slice.gexf). |
| Numeric text: INF, -INF, NaN, Infinity, 1e5, -0, empty, integer overflow | INF / NaN accepted; integer overflow gives `E_COLUMN_TYPE` for that value | Keep it. An empty typed value means unset. |
| Lists in 1.3: `[a, b]`, `['a', "b"]`, escaped quote, `[]`, whitespace | `lists.ts:34-40` | Test against graphology's v1_3.gexf expected values. |

**Hierarchy**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `pid` (including forward references), nested `<nodes>`, `<parents><parent for>`, several parents, edges across levels | Supported; resolved at `</graph>` | A `pid` naming a missing node (diseasome `pid="0"`, 1419 times) must be a warning, not a failure. Test it. |

**Dynamics**

| Case | graph-io today | Right behaviour |
|---|---|---|
| start / end, `startopen` / `endopen`, both start and startopen, spells, 1.3 timestamps and intervals, overlapping or touching spells, timed attvalues, dynamic weight | Supported; `SPELL_OPEN_DROPPED`, `OPEN_BOUND_CONFLICT` | Keep it. `end < start`: warn. |

**viz**

| Case | graph-io today | Right behaviour |
|---|---|---|
| color r/g/b/a, 1.3 `hex` + `a`, 8-digit hex, out-of-range values, float r/g/b | 8-digit hex gives `VIZ_VALUE` and is skipped. **`hex` is silently ignored when `r` is present.** | Accept `#RRGGBBAA`. Clamp out-of-range values and warn (as Gephi does). |
| position x, y, optional z; size; thickness; node shape including image + uri; edge shape; unprefixed viz | Supported | Keep it. |

**XML layer and unknowns**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Unknown elements and attributes | Unknown element: warn once. Unknown node/edge attribute: warn. On `<attribute>`, `<attvalue>`, `<spell>`, viz and `<gexf>`: **silent**. | Warn once everywhere. |
| XML-level cases | See section 3 below | |

---

## 2. GraphML

### 2.1 Specification

| Document | URL | Notes |
|---|---|---|
| Specification | http://graphml.graphdrawing.org/specification.html ; element reference /specification/xsd.html ; DTD /dtds/graphml.dtd | Site CC-BY-3.0 |
| Primer (non-normative) | http://graphml.graphdrawing.org/primer/graphml-primer.html | Examples at /primer/{simple,attributes,attributes.ext,hyper,nested,port,svg}.graphml |
| Schemas | `http://graphml.graphdrawing.org/xmlns/{1.0,1.1,1.0rc}/{graphml.xsd,graphml-structure.xsd,graphml-attributes.xsd,graphml-parseinfo.xsd,xlink.xsd}` | Namespace `http://graphml.graphdrawing.org/xmlns` for both 1.0 and 1.1 |
| What 1.1 adds over 1.0 | -- | `data@time`, `key@dynamic`, `key@for="graphml"`, data uniqueness per (key, time) |
| yFiles classic extension (yEd) | http://docs.yworks.com/yfiles/doc/developers-guide/graphml.html ; XSD https://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd | `y:` = `http://www.yworks.com/xml/graphml`. Uses `key@yfiles.type` (nodegraphics, edgegraphics, portgraphics, resources) and `node@yfiles.foldertype` (group, folder, leaf). XSDs downloaded; no license stated. |
| yFiles 3 / yFiles for HTML dialect | https://docs.yworks.com/yfiles-html/dguide/customizing_io/customizing_io_graphml.html | `xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0"`, `y:attr.uri` keys, `x:` markup |

**Schema constraints:**
- **Keys:** `key@id` is required and unique in the document. `for` is one of all (the default),
  graphml, graph, node, edge, hyperedge, port or endpoint.
- **Types:** `attr.type` is boolean, int, long, float, double or string. It is optional, and a
  missing one means string.
- **Graphs:** `graph@edgedefault` is **required**.
- **Node ids:** required, unique in the whole document including nested graphs, and of type
  NMTOKEN (no spaces).
- **Edges:**
  - `id` optional; `directed` optional boolean; `sourceport` / `targetport` optional.
  - An edge may contain a nested graph.
  - An edge must be declared in a graph that is an ancestor of both of its endpoints.
- **Hyperedges:** `endpoint@type` is in, out or undir.
- **Parseinfo attributes:**
  - `parse.nodeids` / `parse.edgeids` are canonical or free.
  - `parse.order` is nodesfirst, adjacencylist or free.
  - `parse.nodes`, `parse.edges`, `parse.maxindegree` and `parse.maxoutdegree` are counts.
  - On a node: `parse.indegree` and `parse.outdegree`.
- **Fallback for readers without nesting support (from the primer):** keep only the top-level
  nodes and the edges whose endpoints are both at the top level.

### 2.2 Test fixtures

| Source | Path | License | Covers | Files |
|---|---|---|---|---|
| GraphML primer examples | graphml.graphdrawing.org/primer/*.graphml | CC-BY-3.0 | simple, attributes, xlink, hyperedges, nested, ports, svg | 7 (downloaded) |
| graphology | `src/graphml/test/resources/` | MIT | multigraph, mixed_multigraph, miserables_broken | 6 (downloaded) |
| TinkerPop | `data/tinkerpop-{modern,classic}.xml`, gremlin-test `io/graphml/{graph-types,graph-types-bad,graph-no-edge-ids}.xml`, `graphml-1.1.xsd` | Apache-2.0 | every attr.type, an unknown type, unparseable values, no edge ids | 6 (downloaded) |
| Boost.Graph | `test/graphml_test.xml` | BSL-1.0 | per-type defaults, graph data, a node id with spaces | 1 (downloaded) |
| networkx | `readwrite/tests/test_graphml.py` | BSD-3 | 41 tests, **inline XML**: multigraph ids, hyperedge raises, yfiles, booleans, long, unicode | 1 (downloaded) |
| igraph | `tests/unit/graphml-*.xml`, `tests/regression/{invalid1-6,bug_1970,bug_2506_1-3,cattr_bool_bug*}.graphml`, `fuzzing/test_inputs/*.graphml`; expected output in `igraph_read_graph_graphml.out` | GPL-2.0+ | no namespace, `ns3:` prefix, unknown entity, whitespace, defaults, yFiles 3, duplicate or empty key ids, fuzz crashers | 25 (downloaded, reference only) |
| JGraphT | `jgrapht-io/.../nio/graphml/{GraphMLImporterTest,SimpleGraphMLImporterTest}.java` | EPL-2.0/LGPL-2.1 | 32 inline tests: hyperedges, nesting, validation, duplicate node, xlink, graphml-level data, **invalid APOC output** | not downloaded |
| OGDF | `test/resources/fileformats/graphml/valid/` | GPL | hyperedges, long lines, nesting | 6 (reference only) |
| Gephi | `ImportPlugin/.../file/{cdata,withdesc}.graphml` | GPL-3.0 | CDATA, `desc` | 2 (reference only) |
| Cytoscape | cytoscape-impl `graphml-impl/src/test/resources/` | LGPL-2.1 | desc, igraph output | 5 (2 downloaded) |
| GraphStream | gs-core `example{,-extraattributes}.graphml` | LGPL-3.0/CeCILL-C | keys without name or type; undeclared XML attributes | 2 (downloaded) |
| APOC GraphML | neo4j/apoc `core/src/test/resources/fileWithUnicode.graphml` | Apache-2.0 | the APOC flavour (`labels=":A:B"`) | 1 (in `downloads/neo4j/apoc`) |

### 2.3 Real-world corpora

- **Netzschleuder:** `https://networks.skewed.de/net/<name>/files/<net>.xml.zst`. This is GraphML
  written by graph-tool, and it uses non-standard `attr.type` values: short, vector_float,
  vector_string, python::object. karate-78 and dolphins are downloaded.
- **graphdrawing.org benchmark sets:** http://www.graphdrawing.org/data/{north-graphml.tgz (1277
  graphs), rome-graphml.tgz, random-dag-graphml.tgz}. They are written by yFiles with a DOCTYPE
  SYSTEM DTD, **no namespace and no edgedefault**. north-graphml.tgz is downloaded.
- **Gephi datasets:** airlines.graphml (downloaded).
- **TinkerPop:** grateful-dead.xml (976 KB) and air-routes.xml (9.4 MB). Apache-2.0.
- **Internet Topology Zoo:** topology-zoo.org (GraphML). The site was unreachable on 2026-09-23. A
  possible mirror is github.com/stavsta/tpzgraphml (not verified).
- **Produced by tools:**
  - networkx: key ids `d0, d1...`.
  - igraph: keys `v_<name>` / `e_<name>` / `g_<name>`, node ids `n0..`.
  - yEd: `y:` graphics and the resources key.
  - Gephi.
  - Neo4j APOC: undeclared keys plus `labels=` attributes.
  - Cytoscape.

### 2.4 Checklist

graph-io source: `formats/graphml/importer.ts` and `constants.ts`.

**Root and keys**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Default namespace, no namespace, `ns3:` prefix, 1.0rc namespace, any schemaLocation, a DOCTYPE with a SYSTEM DTD | Local names; DOCTYPE skipped, not fetched | Keep it. Test the no-namespace, prefix and DOCTYPE cases (the North and igraph files). |
| `key for="graphml"`, including **yEd's `yfiles.type="resources"` key, present in every yEd file** | **`KEY_FOR_INVALID`, recorded as an error that counts toward `errorLimit`**; the root `<data>` then gives `KEY_DOMAIN` | `for="graphml"` is valid in GraphML 1.1. Accept it and put document-level data into graph attributes or meta. The yEd resources can be kept as json or skipped with a single warning. **High priority: this reports an error on every yEd file.** |
| `for` hyperedge / port / endpoint | `KEY_DOMAIN_UNSUPPORTED`; data dropped | Keep it, but it is a warning, not an error. |
| Same key id twice across different `for` values (Gephi cdata.graphml); an empty key id; duplicate or empty `attr.name`; no `attr.name` (use the id) | `DUPLICATE_KEY`, `KEY_MISSING_ID` | Duplicate id: warn and keep the first (as Gephi does). No `attr.name`: fall back to the key id. |
| `attr.type`: the six types; missing; unknown (TinkerPop's "nothing-supported..."); graph-tool's `vector_*` / `short` / `python::object` | A missing type is string with no warning. An unknown type is string with `UNKNOWN_ATTR_TYPE`. | Map `short` to i32 and parse `vector_*` as lists. The rest is unchanged. |
| `attr.list` (GraphML 1.1 / Boost) | **Silently ignored** | Honour it, or at least warn. |
| `<default>`; a typed default containing elements | Parsed; `DATA_NESTED` | Keep it. |

**Data values**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `<data>` for an undeclared key (APOC); `<data>` without `key`; duplicate `<data>` for one key; `<data>` before or after nodes; data at the graphml level | `UNKNOWN_KEY`, `DATA_MISSING_KEY`; root data goes to the graph table | An undeclared key: warn and keep the value as a string. JGraphT's `testNonValidApoc` shows real APOC files need this. |
| Typed values: booleans true/false/1/0 in any case, INF/-INF/NaN, int and long overflow, unparseable text, **whitespace-only text** | Declared-types rules. **A whitespace-only non-string value is silently unset.** | An unparseable value: error per value, or keep as a string with a warning. Whitespace-only: warn. |
| Leading and trailing whitespace in string data (igraph graphml-whitespace.xml) | Kept verbatim | Keep it. |
| CDATA, entities, `&unknown;` | CDATA is ordinary text; an unknown entity is fatal | Fatal is correct under XML (igraph is lenient). Keep fatal but say which entity. |

**Graph and structure**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `edgedefault` missing (all North/Rome files) | Warning; falls back to `defaultDirected` (false) | Keep it. |
| Per-edge `directed` true/false; `directed="1"` / `"0"` / `"True"` | Anything else is `INVALID_DIRECTED` and the **edge is skipped** | Accept 1/0 and any case, as networkx does, with a warning. Skipping edges is data loss. |
| Several top-level graphs | Merged, with `MULTIPLE_GRAPHS` | Acceptable. igraph instead selects a graph by index. |
| A node id with spaces (Boost); duplicate node; missing node id; edge to an undeclared node; edge before its nodes; no edge ids; parallel edges; self-loops | `addMissingNodes` true by default | Keep it. Test every one. |
| Nested graphs, several levels deep; an edge declared at the LCA or at the top; **a graph inside an edge**; a nested graph with its own edgedefault; yEd `yfiles.foldertype="group"` | Parent column; `NESTED_GRAPH_DATA` drops the nested graph's data; a graph inside an edge is not handled | A graph inside an edge: warn. Test the yEd group. |
| Hyperedges (in / out / undir) and ports: `<port>` including nested ports, `sourceport`, `targetport`, data on a port | Hyperedges follow the `hyperedges` option (default skip). `<port>` elements are warned and dropped; the port strings are kept. | Keep it. |
| `parse.*` hints; counts that are wrong | Only parse.nodes and parse.edges are used; the rest are silently ignored | That is fine, because they are hints. |
| `<desc>`; `<locator xlink:href>` | `DESC_DROPPED`; a nested `desc` is silent; `LOCATOR_DROPPED` | Never fetch a locator. Keep the warning. |
| Unknown XML attributes on node or edge (APOC `labels=`, GraphStream `label=`, `xlink:href`) | **Silently ignored** | Warn once. Optionally read the APOC `labels=` attribute. |

**yFiles**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Classic yFiles (ShapeNode Geometry, Fill, NodeLabel, PolyLineEdge); yFiles 3 (`y:attr.uri`) | A json column plus a `W_GRAPHML_YFILES_JSON` loss note | Better: map `Geometry` x/y to position and `NodeLabel` to label, since users expect a yEd layout to survive. Test both dialects. |
| `.graphmlz` (gzip) | Not handled | Optional: decompress with `DecompressionStream`. |

---

## 3. XML layer shared by GEXF and GraphML

graph-io source: `common/xml.ts`.

| Case | graph-io today | Right behaviour |
|---|---|---|
| UTF-8 with or without BOM | Supported | Keep it. |
| UTF-16LE / UTF-16BE with a BOM | **Fatal `E_INVALID_UTF8`** | Detect the BOM and decode (XML 1.0 requires parsers to support UTF-16). |
| `<?xml ... encoding="ISO-8859-1"?>` or `windows-1252` | **Fatal on any byte >= 0x80**; the declaration is ignored | Read the declared encoding from the first bytes and decode with it (TextDecoder supports it). Test a Latin-1 file. |
| No XML declaration; `standalone="yes"` | Supported | Keep it. |
| Predefined entities; `&#233;` and `&#xE9;`; CDATA; comments; PIs; a comment before the root | Supported | Keep it. |
| An undeclared named entity (`&nbsp;`) | Fatal | Correct under XML. The message should name the entity. |
| DOCTYPE with an internal subset that declares entities (billion laughs, XXE) | The DOCTYPE is skipped and its entities are never expanded, so an entity use becomes a fatal "unknown entity" | This is safe. Add explicit tests for a billion-laughs file and a `SYSTEM "file:///etc/passwd"` file. Both must fail fast or be ignored, never fetch anything, and never expand. |
| Namespace prefixes, wrong namespace URIs | Not resolved; local names are used | Lenient, and matches Gephi and igraph. Test `<gexf:node>` and `<ns3:graph>`. |
| Attribute-value normalisation (tab and newline become a space), CRLF to LF | Supported | Keep it. |
| Truncated or not-well-formed input, a second root, text outside the root | Fatal | Keep it. Test the igraph invalid1-6 files and graphology miserables_broken.graphml. |
| Illegal XML 1.0 characters (control characters) | Fatal | Keep it. |
| Very long lines (OGDF long-line.graphml); huge files | Streaming tokenizer | Test it. |
| Empty graphs: `<nodes/><edges/>`, `<graph/>`, no `<nodes>` element | ? | Test all three; the result should be an empty graph with no error. |

---

## 4. GML

### 4.1 Specification

**Himsolt, "GML: A portable Graph File Format", Universitaet Passau, about 1996-97 (8 pages).**
- The original URL is dead. Archive copy:
  http://web.archive.org/web/20190718030537/http://www.fim.uni-passau.de:80/fileadmin/files/lehrstuhl/brandenburg/projekte/gml/gml-technical-report.pdf
- HTML mirror: http://thundermag.free.fr/gml-tr.html
- Downloaded as `downloads/gml/gml-technical-report.pdf`.

**Himsolt, "GML: Graph Modelling Language", DRAFT, 19 Dec 1996 (32 pages, Graphlet manual).**
- Archive copy:
  http://web.archive.org/web/20061209102127/http://www.infosun.fmi.uni-passau.de:80/Graphlet/download/misc/GML.ps.gz
- Downloaded as `downloads/gml/GML-manual.ps.gz`.

**Grammar:**
- `GML ::= List`
- `List ::= (ws* Key ws+ Value)*`
- `Value ::= Integer | Real | String | [ List ]`
- `Key ::= [a-zA-Z][a-zA-Z0-9]*`
- `Integer ::= sign digit+`
- `Real ::= sign digit* . digit* mantissa`
- `String ::= " instring "`, where `instring ::= ASCII - {&,"} | &name;`

**Other rules:**
- A line starting with `#` is a comment. The draft allows whitespace before the `#`.
- Lines and keys are at most 254 characters.
- Text is 7-bit ASCII. Any other character is written as an ISO 8859-1 `&name;` entity, and `"`
  and `&` must be escaped that way.
- **A newline inside a string is part of the string** (draft 3.2.5).
- **Duplicate keys are legal and their order must be kept.** Unknown keys should be kept.
- Integers are 32-bit; larger values are written as strings.
- A key starting with a capital letter is "unsafe": treat it as stale once the graph changes.
  Examples: `Creator`, `IsPlanar`.
- Neither document assigns any meaning to keys starting with `_`. That is later de-facto usage:
  graph-tool writes `_pos`.

**Standard keys:**
- `graph`, `Version`, `Creator`, `directed` (default undirected).
- On nodes: `node`, `id`, `label`, `comment`.
- On edges: `edge`, `source`, `target`.
- `graphics [ x y z w h d type fill outline width Line [ point [ x y ] ] arrow ]`.
- `LabelGraphics` is a yFiles extension, not part of the spec.

**Dialects:**
- **networkx:** https://networkx.org/documentation/stable/reference/readwrite/gml.html
  - `#` starts a comment anywhere outside a string.
  - Strings must be on one line.
  - HTML4 entities are decoded through `html.unescape`.
  - `NAN` and `INF` are accepted in uppercase only.
  - A repeated key becomes a list, and `_networkx_list_start` preserves a one-element list.
  - `multigraph 1` plus `key`.
  - Nodes are keyed by label by default.
  - Only one graph is allowed.
- **igraph:** https://igraph.org/c/doc/igraph-Foreign.html
  - Newlines inside strings are kept.
  - Only the 5 XML entities are decoded.
  - A missing node id is auto-generated.
  - A `Version` other than 1 is a warning.
  - The first graph is used.
  - Nesting is limited to 32 levels.
- **yEd:** https://docs.yworks.com/yfiles/doc/developers-guide/gml.html
  - `Version 2.18`, `hierarchic`, `isGroup` / `gid`.
  - Colours `#RRGGBB[AA]`, plus `LabelGraphics`.
- **graph-tool (Netzschleuder):**
  - Ids start at 0; keys begin with `_` (`_pos`).
  - Vectors are written as `"x, y"`.
  - HTML5 entities such as `&NewLine;` appear. networkx cannot read these files.

### 4.2 Test fixtures

| Source | Path | License | Covers | Files |
|---|---|---|---|---|
| networkx | `readwrite/tests/test_gml.py` | BSD-3 | 23 test functions, inline: a Cytoscape bug case, quotes, unicode, special floats, 30+ parse-error cases, out-of-range integers, multi-line strings | 1 (downloaded) |
| igraph | `tests/unit/*.gml`, `tests/regression/invalid*.gml`, `fuzzing/test_inputs/graph1.gml` (yEd output), plus `gml.c` / `.out` | GPL-2.0+ | composite values, `+2`, `-Inf`, `+inF`, entities, `sou_rce`, `Version 3`, `directed 2`, nodes without id, `graph []`, malformed input | 13 (downloaded, reference only) |
| OGDF | `test/resources/fileformats/gml/{valid,invalid,cluster}` | GPL | ambiguous or missing id/source/target, no graph, clusters | 13 (reference only) |
| Gephi | `ImportPlugin/.../file/{emojis,label}.gml` | GPL-3.0 | bare-word ids, emoji | 2 (reference only) |
| JGraphT | `GmlImporterTest.java` | EPL-2.0/LGPL-2.1 | 20 inline tests | not downloaded |

### 4.3 Real-world corpora

**Mark Newman's network data:** https://public.websites.umich.edu/~mejn/netdata/. The index page
returns 403, but individual files download. No license is stated; cite the source papers. All 16
zips are downloaded to `downloads/gml/newman/`:
- karate: no labels.
- lesmis: `value` weights.
- polbooks, adjnoun, football, dolphins, netscience.
- power: no labels.
- celegansneural: **14 duplicate arcs, with no multigraph flag**.
- polblogs: **65 duplicate arcs, 3 self-loops, `&#38;`, and a node key named `source`**.
- hep-th, astro-ph, cond-mat.
- cond-mat-2003 and cond-mat-2005: **21 and 34 duplicate labels**.
- as-22july06.

**Other sources:**
- **Netzschleuder:** `https://networks.skewed.de/net/<name>/files/<net>.gml.zst`, in graph-tool's
  dialect. karate and lesmis are downloaded.
- **igraph's yEd sample:** `fuzzing_test_inputs_graph1.gml` is real yEd output.

### 4.4 Checklist

graph-io source: `formats/gml/syntax.ts`, `importer.ts` and `common/escape.ts`.

**Lexing and values**

| Case | graph-io today | Right behaviour |
|---|---|---|
| **A multi-line string** (spec: the newline is part of the string; igraph keeps it) | **Fatal `E_SYNTAX`** (syntax.ts:272-279) | Accept it and keep the newline; turn CRLF inside the string into LF. |
| Entities: the 5 XML names, `&#NN;`, `&#xHH;`, `&eacute;`, `&auml;` (in the spec's own examples), `&NewLine;` (graph-tool), unknown `&foo;`, a stray `&`, `&#99999999;` | Numeric and the 5 XML names are decoded. **Other names are left verbatim, silently.** An out-of-range numeric reference **probably throws a RangeError**. | Decode the full HTML5 named-entity set. An unknown name: keep it verbatim and warn once. An out-of-range code point: warn and keep the text. |
| Raw Latin-1 bytes (the spec charset) | Fatal `E_INVALID_UTF8` | See cross-format finding 1. |
| Keys: `[A-Za-z_][0-9A-Za-z_]*` including a leading `_`; keys over 254 characters | Accepted; no length limit | Keep it. graph-tool's `_pos` must parse. |
| Reals: `1.0E5`, `.5`, `5.`, `1E5`, `-0`, `+1`; NAN / INF in any case | Accepted | Keep it; `-0.0` stays a real. |
| Integers above 32 and 53 bits | f64, plus `PRECISION` beyond 2^53 | Keep it. |
| `#` comments at column 0, indented, trailing | Supported outside strings | Keep it. |
| Nested lists at any depth; empty `[ ]` | json columns | Add a depth guard of at least 256, giving an error beyond it. |
| Duplicate keys | Become a list column; `_networkx_list_start` supported | Keep it. |
| Whitespace: tabs, `graph[node[`, CRLF, bare CR, no final newline, long lines | ? | Test all of them. |
| Truncated file, unterminated string, unmatched `]`, trailing garbage, empty file | Fatal | Keep it, with line and column. |

**Structure**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Missing `graph`; `graph []` | `E_GML_NO_GRAPH`; an empty graph | Keep it. |
| **Several `graph` blocks** | **Fatal `E_GML_SECOND_GRAPH`** | Use the first graph and warn, as igraph does. Fatal throws away a readable graph. |
| `directed`: 0, 1, absent, 2, a string, repeated | Other integers count as truthy with a warning; a non-integer is an error and the default applies | Keep it. |
| Per-edge `directed` key | Stored as a plain attribute, silently | Acceptable, because GML has no per-edge direction. |
| **String or bare-word node ids** (`id "a"`, `id a`) | **`ID_TYPE`; the node is skipped** | networkx and Gephi accept these. Accept them, keyed by exact value, and warn that they are outside the spec. |
| A node without an id | `MISSING_ID`, skipped | For an isolated node, generate an id and warn, as igraph does. |
| Duplicate node id; edge missing source or target; edge to an undefined node | Error | Keep it. |
| Edge before its nodes | ? | Must work (order does not matter in GML). Test it. |
| Multi-edges without `multigraph 1` (celegansneural, polblogs); undirected A-B plus B-A; self-loops | Kept | Keep them. A warning is optional. |
| Label used as id; duplicate labels (cond-mat-2005) | `nodeIdFrom:"label"` is opt-in; `LABEL_MERGED` | Keep it. |
| `graphics` x/y/z becomes position; `fill`, `outline`, `w`, `h`, `Line/point`, `LabelGraphics` | x/y/z become position; the rest goes to a json column | Optionally map `fill` / `w` to style; keep the rest. |
| `Creator` and `Version`; a Version other than 1; yEd `hierarchic` | Kept in meta | A Version other than 1: warn. |

---

## 5. DOT (Graphviz)

### 5.1 Specification

| Document | URL | Version |
|---|---|---|
| DOT grammar | https://graphviz.org/doc/info/lang.html | Last modified 2024-09-28; not tied to a release. Current Graphviz is 16.1.0 (2026-09-04). |
| Attributes | https://graphviz.org/doc/info/attrs.html ; per-attribute pages e.g. https://graphviz.org/docs/attrs/charset/ , https://graphviz.org/docs/attr-types/escString/ | |
| HTML-like labels | https://graphviz.org/doc/info/shapes.html#html | |
| Reference implementation (more permissive than the doc) | gitlab.com/graphviz/graphviz `lib/cgraph/scan.l` and `lib/cgraph/grammar.y` | EPL-2.0 |

The grammar, the ID forms, the comment rules and the scanner behaviour the doc omits are
summarised in the checklist below. The full grammar is in `downloads/dot/spec/`.

### 5.2 Test fixtures

| Source | Path | License | Covers | Files |
|---|---|---|---|---|
| Graphviz `tests/graphs` | https://gitlab.com/graphviz/graphviz/-/tree/main/tests/graphs | EPL-2.0 | clusters, HTML, records, ports, Latin1.gv, russian.gv, the large `b*.gv` graphs | 260 .gv (downloaded) |
| Graphviz issue reproductions | `tests/*.dot` plus `tests/test_regression.py` (326 tests) | EPL-2.0 | 1411 (line numbers after multi-line strings), 1367 (invalid UTF-8), 2481 (mixed-case keywords), 191 (unquoted comma list must be an error) | 213 .dot (204 downloaded; the files over 1 MB were skipped) |
| Graphviz `tests/regression_tests` | same repository | EPL-2.0 | .gv files with reference svg and xdot | 59 (downloaded) |
| Graphviz gallery | gitlab.com/graphviz/graphviz.gitlab.io `content/en/Gallery` | EPL-2.0 | real-world style graphs | 47 (46 downloaded) |
| pydot | github.com/pydot/pydot `test/` | MIT (the `graphs/` files are copies of old Graphviz tests, so treat them as EPL) | graphs/, my_tests/ (escaped newlines, quoted labels, `#` inside HTML, numeric and unicode ids), test_parser.py | 227 (downloaded) |
| ts-graphviz | github.com/ts-graphviz/ts-graphviz `packages/ast/src/dot-shim/parser/parse.test.ts` plus the peggy grammar | MIT | 68 parser tests, including nesting, size and chain limits | 47 .dot (43 downloaded) |
| graphlib-dot | github.com/dagrejs/graphlib-dot `test/read-one-test.js` | MIT | 60 cases: number followed by letter, the first subgraph wins, default scoping, strict | downloaded |
| tree-sitter-dot | github.com/rydesun/tree-sitter-dot `test/corpus/{blocks,ids,statements}.txt` | MIT | ids, numbers, strings, HTML, ports, comments, case | 3 (downloaded) |
| JGraphT | `jgrapht-io/.../nio/dot/DOTImporter{1,2}Test.java` plus `DOT.g4` | EPL-2.0/LGPL-2.1 | about 40 inline edge cases | downloaded |
| Gephi | `ImportPlugin/.../file/dot/*.dot` | CDDL/GPL-3.0 | 18 files: attribute statements, chained attributes, hash comments, no spaces | reference only |
| @hpcc-js/wasm | github.com/hpcc-systems/hpcc-js-wasm | Apache-2.0 | Graphviz compiled to WASM | Usable as a **reference oracle** in Node: parse each corpus file with real Graphviz and compare node and edge counts |

### 5.3 Real-world corpora

- **Graphviz gallery (downloaded):**
  - unix.gv, crazy.gv, world.gv
  - Linux_kernel_diagram.gv and UML_Class_diagram.gv (HTML labels)
  - datastruct.gv (record ports), fsm.gv, cluster.gv
  - root.gv, twopi2.gv, networkmap_twopi.gv (several MB)
  - gd_1994_2007.gv, softmaint.gv, siblings.gv
  - pprof.gv and git.gv (tool output)
- **Large graphs:** `tests/graphs/b100.gv` and `b104.gv` (782 KB each).
- **Tools that write DOT:**
  - Verified: `terraform graph`; LLVM `opt -passes=dot-cfg`.
  - Not verified: Go `pprof -dot`, `bazel query --output=graph`, `cargo depgraph`, Doxygen with
    `DOT_CLEANUP=NO`, GStreamer `GST_DEBUG_DUMP_DOT_DIR`, Maven `dependency:tree -DoutputType=dot`,
    pipdeptree `-o graphviz-dot`.

### 5.4 Checklist

"GV" means what Graphviz does: its source code, checked against probes run on the local 2.43
binary. graph-io source: `formats/dot/tokenizer.ts` and `importer.ts`.

**Header, keywords and ids**

| Case | GV | graph-io today | Right behaviour |
|---|---|---|---|
| `strict` / `graph` / `digraph`; named, anonymous, numeral or quoted name | OK | Supported | Keep it. |
| Keywords in any case (`DiGraph`, `NODE`, `SubGraph`) | OK | Supported | Keep it. |
| A bare keyword used as an id (`node -> b`); a quoted keyword (`"node"`) | Error; a quoted keyword is an ordinary id | Supported | Keep it. |
| Numerals `1`, `1.0`, `01`, `-.5`, `.5` | All distinct names | `-.5` and `1.` lex correctly. Canonical ids turn `1` into the number 1; `1.0` and `01` stay strings. | Test that `1`, `1.0` and `01` are three distinct nodes. |
| `2x`, `1.2.3`, `1e3` | Split into two tokens, with a warning | Split, with `NUMERAL_AMBIGUITY` | Keep it. |
| Unquoted non-ASCII id | OK | Supported | Keep it. |

**Strings**

| Case | GV | graph-io today | Right behaviour |
|---|---|---|---|
| `\"` and `\\` inside a quoted string | Only `\"` is unescaped; `\\` stays as two characters | Same | Keep it. |
| escString sequences `\N \G \E \T \H \L \n \l \r` | Expanded at layout time | Kept literally | Keep them raw at import. Expanding them for display belongs to the renderer. |
| Backslash-newline inside a quoted string; a raw newline in a quoted string | The first joins the lines; the second is kept | Same | Keep it. |
| `"a" + "b"`; `+` next to an unquoted id | Concatenated; the unquoted case is an error | Quoted only | Keep it. |
| HTML strings with nested `<>` and entities; an unbalanced `<` | Stored raw with an HTML flag; unbalanced is an error | Kept verbatim, but **the HTML flag is dropped**, so `<b>` and `"<b>"` become the same text | Keep an HTML marker, e.g. a column flag or a typed value, so the exporter can write `<...>` again. Add a nesting cap (ts-graphviz uses 100). |

**Comments, separators and multiple graphs**

| Case | GV | graph-io today | Right behaviour |
|---|---|---|---|
| `//`, `/* */`; an unterminated `/*` | Comments; the unterminated one is an error | Same | Keep it. |
| `#` at the start of a line; an **indented `#`**; a mid-line `#` | All ignored to the end of the line (the last is undocumented) | **Only column 0 works; an indented `#` is fatal** | Accept `#` to the end of the line wherever it is outside a string, as Graphviz does. |
| A `# N "file"` line directive | Resets line numbers | Skipped | Keep it. |
| `;` and `,` optional; `a, b -> c` (comma node list, outside the doc grammar) | Accepted; yields a->c and b->c | Comma node list: unknown | Test it; accept it. |
| Several graphs in one file | `dot` renders each one | First graph only, with `MULTIPLE_GRAPHS` | Keep it. Returning a list would be a public API decision. |
| Empty file; only comments; `graph {}`; a missing `}` | No graph; OK; error | `EMPTY_INPUT` / fatal | Keep it. |

**Subgraphs, edges and attributes**

| Case | GV | graph-io today | Right behaviour |
|---|---|---|---|
| Named, anonymous and bare `{}` subgraphs; the same name reused (they merge) | OK | Supported | Test the reuse case. |
| `cluster` name prefix; `cluster=true` | Clusters | Container node plus parent | Keep it. |
| A node in several subgraphs or clusters | Allowed | `CLUSTER_CONFLICT`: first kept | Acceptable with the warning, because the data model has one parent. |
| `{a b} -> {c d}` (4 edges); a subgraph as one endpoint; a chain `a->b->c [attrs]` | OK | Supported | Keep it. |
| Ports `a:p`, `a:p:ne`, `a:ne`, `a:_`, `a:c` | OK | Raw text; a port on a node statement is dropped with a warning | Keep it. |
| Several attribute lists `[x=1][y=2]`; `,` / `;` / space separators | Merged; the last wins | Supported | Keep it. |
| An unquoted comma list as a value (`fontname=Vera Sans, DejaVu`) | Error (issue 191) | ? | Test it; it must be an error. |
| An attribute with no value (`[a]`) | Error | ? | Test it; it must be an error. |
| `node` / `edge` defaults | Apply only to objects created later, inside that subgraph and its children | Node defaults apply only at creation (1099-1111) | Test the `edge_default_scope` probe. |
| Subgraph inheritance | Takes the value as of the moment the subgraph is defined | Copied when the scope opens | Keep it. |
| `strict` with repeated edges, `b--a` against `a--b`, one self-loop | Merged, latest attributes win; the self-loop is kept once | `STRICT_MERGED` | Keep it. |
| Edge `key` | Names the edge | Edge-id column; `KEY_MERGED` | Keep it. |
| **`--` in a digraph, or `->` in a graph** | **Fatal syntax error** | Warning `EDGE_OPERATOR` by default; the edge is kept | Being more lenient than Graphviz is acceptable, since it rejects nothing Graphviz accepts. Keep the warning and document that Graphviz rejects such files. |
| `charset=latin1` | Decoded as Latin-1; invalid UTF-8 without a charset gives a warning and Latin-1 | **Fatal `E_INVALID_UTF8`** | Honour `charset`; see cross-format finding 1. |
| UTF-8 BOM; CRLF; `@` outside a string; attribute macros `graph x = [...]` | BOM ignored; OK; error; warning | BOM stripped; the others need tests | Test them. |

**Size limits**

| Case | GV | graph-io today | Right behaviour |
|---|---|---|---|
| Very long strings (200k characters); 50k edges on one line; nesting 3000 deep; a long chain | Parses; fails at about 5000 levels of nesting | Nesting capped at 1024 (`NESTING`) | Keep it, with a clear error message. |

---

## 6. Pajek (.net, .paj)

### 6.1 Specification

**Pajek Reference Manual 6.02 (1 Jan 2026):** http://mrvar.fdv.uni-lj.si/pajek/pajekman.pdf
(downloaded). Relevant sections: 2 (data objects), 5.3 (network on an ASCII file), 5.4 (Unicode),
8 (colours), and Table 1 (time events). The manual says it is free for non-commercial use.

**Also relevant:**
- DrawEPS parameters: http://mrvar.fdv.uni-lj.si/pajek/DrawEPS.htm (archive copy at
  web.archive.org/web/20240520214138/http://vlado.fmf.uni-lj.si/pub/networks/pajek/doc/draweps.htm).
- Changelog: http://mrvar.fdv.uni-lj.si/pajek/history.htm
- Multiple relations: http://mrvar.fdv.uni-lj.si/sola/info4/multinet/multinet.htm

**There is no formal grammar anywhere.**

**Object types:** .net, .clu (partition), .per (permutation), .cls (cluster), .hie (hierarchy) and
.vec (vector). A `.paj` file concatenates any of them, and `.tim` holds events.

**Vertex lines:** `n label [x y z] [shape] [params]`.
- An unquoted label ends at the first blank.
- Coordinates run from 0 to 1.
- Shapes: ellipse, box, diamond, triangle, cross, empty, house, man, woman.
- Parameters: `s_size x_fact y_fact phi r q ic bc bw lc la lr lphi fos font url`.

**Arc and edge lines:** `v1 v2 value [params]`.
- The value is formally required, but real files omit it.
- Parameters: `w c p s a ap l lp lr lphi lc la fos font h1 h2 a1 k1 a2 k2`.

**Colours:** about 96 names, plus `RGBrrggbb`, `RGB(r,g,b)`, `CMYKccmmyykk` and `CMYK(c,m,y,k)`.

**Unicode:**
- Pajek reads UTF-8 **only when there is a BOM**; otherwise the file is ANSI.
- `&#dddd;` inside an ASCII file is decoded.
- A literal `\n` in a label is a line break.

**Other syntax:**
- Relations: `*Arcs :k "name"`.
- Two-mode networks: `*Vertices n n1`.
- Time intervals: `[5-10]`, `[2-*]`, `[1,3,5]`. These come from real files and statnet's docs; the
  current manual does not define them.

**Dialects:**
- **networkx `read_pajek`:** splits lines with shlex, keys nodes by label, and has no comments,
  2-mode, relations or BOM support.
- **igraph** (https://igraph.org/c/doc/igraph-Foreign.html):
  - Caseless; the BOM is skipped; `%` works at column 0 only.
  - Unknown sections are skipped with a warning.
  - 2-mode networks get a `type` attribute.
  - The last section header decides the direction.
- **statnet `read.paj`:** reads .paj projects, Partition, Vector and time intervals.
  https://search.r-project.org/CRAN/refmans/network/html/read.paj.html
- **Gephi:** reads the third vertex number as size (a bug).

### 6.2 Test fixtures

| Source | Path | License | Covers | Files |
|---|---|---|---|---|
| networkx | `readwrite/tests/test_pajek.py` | BSD-3 | 9 inline tests: arcs, matrix, unicode, quotes | 1 (downloaded) |
| igraph | `tests/unit/*.net` (pajek1..6: CR, CRLF and LF; `*Edges 9` counts; arcslist; edgeslist; 2-mode lists; a rectangular matrix with an extra column; a signed matrix; UTF-8 BOM plus custom parameters), `tests/regression/invalid_pajek*.net` (bad 2-mode headers, id 0), `examples/simple/links.net`, plus `.out` expectations | GPL-2.0+ | the broadest Pajek edge-case set available | 17 (downloaded, reference only) |
| Pajek teaching data | `mrvar.fdv.uni-lj.si/sola/info4/multinet/DATA/` | none stated | `*Arcs :k`, `*Arcslist :k`, `*Matrix :k`, an empty `*Arcs`, missing weights, `.tim` with `AE:2` | 6 (downloaded) |

### 6.3 Real-world corpora

**Batagelj datasets:** http://vlado.fmf.uni-lj.si/pub/networks/data/, licensed CC BY-NC-SA 2.5. The
host was unreachable; archive snapshot 20240928120234. Mirrored at github.com/bavla/Nets
`data/Pajek/...` (commit 7ec138b7, no license file); 171 small files are downloaded. Files worth
testing:
- USAir97.net: CRLF, an empty `*Arcs` followed by `*Edges`, coordinates.
- divorce.net: 2-mode `*vertices 59 50` with a rectangular `*matrix`.
- Tina.paj: 7 networks in one project, lowercase keywords, `%` comments inside `*vertices`.
- Days.zip (Reuters terror news): 13332 vertices, time sets on both vertices and edges.
- LondonTube.net: relation `:0`, a repeated `:5` header, a bare `*arcs` in the middle.
- Padgett.paj: a `[2-Mode]` inside a network NAME, which is not an interval.
- caviar.paj: UTF-8 without a BOM.
- The gd/*.NET graph-drawing contest files: shapes and colours.

**What the 171 downloaded files contain:**
- `*Partition` 40, `*Vector` 26.
- 2-mode 24, `*Matrix` 17, `:k` relations 16.
- Time sets 3.
- UTF-8 with BOM 5.
- No genuine cp1250 file was found.

### 6.4 Checklist

graph-io source: `formats/pajek/syntax.ts` and `importer.ts`.

**Sections**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `*Network`, `*Vertices n`, `*Arcs`, `*Edges`, `*Arcslist`, `*Edgeslist`, `*Matrix`, each with `:k "name"`; keywords in any case | Supported; relation goes to a `relation` column | Keep it. Test a repeated `:k` header and `:0`. |
| `*Arcs n` / `*Edges n` with a count | ? | Accept it and ignore the count; warn on a mismatch. Test it. |
| **`*Partition`, `*Vector`** (in 40 and 26 of 171 real files) | Node columns `partition` (i32) and `vector` (f64), later ones `partition#2`, ...; the object names in `meta.extra.pajek.objects`; one before the first `*Network` applies to that network | Import each one as a vertex attribute named after the object, as statnet does. At minimum, record a warning, not an error. |
| `*Permutation`, `*Cluster`, `*Hierarchy`, `*Events` / `.tim` | `W_PAJEK_UNSUPPORTED_SECTION` (a warning); lines skipped | A warning, not an error. |
| **A `.paj` holding several networks** (Tina.paj) | **`MULTIPLE_NETWORKS` aborts the import** | Import the first network and warn. Returning all of them would be a public API decision. |
| Text before the first `*` | `OUTSIDE_SECTION` | Warn and skip. |

**Vertex lines**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `*Vertices n` with fewer vertex lines, or none | n vertices; `W_PAJEK_VERTEX_COUNT` (a warning) for a partial list | Create n vertices, with label = number. No warning is needed (common in real files). |
| Vertex lines out of order; duplicates | `DUPLICATE_NODE` | Warn; the last one wins. |
| A vertex line without a label; with coordinates but no label (`1 0.1 0.2`) | A bare run of exactly two numbers after the vertex number is x y with no label; a quoted token, a lone number or a longer run starts with the label | A label is always present in Pajek's own output. Test igraph's files; if a line is numeric-only, treat the numbers as coordinates. |
| A quoted label containing spaces; an unquoted label; `"` inside a label; `\n`; `&#dddd;` | Quotes are stripped; no escapes; `&#dddd;` and `&#xhh;` are decoded in labels | Decode `&#dddd;` (Pajek does). Keep `\n` literally. |
| Encoding: a BOM means UTF-8, otherwise ANSI | UTF-8 only | See cross-format finding 1. Pajek's own default is ANSI without a BOM. |
| Coordinates: 2 or 3, missing, 0..1 | Position; `COORD_DIMS` on a mix | Keep it. |
| **Shapes: ellipse, box, diamond, triangle, cross, empty, plus house, man, woman** | All 9, in any case, stored lower-cased | Match case-insensitively and include all 9. |
| Vertex parameters and colours (named, `RGBrrggbb`, `RGB(...)`, `CMYK...`) | Plain text-inferred columns; no colour or size role | Optionally map `ic` to the colour role and `x_fact` to size. |
| **2-mode `*Vertices n n1`** | `meta.extra.pajek.firstMode`; no per-vertex mode column; `n1 > n` is a fatal `E_PAJEK_VERTICES_COUNT` | Add a mode column (igraph adds a `type`). A same-mode edge: warn. `n1 > n`: error. |

**Arc and edge lines**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Weight missing, negative, a float, `1e-3` | Weight | Keep it. |
| Mixed `*Arcs` and `*Edges`; an empty `*Arcs` block | Direction per section, so mixed direction works; the direction is set by the first line, so an empty `*Arcs` block does not count | Keep it. An empty `*Arcs` block must not make the graph mixed. Test USAir97. |
| `*Arcslist` / `*Edgeslist` `u v1 v2 ...`; a negative id | Supported; a negative id is read as its absolute value (no warning) | A negative id means its absolute value; warn, as Pajek's authors do. |
| **`*Matrix`: a rectangular 2-mode n1 x n2**, short or long rows, signed values | n x n, or n1 x (n - n1) under `*Vertices n n1`; a short row is `LINE`, a long row's extra values are ignored with `W_PAJEK_MATRIX_EXTRA` | Support 2-mode matrices (divorce.net). |
| Time intervals `[1-3,5]`, `[2-*]`, `[1,2,3]`, `[ 1 ]`, `[]`; a `[` inside a NAME | Spells; blanks inside the brackets are ignored and `[]` is no spell | Test Padgett.paj's name. |
| Vertex id out of range; 0-based files; duplicate edges | Error; `ZERO_BASED`; kept | Keep it. |

**Lines and comments**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `%` comments, including indented; blank lines; trailing whitespace; tabs; CRLF; bare CR | Supported | Keep it. |

---

## 7. CSV / TSV (edge lists and node + edge tables)

### 7.1 Specifications and conventions

| Document | URL | Notes |
|---|---|---|
| RFC 4180 | https://www.rfc-editor.org/rfc/rfc4180 | Oct 2005, Informational. CRLF, optional header, `""` escape; quoted fields may contain `,` CR LF; spaces are significant. |
| RFC 4180-bis draft | https://datatracker.ietf.org/doc/draft-shafranovich-rfc4180-bis/ | Expired draft; adds UTF-8 and LF |
| W3C CSVW tabular data model and dialect | https://www.w3.org/TR/tabular-data-model/ ; dialect at https://www.w3.org/TR/tabular-metadata/ section 5.9 | W3C Rec 2015. Dialect defaults: commentPrefix `#`, header true, quoteChar `"`, doubleQuote true, **trim true**, lineTerminators CRLF and LF |
| Frictionless CSV Dialect | https://specs.frictionlessdata.io/csv-dialect/ | Adds `escapeChar`, `nullSequence` |
| IANA text/tab-separated-values | https://www.iana.org/assignments/media-types/text/tab-separated-values | A header is required; no quoting; tabs are not allowed inside fields |
| Gephi CSV: edge list, adjacency list, matrix | https://web.archive.org/web/2023/https://gephi.org/users/supported-graph-formats/csv-format/ | Live page is gone. Separators `, ; \|` and whitespace; `'` or `"` quotes; **a row with more than 2 cells is an adjacency list**; a repeated edge increments its weight; the matrix form starts with a `;A;B;C` header |
| Gephi spreadsheet (node table + edge table) | https://web.archive.org/web/2023/https://gephi.org/users/supported-graph-formats/spreadsheet/ | Id, Label; Source, Target, Type (Directed / Undirected / Mixed), Id, Label, Weight, Interval / Timeset |
| SNAP | https://snap.stanford.edu/data/ | `#` header lines; **tab or space**; CRLF in some files |
| KONECT | http://konect.cc/networks/ (HTTP only) ; handbook github.com/kunegis/konect-handbook | `% sym\|asym\|bip <weight type>`, then `% edges n1 n2`; whitespace-separated; 1-based; a trailing space; **bip files have two separate id spaces** |
| networkx edgelist / adjlist / multiline adjlist | https://networkx.org/documentation/stable/reference/readwrite/edgelist.html (and adjlist.html, multiline_adjlist.html) | Whitespace delimiter; the data column is a **Python dict repr** `{'weight': 4}` |
| igraph edgelist / ncol / lgl | https://igraph.org/c/doc/igraph-Foreign.html | In lgl, **`#` starts a vertex line, not a comment** |
| Cytoscape table import | https://manual.cytoscape.org/en/stable/Creating_Networks.html | |

### 7.2 Test suites

| Source | License | Covers | Files |
|---|---|---|---|
| csv-spectrum (github.com/max-mapper/csv-spectrum) | BSD-2-Clause (per package.json) | RFC basics, each with expected JSON | 12 + 12 (downloaded) |
| PapaParse `tests/test-cases.js` | MIT | 263 cases: quotes, delimiter guessing, comments, BOM, empty lines, duplicate headers, newline detection | 1 (downloaded) |
| CPython `Lib/test/test_csv.py` | PSF-2.0 | 156 tests: dialects, quoting, escapechar, strict mode, the Sniffer | 1 (downloaded) |
| W3C CSVW test suite (https://w3c.github.io/csvw/tests/) | W3C test suite license | 282 validation tests (76 positive, 145 negative, 61 warning), 270 to-JSON, 270 to-RDF | manifests downloaded |
| networkx `test_edgelist.py`, `test_adjlist.py` | BSD-3 | 21 + 26 tests | downloaded |
| csv-test-data (github.com/sineemore/csv-test-data) | **no license** | 25 files including bad-* | not downloaded |

### 7.3 Real-world corpora

All of these are downloaded unless noted.

- **SNAP:**
  - facebook_combined: space-separated, LF, no header.
  - ca-GrQc and wiki-Vote: tab-separated, **CRLF**, `#` header.
- **KONECT:**
  - ucidata-zachary: sym, unweighted.
  - moreno_lesmis: sym, posweighted.
  - brunson_southern-women: bip, with trailing spaces.
- **Netzschleuder karate `csv.zip`:**
  - edges.csv: `# source, target` header, 0-based.
  - nodes.csv: numpy-repr values like `"array([..])"`.
  - gprops.csv: a multi-line quoted description.
- **OpenFlights** routes.dat and airports.dat (ODbL): no header, and `\N` means null.
- **networkx 3.1 generated output** (`downloads/csv/networkx/generated/`): edgelist with a dict
  column, weighted edgelist, adjlist, and multiline adjlist.
- **Network Repository** (https://networkrepository.com/), not downloaded: `.mtx` and `.edges`
  files with mixed delimiters.

### 7.4 Checklist

graph-io source: `formats/csv/records.ts`, `header.ts` and `importer.ts`.

**Quoting and records**

| Case | graph-io today | Right behaviour |
|---|---|---|
| RFC quoting: `""`; delimiter, CR, LF or CRLF inside quotes | Supported | Keep it. Run csv-spectrum and the RFC cases in PapaParse. |
| A bare quote inside an unquoted field (`a"b`) | ? | Keep it literally and warn. Test it. |
| Text after a closing quote (`"a"b`) | Fatal `E_CSV_QUOTE` | Acceptable, because PapaParse and Python strict mode also flag it. Consider a warning plus joining the text instead. |
| An unterminated quote | Fatal | Keep it, with the line number. |
| Backslash escape `\"` (the Neo4j LOAD CSV default, CSVW `doubleQuote:false`) | Not supported | Add an opt-in option. |
| Trailing delimiter; trailing newline or not; blank lines | Blank lines skipped | Test that none of these produces a phantom row. |
| **Whitespace around fields** (`a, b`) | **Not trimmed, silently; the id becomes `" b"`** | Trim unquoted endpoint and id cells (CSVW's default is trim true), or warn. Quoted whitespace stays. |

**Encoding and line endings**

| Case | graph-io today | Right behaviour |
|---|---|---|
| UTF-8 BOM; UTF-16LE TSV (Excel "Unicode text"); Windows-1252 | BOM stripped; the other two are fatal | See cross-format finding 1. |
| CR-only line endings | Supported | Keep it. |

**Delimiters and headers**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Delimiter sniffing `, ; \t \| space`; Excel `sep=;` first line | Sniffed over 10 rows; **`sep=` is not recognised** | Honour `sep=`. |
| **Runs of whitespace as the delimiter** (SNAP, KONECT, networkx, igraph); a trailing space (KONECT) | **A space delimiter does not collapse runs**, so empty fields cause `FIELD_COUNT` or blank-endpoint errors | Add a whitespace delimiter mode that collapses runs and ignores trailing space. Use it automatically for `.edges`, `.edgelist`, `.txt` and KONECT `out.*` files, and whenever the sniffer picks space. |
| Header present or absent; a header in a comment (`# source, target`, `# FromNodeId ToNodeId`) | Header detected by known names or text-over-numbers; comment headers are not read | Read column names from the last leading `#` line when it looks like a header. |
| **A header with unknown names over all-text data** | **Read as a data row, silently**, so `from_node,to_node` becomes an edge | Warn when the first row could be a header, e.g. no row after it repeats its text and its cells look like identifiers. |
| Duplicate header names; header case; `Source` / `source` / `SOURCE` | Duplicates renamed `name#pos`; markers matched case-insensitively | Keep it. |
| Ragged rows | `FIELD_COUNT` | Keep it. |

**Comments**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `#` and `%` comment lines: leading, or later in the file | Leading only, with direction hints (`% sym`, `# Directed graph`); **a later `#` line becomes a record** | Treat `#` / `%` lines anywhere as comments in edge-list files. igraph's lgl is the exception, where `#` is data; that is a different format. |
| KONECT's second `%` line (edge and node counts); `% bip` | `% bip` is read as a direction hint | For `bip`, prefix the right-side ids so the two id spaces do not collide (e.g. `r:1`); warn. |

**Row shapes**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Third column as a weight; KONECT's fourth column as a timestamp | Positional: source, target, weight, then `column4` | Keep it. Map KONECT's fourth column to a time column. |
| networkx dict-repr column `{'weight': 4}` | A string | Parse the Python-literal subset, or warn that it is not JSON. |
| **Adjacency-list rows** (Gephi `b;c;d`, networkx adjlist) | **Not supported; silently misread** (c becomes the weight) | Add an adjacency-list mode. Detect variable-width headerless rows and warn. |
| **Matrix CSV** (Gephi `;A;B;C`) | Not supported | Detect it (empty first cell, and the header labels repeat down the first column) and import it, or give a clear error. |
| Repeated edges; self-loops | Kept | Keep them. Document that Gephi adds weights. |
| Node table plus edge table (Gephi, Netzschleuder nodes.csv plus edges.csv) | `nodes` option / `table:"nodes"` | Keep it. |
| Per-row `Type` Directed / Undirected / Mixed | Gephi dialect | Keep it. |
| Ids `01` against `1`; `1.0` | Canonical rule: `01` stays a string | Keep it. |
| An empty endpoint | `MISSING_ENDPOINT` | Keep it. |
| `\N` null (OpenFlights, MySQL dumps); decimal comma with `;` | Not supported | Add an optional `nullSequence`. Never guess a decimal comma. |

---

## 8. JSON graph dialects

### 8.1 Specifications

| Dialect | URL | Shape |
|---|---|---|
| JSON | https://www.rfc-editor.org/rfc/rfc8259 ; JSON Lines https://jsonlines.org/ | NaN and Infinity are invalid; duplicate keys are undefined; a BOM may be ignored |
| networkx node_link | https://networkx.org/documentation/stable/reference/readwrite/generated/networkx.readwrite.json_graph.node_link_data.html | `{directed, multigraph, graph, nodes:[{id}], links|edges:[{source,target,key?}]}`. **The key is `links` up to 3.5 and `edges` from 3.6.** Python writes **NaN / Infinity** literals. |
| networkx adjacency_data, cytoscape_data, tree_data | .../json_graph.adjacency_data.html etc. | adjacency: `nodes` plus a parallel `adjacency:[[{id}]]` array. tree: nested `{id, children}`. |
| JSON Graph Format (JGF) | https://jsongraphformat.info/ ; github.com/jsongraph/json-graph-specification (MIT) | v1 schema (draft-04): `nodes` is an array. v2 schema (`$id .../v2.1/...`, draft-07): **`nodes` is an object keyed by id**; `graph` or `graphs`; `directed` defaults to true; hyperedges in two forms. Media type `application/vnd.jgf+json`. |
| Cytoscape.js | https://js.cytoscape.org/ | `{elements:{nodes,edges}}` or a flat array with `group`; `data.id/source/target/parent`, `position`, `classes`, and flags |
| Cytoscape desktop .cyjs | https://manual.cytoscape.org/en/stable/Supported_Network_File_Formats.html | `{format_version, generated_by, data, elements}`; `data.id` holds the SUID as a string. A third variant, **top-level `{nodes, edges}` with `data` objects**, appears in cytoscape.js `debug/gal.json`. |
| d3 force | https://d3js.org/d3-force/link | `{nodes, links}`; a link endpoint is an **index** (vega miserables) or an **id** (the mbostock gist) |
| graphology | https://graphology.github.io/serialization.html | `{attributes, options:{type,multi,allowSelfLoops}, nodes:[{key,attributes}], edges:[{key,source,target,undirected,attributes}]}` |
| vis-network | https://visjs.github.io/vis-network/docs/network/ | `{nodes:[{id,label,x,y}], edges:[{from,to,arrows}]}` |
| Gephi JSON exporter / sigma.js | no specification | `{nodes:[{id,label,x,y,size,color:"rgb(..)",attributes}], edges:[{id,source,target,size,color,attributes}]}` |
| Neo4j APOC JSON | see section 9 | |

### 8.2 Test suites

| Source | License | Covers | Files |
|---|---|---|---|
| JSONTestSuite (github.com/nst/JSONTestSuite) | MIT | The JSON layer: 95 must-accept (y_), 188 must-reject (n_) and 35 implementation-defined (i_) cases | 318 (downloaded) |
| JGF examples and schemas | MIT | v2 only: a single graph, a `graphs` array, both hyperedge forms, metadata, an empty graph | 7 examples + 2 schemas + test-examples.py (downloaded) |
| networkx json_graph tests | BSD-3 | round trips for node_link, adjacency, cytoscape and tree | 10 + 8 + 7 + 3 tests (downloaded) |
| cytoscape.js `benchmark/graphs/abcde.json`, `debug/gal.json`, webgl fixtures | MIT | the elements shapes, desktop export, compound nodes | 4 small files (downloaded) |
| graphology community-louvain datasets (clique3, eurosis) | MIT | the Gephi / sigma shape | 2 (downloaded) |
| networkx 3.1 generated output | produced locally | node_link, adjacency, cytoscape and tree, **plus one file containing NaN, Infinity, 2^64+1, a tuple node, and both `1` and `"1"`** | in `downloads/json/networkx/generated/` |

### 8.3 Real-world corpora

- vega-datasets `miserables.json` (BSD-3): index links.
- mbostock gist 4062045 `miserables.json`: id links; license not stated.
- JGF `les_miserables.json`.
- Cytoscape `gal.json`.
- Gephi / sigma `eurosis.json`.

All are downloaded.

### 8.4 Checklist

graph-io source: `formats/json/dialect.ts` and `importer.ts`.

**JSON layer**

| Case | graph-io today | Right behaviour |
|---|---|---|
| JSONTestSuite y_ / n_ / i_ | `JSON.parse` | Run the suite once. n_ files must fail with `E_JSON_SYNTAX`, never crash. The deep-nesting cases (`n_structure_100000_opening_arrays`) must give a clean error. |
| **NaN / Infinity / -Infinity literals** (networkx writes them whenever a value is NaN) | **Fatal `SYNTAX`** | Accept them in a lenient pre-pass and warn, because networkx is the most common producer. Use a token-aware replacement, never a regex over strings. |
| Integers beyond 2^53 (networkx `2**64+1`; Neo4j ids) | **Silently rounded by JSON.parse** | Detect long integer tokens and keep ids as strings; warn for attributes. |
| Duplicate object keys | Last one wins, silently | Accept that JSON.parse cannot see them; document it. |
| BOM; trailing commas; comments | BOM stripped; the other two are fatal | Keep it. |
| JSON Lines, or a top-level array of records | Fatal | See the APOC rows in section 9. |

**Dialect detection**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Detection order | Fixed order that **inspects only the first node or edge** | Keep the order, but check a few elements. The `dialect` option overrides it. |

**node-link and d3**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `links` against `edges`; **both present** | `edges` wins; **`links` silently ignored** | Both present: error, or warn and read both. |
| `directed`, `multigraph`, `key` | `key` is a plain attribute | Keep it; the multigraph `key` should get the edge-id role. |
| d3 links by index against by id; a numeric endpoint that matches an id | `indexLinks` is automatic: index when every endpoint is an integer and no node id is a number | Keep it. Test both miserables files. |
| Tuple ids (networkx writes `[0,1]`) | ? | Stringify canonically (JSON.stringify) and warn. |
| Missing endpoint; duplicate node id; duplicate edge id | `MISSING_ENDPOINT`; merged; skipped | Keep it. |

**JGF**

| Case | graph-io today | Right behaviour |
|---|---|---|
| v1 arrays; v2 object map; `graphs` array; `directed` default true; per-edge `directed`; hyperedges | Supported | Keep it. The v1 quirk where `id` is also written as an `id#element` column should be fixed. |

**Cytoscape**

| Case | graph-io today | Right behaviour |
|---|---|---|
| `{elements:{}}`, a flat array, top-level `{nodes,edges}` with `data` (gal.json); `.cyjs` | The first two are supported; **gal.json's shape probably falls through to node-link and fails on `data.id`** | Detect `nodes[0].data` and route it to Cytoscape. Test gal.json. |
| Cytoscape `position.z`; a node without an id | z is silently ignored; `MISSING_ID` | Keep z in a 3-component position. |

**Other dialects**

| Case | graph-io today | Right behaviour |
|---|---|---|
| graphology `options.type` / `multi` / `allowSelfLoops`; per-edge `undirected` | Supported | Warn on a self-loop when `allowSelfLoops` is false. |
| vis `from` / `to`; `arrows` | `arrows` is a plain attribute; x and y have no position role | Map vis `x` / `y` to position. `arrows` could decide direction; at least document that it does not. |
| Gephi / sigma `color:"rgb(r,g,b)"`, `x`, `y`, `size` | Plain columns | Map them to position and style. |
| networkx `adjacency_data` / `tree_data` | Fatal `DIALECT` | Support them. Both are simple, and networkx users produce them. |

---

## 9. Neo4j

### 9.1 Specifications

| Format | URL | Notes |
|---|---|---|
| neo4j-admin import CSV header | https://neo4j.com/docs/operations-manual/current/import/header-format/ ; options at .../import/full-import/ | Covers Neo4j 2026.09. The field types are listed below the table. |
| neo4j-admin import options | same pages | Defaults listed below the table |
| LOAD CSV | https://neo4j.com/docs/cypher-manual/current/clauses/load-csv/ | Every value is a string. **`\` escaping is ON by default** (`dbms.import.csv.legacy_quote_escaping`), the opposite of neo4j-admin. |
| APOC JSON | https://neo4j.com/docs/apoc/current/export/json/ | The shapes are listed below the table |
| APOC CSV | https://neo4j.com/docs/apoc/current/export/csv/ | `_id,_labels,<props>,_start,_end,_type,<props>`; labels written `:A:B`; `quotes:always`; nulls and `""` are identical unless `differentiateNulls` |
| APOC GraphML | https://neo4j.com/docs/apoc/current/export/graphml/ | `labels=":A:B"` plus a `labels` data key; `useTypes` |
| APOC Cypher export | https://neo4j.com/docs/apoc/current/export/cypher/ | Cypher statements; out of scope |

**neo4j-admin header field types:**
- `:ID`, `:ID(space)`, `:ID{label:L,id-type:long}`; several `:ID` columns form a composite key.
- `:LABEL` (`;`-separated), `:START_ID(space)`, `:END_ID(space)`, `:TYPE`, `:IGNORE`.
- Property types: int, long, float, double, boolean, byte, short, char, string, point, date,
  localtime, time, localdatetime, datetime and duration.
- `vector{...}` (2025.10+); **the header cell itself must be quoted**.
- Arrays are written `T[]`.
- A boolean is true only when the text is exactly `true`.
- **An empty array cannot be imported** (it is the same as null).

**neo4j-admin import option defaults:**
- `--delimiter ,`, `--array-delimiter ;`, `--quote "`.
- `--legacy-style-quoting false`, `--multiline-fields false`, `--ignore-empty-strings false`.
- `--trim-strings false` (other pages contradict this), `--id-type string`.
- `--skip-duplicate-nodes false`, `--skip-bad-relationships false`, `--input-encoding UTF-8`.
- Header files are passed separately: `--nodes=Label=header.csv,data.csv`.

**APOC JSON shapes:**
- The default is **JSON Lines**, with records like:
  - `{"type":"node","id":"0","labels":[..],"properties":{..}}`
  - `{"type":"relationship","id":"0","label":"KNOWS","start":{"id","labels"},"end":{..},"properties":{..}}`
- Ids are strings. `label` holds the relationship type.
- Also `ARRAY_JSON`, `JSON` (`{nodes:[],rels:[]}`) and `JSON_ID_AS_KEYS`.

### 9.2 Test fixtures

| Source | License | Covers | Files |
|---|---|---|---|
| neo4j/apoc `core/src/test/resources/exportJSON/` | Apache-2.0 | every APOC JSON variant: all, data, graph, query, id_as_keys, array, with or without properties, multiLabels, nodes_without_labels, points, datetime, relationship_type_injection | 40 (39 downloaded; testTerminate.json, 9.9 MB, skipped) |
| neo4j/apoc `init_neo4j_export_csv.cypher`, `fileWithUnicode.graphml` | Apache-2.0 | APOC CSV setup, APOC GraphML | downloaded |
| neo4j/neo4j `community/import-util/.../CsvInputTest.java`, `community/csv/...` (BufferedCharSeeker), `ImportCommandTest.java`, LOAD CSV `load.csv` / `load-no-headers.csv` | GPL-3.0 | header parsing, id spaces, types, quoting, multiline | 5 (reference only) |
| neo4j-graph-examples: movies `scripts/movies.cypher`, northwind `import/*.csv` | **no LICENSE file** | the standard example graphs | 1 + 11 (downloaded) |

### 9.3 Real-world corpora

- The movies, northwind and recommendations example graphs (github.com/neo4j-graph-examples).
- `https://data.neo4j.com/importing-cypher/{books,persons,movies,acted_in}.csv` (not downloaded).
- No public neo4j-admin CSV corpus exists. Build one by running APOC's `bulkImport:true` export over
  the example graphs.

### 9.4 Checklist

graph-io source: `formats/neo4j/header.ts` and `importer.ts`.

**neo4j-admin header and values**

| Case | graph-io today | Right behaviour |
|---|---|---|
| Every header type, `T[]` arrays, a configurable array delimiter | Supported; `duration` becomes a string; `point` becomes json | Keep it. |
| `vector{...}` (a quoted header cell) | ? | Parse it as a list of f32 / f64. Test it. |
| boolean: only exactly `true` is true in Neo4j | Accepts true / false / 1 / 0 in any case; anything else is a parse failure that **skips the whole row** | Accept the same set, but a value outside it should warn and leave the cell unset, not drop the row. |
| int / long beyond 2^53 | f64 plus `PRECISION`, or `long:"string"` | Keep it. |
| **`:START_ID(space)` / `:END_ID(space)`** | **Parsed, but the space is silently ignored**; endpoints resolve by id alone. The same id in two spaces is `ID_SPACE_COLLISION` and the **row is skipped**. | Qualify ids by space (e.g. `space:id`), or keep a per-space map. A file using `Person(1)` and `Movie(1)` is common and must work. |
| Several `:ID` columns (composite key) | ? | Concatenate them as Neo4j does. Test it. |
| `:LABEL` split by the array delimiter; `{label:X}` on `:ID`; `:IGNORE`; `:TYPE` | Supported | Keep it. |
| A missing `:TYPE` column (the type comes from the command line) | ? | Add a `relationshipType` option, or error clearly. |
| Header in a separate file; several data files; `--auto-skip-subsequent-headers` | Several sections per file; `nodes[]` / `relationships[]` inputs | Test a header-only file followed by a data-only file. |
| An empty cell against `""`; `--ignore-empty-strings`; an empty array | Empty means unset; `""` is an empty string or empty list | Keep it. |
| Duplicate node; a dangling relationship | `DUPLICATE_NODE` (last wins; Neo4j aborts or keeps the first with `--skip-duplicate-nodes`); `MISSING_ENDPOINT` | Match Neo4j: first wins, with a warning. |
| `--legacy-style-quoting` / LOAD CSV backslash escaping; multiline fields; the quote option | Quote configurable; no backslash escaping; multiline always allowed | Add an opt-in backslash mode. |

**APOC exports**

| Case | graph-io today | Right behaviour |
|---|---|---|
| **APOC JSON Lines, ARRAY_JSON, `{nodes,rels}`, JSON_ID_AS_KEYS** | **Not supported.** JSONL is a fatal JSON syntax error; the array form is fatal `DIALECT`; `{nodes,rels}` is misread as node-link with `rels` ignored | Add an `apoc` JSON dialect, plus JSONL sniffing: `{"type":"node"` on the first line. Map `labels` to the labels list, the relationship `label` to the type (role `kind`), and `start.id` / `end.id` to the endpoints. Create a node from a start / end stub when it is missing. |
| **APOC CSV** (`_id,_labels,...,_start,_end,_type`) | **Not supported.** No `:ID` header, so it is not Neo4j; the CSV importer finds no endpoint columns in node rows | Detect the `_id` + `_start` + `_end` header and split rows by whether `_start` is set. Parse labels written `:A:B`. |
| APOC GraphML (undeclared `labels` key, `labels=` attribute) | See GraphML | Warn instead of dropping. |

---

## 10. What we already have, and what to add first

**Current corpus:**
- `graph-io/test/corpus/` has 3-7 files per format, taken from research note 07. For example, DOT
  uses the gallery's hello, cluster, datastruct, fdpclust, fsm and root.
- `graph-io/test/corpus/malformed/<format>/` holds 8-13 malformed files per format.

**Cheapest high-value additions**, all permissively licensed or generated locally:

1. **Parser layers:**
   - JSONTestSuite (318 files) for the JSON layer.
   - csv-spectrum plus PapaParse's cases for the CSV record reader.
   - XML: the billion-laughs and XXE probes, UTF-16 and Latin-1 prolog files, and graphology's GEXF
     and GraphML resources with their expected values.
2. **networkx round trips:** generate every networkx writer's output locally (GML, GraphML, GEXF
   1.1/1.2/1.3, Pajek, node-link with `links` and with `edges`, adjacency, edgelist, adjlist).
   Include the NaN, big-int and `1` / `"1"` cases.
3. **DOT:** the MIT sets (ts-graphviz, pydot my_tests, tree-sitter-dot, graphlib-dot). For the EPL
   Graphviz corpus, compare node and edge counts against @hpcc-js/wasm as an oracle, reading the
   files from `downloads/` without vendoring them.
4. **Other formats:**
   - TinkerPop's GraphML types and bad-types files.
   - Boost's graphml_test.xml.
   - The APOC exportJSON set (Apache-2.0).
   - Netzschleuder karate in every format (GML, GraphML, CSV). Its per-dataset license needs
     checking before vendoring.

**Fixes the checklists point at, in order of user impact:**
1. **GraphML:** accept `key for="graphml"`. Every yEd file currently records an error.
2. **Encodings:** UTF-16 with a BOM; the XML prolog encoding; an `encoding` option or Latin-1 /
   cp1252 fallback with a warning for GML, Pajek, DOT `charset` and CSV.
3. **JSON:** accept networkx's NaN / Infinity; keep big-integer ids exact.
4. **GML:**
   - multi-line strings
   - HTML named entities
   - string and bare-word node ids
   - several graph blocks become the first plus a warning
   - the `&#99999999;` crash
5. **CSV:**
   - a whitespace-run delimiter mode for SNAP and KONECT
   - trimming unquoted id cells, or warning about them
   - adjacency-list and matrix detection instead of silent misreads
   - `#` / `%` comment lines anywhere
6. **Neo4j:** id spaces on `START_ID` / `END_ID`; APOC JSON / JSONL and APOC CSV importers.
7. **Pajek:**
   - `*Partition` / `*Vector` imported as attributes, not errors
   - the first network of a multi-network `.paj`
   - case-insensitive shapes plus house / man / woman
   - a 2-mode mode column and rectangular matrices
   - `&#dddd;` decoding
8. **DOT:** `#` anywhere outside a string; keep the HTML-string flag; honour `charset`.
9. **GEXF:**
   - 1.0 `attvalue id=`
   - 1.1 `<slices>`
   - `#RRGGBBAA`
   - a warning for bigdecimal / biginteger
   - warnings for silently ignored attributes

Items that are a public-API decision, not a bug:
- whether a multi-graph DOT, `.paj` or JGF file returns a list;
- whether an importer may fall back from UTF-8 to Latin-1 with a warning, versus requiring an
  explicit `encoding` option.
