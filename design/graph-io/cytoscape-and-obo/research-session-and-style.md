# Cytoscape session files (.cys) and style files (vizmap XML): format research

Research for adding Cytoscape session and style support to graph-io. It covers what the formats
are, every variant a reader meets from Cytoscape 2.x to 3.10.5, every error and edge case, how
each construct maps onto graph-io's snapshot model, which sample files to test against and which
reader should supply the expected results.

Everything below was checked against the source code of Cytoscape's own readers and against real
files downloaded into `tmp/samples-session-and-style/` (2026-10-02). Statements about a file's
contents come from opening it, not from documentation.

## 1. Authoritative sources

There is no written specification of either format. The Cytoscape manual describes sessions and
styles only from the user's side. The normative definition is the reader code in `cytoscape-impl`
(LGPL-2.1) plus three XML schemas in the same repository; the schemas are NOT a reliable
contract, because Cytoscape reads them with JAXB without validation and every real style file
fails them (section 4.6).

| Source                                   | URL                                                                                                                                                                                                                                                                                                                                                       | What it defines                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Cy3 session reader                       | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/session/Cy3SessionReaderImpl.java                                                                                                                                                                                                      | 3.x zip layout, entry-name patterns, two-pass read, table merge, virtual columns, equations, view extraction              |
| Cy2 session reader                       | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/session/Cy2SessionReaderImpl.java                                                                                                                                                                                                      | 2.x layout: cysession.xml, one XGMML per network, network tree walk, selection and hidden state                           |
| Shared session reader                    | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/session/AbstractSessionReader.java                                                                                                                                                                                                     | zip walk (`java.util.zip.ZipInputStream`), per-entry error handling, `__parentNetwork.SUID`                               |
| Version detection                        | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/session/SessionFileFilter.java                                                                                                                                                                                                         | `<root>/<x.y.z>.version` entry; absent means 2.0.0                                                                        |
| Session constants and name escaping      | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/util/session/SessionUtil.java                                                                                                                                                                                                               | folder and file names, URL-encoding of entry names                                                                        |
| Table (.cytable) reader                  | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/datatable/CSVCyReader.java                                                                                                                                                                                                             | CyCSV header versions 0 and 1, column types, list cells, equations                                                        |
| Style serializer                         | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/util/vizmap/VisualStyleSerializer.java                                                                                                                                                                                                      | vizmap XML to and from styles; table column styles (3.9+) and their ids (3.10+)                                           |
| 2.x style converter                      | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/util/vizmap/CalculatorConverter.java                                                                                                                                                                                                        | 2.x `vizmap.props` calculators to 3.x mappings                                                                            |
| vizmap.xsd                               | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/resources/xsd/vizmap.xsd                                                                                                                                                                                                                                                   | style XML structure (see 4.6 for where real files depart)                                                                 |
| cysession.xsd                            | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/resources/xsd/cysession.xsd                                                                                                                                                                                                                                                | 2.x `cysession.xml`                                                                                                       |
| cytables.xsd                             | https://github.com/cytoscape/cytoscape-impl/blob/develop/io-impl/impl/src/main/resources/xsd/cytables.xsd                                                                                                                                                                                                                                                 | 3.x `tables/cytables.xml` (virtual columns, table views)                                                                  |
| sessionState.xsd, networkList.xsd        | https://github.com/cytoscape/cytoscape-impl/tree/develop/swing-application-impl/src/main/resources/xsd                                                                                                                                                                                                                                                    | desktop state (UI only)                                                                                                   |
| XGMML reader handlers                    | https://github.com/cytoscape/cytoscape-impl/tree/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/xgmml/handler                                                                                                                                                                                                                          | session flavor of XGMML: `cy:registered`, `xlink:href`, `cy:nodeId`, `lockedVisualProperties`, edge `cy:directed` default |
| Visual lexicon                           | https://github.com/cytoscape/cytoscape-api/blob/develop/presentation-api/src/main/java/org/cytoscape/view/presentation/property/BasicVisualLexicon.java and https://github.com/cytoscape/cytoscape-impl/blob/develop/ding-impl/ding-presentation-impl/src/main/java/org/cytoscape/ding/DVisualLexicon.java                                                | every visual property id, type, default and range                                                                         |
| Table lexicon                            | https://github.com/cytoscape/cytoscape-api/blob/develop/presentation-api/src/main/java/org/cytoscape/view/presentation/property/table/BasicTableVisualLexicon.java                                                                                                                                                                                        | `CELL_*`, `COLUMN_*`, `TABLE_*` ids (3.9+)                                                                                |
| Value parsers                            | https://github.com/cytoscape/cytoscape-api/tree/develop/presentation-api/src/main/java/org/cytoscape/view/presentation/property (Paint, Font, NodeShape, LineType, ArrowShape, EdgeBend, ObjectPosition); https://github.com/cytoscape/cytoscape-impl/blob/develop/ding-impl/ding-presentation-impl/src/main/java/org/cytoscape/ding/impl/HandleImpl.java | lexical forms of style values                                                                                             |
| Session loading tests (expected results) | https://github.com/cytoscape/cytoscape-gui-distribution/tree/develop/integration-test/src/test/java/org/cytoscape/session                                                                                                                                                                                                                                 | counts, selection, styles and mappings Cytoscape must produce for 11 sessions                                             |
| Cytoscape manual (CC0)                   | https://github.com/cytoscape/cytoscape-manual/blob/master/docs/Styles.md, .../Export_Your_Data.md, .../Nested_Networks.md                                                                                                                                                                                                                                 | user-level semantics of styles, mappings, bypasses, nested networks, groups                                               |
| ZIP                                      | https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT                                                                                                                                                                                                                                                                                               | container: local headers, data descriptors, central directory, zip64, encryption flags                                    |
| Compression Streams                      | https://github.com/whatwg/compression/blob/main/index.bs; https://nodejs.org/api/webstreams.html; https://github.com/mdn/browser-compat-data/blob/main/api/DecompressionStream.json                                                                                                                                                                       | `DecompressionStream("deflate-raw")` behavior and availability                                                            |
| Java properties                          | https://docs.oracle.com/javase/8/docs/api/java/util/Properties.html#load-java.io.InputStream-                                                                                                                                                                                                                                                             | 2.x `vizmap.props` / `session_cytoscape.props` syntax (ISO-8859-1, `\uXXXX`, backslash escapes)                           |
| CyREST                                   | https://github.com/cytoscape/cyREST (MIT)                                                                                                                                                                                                                                                                                                                 | the oracle's interface (section 8)                                                                                        |

