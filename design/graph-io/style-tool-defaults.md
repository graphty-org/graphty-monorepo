# Default visual styles of the tools that write graph-io's formats

When graph-io imports a file's styles, every property the file leaves unset should take the
default of the program that wrote the file, so the graph looks the way it does in that program.
This page records those defaults, where each value comes from, and how to tell which program
wrote a file.

Retrieved 2026-10-11. Every value names its source (a file and line in the tool's repository, or a
URL) and the tool version. Paths under `tmp/` are local copies of those sources kept beside the
prototype; they are not committed. Colors are `#RRGGBB`; "px" is the tool's own drawing unit.

How graph-io uses this table, and the choices it makes where a default is a rule rather than a
value (section 13 below), are in `style-import-design.md`, "Defaults of the writing tool" and
Appendix A.

## 1. Summary: which defaults apply to which file

| graph-io format     | Writing tool (how to tell)                                                                                | Defaults to apply                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| CX2                 | Cytoscape desktop or Cytoscape Web (always)                                                               | Cytoscape "default" style (2.1); the file's `default` block wins |
| CX (version 1)      | Cytoscape desktop or NDEx (always)                                                                        | Cytoscape "default" style (2.1)                                  |
| XGMML               | Cytoscape (always in practice; `cy:` namespace or `cy:documentVersion`)                                   | Cytoscape "default" style (2.1)                                  |
| .cys session        | Cytoscape desktop                                                                                         | Cytoscape renderer fallbacks (2.2), NOT the "default" style      |
| JSON                | Cytoscape.js (`elements` key, optional `style`)                                                           | Cytoscape.js (3)                                                 |
| JSON                | Cytoscape desktop export (`generated_by: "cytoscape-<version>"`, `format_version`)                        | see 9, open question 2                                           |
| JSON                | vis-network (`nodes[].id` + `edges[].from/to`)                                                            | vis-network (7)                                                  |
| JSON                | graphology serialization (`options.type`, `nodes[].key`, `nodes[].attributes`)                            | sigma (8), the renderer graphology files are drawn with          |
| JSON                | NetworkX node-link (`directed`, `multigraph`, `graph`, `nodes` and `links` or `edges` keys)               | NetworkX (11)                                                    |
| JSON                | d3 node-link (`nodes` and `links` only), JGF                                                              | none                                                             |
| DOT                 | any (always drawn by Graphviz)                                                                            | Graphviz (4)                                                     |
| GraphML             | yEd / yFiles 2 / visone (`xmlns:y="http://www.yworks.com/xml/graphml"`, key `yfiles.type="nodegraphics"`) | yEd (5.1)                                                        |
| GraphML             | yFiles 3 / yEd Live (`yfiles-common/3.0` or `yjs` namespaces, `SharedData` key)                           | yFiles 3 styles (5.2)                                            |
| GraphML             | Gephi (keys with `attr.name` `r`, `g`, `b`, `size`, `x`, `y`)                                             | Gephi (6)                                                        |
| GraphML             | Cytoscape desktop (keys `SUID`, `shared name`, `selected`)                                                | Cytoscape "default" style (2.1); the file carries no styles      |
| GraphML             | NetworkX, igraph, anything else                                                                           | none                                                             |
| GEXF                | Gephi and every other writer (the format is Gephi's; `<meta><creator>` names the writer)                  | Gephi (6)                                                        |
| GML                 | yEd / yFiles (`Creator "yFiles"`, `Version "2.x"`)                                                        | yEd (5.1)                                                        |
| GML                 | Cytoscape 2.x (`Creator "Cytoscape"`)                                                                     | Cytoscape "default" style (2.1)                                  |
| GML                 | Gephi (`Creator "Gephi"` or `Creator Gephi` unquoted, inside `graph [`)                                   | Gephi (6)                                                        |
| GML                 | OGDF (`Creator "ogdf::GraphAttributes::writeGML"`)                                                        | OGDF (10)                                                        |
| GML                 | igraph (`Creator "igraph version ..."`, 12), NetworkX (no Creator), SNDlib, Newman's files, unknown       | none                                                             |
| Pajek               | Pajek                                                                                                     | Pajek (9), partly unverified                                     |
| CSV, Neo4j CSV, OBO | no drawing tool                                                                                           | none                                                             |

Census of writer signatures in the prototype's real-file corpus (`tmp/style-import/wild`): GML
`Creator "yFiles"` 63 files, `Creator "Gephi"` / `Creator Gephi` 12, OGDF 9, Cytoscape 18 (two
copies each), SNDlib 9; GEXF `<creator>Gephi ...` 21 of 33 with a creator, NetworkX 2; JSON
`generated_by: "cytoscape-..."` 19; GraphML `SUID` / `shared name` / `selected` keys 29 files.

## 2. Cytoscape desktop

Version: cytoscape-impl `develop` (pom 3.11.0-SNAPSHOT, commit 6c63e97c5152); the CX app
`cytoscape/cx` master (pom 2.8.4, commit c6abd54dc413).

### 2.1 The "default" visual style (CX, CX2, XGMML, GML, GraphML imports)

Source: `vizmap-gui-impl/src/main/resources/default_vizmap.xml`, style `name="default"`, lines
327-441 (https://github.com/cytoscape/cytoscape-impl/blob/develop/vizmap-gui-impl/src/main/resources/default_vizmap.xml),
local copy `src/default_vizmap.xml`. Cytoscape Web's default style has the same values
(`src/models/VisualStyleModel/impl/defaultVisualStyle.ts` in cytoscape/cytoscape-web,
`development`, package 1.1.0-dev.0; local `src/cyweb-defaultVisualStyle.ts`).

Why this style applies: the CX and CX2 importers start the imported style as a COPY of the
session's current default style (`Cx2Importer.java:472-476`, `ViewMaker.java:569-574` in
cytoscape/cx: `visual_style_factory.createVisualStyle(default_visual_style)`, which copies its
defaults, mappings and dependencies, `VisualStyleFactoryImpl.java` `createVisualStyle(VisualStyle)`),
then overwrite what the file declares. The XGMML and GML readers apply per-element graphics as
locked values (bypasses) on top of the current style (`GenericXGMMLReader.java:327`,
`GMLNetworkReader.java:816` in `tmp/style-import/src/`). In a fresh install the current style is
"default".

| Property            | Value                                                                                   | default_vizmap.xml line |
| ------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| Node fill           | `#89D0F5`                                                                               | 382                     |
| Node opacity        | 255 of 255 (opaque)                                                                     | 383                     |
| Node shape          | `ROUND_RECTANGLE`                                                                       | 367                     |
| Node width x height | 75 x 35 (`nodeSizeLocked` = false, so NODE_SIZE 35 is unused)                           | 384, 358, 343           |
| Node border         | `#CCCCCC`, width 0 (no visible border), `SOLID`                                         | 392, 350, 366           |
| Node label text     | passthrough mapping of the `name` column                                                | 406-408                 |
| Node label          | `#000000`, SansSerif plain 12, centered on the node (`C,C,c,0.00,0.00`), wrap width 200 | 395, 370-371, 380, 372  |
| Edge color          | `#848484` (`EDGE_STROKE_UNSELECTED_PAINT`; Ding draws this, not `EDGE_PAINT` `#323232`) | 431                     |
| Edge width          | 2.0                                                                                     | 417                     |
| Edge line type      | `SOLID`                                                                                 | 438                     |
| Edge opacity        | 255 (opaque)                                                                            | 423                     |
| Edge arrows         | none at source and target                                                               | 437, 428                |
| Arrow color         | `#000000` (`arrowColorMatchesEdge` = false)                                             | 432, 414                |
| Edge label          | empty; `#000000`, Dialog plain 10                                                       | 415, 439                |
| Edge curved         | true                                                                                    | 422                     |
| Background          | `#FFFFFF`                                                                               | 335                     |

Note the mappings: because the importers copy the default style, the `name` -> node label
passthrough survives into every imported CX / CX2 style unless the file maps NODE_LABEL itself.

Fonts: Cytoscape desktop names Java's logical fonts (`SansSerif`, `Dialog`, `Serif`,
`Monospaced`), and CX2 names the CSS families they stand for (`sans-serif`). graph-io reads both
as the CSS family, so the canonical value of every `SansSerif` and `Dialog` above and in 2.2 is
`sans-serif`, and the same network gives the same font from CX and from CX2.

