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
      back to Latin-1 / cp1252 _with a warning_ is a design decision. It is not silent, so it does
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
        - `parse.nodeids` and the other parse.\* hints
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

| Document                                                                   | URL                                                                                                                                                          | Version / notes                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Canonical spec repo (RNC is normative; XSD and RNG are generated by trang) | https://github.com/gephi/gexf                                                                                                                                | CC-BY-4.0                             |
| Schema index                                                               | https://gexf.net/schema.html -> `https://gexf.net/{1.1,1.2,1.3}/<module>.{rnc,rng,xsd}`                                                                      | Site CC-BY-SA-3.0                     |
| Primer (non-normative)                                                     | https://gexf.net/primer.html ; PDF https://github.com/gephi/gexf/releases/download/1.3/gexf-13-primer.pdf ; TeX `primer/{1.1draft,1.2draft,1.3}` in the repo |                                       |
| GEXF 1.0 DTD                                                               | `specs/1.0/gexf10.dtd` in gephi/gexf                                                                                                                         | Namespace `http://www.gephi.org/gexf` |

**Namespaces by version:**

| Version  | Namespace                      | `version` attribute | Modules                                                     |
| -------- | ------------------------------ | ------------------- | ----------------------------------------------------------- |
| 1.1draft | `http://www.gexf.net/1.1draft` | `"1.1"`             | gexf, data, dynamics, hierarchy, phylogenics, viz           |
| 1.2draft | `http://www.gexf.net/1.2draft` | `"1.2"`             | same as 1.1draft; viz is `http://www.gexf.net/1.2draft/viz` |
| 1.3      | `http://gexf.net/1.3` (no www) | `"1.3"`             | gexf, dynamics, viz; viz is `http://gexf.net/1.3/viz`       |

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

| Source               | URL / path                                                                                                                       | License                                  | Covers                                                                                                                                        | Files                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| gexf.net samples     | https://gexf.net/data/{hello-world,basic,data,dynamics,hierarchy1,hierarchy4,phylogeny,viz,celegans,yeast,WebAtlas_EuroSiS}.gexf | CC-BY-SA-3.0 (site); data terms unstated | one file per feature page plus 3 real datasets                                                                                                | 11 (downloaded)                       |
| gephi/gexf primer    | `primer/{1.1draft,1.2draft,1.3}/simple.gexf`                                                                                     | CC-BY-4.0                                | primer example                                                                                                                                | 3 (1 downloaded)                      |
| graphology           | github.com/graphology/graphology `src/gexf/test/resources/` + expected values in `test/definitions/parser.js`                    | MIT                                      | 1.3 lists (pipe, comma, quotes, mixed), hex colour, `kind`, missing_nodes, undeclared_attribute, pedantic and sanitized meta, mixed direction | 21 (16 downloaded)                    |
| networkx             | `networkx/readwrite/tests/test_gexf.py`                                                                                          | BSD-3                                    | 30 tests, **inline XML**: 1.3, dynamic, INF/NaN, lists, slices and spells, parents, type promotion                                            | 1 (downloaded)                        |
| gexf4j               | francesco-ficarola/gexf4j `src/test/resources/{dynamicGraph,staticGraph,testStaticUtf}.gexf`                                     | Apache-2.0                               | dynamic, UTF-8                                                                                                                                | 3 (downloaded)                        |
| Gephi importer tests | gephi/gephi `modules/ImportPlugin/src/test/resources/org/gephi/io/importer/plugin/file/gexf/`                                    | CDDL-1.0/GPL-3.0                         | basic, data, dynamicedgeweight, infinity, meta, slice, timezone, zeroweight                                                                   | 8 (downloaded, reference only)        |
| Gephi exporter tests | `modules/ExportPlugin/src/test/resources/.../gexf/`                                                                              | GPL-3.0                                  | include-null attvalues, infinity                                                                                                              | 2 (downloaded, reference only)        |
| OGDF                 | ogdf/ogdf `test/resources/fileformats/gexf/valid/`                                                                               | GPL                                      | colour, metadata, hierarchy                                                                                                                   | 4 (downloaded, reference only)        |
| Tulip                | Tulip-Dev/tulip `tests/plugins/data/*.gexf`                                                                                      | LGPL-3.0                                 | older gexf.net copies plus hierarchy2 and hierarchy3                                                                                          | 21 (2 downloaded)                     |
| JGraphT              | jgrapht-io `nio/gexf/SimpleGEXFImporterTest.java`                                                                                | EPL-2.0/LGPL-2.1                         | 7 inline tests                                                                                                                                | not downloaded                        |
| gephi-toolkit-demos  | `src/main/resources/.../{timeframe1-3,LesMiserables,Java}.gexf`                                                                  | no license file                          | time slices                                                                                                                                   | 5 (3 downloaded)                      |
| Validation oracle    | 1.2draft and 1.3 XSDs                                                                                                            | CC-BY-4.0                                | validates our exporter's output                                                                                                               | downloaded in `downloads/gexf/specs/` |

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

| Case                                                                                                                                                                   | graph-io today                                                                        | Right behaviour                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Versions 1.0, 1.1draft, 1.2draft, 1.3; each namespace; namespace missing or wrong (`www.gexf.net/1.3`, `http:///www...` viz); `version` disagreeing with the namespace | Root matched by local name; `version` copied to meta; no version check (701-706, 553) | Accept every variant; record the version. Test every namespace spelling.        |
| GEXF 1.0 `<attvalue id=...>` instead of `for=` (diseasome)                                                                                                             | `ATTVALUE_SHAPE`; value dropped (1570-1572)                                           | Accept `id` as an alias for `for` when the version is 1.0 or no `for` is given. |
| `<meta>`: creator, keywords, description, lastmodifieddate; two `<meta>` blocks; children using `text=""`; a date that is not xsd; unknown children                    | Read                                                                                  | Keep the first meta. Unknown child: warn.                                       |

**Graph element**

| Case                                                                                                                                                    | graph-io today                                         | Right behaviour                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `defaultedgetype` directed / undirected / mutual; missing (spec: undirected); misspelled `defaultedgestyle` (SocioPatterns)                             | Supported; other `<graph>` attributes silently ignored | Warn once on an unknown `<graph>` attribute.                         |
| `mode` static / dynamic / slice; `timeformat` integer / double / date / dateTime; `timerepresentation`; `timezone`; graph `start` / `end` / `timestamp` | Read into meta. `timezone` is not listed.              | Apply `timezone` to stamps that carry no zone (Gephi timezone.gexf). |
| 1.1 `<slices><slice>`                                                                                                                                   | `UNKNOWN_ELEMENT`; subtree skipped (1266)              | Read slices as spells (networkx also does this).                     |
| `<nodes>` / `<edges>` `count` wrong versus the actual children                                                                                          | Count is a reserve hint (`COUNT_HINT`)                 | Hint only; no error when it is wrong.                                |
| `<edges>` before `<nodes>`, or no `<nodes>`                                                                                                             | `MISSING_NODES`                                        | Keep it.                                                             |

**Nodes and edges**

| Case                                                                | graph-io today                                        | Right behaviour                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Duplicate node id, including in nested nodes                        | `DUPLICATE_NODE`                                      | Keep it.                                                    |
| Edge to an undeclared node                                          | `addMissingNodes` false by default, so it is an error | Keep the strict default. graphology offers the same opt-in. |
| Edge id optional (1.3) or required (1.2); duplicate edge id         | `DUPLICATE_EDGE_ID`, edge skipped                     | Keep it.                                                    |
| Per-edge `type`, including mutual; mixed direction                  | Supported via `DirectionResolver`                     | Keep it.                                                    |
| `weight` default 1, zero weight, INF                                | Read                                                  | Test zeroweight.gexf and infinity.gexf.                     |
| Parallel edges: with `kind` (1.3), without `kind` (1.2), self-loops | `kind` goes to a dict column                          | Keep them as a multigraph. Never deduplicate.               |

**Attributes**

| Case                                                                                                                                                                                               | graph-io today                                                                                                             | Right behaviour                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Types integer, long, float, double, boolean, string, anyURI, liststring (1.2); bigdecimal, biginteger, byte, short, char, list\* (1.3); aliases int, bool, character, listint (Gephi and networkx) | All mapped. bigdecimal and biginteger become string **silently**. An unknown type becomes string with `UNKNOWN_ATTR_TYPE`. | Emit a precision or loss warning for big\*. Test that the aliases map. |
| `<default>`, `<options>` (1.2 pipe form, 1.3 bracket form); a default or value outside the options                                                                                                 | Parsed                                                                                                                     | A value outside the options: warn.                                     |
| attvalue: `for` names an undeclared attribute; `<attvalue>` without an `<attvalues>` wrapper; several `<attvalues>` blocks                                                                         | `UNKNOWN_ATTRIBUTE`; the other two are unknown                                                                             | Warn and keep. Test all three (ht2009, Gephi slice.gexf).              |
| Numeric text: INF, -INF, NaN, Infinity, 1e5, -0, empty, integer overflow                                                                                                                           | INF / NaN accepted; integer overflow gives `E_COLUMN_TYPE` for that value                                                  | Keep it. An empty typed value means unset.                             |
| Lists in 1.3: `[a, b]`, `['a', "b"]`, escaped quote, `[]`, whitespace                                                                                                                              | `lists.ts:34-40`                                                                                                           | Test against graphology's v1_3.gexf expected values.                   |

**Hierarchy**

| Case                                                                                                                  | graph-io today                    | Right behaviour                                                                                            |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pid` (including forward references), nested `<nodes>`, `<parents><parent for>`, several parents, edges across levels | Supported; resolved at `</graph>` | A `pid` naming a missing node (diseasome `pid="0"`, 1419 times) must be a warning, not a failure. Test it. |

**Dynamics**

| Case                                                                                                                                                                  | graph-io today                                                                           | Right behaviour               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| start / end, `startopen` / `endopen`, both start and startopen, spells, 1.3 timestamps and intervals, overlapping or touching spells, timed attvalues, dynamic weight | Supported; an open spell bound is kept in the `spellsOpen` column; `OPEN_BOUND_CONFLICT` | Keep it. `end < start`: warn. |

**viz**

| Case                                                                                                     | graph-io today                                                                                   | Right behaviour                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| color r/g/b/a, 1.3 `hex` + `a`, 8-digit hex, out-of-range values, float r/g/b                            | 8-digit hex gives `VIZ_VALUE` and is skipped. **`hex` is silently ignored when `r` is present.** | Accept `#RRGGBBAA`. Clamp out-of-range values and warn (as Gephi does). |
| position x, y, optional z; size; thickness; node shape including image + uri; edge shape; unprefixed viz | Supported                                                                                        | Keep it.                                                                |

**XML layer and unknowns**

| Case                            | graph-io today                                                                                                                          | Right behaviour       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Unknown elements and attributes | Unknown element: warn once. Unknown node/edge attribute: warn. On `<attribute>`, `<attvalue>`, `<spell>`, viz and `<gexf>`: **silent**. | Warn once everywhere. |
| XML-level cases                 | See section 3 below                                                                                                                     |                       |

---

## 2. GraphML

### 2.1 Specification

| Document                           | URL                                                                                                                                                | Notes                                                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specification                      | http://graphml.graphdrawing.org/specification.html ; element reference /specification/xsd.html ; DTD /dtds/graphml.dtd                             | Site CC-BY-3.0                                                                                                                                                                                                   |
| Primer (non-normative)             | http://graphml.graphdrawing.org/primer/graphml-primer.html                                                                                         | Examples at /primer/{simple,attributes,attributes.ext,hyper,nested,port,svg}.graphml                                                                                                                             |
| Schemas                            | `http://graphml.graphdrawing.org/xmlns/{1.0,1.1,1.0rc}/{graphml.xsd,graphml-structure.xsd,graphml-attributes.xsd,graphml-parseinfo.xsd,xlink.xsd}` | Namespace `http://graphml.graphdrawing.org/xmlns` for both 1.0 and 1.1                                                                                                                                           |
| What 1.1 adds over 1.0             | --                                                                                                                                                 | `data@time`, `key@dynamic`, `key@for="graphml"`, data uniqueness per (key, time)                                                                                                                                 |
| yFiles classic extension (yEd)     | http://docs.yworks.com/yfiles/doc/developers-guide/graphml.html ; XSD https://www.yworks.com/xml/schema/graphml/1.1/ygraphml.xsd                   | `y:` = `http://www.yworks.com/xml/graphml`. Uses `key@yfiles.type` (nodegraphics, edgegraphics, portgraphics, resources) and `node@yfiles.foldertype` (group, folder, leaf). XSDs downloaded; no license stated. |
| yFiles 3 / yFiles for HTML dialect | https://docs.yworks.com/yfiles-html/dguide/customizing_io/customizing_io_graphml.html                                                              | `xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0"`, `y:attr.uri` keys, `x:` markup                                                                                                                          |

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

| Source                  | Path                                                                                                                                                                                           | License           | Covers                                                                                                                 | Files                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| GraphML primer examples | graphml.graphdrawing.org/primer/\*.graphml                                                                                                                                                     | CC-BY-3.0         | simple, attributes, xlink, hyperedges, nested, ports, svg                                                              | 7 (downloaded)                  |
| graphology              | `src/graphml/test/resources/`                                                                                                                                                                  | MIT               | multigraph, mixed_multigraph, miserables_broken                                                                        | 6 (downloaded)                  |
| TinkerPop               | `data/tinkerpop-{modern,classic}.xml`, gremlin-test `io/graphml/{graph-types,graph-types-bad,graph-no-edge-ids}.xml`, `graphml-1.1.xsd`                                                        | Apache-2.0        | every attr.type, an unknown type, unparseable values, no edge ids                                                      | 6 (downloaded)                  |
| Boost.Graph             | `test/graphml_test.xml`                                                                                                                                                                        | BSL-1.0           | per-type defaults, graph data, a node id with spaces                                                                   | 1 (downloaded)                  |
| networkx                | `readwrite/tests/test_graphml.py`                                                                                                                                                              | BSD-3             | 41 tests, **inline XML**: multigraph ids, hyperedge raises, yfiles, booleans, long, unicode                            | 1 (downloaded)                  |
| igraph                  | `tests/unit/graphml-*.xml`, `tests/regression/{invalid1-6,bug_1970,bug_2506_1-3,cattr_bool_bug*}.graphml`, `fuzzing/test_inputs/*.graphml`; expected output in `igraph_read_graph_graphml.out` | GPL-2.0+          | no namespace, `ns3:` prefix, unknown entity, whitespace, defaults, yFiles 3, duplicate or empty key ids, fuzz crashers | 25 (downloaded, reference only) |
| JGraphT                 | `jgrapht-io/.../nio/graphml/{GraphMLImporterTest,SimpleGraphMLImporterTest}.java`                                                                                                              | EPL-2.0/LGPL-2.1  | 32 inline tests: hyperedges, nesting, validation, duplicate node, xlink, graphml-level data, **invalid APOC output**   | not downloaded                  |
| OGDF                    | `test/resources/fileformats/graphml/valid/`                                                                                                                                                    | GPL               | hyperedges, long lines, nesting                                                                                        | 6 (reference only)              |
| Gephi                   | `ImportPlugin/.../file/{cdata,withdesc}.graphml`                                                                                                                                               | GPL-3.0           | CDATA, `desc`                                                                                                          | 2 (reference only)              |
| Cytoscape               | cytoscape-impl `graphml-impl/src/test/resources/`                                                                                                                                              | LGPL-2.1          | desc, igraph output                                                                                                    | 5 (2 downloaded)                |
| GraphStream             | gs-core `example{,-extraattributes}.graphml`                                                                                                                                                   | LGPL-3.0/CeCILL-C | keys without name or type; undeclared XML attributes                                                                   | 2 (downloaded)                  |
| APOC GraphML            | neo4j/apoc `core/src/test/resources/fileWithUnicode.graphml`                                                                                                                                   | Apache-2.0        | the APOC flavour (`labels=":A:B"`)                                                                                     | 1 (in `downloads/neo4j/apoc`)   |

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