The official docs confirm the gap: the 2.6 manual (https://cytoscape.org/manual/Cytoscape2_6Manual.html)
mentions sessions only in passing, and the current manual (https://github.com/cytoscape/cytoscape-manual)
documents style export but no file layout. The manual's Styles.md calls the session style entry
`session_syle.xml` (sic); the real entry is `session_vizmap.xml`.

## 2. What a session is

A `.cys` file is a ZIP archive written by Java's `ZipOutputStream`. Everything lives under one
top-level folder named `CytoscapeSession-<yyyy_MM_dd-HH_mm>/` (the name is arbitrary; readers
match `.*/` before every pattern). It holds every network of the Cytoscape desktop at save time,
their attribute tables, their views (node positions and per-element style overrides), all visual
styles, properties, and opaque app state.

### 2.1 Version history

The version marker is an empty entry `<root>/<x.y.z>.version`. Every 3.x release from 3.0.0 to
3.10.5 still writes `3.0.0.version` (`SessionUtil.CYS_VERSION`), so the marker separates only 2.x
from 3.x; finer versioning comes from the documents inside. A session with no `.version` entry is
read as 2.0.0 (`SessionFileFilter.DEFAULT_VERSION`).

| Era                                       | Marker                                                 | Layout                                                                                                                                                                                                                                                                                                                                          | Seen in                                                                      |
| ----------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 2.3 to 2.8.3                              | no `.version`; `cysession.xml` `documentVersion="0.9"` | `<root>/cysession.xml`, `<root>/<network>.xgmml` (one per network, attributes and view graphics inline; XGMML `documentVersion` att 1.0 in 2.5.2, 1.1 in 2.6.3 to 2.8.3), `session_vizmap.props`, `session_cytoscape.props`, `session_bookmarks.xml`, `plugins/<Plugin>/...`, `images/` (2.8 custom graphics)                                   | v252Session, v263SessionLarge, v270session, v283Groups, v283Session1, t3, t4 |
| 3.0 pre-release (2011 development builds) | no `.version`; `cysession.xml` `documentVersion="3.0"` | flat `USER-`, `HIDDEN-`, `VIEW-` cytables, `cytable.metadata`, `session_vizmap.xml`. A current Cytoscape reads it as 2.x and fails.                                                                                                                                                                                                             | test_session1.cys                                                            |
| 3.0.0 (2013) and later                    | `3.0.0.version`                                        | `networks/<SUID>-<name>.xgmml` (model only), `views/<netSUID>-<viewSUID>-<title>.xgmml`, `tables/<netSUID>-<netName>/<NAMESPACE>-<class>-<title>.cytable`, `tables/global/<SUID>-<title>.cytable`, `tables/cytables.xml`, `session_vizmap.xml` (`documentVersion="3.0"`), `properties/*.props` and `session_bookmarks.xml`, `apps/<app-id>/...` | goTrees, LUAD_vest_v2, simpleSession, subnetworks, groups                    |
| 3.0 (2012 builds)                         | `3.0.0.version`                                        | cytables without the `"CyCSV-Version","1"` line (schema version 0)                                                                                                                                                                                                                                                                              | groups.cys                                                                   |
| up to 3.3                                 |                                                        | network column `Cy2 Parent Network.SUID` in the local table; moved to hidden `__parentNetwork.SUID` on read                                                                                                                                                                                                                                     | reader comment, `moveParentNetworkColumn()`                                  |
| 3.8 (commit 2019-05-22)                   |                                                        | `apps/org.cytoscape.swing-application/session_state.xml` `documentVersion="1.1"` adds `panelStateInternal`                                                                                                                                                                                                                                      | galFiltered.cys                                                              |
| 3.9 (commits 2020-10 to 2021-03)          |                                                        | `session_vizmap.xml` `documentVersion="3.1"` with `<tableColumnStyle>`; `cytables.xml` `<tableViews>` with column and row bypasses; custom-graphics class renamed `org.cytoscape.ding.customgraphics.*` to `org.cytoscape.cg.model.*`; `session_thumbnail.png`; view XGMML `cy:rendererId`                                                      | galFiltered.cys (2022), google/xls style                                     |
| 3.10 (commit 2022-06-13)                  |                                                        | `<tableColumnStyle id=".." associated="true">` and `<columnStyleAssociation>` (the serializer says "The id field was introduced in cytoscape 3.10")                                                                                                                                                                                             | galFiltered.cys                                                              |
| 3.10.5                                    | released 2026-09-29                                    | no format change found                                                                                                                                                                                                                                                                                                                          | https://github.com/cytoscape/cytoscape/releases                              |

Dates for the XSD changes come from the commit history of the three XSDs
(`gh api repos/cytoscape/cytoscape-impl/commits?path=...`).

### 2.2 Entry inventory (3.x)

Name parts are escaped with `URLEncoder.encode(text, "UTF-8").replace("-", "%2D")`, so a space is
`+`, `-` inside a name is `%2D`, and a raw `-` is a field separator. Readers unescape with
`URLDecoder` (which also turns `+` back into a space).

| Entry                                                     | Pattern (reader)                                         | Content                                                                                                                                                                                                                                                                                               | Graph data?                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `<root>/3.0.0.version`                                    | ends with `.version`, not under `apps/`                  | empty                                                                                                                                                                                                                                                                                                 | marker                                                                                                |
| `networks/<SUID>-<name>.xgmml`                            | `.*/networks/(([^/]+)[.]xgmml)`, name `(\d+)(-(.+))?`    | XGMML of one ROOT network (a "network collection"): its subnetworks are `<att><graph cy:registered="1">` children; nodes and edges carry ids that are the saved SUIDs; no attributes                                                                                                                  | YES: topology, membership, direction, groups, nested-network pointers                                 |
| `views/<netSUID>-<viewSUID>-<title>.xgmml`                | `.*/views/(([^/]+)[.]xgmml)`, name `(\d+)-(\d+)(-(.+))?` | XGMML of one view: `cy:networkId` (the subnetwork SUID), `cy:visualStyle` (style name), network-level `<graphics><att name="NETWORK_*">`, per node `<graphics x y z>` and `cy:nodeId`, optional `<att name="lockedVisualProperties" type="list">` bypasses; edges appear only when they have bypasses | positions YES; the rest is presentation                                                               |
| `tables/<netSUID>-<netName>/<NS>-<class>-<title>.cytable` | `.*/(([^/]+)/([^/]+)-([^/]+)-([^/]+)[.]cytable)`         | CyCSV table; `NS` is `LOCAL_ATTRS`, `SHARED_ATTRS`, `HIDDEN` (or an app namespace such as `MYAPP`, `org.baderlab.autoannotate.cluster`); `class` is `org.cytoscape.model.CyNode`, `CyEdge` or `CyNetwork`                                                                                             | YES: all attributes                                                                                   |
| `tables/global/<SUID>-<title>.cytable`                    | `.*/(global/(\d+)-([^/]+)[.]cytable)`                    | unassigned tables (apps; e.g. EnrichmentMap model JSON)                                                                                                                                                                                                                                               | no (opaque)                                                                                           |
| `tables/cytables.xml`                                     | ends with `cytables.xml`                                 | virtual columns (`SHARED_ATTRS` columns joined into `LOCAL_ATTRS`), table views (3.9+)                                                                                                                                                                                                                | the virtual-column joins matter for data                                                              |
| `session_vizmap.xml`                                      | ends with `vizmap.xml`                                   | all visual styles (section 4)                                                                                                                                                                                                                                                                         | presentation                                                                                          |
| `properties/*.props`, `properties/session_bookmarks.xml`  | `.*/properties/...`                                      | Java properties, bookmarks                                                                                                                                                                                                                                                                            | no                                                                                                    |
| `apps/<app>/...`                                          | contains `/apps/`                                        | opaque per-app files (filters JSON, table browser props, `session_state.xml`, `network_list.xml`, custom-graphics PNGs and `image_metadata.props`)                                                                                                                                                    | `network_list.xml` gives the panel order of networks; `customgraphicsmgr` images back custom graphics |
| `session_thumbnail.png`                                   |                                                          | thumbnail (3.9+)                                                                                                                                                                                                                                                                                      | no                                                                                                    |
| anything else                                             |                                                          | Cytoscape logs "Unknown entry found in session zip file!" and continues                                                                                                                                                                                                                               | no                                                                                                    |

The reader runs two passes over the zip: networks, tables, styles and properties first; views and
table views second, because a view needs its network.

### 2.3 Entry inventory (2.x)

| Entry                                              | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cysession.xml`                                    | `<cysession>`: `sessionNote`, `sessionState` (desktop frames, cytopanels, plugin list), `networkTree` of `<network id filename viewAvailable visualStyle>` with `<parent>`, `<child>`, `selectedNodes`, `hiddenNodes`, `selectedEdges`, `hiddenEdges`. The tree root is `Network Root` with `filename="Network Root.xgmml"`, a file that never exists. Missing `cysession.xml` is fatal (`FileNotFoundException`).                                                                                                                    |
| `<name>.xgmml`                                     | one per network, full XGMML: graph-level `att`s (`backgroundColor`, `GRAPH_VIEW_ZOOM`, `GRAPH_VIEW_CENTER_X/Y`, `__layoutAlgorithm` with `cy:hidden`, `networkMetadata` RDF), node and edge `att`s with types `string`, `integer`, `real`, `boolean`, `list`, `map`, plus `<graphics type h w x y fill width outline ...>`. Node ids are negative integers from the 2.x root graph; `label` is the node name; edges may lack ids. Nested networks: node att `nested_network_id`. Groups: nested graphs and `__groupState` style atts. |
| `session_vizmap.props`                             | 2.x styles as Java properties (section 4.5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `session_cytoscape.props`, `session_bookmarks.xml` | properties, bookmarks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `plugins/<Plugin>/<file>`                          | opaque plugin state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `images/image_metadata.props`, `images/*`          | 2.8 custom graphics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

In 2.x, a node is the same object in every network that contains it (identity is the node name).
In 3.x, identity is the root-network SUID: every subnetwork of one collection shares nodes, and
two collections never share nodes.

### 2.4 The table format (.cytable, "CyCSV")

CSV read with opencsv, separator `,`, quote `"`, no escape character (a quote inside a field is
doubled; a backslash is literal), UTF-8. Layout:

```
"CyCSV-Version","1"                         (absent in schema version 0)
"SUID","name","selected","score"            column names; column 0 is the primary key
"java.lang.Long","java.lang.String","java.lang.Boolean","java.lang.Double"
"","","","mutable"                          column options (version 1 only; v0 makes all but the key mutable)
"52 default node",""                        table title, then table options ("public", "mutable", comma separated)
"64","Node 1","true","1.5"                  one row per element, keyed by the SAVED SUID
```

- Types: `java.lang.String`, `java.lang.Long`, `java.lang.Integer`, `java.lang.Double`,
  `java.lang.Boolean`, `java.util.List<T>` with one of those `T`. Any other class name goes through
  `Class.forName` and `valueOf(String)`; an unknown class aborts the table.
- An unknown `CyCSV-Version` (not 0 or 1) throws `Unsupported CyCSV version`.
- Empty cell: `null` for every type EXCEPT `String`, where it is the empty string.
- List cell: items separated by a newline inside one quoted cell. `""` in a `List<String>` column
  yields a one-item list holding `""`; in `List<Long>` it yields `null`.
- A cell that does not parse (`"abc"` in a `Long` column, an `Integer` above 2^31) is silently
  `null` (`catch (Exception e) { return null; }`). `Boolean.valueOf` makes every value except a
  case-insensitive `true` into `false`.
- Equations: a cell starting with `=` (`"=ABS(${shared\ name})"`, visualMappings.cys) is compiled
  by Cytoscape's equation engine; only the formula is stored, never its value.
- String cells may contain raw newlines (galFiltered.cys: the `publication` cell spans two lines).
- Namespaces: `LOCAL_ATTRS` (per subnetwork), `SHARED_ATTRS` (per root network, keyed by the
  root SUID of the element, shared by every subnetwork), `HIDDEN` (internal: `__isGroup`,
  `__groupNetworks.SUID`, `__groupCollapsed.SUID`, `__externalEdges.SUID`, `__xLocation`,
  `__yLocation`, `__parentNetwork.SUID`, `layoutAlgorithm`), and app namespaces.
- `cytables.xml` `virtualColumn` entries join a `SHARED_ATTRS` column into a `LOCAL_ATTRS` table
  (`sourceJoinKey`/`targetJoinKey` are `SUID`). The `shared name` and `shared interaction`
  columns arrive this way. Circular or missing sources make Cytoscape throw.

## 3. Session flavor of XGMML (what the network and view files hold)

The generic XGMML research covers the dialect; the session-specific parts are:

- `cy:documentVersion="3.0"` on the root `<graph>`; 2.x files carry `<att name="documentVersion" value="1.1"/>`.
- Root network file: `<graph id=ROOT cy:registered="0">`, subnetworks as `<att><graph id=SUB cy:registered="1">`. Nodes and edges are DEFINED once (with `id`) in whichever graph comes first, and REFERENCED elsewhere as `<node xlink:href="#id"/>` / `<edge xlink:href="#id"/>`.
- Cross-file references: `xlink:href="155-Set+1.xgmml#171"` points into another network entry of the same session (subnetworks.cys). The target may come later in the zip.
- Edges defined at root level only (`<edge id=820 label="meta-null">` outside every subnetwork, groups.cys) belong to the root network and to no visible network.
- Nested-network pointer: `<node><att><graph xlink:href="#237"/></att></node>`; pointers may form cycles (Node 1 in Na points to Nb, Node 6 in Nb points to Na).
- Group: `<node><att><graph id=G cy:registered="0">...members...</graph></att></node>`, nested to any depth; collapsed state and member positions live in `HIDDEN` tables.
- Edge direction: `cy:directed="1"` / `"0"` per edge; when absent, the graph-level `directed` attribute; when that is absent, directed (`ReadDataManager.currentNetworkIsDirected = true`). One subnetwork can mix both.
- View file: `<node id=VIEWSUID cy:nodeId=MODELSUID><graphics x y z>`; `z` is `NODE_Z_LOCATION` (0 in every sample). Coordinates are screen coordinates (y grows downward).
- Bypasses: `<att name="lockedVisualProperties" type="list"><att name="NODE_SHAPE" value="TRIANGLE" type="string"/>...`, values in the lexical forms of section 4.3. From 3.9, `att` elements may also carry `cy:type="String"`.
- 2.x bypasses are graph atts named `node.fillColor`-style keys or `<graphics>` attributes; 2.x `lockedVisualProperties` exist in 2.8 sessions (v283Groups: locked `NODE_SHAPE`, `NODE_TRANSPARENCY`, `EDGE_LINE_TYPE`).

## 4. Style files (vizmap XML) and session styles

### 4.1 Where styles appear

- 3.x session: `session_vizmap.xml`, every style in the session (15 to 26 in the samples).
- Standalone style file: **File -> Export -> Styles to File...**, same `<vizmap>` document.
- `default_vizmap.xml` in `CytoscapeConfiguration` (user default styles) and the built-in copy
  in `vizmap-gui-impl/src/main/resources/default_vizmap.xml`.
- 2.x: `session_vizmap.props` / `vizmap.props` (section 4.5).
- Cytoscape can also export styles as Cytoscape.js style JSON (manual, Export_Your_Data.md). That
  is a different format: an array of `{title, style:[{selector, css}]}`; it belongs with the
  Cytoscape.js JSON dialect, not here.
- CX and CX2 (NDEx) carry the same visual property ids and value strings in their visual
  properties aspect, so the value parsers of 4.3 are shared code with the CX importers.

### 4.2 Document structure

```xml
<vizmap id="VizMap-2022_09_15-11_54" documentVersion="3.1">
  <visualStyle name="galFiltered Style">
    <network> <dependency name=".." value="true"/>* <visualProperty name="NETWORK_*" default=".."/>* </network>
    <node>    <dependency .../>* <visualProperty name="NODE_*" default="..">[mapping]</visualProperty>* </node>
    <edge>    <dependency .../>* <visualProperty name="EDGE_*" default="..">[mapping]</visualProperty>* </edge>
  </visualStyle>*
  <tableColumnStyle name="<uuid>" id="1" associated="true">   (3.9+; id and associated 3.10+)
    <cell> <dependency/>* <visualProperty name="CELL_*" default=".."/>* </cell>
  </tableColumnStyle>*
  <columnStyleAssociation networkStyleName=".." tableColumnStyleId="2" tableType="CyNode" columnName="shared name"/>*  (3.10+)
</vizmap>
```

Mappings (at most one per `visualProperty`):

- `<passthroughMapping attributeName="name" attributeType="string"/>`: value of the column, parsed as the property's type.
- `<discreteMapping attributeName attributeType><discreteMappingEntry attributeValue="pp" value="#FFFFFF"/>*`: lookup by the column value's string form; no match means the default. Booleans are keyed `true`/`false`; numbers by their Java `toString` (`1.0` is not `1`).
- `<continuousMapping attributeName attributeType><continuousMappingPoint attrValue lesserValue equalValue greaterValue/>*`: breakpoints sorted by `attrValue` (an `xs:decimal`); below the first point the first point's `lesserValue`, above the last the last's `greaterValue`; between points numeric properties interpolate linearly and colors interpolate in RGB; non-numeric properties (shapes, fonts) step. Equal `attrValue`s and single points occur in real files.
- `attributeType` is one of `string`, `boolean`, `integer`, `long`, `float`, `list` (the column type, not the property type). `float` covers Double columns.

Dependencies (`name` values seen): `nodeSizeLocked` (NODE_SIZE drives width and height),
`arrowColorMatchesEdge`, `nodeCustomGraphicsSizeSync`. Duplicate `dependency` elements occur
(default_vizmap.xml repeats both node dependencies).

### 4.3 Visual properties and value formats

Network: `NETWORK_BACKGROUND_PAINT`, `NETWORK_CENTER_X/Y/Z_LOCATION`, `NETWORK_SCALE_FACTOR`,
`NETWORK_WIDTH`, `NETWORK_HEIGHT`, `NETWORK_SIZE`, `NETWORK_DEPTH`, `NETWORK_TITLE`,
`NETWORK_NODE_SELECTION`, `NETWORK_EDGE_SELECTION`, `NETWORK_NODE_LABEL_SELECTION`,
`NETWORK_ANNOTATION_SELECTION`, `NETWORK_FORCE_HIGH_DETAIL`.

Node: `NODE_FILL_COLOR`, `NODE_PAINT`, `NODE_SELECTED_PAINT`, `NODE_BORDER_PAINT`,
`NODE_BORDER_WIDTH`, `NODE_BORDER_STROKE` (the id of "border line type"), `NODE_BORDER_TRANSPARENCY`,
`NODE_TRANSPARENCY`, `NODE_SHAPE`, `NODE_SIZE`, `NODE_WIDTH`, `NODE_HEIGHT`, `NODE_DEPTH`,
`NODE_X_LOCATION`, `NODE_Y_LOCATION`, `NODE_Z_LOCATION`, `NODE_VISIBLE`, `NODE_SELECTED`,
`NODE_LABEL`, `NODE_LABEL_COLOR`, `NODE_LABEL_FONT_FACE`, `NODE_LABEL_FONT_SIZE`,
`NODE_LABEL_TRANSPARENCY`, `NODE_LABEL_POSITION`, `NODE_LABEL_WIDTH`, `NODE_LABEL_ROTATION`,
`NODE_LABEL_BACKGROUND_COLOR`, `NODE_LABEL_BACKGROUND_SHAPE`, `NODE_LABEL_BACKGROUND_TRANSPARENCY`,
`NODE_TOOLTIP`, `NODE_NESTED_NETWORK_IMAGE_VISIBLE`, `COMPOUND_NODE_SHAPE`, `COMPOUND_NODE_PADDING`,
`NODE_CUSTOMGRAPHICS_1..9`, `NODE_CUSTOMGRAPHICS_POSITION_1..9`, `NODE_CUSTOMGRAPHICS_SIZE_1..9`,
`NODE_CUSTOMPAINT_1..9`.

Edge: `EDGE_PAINT`, `EDGE_UNSELECTED_PAINT`, `EDGE_SELECTED_PAINT`, `EDGE_STROKE_UNSELECTED_PAINT`,
`EDGE_STROKE_SELECTED_PAINT`, `EDGE_WIDTH`, `EDGE_LINE_TYPE`, `EDGE_TRANSPARENCY`,
`EDGE_SOURCE_ARROW_SHAPE`, `EDGE_TARGET_ARROW_SHAPE`, `EDGE_SOURCE_ARROW_SIZE`,
`EDGE_TARGET_ARROW_SIZE`, `EDGE_SOURCE/TARGET_ARROW_SELECTED_PAINT`,
`EDGE_SOURCE/TARGET_ARROW_UNSELECTED_PAINT`, `EDGE_LABEL`, `EDGE_LABEL_COLOR`,
`EDGE_LABEL_FONT_FACE`, `EDGE_LABEL_FONT_SIZE`, `EDGE_LABEL_TRANSPARENCY`, `EDGE_LABEL_POSITION`,
`EDGE_LABEL_WIDTH`, `EDGE_LABEL_ROTATION`, `EDGE_LABEL_AUTOROTATE`, `EDGE_LABEL_BACKGROUND_*`,
`EDGE_TOOLTIP`, `EDGE_VISIBLE`, `EDGE_SELECTED`, `EDGE_BEND`, `EDGE_CURVED`, `EDGE_STACKING`,
`EDGE_STACKING_DENSITY`, `EDGE_Z_ORDER`.

Table cells (3.9+): `CELL_BACKGROUND_PAINT`, `CELL_FONT_FACE`, `CELL_FONT_SIZE`, `CELL_TEXT_COLOR`,
`CELL_TOOLTIP`, `CELL_CUSTOMGRAPHICS` (in files, not in `BasicTableVisualLexicon`), `COLUMN_*`,
`ROW_*`, `TABLE_*`.

Lexical forms (from the parsers):

| Type             | Forms accepted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Paint            | `#RRGGBB` (case-insensitive, `Color.decode`, so also `0xRRGGBB` and decimal), `r,g,b`, `rgb(r,g,b)`, CSS/X11 color names via `cross_browser_color_code.txt`; anything else is `null` with an error log. No alpha: opacity is a separate 0..255 `*_TRANSPARENCY` property                                                                                                                                                                                                                             |
| Double / Integer | Java `Double.valueOf` / `Integer.valueOf`; ranges per property (sizes > 0, transparency 0..255, font size >= 1, rotation an angle)                                                                                                                                                                                                                                                                                                                                                                   |
| Boolean          | `Boolean.valueOf`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Font             | `Name,style,size` (`SansSerif,plain,12`, `SansSerif.plain,plain,10`, `Dialog.bold,bold,12`) or the 2.x form `Name-style-size`; style is bold when the name part ends `.bold`                                                                                                                                                                                                                                                                                                                         |
| NodeShape        | `RECTANGLE ROUND_RECTANGLE TRIANGLE PARALLELOGRAM DIAMOND ELLIPSE HEXAGON OCTAGON` plus `VEE` (added by the Ding renderer), case-insensitive                                                                                                                                                                                                                                                                                                                                                         |
| LineType         | `SOLID LONG_DASH EQUAL_DASH DASH_DOT DOT` plus renderer types (`ZIGZAG SINEWAVE VERTICAL_SLASH FORWARD_SLASH BACKWARD_SLASH PARALLEL_LINES CONTIGUOUS_ARROW SEPARATE_ARROW MARQUEE_DASH MARQUEE_EQUAL MARQUEE_DASH_DOT`)                                                                                                                                                                                                                                                                             |
| ArrowShape       | `NONE DIAMOND OPEN_DIAMOND DELTA OPEN_DELTA CROSS_DELTA CROSS_OPEN_DELTA ARROW T CIRCLE OPEN_CIRCLE HALF_CIRCLE OPEN_HALF_CIRCLE SQUARE OPEN_SQUARE HALF_TOP HALF_BOTTOM DELTA_SHORT_1 DELTA_SHORT_2 ARROW_SHORT DIAMOND_SHORT_1 DIAMOND_SHORT_2`                                                                                                                                                                                                                                                    |
| ObjectPosition   | `target,anchor,justify,offsetX,offsetY` e.g. `C,C,c,0.00,0.00` (positions N NE E SE S SW W NW C, justify l c r); invalid text silently becomes the default                                                                                                                                                                                                                                                                                                                                           |
| EdgeBend         | handles separated by `                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `, each `cos,sin,ratio`(3.x) or`x,y` (2.x, converted); empty means straight |
| Custom graphics  | `org.cytoscape.ding.customgraphics.NullCustomGraphics,0,[ Remove Graphics ],` (pre-3.9), `org.cytoscape.cg.model.NullCustomGraphics,...` (3.9+), image references by id into `apps/org.cytoscape.ding.customgraphicsmgr/`, or `org.cytoscape.BarChart:{json}`, `PieChart`, `LineChart`, `HeatMapChart`, `RingChart`, `BoxChart`, `org.cytoscape.LinearGradient:{json}`, `RadialGradient`, with JSON keys `cy_range`, `cy_colors`, `cy_dataColumns`, `cy_gradientFractions`, `cy_gradientColors`, ... |

An unknown visual property name is skipped (`lexicon.lookup` returns null); in views, unknown
bypasses are kept by `UnrecognizedVisualPropertyManager` for round trips.

### 4.4 What a style reader can and cannot recover

Recoverable exactly: style names, defaults per property, mapping kind, mapped column and its type,
discrete tables, continuous breakpoints, dependencies, table column styles and associations.

Not recoverable without Cytoscape's renderer: the computed value of a property on a given element
(needs the style evaluated against the tables plus bypasses plus dependencies), the rendered size
of custom graphics and charts, fonts the reader does not have, gradient geometry, label layout.

### 4.5 Cytoscape 2.x style format (vizmap.props)

Java properties (ISO-8859-1, `\uXXXX`, `\ ` escapes a space in a key, `#`/`!` comments,
continuation lines). Keys:

- `<calc>Calculator.<calcName>.mapping.type` = `DiscreteMapping` | `ContinuousMapping` | `PassThroughMapping`
- `...mapping.controller` = column name (`ID` means `name`); `...mapping.controllerType` = `-1` undefined, `-2` list, `1` boolean, `2` floating point, `3` integer, `4` string
- discrete: `...mapping.map.<key>=<value>`; continuous: `...mapping.boundaryvalues=N`, `...mapping.bvI.domainvalue`, `.lesser`, `.equal`, `.greater`, `...mapping.interpolator`
- per style: `nodeAppearanceCalculator.<style>.<calcType>=<calcName>`, `nodeAppearanceCalculator.<style>.default<Prop>=<value>`, `edgeAppearanceCalculator...`, `globalAppearanceCalculator.<style>.defaultBackgroundColor`, `nodeSizeLocked`
- values: colors `r,g,b`; line styles `LINE`, `DASHED`, `LINE_1`..`LINE_7` widths; arrows `WHITE_DELTA`, `BLACK_ARROW` (color and shape fused); fonts `Name,style,size`; `has_nested_network` is a `yes`/`no` string coerced to boolean

### 4.6 The XSDs are not the contract

Validation of every downloaded style file against `vizmap.xsd` with lxml (script
`tmp/samples-session-and-style/tools/xsdcheck.py`): all 16 fail, all `cytables.xml` pass. The
schema says every `<network>`, `<node>` and `<edge>` needs at least one `<dependency>`, every
mapping at least one entry or point, every `<vizmap>` at least one `<tableColumnStyle>`, style names
are `NCName` and `columnStyleAssociation` needs `tableColumnStyleName`. Real files violate all of
these (`<network>` never has dependencies; `default black`, `Big Labels`, `SCENIC+` are not NCNames;
empty discrete and continuous mappings occur in google/xls, ncats/hcase and MoTrPAC files; 3.10
writes no `tableColumnStyleName`). A reader must follow the JAXB behavior: unknown elements and
attributes ignored, missing ones defaulted, no cardinality checks.

## 5. Mapping onto graph-io's snapshot model

### 5.1 Unit of import

A session holds many networks; a graph-format snapshot holds one graph. The natural unit is the
**registered subnetwork** (what Cytoscape lists in its Network panel), not the root collection.

- `importAll()` yields one snapshot per registered subnetwork (3.x) or per network (2.x, except
  `Network Root`), in `apps/org.cytoscape.swing-application/network_list.xml` order when present,
  else in entry order.
- `import()` reads the first network (or a `network` option naming one by name or SUID) and warns
  `W_MULTIPLE_GRAPHS` with the number skipped.
- Root-level-only edges and nodes (group meta-edges, members of collapsed groups) are not part of
  any subnetwork and are reported, not added.

### 5.2 Element mapping

| Cytoscape                                                 | Snapshot                                                                                                                                                                                                 | Notes                                                                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| node, saved SUID                                          | node id (string form of the SUID)                                                                                                                                                                        | the SUID is file-local; Cytoscape renumbers on load. `shared name` / `name` is the stable identity and should be the label                              |
| `name` (LOCAL)                                            | `label` role column                                                                                                                                                                                      | `shared name` (virtual, from SHARED) kept as a column                                                                                                   |
| edge, saved SUID                                          | edge `id` role column                                                                                                                                                                                    | multigraph: parallel edges and self-loops are legal (STELZ 55 self-loops, v283Session1 102)                                                             |
| `interaction` / `shared interaction`                      | string or `dict` column; `kind` role is a reasonable candidate                                                                                                                                           |                                                                                                                                                         |
| edge `cy:directed`                                        | mixed direction through `DirectionResolver`; `graphty.directed` column when mixed                                                                                                                        | default directed                                                                                                                                        |
| column types                                              | `Integer` -> i32; `Long` -> f64 (declared long rule, `W_PRECISION` above 2^53, or string under `long: "string"`); `Double` -> f64; `Boolean` -> bool; `String` -> string or dict; `List<T>` -> list of T | origin.type keeps the Java class name                                                                                                                   |
| `SHARED_ATTRS` columns                                    | joined into the node/edge table by root SUID (virtual columns)                                                                                                                                           | a LOCAL column of the same name wins; the shared one renamed by the 5.6 collision rule                                                                  |
| `HIDDEN` columns                                          | dropped or kept under `cytoscape.hidden.*`                                                                                                                                                               | `__groupNetworks.SUID`, `__groupCollapsed.SUID`, `__xLocation`... are group state                                                                       |
| network row (LOCAL + SHARED)                              | `graph` table (rowCount 1) + `meta.name`                                                                                                                                                                 | `__Annotations` (list of `key=value                                                                                                                     | ...`strings) kept as a list column;`\_\_parentNetwork.SUID`->`meta.extra` |
| equation cell                                             | the formula text in a string column, `W_` issue                                                                                                                                                          | Cytoscape never stores the value; graph-io cannot evaluate it                                                                                           |
| view `x`,`y`,`z`                                          | `position` role column (f32 x3)                                                                                                                                                                          | from the network's first view; y is screen-down. A network with several views (layout-v1.cys) gets one, and a warning; no view means no position column |
| bypasses (`lockedVisualProperties`)                       | a `json` node/edge column `cytoscape.bypass`                                                                                                                                                             | values stay strings; interpretation belongs to graphty-element                                                                                          |
| `selected`                                                | bool column (LOCAL)                                                                                                                                                                                      | 2.x: from `cysession.xml` `selectedNodes`                                                                                                               |
| 2.x hidden nodes/edges; 3.x `NODE_VISIBLE=false` bypass   | `hidden` role (bool)                                                                                                                                                                                     |                                                                                                                                                         |
| groups                                                    | group node is a node; members get the `parent` role column (single group) or `parents` (a member of several groups) when the group is expanded and its members are in the network                        | collapsed members are not in the subnetwork; recorded in `meta.extra`, not added                                                                        |
| nested-network pointer                                    | string column `cytoscape.nestedNetwork` naming the target network                                                                                                                                        | cannot be containment (it is a reference to another graph, possibly cyclic)                                                                             |
| network hierarchy (2.x tree, 3.x `__parentNetwork.SUID`)  | `meta.extra.cytoscape.parentNetwork`                                                                                                                                                                     |                                                                                                                                                         |
| visual styles                                             | parsed into a JSON-serializable structure in `meta.extra.cytoscape.styles` plus the view's style name                                                                                                    | turning a Cytoscape style into graphty style layers is graphty-element's job                                                                            |
| `apps/*`, global tables, properties, bookmarks, thumbnail | not imported; one `W_` note listing what was skipped                                                                                                                                                     |                                                                                                                                                         |

A standalone style file holds no graph. It needs its own entry point in graph-io (a
`readCytoscapeStyles(input)` returning the structure above), not a `GraphImporter`.

### 5.3 What cannot be recovered

Rendered appearance (needs style evaluation), equation results, app state (EnrichmentMap,
AutoAnnotate model tables are opaque), custom graphics images (PNG entries can be listed, not
interpreted), edge bend geometry in absolute coordinates, annotation shapes as geometry (they are
strings), and node identity across separate collections (3.x never shares nodes between root
networks).

## 6. Reading the zip with no dependency

`DecompressionStream("deflate-raw")` is available in Chrome 103, Firefox 113, Safari 16.4, Deno
1.23 and Node 21.2.0 / 20.12.0 (MDN browser-compat-data; Node webstreams docs). graph-io's floor is
therefore Node 20.12. A complete reader is about 150 lines; `tmp/samples-session-and-style/tools/zipcheck.mjs`
is a working proof (EOCD scan, central directory, local headers, raw inflate, CRC-32) and read all
21 downloaded sessions with every CRC matching.

Findings that shape the reader:

1. **Every Cytoscape-written entry uses a data descriptor** (general-purpose flag bit 3) and its
   local header holds zero CRC and sizes (21 of 21 sessions, every deflated entry). Sizes come from
   the central directory. So the reader must buffer the whole input and read the central directory
   at the end; a streaming local-header walk would have to detect the end of each deflate stream.
2. The deflate stream must be given exactly `compressedSize` bytes. The Compression Streams spec
   throws `TypeError` on bytes after the end of the stream; Node 22.22.1 accepts them silently
   (verified), so behavior differs by platform unless the reader slices exactly.
3. Truncated or corrupt deflate data rejects with a `TypeError` with an empty message (Node). The
   reader must wrap it into its own error with the entry name.
4. Raw deflate has no checksum: the reader computes CRC-32 itself and compares it with the central
   directory.
5. zip64: needed above 4 GiB or 65,535 entries; Java writes it automatically. Supporting it is the
   EOCD64 locator (signature `0x07064b50`) plus the `0x0001` extra field; offsets fit in a JS number
   up to 2^53. No sample needs it; a generated fixture (`zipfile` with `force_zip64=True`) covers it.
6. Encryption (flag bit 0, or method 99 AES): Cytoscape never writes it; reject with an error.
7. Methods: Cytoscape writes 8 (deflate) and, in re-zipped archives, 0 (stored). Archives re-zipped
   by other tools can carry 9 (deflate64), 12 (bzip2), 14 (LZMA), 93 (zstd): reject by name.
8. File names: bit 11 (UTF-8) is set in some sessions (nestedGroups_collapsed, LUAD_vest_v2) and
   not others; names are ASCII in practice because of URL-encoding, so decode as UTF-8 and fall back
   to CP437 only if bit 11 is clear and bytes are not valid UTF-8.
9. A re-zipped archive (macOS Finder) adds `__MACOSX/._*` resource forks, `.DS_Store`, and stored
   directory entries (the `galFiltered.cys` that ships with Cytoscape has all three). Ignore them.
10. Decompression ratio: v263SessionLarge.cys expands 571 KB to 8.8 MB (15x); XGMML and cytables
    compress 5x to 30x. A limit on total uncompressed bytes and on the per-entry ratio (for
    example 1,000x) stops zip bombs without affecting real files.

## 7. Errors and edge cases a reader must handle

Container:

- Not a zip (no `PK\x03\x04`, no EOCD); empty file; EOCD comment up to 65,535 bytes; truncated
  archive (EOCD missing or central directory out of range); central directory count or offset
  inconsistent with the file; local header signature wrong at a central offset; local and central
  names differ; duplicate entry names; entries with `..`, absolute or backslash paths (keys only,
  never written to disk); directory entries; encrypted entries; unsupported methods; CRC mismatch;
  size mismatch; deflate data truncated; trailing bytes after the deflate stream; prepended data
  (self-extracting stub, offsets shifted); zip64 records; data descriptor with and without its
  optional signature `0x08074b50`; a stored entry with a data descriptor (Java's `ZipInputStream`,
  and so Cytoscape, cannot read it; a central-directory reader can); a nested zip.

Session structure:

- No `.version` and no `cysession.xml` (not a session); `.version` with an unknown major (Cytoscape
  refuses a different major); the 3.0 pre-release layout (test_session1.cys); more than one root
  folder (two sessions zipped together); entries at the archive root without the folder (Cytoscape's
  `.*/networks/` patterns do not match, so it loads nothing); entry names that do not match the
  patterns; network SUID prefix not numeric; `Network Root.xgmml` named in `cysession.xml` but absent
  (normal in 2.x); a network named in `cysession.xml` with no XGMML entry; an XGMML not named in
  `cysession.xml`; a table for a network SUID that has no network entry (Cytoscape throws a
  `NullPointerException`); a view whose `cy:networkId` is unknown; two views for one network;
  a view naming a style that `session_vizmap.xml` lacks; unknown entries (logged, skipped).

Tables:

- Unknown `CyCSV-Version`; no version line (schema 0, three header lines instead of five); a row
  with fewer or more cells than columns; unknown Java class; unparseable cells (Cytoscape nulls them
  silently; graph-io should warn); integer overflow; `NaN`, `Infinity` in Double; empty String vs
  null; `List<String>` empty cell; multi-line cells; equations; duplicate primary keys; rows whose
  SUID matches no element (stale rows); a virtual column whose source table or join column is
  missing, or a cycle of virtual columns; a LOCAL and a SHARED column with the same name and
  different types; column names with spaces, dots, `$`, quotes.

XGMML in sessions:

- `xlink:href` to an id defined later, in another entry, or nowhere; an edge whose endpoint is not a
  member of the same subnetwork; nested-network pointer cycles; groups nested in groups; collapsed
  groups with meta-edges at the root; an edge without `cy:directed` and a graph without `directed`;
  2.x edges without ids; 2.x negative node ids reused across files for the same node; duplicate
  node ids; XML-level problems (encoding, entity expansion, illegal characters) already covered by
  graph-io's shared XML tokenizer.

Styles:

- Unknown visual property ids; values that do not parse (Cytoscape logs and uses the default);
  duplicate style names (later wins in a set); duplicate discrete keys; continuous mappings with
  zero points, one point, equal `attrValue`s (LUAD_vest_v2) or unsorted points; `attributeType`
  disagreeing with the column's real type (a `float` mapping on an Integer column); a mapping on a
  column that does not exist; `columnStyleAssociation` naming a missing style or id; mixed
  `org.cytoscape.ding.customgraphics` and `org.cytoscape.cg.model` class names; chart JSON inside an
  XML attribute (entity-escaped `&quot;`); empty `default=""`; `visualProperty` with no `default` and
  no mapping (76 `EDGE_BEND` entries in the samples); 2.x properties files with escapes, comments and
  non-ASCII `\uXXXX`.

Size:

- Large sessions: The_Yeast_Interactome.cys is 24.8 MB compressed (Cytoscape's own sample);
  v263SessionLarge holds 4,133 nodes and 14,558 edges in one 2.x network. Memory is the whole zip
  plus one inflated entry at a time.

## 8. The independent reader for expectations

There is no reader of `.cys` outside Cytoscape (searched: no Python, R or JavaScript library parses
the archive; py4cytoscape and RCy3 drive a running Cytoscape). The oracle is therefore
**Cytoscape Desktop 3.10.5 itself, driven through CyREST**, with two cross-checks.

How to run it (needs Java 17, which the Linux tarball does not bundle, and an X display):

```bash
# Cytoscape 3.10.5 tarball and a JDK 17 (Adoptium tarball, no root needed)
curl -LO https://github.com/cytoscape/cytoscape/releases/download/3.10.5/cytoscape-unix-3.10.5.tar.gz
tar xzf cytoscape-unix-3.10.5.tar.gz
export JAVA_HOME=/path/to/jdk-17
xvfb-run -a cytoscape-unix-3.10.5/cytoscape.sh -R 1234 &   # REST port; CI runners have xvfb
# per fixture
curl "http://localhost:1234/v1/session?file=/abs/path/fixture.cys"           # open session
curl http://localhost:1234/v1/networks                                       # SUIDs (renumbered)
curl http://localhost:1234/v1/networks/<suid>                                # Cytoscape.js JSON: every node/edge with all columns
curl http://localhost:1234/v1/networks/<suid>/views/first                    # same with positions
curl http://localhost:1234/v1/networks/<suid>/tables/defaultnode/columns     # column names and types
curl http://localhost:1234/v1/networks/<suid>/groups                         # groups
curl http://localhost:1234/v1/styles ; curl http://localhost:1234/v1/styles/<name>  # styles, defaults, mappings
# style files
curl "http://localhost:1234/v1/commands/vizmap/load%20file?file=/abs/path/style.xml"
```

A `tools/oracle_cytoscape.py` beside the existing `oracle_<format>.py` scripts would run this per
fixture and write `expected` records keyed by `name` / `shared name` (never by SUID, which
Cytoscape renumbers on load), with counts, directedness per edge, column types, positions of the
first view, group membership and style mappings. This ran nowhere here: the machine has no Java and
no Xvfb.

Cross-checks:

1. The assertions in Cytoscape's own session integration tests
   (https://github.com/cytoscape/cytoscape-gui-distribution/tree/develop/integration-test/src/test/java/org/cytoscape/session)
   are expectations written by the Cytoscape developers and verified by Cytoscape's CI: node and edge
   counts, selected counts, network names, style counts, mapping kinds and columns, group membership
   and collapsed state, nested-network pointers, for 11 sessions. They can be transcribed into the
   manifest today without running anything. They also show why a naive reader is not an oracle: a
   plain count of XGMML elements gives 8 nodes for groups.cys and 5 for v283Groups.cys, where
   Cytoscape (and the tests) give 6 and 4, because collapsed group members leave the network.
2. For style files, schema validation is not usable (section 4.6). The oracle is the style as
   CyREST returns it after `vizmap load file`.

## 9. Candidate sample files

All downloaded into `tmp/samples-session-and-style/` (folders `gui/`, `impl/`, `tutorials/`,
`styles/`) and opened. Licenses:

- `cytoscape/cytoscape-impl`: LGPL-2.1 (GitHub license field and every source header).
- `cytoscape/cytoscape-gui-distribution`: no LICENSE file at the root; the Java files in the same
  test tree carry the LGPL-2.1 header. Treat as LGPL-2.1, test-only (the conformance suite's
  existing rule for LGPL fixtures: `test/` is not published).
- `cytoscape/cytoscape-tutorials`: CC0-1.0 (LICENSE file at the repository root). Redistributable
  anywhere, including graph-samples.
- Third-party style files: the license in each repository's LICENSE file, as listed.

| #   | File                                                                                         | URL                                                                                                                                                                   | Size                                 | License             | Why                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | simpleSession.cys                                                                            | https://github.com/cytoscape/cytoscape-gui-distribution/raw/develop/integration-test/src/test/resources/testData/session3x/simpleSession.cys                          | 18,945 B                             | LGPL-2.1, test-only | minimal 3.x (2013): 3 nodes, 2 edges, node and edge bypasses, app namespace tables (MYAPP), selection; expectations in Cy3SimpleSessionLodingTest                                                              |
| 2   | visualMappings.cys                                                                           | .../testData/session3x/visualMappings.cys                                                                                                                             | 20,258 B                             | LGPL-2.1, test-only | 16 styles, every mapping kind and column type, an equation cell, undirected edges (`cy:directed="0"`), 4 nodes / 6 edges                                                                                       |
| 3   | subnetworks.cys                                                                              | .../testData/session3x/subnetworks.cys                                                                                                                                | 441,059 B                            | LGPL-2.1, test-only | 2 collections, 5 subnetworks, `xlink:href` across entries, nested-network pointers with a cycle, a self-loop, 4 views with different styles                                                                    |
| 4   | groups.cys                                                                                   | .../testData/session3x/groups.cys                                                                                                                                     | 430,790 B                            | LGPL-2.1, test-only | CyCSV schema 0 (no version line), 3 groups (one collapsed, nested), meta-edges at root level                                                                                                                   |
| 5   | nestedGroups_collapsed.cys                                                                   | .../testData/session3x/nestedGroups_collapsed.cys                                                                                                                     | 430,583 B                            | LGPL-2.1, test-only | nested collapsed groups; zip names with the UTF-8 flag                                                                                                                                                         |
| 6   | v252Session.cys                                                                              | .../testData/session2x/v252Session.cys                                                                                                                                | 180,403 B                            | LGPL-2.1, test-only | Cytoscape 2.5.2: XGMML documentVersion 1.0, `vizmap.props` with continuous, discrete and passthrough calculators; 331 / 362                                                                                    |
| 7   | v270session.cys                                                                              | .../testData/session2x/v270session.cys                                                                                                                                | 25,197 B                             | LGPL-2.1, test-only | 2.7: child network, typed attributes (`attrInt`, `attrFloat`, `attrBoolean`, `attrString`), plugin folders; 53 / 63                                                                                            |
| 8   | v283Groups.cys                                                                               | .../testData/session2x/v283Groups.cys                                                                                                                                 | 15,861 B                             | LGPL-2.1, test-only | 2.8.3 groups (nested, collapsed and expanded), locked visual properties, `images/`                                                                                                                             |
| 9   | v263SessionLarge.cys                                                                         | .../testData/session2x/v263SessionLarge.cys                                                                                                                           | 571,049 B (8.8 MB inflated)          | LGPL-2.1, test-only | 7 networks in a hierarchy, 4,133 nodes / 14,558 edges in the largest; decompression ratio                                                                                                                      |
| 10  | v283Session1.cys                                                                             | .../testData/session2x/v283Session1.cys                                                                                                                               | 716,698 B                            | LGPL-2.1, test-only | 5 networks from two sources, 102 self-loops in RUAL.subset                                                                                                                                                     |
| 11  | t3.cys                                                                                       | https://github.com/cytoscape/cytoscape-impl/raw/develop/io-impl/impl/src/test/resources/testData/NNFData/t3.cys                                                       | 12,558 B                             | LGPL-2.1, test-only | 2.x nested networks (`nested_network_id`), dangling `Network Root.xgmml`                                                                                                                                       |
| 12  | test_session1.cys                                                                            | https://github.com/cytoscape/cytoscape-impl/raw/develop/core-task-impl/src/test/resources/test_session1.cys                                                           | 26,026 B                             | LGPL-2.1, test-only | 3.0 pre-release layout with no version marker: the "unsupported layout" error path                                                                                                                             |
| 13  | LUAD_vest_v2.cys                                                                             | https://github.com/cytoscape/cytoscape-impl/raw/develop/layout-cytoscape-impl/src/test/resources/circular-layout-tests/LUAD_vest_v2.cys                               | 417,155 B                            | LGPL-2.1, test-only | 10 subnetworks with views, undirected, custom-graphics PNGs, 26 styles, a continuous mapping with equal breakpoints, UTF-8 name flag                                                                           |
| 14  | goTrees.cys                                                                                  | https://github.com/cytoscape/cytoscape-impl/raw/develop/layout-cytoscape-impl/src/test/resources/circular-layout-tests/goTrees.cys                                    | 495,898 B                            | LGPL-2.1, test-only | three Gene Ontology trees (1,819 / 2,764 / 706 nodes, n-1 edges each); links this work to the OBO importer                                                                                                     |
| 15  | galFiltered.cys (Cytoscape sample data; byte-identical to `sessions/Yeast Perturbation.cys`) | https://github.com/cytoscape/cytoscape-gui-distribution/raw/develop/assembly/src/main/resources/sampleData/galFiltered.cys                                            | 95,623 B                             | LGPL-2.1, test-only | 2022, 3.9+/3.10 features: vizmap 3.1 with table column styles and associations, `cytables.xml` table views, global app tables, `__MACOSX` and `.DS_Store` entries, stored directory entries, a multi-line cell |
| 16  | STELZ.cys                                                                                    | https://github.com/cytoscape/cytoscape-tutorials/raw/gh-pages/protocols/data/STELZ.cys                                                                                | 211,312 B                            | CC0-1.0             | Stelzl 2005 human interactome, 1,691 nodes / 3,360 edges, 55 self-loops, with a layout; also a graph-samples candidate                                                                                         |
| 17  | galFiltered.cys (tutorials)                                                                  | https://github.com/cytoscape/cytoscape-tutorials/raw/gh-pages/protocols/data/galFiltered.cys                                                                          | 754,695 B                            | CC0-1.0             | Ideker 2001 yeast perturbation network with expression columns, 331 / 362, laid out; graph-samples candidate                                                                                                   |
| 18  | layout-v1.cys                                                                                | https://github.com/cytoscape/cytoscape-tutorials/raw/gh-pages/presentations/modules/network-visualization-light/layout-v1.cys                                         | 1,558,913 B                          | CC0-1.0             | one collection with two networks and two views (a subnetwork view)                                                                                                                                             |
| 19  | AnnotationExample.cys                                                                        | https://github.com/cytoscape/cytoscape-tutorials/raw/gh-pages/presentations/modules/advanced-visualization/AnnotationExample.cys                                      | 1,062,136 B                          | CC0-1.0             | `__Annotations`, AutoAnnotate app tables, 9 networks in the collection                                                                                                                                         |
| 20  | default_vizmap.xml                                                                           | https://github.com/cytoscape/cytoscape-impl/raw/develop/vizmap-gui-impl/src/main/resources/default_vizmap.xml                                                         | 135,973 B                            | LGPL-2.1, test-only | the 15 built-in styles (documentVersion 3.0), duplicated dependencies, non-NCName names                                                                                                                        |
| 21  | sampleStyles.xml                                                                             | https://github.com/cytoscape/cytoscape-gui-distribution/raw/develop/assembly/src/main/resources/sampleData/sampleStyles.xml                                           | 168,670 B                            | LGPL-2.1, test-only | 17 styles incl. charts (`org.cytoscape.BarChart:{json}`), linear and radial gradients                                                                                                                          |
| 22  | v270_vizmap.props (also v240, v252, v283)                                                    | https://github.com/cytoscape/cytoscape-impl/raw/develop/io-impl/impl/src/test/resources/testData/vizmap/v270_vizmap.props                                             | 22,605 B (34,079 / 162,774 / 59,666) | LGPL-2.1, test-only | the 2.x properties style format across four releases                                                                                                                                                           |
| 23  | cytoscape-ir-style.xml                                                                       | https://github.com/google/xls/raw/main/docs_src/cytoscape-ir-style.xml                                                                                                | 13,656 B                             | Apache-2.0          | 3.1 document, `org.cytoscape.cg.model` class names, an empty discrete mapping, a `float` discrete mapping, a name with spaces                                                                                  |
| 24  | enrichment_network_style.xml                                                                 | https://github.com/MoTrPAC/MotrpacRatTraining6mo/raw/main/cytoscape/enrichment_network_style.xml                                                                      | 37,617 B                             | MIT                 | 3 styles in one file, PieChart custom graphics, an empty continuous mapping                                                                                                                                    |
| 25  | hcase_style.xml / cd_hierarchy.xml                                                           | https://github.com/ncats/hcase/raw/main/examples/hcase_style.xml ; https://github.com/cytoscape/cy-community-detection/raw/master/src/main/resources/cd_hierarchy.xml | 11,048 B / 11,764 B                  | MIT / BSD-3-Clause  | passthrough on a `long` column; boolean discrete mapping and three continuous mappings                                                                                                                         |

Authored fixtures (graph-io's own, MIT): the container cases of section 7 cannot be found in the
wild and should be generated from file 1 by a script: truncated archive, missing EOCD, zip64
(`force_zip64=True`), stored entry with descriptor, trailing junk after a deflate stream, CRC
mismatch, encrypted flag, deflate64 method id, duplicate entry, entries without the root folder, two
root folders, `__MACOSX` noise, an unknown `CyCSV-Version`, a table for a missing network, a
dangling `xlink:href`, a ratio bomb.

Large, hosted only: `sessions/The_Yeast_Interactome.cys` (24,809,869 B) in cytoscape-gui-distribution,
LGPL-2.1, for the size path.

For graph-samples, only the CC0 sessions qualify without a license question: STELZ (Stelzl et al.
2005, Cell 122:957) and the tutorials' galFiltered (Ideker et al. 2001, Science 292:929), both with
Cytoscape layouts that graph-samples does not have yet.

## 10. Downloaded files and tools

`tmp/samples-session-and-style/`: `gui/` (integration-test sessions and their tests, sample data),
`impl/` (cytoscape-impl readers, XSDs, test sessions), `api/` (lexicon and value parsers),
`tutorials/` (CC0 sessions), `styles/` (third-party style files, extracted session styles and
`cytables.xml`), `manual/` (Cytoscape manual pages). Scripts in `tools/`: `zipinfo.py` (zip flags),
`survey.py` (table and document versions), `cys_counts.py` (per-network counts, a survey aid only),
`stylesurvey.py` (mapping kinds, value forms, anomalies), `xsdcheck.py` (lxml validation, run with
the `venv/` there), `zipcheck.mjs` (the dependency-free zip reader).