### 2.2 Renderer fallbacks (.cys sessions, and any property a style leaves unset)

A session's styles are rebuilt from `session_vizmap.xml` with `createVisualStyle(title)`
(`VisualStyleSerializer.java:194, 232`), which starts EMPTY (`VisualStyleImpl.java:68`,
`styleDefaults` is a new empty map; `VisualStyleFactoryImpl.java` `createVisualStyle(String)`).
A property the session does not list falls back to the visual lexicon's own default, which is
NOT the "default" style. Cytoscape writes every property into `session_vizmap.xml`, so this only
matters for hand-made or truncated sessions. Source:
`tmp/style-import/src/BasicVisualLexicon.java` (cytoscape-api, `org.cytoscape.view.presentation.property`).

| Property          | Fallback value                                             | BasicVisualLexicon.java line |
| ----------------- | ---------------------------------------------------------- | ---------------------------- |
| Node fill         | rgb(200, 0, 0) `#C80000`                                   | 83                           |
| Node shape        | `ELLIPSE`                                                  | 302-303                      |
| Node size / w / h | 50 / 60 / 40                                               | 147, 155, 163                |
| Node border       | `#000000` (Color.BLACK), width 2.0                         | 230, 54, 238                 |
| Node label        | empty text; `#000000`; SansSerif plain 12; centered        | 123, 91, 255, 55, 205        |
| Node opacity      | 255                                                        | 273                          |
| Edge color        | Color.DARK_GRAY `#404040` (`EDGE_STROKE_UNSELECTED_PAINT`) | 469                          |
| Edge width        | 1.0                                                        | 368                          |
| Edge line type    | `SOLID`                                                    | 392                          |
| Edge arrows       | none; size 6                                               | 487, 493, 500, 508           |
| Edge label        | empty; `#000000`; SansSerif plain 10                       | 360, 327, 408, 416           |
| Background        | `#FFFFFF` (Color.WHITE)                                    | 667                          |