| Case                                                                                                                                                | graph-io today                                                                                                         | Right behaviour                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default namespace, no namespace, `ns3:` prefix, 1.0rc namespace, any schemaLocation, a DOCTYPE with a SYSTEM DTD                                    | Local names; DOCTYPE skipped, not fetched                                                                              | Keep it. Test the no-namespace, prefix and DOCTYPE cases (the North and igraph files).                                                                                                                                                            |
| `key for="graphml"`, including **yEd's `yfiles.type="resources"` key, present in every yEd file**                                                   | **`KEY_FOR_INVALID`, recorded as an error that counts toward `errorLimit`**; the root `<data>` then gives `KEY_DOMAIN` | `for="graphml"` is valid in GraphML 1.1. Accept it and put document-level data into graph attributes or meta. The yEd resources can be kept as json or skipped with a single warning. **High priority: this reports an error on every yEd file.** |
| `for` hyperedge / port / endpoint                                                                                                                   | `KEY_DOMAIN_UNSUPPORTED`; data dropped                                                                                 | Keep it, but it is a warning, not an error.                                                                                                                                                                                                       |
| Same key id twice across different `for` values (Gephi cdata.graphml); an empty key id; duplicate or empty `attr.name`; no `attr.name` (use the id) | `DUPLICATE_KEY`, `KEY_MISSING_ID`                                                                                      | Duplicate id: warn and keep the first (as Gephi does). No `attr.name`: fall back to the key id.                                                                                                                                                   |
| `attr.type`: the six types; missing; unknown (TinkerPop's "nothing-supported..."); graph-tool's `vector_*` / `short` / `python::object`             | A missing type is string with no warning. An unknown type is string with `UNKNOWN_ATTR_TYPE`.                          | Map `short` to i32 and parse `vector_*` as lists. The rest is unchanged.                                                                                                                                                                          |
| `attr.list` (GraphML 1.1 / Boost)                                                                                                                   | **Silently ignored**                                                                                                   | Honour it, or at least warn.                                                                                                                                                                                                                      |
| `<default>`; a typed default containing elements                                                                                                    | Parsed; `DATA_NESTED`                                                                                                  | Keep it.                                                                                                                                                                                                                                          |

**Data values**

| Case                                                                                                                                                     | graph-io today                                                                  | Right behaviour                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `<data>` for an undeclared key (APOC); `<data>` without `key`; duplicate `<data>` for one key; `<data>` before or after nodes; data at the graphml level | `UNKNOWN_KEY`, `DATA_MISSING_KEY`; root data goes to the graph table            | An undeclared key: warn and keep the value as a string. JGraphT's `testNonValidApoc` shows real APOC files need this. |
| Typed values: booleans true/false/1/0 in any case, INF/-INF/NaN, int and long overflow, unparseable text, **whitespace-only text**                       | Declared-types rules. **A whitespace-only non-string value is silently unset.** | An unparseable value: error per value, or keep as a string with a warning. Whitespace-only: warn.                     |
| Leading and trailing whitespace in string data (igraph graphml-whitespace.xml)                                                                           | Kept verbatim                                                                   | Keep it.                                                                                                              |
| CDATA, entities, `&unknown;`                                                                                                                             | CDATA is ordinary text; an unknown entity is fatal                              | Fatal is correct under XML (igraph is lenient). Keep fatal but say which entity.                                      |

**Graph and structure**

| Case                                                                                                                                                                                | graph-io today                                                                                                                 | Right behaviour                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `edgedefault` missing (all North/Rome files)                                                                                                                                        | Warning; falls back to `defaultDirected` (false)                                                                               | Keep it.                                                                                |
| Per-edge `directed` true/false; `directed="1"` / `"0"` / `"True"`                                                                                                                   | Anything else is `INVALID_DIRECTED` and the **edge is skipped**                                                                | Accept 1/0 and any case, as networkx does, with a warning. Skipping edges is data loss. |
| Several top-level graphs                                                                                                                                                            | Merged, with `MULTIPLE_GRAPHS`                                                                                                 | Acceptable. igraph instead selects a graph by index.                                    |
| A node id with spaces (Boost); duplicate node; missing node id; edge to an undeclared node; edge before its nodes; no edge ids; parallel edges; self-loops                          | `addMissingNodes` true by default                                                                                              | Keep it. Test every one.                                                                |
| Nested graphs, several levels deep; an edge declared at the LCA or at the top; **a graph inside an edge**; a nested graph with its own edgedefault; yEd `yfiles.foldertype="group"` | Parent column; `NESTED_GRAPH_DATA` drops the nested graph's data; a graph inside an edge is not handled                        | A graph inside an edge: warn. Test the yEd group.                                       |
| Hyperedges (in / out / undir) and ports: `<port>` including nested ports, `sourceport`, `targetport`, data on a port                                                                | Hyperedges follow the `hyperedges` option (default skip). `<port>` elements are warned and dropped; the port strings are kept. | Keep it.                                                                                |
| `parse.*` hints; counts that are wrong                                                                                                                                              | Only parse.nodes and parse.edges are used; the rest are silently ignored                                                       | That is fine, because they are hints.                                                   |
| `<desc>`; `<locator xlink:href>`                                                                                                                                                    | `DESC_DROPPED`; a nested `desc` is silent; `LOCATOR_DROPPED`                                                                   | Never fetch a locator. Keep the warning.                                                |
| Unknown XML attributes on node or edge (APOC `labels=`, GraphStream `label=`, `xlink:href`)                                                                                         | **Silently ignored**                                                                                                           | Warn once. Optionally read the APOC `labels=` attribute.                                |

**yFiles**

| Case                                                                                        | graph-io today                                                                                                                                                             | Right behaviour                                                                                                                  |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Classic yFiles (ShapeNode Geometry, Fill, NodeLabel, PolyLineEdge); yFiles 3 (`y:attr.uri`) | A json column plus a `W_GRAPHML_YFILES_JSON` loss note; classic ShapeNode / PolyLineEdge also read into `yfiles.*` columns (position, size, colours, label, shape, arrows) | Better: map `Geometry` x/y to position and `NodeLabel` to label, since users expect a yEd layout to survive. Test both dialects. |
| `.graphmlz` (gzip)                                                                          | Not handled                                                                                                                                                                | Optional: decompress with `DecompressionStream`.                                                                                 |

---

## 3. XML layer shared by GEXF and GraphML

graph-io source: `common/xml.ts`.

| Case                                                                                        | graph-io today                                                                                                | Right behaviour                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UTF-8 with or without BOM                                                                   | Supported                                                                                                     | Keep it.                                                                                                                                                                        |
| UTF-16LE / UTF-16BE with a BOM                                                              | **Fatal `E_INVALID_UTF8`**                                                                                    | Detect the BOM and decode (XML 1.0 requires parsers to support UTF-16).                                                                                                         |
| `<?xml ... encoding="ISO-8859-1"?>` or `windows-1252`                                       | **Fatal on any byte >= 0x80**; the declaration is ignored                                                     | Read the declared encoding from the first bytes and decode with it (TextDecoder supports it). Test a Latin-1 file.                                                              |
| No XML declaration; `standalone="yes"`                                                      | Supported                                                                                                     | Keep it.                                                                                                                                                                        |
| Predefined entities; `&#233;` and `&#xE9;`; CDATA; comments; PIs; a comment before the root | Supported                                                                                                     | Keep it.                                                                                                                                                                        |
| An undeclared named entity (`&nbsp;`)                                                       | Fatal                                                                                                         | Correct under XML. The message should name the entity.                                                                                                                          |
| DOCTYPE with an internal subset that declares entities (billion laughs, XXE)                | The DOCTYPE is skipped and its entities are never expanded, so an entity use becomes a fatal "unknown entity" | This is safe. Add explicit tests for a billion-laughs file and a `SYSTEM "file:///etc/passwd"` file. Both must fail fast or be ignored, never fetch anything, and never expand. |
| Namespace prefixes, wrong namespace URIs                                                    | Not resolved; local names are used                                                                            | Lenient, and matches Gephi and igraph. Test `<gexf:node>` and `<ns3:graph>`.                                                                                                    |
| Attribute-value normalisation (tab and newline become a space), CRLF to LF                  | Supported                                                                                                     | Keep it.                                                                                                                                                                        |
| Truncated or not-well-formed input, a second root, text outside the root                    | Fatal                                                                                                         | Keep it. Test the igraph invalid1-6 files and graphology miserables_broken.graphml.                                                                                             |
| Illegal XML 1.0 characters (control characters)                                             | Fatal                                                                                                         | Keep it.                                                                                                                                                                        |
| Very long lines (OGDF long-line.graphml); huge files                                        | Streaming tokenizer                                                                                           | Test it.                                                                                                                                                                        |
| Empty graphs: `<nodes/><edges/>`, `<graph/>`, no `<nodes>` element                          | ?                                                                                                             | Test all three; the result should be an empty graph with no error.                                                                                                              |

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

| Source   | Path                                                                                                                      | License          | Covers                                                                                                                                             | Files                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| networkx | `readwrite/tests/test_gml.py`                                                                                             | BSD-3            | 23 test functions, inline: a Cytoscape bug case, quotes, unicode, special floats, 30+ parse-error cases, out-of-range integers, multi-line strings | 1 (downloaded)                  |
| igraph   | `tests/unit/*.gml`, `tests/regression/invalid*.gml`, `fuzzing/test_inputs/graph1.gml` (yEd output), plus `gml.c` / `.out` | GPL-2.0+         | composite values, `+2`, `-Inf`, `+inF`, entities, `sou_rce`, `Version 3`, `directed 2`, nodes without id, `graph []`, malformed input              | 13 (downloaded, reference only) |
| OGDF     | `test/resources/fileformats/gml/{valid,invalid,cluster}`                                                                  | GPL              | ambiguous or missing id/source/target, no graph, clusters                                                                                          | 13 (reference only)             |
| Gephi    | `ImportPlugin/.../file/{emojis,label}.gml`                                                                                | GPL-3.0          | bare-word ids, emoji                                                                                                                               | 2 (reference only)              |
| JGraphT  | `GmlImporterTest.java`                                                                                                    | EPL-2.0/LGPL-2.1 | 20 inline tests                                                                                                                                    | not downloaded                  |

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

| Case                                                                                                                                                                   | graph-io today                                                                                                                                            | Right behaviour                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A multi-line string** (spec: the newline is part of the string; igraph keeps it)                                                                                     | **Fatal `E_SYNTAX`** (syntax.ts:272-279)                                                                                                                  | Accept it and keep the newline; turn CRLF inside the string into LF.                                                                         |
| Entities: the 5 XML names, `&#NN;`, `&#xHH;`, `&eacute;`, `&auml;` (in the spec's own examples), `&NewLine;` (graph-tool), unknown `&foo;`, a stray `&`, `&#99999999;` | Numeric and the 5 XML names are decoded. **Other names are left verbatim, silently.** An out-of-range numeric reference **probably throws a RangeError**. | Decode the full HTML5 named-entity set. An unknown name: keep it verbatim and warn once. An out-of-range code point: warn and keep the text. |
| Raw Latin-1 bytes (the spec charset)                                                                                                                                   | Fatal `E_INVALID_UTF8`                                                                                                                                    | See cross-format finding 1.                                                                                                                  |
| Keys: `[A-Za-z_][0-9A-Za-z_]*` including a leading `_`; keys over 254 characters                                                                                       | Accepted; no length limit                                                                                                                                 | Keep it. graph-tool's `_pos` must parse.                                                                                                     |
| Reals: `1.0E5`, `.5`, `5.`, `1E5`, `-0`, `+1`; NAN / INF in any case                                                                                                   | Accepted                                                                                                                                                  | Keep it; `-0.0` stays a real.                                                                                                                |
| Integers above 32 and 53 bits                                                                                                                                          | f64, plus `PRECISION` beyond 2^53                                                                                                                         | Keep it.                                                                                                                                     |
| `#` comments at column 0, indented, trailing                                                                                                                           | Supported outside strings                                                                                                                                 | Keep it.                                                                                                                                     |
| Nested lists at any depth; empty `[ ]`                                                                                                                                 | json columns                                                                                                                                              | Add a depth guard of at least 256, giving an error beyond it.                                                                                |
| Duplicate keys                                                                                                                                                         | Become a list column; `_networkx_list_start` supported                                                                                                    | Keep it.                                                                                                                                     |
| Whitespace: tabs, `graph[node[`, CRLF, bare CR, no final newline, long lines                                                                                           | ?                                                                                                                                                         | Test all of them.                                                                                                                            |
| Truncated file, unterminated string, unmatched `]`, trailing garbage, empty file                                                                                       | Fatal                                                                                                                                                     | Keep it, with line and column.                                                                                                               |

**Structure**

| Case                                                                                               | graph-io today                                                                                              | Right behaviour                                                                                              |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Missing `graph`; `graph []`                                                                        | `E_GML_NO_GRAPH`; an empty graph                                                                            | Keep it.                                                                                                     |
| **Several `graph` blocks**                                                                         | **Fatal `E_GML_SECOND_GRAPH`**                                                                              | Use the first graph and warn, as igraph does. Fatal throws away a readable graph.                            |
| `directed`: 0, 1, absent, 2, a string, repeated                                                    | Other integers count as truthy with a warning; a non-integer is an error and the default applies            | Keep it.                                                                                                     |
| Per-edge `directed` key                                                                            | Stored as a plain attribute, silently                                                                       | Acceptable, because GML has no per-edge direction.                                                           |
| **String or bare-word node ids** (`id "a"`, `id a`)                                                | A string id is kept under the `ids` rule with one `W_GML_STRING_ID` per file; a bare word is a syntax error | networkx and Gephi accept these. Accept them, keyed by exact value, and warn that they are outside the spec. |
| A node without an id                                                                               | `MISSING_ID`, skipped                                                                                       | For an isolated node, generate an id and warn, as igraph does.                                               |
| Duplicate node id; edge missing source or target; edge to an undefined node                        | Error                                                                                                       | Keep it.                                                                                                     |
| Edge before its nodes                                                                              | ?                                                                                                           | Must work (order does not matter in GML). Test it.                                                           |
| Multi-edges without `multigraph 1` (celegansneural, polblogs); undirected A-B plus B-A; self-loops | Kept                                                                                                        | Keep them. A warning is optional.                                                                            |
| Label used as id; duplicate labels (cond-mat-2005)                                                 | `nodeIdFrom:"label"` is opt-in; `LABEL_MERGED`                                                              | Keep it.                                                                                                     |
| `graphics` x/y/z becomes position; `fill`, `outline`, `w`, `h`, `Line/point`, `LabelGraphics`      | x/y/z become position; the rest goes to a json column                                                       | Optionally map `fill` / `w` to style; keep the rest.                                                         |
| `Creator` and `Version`; a Version other than 1; yEd `hierarchic`                                  | Kept in meta                                                                                                | A Version other than 1: warn.                                                                                |

---

## 5. DOT (Graphviz)

### 5.1 Specification

| Document                                                | URL                                                                                                                                                            | Version                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| DOT grammar                                             | https://graphviz.org/doc/info/lang.html                                                                                                                        | Last modified 2024-09-28; not tied to a release. Current Graphviz is 16.1.0 (2026-09-04). |
| Attributes                                              | https://graphviz.org/doc/info/attrs.html ; per-attribute pages e.g. https://graphviz.org/docs/attrs/charset/ , https://graphviz.org/docs/attr-types/escString/ |                                                                                           |
| HTML-like labels                                        | https://graphviz.org/doc/info/shapes.html#html                                                                                                                 |                                                                                           |
| Reference implementation (more permissive than the doc) | gitlab.com/graphviz/graphviz `lib/cgraph/scan.l` and `lib/cgraph/grammar.y`                                                                                    | EPL-2.0                                                                                   |

The grammar, the ID forms, the comment rules and the scanner behaviour the doc omits are
summarised in the checklist below. The full grammar is in `downloads/dot/spec/`.

### 5.2 Test fixtures

| Source                            | Path                                                                                                       | License                                                                          | Covers                                                                                                                                     | Files                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Graphviz `tests/graphs`           | https://gitlab.com/graphviz/graphviz/-/tree/main/tests/graphs                                              | EPL-2.0                                                                          | clusters, HTML, records, ports, Latin1.gv, russian.gv, the large `b*.gv` graphs                                                            | 260 .gv (downloaded)                                                                                                 |
| Graphviz issue reproductions      | `tests/*.dot` plus `tests/test_regression.py` (326 tests)                                                  | EPL-2.0                                                                          | 1411 (line numbers after multi-line strings), 1367 (invalid UTF-8), 2481 (mixed-case keywords), 191 (unquoted comma list must be an error) | 213 .dot (204 downloaded; the files over 1 MB were skipped)                                                          |
| Graphviz `tests/regression_tests` | same repository                                                                                            | EPL-2.0                                                                          | .gv files with reference svg and xdot                                                                                                      | 59 (downloaded)                                                                                                      |
| Graphviz gallery                  | gitlab.com/graphviz/graphviz.gitlab.io `content/en/Gallery`                                                | EPL-2.0                                                                          | real-world style graphs                                                                                                                    | 47 (46 downloaded)                                                                                                   |
| pydot                             | github.com/pydot/pydot `test/`                                                                             | MIT (the `graphs/` files are copies of old Graphviz tests, so treat them as EPL) | graphs/, my_tests/ (escaped newlines, quoted labels, `#` inside HTML, numeric and unicode ids), test_parser.py                             | 227 (downloaded)                                                                                                     |
| ts-graphviz                       | github.com/ts-graphviz/ts-graphviz `packages/ast/src/dot-shim/parser/parse.test.ts` plus the peggy grammar | MIT                                                                              | 68 parser tests, including nesting, size and chain limits                                                                                  | 47 .dot (43 downloaded)                                                                                              |
| graphlib-dot                      | github.com/dagrejs/graphlib-dot `test/read-one-test.js`                                                    | MIT                                                                              | 60 cases: number followed by letter, the first subgraph wins, default scoping, strict                                                      | downloaded                                                                                                           |
| tree-sitter-dot                   | github.com/rydesun/tree-sitter-dot `test/corpus/{blocks,ids,statements}.txt`                               | MIT                                                                              | ids, numbers, strings, HTML, ports, comments, case                                                                                         | 3 (downloaded)                                                                                                       |
| JGraphT                           | `jgrapht-io/.../nio/dot/DOTImporter{1,2}Test.java` plus `DOT.g4`                                           | EPL-2.0/LGPL-2.1                                                                 | about 40 inline edge cases                                                                                                                 | downloaded                                                                                                           |
| Gephi                             | `ImportPlugin/.../file/dot/*.dot`                                                                          | CDDL/GPL-3.0                                                                     | 18 files: attribute statements, chained attributes, hash comments, no spaces                                                               | reference only                                                                                                       |
| @hpcc-js/wasm                     | github.com/hpcc-systems/hpcc-js-wasm                                                                       | Apache-2.0                                                                       | Graphviz compiled to WASM                                                                                                                  | Usable as a **reference oracle** in Node: parse each corpus file with real Graphviz and compare node and edge counts |

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

| Case                                                                     | GV                                        | graph-io today                                                                                       | Right behaviour                                         |
| ------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `strict` / `graph` / `digraph`; named, anonymous, numeral or quoted name | OK                                        | Supported                                                                                            | Keep it.                                                |
| Keywords in any case (`DiGraph`, `NODE`, `SubGraph`)                     | OK                                        | Supported                                                                                            | Keep it.                                                |
| A bare keyword used as an id (`node -> b`); a quoted keyword (`"node"`)  | Error; a quoted keyword is an ordinary id | Supported                                                                                            | Keep it.                                                |
| Numerals `1`, `1.0`, `01`, `-.5`, `.5`                                   | All distinct names                        | `-.5` and `1.` lex correctly. Canonical ids turn `1` into the number 1; `1.0` and `01` stay strings. | Test that `1`, `1.0` and `01` are three distinct nodes. |
| `2x`, `1.2.3`, `1e3`                                                     | Split into two tokens, with a warning     | Split, with `NUMERAL_AMBIGUITY`                                                                      | Keep it.                                                |
| Unquoted non-ASCII id                                                    | OK                                        | Supported                                                                                            | Keep it.                                                |

**Strings**

| Case                                                                       | GV                                                   | graph-io today                                                                             | Right behaviour                                                                                                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `\"` and `\\` inside a quoted string                                       | Only `\"` is unescaped; `\\` stays as two characters | Same                                                                                       | Keep it.                                                                                                                                     |
| escString sequences `\N \G \E \T \H \L \n \l \r`                           | Expanded at layout time                              | Kept literally                                                                             | Keep them raw at import. Expanding them for display belongs to the renderer.                                                                 |
| Backslash-newline inside a quoted string; a raw newline in a quoted string | The first joins the lines; the second is kept        | Same                                                                                       | Keep it.                                                                                                                                     |
| `"a" + "b"`; `+` next to an unquoted id                                    | Concatenated; the unquoted case is an error          | Quoted only                                                                                | Keep it.                                                                                                                                     |
| HTML strings with nested `<>` and entities; an unbalanced `<`              | Stored raw with an HTML flag; unbalanced is an error | Kept verbatim, but **the HTML flag is dropped**, so `<b>` and `"<b>"` become the same text | Keep an HTML marker, e.g. a column flag or a typed value, so the exporter can write `<...>` again. Add a nesting cap (ts-graphviz uses 100). |

**Comments, separators and multiple graphs**

| Case                                                                         | GV                                                            | graph-io today                                    | Right behaviour                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `//`, `/* */`; an unterminated `/*`                                          | Comments; the unterminated one is an error                    | Same                                              | Keep it.                                                                             |
| `#` at the start of a line; an **indented `#`**; a mid-line `#`              | All ignored to the end of the line (the last is undocumented) | **Only column 0 works; an indented `#` is fatal** | Accept `#` to the end of the line wherever it is outside a string, as Graphviz does. |
| A `# N "file"` line directive                                                | Resets line numbers                                           | Skipped                                           | Keep it.                                                                             |
| `;` and `,` optional; `a, b -> c` (comma node list, outside the doc grammar) | Accepted; yields a->c and b->c                                | Comma node list: unknown                          | Test it; accept it.                                                                  |
| Several graphs in one file                                                   | `dot` renders each one                                        | First graph only, with `MULTIPLE_GRAPHS`          | Keep it. Returning a list would be a public API decision.                            |
| Empty file; only comments; `graph {}`; a missing `}`                         | No graph; OK; error                                           | `EMPTY_INPUT` / fatal                             | Keep it.                                                                             |

**Subgraphs, edges and attributes**

| Case                                                                              | GV                                                                              | graph-io today                                                 | Right behaviour                                                                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Named, anonymous and bare `{}` subgraphs; the same name reused (they merge)       | OK                                                                              | Supported                                                      | Test the reuse case.                                                                                                                                       |
| `cluster` name prefix; `cluster=true`                                             | Clusters                                                                        | Container node plus parent                                     | Keep it.                                                                                                                                                   |
| A node in several subgraphs or clusters                                           | Allowed                                                                         | `CLUSTER_CONFLICT`: first kept                                 | Acceptable with the warning, because the data model has one parent.                                                                                        |
| `{a b} -> {c d}` (4 edges); a subgraph as one endpoint; a chain `a->b->c [attrs]` | OK                                                                              | Supported                                                      | Keep it.                                                                                                                                                   |
| Ports `a:p`, `a:p:ne`, `a:ne`, `a:_`, `a:c`                                       | OK                                                                              | Raw text; a port on a node statement is dropped with a warning | Keep it.                                                                                                                                                   |
| Several attribute lists `[x=1][y=2]`; `,` / `;` / space separators                | Merged; the last wins                                                           | Supported                                                      | Keep it.                                                                                                                                                   |
| An unquoted comma list as a value (`fontname=Vera Sans, DejaVu`)                  | Error (issue 191)                                                               | ?                                                              | Test it; it must be an error.                                                                                                                              |
| An attribute with no value (`[a]`)                                                | Error                                                                           | ?                                                              | Test it; it must be an error.                                                                                                                              |
| `node` / `edge` defaults                                                          | Apply only to objects created later, inside that subgraph and its children      | Node defaults apply only at creation (1099-1111)               | Test the `edge_default_scope` probe.                                                                                                                       |
| Subgraph inheritance                                                              | Takes the value as of the moment the subgraph is defined                        | Copied when the scope opens                                    | Keep it.                                                                                                                                                   |
| `strict` with repeated edges, `b--a` against `a--b`, one self-loop                | Merged, latest attributes win; the self-loop is kept once                       | `STRICT_MERGED`                                                | Keep it.                                                                                                                                                   |
| Edge `key`                                                                        | Names the edge                                                                  | Edge-id column; `KEY_MERGED`                                   | Keep it.                                                                                                                                                   |
| **`--` in a digraph, or `->` in a graph**                                         | **Fatal syntax error**                                                          | Warning `EDGE_OPERATOR` by default; the edge is kept           | Being more lenient than Graphviz is acceptable, since it rejects nothing Graphviz accepts. Keep the warning and document that Graphviz rejects such files. |
| `charset=latin1`                                                                  | Decoded as Latin-1; invalid UTF-8 without a charset gives a warning and Latin-1 | **Fatal `E_INVALID_UTF8`**                                     | Honour `charset`; see cross-format finding 1.                                                                                                              |
| UTF-8 BOM; CRLF; `@` outside a string; attribute macros `graph x = [...]`         | BOM ignored; OK; error; warning                                                 | BOM stripped; the others need tests                            | Test them.                                                                                                                                                 |

**Size limits**

| Case                                                                                        | GV                                            | graph-io today                     | Right behaviour                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------- | ------------------------------------ |
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

| Source              | Path                                                                                                                                                                                                                                                                                                                         | License     | Covers                                                                                          | Files                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| networkx            | `readwrite/tests/test_pajek.py`                                                                                                                                                                                                                                                                                              | BSD-3       | 9 inline tests: arcs, matrix, unicode, quotes                                                   | 1 (downloaded)                  |
| igraph              | `tests/unit/*.net` (pajek1..6: CR, CRLF and LF; `*Edges 9` counts; arcslist; edgeslist; 2-mode lists; a rectangular matrix with an extra column; a signed matrix; UTF-8 BOM plus custom parameters), `tests/regression/invalid_pajek*.net` (bad 2-mode headers, id 0), `examples/simple/links.net`, plus `.out` expectations | GPL-2.0+    | the broadest Pajek edge-case set available                                                      | 17 (downloaded, reference only) |
| Pajek teaching data | `mrvar.fdv.uni-lj.si/sola/info4/multinet/DATA/`                                                                                                                                                                                                                                                                              | none stated | `*Arcs :k`, `*Arcslist :k`, `*Matrix :k`, an empty `*Arcs`, missing weights, `.tim` with `AE:2` | 6 (downloaded)                  |

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
- The gd/\*.NET graph-drawing contest files: shapes and colours.

**What the 171 downloaded files contain:**

- `*Partition` 40, `*Vector` 26.
- 2-mode 24, `*Matrix` 17, `:k` relations 16.
- Time sets 3.
- UTF-8 with BOM 5.
- No genuine cp1250 file was found.

### 6.4 Checklist

graph-io source: `formats/pajek/syntax.ts` and `importer.ts`.

**Sections**

| Case                                                                                                                            | graph-io today                                                                                                                                                                            | Right behaviour                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `*Network`, `*Vertices n`, `*Arcs`, `*Edges`, `*Arcslist`, `*Edgeslist`, `*Matrix`, each with `:k "name"`; keywords in any case | Supported; relation goes to a `relation` column                                                                                                                                           | Keep it. Test a repeated `:k` header and `:0`.                                                                             |
| `*Arcs n` / `*Edges n` with a count                                                                                             | ?                                                                                                                                                                                         | Accept it and ignore the count; warn on a mismatch. Test it.                                                               |
| **`*Partition`, `*Vector`** (in 40 and 26 of 171 real files)                                                                    | Node columns `partition` (i32) and `vector` (f64), later ones `partition#2`, ...; the object names in `meta.extra.pajek.objects`; one before the first `*Network` applies to that network | Import each one as a vertex attribute named after the object, as statnet does. At minimum, record a warning, not an error. |
| `*Permutation`, `*Cluster`, `*Hierarchy`, `*Events` / `.tim`                                                                    | `W_PAJEK_UNSUPPORTED_SECTION` (a warning); lines skipped                                                                                                                                  | A warning, not an error.                                                                                                   |
| **A `.paj` holding several networks** (Tina.paj)                                                                                | **`MULTIPLE_NETWORKS` aborts the import**                                                                                                                                                 | Import the first network and warn. Returning all of them would be a public API decision.                                   |
| Text before the first `*`                                                                                                       | `OUTSIDE_SECTION`                                                                                                                                                                         | Warn and skip.                                                                                                             |

**Vertex lines**

| Case                                                                                     | graph-io today                                                                                                                                      | Right behaviour                                                                                                                    |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `*Vertices n` with fewer vertex lines, or none                                           | n vertices; `W_PAJEK_VERTEX_COUNT` (a warning) for a partial list                                                                                   | Create n vertices, with label = number. No warning is needed (common in real files).                                               |
| Vertex lines out of order; duplicates                                                    | `DUPLICATE_NODE`                                                                                                                                    | Warn; the last one wins.                                                                                                           |
| A vertex line without a label; with coordinates but no label (`1 0.1 0.2`)               | A bare run of exactly two numbers after the vertex number is x y with no label; a quoted token, a lone number or a longer run starts with the label | A label is always present in Pajek's own output. Test igraph's files; if a line is numeric-only, treat the numbers as coordinates. |
| A quoted label containing spaces; an unquoted label; `"` inside a label; `\n`; `&#dddd;` | Quotes are stripped; no escapes; `&#dddd;` and `&#xhh;` are decoded in labels                                                                       | Decode `&#dddd;` (Pajek does). Keep `\n` literally.                                                                                |
| Encoding: a BOM means UTF-8, otherwise ANSI                                              | UTF-8 only                                                                                                                                          | See cross-format finding 1. Pajek's own default is ANSI without a BOM.                                                             |
| Coordinates: 2 or 3, missing, 0..1                                                       | Position; `COORD_DIMS` on a mix                                                                                                                     | Keep it.                                                                                                                           |
| **Shapes: ellipse, box, diamond, triangle, cross, empty, plus house, man, woman**        | All 9, in any case, stored lower-cased                                                                                                              | Match case-insensitively and include all 9.                                                                                        |
| Vertex parameters and colours (named, `RGBrrggbb`, `RGB(...)`, `CMYK...`)                | Plain text-inferred columns; no colour or size role                                                                                                 | Optionally map `ic` to the colour role and `x_fact` to size.                                                                       |
| **2-mode `*Vertices n n1`**                                                              | `meta.extra.pajek.firstMode`; no per-vertex mode column; `n1 > n` is a fatal `E_PAJEK_VERTICES_COUNT`                                               | Add a mode column (igraph adds a `type`). A same-mode edge: warn. `n1 > n`: error.                                                 |

**Arc and edge lines**

| Case                                                                             | graph-io today                                                                                                                           | Right behaviour                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Weight missing, negative, a float, `1e-3`                                        | Weight                                                                                                                                   | Keep it.                                                                     |
| Mixed `*Arcs` and `*Edges`; an empty `*Arcs` block                               | Direction per section, so mixed direction works; the direction is set by the first line, so an empty `*Arcs` block does not count        | Keep it. An empty `*Arcs` block must not make the graph mixed. Test USAir97. |
| `*Arcslist` / `*Edgeslist` `u v1 v2 ...`; a negative id                          | Supported; a negative id is read as its absolute value (no warning)                                                                      | A negative id means its absolute value; warn, as Pajek's authors do.         |
| **`*Matrix`: a rectangular 2-mode n1 x n2**, short or long rows, signed values   | n x n, or n1 x (n - n1) under `*Vertices n n1`; a short row is `LINE`, a long row's extra values are ignored with `W_PAJEK_MATRIX_EXTRA` | Support 2-mode matrices (divorce.net).                                       |
| Time intervals `[1-3,5]`, `[2-*]`, `[1,2,3]`, `[ 1 ]`, `[]`; a `[` inside a NAME | Spells; blanks inside the brackets are ignored and `[]` is no spell                                                                      | Test Padgett.paj's name.                                                     |
| Vertex id out of range; 0-based files; duplicate edges                           | Error; `ZERO_BASED`; kept                                                                                                                | Keep it.                                                                     |

**Lines and comments**

| Case                                                                                    | graph-io today | Right behaviour |
| --------------------------------------------------------------------------------------- | -------------- | --------------- |
| `%` comments, including indented; blank lines; trailing whitespace; tabs; CRLF; bare CR | Supported      | Keep it.        |

---

## 7. CSV / TSV (edge lists and node + edge tables)

### 7.1 Specifications and conventions

| Document                                        | URL                                                                                                                    | Notes                                                                                                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RFC 4180                                        | https://www.rfc-editor.org/rfc/rfc4180                                                                                 | Oct 2005, Informational. CRLF, optional header, `""` escape; quoted fields may contain `,` CR LF; spaces are significant.                                                                                             |
| RFC 4180-bis draft                              | https://datatracker.ietf.org/doc/draft-shafranovich-rfc4180-bis/                                                       | Expired draft; adds UTF-8 and LF                                                                                                                                                                                      |
| W3C CSVW tabular data model and dialect         | https://www.w3.org/TR/tabular-data-model/ ; dialect at https://www.w3.org/TR/tabular-metadata/ section 5.9             | W3C Rec 2015. Dialect defaults: commentPrefix `#`, header true, quoteChar `"`, doubleQuote true, **trim true**, lineTerminators CRLF and LF                                                                           |
| Frictionless CSV Dialect                        | https://specs.frictionlessdata.io/csv-dialect/                                                                         | Adds `escapeChar`, `nullSequence`                                                                                                                                                                                     |
| IANA text/tab-separated-values                  | https://www.iana.org/assignments/media-types/text/tab-separated-values                                                 | A header is required; no quoting; tabs are not allowed inside fields                                                                                                                                                  |
| Gephi CSV: edge list, adjacency list, matrix    | https://web.archive.org/web/2023/https://gephi.org/users/supported-graph-formats/csv-format/                           | Live page is gone. Separators `, ; \|` and whitespace; `'` or `"` quotes; **a row with more than 2 cells is an adjacency list**; a repeated edge increments its weight; the matrix form starts with a `;A;B;C` header |
| Gephi spreadsheet (node table + edge table)     | https://web.archive.org/web/2023/https://gephi.org/users/supported-graph-formats/spreadsheet/                          | Id, Label; Source, Target, Type (Directed / Undirected / Mixed), Id, Label, Weight, Interval / Timeset                                                                                                                |
| SNAP                                            | https://snap.stanford.edu/data/                                                                                        | `#` header lines; **tab or space**; CRLF in some files                                                                                                                                                                |
| KONECT                                          | http://konect.cc/networks/ (HTTP only) ; handbook github.com/kunegis/konect-handbook                                   | `% sym\|asym\|bip <weight type>`, then `% edges n1 n2`; whitespace-separated; 1-based; a trailing space; **bip files have two separate id spaces**                                                                    |
| networkx edgelist / adjlist / multiline adjlist | https://networkx.org/documentation/stable/reference/readwrite/edgelist.html (and adjlist.html, multiline_adjlist.html) | Whitespace delimiter; the data column is a **Python dict repr** `{'weight': 4}`                                                                                                                                       |
| igraph edgelist / ncol / lgl                    | https://igraph.org/c/doc/igraph-Foreign.html                                                                           | In lgl, **`#` starts a vertex line, not a comment**                                                                                                                                                                   |
| Cytoscape table import                          | https://manual.cytoscape.org/en/stable/Creating_Networks.html                                                          |                                                                                                                                                                                                                       |

### 7.2 Test suites

| Source                                                  | License                         | Covers                                                                                                  | Files                |
| ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| csv-spectrum (github.com/max-mapper/csv-spectrum)       | BSD-2-Clause (per package.json) | RFC basics, each with expected JSON                                                                     | 12 + 12 (downloaded) |
| PapaParse `tests/test-cases.js`                         | MIT                             | 263 cases: quotes, delimiter guessing, comments, BOM, empty lines, duplicate headers, newline detection | 1 (downloaded)       |
| CPython `Lib/test/test_csv.py`                          | PSF-2.0                         | 156 tests: dialects, quoting, escapechar, strict mode, the Sniffer                                      | 1 (downloaded)       |
| W3C CSVW test suite (https://w3c.github.io/csvw/tests/) | W3C test suite license          | 282 validation tests (76 positive, 145 negative, 61 warning), 270 to-JSON, 270 to-RDF                   | manifests downloaded |
| networkx `test_edgelist.py`, `test_adjlist.py`          | BSD-3                           | 21 + 26 tests                                                                                           | downloaded           |
| csv-test-data (github.com/sineemore/csv-test-data)      | **no license**                  | 25 files including bad-\*                                                                               | not downloaded       |

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

| Case                                                                         | graph-io today                                   | Right behaviour                                                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| RFC quoting: `""`; delimiter, CR, LF or CRLF inside quotes                   | Supported                                        | Keep it. Run csv-spectrum and the RFC cases in PapaParse.                                                            |
| A bare quote inside an unquoted field (`a"b`)                                | ?                                                | Keep it literally and warn. Test it.                                                                                 |
| Text after a closing quote (`"a"b`)                                          | Fatal `E_CSV_QUOTE`                              | Acceptable, because PapaParse and Python strict mode also flag it. Consider a warning plus joining the text instead. |
| An unterminated quote                                                        | Fatal                                            | Keep it, with the line number.                                                                                       |
| Backslash escape `\"` (the Neo4j LOAD CSV default, CSVW `doubleQuote:false`) | Not supported                                    | Add an opt-in option.                                                                                                |
| Trailing delimiter; trailing newline or not; blank lines                     | Blank lines skipped                              | Test that none of these produces a phantom row.                                                                      |
| **Whitespace around fields** (`a, b`)                                        | **Not trimmed, silently; the id becomes `" b"`** | Trim unquoted endpoint and id cells (CSVW's default is trim true), or warn. Quoted whitespace stays.                 |

**Encoding and line endings**

| Case                                                         | graph-io today                        | Right behaviour             |
| ------------------------------------------------------------ | ------------------------------------- | --------------------------- |
| UTF-8 BOM; UTF-16LE TSV (Excel "Unicode text"); Windows-1252 | BOM stripped; the other two are fatal | See cross-format finding 1. |
| CR-only line endings                                         | Supported                             | Keep it.                    |

**Delimiters and headers**

| Case                                                                                                | graph-io today                                                                                             | Right behaviour                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Delimiter sniffing `, ; \t \| space`; Excel `sep=;` first line                                      | Sniffed over 10 rows; **`sep=` is not recognised**                                                         | Honour `sep=`.                                                                                                                                                                                         |
| **Runs of whitespace as the delimiter** (SNAP, KONECT, networkx, igraph); a trailing space (KONECT) | **A space delimiter does not collapse runs**, so empty fields cause `FIELD_COUNT` or blank-endpoint errors | Add a whitespace delimiter mode that collapses runs and ignores trailing space. Use it automatically for `.edges`, `.edgelist`, `.txt` and KONECT `out.*` files, and whenever the sniffer picks space. |
| Header present or absent; a header in a comment (`# source, target`, `# FromNodeId ToNodeId`)       | Header detected by known names or text-over-numbers; comment headers are not read                          | Read column names from the last leading `#` line when it looks like a header.                                                                                                                          |
| **A header with unknown names over all-text data**                                                  | **Read as a data row, silently**, so `from_node,to_node` becomes an edge                                   | Warn when the first row could be a header, e.g. no row after it repeats its text and its cells look like identifiers.                                                                                  |
| Duplicate header names; header case; `Source` / `source` / `SOURCE`                                 | Duplicates renamed `name#pos`; markers matched case-insensitively                                          | Keep it.                                                                                                                                                                                               |
| Ragged rows                                                                                         | `FIELD_COUNT`                                                                                              | Keep it.                                                                                                                                                                                               |

**Comments**

| Case                                                     | graph-io today                                                                                          | Right behaviour                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `#` and `%` comment lines: leading, or later in the file | Leading only, with direction hints (`% sym`, `# Directed graph`); **a later `#` line becomes a record** | Treat `#` / `%` lines anywhere as comments in edge-list files. igraph's lgl is the exception, where `#` is data; that is a different format. |
| KONECT's second `%` line (edge and node counts); `% bip` | `% bip` is read as a direction hint                                                                     | For `bip`, prefix the right-side ids so the two id spaces do not collide (e.g. `r:1`); warn.                                                 |

**Row shapes**

| Case                                                                       | graph-io today                                             | Right behaviour                                                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Third column as a weight; KONECT's fourth column as a timestamp            | Positional: source, target, weight, then `column4`         | Keep it. Map KONECT's fourth column to a time column.                                                                  |
| networkx dict-repr column `{'weight': 4}`                                  | A string                                                   | Parse the Python-literal subset, or warn that it is not JSON.                                                          |
| **Adjacency-list rows** (Gephi `b;c;d`, networkx adjlist)                  | **Not supported; silently misread** (c becomes the weight) | Add an adjacency-list mode. Detect variable-width headerless rows and warn.                                            |
| **Matrix CSV** (Gephi `;A;B;C`)                                            | Not supported                                              | Detect it (empty first cell, and the header labels repeat down the first column) and import it, or give a clear error. |
| Repeated edges; self-loops                                                 | Kept                                                       | Keep them. Document that Gephi adds weights.                                                                           |
| Node table plus edge table (Gephi, Netzschleuder nodes.csv plus edges.csv) | `nodes` option / `table:"nodes"`                           | Keep it.                                                                                                               |
| Per-row `Type` Directed / Undirected / Mixed                               | Gephi dialect                                              | Keep it.                                                                                                               |
| Ids `01` against `1`; `1.0`                                                | Canonical rule: `01` stays a string                        | Keep it.                                                                                                               |
| An empty endpoint                                                          | `MISSING_ENDPOINT`                                         | Keep it.                                                                                                               |
| `\N` null (OpenFlights, MySQL dumps); decimal comma with `;`               | Not supported                                              | Add an optional `nullSequence`. Never guess a decimal comma.                                                           |

---

## 8. JSON graph dialects

### 8.1 Specifications

| Dialect                                            | URL                                                                                                                       | Shape                                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| JSON                                               | https://www.rfc-editor.org/rfc/rfc8259 ; JSON Lines https://jsonlines.org/                                                | NaN and Infinity are invalid; duplicate keys are undefined; a BOM may be ignored                                                                                                                                                             |
| networkx node_link                                 | https://networkx.org/documentation/stable/reference/readwrite/generated/networkx.readwrite.json_graph.node_link_data.html | `{directed, multigraph, graph, nodes:[{id}], links                                                                                                                                                                                           | edges:[{source,target,key?}]}`. **The key is `links`up to 3.5 and`edges` from 3.6.** Python writes **NaN / Infinity\*\* literals. |
| networkx adjacency_data, cytoscape_data, tree_data | .../json_graph.adjacency_data.html etc.                                                                                   | adjacency: `nodes` plus a parallel `adjacency:[[{id}]]` array. tree: nested `{id, children}`.                                                                                                                                                |
| JSON Graph Format (JGF)                            | https://jsongraphformat.info/ ; github.com/jsongraph/json-graph-specification (MIT)                                       | v1 schema (draft-04): `nodes` is an array. v2 schema (`$id .../v2.1/...`, draft-07): **`nodes` is an object keyed by id**; `graph` or `graphs`; `directed` defaults to true; hyperedges in two forms. Media type `application/vnd.jgf+json`. |
| Cytoscape.js                                       | https://js.cytoscape.org/                                                                                                 | `{elements:{nodes,edges}}` or a flat array with `group`; `data.id/source/target/parent`, `position`, `classes`, and flags                                                                                                                    |
| Cytoscape desktop .cyjs                            | https://manual.cytoscape.org/en/stable/Supported_Network_File_Formats.html                                                | `{format_version, generated_by, data, elements}`; `data.id` holds the SUID as a string. A third variant, **top-level `{nodes, edges}` with `data` objects**, appears in cytoscape.js `debug/gal.json`.                                       |
| d3 force                                           | https://d3js.org/d3-force/link                                                                                            | `{nodes, links}`; a link endpoint is an **index** (vega miserables) or an **id** (the mbostock gist)                                                                                                                                         |
| graphology                                         | https://graphology.github.io/serialization.html                                                                           | `{attributes, options:{type,multi,allowSelfLoops}, nodes:[{key,attributes}], edges:[{key,source,target,undirected,attributes}]}`                                                                                                             |
| vis-network                                        | https://visjs.github.io/vis-network/docs/network/                                                                         | `{nodes:[{id,label,x,y}], edges:[{from,to,arrows}]}`                                                                                                                                                                                         |
| Gephi JSON exporter / sigma.js                     | no specification                                                                                                          | `{nodes:[{id,label,x,y,size,color:"rgb(..)",attributes}], edges:[{id,source,target,size,color,attributes}]}`                                                                                                                                 |
| Neo4j APOC JSON                                    | see section 9                                                                                                             |                                                                                                                                                                                                                                              |

### 8.2 Test suites

| Source                                                                       | License          | Covers                                                                                                                             | Files                                                  |
| ---------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| JSONTestSuite (github.com/nst/JSONTestSuite)                                 | MIT              | The JSON layer: 95 must-accept (y*), 188 must-reject (n*) and 35 implementation-defined (i\_) cases                                | 318 (downloaded)                                       |
| JGF examples and schemas                                                     | MIT              | v2 only: a single graph, a `graphs` array, both hyperedge forms, metadata, an empty graph                                          | 7 examples + 2 schemas + test-examples.py (downloaded) |
| networkx json_graph tests                                                    | BSD-3            | round trips for node_link, adjacency, cytoscape and tree                                                                           | 10 + 8 + 7 + 3 tests (downloaded)                      |
| cytoscape.js `benchmark/graphs/abcde.json`, `debug/gal.json`, webgl fixtures | MIT              | the elements shapes, desktop export, compound nodes                                                                                | 4 small files (downloaded)                             |
| graphology community-louvain datasets (clique3, eurosis)                     | MIT              | the Gephi / sigma shape                                                                                                            | 2 (downloaded)                                         |
| networkx 3.1 generated output                                                | produced locally | node_link, adjacency, cytoscape and tree, **plus one file containing NaN, Infinity, 2^64+1, a tuple node, and both `1` and `"1"`** | in `downloads/json/networkx/generated/`                |

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

| Case                                                                                   | graph-io today                        | Right behaviour                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSONTestSuite y* / n* / i\_                                                            | `JSON.parse`                          | Run the suite once. n\_ files must fail with `E_JSON_SYNTAX`, never crash. The deep-nesting cases (`n_structure_100000_opening_arrays`) must give a clean error. |
| **NaN / Infinity / -Infinity literals** (networkx writes them whenever a value is NaN) | **Fatal `SYNTAX`**                    | Accept them in a lenient pre-pass and warn, because networkx is the most common producer. Use a token-aware replacement, never a regex over strings.             |
| Integers beyond 2^53 (networkx `2**64+1`; Neo4j ids)                                   | **Silently rounded by JSON.parse**    | Detect long integer tokens and keep ids as strings; warn for attributes.                                                                                         |
| Duplicate object keys                                                                  | Last one wins, silently               | Accept that JSON.parse cannot see them; document it.                                                                                                             |
| BOM; trailing commas; comments                                                         | BOM stripped; the other two are fatal | Keep it.                                                                                                                                                         |
| JSON Lines, or a top-level array of records                                            | Fatal                                 | See the APOC rows in section 9.                                                                                                                                  |

**Dialect detection**

| Case            | graph-io today                                            | Right behaviour                                                              |
| --------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Detection order | Fixed order that **inspects only the first node or edge** | Keep the order, but check a few elements. The `dialect` option overrides it. |

**node-link and d3**

| Case                                                                   | graph-io today                                                                                | Right behaviour                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `links` against `edges`; **both present**                              | `edges` wins; **`links` silently ignored**                                                    | Both present: error, or warn and read both.                |
| `directed`, `multigraph`, `key`                                        | `key` is a plain attribute                                                                    | Keep it; the multigraph `key` should get the edge-id role. |
| d3 links by index against by id; a numeric endpoint that matches an id | `indexLinks` is automatic: index when every endpoint is an integer and no node id is a number | Keep it. Test both miserables files.                       |
| Tuple ids (networkx writes `[0,1]`)                                    | ?                                                                                             | Stringify canonically (JSON.stringify) and warn.           |
| Missing endpoint; duplicate node id; duplicate edge id                 | `MISSING_ENDPOINT`; merged; skipped                                                           | Keep it.                                                   |

**JGF**

| Case                                                                                               | graph-io today | Right behaviour                                                                             |
| -------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| v1 arrays; v2 object map; `graphs` array; `directed` default true; per-edge `directed`; hyperedges | Supported      | Keep it. The v1 quirk where `id` is also written as an `id#element` column should be fixed. |

**Cytoscape**

| Case                                                                                     | graph-io today                                                                                               | Right behaviour                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `{elements:{}}`, a flat array, top-level `{nodes,edges}` with `data` (gal.json); `.cyjs` | The first two are supported; **gal.json's shape probably falls through to node-link and fails on `data.id`** | Detect `nodes[0].data` and route it to Cytoscape. Test gal.json. |
| Cytoscape `position.z`; a node without an id                                             | z is silently ignored; `MISSING_ID`                                                                          | Keep z in a 3-component position.                                |

**Other dialects**

| Case                                                                          | graph-io today                                               | Right behaviour                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| graphology `options.type` / `multi` / `allowSelfLoops`; per-edge `undirected` | Supported                                                    | Warn on a self-loop when `allowSelfLoops` is false.                                                 |
| vis `from` / `to`; `arrows`                                                   | `arrows` is a plain attribute; x and y have no position role | Map vis `x` / `y` to position. `arrows` could decide direction; at least document that it does not. |
| Gephi / sigma `color:"rgb(r,g,b)"`, `x`, `y`, `size`                          | Plain columns                                                | Map them to position and style.                                                                     |
| networkx `adjacency_data` / `tree_data`                                       | Fatal `DIALECT`                                              | Support them. Both are simple, and networkx users produce them.                                     |

---

## 9. Neo4j

### 9.1 Specifications

| Format                        | URL                                                                                                         | Notes                                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| neo4j-admin import CSV header | https://neo4j.com/docs/operations-manual/current/import/header-format/ ; options at .../import/full-import/ | Covers Neo4j 2026.09. The field types are listed below the table.                                                                                 |
| neo4j-admin import options    | same pages                                                                                                  | Defaults listed below the table                                                                                                                   |
| LOAD CSV                      | https://neo4j.com/docs/cypher-manual/current/clauses/load-csv/                                              | Every value is a string. **`\` escaping is ON by default** (`dbms.import.csv.legacy_quote_escaping`), the opposite of neo4j-admin.                |
| APOC JSON                     | https://neo4j.com/docs/apoc/current/export/json/                                                            | The shapes are listed below the table                                                                                                             |
| APOC CSV                      | https://neo4j.com/docs/apoc/current/export/csv/                                                             | `_id,_labels,<props>,_start,_end,_type,<props>`; labels written `:A:B`; `quotes:always`; nulls and `""` are identical unless `differentiateNulls` |
| APOC GraphML                  | https://neo4j.com/docs/apoc/current/export/graphml/                                                         | `labels=":A:B"` plus a `labels` data key; `useTypes`                                                                                              |
| APOC Cypher export            | https://neo4j.com/docs/apoc/current/export/cypher/                                                          | Cypher statements; out of scope                                                                                                                   |

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

| Source                                                                                                                                                                     | License             | Covers                                                                                                                                                                            | Files                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| neo4j/apoc `core/src/test/resources/exportJSON/`                                                                                                                           | Apache-2.0          | every APOC JSON variant: all, data, graph, query, id_as_keys, array, with or without properties, multiLabels, nodes_without_labels, points, datetime, relationship_type_injection | 40 (39 downloaded; testTerminate.json, 9.9 MB, skipped) |
| neo4j/apoc `init_neo4j_export_csv.cypher`, `fileWithUnicode.graphml`                                                                                                       | Apache-2.0          | APOC CSV setup, APOC GraphML                                                                                                                                                      | downloaded                                              |
| neo4j/neo4j `community/import-util/.../CsvInputTest.java`, `community/csv/...` (BufferedCharSeeker), `ImportCommandTest.java`, LOAD CSV `load.csv` / `load-no-headers.csv` | GPL-3.0             | header parsing, id spaces, types, quoting, multiline                                                                                                                              | 5 (reference only)                                      |
| neo4j-graph-examples: movies `scripts/movies.cypher`, northwind `import/*.csv`                                                                                             | **no LICENSE file** | the standard example graphs                                                                                                                                                       | 1 + 11 (downloaded)                                     |

### 9.3 Real-world corpora

- The movies, northwind and recommendations example graphs (github.com/neo4j-graph-examples).
- `https://data.neo4j.com/importing-cypher/{books,persons,movies,acted_in}.csv` (not downloaded).
- No public neo4j-admin CSV corpus exists. Build one by running APOC's `bulkImport:true` export over
  the example graphs.

### 9.4 Checklist

graph-io source: `formats/neo4j/header.ts` and `importer.ts`.

**neo4j-admin header and values**

| Case                                                                                       | graph-io today                                                                                                                               | Right behaviour                                                                                                                   |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Every header type, `T[]` arrays, a configurable array delimiter                            | Supported; `duration` becomes a string; `point` becomes json                                                                                 | Keep it.                                                                                                                          |
| `vector{...}` (a quoted header cell)                                                       | ?                                                                                                                                            | Parse it as a list of f32 / f64. Test it.                                                                                         |
| boolean: only exactly `true` is true in Neo4j                                              | Accepts true / false / 1 / 0 in any case; anything else is a parse failure that **skips the whole row**                                      | Accept the same set, but a value outside it should warn and leave the cell unset, not drop the row.                               |
| int / long beyond 2^53                                                                     | f64 plus `PRECISION`, or `long:"string"`                                                                                                     | Keep it.                                                                                                                          |
| **`:START_ID(space)` / `:END_ID(space)`**                                                  | Supported: a node of a space is stored as `space:id` (id text in `originalId`, space in `idSpace`) and endpoints resolve inside their space. | Qualify ids by space (e.g. `space:id`), or keep a per-space map. A file using `Person(1)` and `Movie(1)` is common and must work. |
| Several `:ID` columns (composite key)                                                      | ?                                                                                                                                            | Concatenate them as Neo4j does. Test it.                                                                                          |
| `:LABEL` split by the array delimiter; `{label:X}` on `:ID`; `:IGNORE`; `:TYPE`            | Supported                                                                                                                                    | Keep it.                                                                                                                          |
| A missing `:TYPE` column (the type comes from the command line)                            | ?                                                                                                                                            | Add a `relationshipType` option, or error clearly.                                                                                |
| Header in a separate file; several data files; `--auto-skip-subsequent-headers`            | Several sections per file; `nodes[]` / `relationships[]` inputs                                                                              | Test a header-only file followed by a data-only file.                                                                             |
| An empty cell against `""`; `--ignore-empty-strings`; an empty array                       | Empty means unset; `""` is an empty string or empty list                                                                                     | Keep it.                                                                                                                          |
| Duplicate node; a dangling relationship                                                    | `DUPLICATE_NODE` (last wins; Neo4j aborts or keeps the first with `--skip-duplicate-nodes`); `MISSING_ENDPOINT`                              | Match Neo4j: first wins, with a warning.                                                                                          |
| `--legacy-style-quoting` / LOAD CSV backslash escaping; multiline fields; the quote option | Quote configurable; no backslash escaping; multiline always allowed                                                                          | Add an opt-in backslash mode.                                                                                                     |

**APOC exports**

| Case                                                             | graph-io today                                                                                                                                       | Right behaviour                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **APOC JSON Lines, ARRAY_JSON, `{nodes,rels}`, JSON_ID_AS_KEYS** | **Not supported.** JSONL is a fatal JSON syntax error; the array form is fatal `DIALECT`; `{nodes,rels}` is misread as node-link with `rels` ignored | Add an `apoc` JSON dialect, plus JSONL sniffing: `{"type":"node"` on the first line. Map `labels` to the labels list, the relationship `label` to the type (role `kind`), and `start.id` / `end.id` to the endpoints. Create a node from a start / end stub when it is missing. |
| **APOC CSV** (`_id,_labels,...,_start,_end,_type`)               | **Not supported.** No `:ID` header, so it is not Neo4j; the CSV importer finds no endpoint columns in node rows                                      | Detect the `_id` + `_start` + `_end` header and split rows by whether `_start` is set. Parse labels written `:A:B`.                                                                                                                                                             |
| APOC GraphML (undeclared `labels` key, `labels=` attribute)      | See GraphML                                                                                                                                          | Warn instead of dropping.                                                                                                                                                                                                                                                       |

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

---

## 11. XGMML (`fixtures/xgmml/`)

Research: `design/graph-io/cytoscape-and-obo/research-xgmml.md` (the dialects of section 2, the
feature inventory of section 3, the mapping of section 4 and the error table of section 5);
design section 1.1. Specification: the XGMML 1.0 draft of 2000-10-06 (archived:
https://web.archive.org/web/20051226113401/http://www.cs.rpi.edu/~puninj/XGMML/draft-xgmml-20001006.html)
and its 2001-06-27 DTD. The reference implementation is Cytoscape's reader and writer
(https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/xgmml,
pinned at 208c1015e565ac55f6a78c2a23aa8196a7cf28ae).

Oracle: Cytoscape 3.10.5 through CyREST, run by the manually dispatched workflow
`.github/workflows/conformance-cytoscape-oracle.yml` (design section 6.3). Until its first run
every expectation is hand-written from the draft, the DTD and the research (`"oracle": "spec"`).
The fixtures where the specification overrules Cytoscape (the root `directed` attribute, numeric
ids, whole-file aborts, the no-namespace refusal, unknown wrappers, dangling edges, collapsed
groups) carry `oracleDisagrees`.

Every file was retrieved on 2026-10-02. SHA-256 of the bytes committed:

| Fixture                                       | Origin                                                                                                                                                                                                             | License (where stated)                                                        | SHA-256                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `cytoscape-impl/simple.xgmml`                 | https://github.com/cytoscape/cytoscape-impl/blob/208c1015e565ac55f6a78c2a23aa8196a7cf28ae/io-impl/impl/src/test/resources/testData/xgmml/simple.xgmml                                                              | LGPL-2.1 (cytoscape-impl LICENSE); test-only                                  | `6becfe699115aa2127855cb7ede62e3bf43589052f76df33f96e3c2ebee2c5ce` |
| `cytoscape-impl/simple_3.3.xgmml`             | same tree, `simple_3.3.xgmml`                                                                                                                                                                                      | LGPL-2.1, test-only                                                           | `fdde19ff576ea8cdecaf6776af6309f6961d85724fa62b7c99d39914fdce1c24` |
| `cytoscape-impl/listAtt.xgmml`                | same tree, `listAtt.xgmml`                                                                                                                                                                                         | LGPL-2.1, test-only                                                           | `14d11e8b82289a15a08379d3872250f5165522e5949bcb1e711ea61d9fb4ff65` |
| `cytoscape-impl/hiddenAtt.xgmml`              | same tree, `hiddenAtt.xgmml`                                                                                                                                                                                       | LGPL-2.1, test-only                                                           | `9dd5d204fdbb2763b6ace710cb24911be0c4b3b7feee272ace95fccfa25afdef` |
| `cytoscape-impl/suid_metadata.xgmml`          | same tree, `suid_metadata.xgmml`                                                                                                                                                                                   | LGPL-2.1, test-only                                                           | `b2f6667f2144ef35c8c12764480ad59bd7340b7925f28af8456c8faa9a396d57` |
| `cytoscape-impl/bare_ampersands.xgmml`        | same tree, `bare_ampersands.xgmml`                                                                                                                                                                                 | LGPL-2.1, test-only                                                           | `3111ed1ad601200dd0760a6c4c021cb325e93600889a11fafa3829b5e410a17d` |
| `cytoscape-impl/empty.xgmml`                  | same tree, `empty.xgmml`                                                                                                                                                                                           | LGPL-2.1, test-only                                                           | `5fee3de28b7de2d30e7c80ed78c2ea3207ceac5529246ce2fbc034e4ad30ef72` |
| `cytoscape-impl/empty_DTD.xgmml`              | same tree, `empty_DTD.xgmml`                                                                                                                                                                                       | LGPL-2.1, test-only                                                           | `0535305df17298a36a4858e87511148d7159f1ba90c3f36be6bbd466bad978d5` |
| `cytoscape-impl/INVALID.xgmml`                | same tree, `INVALID.xgmml`                                                                                                                                                                                         | LGPL-2.1, test-only                                                           | `725d0a421514e02067c0ec52465723505cd50ce4c99ebe8f52841227cc16ed2c` |
| `cytoscape-impl/group_2x_collapsed.xgmml`     | same tree, `group_2x_collapsed.xgmml`                                                                                                                                                                              | LGPL-2.1, test-only                                                           | `5b29cc2182246881d4a2ef3ae72c41979ff69c48b3be2e3a1387c8a4d87e8c80` |
| `cytoscape-impl/group_2x_expanded.xgmml`      | same tree, `group_2x_expanded.xgmml`                                                                                                                                                                               | LGPL-2.1, test-only                                                           | `236a32419730692203e8dd8c568221d392c10e5ecd3650c27e5950d4857a9038` |
| `cytoscape-impl/nested_groups_283.xgmml`      | same tree, `nested_groups_283.xgmml`                                                                                                                                                                               | LGPL-2.1, test-only                                                           | `626b762e065ab8b72cd89d25d7154fc9794eda52144d679ce9c1b116b655bd68` |
| `cytoscape-impl/galFiltered.xgmml`            | same tree, `galFiltered.xgmml`                                                                                                                                                                                     | LGPL-2.1, test-only                                                           | `357c2bf4b2046773fae4a407285a6d95c5970cce53ef290fe7ac28d08ac2635c` |
| `cytoscape-impl/t3/Module_Overview.xgmml`     | https://github.com/cytoscape/cytoscape-impl/blob/208c1015e565ac55f6a78c2a23aa8196a7cf28ae/io-impl/impl/src/test/resources/testData/NNFData/t3.cys, entry `CytoscapeSession-2009_11_19-13_37/Module_Overview.xgmml` | LGPL-2.1, test-only                                                           | `3a98cabcc86cfc4144f3d5900091a5d84e624d825e4823240e2cb208ef371be2` |
| `cytoscape-impl/t3/M1.xgmml`                  | the same session, entry `M1.xgmml`                                                                                                                                                                                 | LGPL-2.1, test-only                                                           | `4fd347cf325942f6489f4a4a2712da4c6afcaaa54372a9e72822341de2ebe2d7` |
| `cytoscape-impl/t3/M2.xgmml`                  | the same session, entry `M2.xgmml`                                                                                                                                                                                 | LGPL-2.1, test-only                                                           | `4bd2ae4289846c6298ef52640766e0fbfd6c51a5f9cc6f3e9ffa984ab0e0997f` |
| `cytoscape-impl/t3/M3.xgmml`                  | the same session, entry `M3.xgmml`                                                                                                                                                                                 | LGPL-2.1, test-only                                                           | `3742ffa43f195f886647478cff7a326c70812adba97407b42d0b88dbf3c341cb` |
| `leovan/yeast_perturbation.xgmml`             | https://github.com/leovan/xgmml/blob/c3cfe0b8234e4f1b4b8bb3ecd9bdf12eb9ce0a75/data/tests/yeast_perturbation.xgmml                                                                                                  | MIT (leovan/xgmml LICENSE); data Ideker et al., Science 292:929 (2001)        | `1117d885e4cd3f8c58445fd577beff1b213d471b996ba21d95b533ee453ee7de` |
| `efi-est/20920_3-oxoacyl_c_20_full_ssn.xgmml` | https://github.com/allie-walker/Natural-product-function/blob/7f86fbc26db47f741a641d5d23470b45bc9c87af/SSN/20920_3-oxoacyl_c_20_full_ssn.xgmml                                                                     | MIT (repository LICENSE); EFI-EST, Zallot et al., Biochemistry 58:4169 (2019) | `b032acde05a875b0a00e29a2eddb123dfab6f3318c12c5b582a3a82593906786` |
| `ngscheckmate/test.out.xgmml`                 | https://github.com/parklab/NGSCheckMate/blob/ef7a38c51dadbd4ef5b6b6db60775f239926f0a8/graph/test.out.xgmml                                                                                                         | MIT (repository LICENSE)                                                      | `b91d43559985c7fd581cb05d48facae573c9d89e569f699c30ea69014edb31bf` |
| `vplg/3k6d_A_albe_PG.xml`                     | https://github.com/dfsp-spirit/vplg/blob/aa8bf6d6692f4fd5d4606cf4a4c5d7c668b99987/bk/bk_protsim/Data/Raw/k6/3k6d/A/3k6d_A_albe_PG.xml                                                                              | GPL-2.0-or-later (repository LICENSE); test-only                              | `c9cf94d440895fc213a4981cb901bb1f382d4892e050b89088bd820dd0ee29dd` |

`authored/*.xgmml` (56 files) are written by `tools/make_xgmml_fixtures.py` (MIT, authored): the
draft's examples D.1 to D.4 re-authored from the specification's structure (not its prose), the
edge cases of research section 7 #22, the 2.x `type="map"`, `cy:hidden` spellings, a list att
with a value, a 3.x nested-network pointer cycle, a group membership cycle, and session-network
and session-view equivalents of `subnetworks.cys` and `nestedGroups_expanded.cys` (whose
repository states no license, so they are reproduced, not copied). Rerun the script after
changing it.

The unit-test corpus `test/corpus/xgmml/` and `test/corpus/malformed/xgmml/` are written by the
same script; `karate.xgmml` is Zachary's karate club built from `test/corpus/gml/karate.gml`.

Not committed: the 25.8 MB EFI-EST network
(`SSN/20870_acyl_transferase_pfam_80_full_ssn.xgmml` of the same repository, MIT), research #15.

## 12. CX version 1 (`fixtures/cx/`)

Research date: 2026-10-02. The feature and error inventory is
`design/graph-io/cytoscape-and-obo/research-cx.md`; the mapping is section 1.2 of `design.md` in
the same folder.

### 12.1 Specification and readers

- CX Data Model (NDEx, last updated 2022-12-13): https://home.ndexbio.org/data-model/ ; the same
  text as Cytoscape Exchange Format Specification version 1:
  https://cytoscape.org/cx/specification/cytoscape-exchange-format-specification-(version-1)/ .
  There is no JSON Schema for CX1.
- Oracle: ndex2 3.12.0 (BSD-3-Clause), `ndex2.create_nice_cx_from_raw_cx`, through
  `tools/oracle_cx.py`, which types the values by the CX data-type table and Cytoscape's value
  rule (ndex2 leaves them as written). It runs in the same Python as the CX2 oracle (section 13.1):
  `tmp/cx/venv/bin/python test/conformance/tools/oracle.py cx`.
- NiceCX is the root network: it does not split a collection, reads only the aspects metaData
  names, keeps duplicate ids and dangling edges and ignores the status, so those fixtures are
  hand-written (`"oracle": "spec"`) and say why in `oracleDisagrees` (research-cx.md section 7.3).
- Second opinions read from source, not run: ndex-object-model `CxElementReader2`, NDEx's
  `CXNetworkLoader`, Cytoscape's cx-support (`CxUtil.parseValue`, `NiceCyRootNetwork`).

### 12.2 Real files

Each file is copied unchanged. NDEx regenerates CX on request, so the NDEx copies are pinned by
their SHA-256 here, never re-fetched. The CC BY-SA 4.0 networks are test-only (`test/` is not
published).

| File                                                     | Origin                                                                                                                                                                   | Version              | License (where stated)                                                                  | SHA-256                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ndex2-client/SimpleNetwork.cx`                          | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/ndex2/tests/SimpleNetwork.cx                                             | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                 | `29809cf85c2345cd8db181ae6a3a918e48ed02458e900cee4c1596cd1ab4c0d6` |
| `ndex2-client/my_cx.cx`                                  | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/ndex2/tests/my_cx.cx                                                     | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                 | `b73ae73e39b6867afcd7667bbc2c09ff00f5d7b769cc8b859ba3cd0411682ddd` |
| `ndex2-client/SIMPLE_NETWORK.cx`                         | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/ndex2/tests/SIMPLE_NETWORK.cx                                            | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                 | `983f031ff7922b105d41704cfa604e95bc1e4e4f4b915a8b57145557fcbcf186` |
| `ndex2-client/glypican2_no_cartesian_layout.cx`          | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/tests/data/glypican2_no_cartesian_layout.cx                              | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                 | `60ce0db3c2bd5be83d5472c908a21557914c695a467caa9ea4fa3f6d988ba8c1` |
| `cx2js/primitive_attributes.cx`                          | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/resources/primitive_attributes.cx                                    | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `85e994089d118ffae0af61f7829fc3385e6643d57b9f4c939d73f4bb210ea3b1` |
| `cx2js/UD-219.cx`                                        | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/resources/UD-219.cx                                                  | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `96957e69a5c982da5cab592b7c9c0e932f14fbd09c8448d5802c688c2ff1d425` |
| `cx2js/NWA-383.cx`                                       | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/resources/NWA-383.cx                                                 | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `70ed7cc06f2a8a16a27646c2279679a4d4896f9c23f1a6362777334cb5d1e6cb` |
| `cx2js/5views1network.cx`                                | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/resources/5views1network.cx                                          | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `9f4343bf2e452774d85456ceccaf1b0c6aa817b7d8ccd8976ffe95ef4256f1a8` |
| `cx2js/simple_bundled_edges.cx`                          | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/resources/simple_bundled_edges.cx                                    | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `73d7b4424b922f3512906267581b0ee49ff1c74a4a9dcf604ec6f8d0072870d4` |
| `cx2js/UD-294.cx`                                        | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/resources/UD-294.cx                                                  | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `e119f3397f6cd7c0338a28e15af346dfef805fcbbd25fc36418c227b745aee18` |
| `cx2js/default_edge_bends.cx`                            | https://raw.githubusercontent.com/cytoscape/cx2js/7ed4adcb9caa7731eac96b10a8023525b6451b99/examples/anti-resources/default_edge_bends.cx                                 | commit 7ed4adc       | MIT (cx2js LICENSE, Cytoscape Consortium)                                               | `35d38e3dd0b79d8ec4f6d26aadb5256bd9f026e0ce947718e087e487b9056a0e` |
| `ndex-object-model/10_networks_new.cx`                   | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/10_networks_new.cx                               | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                | `169e293b644e5298049a17a86209db6f9d75789cd61fb08cc18e342c03e037de` |
| `ndex-object-model/network1_3n2e_no_numVerification.cx`  | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/network1_3n2e_no_numVerification.cx              | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                | `aa0fae9916905f89315421fe94eb3b6c92f0cd078e721c8f962d95395a8094ff` |
| `ndex-object-model/cx2_tiny_double_and_longattribute.cx` | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_tiny_double_and_longattribute.cx             | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                | `c42c3e51ff29c252e3c9c2b3a1158e4742ec24e82b87b84939015fb72b5bed38` |
| `rcx/Direct-p53-effectors.cx`                            | https://raw.githubusercontent.com/frankkramer-lab/RCX/f6571e01164625f94c2ec6eabba2cc8ecaf5ceaf/inst/extdata/Direct-p53-effectors-67c3b75d-6191-11e5-8ac5-06603eb7f303.cx | RCX commit f6571e0   | MIT (RCX LICENSE.md, Florian Auer); originally NCI-PID on NDEx                          | `036e6010e2baf7fee78b257dcb2b4e74cc4a6acf908bf6a0d9e6015d2b23ef9a` |
| `ndex/WP4742-ketogenesis.cx`                             | https://www.ndexbio.org/v2/network/cc593864-8b6c-11eb-9e72-0ac135e8bacf                                                                                                  | retrieved 2026-10-02 | CC0 (network rights: Waiver-No Rights Reserved (CC0), holder WikiPathways)              | `eb962f8e2d7679281396205efcc2d0324075315635661cc54be27de3557264ce` |
| `ndex/ITCR-connectivity-map.cx`                          | https://www.ndexbio.org/v2/network/04c0a7e8-af92-11e7-94d3-0ac135e8bacf                                                                                                  | retrieved 2026-10-02 | CC0 (network rights: Waiver-No rights reserved (CC0))                                   | `5fd67a29ccebbe1160e0b4a2d7de3937c75d93b26ef5cba3ec9a8fed8023f056` |
| `ndex/SIGNOR-multiple-sclerosis.cx`                      | https://www.ndexbio.org/v2/network/0522eea1-97f1-11eb-9e72-0ac135e8bacf                                                                                                  | retrieved 2026-10-02 | CC BY-SA 4.0 (network rights, holder Prof. Gianni Cesareni): test-only                  | `6b5b621513f46e10be3a497d6b69a49ef2561d982cec7a2d2ea6a2a1e45780c2` |
| `ndex/parkinson-cytoscape-analysis.cx`                   | https://www.ndexbio.org/v2/network/70375fa2-7474-11ef-ad6c-005056ae3c32                                                                                                  | retrieved 2026-10-02 | CC BY-SA 4.0 (network rights, holder Prof. Gianni Cesareni): test-only                  | `e072f226a115a55678c6b6d66379a80d5322af8e422b2bdda95d510e59446706` |
| `ndex/schizophrenia-subnetwork.cx`                       | https://www.ndexbio.org/v2/network/90bd68fb-1dd0-11ef-9621-005056ae23aa                                                                                                  | retrieved 2026-10-02 | CC BY 4.0 (network rights, holder Pierre Klemmer; attribution in sources.md section 12) | `4fcca74169bad32c5fddaa02a4f6e18f357cd89d648b6efd8c8d496f43fff224` |

The CC BY 4.0 network is "Schizophrenia risk gene subnetwork with AOP-Wiki, cluster, and pathway
data extended with ChEBI compounds relating to agrochemical and pesticideroles" by Pierre Klemmer
on NDEx (https://www.ndexbio.org/viewer/networks/90bd68fb-1dd0-11ef-9621-005056ae23aa); this entry
is its attribution.

### 12.3 Authored files

`fixtures/cx/authored/` is written by `tools/make_cx_fixtures.py` (MIT, authored for graph-io):
the groups set and the malformed / edge-case set of research-cx.md section 8 rows 24 and 25 --
which reproduce the cases of Cytoscape's unlicensed `cytoscape/cx` and `cxio` test files
(`groups_1.cx`, `gal_filtered_3.cx`, `network_full_of_bugs.cx`, `Novershtern_dev_clean.sif.cx`,
`empty.cx`, `n3_pp.cx`) without copying them -- and the cases design.md section 6.4 adds:
attributes and layout before the nodes, a collection with and without metadata, an id beyond
2^53 after 1,000 safe ones, string and `1e3` ids, `v: null`, single-object aspects, a visual
property named like an attribute.

### 12.4 Malformed corpus and unit corpus

`test/corpus/malformed/cx/` holds CX2 content under `.cx` names (ndex-object-model, BSD-3-Clause)
and authored malformed files (MIT): truncated, empty, a top-level object, a two-key fragment, a
failed status, dangling endpoints, a duplicate edge id and a non-integer id. `test/corpus/cx/`
holds four of the real files above for the cross-format fidelity matrix (CX is a source there, never
a target: graph-io writes no CX1).

### 12.5 Not vendored

- The cx-support (`cytoscape/cx`) and `cxio` test resources: no license file; the authored set
  covers their cases.
- hiview.cx (cx2js, 54 MB) and Signor Complete - Human (NDEx 523fff27, 40 MB, CC BY-SA 4.0): too
  large to commit.

---

## 13. CX2 (`fixtures/cx2/`)

Research date: 2026-10-02. The feature and error inventory is
`design/graph-io/cytoscape-and-obo/research-cx2.md`; the mapping is section 1.3 of `design.md` in
the same folder.

### 13.1 Specification and readers

- CX2 specification (Cytoscape Consortium / NDEx):
  https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/ ;
  CX2 visual styles: https://cytoscape.org/cx/cx2/cx2-visual-styles/ . There is no published JSON
  Schema for a whole document.
- Oracle: ndex2 3.12.0 (BSD-3-Clause), `CX2Network.create_from_raw_cx2`, through
  `tools/oracle_cx2.py`. It needs networkx 3.4, so it runs in its own Python:
  `uv venv tmp/cx/venv -p 3.10 && VIRTUAL_ENV=tmp/cx/venv uv pip install ndex2==3.12.0`, then
  `tmp/cx/venv/bin/python test/conformance/tools/oracle.py cx2`. Positions are expected y-up.
- Where ndex2 departs from the specification the fixture is hand-written (`"oracle": "spec"`) and
  says so in `oracleDisagrees`: falsy defaults ignored, `3.7` truncated in an integer column, any
  string but `"true"` read as false, the last `attributeDeclarations` block kept, aliases resolved
  only for declarations that precede the elements, an undeclared column typed by its first value
  (0.1 read as 0), dangling edges, bypasses and a missing or failed status accepted, a declaration
  without `d` typed from its values (the Java reader reads string).
- Second opinions read from source, not run: ndex-object-model `CXReader` (Java) and Cytoscape
  Web's `validator.ts`.

### 13.2 Real files

Each file is copied unchanged. NDEx regenerates CX2 on request, so the NDEx copies are pinned by
their SHA-256 here, never re-fetched; a network's license is its own `rights` attribute.

| File                                                                   | Origin                                                                                                                                                                       | Version              | License (where stated)                                                                   | SHA-256                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ndex2-client/demo.cx2`                                                | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/tests/data/demo.cx2                                                          | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                  | `87d1b75325a0817b934f8d07e92b75d79853544ac69ae0fb92052d1133cadb1d` |
| `ndex2-client/glypican2.cx2`                                           | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/tests/data/glypican2.cx2                                                     | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                  | `af847428ae84dc22d33797ff014d9e1fd9a5ac940b12c5c2e7cb2077b700a92f` |
| `ndex2-client/no_edge_style2.cx2`                                      | https://raw.githubusercontent.com/ndexbio/ndex2-client/e6467d81b90a779f903eaac1dfb6b63eb25938a4/tests/data/no_edge_style2.cx2                                                | commit e6467d8       | BSD-3-Clause (ndex2-client LICENSE.txt)                                                  | `87bc4f7fadcf3c19e10f69c5449f6fc96448b100fdef7ddb46c33355ced35733` |
| `ndex-object-model/cx2_tiny.cx2`                                       | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_tiny.cx2                                         | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                 | `33a7384377cb7855c6a8dfa06f3de03d739f1c1d8d2f62d98bac126206b05b98` |
| `ndex-object-model/cx2_tiny_double_and_longattribute.cx`               | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_tiny_double_and_longattribute.cx                 | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                 | `c42c3e51ff29c252e3c9c2b3a1158e4742ec24e82b87b84939015fb72b5bed38` |
| `ndex-object-model/cx2_empty.cx`                                       | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_empty.cx                                         | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                 | `ec504a092124a9ddcc541f3f4f3db8465ccb8c456e75682998fedfd82290f03e` |
| `ndex-object-model/cx2_aspect_after_postmetadata.cx`                   | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_aspect_after_postmetadata.cx                     | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                 | `61f5f4f91887cb9ae809606d4ff9f985db5005a9ccd9c2e7d840ef592f50d72f` |
| `ndex-object-model/cx2_metadata_after_normal_aspect.cx`                | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_metadata_after_normal_aspect.cx                  | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                 | `dd53c6a9165a7c59a3f0db9ee58f027c0e75fca31ae79f22a957e67d4dff4727` |
| `ndex-object-model/cx2_pre_post_metadata.cx`                           | https://raw.githubusercontent.com/ndexbio/ndex-object-model/44dad96f989f664753741c5cd4cb8a6c52723243/src/test/resources/cx2_pre_post_metadata.cx                             | commit 44dad96       | BSD-3-Clause (ndex-object-model LICENSE)                                                 | `94269e05ae13e9c5ec485ea2fb01956cb32f2aee748dc43521c004f172b80341` |
| `cytoscape-web/minimal.valid.cx2`                                      | https://raw.githubusercontent.com/cytoscape/cytoscape-web/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/cx2/valid/minimal.valid.cx2                                 | commit c66154f       | MIT (cytoscape-web LICENSE)                                                              | `1730e453eece0826990ff6a76e3adab0394f435949fd66d44d712b458d09781e` |
| `cytoscape-web/with-cartesian-layout.valid.cx2`                        | https://raw.githubusercontent.com/cytoscape/cytoscape-web/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/cx2/valid/with-cartesian-layout.valid.cx2                   | commit c66154f       | MIT (cytoscape-web LICENSE)                                                              | `2882b465899ee15987992860669df13937c4636ebbf55957bc154e49ac9ecb94` |
| `cytoscape-web/svg-passthrough.valid.cx2`                              | https://raw.githubusercontent.com/cytoscape/cytoscape-web/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/cx2/valid/svg-passthrough.valid.cx2                         | commit c66154f       | MIT (cytoscape-web LICENSE); data: Cytoscape's galFiltered sample                        | `14affd586c74b340e20385b3767744fc651db194e3d7e22bdbdd6ba6f7170fb1` |
| `cytoscape-web/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2`         | https://raw.githubusercontent.com/cytoscape/cytoscape-web/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/ndex/2496d8c5-5c74-11ec-b3be-0ac135e8bacf.valid.cx2         | commit c66154f       | MIT (cytoscape-web LICENSE); network rights CC0 (WikiPathways WP5049)                    | `645cbce30731873723e53c3dc4162dec80297244e14eb716a997539ee46f59a0` |
| `cytoscape-web/1366ba85-9acc-11ef-9702-005056ae6f73.hcx.valid.cx2`     | https://raw.githubusercontent.com/cytoscape/cytoscape-web/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/ndex/1366ba85-9acc-11ef-9702-005056ae6f73.hcx.valid.cx2     | commit c66154f       | MIT (cytoscape-web LICENSE); network rights MIT (MuSIC v1 hierarchy)                     | `c9966bb90524cff9af6cb4e3ff3f73b2d8fbc1caffa73851996121ddb5e6ffa8` |
| `cytoscape-web/d3030388-dcb7-11ee-867c-005056aecf54.valid.filters.cx2` | https://raw.githubusercontent.com/cytoscape/cytoscape-web/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/ndex/d3030388-dcb7-11ee-867c-005056aecf54.valid.filters.cx2 | commit c66154f       | MIT (cytoscape-web LICENSE)                                                              | `5410e9527f9015cc60c3ff6e61c2ab4dfbcb49b1f37501fd6ab368d33259c3c7` |
| `ndex/72288e93-5c67-11ec-b3be-0ac135e8bacf.cx2`                        | https://www.ndexbio.org/v3/networks/72288e93-5c67-11ec-b3be-0ac135e8bacf                                                                                                     | retrieved 2026-10-02 | CC0 (network rights: Waiver-No Rights Reserved (CC0), holder WikiPathways)               | `0aa7058d667a6e4a8431f08990cc7b34acc442d8f3750cab9c9e14313d5c06fc` |
| `ndex/f62acbc7-4cfc-11e9-9f06-0ac135e8bacf.cx2`                        | https://www.ndexbio.org/v3/networks/f62acbc7-4cfc-11e9-9f06-0ac135e8bacf                                                                                                     | retrieved 2026-10-02 | CC0 (network rights: Waiver-No rights reserved (CC0))                                    | `2f69beb1b68996ba27ea5a6b76df058ed62ff17b2b33be67c6def14cd77ea4cd` |
| `ndex/c370fda6-c69c-11e8-aaa6-0ac135e8bacf.cx2`                        | https://www.ndexbio.org/v3/networks/c370fda6-c69c-11e8-aaa6-0ac135e8bacf                                                                                                     | retrieved 2026-10-02 | CC BY 4.0 (network rights; Fanconi Anemia Machine, NDEx network c370fda6, author Myself) | `d2a91d8a670ebbf8d4bb795ac003ba6e9255a543ca335bd2d3af8bee66089b58` |
| `ndex/aa78a43f-9c4d-11eb-9e72-0ac135e8bacf.cx2`                        | https://www.ndexbio.org/v3/networks/aa78a43f-9c4d-11eb-9e72-0ac135e8bacf                                                                                                     | retrieved 2026-10-02 | CC0 (network rights: Waiver-No rights reserved (CC0), holder Charles Tapley Hoyt)        | `a7f0079e9f371f217dcbffb4a4bfe02c79a610124c8dd807d98238612c552d96` |
| `ndex/d8e7c9c5-c809-11e8-aaa6-0ac135e8bacf.cx2`                        | https://www.ndexbio.org/v3/networks/d8e7c9c5-c809-11e8-aaa6-0ac135e8bacf                                                                                                     | retrieved 2026-10-02 | MIT (network rights: MIT license (MIT), holder The Jackson Laboratory)                   | `81eb013378a7383e8ddd9f3a5b2e76ad43abb503101624983af28c85afc5bf1a` |

The CC BY 4.0 network `c370fda6` is "Fanconi Anemia Machine - Cyndex2 network" on NDEx
(https://www.ndexbio.org/viewer/networks/c370fda6-c69c-11e8-aaa6-0ac135e8bacf); this entry is its
attribution.

### 13.3 Authored files

`fixtures/cx2/authored/` is written by `tools/make_cx2_fixtures.py` (MIT, authored for graph-io):
one file per feature or error of research-cx2.md section 6.1 and design.md section 6.4 that no
real file shows -- fragments declared and undeclared, all ten types, falsy defaults, alias edge
cases, ids beyond 2^53 (also after 1,000 safe ones), value mismatches, unknown and missing types,
the Python type spellings, failed / warning / malformed / missing status, partial and legacy
coordinates, versions 2.1, 2 and 3.0, a CX1 document under a `.cx2` name, BOM / UTF-16 / Latin-1,
flat editor properties, dangling bypasses and edges, edges before nodes, declarations after nodes,
`1` and `"1"` as one node, unknown element keys, mangled ids, an empty network, malformed blocks,
order and count problems, and style rules next to per-element visual values.

### 13.4 Malformed corpus and unit corpus

`test/corpus/malformed/cx2/` holds Cytoscape Web's 11 invalid fixtures (MIT,
https://github.com/cytoscape/cytoscape-web/tree/c66154f62bd8b0191e90e48afcba72efcb1fa382/test/fixtures/cx2/invalid),
renamed without the `.invalid` infix. `test/corpus/cx2/` holds four of the real files above for the
cross-format fidelity matrix.

### 13.5 Not vendored

- The `cytoscape/cx` repository's examples (`small_network_with_styles.cx2`,
  `different_attribute_types_no_style.cx2`): the repository has no license; the authored set
  covers their cases, and `demo.cx2` is a byte-identical copy of the first under ndex2-client's
  BSD license.
- IntAct coronavirus (NDEx cabdc0e0, 6.5 MB, CC BY 4.0), BioPlex 3 HCT116 (NDEx e96d063d, 10 MB,
  CC0) and STRING v12 (90 MB): too large to commit; both smaller ones import (1,583 / 2,449 and
  10,251 / 75,346 nodes / edges) and BioPlex 3 is a planned graph-samples dataset.

## 14. Cytoscape sessions (`fixtures/cys/`)

Research: `design/graph-io/cytoscape-and-obo/research-session-and-style.md` (the version history
of section 2.1, the entry inventories of 2.2 and 2.3, the CyCSV table format of 2.4, the session
flavor of XGMML of section 3, the zip findings of section 6 and the error list of section 7);
design sections 1.4 and 3. There is no written specification of the session format: the
normative definition is Cytoscape's reader code (`Cy3SessionReaderImpl`, `Cy2SessionReaderImpl`,
`CSVCyReader`, `SessionUtil` in https://github.com/cytoscape/cytoscape-impl, LGPL-2.1) and the zip
container's APPNOTE 6.3.10 (https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT).

Oracle: Cytoscape 3.10.5 through CyREST (`tools/oracle_cytoscape.py`, run by the manually
dispatched workflow `.github/workflows/conformance-cytoscape-oracle.yml`). Until its first run the
sessions that Cytoscape's own integration tests load carry those tests' assertions, transcribed
(counts, network names, selection, attribute values; `"oracle": "cytoscape-integration-tests"`,
https://github.com/cytoscape/cytoscape-gui-distribution/tree/develop/integration-test/src/test/java/org/cytoscape/session),
and every other fixture hand-written expectations (`"oracle": "spec"`). Groups are where the
specification of graph-io's model overrules what Cytoscape shows (`oracleDisagrees`).

Every file was retrieved on 2026-10-02. SHA-256 of the bytes committed:

| Fixture                                       | Origin                                                                                                                                         | License (where stated)                                                                 | SHA-256                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `session3x/simpleSession.cys`                 | https://github.com/cytoscape/cytoscape-gui-distribution/blob/develop/integration-test/src/test/resources/testData/session3x/simpleSession.cys  | LGPL-2.1 (the test tree's file headers; the repository has no LICENSE file); test-only | `777d58e2cf627a26b6eb836164d8500aba684f35b8393a989b187a10ce5a730d` |
| `session3x/visualMappings.cys`                | same tree, `visualMappings.cys`                                                                                                                | LGPL-2.1, test-only                                                                    | `142b61cabc53eb86b8e0f012022d8e14e4872a9a68602c66a839233f4269eedc` |
| `session3x/subnetworks.cys`                   | same tree, `subnetworks.cys`                                                                                                                   | LGPL-2.1, test-only                                                                    | `47d404e93e770190b3b811f93ea0e5dbca2273a6c8cffb1c62979cfa4b517f54` |
| `session3x/groups.cys`                        | same tree, `groups.cys`                                                                                                                        | LGPL-2.1, test-only                                                                    | `395faf059cef1a725a52b2364d02c0db9f159bd3b8e32049286d515aa5ec2d31` |
| `session3x/nestedGroups_collapsed.cys`        | same tree, `nestedGroups_collapsed.cys`                                                                                                        | LGPL-2.1, test-only                                                                    | `2f3b13533c0c97a689a38cf7452717723fb6b4a4f7025fc715e3eec40330c5fb` |
| `session2x/v252Session.cys`                   | same repository, `testData/session2x/v252Session.cys`                                                                                          | LGPL-2.1, test-only                                                                    | `3252e176652664699102933ee3260f53121de396f0e1c5e152f129940ee9fdf4` |
| `session2x/v270session.cys`                   | same tree, `v270session.cys`                                                                                                                   | LGPL-2.1, test-only                                                                    | `1277f593c0b94ba9e3b9894c9f5856c0a3fb6ed29d1c04538c1fe29ebb6b2dae` |
| `session2x/v283Groups.cys`                    | same tree, `v283Groups.cys`                                                                                                                    | LGPL-2.1, test-only                                                                    | `2a175d498ecfad426b87b8460225c4f98ddc5ffe0b950e0f554ac616893919e4` |
| `session2x/v263SessionLarge.cys`              | same tree, `v263SessionLarge.cys`                                                                                                              | LGPL-2.1, test-only                                                                    | `e2fe291f62dd30b616d037d6564cd0d172a3f06645ec81a6b08dce2021f32062` |
| `session2x/v283Session1.cys`                  | same tree, `v283Session1.cys`                                                                                                                  | LGPL-2.1, test-only                                                                    | `22ced7e5f30217a31ef0fbbd297af6f7b24c1c1011c9cf74f6ec90f6a6404a10` |
| `impl/t3.cys`                                 | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/test/resources/testData/NNFData/t3.cys                               | LGPL-2.1 (cytoscape-impl LICENSE); test-only                                           | `c9a6bc88a0444b6aaf412cf3e663cb65792149150c05179e4a8e7d421b9c29c0` |
| `impl/LUAD_vest_v2.cys`                       | https://github.com/cytoscape/cytoscape-impl/blob/develop/layout-cytoscape-impl/src/test/resources/circular-layout-tests/LUAD_vest_v2.cys       | LGPL-2.1, test-only                                                                    | `afaa9392882e5b8e4bb4783232126295a0424c3cf96127c219c0423471b816d8` |
| `impl/goTrees.cys`                            | same tree, `goTrees.cys`                                                                                                                       | LGPL-2.1, test-only                                                                    | `aa0a60f0e10d2b323c072768f634e4c0a87716af41df6896fc38a7ba0fef5bfa` |
| `sampledata/galFiltered.cys`                  | https://github.com/cytoscape/cytoscape-gui-distribution/blob/develop/assembly/src/main/resources/sampleData/galFiltered.cys                    | LGPL-2.1, test-only                                                                    | `59c641783323cca354074b4b571f21c5884a0b32e7cc014175bd19e93ae24135` |
| `tutorials/STELZ.cys`                         | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/STELZ.cys                                                        | CC0-1.0 (cytoscape-tutorials LICENSE); data Stelzl et al., Cell 122:957 (2005)         | `3d4356d095eee438d0f7f567b94d46555f16d30766a9db9b6b3fc7e47a32c1d8` |
| `tutorials/galFiltered.cys`                   | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/protocols/data/galFiltered.cys                                                  | CC0-1.0; data Ideker et al., Science 292:929 (2001)                                    | `3513217733656d964d683538a0591a2054c1270040a9f8702367275bedf53a6f` |
| `tutorials/layout-v1.cys`                     | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/presentations/modules/network-visualization-light/layout-v1.cys                 | CC0-1.0                                                                                | `64e7bf226bc43113f24c2dcbdb13905467cf721263e6b4ed37c2f49b0eb87266` |
| `tutorials/AnnotationExample.cys`             | https://github.com/cytoscape/cytoscape-tutorials/blob/gh-pages/presentations/modules/advanced-visualization/AnnotationExample.cys              | CC0-1.0                                                                                | `176212c77f808547204574f7398c13fc2213b941f6870e6d24c6dad7701a3177` |
| `test/corpus/malformed/cys/test_session1.cys` | https://github.com/cytoscape/cytoscape-impl/blob/develop/core-task-impl/src/test/resources/test_session1.cys (the 2011 3.0 pre-release layout) | LGPL-2.1, test-only                                                                    | `aacc1998e2e4a71988aef118b4d2cabcd37ab6d705df3f60b96982751f46bed1` |

`authored/*.cys` (35 files) are written by `tools/make_cys_fixtures.py` (MIT, authored): a small
3.x session written from scratch (two registered subnetworks sharing nodes, every CyCSV column
type and cell rule, virtual columns including a chain and a name collision, HIDDEN and app
tables, an expanded group, a nested-network pointer, two views, styles, global and app entries)
and its variants for the container cases of research section 7 (zip64, a stored entry with a
data descriptor, trailing and prepended bytes, an archive comment, a duplicate entry, no root
folder, two root folders, `__MACOSX` noise, UTF-8 names, truncation, a missing end record, a CRC
mismatch, encryption, deflate64 and bzip2, a 1000:1 ratio bomb), the table and session cases
(an unknown CyCSV version and column class, bad rows, broken virtual columns, a table, a view and a
member reference naming nothing, an edge leaving its subnetwork, a version 4 marker, the 3.0
pre-release layout) and a small 2.x session. The design proposed deriving the container cases from
the CC0 tutorials `galFiltered.cys`; a session written from scratch is as freely licensed and keeps
each case a few kilobytes. The unit-test corpus `test/corpus/cys/` (a karate club session built
from `test/corpus/gml/karate.gml` and copies of the authored 3.x and 2.x sessions) and
`test/corpus/malformed/cys/` are written by the same script. Rerun it after changing it.

Not committed: `sessions/The_Yeast_Interactome.cys` (24,809,869 bytes,
https://github.com/cytoscape/cytoscape-gui-distribution, LGPL-2.1), the large-file case.

## 15. OBO (`fixtures/obo/`)

Research: `design/graph-io/cytoscape-and-obo/research-obo.md` (the feature inventory, the reader
behavior table of section 5 and the error cases of section 6); design section 4. Specifications:
the OBO 1.4 syntax and semantics (https://owlcollab.github.io/oboformat/doc/obo-syntax.html), the
1.4, 1.2 and 1.0 guides (https://owlcollab.github.io/oboformat/doc/GO.format.obo-1_4.html,
`-1_2.html`, `-1_0.html`). The 1.4 BNF is normative; where it and the guides disagree (`\W`, the
synonym scope, unquoted qualifiers, unknown tags) graph-io reads the union, as the files' writers
did, and the fixture says so in `oracleDisagrees`.

Oracles: fastobo-py 0.14.1 (MIT) through `tools/oracle_obo.py`; obonet 1.3.0
(BSD-2-Clause-Patent) for the real files fastobo rejects; the specification for the cases both
reject or misread. ROBOT 1.9.11 (owlapi's parser) was run on every file during the research as the
acceptance check (`tmp/samples-obo/robot-out/`); its OWL-mediated graph is not used as an
expectation (section 9 of the research says why).

Every file was retrieved on 2026-10-02. SHA-256 of the bytes committed:

| Fixture                               | Origin                                                                                                                              | License (where stated)                                                                                             | SHA-256                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `go/goslim_generic.obo`               | https://purl.obolibrary.org/obo/go/subsets/goslim_generic.obo (go/releases/2026-07-26)                                              | CC-BY-4.0 (GO citation policy, https://geneontology.org/docs/go-citation-policy/; in-file `terms:license`)         | `a28d9dd0364e39a6dc926599bd628c524d3c389017b5398642c8cf2484d9f111` |
| `foundry/taxrank.obo`                 | https://purl.obolibrary.org/obo/taxrank.obo (releases/2025-09-24)                                                                   | CC0-1.0 (in-file remark)                                                                                           | `8cf42bd61ac683366ddde5018a7900804b8c942636e61f0793de4a289788e7c0` |
| `foundry/ro.obo`                      | https://purl.obolibrary.org/obo/ro.obo                                                                                              | CC0-1.0 (in-file license)                                                                                          | `f2145eaecd649b395f5a908906f429fd6ac6dca2bc6816045b5c8a80da9a6b10` |
| `foundry/so.obo`                      | https://purl.obolibrary.org/obo/so.obo                                                                                              | CC-BY-4.0 (OBO Foundry registry)                                                                                   | `22a8f3ec2b49125dbb6cee8456f0bca86dd8c98f433165ffa4b554da4f155204` |
| `foundry/eco.obo`                     | https://purl.obolibrary.org/obo/eco.obo                                                                                             | CC0-1.0 (in-file remark)                                                                                           | `c8b52a2da2b0f92224b50a1d8773fd7e3bca0977d920d4e31ef9fde960c84fd4` |
| `foundry/mi.obo`                      | https://purl.obolibrary.org/obo/mi.obo                                                                                              | CC-BY-4.0 (OBO Foundry registry)                                                                                   | `b1315efd86a13988df97d2daefed025dbd26b98d66104da76ea3e85706534d2f` |
| `foundry/fao.obo`                     | https://purl.obolibrary.org/obo/fao.obo                                                                                             | CC0-1.0 (OBO Foundry registry)                                                                                     | `dcacb2306cc33c5ee288bf32a3701acf804dd345a232c64b0a41cf52d53ec217` |
| `foundry/pato.obo`                    | https://purl.obolibrary.org/obo/pato.obo                                                                                            | CC-BY-3.0 (in-file license)                                                                                        | `951ca3dc2f0821ab56f46c240836cab1719c789dc79508cbec32e6f99cb8174e` |
| `foundry/ms.obo`                      | https://purl.obolibrary.org/obo/ms.obo                                                                                              | CC-BY-4.0 (in-file remark; the registry says 3.0)                                                                  | `84c79d3a8325de0a9bd25eb64aec74b6e01656cd83e28ef368a8dfcc867752bf` |
| `owlapi/escape_chars_test.obo`        | https://github.com/owlcs/owlapi/blob/b61ebe2da83daceebb3e7ba7afbd2582c9240c33/contract/src/test/resources/obo/escape_chars_test.obo | Apache-2.0 (owlapi README: LGPL-3.0 or Apache-2.0, the developer's choice)                                         | `9bc539e0ca48220b3962bfda1ff17e52d6a3aa79ec10256e3441f5e99e0a5b17` |
| `owlapi/trailing_qualifier.obo`       | same tree, `trailing_qualifier.obo`                                                                                                 | Apache-2.0 (as above)                                                                                              | `fd1ac150b274c8c51bfb76979903a35fbcb1911705b4d827f786efbfcbcc4e6c` |
| `owlapi/example1.obo`                 | https://github.com/owlcs/owlapi/blob/b61ebe2da83daceebb3e7ba7afbd2582c9240c33/oboformat/src/test/resources/example1.obo             | Apache-2.0 (as above)                                                                                              | `7221f7017063b1eae1d3810700373f7dc9b1badb0d9b5a80aa78d73538f582d9` |
| `owlapi/simplego.obo`                 | contract tree, `simplego.obo`                                                                                                       | Apache-2.0 (as above)                                                                                              | `ecfa8c1fb1d441dd9090e51201e54a84ab6ba2dec1dbe36bc17879aae019351a` |
| `owlapi/fbbt_comment_test.obo`        | contract tree, `fbbt_comment_test.obo`                                                                                              | Apache-2.0 (as above)                                                                                              | `29f8b4092f65d338064cc3f74be0a83522073b4efe3aba90cf41a7cc998e9402` |
| `owlapi/chebi_problematic_xref.obo`   | contract tree, `chebi_problematic_xref.obo`                                                                                         | Apache-2.0 (as above)                                                                                              | `c8ade1994cdc7cc9ffb394e7be65628d62fbe81479e4fbba26d38cbfc5562f8c` |
| `owlapi/behavior.obo`                 | https://github.com/owlcs/owlapi/blob/b61ebe2da83daceebb3e7ba7afbd2582c9240c33/osgidistribution/src/test/resources/behavior.obo      | Apache-2.0 (as above)                                                                                              | `27e94a5e9ba9e64da0ae9271520db94b79b036719ba5e6a4b7125aa11b899959` |
| `owlapi/synapsed_to.obo`              | contract tree, `synapsed_to.obo`                                                                                                    | Apache-2.0 (as above)                                                                                              | `00f0b4436333c94dfd85ed3e4f21b9322ec9a47879580745fa38e3b8f2bc5858` |
| `owlapi/xref_escapecolon.obo`         | contract tree, `xref_escapecolon.obo`                                                                                               | Apache-2.0 (as above)                                                                                              | `db8e5e640295652f8a208571175f412f5c63bb0b6b6145fc5896f5c0bb6431d3` |
| `owlapi/gci_qualifier_test.obo`       | contract tree, `gci_qualifier_test.obo`                                                                                             | Apache-2.0 (as above)                                                                                              | `df5d2c0ffc8aebcb61cd743eefba03fc5520af1177c8b8516758d8ad289dd599` |
| `owlapi/treat_xrefs_test.obo`         | contract tree, `treat_xrefs_test.obo`                                                                                               | Apache-2.0 (as above)                                                                                              | `f25d961800472745bc687af06b72d988536663a2265035d02d9c92d1e1e6e1b7` |
| `owlapi/cardinality.obo`              | contract tree, `cardinality.obo`                                                                                                    | Apache-2.0 (as above)                                                                                              | `087c4a9dc97538f8fd61a89fd51b820f65ee5393527d64b9dbe010271056b0d5` |
| `obographs/basic.obo`                 | https://github.com/geneontology/obographs/blob/459a44e45b56188912bf7272239c984d94b1af4a/examples/basic.obo                          | BSD-3-Clause (obographs pom.xml `<licenses>`; the repository has no LICENSE file)                                  | `5e0d6ea453f97bfd129348e348d33a32112689b54eda1ab75686c9d31e261609` |
| `obographs/nucleus.obo`               | same tree, `nucleus.obo`                                                                                                            | BSD-3-Clause (as above)                                                                                            | `0a142682420fc0b20878b6315934f2a27e8f0ea38831d5240f333a34db694613` |
| `obographs/equivNodeSetTest.obo`      | same tree, `equivNodeSetTest.obo`                                                                                                   | BSD-3-Clause (as above)                                                                                            | `9ceb1033bc079c7a953afba8bb827d2526469d3726f3fb244f8632adc9c09529` |
| `obographs/logicalDefinitionTest.obo` | same tree, `logicalDefinitionTest.obo`                                                                                              | BSD-3-Clause (as above)                                                                                            | `b927edc6e2d31fee45b93a481651c6be8b976bc9913bfa00a5c6682416a93760` |
| `obographs/obsoletion_example.obo`    | same tree, `obsoletion_example.obo`                                                                                                 | BSD-3-Clause (as above)                                                                                            | `0be0cabdf48fe1c7a41de103ff6bb84aefe53ef3541118f98455c4bd8d58ed18` |
| `pronto/uo.obo`                       | https://github.com/althonos/pronto/blob/8465a594cd35a029d255532bf9b95d7a06deabf3/tests/data/uo.obo                                  | MIT (pronto repository); the content is the Units Ontology, CC-BY-3.0                                              | `6f8cae2f473ee92ad43a2df4ccc5340053b2d0a93f8e6d78da392c593b104885` |
| `obonet/brenda-subset.obo`            | https://github.com/dhimmel/obonet/blob/f47d326ae44c324cce44eec39937b69c657083c3/tests/data/brenda-subset.obo                        | BSD-2-Clause-Patent (obonet repository); BRENDA content of unstated terms, so test-only (`test/` is not published) | `5394757642d4f37f008bd0f9feed69ef48caceecc2b76c8d5e04134d1041bbf4` |
| `fastobo/creation_dates.obo`          | https://github.com/fastobo/fastobo/blob/88f652c8ff8cd91f36375f06439ded5292078591/tests/data/creation_dates.obo                      | MIT (fastobo repository)                                                                                           | `cd9c18ac50b4e653af4709b8ffde175f5b22523a0ce213de1a23172dc598acce` |
| `fastobo/header.input.obo`            | same tree, `header.input.obo`                                                                                                       | MIT (fastobo repository)                                                                                           | `42146612485a8628194e9d489176d7e594151fbe8d9f41b22745f3be76813045` |
| `fastobo/mslite.obo`                  | same tree, `mslite.obo`                                                                                                             | MIT (fastobo repository); PSI-MS content, CC-BY-4.0                                                                | `6285737c87ad55b39da8215d8d5ed4e4eb2296a40e71d5add9ff2bf9b3c88e0c` |

`authored/*.obo` (71 files) are written by `tools/make_obo_fixtures.py` (MIT, authored): the 44
reader probes of research section 5, the Instance example of the 1.4 guide, OBO 1.0 legacy tags,
UTF-16 and windows-1252 encodings, truncated files, form feed and lone CR line ends, and the
section 6 error cases no real file shows. Rerun the script after changing it.

The unit-test corpus `test/corpus/obo/` holds copies of `taxrank.obo`, `basic.obo` and
`nucleus.obo` (above); `test/corpus/malformed/obo/` is authored.

Too large to commit, checked by `test/formats/obo/large-files.test.ts` under
`GRAPH_IO_LARGE_FIXTURES=1` (downloaded once into `tmp/graph-io-large/`, pinned by SHA-256):
go-basic.obo and go-basic.json of the 2026-07-26 GO release. chebi.obo (271 MB) and
ncbitaxon.json (2.36 GB, beyond one JavaScript string) are not pinned: they were never measured.

## 16. OBO Graphs JSON (`fixtures/json/obographs/`, the `obographs` dialect)

Specification: the OBO Graphs JSON Schema
(https://github.com/geneontology/obographs/blob/master/schema/obographs-schema.json) and README
(`sub`, not the README's outdated `subj`); design sections 1.6 and 4.6. Oracle
`"python-json-obographs"`: the schema's mapping restated over Python's json module in
`tools/oracle_obo.py` (`obographs()`), called by `oracle_json.py`. fastobo's `load_graph()` is the
cross-check: it agrees on every file but `nucleus.json`, whose untyped nodes it reads as Typedefs.

| Fixture                          | Origin                                                                                                          | License (where stated)                                           | SHA-256                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `goslim_generic.json`            | https://purl.obolibrary.org/obo/go/subsets/goslim_generic.json (go/releases/2026-07-26)                         | CC-BY-4.0 (GO citation policy)                                   | `4010f4394c3fa7531fe4e7f0f83b1541b4f95c409d6aaab484d826c06fe7cd3b` |
| `ro.json`                        | https://purl.obolibrary.org/obo/ro.json                                                                         | CC0-1.0 (in-file license)                                        | `17eab8be4f47c73d2905ba45752154ae8e2e7b0bf03ba3cc62a326b42a38e5a5` |
| `abox.json`                      | https://github.com/geneontology/obographs/blob/459a44e45b56188912bf7272239c984d94b1af4a/examples/abox.json      | BSD-3-Clause (obographs pom.xml)                                 | `e8b8219c3de6c11260716d8f996c0e8d21cc46db2e60d01f1a4d8d1dcb23efe6` |
| `basic.json`                     | same tree, `basic.json`                                                                                         | BSD-3-Clause (as above)                                          | `5e432309ff9b0e2de61a983e2f025e1344723fbddab8c27e6ded7dbd90216926` |
| `equivNodeSetTest.json`          | same tree, `equivNodeSetTest.json`                                                                              | BSD-3-Clause (as above)                                          | `e4c84cc71f6cbd15e9722cd961d703b9d701d931798ff74adb629d034824260d` |
| `logicalDefinitionTest.json`     | same tree, `logicalDefinitionTest.json`                                                                         | BSD-3-Clause (as above)                                          | `333dd583827629c4d5e4dea298a0067c4d0e564b2feab0349b256f1333b51cf5` |
| `nucleus.json`                   | same tree, `nucleus.json`                                                                                       | BSD-3-Clause (as above)                                          | `d303e887907633bdde8d297af820307a4814b6ed600872612f7b23d5e5a95188` |
| `obsoletion_example.json`        | same tree, `obsoletion_example.json`                                                                            | BSD-3-Clause (as above)                                          | `294da3ae1abca4daafd6f9ce9fe65ab9bac5b5329a64e3d13e8ebf0914be0803` |
| `pronto/abox.json`               | https://github.com/althonos/pronto/blob/8465a594cd35a029d255532bf9b95d7a06deabf3/tests/data/obographs/abox.json | MIT (pronto repository); obographs example content, BSD-3-Clause | `0dd504b4991bd90a5370a1399d433cef5981adfee79f94da1060cd21391167f6` |
| `pronto/basic.json`              | same tree, `basic.json`                                                                                         | as above                                                         | `a91fb6d0fdf7fcdd8c9e6c68981ab807c2c3ddb7cd620af4cc48fd4d6f21a7db` |
| `pronto/equivNodeSetTest.json`   | same tree, `equivNodeSetTest.json`                                                                              | as above                                                         | `63adcbb51d0b466bf900f9af3b84f609b4dd94921aac6d74765680f6ed5da673` |
| `pronto/nucleus.json`            | same tree, `nucleus.json`                                                                                       | as above                                                         | `253b046a16902f595acc42844ee849f39324e586445e74b6a5faf16d7d80d711` |
| `pronto/obsoletion_example.json` | same tree, `obsoletion_example.json`                                                                            | as above                                                         | `e841c8b0d900e9c11c82fefcd0613b9a22f573ce82869da89846bdb558392357` |

`authored/*.json` (3 files: the README's `subj` key, two graphs, an endpoint missing from
`nodes`) are written by `tools/make_obo_fixtures.py` (MIT, authored).
