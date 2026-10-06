# XGMML: what a comprehensive graph-io reader must handle

XGMML (eXtensible Graph Markup and Modeling Language) is an XML form of GML. It was published as
a draft by John Punin and Mukkai Krishnamoorthy at RPI in 2000-2001. Almost every XGMML file in the
wild was written by Cytoscape, which has used it since version 2.x and still writes it in 3.10.
Cytoscape added its own attributes in a `cy:` namespace, and its reader decides what the format
means in practice. This note covers both: the 1.0 draft as written, and what Cytoscape writes and
reads (the 2.x "documentVersion 1.0 / 1.1" dialect, the 3.x "cy:documentVersion 3.0" dialect, and
the two session-only variants that live inside `.cys` files).

All file sizes are in bytes. Every local file named below was downloaded and checked into
`tmp/samples-xgmml/` (scratch, not committed). `tmp/samples-xgmml/tools/survey.py` parses each one
with Python's stdlib expat and prints its counts and features.

---

## 1. Authoritative sources

| Source                                                                                                                   | URL                                                                                                                                                                                                                                                                                                                 | What it settles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XGMML 1.0 Draft Specification, 2000-10-06 (Punin, Krishnamoorthy). The RPI host is gone (404). This is the archived copy | https://web.archive.org/web/20051226113401/http://www.cs.rpi.edu/~puninj/XGMML/draft-xgmml-20001006.html (original: http://www.cs.rpi.edu/~puninj/XGMML/draft-xgmml-20001006.html)                                                                                                                                  | Elements, attributes, data types, the DTD (appendix B), the XML Schema (appendix C), examples D.1 to D.4 (self-loops, parallel edges, subgraphs), the MIME type (appendix E)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| XGMML 1.0 DTD, revision of 2001-06-27 ("xgmml.dtd,v 1.0 06/27/2001")                                                     | Copies in VANTED (GPL-2.0): https://github.com/LSI-UniKonstanz/vanted/blob/master/src/main/java/de/ipk_gatersleben/ag_nw/graffiti/plugins/ios/importers/xgmml/xgmml.dtd and openjgraph (BSD-2): https://github.com/JULIELab/jcore-dependencies/blob/master/openjgraph/src/main/java/salvo/jesus/graph/xml/xgmml.dtd | A later DTD than the draft's appendix. It adds `id.type`, narrows `xlink:type` to `simple`, and drops the trailing `att*` from `graph`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Cytoscape XGMML reader (reference implementation, LGPL-2.1), pinned at commit 208c1015e565ac55f6a78c2a23aa8196a7cf28ae   | https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/xgmml                                                                                                                                                                                            | The parse state machine is `HandlerFactory.java`. Attribute typing is in `AttributeValueUtil.java`, `ObjectTypeMap.java` and `../util/xgmml/ObjectType.java`. Ids are in `handler/AbstractHandler.java`. Nodes, edges and graphs are in `handler/HandleNode.java`, `HandleEdge.java`, `HandleGraph.java` and `HandleNodeGraph.java`. Forward references are in `HandleGraphDone.java`. Edge bends are in `HandleEdgeHandle.java` and `HandleEdgeHandleList.java`. Placeholder nodes are in `handler/ReadDataManager.java`. The SAX setup, bare-ampersand repair and legacy value conversion are in `GenericXGMMLReader.java`. Sniffing is in `GenericXGMMLFileFilter.java` and `SessionXGMMLNetworkViewFileFilter.java` |
| Cytoscape XGMML writer                                                                                                   | https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/write/xgmml                                                                                                                                                                                           | `GenericXGMMLWriter.java` writes File > Export > Network. `SessionXGMMLNetworkWriter.java` and `SessionXGMMLNetworkViewWriter.java` write the `.cys` network and view files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cytoscape reader tests and fixtures                                                                                      | https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/test/resources/testData/xgmml and `.../src/test/java/org/cytoscape/io/internal/read/xgmml/GenericXGMMLReaderTest.java`                                                                                                                    | Expected behaviour for lists, hidden columns, SUID columns, 2.x groups, bare ampersands and cy:type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Extensions and MIME types Cytoscape registers                                                                            | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/CyActivator.java (line 155)                                                                                                                                                                           | Extensions `xgmml` and `xml`. MIME types `text/xgmml` and `text/xgmml+xml`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cytoscape User Manual, "Supported Network File Formats"                                                                  | https://manual.cytoscape.org/en/latest/Supported_Network_File_Formats.html                                                                                                                                                                                                                                          | The `cytoscape.xgmml.repair.bare.ampersands` property, and that XGMML carries node, edge and network columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Cytoscape User Manual, "Command Line Arguments"                                                                          | https://manual.cytoscape.org/en/stable/Command_Line_Arguments.html                                                                                                                                                                                                                                                  | `-R <port>` starts cyREST, used by the oracle in section 6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| cyREST resource code                                                                                                     | https://github.com/cytoscape/cyREST/blob/develop/src/main/java/org/cytoscape/rest/internal/resource/NetworkResource.java                                                                                                                                                                                            | `GET /v1/networks/{networkId}/edges/{edgeId}/isDirected` and the other oracle endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NDEx network format notes                                                                                                | https://home.ndexbio.org/network-formats/                                                                                                                                                                                                                                                                           | NDEx imports and exports XGMML. It ignores all graphics on import and writes none on export                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Cytoscape releases (for the oracle)                                                                                      | https://github.com/cytoscape/cytoscape/releases/tag/3.10.5                                                                                                                                                                                                                                                          | `cytoscape-unix-3.10.5.tar.gz` (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

The draft's appendix C XML Schema cannot drive a modern validator, for three reasons:

- it uses the 2000/10 pre-Recommendation XMLSchema namespace;
- it declares elements with prefixed names (`name="xgmml:graph"`), which is illegal;
- it types every number as `nonNegativeInteger`, which rejects Cytoscape's negative ids and real
  coordinates.

So no schema check is possible. The DTD is the only usable statement of structure, and real files
break it routinely (section 3.10).

Other implementations read for contrast (none of them is an oracle):

- leovan/xgmml (Python, MIT): https://github.com/leovan/xgmml. It reads only the root graph's
  direct nodes and edges, and only atts that have name, type and value. It drops lists and nested
  graphs, and requires the XGMML namespace.
- informationsea/networkxxgmml (Python, no license): https://github.com/informationsea/networkxxgmml
- VANTED's XGMML importer (Java, GPL-2.0):
  https://github.com/LSI-UniKonstanz/vanted/tree/master/src/main/java/de/ipk_gatersleben/ag_nw/graffiti/plugins/ios/importers/xgmml
- Graph::XGMML (Perl, writer only): https://github.com/gitpan/Graph-XGMML
- GraphPack 1.0, the draft authors' own C writer (GPL-2.0):
  https://github.com/fd00/genlog/blob/master/graphpack-1.0/src/gr_xmlwrite.c

---

## 2. Dialects and versions

A reader has to recognise five shapes. The reader decides which one it has from the root `<graph>`
element and its first children.

| Dialect                                                      | How to recognise it                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Producers                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. XGMML 1.0 draft                                           | No `cy:` attributes. Often a `<!DOCTYPE graph PUBLIC "-//John Punin//DTD graph description//EN" ".../xgmml.dtd">`, often no namespace. Uses `weight=`, `Vendor`, `Layout`, `Scale`, `Rootnode`, `Graphic` (examples write lowercase `graphic`), and `<graphics>` with `<center>` / `<Line><point/>` children                                                                                                                                                                                  | GraphPack, the spec examples, VPLG (protein graphs), EFI-EST sequence similarity networks (EFI-EST omits the DOCTYPE but declares the namespace) |
| B. Cytoscape 2.x export / 2.x session                        | `<att name="documentVersion" value="1.0">` or `"1.1"` as a graph att. A `networkMetadata` att holding `rdf:RDF`. Graph atts `backgroundColor`, `GRAPH_VIEW_ZOOM`, `GRAPH_VIEW_CENTER_X/Y`, `NODE_SIZE_LOCKED`. `cy:hidden`, `cy:editable`. `<graphics>` with `cy:nodeTransparency`, `cy:nodeLabelFont`, ... or with a nested `cytoscapeNodeGraphicsAttributes` / `cytoscapeEdgeGraphicsAttributes` att list (1.0). Groups as node-nested graphs with `__groupState`. `nested_network_id` atts | Cytoscape 2.0 to 2.8, and R scripts that use 2.x templates (NGSCheckMate)                                                                        |
| C. Cytoscape 3.x export                                      | `cy:documentVersion="3.0"` on the root. Every edge has `cy:directed`. Since 3.3 every att has `cy:type` and lists have `cy:elementType`. `<graphics>` keeps the XGMML attributes (`x y z w h type fill outline width`) plus nested `<att name="NODE_LABEL" ...>` visual properties and a `lockedVisualProperties` list                                                                                                                                                                        | Cytoscape 3.0 to 3.10, then NDEx and leovan/xgmml copies                                                                                         |
| D. Cytoscape 3.x session network (`.cys` `networks/*.xgmml`) | Root has `cy:documentVersion="3.0"`, `cy:view="0"` and `cy:registered="0"`. The root is the CyRootNetwork. Its children are `<att><graph cy:registered="1">` subnetworks. Shared nodes and edges are referenced by `xlink:href="#SUID"`, and a node's nested network may live in another file (`xlink:href="207-Set+2.xgmml#223"`). It carries no node or edge atts: those live in the session's `.cytable` files                                                                             | Cytoscape 3 session writer                                                                                                                       |
| E. Cytoscape 3.x session view (`.cys` `views/*.xgmml`)       | Root has `cy:view="1"`, `cy:networkId`, `cy:visualStyle` and `cy:rendererId`. Its `<node cy:nodeId>` and `<edge cy:edgeId>` carry graphics only, and their `id` is a view SUID, not a node id. Edges appear only when they have locked properties                                                                                                                                                                                                                                             | Cytoscape 3 session writer                                                                                                                       |