## 3. Cytoscape.js (Cytoscape.js JSON)

Version 3.34.3 (`tmp/style-import/spike/vendor/cytoscape`, from npm). Source: the default
stylesheet in `styfn.getDefaultProperties` (`dist/cytoscape.cjs.js:18451` onward; upstream
`src/style/properties.js`), confirmed by asking a live headless instance
(`tmp/style-import/spike/cyjs-defaults.cjs`, output `tmp/style-import/spike/data/cyjs-defaults.json`).

| Property        | Value                                                                                                                            | cytoscape.cjs.js line                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Node fill       | `#999` (rgb 153,153,153), background-opacity 1                                                                                   | 18536, 18538                            |
| Node shape      | `ellipse`                                                                                                                        | 18571                                   |
| Node size       | 30 x 30                                                                                                                          | 18569-18570                             |
| Node border     | `#000`, width 0, solid                                                                                                           | 18555, 18557-18558                      |
| Opacity         | 1                                                                                                                                | 18503                                   |
| Label text      | `''` (no label unless the stylesheet maps one)                                                                                   | 18507                                   |
| Label           | `#000`, 16px, `Helvetica Neue, Helvetica, sans-serif`, normal weight; `text-valign: top`, `text-halign: center` (ABOVE the node) | 18474, 18496, 18493, 18495, 18470-18471 |
| Edge color      | `#999` (line, and arrow colors)                                                                                                  | 18639                                   |
| Edge width      | 3                                                                                                                                | 18711                                   |
| Edge line style | `solid`, line-opacity 1                                                                                                          | 18638, 18642                            |
| Edge arrows     | `none` at both ends (`arrow-shape`, per end prefix), arrow-scale 1                                                               | 18670-18671, 18660                      |
| Edge curve      | `haystack` (straight, no arrows drawable until `bezier`)                                                                         | 18658                                   |
| Background      | none: the container is transparent (page background shows)                                                                       | --                                      |

## 4. Graphviz (DOT)

Version: Graphviz `main` (latest tag 16.1.0). Sources: the attribute pages' front matter in
gitlab.com/graphviz/graphviz.gitlab.io `content/en/docs/attrs/<name>.md` (local `src/gvattrs/`),
published at https://graphviz.org/docs/attrs/<name>/, and `lib/common/const.h` (local
`src/gv-const.h`).

| Property        | Value                                                                                                                                               | Source                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Node fill       | NOT filled: `style` defaults to `""`; with `style=filled`, `fillcolor` defaults to `lightgrey` (`#D3D3D3`), or to `color` when `color` is set       | style.md; fillcolor.md; const.h:69                                  |
| Node outline    | `color` `black`, `penwidth` 1.0 (points)                                                                                                            | color.md; penwidth.md; const.h:48, 77                               |
| Node shape      | `ellipse`                                                                                                                                           | shape.md; const.h:76                                                |
| Node size       | width 0.75 in, height 0.5 in (54 x 36 points), grown to fit the label unless `fixedsize`                                                            | width.md; height.md; const.h:72-74                                  |
| Node label text | `\N`, the node's NAME: every node is labelled with its id by default                                                                                | label.md                                                            |
| Label           | `fontcolor` `black`, `fontsize` 14 points, `fontname` `Times-Roman`, `labelloc` `c` (centered) for nodes                                            | fontcolor.md; fontsize.md; fontname.md; labelloc.md; const.h:61, 67 |
| Edge color      | `black`, penwidth 1.0                                                                                                                               | color.md; penwidth.md                                               |
| Edge style      | solid (`style` `""`)                                                                                                                                | style.md                                                            |
| Edge arrows     | `dir` = `forward` in a digraph, `none` in a graph; `arrowhead` `normal`; `arrowsize` 1.0 (10 points long, `ARROW_LENGTH` in lib/common/arrows.c:29) | dir.md; arrowhead.md; arrowsize.md                                  |
| Edge label      | empty; black, 14 points, Times-Roman (head/tail labels 11 points, const.h:62)                                                                       | label.md; const.h                                                   |
| Background      | `bgcolor` `<none>` (transparent; raster outputs paint white)                                                                                        | bgcolor.md                                                          |

## 5. yEd and yFiles (GraphML, GML)

### 5.1 yEd / yFiles for Java 2.x (the `y:` GraphML dialect and yEd GML)

yEd writes every visual property explicitly on every element, so these defaults matter only for
files from other writers that use the yEd dialect partially, and for a plain GraphML file opened
in yEd.