`documentVersion` history:

- 2.x wrote `1.0`, later `1.1`, as a graph att. 1.0 changed the edge-bend handle encoding.
- Early 3.0 sessions also wrote `<att name="documentVersion" value="3.0">` (the core-task-impl
  `test_session1.cys`).
- 3.x writes the `cy:documentVersion="3.0"` root attribute, and it has not moved since. The writer
  constant is `VERSION = 3.0f`.
- Cytoscape parses the value with `Double.parseDouble`, and anything unparseable becomes 0.0.
- Version gates in the reader:
    - `< 3.0` turns on bypass `node.*` atts, `nested_network_id`, 2.x group handling and
      edge-duplicate suppression;
    - `== 1.0` uses the old bend handle form;
    - `>= 3.0` in a session ignores node and edge atts.

When each feature appeared:

- 1.0 draft (2000-10-06): the core: `graph`, `node`, `edge`, `att`, `graphics`, `center`, `Line`,
  `point`; att types `list`, `string`, `real`, `integer`; XLink attributes.
- 1.0 DTD (2001-06-27): `id.type`; `graph` content becomes `(att*,(node|edge)*)`.
- Cytoscape 2.x (about 2004 to 2011):
    - att type `boolean` (not in the draft);
    - the `cy:` namespace `http://www.cytoscape.org`;
    - `cy:hidden` and `cy:editable`;
    - RDF `networkMetadata`;
    - `documentVersion` 1.0 and 1.1;
    - `cytoscape*GraphicsAttributes`;
    - `edgeBend` handles;
    - 2.x groups and nested networks.
- Cytoscape 3.0 (2013):
    - `cy:documentVersion`, `cy:directed`, `cy:registered`, `cy:view`;
    - `cy:networkId`, `cy:nodeId`, `cy:edgeId`, `cy:visualStyle`;
    - `xlink:href` node and edge references and subnetworks;
    - `cy:equation`;
    - `lockedVisualProperties`;
    - nested graphics `<att>` visual properties.
- Later 3.x releases: `cy:rendererId` (absent from the 2012-2014 session test files, present in the 2022 Yeast Perturbation session).
- Cytoscape 3.3 (2015): `cy:type` (String, Double, Integer, Long, Boolean, List) and
  `cy:elementType`. Before 3.3 a Long column was written as `type="integer"` and could not be told
  apart from an Integer column.

---

## 3. Feature inventory a comprehensive reader must handle

### 3.1 Document level

- XML declaration absent, present, or with `standalone="yes"` (Cytoscape always writes
  `encoding="UTF-8" standalone="yes"`). Single-quoted declaration (`<?xml version='1.0'?>`,
  galFiltered.xgmml).
- A comment before the root (EFI-EST: `<!-- Database: 70 -->`, with no XML declaration at all).
- `<!DOCTYPE graph PUBLIC "-//John Punin//DTD graph description//EN" "http://www.cs.rpi.edu/~puninj/XGMML/xgmml.dtd">`
  or `<!DOCTYPE graph SYSTEM "xgmml.dtd">`. Never fetch it. Cytoscape turns off
  `load-external-dtd` and validation.