| Property          | Value                                                                                                                                 | Source                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node              | "square nodes with yellow/orange color"                                                                                               | yEd Q&A, yWorks staff answer: https://yed.yworks.com/support/qa/28/how-can-i-change-the-default-nodes-and-or-default-edges                                                               |
| Node fill (exact) | `#FFCC00`                                                                                                                             | the most frequent `<y:Fill color>` in the corpus (377 of the yEd files' fills; `tmp/style-import/wild`, 65 yEd GraphML files) -- consistent with the Q&A; no yWorks page states the hex  |
| Node shape        | `rectangle`                                                                                                                           | `ShapeNodeRealizer()` "rectangular shape and an empty label" (https://docs.yworks.com/yfiles/doc/api/y/view/ShapeNodeRealizer.html, yFiles for Java 2.19); corpus 1188 of 2020 `y:Shape` |
| Node size         | 30 x 30                                                                                                                               | UNVERIFIED in a primary source (the realizer docs give no number); known yEd behavior                                                                                                    |
| Node border       | `#000000`, `line`, width 1.0                                                                                                          | corpus: 1668 of 1926 `y:BorderStyle` are exactly this; the Java docs do not state the realizer default                                                                                   |
| Node label        | `#000000` text, `Dialog` plain 12, centered inside the node (`internal` / `c`)                                                        | corpus: 1626 `NodeLabel`s are Dialog 12 plain; YLabel docs give no default font                                                                                                          |
| Edge              | "a thin black line and an arrowhead pointing to the target node"                                                                      | the same yEd Q&A                                                                                                                                                                         |
| Edge line         | `#000000`, `line`, width 1.0                                                                                                          | EdgeRealizer docs: line color "defaults to Color.black", line type "defaults to LineType.LINE_1" (https://docs.yworks.com/yfiles/doc/api/y/view/EdgeRealizer.html)                       |
| Edge arrows       | yEd UI: source `none`, target `standard`. yFiles realizer (what a reader uses when `<y:Arrows>` is ABSENT): `Arrow.NONE` at both ends | Q&A above; EdgeRealizer docs "This attribute defaults to Arrow.NONE"; corpus 1393 of 2041 `y:Arrows` are none/standard                                                                   |
| Edge label        | Dialog 12 plain, black (corpus)                                                                                                       | corpus                                                                                                                                                                                   |
| Background        | `#FFFFFF`                                                                                                                             | UNVERIFIED (yEd canvas)                                                                                                                                                                  |

Rule for a reader: an ABSENT `<y:Fill>` / `<y:Arrows>` element means the realizer default
(`Arrow.NONE`), while the yEd editor's defaults (`#FFCC00`, target `standard`) are what a person
creating the file saw. Use the yEd editor values for a plain GraphML file "as yEd shows it", and
the realizer values for a partial `y:` record.

### 5.2 yFiles 3 / yFiles for HTML (yEd Live, yFiles 3 GraphML)

yFiles 3 serializes only properties that differ from the style's defaults, so these fill every
omitted property. Source: yFiles for HTML API docs (current, retrieved 2026-10-11; local
`src/yhtml/*.html`).

| Property    | Value                                                   | Source                                                                    |
| ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Node fill   | `Color.WHITE` (`#FFFFFF`)                               | https://docs.yworks.com/yfiles-html/api/ShapeNodeStyle.html (`fill`)      |
| Node stroke | `Stroke.BLACK` (black, width 1)                         | same (`stroke`)                                                           |
| Node shape  | `ShapeNodeShape.RECTANGLE`                              | same (`shape`)                                                            |
| Edge stroke | `Stroke.BLACK`                                          | https://docs.yworks.com/yfiles-html/api/PolylineEdgeStyle.html (`stroke`) |
| Edge arrows | `IArrow.NONE` at both ends                              | same (`sourceArrow`, `targetArrow`)                                       |
| Label       | font Arial, 12, `textFill` `Color.BLACK`, no background | https://docs.yworks.com/yfiles-html/api/LabelStyle.html                   |
| Node size   | UNVERIFIED (the graph's node defaults)                  | --                                                                        |

## 6. Gephi (GEXF, Gephi GraphML, Gephi GML)

Version: gephi/gephi `master` (pom 0.11.4-SNAPSHOT, commit 92e503df61a7, 2026-10-10) and
gephi/graphstore `master` (commit a4c790b2343e). Gephi has two drawings: the Overview (the
interactive window, `VisualizationImpl`) and Preview (the export renderer, `PreviewAPI`). The
import itself sets node size and label colors.

| Property            | Value                                                                                                                                                                                                                | Source (local `src/gephi/`, `src/graphstore/`)                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node color (absent) | BLACK, opaque: graphstore's new node is `rgba = 255 << 24`; the importer copies a color only when the file has one                                                                                                   | graphstore `NodeImpl.java:322`; `AbstractProcessor.java:167-169`                                                                                                                        |
| Node size (absent)  | 10                                                                                                                                                                                                                   | `AbstractProcessor.java:195-198`                                                                                                                                                        |
| Node shape          | disc (circle); GEXF 1.3 spec default `disc`                                                                                                                                                                          | Preview NodeRenderer; GEXF spec (see `tmp/style-import/research-format-1.md`)                                                                                                           |
| Node border         | Preview: width 1.0, color "darker" than the node's fill                                                                                                                                                              | `PreviewAPI/.../presets/DefaultPreset.java:84-85`                                                                                                                                       |
| Node opacity        | Preview 100%                                                                                                                                                                                                         | `DefaultPreset.java:87`                                                                                                                                                                 |
| Node labels         | HIDDEN by default in both drawings; color black; Preview font Arial plain 12, Overview Arial bold 32 x 0.5 scale                                                                                                     | `VizConfig.java:113, 121, 138`; `DefaultPreset.java:91, 93, 106`; `AbstractProcessor.java:177-182`                                                                                      |
| Edge color          | Overview: the SOURCE node's color, ignoring the edge's own color (`EdgeColorMode.SOURCE`); Preview: the MIX of source and target colors (`EdgeColor.Mode.MIXED`). An edge with no color in the file is stored black. | `VizConfig.java:119`; `VisualizationEngine/.../AbstractEdgeData.java:1197-1212`; `DefaultPreset.java:65`; `PreviewAPI/.../types/EdgeColor.java:81-98`; `AbstractProcessor.java:301-308` |
| Edge thickness      | from the edge weight (default 1); Overview edge scale 2, rescaled by weight; Preview thickness 1, uses weight                                                                                                        | `VizConfig.java:136, 144-145`; `DefaultPreset.java:67, 73`                                                                                                                              |
| Edge shape          | Preview curved; Overview straight                                                                                                                                                                                    | `DefaultPreset.java:66`                                                                                                                                                                 |
| Edge arrows         | drawn for directed edges; Preview arrow size 3                                                                                                                                                                       | `DefaultPreset.java:62`                                                                                                                                                                 |
| Edge labels         | hidden; Preview Arial plain 10, original color                                                                                                                                                                       | `VizConfig.java:114`; `DefaultPreset.java:76-77, 105`                                                                                                                                   |
| Background          | `#FFFFFF` (Overview dark theme: rgb 52,55,57)                                                                                                                                                                        | `VizConfig.java:111-112`; `DefaultPreset.java:63`                                                                                                                                       |

How graph-io applies this: an edge with no thickness in the file is drawn as thick as its weight
(1 for an edge with no weight), a derived default like the source-node color. An edge whose file gives
it a `viz:thickness` keeps that thickness. Gephi's importer does not read `viz:thickness`, but the
GEXF specification defines it and the other programs that draw GEXF files (sigma.js, gexf-js) draw
it, and it is the only place a file states a thickness on purpose; drawing the weight there instead
would throw that statement away.

A weight of 0 or below is drawn 1 wide. Gephi scales the width by the weight, so such an edge
would be drawn with no width or not at all; graph-io keeps it visible instead, because an edge the
file holds and the reader cannot see looks like a lost edge.

## 7. vis-network (vis JSON)

Version 10.1.2 (npm; local `src/vis-network.esm.js`, the `peer/esm` build). Node defaults at
lines 32986-33110, edge defaults at 25160-25290.

| Property     | Value                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Node fill    | `#97C2FC`                                                                                                                               |
| Node border  | `#2B7CE9`, width 1                                                                                                                      |
| Node shape   | `ellipse` (the label is drawn INSIDE and the node grows to fit it; `size` 25 applies to `dot`, `square` and other label-outside shapes) |
| Node opacity | undefined (opaque)                                                                                                                      |
| Label        | the `label` field only (no fallback to the id); `#343434`, 14 px, `arial`, centered                                                     |
| Edge color   | `#848484`, but `color.inherit` defaults to `"from"`: an edge with no color takes its from-node's color                                  |
| Edge width   | 1                                                                                                                                       |
| Edge style   | solid (`dashes: false`); `smooth` dynamic curve                                                                                         |
| Edge arrows  | none (`to`, `middle`, `from` all disabled)                                                                                              |
| Edge label   | `#343434`, 14 px, `arial`, white outline 2 px                                                                                           |
| Background   | transparent canvas                                                                                                                      |

## 8. sigma.js (graphology JSON)

graphology has no visual defaults of its own; graphology files are drawn with sigma. Version:
sigma 3.0.3 (`packages/sigma/src/settings.ts` lines 119-126 and `sigma.ts` lines 76 and 100 at tag
`sigma@3.0.3`; local `src/sigma3-settings.ts`). sigma 4.0.0 (npm latest) replaced these settings
with a style system; 3.x is what existing graphology files were made with.

| Property    | Value                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node color  | `#999`                                                                                                                                                           |
| Node shape  | `circle`                                                                                                                                                         |
| Node size   | 2 (when `size` is absent; `sigma.ts:76`)                                                                                                                         |
| Label       | the `label` attribute; `#000`, Arial 14 normal; drawn only for nodes at least 6 px on screen (`labelRenderedSizeThreshold`), so default-size nodes show no label |
| Edge color  | `#ccc`                                                                                                                                                           |
| Edge size   | 0.5 (when absent; `sigma.ts:100`), never thinner than 1.7 px on screen                                                                                           |
| Edge type   | `line` (no arrows)                                                                                                                                               |
| Edge labels | off (`renderEdgeLabels: false`)                                                                                                                                  |
| Background  | transparent canvas                                                                                                                                               |

## 9. Pajek

Version: Pajek 6.02 reference manual (January 1, 2026), http://mrvar.fdv.uni-lj.si/pajek/pajekman.pdf
(local `src/pajekman.pdf`, text `src/pajekman.txt`).

| Property                                                    | Value                                                                                                                             | Manual                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Vertex shape                                                | `ellipse` ("Shape -- default shape of vertex (ellipse, box, ...)")                                                                | p. 85 (txt line 2955) |
| Line                                                        | "the default arc will be black, straight, solid arc", dotted when the value is negative, Bezier for loops and for both directions | p. 90 (txt 3112-3116) |
| Arrows                                                      | arcs: at the terminal vertex; edges: none                                                                                         | p. 91                 |
| Opacity                                                     | vertices and lines fully opaque                                                                                                   | p. 87                 |
| Vertex fill, border, size, label color and size, background | NOT stated in the manual: they are Pajek option settings (Draw window, Options / Colors). UNVERIFIED.                             | --                    |

Recommendation: apply only the stated values (ellipse, black solid lines, arrows on arcs) until
the remaining values are read from a running Pajek (Windows only).

## 10. OGDF (OGDF GML)

Source: `src/ogdf/basic/LayoutStandards.cpp:38-45` and `include/ogdf/basic/graphics.h:410-413`,
ogdf/ogdf `master` (commit 1a40505ac006); local `src/ogdf-LayoutStandards.*`.

Node 20 x 20 `Rect`, fill White, stroke Black width 1.0 solid; edge stroke Black width 1.0, arrow
`Undefined` (left to the writer / graph direction).

## 11. NetworkX (NetworkX node-link JSON)

Version: networkx 3.7 (`main`, commit 6da4704cbf32, retrieved 2026-10-11). Source:
`networkx/drawing/nx_pylab.py` (https://github.com/networkx/networkx/blob/main/networkx/drawing/nx_pylab.py),
local copy `tmp/style-impl-core/nx_pylab.py`. `draw_networkx` and its helpers state every value as
a keyword default, and the newer `display()` states the same values in one `defaults` table
(lines 533-575), so the two drawing paths agree.

How the writer is recognized: `node_link_data` writes the keys `directed`, `multigraph`, `graph`
and `nodes`, plus `edges` (3.4 and later) or `links` (earlier)
(`networkx/readwrite/json_graph/node_link.py` lines 32, 127-129). A d3 node-link file has only
`nodes` and `links`, so the three extra keys identify NetworkX. NetworkX's GraphML and GML writers
leave no signature (no generator comment, no `Creator` line), so those files get no defaults.

| Property      | Value                                                                                                                                                     | nx_pylab.py line |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Node fill     | `#1F78B4`, alpha 1                                                                                                                                        | 1378, 549        |
| Node shape    | `o` (circle)                                                                                                                                              | 1379             |
| Node size     | `node_size` 300, a marker AREA in points squared (matplotlib `scatter`), so a diameter of sqrt(300) = 17.3205 points                                      | 1377             |
| Node border   | not added: `edgecolors` None (`display()`: `"face"`, the fill color), so no visible border                                                                | 1386, 551        |
| Node label    | `#000000` (`"k"`), 12, `sans-serif`, normal weight, centered                                                                                              | 2142-2149        |
| Label content | not added: `draw_networkx` labels every node with its id (`with_labels=True`, line 1184) but `draw` does not, and nothing in the file says which was used | 1184             |
| Edge color    | `#000000` (`"k"`), alpha 1                                                                                                                                | 1768, 568        |
| Edge width    | 1.0 points                                                                                                                                                | 1767             |
| Edge style    | `solid`                                                                                                                                                   | 1769             |
| Edge arrows   | `-\|>` (a filled triangle at the target) for a directed graph, `-` (none) for an undirected one                                                           | 1848-1849        |
| Edge label    | `#000000`, 12, `sans-serif`, normal                                                                                                                       | 555-559          |
| Background    | not added: it is matplotlib's figure color, not NetworkX's                                                                                                | --               |

## 12. Tools left out, and why

- **igraph** (GML `Creator "igraph version ..."`, GraphML). The `Creator` line is written by
  igraph's C core (`src/io/gml.c` lines 950-958 in igraph/igraph `master`), which both front ends
  share, and the R and Python front ends draw with different defaults: python-igraph's `plot`
  draws vertices red, size 20, black frame 1, labels black 14 `sans-serif`, edges `#444` width 1
  (`src/igraph/drawing/cairo/vertex.py` `VisualVertexBuilder` and `edge.py` lines 53-61,
  igraph/python-igraph `main` commit 6188691e703f, package 1.0.0), while R igraph's `plot` draws
  vertices in the first palette color, size 15, labels `darkblue`, edges `darkgrey`
  (`R/plot.common.R` lines 4890-4932, igraph/rigraph `main` commit b4a4d3381d5a). A file says
  which C library wrote it, not which program drew it, so igraph files get no defaults.
- **Neo4j Browser** (Neo4j CSV). Neo4j Browser assigns node colors from a palette in the order it
  first sees each label (`findAvailableDefaultColor`, `src/neo4j-arc/graph-visualization/models/GraphStyle.ts`
  lines 269-280 and 357 in neo4j/neo4j-browser `master`), so the same file is drawn with
  different colors depending on the query and the user's saved style; there is no fixed default to
  apply. A Neo4j CSV file is an import file, not a drawing.
- **NetworkX GraphML and GML**: not recognizable (section 11).
- **Plain CSV, OBO, d3 node-link, JGF, SNDlib and unknown GraphML or GML writers**: these files
  come from data tools, not drawing programs.

## 13. Things the implementation has to decide

1. Derived defaults. Two tools' defaults are not constants: Gephi colors an edge from its source
   node (Overview) or the mix of both ends (Preview), and vis-network colors an uncolored edge
   from its from-node. A constant cannot express these; they need a rule that reads the node
   colors (a layer binding over the edge's source node color), or a choice to use one constant.
   Recommendation: for Gephi use the Overview's rule (the window the author worked in), for vis
   use `inherit: "from"`. Note that Gephi's default Overview IGNORES an edge's own GEXF color; a
   reader that wants "as Gephi shows it" would drop file edge colors, which loses information --
   recommendation: keep file edge colors and use the source rule only for edges with none.
2. Cytoscape desktop's Cytoscape.js export (`generated_by: "cytoscape-..."`) carries no
   stylesheet unless the author exported styles with it. Recommendation: Cytoscape.js defaults
   when the file has a `style`, Cytoscape desktop's "default" style when it does not (that is
   what the author saw).
3. Label CONTENT defaults are part of "looking the same": Graphviz labels every node with its id
   (`\N`), Cytoscape's "default" style labels nodes with the `name` column, vis and sigma show
   only an explicit `label`, Gephi hides labels, Cytoscape.js and yFiles show none.
4. Units differ per tool: Graphviz inches and points, Cytoscape and Cytoscape.js pixels, Gephi
   size units, sigma screen-relative sizes. A default size needs the same unit conversion as the
   file's own sizes.
5. When to apply: only when the writer is identified (section 1). For a format several tools
   write (GraphML, GML, JSON), an unidentified writer gets no defaults.
6. Arrows follow direction in some tools (Graphviz `dir`, Gephi, Pajek arcs) and are a style
   property in others (Cytoscape, Cytoscape.js, yFiles): "default arrow" depends on the edge's
   direction for the first group.