- Namespaces:
    - default `xmlns="http://www.cs.rpi.edu/XGMML"`;
    - no namespace (spec examples, Cytoscape's `INVALID.xgmml`, `empty_DTD.xgmml`);
    - prefixed `xgmml:graph` (the spec's XHTML-embedding example).
      `xmlns:cy="http://www.cytoscape.org"`, `xmlns:xlink`, `xmlns:rdf`, `xmlns:dc` and `xmlns:xsi`
      appear in Cytoscape files. galFiltered binds XLink to the prefix `ns1`.
- XGMML embedded inside another XML document (draft 2.1, an XHTML page with `xgmml:graph`). It is
  rare. A reader may accept a non-`graph` root by taking the first `graph` element in the XGMML
  namespace, with a warning.
- One root `graph` per document. Nested graphs live only inside `att` (3.5).

### 3.2 `graph` attributes

- Global attributes: `id`, `name`, `label`, `labelanchor`. The draft calls `id` "number", but real
  ids are any string (galFiltered: `id="Yeast Network (galFiltered.gml)"`).
- `directed`: `0` or `1`, default `0` by the DTD. Section 4.5 covers how Cytoscape departs from
  this.
- Unsafe GML keys: `Vendor`, `Scale`, `Rootnode`, `Layout`, `Graphic`. The draft examples write
  lowercase `graphic="1"`, which breaks their own DTD.
- XLink: `xlink:type`, `xlink:role`, `xlink:title`, `xlink:show`, `xlink:actuate`, `xlink:href`.
  In Cytoscape a nested `<graph xlink:href="#SUID"/>` is a reference to a network written
  elsewhere, possibly in another file of the session.
- Cytoscape: `cy:documentVersion`, `cy:view`, `cy:registered`, `cy:networkId`, `cy:visualStyle`
  and `cy:rendererId`.
- `xml:lang` and `xml:space`, from the DTD.

### 3.3 `node`

- `id` (missing: Cytoscape falls back to `label`), `label` (missing: Cytoscape falls back to the
  `name` XML attribute "for backwards compatibility"), `name`, `labelanchor`, `weight` (draft:
  string, "usually numerical"; the D.3 examples use `-1`), `edgeanchor`.
- `xlink:href="#id"`: a reference to a node already declared, or declared later, in another
  (sub)graph. Cytoscape resolves forward references once the outermost `</graph>` closes
  (`HandleGraphDone`).
- `cy:nodeId` (view dialect only).
- Children: `graphics?`, then `att*` by the DTD. Cytoscape 3 writes `att` (and the nested-graph
  `att`) BEFORE `graphics`, so accept any order and any number. A second `graphics` overrides key
  by key (Cytoscape keeps a map per element).

### 3.4 `edge`

- `source` and `target` (required by the DTD), `id`, `label`, `name`, `weight`, `labelanchor`.
- `cy:directed` (`1`, `0`, `true`, `false`).
- `cy:edgeId` (view dialect only).
- `xlink:href="#id"`: a reference to an edge declared elsewhere (3.x subnetworks).
- Endpoint lookup:
    - Ids are document-global, not scoped to the enclosing graph. Draft example D.4 declares edges
      at the root between nodes that live in two different nested subgraphs.
    - Cytoscape's fallback: when `source` or `target` does not resolve, it parses the edge label as
      `"<source alias> (<interaction>) <target alias>"`, splitting on `[()]` into exactly three
      parts, and looks the aliases up as node ids.
    - When the edge label has that three-part shape, Cytoscape sets the `interaction` column from
      the middle part.
- Endpoint before declaration: an edge may precede its nodes (`hiddenAtt.xgmml`: "It should not
  matter whether or not edges are written before nodes!"). Cytoscape creates a placeholder node
  and fills it in when the node arrives.
- Self-loops (`simple.xgmml`, draft D.3) and parallel edges (draft D.3: two `1 -> 3`) are both
  normal.
- Missing edge `id`: Cytoscape uses the label as the edge's cache key. Two parallel edges with the
  same label then share a key, but both edges are still created. In 2.x sessions with groups, a
  repeated id deliberately de-duplicates an edge that the 2.x writer emits twice.

### 3.5 Nested graphs and groups

- Draft 4 and 9.2: a `graph` inside an `att` is a subgraph. Under a node it is "the node's
  subgraph" (a compound node or metanode). Under the root graph it is a subgraph of the main
  graph.
- Cytoscape 2.x groups (`group_2x_collapsed.xgmml`, `group_2x_expanded.xgmml`,
  `nested_groups_283.xgmml`):
    - the group node carries atts `__groupState` (1 expanded, 2 collapsed), `__groupViewer`,
      `__groupIsLocal`, `NumChildren`, `NumDescendents` and `__MetanodeAggregationEnabled`;
    - members inside the nested graph carry `__metanodeHintX/Y`;
    - meta-edges carry `__isMetaEdge` and the interaction `meta-DirectedEdge`;
    - in a collapsed group the members appear only inside the nested graph;
    - in an expanded group they also appear at the top level, by `xlink:href`;
    - groups nest (`nested_groups_283`: depth 9 elements, 3 graphs).
- 2.x nested networks: `<att type="string" name="nested_network_id" value="M3"/>` names another
  network of the session by its label, and `has_nested_network` is forced to boolean (`"yes"`).
  These are pointers, not containment.
- 3.x export (`GenericXGMMLWriter`): a node's network pointer is written as
  `<att><graph id= label= cy:registered=>...</graph></att>` inside the node. The second time a
  network is reached, it is written as `<att><graph xlink:href="#SUID"/></att>`. A pointer to a
  network of another root is written with the file name: `file.xgmml#SUID`.
- 3.x session network (dialect D):
    - the root graph is the root network;
    - the first nested graph is the base network;
    - each further nested graph is a subnetwork;
    - `cy:registered="1"` marks the user-visible networks;
    - elements can be declared directly under the root, outside every subnetwork. In
      `nestedGroups_expanded`, the meta-edges 90 and 93 exist only in the root network;
    - a node can belong to several subnetworks (one declaration, then `xlink:href` elsewhere).
      Membership is a set, not a tree.

### 3.6 `att`

- Attributes: `name` (Cytoscape also accepts `label` as the name, for `documentVersion`), `value`
  and `type`.
    - Draft types: `list`, `string`, `real`, `integer`; the default is `string`.
    - Cytoscape adds `boolean`. Type names are matched case-insensitively.
    - An unknown type falls back to string in Cytoscape.
- `cy:type` (3.3+) overrides `type` and is matched case-insensitively against `String`, `Double`,
  `Integer`, `Long`, `Boolean` and `List`. `cy:elementType` (3.3+) gives the element type of a
  list. Note that the XGMML type `integer` maps to both Integer and Long, so only `cy:type`
  separates them.
- `cy:hidden`: Cytoscape's hidden (private) table. `"1"`, `"true"` and `"yes"` in any case are
  true, and anything else is false.
- `cy:editable` (2.x): ignored on read.
- `cy:equation="1"`: `value` is a formula string (`=ABS($x)`). Cytoscape compiles it after
  parsing. A reader that cannot evaluate formulas keeps the text and says so.
- Null values: Cytoscape writes a null cell as an `att` with no `value`. The reader leaves the
  cell unset.
- Lists:
    - `type="list"` with child `att` elements. Cytoscape 3 repeats the parent's `name` on every
      child.
    - An empty list `<att type="list" name="x"/>` with no `cy:elementType`: Cytoscape creates no
      column, because the element type is unknown.
    - With `cy:elementType`: an empty list.
    - `<att type="list"><att type="string"/></att>` (a child without a value): an empty list.
    - `<att type="string" value=""/>`: a list holding one empty string.
    - Mixed child types: Cytoscape takes the type of the first child and converts the rest.
- Structured records. The draft's 9.2 example is a `list` whose children have different names
  (`name`, `ssn`, `e-mail`), which is a map, not a list. Lists of lists are legal by the DTD
  (`att` contains `att`). Neither has a list-column equivalent.
- An `att` holding foreign XML: RDF (`<att name="networkMetadata"><rdf:RDF><rdf:Description>`
  with `dc:type`, `dc:description`, `dc:identifier`, `dc:date`, `dc:title`, `dc:source`,
  `dc:format`). The draft's RDF examples put arbitrary RDF/vCard inside a node's `att`.
- Text content (`#PCDATA`) inside `att` is legal by the DTD and is not used by Cytoscape (it reads
  only `value`).
- A wrapper `att` with no `name` and no `value` holds a nested graph. Cytoscape skips it as an
  attribute.
- Special graph atts that Cytoscape routes to the view, not to columns: `documentVersion`,
  `backgroundColor`, `GRAPH_VIEW_ZOOM`, `GRAPH_VIEW_CENTER_X`, `GRAPH_VIEW_CENTER_Y` and
  `NODE_SIZE_LOCKED`.
- 2.x node atts named `node.*` (and edge `edge.*` in NGSCheckMate) are visual bypasses
  (`node.fillColor`, `node.label`, `edge.lineWidth`). Cytoscape uses them as view properties AND
  stores them as columns.
- `*.SUID` columns: a `real`/`integer` att whose name ends in `.SUID` is an element reference.
  Cytoscape rewrites the value to the new SUID, nulls an unresolvable one and drops it from lists
  (`suid_metadata.xgmml`). A string-typed `.SUID` att stays a string.
- Shared versus local columns are a Cytoscape table concept with no file syntax: `selected` is
  local; `shared name` and `shared interaction` are written as ordinary atts.

### 3.7 `graphics`

- On a node: the draft attributes
    - `type` (GML shapes `arc bitmap image line oval polygon rectangle text`, app shapes
      `box circle ver_ellipsis hor_ellipsis rhombus triangle pentagon hexagon octagon`; Cytoscape
      writes `ELLIPSE`, `RECTANGLE`, `ROUND_RECTANGLE`, ...);
    - `x y z` (position), `w h d` (size), `image`, `bitmap`, `width` (line width), `arrow`,
      `capstyle`, `joinstyle`, `smooth`, `splinesteps`, `justify`, `font`, `background`,
      `foreground`, `extent`, `start`, `style`, `stipple`, `visible`;
    - `fill` and `outline` (CSS2 colors: keywords, `#rgb`, `#rrggbb`, `rgb(r,g,b)`), `anchor`.
- Child elements:
    - `<center x y z/>` is a node center;
    - `<Line><point x y/>...</Line>` is an edge polyline (GML legacy; the element name is
      capitalised in the DTD).
- Cytoscape 2.x `cy:` graphics attributes:
    - nodes: `cy:nodeTransparency` (0.0 to 1.0, converted to 0 to 255), `cy:nodeLabelFont`
      (`Name-style-size`, for example `SansSerif.bold-0-12`, converted to `Name,bold,12`),
      `cy:nodeLabel`, `cy:borderLineType`;
    - edges: `cy:sourceArrow`, `cy:targetArrow` (integers 0 to 17 mapped to shapes; table in
      `GenericXGMMLReader.java`), `cy:sourceArrowColor`, `cy:targetArrowColor`, `cy:edgeLabelFont`,
      `cy:edgeLabel`, `cy:edgeLineType`, `cy:curved`.
- 2.x documentVersion 1.0 wraps those as child atts of `cytoscapeNodeGraphicsAttributes` or
  `cytoscapeEdgeGraphicsAttributes` (galFiltered.xgmml).
- Edge bends (2.x): `<att name="edgeBend">` containing `<att name="handle" x=".." y=".."/>` (1.1)
  or, in 1.0, `<att name="handle"><att name="x" value=".."/><att name="y" value=".."/></att>`.
  Cytoscape joins them into `edgeHandleList="x,y|x,y"`.
- Cytoscape 3: nested `<att name="NODE_LABEL" value=".." type="string"/>` for every visual
  property that has no XGMML attribute, plus `<att name="lockedVisualProperties" type="list">`
  holding the bypasses. All values are strings in Cytoscape's serialisable form (colors `#RRGGBB`,
  fonts `Dialog,plain,12`, label positions `C,C,c,0.00,0.00`, custom graphics class strings).
- On the graph: 3.x writes `<graphics>` with `NETWORK_*` atts (center, scale, width, height,
  title, background). 2.x writes those as graph atts (3.6).
- Which graphics values are locked bypasses and which are plain view values: for a node only
  `x`, `y` and `z` are view values. Everything else Cytoscape reads as a locked bypass.

### 3.8 Values and lexical forms

- Booleans: the draft allows `0` and `1`. Cytoscape writes `1`/`0` and reads `1`, `true` and `yes`
  in any case as true; everything else, including `2` and an empty string, is false.
- Integers: Java `Integer.valueOf` and `Long.valueOf` (an optional `+` or `-` sign, decimal digits
  only, no whitespace). Overflow throws.
- Reals: Java `Double.valueOf`. It accepts surrounding whitespace, `NaN`, `Infinity` and
  `-Infinity`, exponents (`5.373E-8`, which Cytoscape writes), hex floats (`0x1p3`) and a trailing
  `d` / `f` / `D` / `F` (`1.0d`). Cytoscape writes `Double.toString` forms (`1.0E-5`, `NaN`,
  `Infinity`).
- Strings: the Cytoscape writer replaces newline with the two characters `\n` and tab with `\t`.
  The reader reverses this on every string value, so a string that genuinely contains a backslash
  followed by `n` cannot round-trip. Entity-escaped newlines (`&#10;`) are not used by Cytoscape
  for these.
- The Cytoscape writer's "full encoding" (`cytoscape.encode.xgmml.attributes`, default true)
  writes every UTF-16 code unit outside printable ASCII as `&#xHHHH;`. An astral character such as
  an emoji therefore becomes two surrogate character references (`&#xd83d;&#xde00;`), which XML
  1.0 forbids (well-formedness constraint "Legal Character"). Other control characters become, for
  example, `&#x1;`, which is also illegal. This is read from the code, not observed in a file.
- `*.SUID` values written as `real` (`value="21"` or `"21.0"`) are truncated to long.

### 3.9 Metadata

- The RDF `networkMetadata`: `dc:title`, `dc:description`, `dc:date` (`yyyy-MM-dd HH:mm:ss`,
  local time, no zone), `dc:source`, `dc:format` (`Cytoscape-XGMML`), `dc:type` (almost always the
  boilerplate `Protein-Protein Interaction`) and `dc:identifier` (usually `N/A`).
- The graph `label` is the network name. With no label, Cytoscape uses the id, and then a
  generated "Network <SUID>".

### 3.10 Extensions, MIME types and sniffing

- Extensions:
    - `.xgmml` (Cytoscape);
    - `.xml` (Cytoscape registers it too, and VPLG writes `*_PG.xml`). It collides with GraphML,
      Cytoscape style files and `cysession.xml`;
    - `.gr` (the draft's recommendation). It collides with DIMACS `.gr`, so do not register it, or
      give it a low score.
- MIME types: `application/xgmml` (draft appendix E), `text/xgmml` and `text/xgmml+xml`
  (Cytoscape).
- Cytoscape's sniff reads 20 lines and matches the regular expression
  `<graph[\s]+[^<>]*['"]http://www.cs.rpi.edu/XGMML['"][^<>]*>` or
  `<!DOCTYPE[\s]+graph[\s]+[^<>]*['"][^<>]*xgmml.dtd['"][^<>]*>`. A no-namespace, no-DOCTYPE
  `<graph>` (`INVALID.xgmml`) is therefore refused by Cytoscape's file filter.
- `cy:view="1"` (or `"true"`) in the root tag marks a view file.
- Recommended graph-io sniff scores:
    - root `graph` with the XGMML namespace, or a DOCTYPE naming `xgmml.dtd`: 0.95;
    - a root local name `graph` without them: 0.5. GraphML's and GEXF's roots are `graphml` and
      `gexf`, so there is no conflict;
    - a `cy:view="1"` root: still recognised, then rejected at import (4.9).

---

## 4. Mapping onto graph-io's snapshot model

The model is from `design/graph-format/graph-format-design.md`: one graph per snapshot; typed node,
edge and graph columns with roles; a `position` f32x3 column; a `parent` / `parents` containment
column; per-edge direction through `DirectionResolver`; parallel edges and self-loops allowed. The
reader should be built on the shared `common/xml.ts` tokenizer, exactly like GraphML and GEXF.

### 4.1 Nodes and ids

| XGMML                                                                  | Snapshot                                                                                                                                                 | Notes                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node/@id`                                                             | node id (string, coerced through the `ids` option)                                                                                                       | Keep ids as strings by default. Cytoscape turns every id that `Long.valueOf(trim)` accepts into a long, so `"1"`, `"01"` and `" 1 "` collide in Cytoscape. graph-io must not merge them (the expectation overrules Cytoscape; record it like the networkx-overruled entries) |
| missing `id`                                                           | id = `label` (Cytoscape's rule), with a warning. Missing both: `E_MISSING_ID` for that node                                                              |                                                                                                                                                                                                                                                                              |
| `node/@label` (else `@name`)                                           | column `label`, role `label`                                                                                                                             |                                                                                                                                                                                                                                                                              |
| `node/@name` when `@label` exists                                      | column `name` (galFiltered: `name="base"` on every node)                                                                                                 |                                                                                                                                                                                                                                                                              |
| `node/@weight`                                                         | node column `weight` (text grammar 5.1)                                                                                                                  | No node weight role                                                                                                                                                                                                                                                          |
| `xlink:href` node                                                      | no new node: membership of the current nested graph (4.4). Unresolved at the end: error `E_UNKNOWN_NODE`-class issue for the reference, node not created | Cytoscape logs and drops it                                                                                                                                                                                                                                                  |
| duplicate `id` (a second full declaration)                             | `W_DUPLICATE_NODE`; the later declaration's atts fill unset cells, as the GraphML importer does. Cytoscape merges the same way                           |                                                                                                                                                                                                                                                                              |
| other XML attributes (`labelanchor`, `edgeanchor`, `xlink:title`, ...) | warn once per name, or keep as string columns under their names                                                                                          |                                                                                                                                                                                                                                                                              |

### 4.2 Edges, direction and multi-edges

| XGMML                      | Snapshot                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source` / `target`        | endpoints through `IdCoercer`. Undeclared at document end: `addMissingNodes` (default true) creates them, with a warning; otherwise `E_UNKNOWN_NODE`. Missing attribute: `E_MISSING_ENDPOINT`. The Cytoscape label-alias fallback (3.4) should be an option (`xgmml.labelAliases`, default true when the `cy` namespace is declared), never silent: count it in a warning |
| `id`                       | edge column `id`, role `id`. Duplicate edge ids: `E_DUPLICATE_EDGE_ID` per the shared code, except in a 2.x document (`documentVersion < 3.0`) that has nested graphs, where a repeat is the 2.x writer's group duplicate and is dropped with a warning (Cytoscape's `checkDuplicate`)                                                                                    |
| `label`                    | edge column `label`, role `label`                                                                                                                                                                                                                                                                                                                                         |
| `weight`                   | THE weight (role `weight`, `parseWeightText`). The draft defines it on every edge, and spec examples set `weight="0"` everywhere, so a zero weight is a real value, not a missing one                                                                                                                                                                                     |
| `cy:directed`              | per-edge direction through `DirectionResolver.addEdge`                                                                                                                                                                                                                                                                                                                    |
| graph `directed`           | the header direction (`DirectionResolver.setHeader`). Absent: the DTD default `0` applies; the `defaultDirected` option can override                                                                                                                                                                                                                                      |
| parallel edges, self-loops | kept (multigraph)                                                                                                                                                                                                                                                                                                                                                         |
| the `interaction` att      | ordinary edge column (string). When absent and the label has the `a (i) b` shape, derive it only under the Cytoscape-dialect option, because Cytoscape does                                                                                                                                                                                                               |

Direction is the largest known disagreement with the reference reader. `HandleGraph` never reads
the root's `directed` attribute. `ReadDataManager.currentNetworkIsDirected` is initialised to
`true` and never assigned. So Cytoscape makes every edge without `cy:directed` DIRECTED, even under
`directed="0"` (VPLG protein graphs) or with no attribute at all (the EFI-EST similarity networks,
whose edges are symmetric similarities). The XGMML DTD says `directed` defaults to `0`. graph-io
should follow the specification:

- root `directed`, default `0`, as the header;
- `cy:directed` per edge overrides it;
- record "Cytoscape overruled: graph directed attribute ignored" on every fixture where this
  matters.

Cytoscape 3 files are unaffected in practice, because the writer puts `cy:directed` on every edge.
It also sets the root `directed="1"` when any edge is directed, which makes mixed graphs come out
as header-directed with per-edge exceptions.

### 4.3 Attribute columns

| XGMML type (with `cy:type`)                                                                     | Column dtype                                                                                                                                                                     | Notes                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string` / `String`, or no type                                                                 | `string` (or `dict` by the cardinality heuristic)                                                                                                                                | Apply Cytoscape's `\n` / `\t` unescape only for Cytoscape-dialect documents (an option, default on when the `cy` namespace is declared); otherwise keep the text. Name the option in the README                       |
| `real` / `Double`                                                                               | `f64`                                                                                                                                                                            | Accept the Java lexical forms of 3.8 (`NaN`, `Infinity`, `-Infinity`, exponents). Reject hex floats and `d`/`f` suffixes with an error per value: Cytoscape never writes them                                         |
| `integer` / `Integer`                                                                           | `i32`                                                                                                                                                                            | A value outside i32 widens the column to `f64` with `W_WIDENED` (pre-3.3 Cytoscape wrote Longs as `integer`). Cytoscape itself fails the whole file here (`Integer.valueOf` throws). Expectation: graph-io imports it |
| `integer` + `cy:type="Long"`                                                                    | `f64`, `origin.type: "long"`; `\|v\| > 2^53` gives `W_PRECISION`; the `long: "string"` option makes it a string column                                                           | design 5.1 "declared long" rule                                                                                                                                                                                       |
| `boolean` / `Boolean`                                                                           | `bool`                                                                                                                                                                           | `1`, `true`, `yes` give true; `0`, `false`, `no` give false (any case); anything else is an error per value. Cytoscape would read it as false; graph-io does not guess                                                |
| `list` / `List`                                                                                 | `list`, child dtype from `cy:elementType`, else from the children's types, widened per 5.1                                                                                       | Empty list without an element type: create the column only if another row gives the type; otherwise a `list<string>` column with a warning (Cytoscape creates no column)                                              |
| list whose children have distinct `name`s, a list of lists, or an att holding foreign XML (RDF) | `json` (an object of name to value; nested arrays; the XML kept as a string)                                                                                                     | one list level (design Q23)                                                                                                                                                                                           |
| `cy:hidden="1"`                                                                                 | normal column with `meta.extra.hidden: true` (`origin.namespace: "cytoscape"`)                                                                                                   | So a writer can restore it                                                                                                                                                                                            |
| `cy:equation="1"`                                                                               | `string` column holding the formula, with a warning (`W_XGMML_EQUATION`)                                                                                                         | never evaluated                                                                                                                                                                                                       |
| unknown `type` value (`"float"`, `"double"`, `"date"`)                                          | `string` with `W_UNKNOWN_ATTR_TYPE` (the shared code)                                                                                                                            | Cytoscape uses string silently                                                                                                                                                                                        |
| `value` missing on a scalar att                                                                 | cell unset                                                                                                                                                                       |                                                                                                                                                                                                                       |
| unparseable typed value (`integer="abc"`, `real="1,5"`)                                         | error per value (counts toward `errorLimit`), cell unset                                                                                                                         | Cytoscape aborts the whole file with a SAXParseException. The expectation is the graph-io behaviour; note Cytoscape's                                                                                                 |
| same att name twice on one element                                                              | last wins, with a warning                                                                                                                                                        | Cytoscape's `row.set` keeps the last                                                                                                                                                                                  |
| same name with different declared types on different elements                                   | widen per 5.1 with `W_WIDENED`; string beats numbers                                                                                                                             | Cytoscape keeps the first column type and casts later numbers (`intValue()` truncates `2.5` to `2`), or throws on a string                                                                                            |
| att name colliding with a fixed column (`label`, `id`, `name`)                                  | the `<name>#<n>` rename rule (`declareResolved`, `W_COLUMN_RENAMED`)                                                                                                             | galFiltered has a `canonicalName` att and node `label`, which do not collide                                                                                                                                          |
| `*.SUID` real att                                                                               | `string` or `f64` as typed, kept verbatim with `meta.extra.suidReference: true`                                                                                                  | SUIDs are meaningless outside the writing session. Remapping them is Cytoscape-internal                                                                                                                               |
| graph-level atts                                                                                | graph table columns, same typing                                                                                                                                                 |                                                                                                                                                                                                                       |
| `networkMetadata` RDF                                                                           | `GraphMeta`: `dc:title` to `name` (when the graph has no label), `dc:description` to `description`, `dc:date` to `created` (kept as text: no zone), the rest to `meta.extra.rdf` |                                                                                                                                                                                                                       |
| `documentVersion` att / `cy:documentVersion`                                                    | `meta.sourceVersion`                                                                                                                                                             | `meta.sourceFormat: "xgmml"`                                                                                                                                                                                          |
| 2.x view atts (`backgroundColor`, `GRAPH_VIEW_*`, `NODE_SIZE_LOCKED`)                           | `meta.extra.cytoscapeView`                                                                                                                                                       | not columns                                                                                                                                                                                                           |

### 4.4 Nested graphs, groups and containment

- Flatten. Every node declared anywhere in the document is a node of the snapshot, and every edge
  declared anywhere is an edge. Ids are global (draft D.4).
- A graph nested under a node makes that node the parent of every node DECLARED in it. Set the
  role `parent` (u32, refersTo node) column, which reuses the GraphML nested-graph path.
- A node that also appears by `xlink:href` in another node's nested graph has several parents.
  This happens with expanded 2.x groups and with 3.x groups (`nestedGroups_expanded`: G1 is
  inside G2's group network and also in the base network). Write the role `parents` list column,
  or keep the first parent and warn `W_PARENTS_DROPPED`, whichever the other importers do.
- Nested-graph attributes (`gr_att_1` in `group_2x_collapsed`) go on the parent node as json
  column `xgmml.subgraph` (`{id, label, atts}`), or are dropped with a warning. The GraphML
  importer drops them with `NESTED_GRAPH_DATA`, so do the same and reuse the concept.
- A graph nested under the ROOT (not under a node) is a subnetwork.
    - In a generic document, flatten its elements into the graph and record membership in a
      `list<string>` node column `xgmml.networks` (the subnetwork ids). It is not containment.
    - In the session-network dialect (D), the root is Cytoscape's root network, which no user ever
      sees. `import()` should return the base network (the first nested graph, normally
      `cy:registered="1"`) and warn `W_MULTIPLE_GRAPHS` with the number of other registered
      subnetworks. `importAll()` returns each registered subnetwork, resolving `xlink:href` members
      against declarations anywhere in the file. Elements declared only at the root level
      (meta-edges) are not in any registered network: drop them from `import()` with a count.
    - A cross-file `xlink:href="other.xgmml#223"` cannot be resolved from one file: warn, keep the
      pointer string in a node column `xgmml.networkPointer`. The `.cys` importer resolves it.
- 2.x `nested_network_id` (`t3.cys`): a pointer by network label. Keep it as the string column it
  already is; the `.cys` importer can resolve it.
- Group bookkeeping atts (`__groupState`, `__metanodeHintX`, `__isMetaEdge`, `NumChildren`) are
  ordinary columns. `__metanodeHintX/Y` is a relative position hint, not the position.

### 4.5 Positions and graphics

- `node/graphics/@x`, `@y` and `@z` go into the role `position` f32x3 column, with
  `origin.extra.sourceDims` 2 or 3 (`z` present: 3; Cytoscape 3 always writes `z="0.0"`, so treat
  an all-zero z as 2) and `units: "file"`.
- A `<center>` child supplies x/y/z when the attributes are absent.
- Session view files carry a duplicate `<att name="z" value="0.0"/>` inside graphics; ignore it.
- The other graphics attributes go into one `json` column `graphics` per table: the XML attributes
  with their `cy:` prefix stripped, plus `properties` for the nested Cytoscape 3 visual-property
  atts, `locked` for `lockedVisualProperties`, and `bends` for 2.x handles or `<Line><point>`
  lists (as `[[x,y],...]`). Optionally promote `fill` to role `color`, `w`/`h` to role `size`
  (the mean, or `[w,h]` in json), and `type` to role `shape`, if graphty-element consumes those
  roles. That is a decision for the implementer and is recorded as such.
- Graph-level `graphics` (`NETWORK_*`) goes to `meta.extra.cytoscapeView`.
- Value conversions Cytoscape applies (transparency 0..1 to 0..255, old fonts, arrow integers) are
  presentation-only. Keep the raw text in the json; do not convert.

### 4.6 Things the snapshot cannot hold

All of these need a warning or a loss note, never silence:

- equations (kept as text);
- shared versus local Cytoscape tables (flattened into one table);
- visual styles (not in XGMML; in a `.cys` or style file);
- subnetwork collections beyond the one imported;
- per-subnetwork attribute values that differ (3.x local tables). XGMML writes the same element's
  atts once, so this is rare;
- SUID identity across files.

### 4.7 Exporter notes (for the matching exporter)

- Write dialect C (3.x), so that Cytoscape 3.x reads it without loss:
    - `cy:documentVersion="3.0"`;
    - `directed` from the header, plus `cy:directed` on every edge (Cytoscape ignores the header);
    - `type` plus `cy:type` (and `cy:elementType` on lists).
- Type losses:
    - `f32` is written as `real`/Double;
    - `u32`/`u8` as `integer`/Integer, or Long beyond i32;
    - `dict` as `string`;
    - `json` as `string`, or a nested `att` list where it is an array of scalars;
    - `list` of `json` is impossible.
- Strings:
    - newline and tab must use Cytoscape's `\n` / `\t` convention only if the exporter targets
      Cytoscape. Otherwise use `&#10;` / `&#9;` character references, which every XML reader keeps;
    - never emit surrogate character references; write UTF-8;
    - XML-illegal control characters go through `xmlIllegalTextNotes` (the shared loss note).
- Structure:
    - `parent` is written as a node-nested `<att><graph>`; `parents` beyond the first are written as
      `xlink:href` node references;
    - position goes to `graphics x y z`.

---

## 5. Errors and edge cases

The XML layer is shared with GraphML and GEXF (`common/xml.ts`, `common/input.ts`). Their existing
checklist in `graph-io/test/conformance/sources.md` section 3 applies unchanged. XGMML-specific
cases follow.

| Case                                                                                                             | Right behaviour                                                                                                                                                                                                            | Reference behaviour (Cytoscape 3.10)                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Empty input; whitespace only                                                                                     | `E_EMPTY_INPUT`                                                                                                                                                                                                            | SAX fatal error                                                                                                                                                                                                                            |
| Truncated document (cut inside a node, or a missing `</graph>`)                                                  | fatal `E_XML_SYNTAX` with the line                                                                                                                                                                                         | Fatal, whole import fails                                                                                                                                                                                                                  |
| Not well-formed: bare `&` (`bare_ampersands.xgmml`: `name="&net_att_1"`)                                         | fatal by default. Optional `repairBareAmpersands` (off by default): an `&` not followed within 7 bytes by `;` is read as `&amp;`, with `W_XGMML_AMPERSAND_REPAIRED` per occurrence                                         | Fatal unless the JVM property `cytoscape.xgmml.repair.bare.ampersands=true`, which does exactly that 7-byte lookahead                                                                                                                      |
| Surrogate or control character references (`&#xd83d;&#xde00;`, `&#x1;`) written by the Cytoscape writer          | Fatal under strict XML. Recommended: a lenient pairing of two surrogate references into one character, with a warning; still fatal for a lone surrogate or a control character                                             | Xerces rejects them (illegal character reference)                                                                                                                                                                                          |
| Undeclared named entity (`&nbsp;`)                                                                               | fatal, naming the entity                                                                                                                                                                                                   | fatal                                                                                                                                                                                                                                      |
| DOCTYPE with internal subset entities (billion laughs) or `SYSTEM "file:///etc/passwd"`                          | never expanded, never fetched; entity use is a fatal unknown entity                                                                                                                                                        | `readXGMML` turns off only external-DTD loading and validation, so internal entities are expanded up to the JDK's default entity-expansion limit. graph-io must not expand them at all                                                     |
| Encoding: UTF-8 with or without BOM; UTF-16 with BOM; `encoding="ISO-8859-1"` declared; undeclared Latin-1 bytes | per `common/input.ts`: declared encoding, BOM, UTF-8, windows-1252 fallback with `W_ENCODING_FALLBACK`. The draft's appendix A says the default character set is ISO-8859-1, which contradicts XML 1.0. Follow XML (UTF-8) | Xerces follows XML                                                                                                                                                                                                                         |
| Root is not `graph` (`graphml`, `gexf`, an XHTML page)                                                           | not XGMML: `E_NO_GRAPH`, or with the embedding option the first `xgmml:graph`                                                                                                                                              | not recognised                                                                                                                                                                                                                             |
| Root `graph` without namespace or DOCTYPE (`INVALID.xgmml`)                                                      | import it (the content is unambiguous), with `W_XGMML_NO_NAMESPACE`                                                                                                                                                        | refused by the file filter (cannot be opened)                                                                                                                                                                                              |
| A session view document (`cy:view="1"`) imported on its own                                                      | error `E_XGMML_VIEW_DOCUMENT`: it holds positions keyed by `cy:nodeId`, no edges, and its ids are view SUIDs. Expose an internal helper that returns `{nodeId -> position}` for the `.cys` importer                        | only read inside a session                                                                                                                                                                                                                 |
| Unknown element (`<foo>` under graph, `<desc>`, `<data>`)                                                        | `W_UNKNOWN_ELEMENT` (shared code) once per name; skip its subtree                                                                                                                                                          | The state machine ignores the tag but keeps its state, so a `<node>` inside an unknown wrapper under `<graph>` is still read. Expectation: graph-io skips the subtree; note the difference                                                 |
| Unknown XML attribute on graph, node, edge or att                                                                | warn once per name, or keep as a string column (4.1)                                                                                                                                                                       | ignored                                                                                                                                                                                                                                    |
| Unknown `cy:` attribute                                                                                          | keep in `graphics` json or ignore with one warning                                                                                                                                                                         | ignored                                                                                                                                                                                                                                    |
| `att` with `type="list"` but a `value`                                                                           | `value` ignored, with a warning                                                                                                                                                                                            | ignored                                                                                                                                                                                                                                    |
| A scalar `att` with child `att`s                                                                                 | json value, with a warning                                                                                                                                                                                                 | children ignored (state not LIST)                                                                                                                                                                                                          |
| `att` with no `name` and no nested graph                                                                         | ignored with a warning                                                                                                                                                                                                     | ignored silently                                                                                                                                                                                                                           |
| Node without `id` and without `label`                                                                            | `E_MISSING_ID`, node skipped, its subtree skipped                                                                                                                                                                          | Cytoscape throws a NullPointerException (`'oldId' is null`), so the import fails                                                                                                                                                           |
| Duplicate node id                                                                                                | `W_DUPLICATE_NODE`, merged                                                                                                                                                                                                 | merged                                                                                                                                                                                                                                     |
| Duplicate edge id                                                                                                | `E_DUPLICATE_EDGE_ID` (2.x group exception, 4.2)                                                                                                                                                                           | 3.x: both edges created; 2.x with groups: de-duplicated                                                                                                                                                                                    |
| Edge before its nodes (`hiddenAtt.xgmml`)                                                                        | resolved at document end                                                                                                                                                                                                   | placeholder, resolved                                                                                                                                                                                                                      |
| Dangling endpoint (never declared)                                                                               | `addMissingNodes` true: create it with a warning; false: `E_UNKNOWN_NODE`, edge skipped                                                                                                                                    | A placeholder node is created. When the document ends it is still unresolved, so `ReadCache.deleteUnresolvedNodes` removes it from the network the user sees, taking its edges with it, and logs an error. The edge is effectively dropped |
| Missing `source` or `target`                                                                                     | `E_MISSING_ENDPOINT`, edge skipped (unless the label-alias fallback resolves it)                                                                                                                                           | label-alias fallback; when that fails, `createNode(null)` throws a NullPointerException and the whole import fails                                                                                                                         |
| Unresolved `xlink:href` node or edge reference                                                                   | a warning per reference                                                                                                                                                                                                    | logged, dropped                                                                                                                                                                                                                            |
| Cross-file `xlink:href`                                                                                          | warning, pointer kept as text                                                                                                                                                                                              | resolved in the session                                                                                                                                                                                                                    |
| Nested graph inside an edge's att                                                                                | warn and skip (no edge-nested model)                                                                                                                                                                                       | The parse table has no `graph` entry for the edge-att state, so the nested graph and everything inside it is ignored silently                                                                                                              |
| Very deep nesting (groups inside groups)                                                                         | iterative, no recursion limit beyond memory                                                                                                                                                                                | Java recursion is not used (state stack), fine                                                                                                                                                                                             |
| `directed` with a value other than 0/1 (`"true"`, `"yes"`, `"2"`)                                                | accept `true`/`false`/`yes`/`no` with a warning; others are an error, fall back to `defaultDirected`                                                                                                                       | ignored entirely (4.2)                                                                                                                                                                                                                     |
| `cy:directed` with a non-boolean value                                                                           | as above per edge                                                                                                                                                                                                          | any non-true value is false                                                                                                                                                                                                                |
| `cy:documentVersion` unparseable (`"3.x"`)                                                                       | treat as unknown version with a warning; use the content to choose the dialect                                                                                                                                             | becomes 0.0, and the 2.x paths are taken                                                                                                                                                                                                   |
| integer overflow, real overflow (`1e400`)                                                                        | `integer`: widen (4.3). `real`: `Infinity` with `W_PRECISION`                                                                                                                                                              | Integer: whole file fails. Double: Infinity                                                                                                                                                                                                |
| Value with surrounding whitespace (`value=" 5 "`)                                                                | trim for numbers and booleans, never for strings                                                                                                                                                                           | Integer fails; Double trims                                                                                                                                                                                                                |
| Huge files: the 25.8 MB EFI-EST network, the 24.8 MB `The_Yeast_Interactome.cys`                                 | streaming tokenizer, one pass; forward references stored as id lists, not DOM                                                                                                                                              | Cytoscape documents an OutOfMemoryError path                                                                                                                                                                                               |
| Very long lines (a whole network on one line)                                                                    | the tokenizer is not line-bound                                                                                                                                                                                            | fine                                                                                                                                                                                                                                       |
| Two `graphics` on one node                                                                                       | merge key by key, later wins                                                                                                                                                                                               | map per element, later wins                                                                                                                                                                                                                |
| `att` before `graphics`, or nested graph between atts                                                            | accept any order                                                                                                                                                                                                           | accepted                                                                                                                                                                                                                                   |
| Mixed-type list children (`integer`, then `string`)                                                              | widen the child per 5.1                                                                                                                                                                                                    | first child's type; later ones converted or failing                                                                                                                                                                                        |
| Empty graph (`empty.xgmml`, `empty_DTD.xgmml`, `<graph/>`)                                                       | an empty snapshot, no error                                                                                                                                                                                                | an empty network                                                                                                                                                                                                                           |
| Labels with `(`, `)` (VPLG `"(e0-p-e6)"`)                                                                        | ordinary text                                                                                                                                                                                                              | the label-alias split gives two parts, so no interaction is derived                                                                                                                                                                        |
| Ids that are numeric strings with leading zeros or signs (`"-1"`, `"007"`)                                       | distinct string ids by default                                                                                                                                                                                             | collapsed to longs                                                                                                                                                                                                                         |

---

## 6. The independent reader for expectations

**Oracle: Cytoscape 3.10.5 desktop, run headless, read through cyREST.** Cytoscape is the
reference implementation: almost every real XGMML file was written by it, and "what Cytoscape
shows" is what users expect. graph-io's conformance suite already uses this approach for DOT
(Graphviz `gvpr`). Expectations are generated once by a script and committed to the manifest
(`"oracle": "cytoscape-3.10.5"`), so CI never needs Java.

How to run it (Linux, Java 17 required; Cytoscape 3.10 does not bundle a JRE on Linux):

```bash
# once
curl -LO https://github.com/cytoscape/cytoscape/releases/download/3.10.5/cytoscape-unix-3.10.5.tar.gz
tar xzf cytoscape-unix-3.10.5.tar.gz          # needs a Java 17 on PATH (for example Temurin 17)
# per run: a port in 9000-9999 (this server only allows that range)
xvfb-run -a ./cytoscape-unix-3.10.5/cytoscape.sh -R 9412 &
until curl -s localhost:9412/v1 >/dev/null; do sleep 2; done
```

For each fixture, the oracle script (`test/conformance/tools/oracle_xgmml.py`, Python stdlib
`urllib` only) does the following:

1. `POST /v1/commands/session/new`. This starts from an empty session each time, so the ids of one
   file never leak into the next.
2. `POST /v1/commands/network/load file` with `{"file": "<absolute path>"}`. This returns the new
   network and view SUIDs. A failed import returns an error; record `outcome: "error"`.
3. `GET /v1/networks/{suid}`. This returns Cytoscape.js JSON with every node and edge `data`:
   `name` (the XGMML label), `shared name`, `interaction` and every att column. Use the `name`
   column to map back to XGMML ids, because SUIDs are new.
4. `GET /v1/networks/{suid}/tables/defaultnode/columns` and `.../defaultedge/columns`. These give
   the column types (String, Integer, Long, Double, Boolean, List of ...).
5. `GET /v1/networks/{suid}/edges/{edgeId}/isDirected` per edge, for direction.
6. `GET /v1/networks/{suid}/views/first`. This gives node positions, but only for files that
   carry graphics. Without graphics Cytoscape lays the view out itself, so positions are not an
   expectation then.
7. `GET /v1/networks` and `GET /v1/networks/{suid}/nodes/{nodeId}/pointer`. These give
   subnetwork and nested-network structure for the nested-graph fixtures.

Where the expectation must overrule Cytoscape (the same convention as `networkxDisagrees`), mark
the fixture `cytoscapeDisagrees` with the reason. These are known in advance:

1. The root `directed` attribute is ignored (4.2). The spec default of `0` wins.
2. Numeric-looking ids are collapsed (`"1"` equals `"01"`).
3. Integer overflow, an unparseable value, or a missing endpoint aborts the whole file, where
   graph-io imports with per-element errors.
4. A no-namespace root is refused by the file filter (`INVALID.xgmml`). It can still be compared
   by adding the namespace in a copy.
5. Unknown wrapper elements do not stop Cytoscape descending.
6. An edge to a node that is never declared is dropped (5), where graph-io's `addMissingNodes`
   default keeps it and creates the node.

For fixtures Cytoscape cannot read at all (malformed XML, the spec examples without namespace,
security cases), the expectation is hand-written from the draft and the XML 1.0 rules
(`"oracle": "spec"`), as for the other formats.

A second, cheap cross-check that needs no Java: a ~150-line Python stdlib `xml.etree` reader
implementing sections 3 and 4 of this note. It gives counts and ids for every fixture, and its only
job is to catch a broken Cytoscape run. It is NOT independent of this note, so it must never be the
sole source of an expectation. leovan/xgmml is not suitable as an oracle: it ignores lists, nested
graphs, xlink and per-edge direction.

---

## 7. Candidate sample files

Licenses were checked through each repository's LICENSE (GitHub API `license.spdx_id`, plus the
file text where the API said NOASSERTION). Under graph-io's existing rule, LGPL, GPL and unclear
files are test-only: `test/` is not published. Only MIT, BSD or public-domain files are proposed
for graph-samples.

Pinned commits:

- cytoscape-impl `208c1015e565ac55f6a78c2a23aa8196a7cf28ae`;
- cytoscape-gui-distribution `547bf2a7280c4af0cac03eaf2cd7fec4bf552af4`;
- leovan/xgmml `c3cfe0b8234e4f1b4b8bb3ecd9bdf12eb9ce0a75`;
- allie-walker/Natural-product-function `7f86fbc26db47f741a641d5d23470b45bc9c87af`;
- parklab/NGSCheckMate `ef7a38c51dadbd4ef5b6b6db60775f239926f0a8`;
- dfsp-spirit/vplg `aa8bf6d6692f4fd5d4606cf4a4c5d7c668b99987`.

`CI` below is short for `https://raw.githubusercontent.com/cytoscape/cytoscape-impl/208c1015e565ac55f6a78c2a23aa8196a7cf28ae/io-impl/impl/src/test/resources/testData/xgmml/`.

| #   | File                                                                                                        | URL                                                                                                                                                                                            | Size                                          | License (where stated)                                                                                                               | Use                                                                                                        | What it exercises (counts verified with expat)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | simple.xgmml                                                                                                | CI + `simple.xgmml`                                                                                                                                                                            | 878                                           | LGPL-2.1 (cytoscape-impl repository license)                                                                                         | conformance (test-only)                                                                                    | 2.x-style typed atts at all three levels; lists of string and integer; boolean `1`; a self-loop; negative id `-1`. 1 node, 1 edge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2   | simple_3.3.xgmml                                                                                            | CI + `simple_3.3.xgmml`                                                                                                                                                                        | 1,257                                         | LGPL-2.1                                                                                                                             | conformance                                                                                                | `cy:type` / `cy:elementType`; Integer versus Long under `type="integer"`. 1 / 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 3   | listAtt.xgmml                                                                                               | CI + `listAtt.xgmml`                                                                                                                                                                           | 859                                           | LGPL-2.1                                                                                                                             | conformance                                                                                                | empty list without type (no column), empty list with `cy:elementType`, a list holding a child with no value, a list holding `""`; graph-level only. 0 / 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 4   | hiddenAtt.xgmml                                                                                             | CI + `hiddenAtt.xgmml`                                                                                                                                                                         | 1,375                                         | LGPL-2.1                                                                                                                             | conformance                                                                                                | `cy:hidden` as `1`/`0`/`true`/`false`; an edge BEFORE its target node. 2 / 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 5   | suid_metadata.xgmml                                                                                         | CI + `suid_metadata.xgmml`                                                                                                                                                                     | 2,377                                         | LGPL-2.1                                                                                                                             | conformance                                                                                                | `*.SUID` references, valid and dangling, string-typed `.SUID`. 2 / 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6   | bare_ampersands.xgmml                                                                                       | CI + `bare_ampersands.xgmml`                                                                                                                                                                   | 601                                           | LGPL-2.1                                                                                                                             | conformance, malformed                                                                                     | bare `&` in attribute values (expat: not well-formed, line 7 col 36); the repair option                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7   | empty.xgmml, empty_DTD.xgmml                                                                                | CI + `empty.xgmml`, CI + `empty_DTD.xgmml`                                                                                                                                                     | 148, 125                                      | LGPL-2.1                                                                                                                             | conformance                                                                                                | empty graph; a DOCTYPE with a dead SYSTEM URL (must not be fetched); no namespace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 8   | INVALID.xgmml                                                                                               | CI + `INVALID.xgmml`                                                                                                                                                                           | 11,534                                        | LGPL-2.1                                                                                                                             | conformance                                                                                                | no XGMML namespace (Cytoscape refuses), `cy:documentVersion="3.0"`, 3.x graphics with nested visual-property atts, an empty `__Annotations` list. 2 / 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 9   | group_2x_collapsed.xgmml, group_2x_expanded.xgmml                                                           | CI + those names                                                                                                                                                                               | 4,282, 5,361                                  | LGPL-2.1                                                                                                                             | conformance                                                                                                | 2.x metanode groups: node-nested graph, nested-graph atts, `xlink:href` members (expanded: +2 href), meta-edge, `cy:` graphics attributes. Collapsed 4 nodes / 3 edges; expanded 4 (+2 href) / 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 10  | nested_groups_283.xgmml                                                                                     | CI + `nested_groups_283.xgmml`                                                                                                                                                                 | 8,689                                         | LGPL-2.1                                                                                                                             | conformance                                                                                                | groups inside groups (3 graphs, element depth 9). 7 / 10                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 11  | galFiltered.xgmml                                                                                           | CI + `galFiltered.xgmml`                                                                                                                                                                       | 1,671,627                                     | LGPL-2.1                                                                                                                             | conformance (real-world, large)                                                                            | 2.x documentVersion 1.0: RDF metadata, non-numeric root id, no `directed` attribute, `att label=` + `name=`, 1,324 lists, `cytoscape*GraphicsAttributes`, edge ids equal to labels, single-quoted XML declaration, `ns1:` XLink prefix. 331 / 362                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 12  | t3.cys networks (M1, M2, M3, Module_Overview)                                                               | `https://raw.githubusercontent.com/cytoscape/cytoscape-impl/208c1015e565ac55f6a78c2a23aa8196a7cf28ae/io-impl/impl/src/test/resources/testData/NNFData/t3.cys` (zip; extract `*.xgmml`)         | 12,558 (zip); 1,430 to 3,365 each             | LGPL-2.1                                                                                                                             | conformance                                                                                                | 2.x session network files; `nested_network_id` pointers; `cy:editable`, `__layoutAlgorithm` hidden att. Module_Overview 4 / 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 13  | yeast_perturbation.xgmml                                                                                    | `https://raw.githubusercontent.com/leovan/xgmml/c3cfe0b8234e4f1b4b8bb3ecd9bdf12eb9ce0a75/data/tests/yeast_perturbation.xgmml`                                                                  | 3,676,296                                     | MIT (leovan/xgmml LICENSE). The network is the published Ideker et al. 2001 (Science 292:929) yeast data, which Cytoscape also ships | conformance AND graph-samples                                                                              | A modern Cytoscape 3.10 export with view: `cy:documentVersion="3.0"`, `cy:type` everywhere including Long, `cy:directed` on every edge, `cy:hidden`, `\n` escapes in a string, `&apos;`, full graphics with about 60 nested visual-property atts per node, `NETWORK_*` graph graphics. 330 / 359                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 14  | 20920_3-oxoacyl_c_20_full_ssn.xgmml (EFI-EST sequence similarity network)                                   | `https://raw.githubusercontent.com/allie-walker/Natural-product-function/7f86fbc26db47f741a641d5d23470b45bc9c87af/SSN/20920_3-oxoacyl_c_20_full_ssn.xgmml`                                     | 89,212                                        | MIT (repository LICENSE)                                                                                                             | conformance AND graph-samples                                                                              | A non-Cytoscape producer: no XML declaration, a comment before the root, no `directed` attribute (Cytoscape makes the edges directed; spec: undirected), string ids, edge ids `a,b`, single-element named lists, an att named `%id`. 105 / 221                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 15  | 20870_acyl_transferase_pfam_80_full_ssn.xgmml                                                               | `https://raw.githubusercontent.com/allie-walker/Natural-product-function/7f86fbc26db47f741a641d5d23470b45bc9c87af/SSN/20870_acyl_transferase_pfam_80_full_ssn.xgmml`                           | 25,844,159 (GitHub tree size; not downloaded) | MIT                                                                                                                                  | huge-file test (not committed: fetch by URL and SHA-256 in a slow lane, or a hosted graph-samples dataset) | streaming, memory, progress                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 16  | test.out.xgmml (NGSCheckMate)                                                                               | `https://raw.githubusercontent.com/parklab/NGSCheckMate/ef7a38c51dadbd4ef5b6b6db60775f239926f0a8/graph/test.out.xgmml`                                                                         | 6,271                                         | MIT (repository LICENSE)                                                                                                             | conformance                                                                                                | R-generated 2.x-style file (documentVersion 1.1 att); `node.*` and `edge.*` bypass atts; a self-loop; `cy:` graphics attributes; `cy:editable`. 3 / 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 17  | 3k6d_A_albe_PG.xml (VPLG protein-ligand graph)                                                              | `https://raw.githubusercontent.com/dfsp-spirit/vplg/aa8bf6d6692f4fd5d4606cf4a4c5d7c668b99987/bk/bk_protsim/Data/Raw/k6/3k6d/A/3k6d_A_albe_PG.xml`                                              | 1,662                                         | GPL-2.0-or-later (LICENSE text in repository root)                                                                                   | conformance (test-only)                                                                                    | `.xml` extension; `directed="0"` (Cytoscape overruled); string ids; labels in parentheses; graph atts. 7 / 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 18  | Cytoscape 3 session network files, subnetworks.cys (`networks/155-Set+1.xgmml`, `networks/207-Set+2.xgmml`) | `https://raw.githubusercontent.com/cytoscape/cytoscape-gui-distribution/547bf2a7280c4af0cac03eaf2cd7fec4bf552af4/integration-test/src/test/resources/testData/session3x/subnetworks.cys` (zip) | 441,059 (zip); 1,346 and 1,112                | Unclear: the repository has no LICENSE file; Cytoscape as a whole is LGPL-2.1                                                        | GENERATE instead: author equivalents of the same structure                                                 | Dialect D: root network, registered subnetworks, `xlink:href` node/edge references, cross-file `207-Set+2.xgmml#223`, a self-loop only in a subnetwork. Set 1: 7 graphs, 4 (+3 href) / 2 (+1 href)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 19  | nestedGroups_expanded.cys `networks/36-Network.xgmml`                                                       | `.../integration-test/src/test/resources/testData/session3x/nestedGroups_expanded.cys` (same repository and commit)                                                                            | 1,607                                         | Unclear (as 18)                                                                                                                      | GENERATE an equivalent                                                                                     | 3.x groups in a session: group networks with `cy:registered="0"`, multi-membership, meta-edges at root level only. 6 (+4 href) / 6 (+1 href)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 20  | simpleSession.cys `views/52-82-Na.xgmml`                                                                    | `.../integration-test/src/test/resources/testData/session3x/simpleSession.cys`                                                                                                                 | 3,210                                         | Unclear (as 18)                                                                                                                      | GENERATE an equivalent                                                                                     | Dialect E: `cy:view="1"`, `cy:nodeId`, `cy:edgeId`, `lockedVisualProperties` lists (the "view document" error and the position helper)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 21  | Draft examples D.1 to D.4                                                                                   | archived draft (section 1)                                                                                                                                                                     | under 2 KB each                               | The draft states no license                                                                                                          | GENERATE: re-author from the specification text (structure, not copied prose)                              | no namespace; DOCTYPE PUBLIC and SYSTEM; lowercase `graphic`; `Layout`, `Rootnode`; node and edge `weight`; self-loop and parallel edges (D.3); node-nested subgraphs with cross-level edges at the root (D.4); `<graphics type="rhombus" x= y=>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 22  | Authored malformed and edge cases (generate)                                                                | none                                                                                                                                                                                           | tiny                                          | none needed (written for this suite)                                                                                                 | conformance, malformed                                                                                     | truncated file; UTF-16 BOM; Latin-1 declared and undeclared; surrogate char refs `&#xd83d;&#xde00;`; `&#x1;`; billion laughs; `SYSTEM "file:///etc/passwd"`; unknown element wrapping a node; node without id and label; duplicate node id; duplicate edge id; dangling endpoint; missing `target`; unresolved and cross-file `xlink:href`; integer `2147483648` without `cy:type`; real `1e400`, `NaN`, `-Infinity`; `integer="abc"`; boolean `"yes"`/`"2"`; `directed="true"`; `cy:documentVersion="3.x"`; list with mixed child types; record list (named children); list of lists; att with RDF inside a node; `cy:equation`; string with literal `\n`; `<center>` and `<Line><point>` graphics; two `graphics`; XGMML embedded in XHTML with `xgmml:` prefix; root `cy:view="1"` |
| 23  | Generated by Cytoscape (round-trip set)                                                                     | none: produced by the oracle run                                                                                                                                                               | small                                         | the inputs' licenses                                                                                                                 | conformance                                                                                                | export each graph-io-written XGMML from Cytoscape 3.10.5 (`POST /v1/commands/network/export`, `options=XGMML`) and re-import. This checks that graph-io's exporter output is accepted by Cytoscape and that Cytoscape's re-export is read back equal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Proposed for graph-samples:

- #13 yeast_perturbation: an MIT copy of the canonical Cytoscape demo network, with real
  expression columns and a layout;
- #14 EFI-EST SSN (MIT), the small one;
- #15 as a hosted dataset if a large similarity network is wanted.

Their NOTICE entries need the repository license plus the data citation:

- Ideker T. et al., Science 292:929-934 (2001);
- the EFI-EST tool: Zallot R., Oberg N., Gerlt J.A., Biochemistry 58:4169-4182 (2019).

Excluded:

- informationsea/networkxxgmml examples (`yeast-ppi.xgmml`, `mirtarbase-sample.xgmml`): the
  repository has no license;
- sciBASIC `net.xgmml`: GPL-3.0, and adds nothing new;
- the EnzymeFunctionInitiative/EST repository's own files: GPL-3.0, test-only at most, and
  #14/#15 already cover that producer.

---

## 8. Summary of decisions this note recommends

- Accept every dialect (A to D) with one reader. Reject E (view documents) on their own and expose
  their positions to the `.cys` importer.
- Direction: spec first (root `directed`, default 0), then `cy:directed` per edge. Cytoscape is
  overruled on this.
- Ids are strings; never collapse numeric spellings.
- Flatten nested graphs into one snapshot:
    - node-nested graphs give `parent` (and `parents` for `xlink:href` multi-membership);
    - root-level subnetworks give a membership list, except in session-network documents, where
      `import()` is the base network and `importAll()` is the registered subnetworks.
- Typed atts map to exact dtypes, using `cy:type` when present. Lists become `list` columns; records
  and lists of lists become `json`. Hidden and equation markers survive in column metadata.
- Graphics: x/y/z go to `position`, and everything else goes to a `graphics` json column. Values
  are never converted.
- XML hardening is inherited from the shared tokenizer. Bare ampersands and surrogate references
  are fatal unless an explicit lenient option is set, which warns per repair.
- Oracle: Cytoscape 3.10.5 headless through cyREST, generated offline and committed, with
  `cytoscapeDisagrees` where the specification wins. Hand-written spec expectations cover files
  Cytoscape cannot read.
