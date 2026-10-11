# Importing the styles of graph files into graphty

Status: adopted for implementation, 2026-10-11. Nothing here is implemented in a package yet. The
research it rests on (how each format stores styles, the prior art, and what graphty-element's
layers can express) is in `style-import-research.md`. A prototype (the "spike") implemented the
import half outside the packages and was tested on every graph-io conformance fixture, 361 real
files downloaded from the web, thousands of generated hostile inputs, and four adversarial
reviews; its results are in `style-import-results.md` and summarized in section 8. The defaults
each writing tool applies are recorded, with their sources, in `style-tool-defaults.md`.

The owner settled these points on 2026-10-11, and the sections below state them:

- Styles travel in both directions: importing reads a file's styles into layers (sections 1 to
  9), and exporting writes a graph's layers back into every format that can hold them (section 10).
- A property a file leaves unset takes the default of the program that wrote the file, so the
  graph looks as it does there ("Defaults of the writing tool", section 3, and Appendix A).
- No long selectors: a group the file defines is written onto its elements as a short value in a
  per-format namespace, and a layer selects or binds that value (section 5.4).
- graphty-element's `unmapped: "skip"` binding option is approved (section 5.6).
- The graphty app offers a choice to import a file's styles or not (section 11).
- The old style paths are replaced: the GEXF color import in graphty-element and in
  cytoscape-extensions, the yFiles columns, and every other format's private style handling
  (section 12).

## The problem in one paragraph

Graph files carry colors, sizes, shapes, labels, line styles and arrows. graphty-element draws
styles as LAYERS: each layer selects a group of nodes or edges with a selector over their data and
writes style channels, either fixed values or values bound to a data column through a scale;
layers stack bottom to top and the highest layer that writes a channel wins. Many formats store a
style on every node and edge separately. Turning per-element values into one layer per distinct
value would give hundreds of layers for hundreds of nodes, which nobody can manage. This design
gets every file's styles into graphty exactly (or with every approximation reported per element),
with a number of layers that does not grow with the graph, and without ever failing an import
because of a style.

## Requirements this design is held to

1. Every valid input imports without error whatever styles it holds. An unknown, malformed or
   hostile style value is reported and skipped, never thrown on, and never makes the import slow:
   every step is linear in the input, under one counted work budget.
2. The imported layers reproduce what the WRITING TOOL draws, per element, for every property
   graphty can draw, including the tool's own defaults for what the file leaves unset. This is
   checked twice: the layers against the reader's per-element values, and the reader's values
   against the tool itself (Graphviz, Cytoscape.js, an independent implementation of Cytoscape's
   styles) in both directions. Anything approximated or dropped is reported with the property, a
   sample value, a count and the elements it covers.
3. The number of layers is small and independent of graph size: at most 16 layers per element kind
   (nodes, edges) on top of graphty-element's two built-in base layers, label layers included,
   enforced by construction. On the real-file corpus the median is 4 node layers and 2 edge layers.
4. graph-io parses files and graphty-element never does; graphty-element owns layers and drawing
   and stays neutral about presentation; graph-format stays the zero-dependency snapshot; additive
   public API is the team's call, breaking API is the owner's. Every API in this design is
   additive; what would break is deprecated now and removed only in the next major (section 12).
5. Exporting writes every style the graph's layers resolve to into the file, as fully as the
   format can hold it, organized so that importing the file back into graphty rebuilds the same
   layers with the same per-element values. Every style the format cannot hold is reported as a
   coded loss before anything is written, and the graphty app warns the reader before saving.

---

## 1. Findings: how each format stores styles

The owner's hypothesis was that formats store styles per node and per edge, while graphty groups
elements into layers. Measured over the graph-io conformance fixtures and 361 real files downloaded
for this work (sources and licenses in the appendix of `style-import-research.md`):

**The hypothesis holds for how most files are WRITTEN, and fails for what they MEAN.** Storage is
per element in GEXF, GML, XGMML exports, yEd GraphML, Gephi output of every kind, Pajek parameters
and most tool-generated DOT. But the values almost never vary freely: they are a handful of
distinct styles (yEd), or the flattened output of a data mapping the writing tool ran (Gephi's
partition and ranking, Cytoscape's mappings baked into XGMML), and the mapping can be recovered
exactly from the file's own attributes. A second family of formats (CX, CX2, Cytoscape sessions,
Cytoscape.js JSON, DOT defaults and clusters) stores real group-level and data-mapped rules, which
graph-io flattens or ignores today. Truly per-element styles exist, but rarely, and one binding per
property reproduces them exactly regardless of graph size.

| Format                                                        | How styles are stored                                                                                                                                                                                           | Classification                                                                                           | Evidence                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GEXF (viz module)                                             | `viz:color`, `viz:size`, `viz:shape`, `viz:thickness` on each node and edge. No defaults, classes, selectors or mappings exist in the format                                                                    | Per element in storage; mostly MAPPED in meaning                                                         | 51 real files. Most varying colors are an exact function of one attribute (Modularity Class, country, type) or of degree; most varying sizes are linear, or a table, in degree or one attribute. Worst real file: 281 colors on 374 nodes, no explaining column |
| GraphML, yEd / yFiles for Java                                | One complete "realizer" per element (fill, border, shape, label font, geometry, line, arrows). Mapper rules are saved outside the file                                                                          | Per element in storage; GROUP-shaped content                                                             | 1,424 nodes carry 360 distinct node styles, at most 23 per file; 1,124 edges carry 142. Node width and height are truly per element (fitted to labels)                                                                                                          |
| GraphML, yFiles 3 / yEd Live                                  | Per-element style objects, inline or by reference to named shared objects                                                                                                                                       | MIXED: explicit shared groups plus inline duplicates                                                     | 37 edges referencing 36 shared keys resolve to 2 styles, so grouping must compare values, not keys. References can be cyclic in hostile files                                                                                                                   |
| GraphML, Gephi and plain keys (`r g b size`, SocNetV, Chilay) | Per-element data keys, sometimes with key `<default>` values                                                                                                                                                    | Per element; MAPPED (Gephi) or default-plus-exceptions (SocNetV)                                         | Color is a function of one attribute in 13 of 14 multi-color Gephi files                                                                                                                                                                                        |
| GraphML core                                                  | `<key>` with `<default>` plus per-element `<data>`; no style vocabulary                                                                                                                                         | Default plus per element                                                                                 | Primer; only conventions above give it meaning                                                                                                                                                                                                                  |
| XGMML (Cytoscape export)                                      | `<graphics>` on every element with the RESOLVED value of 20 to 55 visual properties; the style itself is not written                                                                                            | Per element in storage; MAPPED in meaning                                                                | Every varying property of every file over 7 elements is a passthrough, discrete table or few-segment linear function of one column                                                                                                                              |
| CX (version 1)                                                | `cyVisualProperties`: defaults, passthrough / discrete / continuous mappings and dependencies per view, plus per-element bypasses                                                                               | Mostly GROUP and MAPPED; bypasses as exceptions                                                          | 69 mappings over 14 real networks; bypasses on pathway anchors and hand-styled diagrams                                                                                                                                                                         |
| CX2                                                           | `visualProperties` (defaults, `nodeMapping`, `edgeMapping`), `nodeBypasses`, `edgeBypasses`                                                                                                                     | Same as CX                                                                                               | 27 real networks, up to 32,077 nodes                                                                                                                                                                                                                            |
| Cytoscape session (.cys)                                      | Named styles (defaults, mappings, dependencies) in `session_vizmap.xml`; per-element locked values in view files                                                                                                | GROUP and MAPPED; bypasses rare                                                                          | 258 of 46,676 real view elements carry a bypass                                                                                                                                                                                                                 |
| DOT (Graphviz)                                                | `[attr=value]` per element; `node [...]` / `edge [...]` defaults scoped to the (sub)graph and to elements created after them; cluster attributes; `colorscheme` palettes; escape sequences and HTML-like labels | MIXED: hand-written files use defaults and clusters, tool output writes every attribute on every element | 16,084 explicit statements against 194 default statements; near-unique values are data drawn as style                                                                                                                                                           |
| GML                                                           | `graphics [...]` and `LabelGraphics [...]` per node and edge; vocabulary differs by writer                                                                                                                      | Per element only; mostly CONSTANT or MAPPED                                                              | One distinct style repeated on every element in 7 of 22 element sets                                                                                                                                                                                            |
| Pajek                                                         | Per-vertex and per-arc parameters (`ic`, `bc`, `x_fact`, `c`, `w`, `p`)                                                                                                                                         | MIXED                                                                                                    | Small distinct counts except one per-vertex size factor                                                                                                                                                                                                         |
| JSON, Cytoscape.js                                            | A stylesheet of `{selector, style}` rules with `data()` and `mapData()`, element `classes`, element `style` bypass                                                                                              | GROUP and MAPPED, with per-element escape hatches                                                        | 2 to 111 rules per real stylesheet; Cytoscape desktop's export writes one rule per discrete value                                                                                                                                                               |
| JSON, graphology / sigma / Gephi export                       | `color`, `size`, `label`, `hidden` per element                                                                                                                                                                  | Per element; MAPPED in Gephi output                                                                      | Node color a function of Modularity Class, size a function of degree                                                                                                                                                                                            |
| JSON, vis.js                                                  | Per-element `color`, `shape`, `size`, `font`, `dashes`, `arrows`                                                                                                                                                | Per element in files (groups usually live in code)                                                       | One real file                                                                                                                                                                                                                                                   |
| JSON, d3 / NetworkX node-link / JGF, CSV, Neo4j CSV, OBO      | No style vocabulary                                                                                                                                                                                             | NO style                                                                                                 | A column named `color` stays data; this design never guesses that a column is a style                                                                                                                                                                           |

What the measurements imply, and what this design builds on:

- **One bound layer per property is always exact and always small.** Binding a property to a
  column that holds each element's own value reproduces any per-element style with one layer. That
  is the correctness floor and the fallback.
- **Recovering the meaning is worth doing.** A layer "fill by Modularity Class, 9 values", "size by
  degree, 27 entries" or "style 3 of 12: fill, shape, border; 14 nodes" is exact AND editable as a
  group; a copy of each element's value is exact but opaque. With the planner below, the share of
  varying real-file values that come from opaque layers is 0 to 25% per format (it was 58 to 100%
  before style classes, degree tables and class membership were added).
- **Formats that store rules must be translated, not re-inferred**, and translated with the
  writing tool's own semantics, which differ in ways that matter: Cytoscape.js compares with `===`
  and resets a failed `data()` to its default; Graphviz draws an unknown color black and treats a
  graph's `colorscheme` as the graph's only; Cytoscape matches a discrete key against a list
  attribute's first matching item.
- **Robustness comes first.** Several VALID real files fail to import today for reasons unrelated
  to styles (section 6.4), in graph-io and in graphty-element's own readers. Requirement 1 cannot
  hold until they are fixed.
- **Value syntax is per dialect, not per string.** `#RRGGBBAA` is alpha-last in yEd and Graphviz
  and alpha-first in yFiles 3; X11 `gray` and `green` are not the CSS colors; Pajek `Green` is a
  dvips CMYK name; Cytoscape has two opacity scales (0..255 and 0..1).

---

## 2. The common style format

### 2.1 Ownership: graph-io

The common format lives in **graph-io**. The types, the canonical value parsers, the planner and
the reference resolver are exported from a new Node-safe subpath, `@graphty/graph-io/styles`; each
format's style reader lives in its own format module, on its importer, so loading one format's
subpath never loads the other twelve readers. Reasons:

- **The parsing happens there.** Turning `#CAECFF84`, X11 `gray`, `rgb(1,0,0)` or a Cytoscape
  `COL=...,K=0=a` string into a value is file parsing, and graph-io is the only package allowed to
  parse files. The description must be produced where the dialect is known.
- **Dependency order.** graph-format sits below graph-io and graph-io below graphty-element, so
  graphty-element can use graph-io's types and functions, and so can cytoscape-extensions, which
  could turn the same description into a Cytoscape.js stylesheet.
- **Not graph-format.** graph-format is a zero-dependency frozen snapshot at 1.x with a slow,
  stable contract. A style vocabulary changes as formats and renderers are added, and the
  description is a derived, interpretive view of a snapshot, not data the snapshot holds.
- **Not inside the snapshot.** The description is computed on demand, so it never goes stale
  against the columns it refers to, and graph-format's wire form needs no change.

graph-format already has the column roles `color`, `size`, `shape`, `thickness` and `hidden`, which
the GEXF importer sets and graphty-element's exporter writes. They are the THIRD vocabulary beside
the neutral properties below and graphty-element's channels, and they relate simply: a role is a
hint an importer puts on a column ("this column is the fill"); a neutral property is what a style
reader produces from any number of such columns, with its dialect applied; a channel is what
graphty-element draws. graph-io supplies a generic role-based reader: an importer that tags a
column with role `color` (or `size`, `shape`, `thickness`, `hidden`) and writes no style reader
gets file styles with no further code. The roles stay; what changes is who reads them. Today the
GEXF importer's role columns are copied into node data by graphty-element and by
cytoscape-extensions, each in its own way; after this work the style reader is the only consumer
that turns them into drawing, and the copies are deprecated or removed (section 12).

### 2.2 How it travels with an import

```ts
// @graphty/graph-io: additive
const result = await importGraph(input, { styles: true }); // or { styles: { toolDefaults: false } }
result.styles; // ExtractedStyles | null, produced by the importer that read the file

// export (section 10): additive
const out = await exportGraph(snapshot, "graphml", { styles: result.styles });
out.losses; // includes W_STYLE_* codes for every style the format cannot hold

// @graphty/graph-io/styles: additive
export interface ExtractedStyles {
    readonly styles: FileStyles; // the small, JSON-serializable description
    readonly columns: StyleColumns; // per-element value arrays the description refers to
    readonly features: StyleFeatures; // candidate explaining columns (attributes, degree), for re-planning
}
export function planStyles(values: StyleValues, features: StyleFeatures, options?: PlanOptions): ExtractedStyles;
export function featuresOf(snapshot: GraphSnapshot, target: "node" | "edge"): StyleFeatures;
export function resolveStyles(
    extracted: ExtractedStyles,
    target: "node" | "edge",
    property: StyleProperty,
): readonly (StyleValue | null)[];
```

- **The importer that read the file supplies its styles.** There is no dispatch on
  `snapshot.meta.sourceFormat`: that string is optional in the importer contract, JSON uses one
  value for every dialect, and an importer registered with `createRegistry()` or wrapped by
  `DataSource.fromImporter` is invisible to a lookup through the default registry. Instead
  `importGraph(input, { styles: true })` calls the reading importer's own `styles` member, and
  `DataSource.fromImporter` calls `importer.styles?.(snapshot, context)` directly.
- **The importer contract has a simple path and an advanced path**:

    ```ts
    interface GraphImporter {
        // ...existing members...
        styles?(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles | null;
    }
    type ImporterStyles =
        // simple: raw per-element values keyed by neutral property, plus the dialect their spelling uses
        | {
              readonly dialect: StyleDialect;
              readonly node?: RawStyleValues;
              readonly edge?: RawStyleValues;
              readonly rawColumns?: readonly string[];
          }
        // advanced: canonical values, declared rules and extra features, for formats that store rules
        | {
              readonly canonical: true;
              readonly node?: ReaderOutput;
              readonly edge?: ReaderOutput;
              readonly graph?: GraphStyle;
          };
    ```

    On the simple path graph-io canonicalizes the values, adds candidate features from the snapshot
    and degree, plans and replays. A third-party importer's whole style support can be one line
    (prototyped in the spike, where it recovers "fill by group" exactly from mixed CSS
    spellings on 300 nodes):

    ```js
    styles: (s) => ({ dialect: "css", rawColumns: ["color"], node: { fill: valuesOf(s.nodes.get("color")) } });
    ```

- **Nothing about an import changes unless a caller asks**: the snapshot, the import report and
  every export are what they are today. Style columns are never written into the snapshot.
- `planStyles` and `featuresOf` are exported because graphty-element re-plans composite channels
  (one node size from width and height, one node opacity from two opacities) with the same planner
  and the same candidate columns; `ExtractedStyles.features` carries them.
- `resolveStyles` is the reference semantics of the format (section 2.6): what each element's
  value is. The tests compare against it, and any consumer can use it to get per-element values.
- Extraction takes an `AbortSignal` in `StyleReadContext`, like the element's other loads. Its cost
  is small (0.24 to 0.39 seconds of reading and 0.05 of planning on a 10,339-node, 33,381-edge
  network, against 1.5 to 7 seconds of import) but a cancel must stop it.

### 2.3 The shape of `FileStyles`

```ts
interface FileStyles {
    readonly version: 1;
    // tool: the program whose defaults were applied ("cytoscape", "graphviz", "yed", "gephi",
    // "graphty" for a file graphty wrote, ...), or null when the writer is not identified
    readonly source: { readonly format: string; readonly dialect: string | null; readonly tool: string | null };
    readonly units: { readonly length: "px" | "relative" };
    readonly graph: Partial<Record<GraphStyleProperty, StyleValue>>; // background
    readonly rules: readonly StyleRule[]; // bottom to top; per property, the last match wins
    readonly notes: readonly StyleNote[]; // everything approximated, dropped or malformed
}

interface StyleRule {
    readonly id: string; // stable within one extraction ("node.defaults", "node.by.Modularity Class")
    readonly target: "node" | "edge";
    readonly role: StyleRuleRole; // OPEN union: "defaults" | "group" | "mapping" | "passthrough" | "exceptions"
    // written by the file, recovered from its values, or the writing tool's default (OPEN union)
    readonly origin: "declared" | "inferred" | "tool";
    readonly where: Predicate;
    readonly set?: Partial<Record<StyleProperty, StyleValue>>;
    readonly map?: Partial<Record<StyleProperty, Mapping>>;
    // one property is written by `set` or by `map`, never both, within one rule
    readonly facts?: StyleRuleFacts; // { elements?, classes?, distinctValues?, reason? }: what the app may explain
    // JSON a consumer attaches for its own round trip, keyed by the consumer's package name
    // (graphty-element keeps its layer spec here, section 10); carried untouched, never interpreted
    readonly ext?: Readonly<Record<string, unknown>>;
}

type Predicate =
    // OPEN union
    | { readonly all: true }
    | { readonly has: ColumnRef }
    | { readonly eq: readonly [ColumnRef, Scalar] }
    | { readonly in: readonly [ColumnRef, readonly Scalar[]] }
    | { readonly and: readonly Predicate[] }
    | { readonly or: readonly Predicate[] }
    | { readonly not: Predicate };

type Mapping =
    // OPEN union
    | { readonly kind: "passthrough"; readonly by: ColumnRef }
    | { readonly kind: "discrete"; readonly by: ColumnRef; readonly table: readonly (readonly [Scalar, StyleValue])[] }
    // a key absent from the table is left to the rules beneath; a list value matches by its
    // first item that has an entry, items compared by their text (Cytoscape's DiscreteMappingImpl)
    | { readonly kind: "continuous"; readonly by: ColumnRef; readonly points: readonly ContinuousPoint[] };
// ContinuousPoint = { at: number; below: StyleValue; value: StyleValue; above: StyleValue }:
// Cytoscape's own model. Between two points, `above` of the left interpolates to `below` of
// the right one (numbers linearly, colors per sRGB channel); below the first point `below`,
// above the last `above`; exactly at a point `value`. Uneven spacing and jumps are allowed.

type ColumnRef =
    | { readonly data: string } // an attribute column of the snapshot, by name
    | { readonly style: string }; // a column in ExtractedStyles.columns, by key

interface StyleNote {
    readonly code: StyleNoteCode; // W_STYLE_* only, exported as a STYLE_ISSUE constant like GEXF_ISSUE
    readonly params: {
        readonly property: string | null;
        readonly target: "node" | "edge" | "graph" | null;
        readonly count: number;
        readonly samples: readonly string[];
    };
    readonly elements?: readonly number[] | { readonly count: number }; // which elements the note covers
    readonly message: string; // graph-io's English, for graph-io's own report; never passed on by graphty-element
}
```

- **Evolution rule.** Every union above (`role`, `Predicate`, `Mapping.kind`, `StyleProperty`,
  enumeration values, note codes) is OPEN, as graphty-element's `Selector` already is. A consumer
  skips a member it does not know, with a note, and never throws; graphty-element validates a
  `FileStyles` it did not produce. `version` changes only when the meaning of an existing
  construct changes. Likely additions (a `labelBackground` property, a `range` predicate, a `bins`
  or `stops` mapping) are additive.
- **Facts, not words.** A rule's `facts` say how many elements a class holds, how many distinct
  values a copied column has, and why a rule is opaque (`NO_EXPLANATION`, `STYLE_CLASS`,
  `LAYER_CAP`). graph-io's English `message` exists only for graph-io's import report; the app
  writes its own words from codes and params.
- **Notes name their elements.** A note that excuses a difference between the file and what
  graphty draws (an approximation, a value with no counterpart, a capped label style) records the
  element indexes it covers, so a test excuses exactly those elements and nothing else.
- **Predicates are short; groups are values.** A reader or the planner emits only `all`, `has`,
  `not has`, `eq`, and `in` with at most 8 values, combined with at most one `and`: 8 terms at
  most. A group the file defines any other way (a Cytoscape.js selector list, a set of ids, a
  `.class` test, a DOT cluster, an inferred style class) is evaluated once, at import, into a
  STYLE COLUMN: a per-element value in `ExtractedStyles.columns` (a class number, or true for
  members), and the rule selects it with `has` or binds it with a table. A selector with
  thousands of terms is never built: the import writes the answer onto the elements instead.
  Style column keys are generated by graph-io (`class`, `member.3`, `exceptions.fill`,
  `copy.fill`); file text never becomes a key, and the facts map each number back to the file's
  own name (`member.3` is the class `kinase`).

| What the file has                                                                                                                                                         | Rule                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A default (a Cytoscape default, a GraphML key `<default>`, a constant inferred on every element, a Cytoscape.js rule selecting all nodes)                                 | `role: "defaults"`, `where: { all: true }`, `set`                               |
| A group (a Cytoscape.js `.class` or `[attr = v]` rule, a vis group, an inferred style class, the elements missing an attribute)                                           | `role: "group"`, a predicate, `set`                                             |
| A data mapping (Cytoscape discrete / continuous / passthrough, `mapData()`, `data()`, a recovered partition, ranking or degree table, a run of collapsed per-value rules) | `role: "mapping"`, `map`                                                        |
| Per-element values with no structure                                                                                                                                      | `role: "passthrough"`, passthrough mappings over a raw column or a style column |
| Exceptions (Cytoscape bypasses, Cytoscape.js `style` field, the elements an inferred rule gets wrong, a failed mapper's reset)                                            | `role: "exceptions"`, top of the stack, passthrough over SPARSE style columns   |

The description is small by construction: rules are bounded (section 4.6), tables over 256 keys
present become precomputed columns in the element, and every per-element value lives in `columns`.

### 2.4 The neutral property vocabulary, values, units and colors

| Property                                                      | Target     | Value                                                                                                                                                              |
| ------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fill`, `borderColor`, `labelColor`                           | node       | color                                                                                                                                                              |
| `fillOpacity`, `opacity`                                      | node       | number 0..1 (`opacity` = the whole element; `fillOpacity` = the fill alone)                                                                                        |
| `width`, `height`, `borderWidth`, `labelSize`                 | node       | length                                                                                                                                                             |
| `shape`                                                       | node       | `ellipse`, `rectangle`, `round-rectangle`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, `none`, `other:*` |
| `borderStyle`                                                 | node       | `solid`, `dashed`, `dotted`, `dash-dot`, `double`, `other:*`                                                                                                       |
| `label`, `tooltip`, `labelFont`                               | node, edge | text                                                                                                                                                               |
| `labelWeight`                                                 | node, edge | `normal`, `bold`                                                                                                                                                   |
| `labelItalic`                                                 | node, edge | boolean                                                                                                                                                            |
| `labelPosition`                                               | node       | `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`                                                                 |
| `image`                                                       | node       | URI text                                                                                                                                                           |
| `visible`                                                     | node, edge | boolean                                                                                                                                                            |
| `color`, `sourceArrowColor`, `targetArrowColor`, `labelColor` | edge       | color                                                                                                                                                              |
| `opacity`                                                     | edge       | number 0..1                                                                                                                                                        |
| `width`, `labelSize`                                          | edge       | length                                                                                                                                                             |
| `arrowSize`                                                   | edge       | factor (1 = the tool's normal size)                                                                                                                                |
| `lineStyle`                                                   | edge       | `solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`, `double`, `zigzag`, `sinewave`, `other:*`                                                                    |
| `sourceArrow`, `targetArrow`                                  | edge       | `none`, `triangle`, `triangle-open`, `vee`, `tee`, `diamond`, `diamond-open`, `circle`, `circle-open`, `square`, `crow`, `half`, `inverted`, `other:*`             |
| `curved`                                                      | edge       | boolean                                                                                                                                                            |
| `sourceLabel`, `targetLabel`                                  | edge       | text                                                                                                                                                               |
| `background`                                                  | graph      | color                                                                                                                                                              |

Canonical values, applied by every style reader before anything else, so equality, grouping and
the verification all compare one spelling. Every reader output is type-checked per property
against this table before planning; a value of the wrong type is a note, never a truth.

- **Color**: lowercase `#rrggbb`. Alpha moves to the property's opacity (`fill` alpha to
  `fillOpacity`, edge `color` alpha to edge `opacity`), multiplied with any opacity the file also
  states; on a property with no opacity (an outline, a label color) the alpha is dropped and noted
  per element. Each reader resolves names in its dialect's namespace: X11, SVG and Brewer schemes
  for DOT, dvips CMYK names for Pajek, Java names for Gephi and Cytoscape, yFiles constants for
  yFiles 3, CSS for Cytoscape.js and vis.js.
- **Number and length**: 6 significant digits (rounding to 0.01 changed real GEXF sizes by up to
  0.5%). DOT inches are multiplied by 72; GEXF and Pajek size factors set `units.length` to
  `"relative"`.
- **Opacity**: 0..1 at 6 significant digits (Cytoscape's 0..255 transparency divided by 255).
- **Text**: as the tool draws it. DOT escape sequences are applied the way Graphviz does (section
  3); an HTML-like label keeps its text, its markup is dropped and noted per element; a record
  label keeps its fields joined with " | " and is noted.
- **Enumerations**: matched case-insensitively against each dialect's aliases; an unknown value is
  kept as `"other:<raw>"` and noted.
- **Length limit**: a number, color, enumeration or mapper expression longer than 256 characters is
  noted as `W_STYLE_VALUE_TOO_LONG` and not parsed. Text is copied, never pattern-matched.

### 2.5 Loss notes

Notes are aggregated, never one per element in the description: one note per (code, target,
property), with up to 8 samples, a total count and the covered elements. Parse problems the
importer already reports stay in its `ImportReport`. Every style problem is a warning: none counts
toward an import's `errorLimit`.

### 2.6 Semantics (what `resolveStyles` computes)

For one element and one property: walk the rules from the top; the first rule whose `where`
matches and that writes the property with a non-null result gives the value. A passthrough whose
column holds null, a discrete mapping whose key is absent, and a continuous mapping over a missing
or non-numeric value give no result, so the walk continues. If no rule gives a value the element
has no file style for that property, and whatever the consumer draws by default applies. This is
graphty-element's own rule ("last writer wins, missing skips"), so translation is a one-to-one walk.

Not every tool behaves that way, and the reader models the tool, not the format: Cytoscape.js
resets a property whose `data()` or `mapData()` fails to the Cytoscape.js DEFAULT, not to the rule
beneath. The reader computes the default as that element's value, and the replay (section 4.5)
writes it into the exceptions column, so the description stays "missing skips" and the result is
what Cytoscape.js draws.

---

## 3. The extraction pipeline, per format

Every style reader produces, per element kind, the declared rules translated from the file, the
TRUTH (each element's canonical value per property, as the writing tool draws it, null where the
tool draws its default), and candidate feature columns. The planner (section 4) then explains the
per-element values; declared rules are never re-inferred.

| Format                                           | Declared rules translated                                                                                                                                                                                         | Per-element values (truth)                                                                                                                           | Notes on the tool's semantics                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CX2                                              | defaults; `nodeMapping` / `edgeMapping` to mappings (discrete keys by the attribute's type, continuous intervals to points); dependencies applied (`nodeSizeLocked`, `arrowColorMatchesEdge`); network background | Cytoscape's resolution: bypass over mapping over default                                                                                             | a discrete mapping over a list attribute takes the first item with an entry                                                                                |
| CX (version 1)                                   | the first view's `cyVisualProperties`, the definition strings parsed into Maps keyed by index (an index never becomes an array length; one beyond the definition is ignored and noted)                            | as CX2                                                                                                                                               | 5 views in one file: graph-io imports the first, the others are noted                                                                                      |
| Cytoscape session                                | the style named by the imported view, from `session_vizmap.xml`                                                                                                                                                   | as CX2                                                                                                                                               | graph-io keeps the vizmap text in `meta.extra.cys` (an importer addition)                                                                                  |
| XGMML                                            | none (Cytoscape writes resolved values)                                                                                                                                                                           | every leaf of `<graphics>`, walked with an explicit stack and a depth limit                                                                          |                                                                                                                                                            |
| Cytoscape.js JSON                                | the stylesheet, in order (below)                                                                                                                                                                                  | Cytoscape.js's cascade over the RAW element JSON                                                                                                     | the element `style` field is a bypass over every rule                                                                                                      |
| DOT                                              | none (defaults are flattened by graph-io; scopes are not tracked)                                                                                                                                                 | the flattened attributes read with Graphviz's rules (below)                                                                                          | cluster membership is offered to the planner as a feature                                                                                                  |
| GEXF                                             | none                                                                                                                                                                                                              | viz color (with alpha), size, shape, thickness                                                                                                       | GEXF 1.0 `attvalue id=` read into a Map (an attribute titled `__proto__` is a column like any other)                                                       |
| GraphML yEd / visone                             | key `<default>` values                                                                                                                                                                                            | every realizer type: fill (`hasColor="false"` and `transparent="true"` mean no fill), border, shape, geometry, labels, edge line, arrows, curve kind | the label is the first VISIBLE `NodeLabel` with text (icon nodes put an empty `hasText="false"` label first); further visible labels are noted per element |
| GraphML yFiles 3                                 | key `<default>` objects; `SharedData` resolved by value                                                                                                                                                           | resolved per-element style objects                                                                                                                   | references resolved with a depth limit of 16; a cycle is a `W_STYLE_REFERENCE_CYCLE` note; nested graphs walked without recursion                          |
| GraphML Gephi / plain keys                       | key `<default>` values                                                                                                                                                                                            | `r`/`g`/`b`, `size`, `label`, only when the dialect is detected                                                                                      |                                                                                                                                                            |
| GML                                              | none                                                                                                                                                                                                              | `graphics` and `LabelGraphics` per writer dialect                                                                                                    |                                                                                                                                                            |
| Pajek                                            | none                                                                                                                                                                                                              | vertex shape, `ic`, `bc`, `bw`, `x_fact`, `y_fact`, `lc`, `fos`; arc `c`, `w`, `p`                                                                   |                                                                                                                                                            |
| JSON graphology / sigma / vis.js                 | none (vis `options.groups` to group rules when kept)                                                                                                                                                              | per-element keys                                                                                                                                     |                                                                                                                                                            |
| d3, NetworkX node-link, JGF, CSV, Neo4j CSV, OBO | none                                                                                                                                                                                                              | none                                                                                                                                                 |                                                                                                                                                            |

**Cytoscape.js**, measured against real Cytoscape.js 3.34 (section 7.2):

- Selectors are parsed with Cytoscape.js's grammar, by index and in linear time: groups, `#id`,
  `.class`, `[a]`, `[^a]`, `[?a]`, `[!a]`, `[a op v]` with `=`, `!=`, `<`, `<=`, `>`, `>=`, `*=`,
  `^=`, `$=` and the case-insensitive `@` forms, states, comma lists and the `>` / descendant /
  `$` compound forms, and the metadata tests `[[degree > 2]]`, `[[indegree = 0]]` and
  `[[outdegree ...]]`, evaluated over the degree features the planner already computes. Tests
  repeated within one part are counted once. An INVALID selector matches every element in
  Cytoscape.js (measured), and the reader does the same; an empty one matches none.
- The stylesheet may be an array of `{selector, style}` objects or a CSS-like STRING; Cytoscape.js
  applies both, through `cy.json` and its constructor, so the reader parses both.
- Comparisons are Cytoscape.js's: `=` is `===` (numeric `1` and string `"1"` differ), `!=`
  negates even for a missing field, inequalities coerce like JavaScript and never match a missing
  field, `[a]` means defined (an explicit `null` included), `[?a]` is JavaScript truthiness.
- They run on the RAW element JSON, not on graph-io's columns, which turn a column of mixed types
  into strings.
- Each rule becomes a FileStyles rule whose predicate selects EXACTLY the same elements: a readable
  predicate when graph-io's column holds the raw values unchanged (`[type = 'protein']`,
  `.kinase`, `#n3`), else a membership column holding the selector's own result. A class test is
  a membership column per class (`node.class.kinase`), never a comparison of the whole class list.
- Runs collapse exactly: consecutive rules selecting everything become one defaults rule;
  consecutive `.class`, `#id` or `[a = v]` rules that only set values become ONE mapping rule, keyed
  per property by the class, id or value of the last rule in the run that matches the element (the
  cascade's winner), so 40 class rules become 4 layers and Cytoscape desktop's one-rule-per-value
  export becomes one table. Where the attribute itself gives the same answer the table is keyed by
  the attribute and no column is added.
- `data()` and `mapData()` are parsed by the position of their parentheses, never by a
  backtracking pattern. `mapData` needs a number; a failed mapper resets the property to the
  Cytoscape.js default (read from Cytoscape.js itself and kept as a table). A `mapData` with a zero
  or reversed range, and a percentage such as `width: 50%`, are evaluated the way Cytoscape.js
  draws them, not dropped; anything the reader cannot evaluate is noted per element, never with one
  note for the whole property.
- `text-valign` and `text-halign` combine into `labelPosition` (Cytoscape.js defaults top, center).
- The cascade is indexed: one-test selectors (`[a = v]`, `.c`, `#id`) are looked up in per-value
  indexes, so a 20,000-rule desktop export costs one pass, not rules times elements.

**Graphviz**, measured against `dot` 2.43 (`-Txdot` and `-Tplain`, section 7.2):

- Labels: a node with no `label` shows its name (`\N`). Escapes are applied in Graphviz's two
  passes: first `\N`, `\G`, `\E`, `\T`, `\H` are substituted, then `\n`, `\l`, `\r` break the line
  and any other escaped character stands for itself. A `point` draws no label. A node named by an
  HTML string shows that string's text. Graphviz 2.43 marks HTML on a pooled string, so a quoted
  label equal to an HTML label's content elsewhere in the file also draws as HTML.
- Fills: `point` is always filled (`fillcolor`, else `color`, else black); `filled` and `radial`
  fill any shape, `striped` only boxes, `wedged` only ellipses; an empty `fillcolor` falls back to
  `color`, then light gray. Style tokens are split on commas; blanks before a token are skipped,
  blanks after it make it unknown.
- Colors: a `colorscheme` applies to the attributes of its own object only (a graph's to
  `bgcolor`); `/scheme/name` names a scheme for one value and `//name` means the current scheme;
  scheme names ignore case; a non-X11 scheme is searched INSTEAD of X11, and an unknown scheme
  falls back to X11; only `#rrggbb` and `#rrggbbaa` (no 3-digit form); HSV parts are clamped and
  truncated; `transparent` is `#fffffe` with alpha 0; leading blanks are skipped, trailing ones are
  not, and names keep their inner spaces (`Light Grey` is unknown). An unknown color is drawn
  BLACK, so it becomes black and is noted. `none` and `invis` are transparent, not unknown. A
  color LIST (`red:blue`) is not read as its first color: where Graphviz draws a list as a line
  or outline color, or as `fontcolor`, it draws black (measured with `dot -Txdot`); gradients and
  parallel edge lines are approximated by their first color and noted.
- Outlines: `plain`, `plaintext` and `none` draw none.
- Sizes: `width` and `height` are exact only with `fixedsize`, an empty label (not on a record),
  or a `point` (which takes the smaller); circles take the larger. Otherwise they are MINIMUMS
  that Graphviz grows to fit the label: they are carried and noted per element as
  `W_STYLE_SIZE_MINIMUM`. `shape=plain` has no size of its own.
- `setlinewidth(n)` in `style` is a pen width; a negative or malformed `arrowsize` is noted.
- No default-scope tracking: inference alone reproduces every DOT file, and a scope column would be
  written by every exporter. Cluster membership is offered to the planner as a feature, so 40
  clusters with 40 `node [fillcolor=...]` defaults become one "fill by cluster" layer.

Rules for every reader:

- **Translate before inferring, and keep the order the file defines.** Cytoscape precedence (bypass
  over mapping over default) becomes rule order: defaults at the bottom, mappings above, the
  exceptions rule on top.
- **A declared rule the reader cannot translate exactly is translated as far as it goes and noted.**
- **Several views or styles in one file**: the reader follows the view graph-io imported and notes
  how many others were skipped.
- **Geometry and state are not styles**: positions, bends, z order, label offsets beyond the nine
  anchors and selection paint are noted, not carried.
- **Visibility and background** are carried (`visible`, `graph.background`); graphty-element puts
  them in its visibility mask and its configuration.

**Defaults of the writing tool.** A file states only what differs from its writer's defaults, or
less: a Cytoscape session omits what the style leaves unset, a DOT file draws every node as an
unfilled black ellipse labelled with its name unless it says otherwise, a yFiles 3 file writes only
what differs from the style's defaults. Drawn with graphty's own defaults instead, the graph would
not look as it does in the program that made it. So each style reader identifies the writing tool
and adds that tool's defaults for every property the file leaves unset. The values, their sources
and how each writer is recognized are in Appendix A and `style-tool-defaults.md`. The rules:

- **One rule at the bottom.** The defaults become one rule, `role: "defaults"`,
  `origin: "tool"`, id `<kind>.tool-defaults`, below every declared and inferred rule. The truth
  the planner explains stays the file's own values; the replay compares the resolved stack with the
  file's value where the file has one and with the tool's default where it has none.
- **Only when the writer is identified.** A format only one tool writes (CX, CX2, XGMML and .cys
  for Cytoscape desktop; DOT for Graphviz; GEXF for Gephi) always gets its defaults. A format many
  programs write (GraphML, GML, JSON) gets them only when the file names its writer (the `y:`
  namespace, `Creator "yFiles"`, `generated_by: "cytoscape-..."`, Cytoscape's `SUID` key, and the
  other signatures in Appendix A). An unknown writer, and every format with no drawing tool (CSV,
  Neo4j CSV, OBO, d3 and NetworkX node-link, JGF), gets none.
- **Cytoscape has two sets.** CX, CX2, XGMML and Cytoscape's GraphML and GML start from Cytoscape's
  "default" style (light blue `#89D0F5` round rectangles 75 x 35, gray `#848484` edges 2 wide, node
  labels from the `name` column). A session starts empty and falls back to Cytoscape's renderer
  values (red `#C80000` ellipses, `#404040` edges 1 wide). Cytoscape desktop's Cytoscape.js export
  gets the "default" style when it carries no `style` (what its author saw) and Cytoscape.js's
  defaults beneath its stylesheet when it does.
- **Label content is a default too.** Graphviz labels every node with its name, Cytoscape's
  default style labels nodes from `name`; these become passthrough rules in the defaults. Tools
  that hide labels or show only an explicit label (Gephi, vis-network, sigma, Cytoscape.js, yFiles)
  add no label rule.
- **Defaults that are rules.** Gephi and vis-network color an edge that has no color from its
  source node. The reader keeps every edge color the file gives and, for edges with none, writes the
  source node's resolved fill into a style column bound by the defaults rule; the value is fixed at
  import and does not follow later recoloring, which a note on the rule says. Arrows follow
  direction in Graphviz, Gephi and Pajek: their default target arrow is a group rule on the
  directed edges only (the style column `directed`), never on undirected ones.
- **Units.** A default is converted like the file's own values (Graphviz inches and points to
  pixels, Gephi and Pajek size factors as `relative`), so the `lengths` option of section 5.2
  scales both alike.
- **Unverified values are left out.** Where no primary source states a default (yEd's 30 x 30 node
  size, Pajek's vertex fill and size, yFiles 3's node size), the reader adds no default for it; the
  table marks each one.
- **A file graphty wrote names graphty as its tool**, and its defaults are the ones the file's own
  style block records (section 10), never a guess.
- **The choice is the consumer's.** `importGraph(input, { styles: { toolDefaults: false } })` and
  graphty-element's `styleOptions.toolDefaults: false` leave the defaults out, for a consumer that
  wants the file's explicit styles over its own theme. The default is on: drawing a file as its
  program does is what importing its styles means.

---

## 4. The inference algorithm for per-element styles

### 4.1 Input and output

For one element kind with n elements: P properties, each with a canonical value array (null where
the tool draws its default); the declared rules already translated; and candidate features (the
file's attributes, the cluster a node sits in, the reader's own membership columns, and degree:
undirected, in and out). Output: rules appended above the declared ones, and their columns.

### 4.2 Step 1: exact equivalence classes

- Intern every property's values and compute its PARTITION of the elements (null is a value of its
  own). Group properties with identical partitions into FAMILIES; a family is explained once.
- A property that is non-null and constant on every element goes to the defaults rule.
- Consecutive declared rules that select everything and only set values are merged into one
  defaults rule first (later wins), which is exact.

### 4.3 Step 2: candidate explanations per family

1. **Discrete mapping on one categorical feature A** (a string, integer, boolean or reference
   column, and degree): A's blocks fall inside the family's blocks, up to 20% of the styled
   elements excepted (the hand-recolored nodes of a "color by type"). A has 2 to `min(256, nF/2)`
   distinct values and is not near-unique. It may never paint an element the file left unstyled.
   When the elements MISSING A share one style and no unstyled element is missing A, they become
   their own group rule (`not has(A)`: Gephi's "null" partition), instead of exceptions.
2. **Continuous mapping on one numeric feature X**: the fewest linear pieces (at most 8, each
   explaining at least 3 distinct inputs), exact first; else within the rounding the writing tool
   did per element (2/255 per color channel, 1e-5 relative for numbers), with the elements that
   differ listed in a `W_STYLE_RAMP_ROUNDED` note. Integer columns that enumerate a range (an id, a
   z order) are not quantities.
3. **Passthrough on an existing attribute**: a column whose canonical value equals the style on
   every element. A passthrough on the RAW style column the reader read recovers nothing, so it
   joins the opaque pool of step 4 and is used only when no class applies.
4. **The opaque pool: joint style classes, else a copy.** The families nothing explains are pooled
   per kind. Over their non-text, non-size properties, each distinct joint tuple is a STYLE CLASS
   (a column `class` holding 1..k by frequency). With k at most 64 and at least 2 elements per
   class on average: up to 4 classes (and about 4 elements per class), one group layer per class
   ("style 3: fill, shape, border; 14 nodes"); 5 to 64 classes, one discrete layer keyed by the
   class column, edited one entry per class. Above that, or for text and sizes, one passthrough
   per property over a copy of the values. 82% of real element sets have at most 8 distinct tuples.

### 4.4 Step 3: choose by cost

```
cost = 50 * layers + entries + (exceptions ? 50 + exceptions : 0) + 50 * bucket + 200 * opaque
```

The cheapest candidate wins; ties go to fewer layers, then discrete over continuous. Text is never
explained by another column's table. No mapping is tried below 8 styled elements, and coordinates
and Cytoscape's selection state are never features: each guard removed an exact but meaningless
explanation found in a real file ("fill linear in the y coordinate").

### 4.5 Step 4: merge, order, exceptions

- Families explained by the same column and mapping kind merge into one rule.
- Order bottom to top: declared rules, inferred defaults, group rules (classes, missing buckets),
  mappings, passthroughs, exceptions.
- **The replay.** After the plan is built, every element and property is resolved and compared
  with the truth. Any mismatch (a hand edit, a failed Cytoscape.js mapper's reset, a floating-point
  edge) moves that element's value into ONE sparse exceptions column per property, bound by one
  exceptions rule on top. An inferred rule may never give a value to an element the truth leaves
  null; the planner rejects such candidates, and the check fails if one slips through.

### 4.6 The guarantees

- **Exact by construction, checked by replay.** Exactness never depends on the inference being
  right; the inference only decides how readable the result is.
- **One bound, enforced where layers are made.** At most 16 layers per element kind in
  graphty-element, label layers included:
    - the planner caps the rules at 15 plus the exceptions rule. Over the cap it moves the least
      readable rules into the style passthrough with each property's FINAL values (exact; never a
      silent delete), so the cap is always reachable;
    - label typography gets at most 8 layers per kind (section 5.6), inside the 16;
    - the element's translation then FOLDS: if a kind still has more than 16 layers (a rule split by
      narrowed selectors, re-planned composite channels), the least readable layers are folded into
      one passthrough layer placed where the topmost of them was, holding per element and channel
      what the stack segment they spanned resolved to. That is exact for any choice of layers, so the
      bound holds by construction, not by measurement.
- **Measured**: median 4 node and 2 edge layers on the real corpus, maximum 15 and 11; over all
  5,808 inputs of the final check, maximum 16 node and 15 edge layers, none over the bound.

### 4.7 Complexity and limits

- One counted work budget (2 x 10^8 operations per kind, never a clock) covers the readers'
  cascades, the planner, translation and the replay. When it runs out, every family not yet
  explained goes to the opaque pool and a `W_STYLE_BUDGET` note says so; the result is still exact.
- Partitions and families: O(n P). Each dependency test: O(n). At most 64 candidate features.
  Continuous fits over at most 4,096 distinct x. Discrete tables are looked up through hash
  indexes, never scanned per element.
- Not attempted, on purpose: conjunctions of two or more attributes (decision trees and lists).
  Finding small ones is NP-hard (Hyafil and Rivest; Rivest), they overfit small graphs, and in
  every measured file one attribute, degree or a style class was the explanation.

### 4.8 Prior art

- Functional dependency discovery and the g3 error: Huhtala et al., TANE,
  https://academic.oup.com/comjnl/article-abstract/42/2/100/344948; Papenbrock et al.,
  http://www.vldb.org/pvldb/vol8/p1082-papenbrock.pdf.
- Testing each data field against each mark attribute for linear and categorical mappings: Harper
  and Agrawala, http://vis-ucb-maneesh.stanford.edu/papers/d3decon/ and https://arxiv.org/abs/1609.05283.
- A layer stack is an ordered rule list: Rivest, decision lists,
  https://link.springer.com/article/10.1023/A:1022607331053; default plus exceptions, Ripple-down
  rules, https://en.wikipedia.org/wiki/Ripple-down_rules; minimum decision trees are NP-complete,
  Hyafil and Rivest, https://doi.org/10.1016/0020-0190(76)90095-8; ordered stylesheet minimization
  is NP-hard, Hague and Lin, https://arxiv.org/abs/1812.02989.
- Fewest linear pieces within a tolerance: Imai and Iri,
  https://link.springer.com/chapter/10.1007/3-540-56279-6_90; O'Rourke, "An on-line algorithm for
  fitting straight lines between data ranges", Communications of the ACM 24(9), 1981,
  https://doi.org/10.1145/358746.358758.
- Choosing a model by description length: Rissanen, https://doi.org/10.1016/0005-1098(78)90005-5;
  Krimp, https://eda.rg.cispa.io/pubs/2006/krimp-siebes,vreeken,vanleeuwen-sdm.pdf.
- Verifying a synthesized program against every example: Gulwani, FlashFill,
  https://doi.org/10.1145/1926385.1926423.
- One rule per distinct value instead of per element: atomic CSS (the style-class form).

The full survey is in `style-import-research.md`.

---

## 5. The hand-off to graphty-element

### 5.1 Who does what

graph-io produces `ExtractedStyles` from the snapshot the element's own reader built. graphty-element
translates it into layers in its own vocabulary, re-plans composite channels with graph-io's
exported planner, folds to the bound, and applies the result. graphty-element never parses a file.

### 5.2 Switching it on

A load choice, beside the existing `directed` and `declareDirection` pattern, and a report:

```ts
interface LoadChoices {
    // ...existing...
    readonly styles?: "file" | "none";          // OPEN union; default "none" keeps today's behavior
    readonly styleOptions?: FileStyleOptions;   // { lengths?: "median" | "file"; shapes?: ShapeTable; labelLayers?: number; toolDefaults?: boolean }
}
interface FormatDescriptor {
    // ...existing...
    readonly styles?: { readonly read: boolean; readonly write: "rules" | "values" | "none" }; // additive catalog fact
}
interface LoadDraft { readonly styles: { readonly declared: boolean; readonly summary: FileStyleSummary } | null; ... }
interface LoadReport { readonly styles: { readonly layers: readonly LayerId[]; readonly notes: readonly CodedFact[] } | null; ... }
```

- Every data source, built-in or third party, declares the styles of what it read (lazily, a
  function, so the cost is paid only when chosen), as it declares direction. The load choice
  decides. A per-data-source option would reach only the 5 formats built with `fromImporter`;
  seven built-in readers are their own classes.
- `LoadDraft` says before the load whether the file carries styles; `LoadReport.styles`, which
  `lastImport()` returns, carries the layers and the notes as `{ code, params }`.
- Turning file styles on by default later changes what every consumer sees and is the owner's
  decision. The graphty app sets `"file"`.
- `styleOptions` are choices another consumer would make differently, so they are options with
  neutral defaults: how lengths are scaled (`"median"`: the file's median node size becomes the
  element's default size; `"file"`: the file's units), the 2D-to-3D shape table, the label
  layer budget (8, at most 16), and whether the writing tool's defaults are added (`toolDefaults`,
  default true; section 3).
- `FormatDescriptor.styles` says, per format in the catalog, whether its reader can carry styles
  (`read`) and what its writer keeps (`"rules"`: the layers come back as layers; `"values"`: only
  per-element values; `"none"`). An application shows a styles choice for exactly the formats with
  `read: true` without keeping a format list of its own, and can warn before a lossy export
  (section 11). A data source registered by a third party declares it like any other descriptor
  field; absent means `{ read: false, write: "none" }`.

### 5.3 The path through the element

1. The data source imports with graph-io as today. **The JSON source routes Cytoscape.js, graphology
   and vis.js documents through graph-io's dialect import** (today it builds a stub snapshot of ids
   and endpoints, so a Cytoscape.js stylesheet never reaches extraction, and all four valid
   Cytoscape.js files of the corpus fail with `E_EMPTY_LOAD`).
2. Extraction runs on the snapshot the element's reader built, and every `ColumnRef.data` is
   resolved through the same `columnsMapping` that produced the records (a helper beside
   `toRecords` in `graph-io-import.ts`), never assumed to be `data.<column name>`: the GraphML reader
   renames `yfiles.*` columns and graphology attributes arrive nested.
3. Inside the `data.import` command, after the records are written, the style columns the rules
   refer to are written onto the records (indexed by node index and by logical edge, so mixed and
   undirected edges the element expands get their own row), the rules are translated, folded to the
   bound, validated layer by layer (a refused layer is left out with a note; `applyTemplate` is
   atomic), and applied. One load is one undo step, and redo does not read the source again.
4. In replace mode the previous file's layers are swept in the same step. In merge mode each load
   has its own import id; its layers carry `templateId = "file:<importId>"`, and every selector is
   ANDed with that load's membership (a provenance column or a kept set), so file B's defaults
   never repaint file A's nodes.
5. `visible: false` goes to the session's visibility mask, `graph.background` to the background
   configuration; neither is a layer.

### 5.4 Translation rules

| FileStyles                     | graphty-element                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a rule                         | one layer (more only when one channel needs a narrower selector), named by the rule id alone, `source: { by: "template", templateId }`. Layers are emitted in RULE ORDER: every layer made from rule i sits below every layer made from rule i+1, whatever pass of the translation made it (composite channels such as size from width and height, and opacity from two opacities, are made in a later pass). The spike broke this and drew ordinary Cytoscape.js stylesheets wrongly (section 8) |
| `role`                         | `kind`: defaults to `"base"`, mapping and group to `"encoding"`, passthrough and exceptions to `"custom"`                                                                                                                                                                                                                                                                                                                                                                                         |
| `where: { all }`               | `{ match: "everything" }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `has`                          | `{ match: "has", path }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `eq`, `in`, `and`, `or`, `not` | `{ match: "expression", where }` built with `quotePath()`. graph-io emits at most 8 terms (section 2.3); a predicate from any other producer with more than 8 terms is evaluated during translation into a style column and selected with `has`, so no emitted selector is longer than 8 terms plus the load scope                                                                                                                                                                                |
| `set`                          | `set` on the mapped channels                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `passthrough`                  | `encode: { channel: { by, scale: "passthrough" } }`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `discrete`                     | `encode: { channel: { by, scale: "passthrough", map, unmapped: "skip" } }`, keyed by the values present; a key the table does not cover is left to the layers beneath by `unmapped: "skip"` (approved by the owner), never by a chain of key comparisons; more than 256 keys present, keys that differ only in type, or list values: a precomputed style column                                                                                                                                   |
| `continuous`                   | two-point linear: a `linear` scale; otherwise the `stops` scale of 5.6; until it exists, values computed with `resolveStyles` into a column, the points kept in `userData`                                                                                                                                                                                                                                                                                                                        |
| `ColumnRef.data`               | the record path the element's reader produced for that column                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ColumnRef.style`              | the path `graphty.style.<namespace>.<kind>.<key>`: a value graphty-element keeps per element, like the note values under `graphty.notes.`, never a key of the element's data record (below)                                                                                                                                                                                                                                                                                                       |

**Style columns in the element: a per-format namespace.** The values a short selector reads (a
class number, a membership flag, an exceptions value, a copied value) are kept by graphty-element
per load, in a namespace named for the file format, the way an algorithm run's values are kept
under its run rather than in the data:

- **Path**: `graphty.style.<namespace>.<kind>.<key>`, for example `graphty.style.gexf.node.class` or
  `graphty.style.cytoscape-js.node.member.3`. `<namespace>` names the file format of the load: the
  graph-io format id (`gexf`, `graphml`, `dot`, `cx2`, ...), or for JSON the dialect
  (`cytoscape-js`, `graphology`, `vis`); a second load of the same format kept
  beside the first in merge mode gets `gexf-2`, and so on. Every such path is built by ONE internal
  helper, `fileStylePath(namespace, kind, key)`; the open proposal to put every value graphty keeps
  per element under one namespaced root (issue #2029) would change that helper and nothing else.
- **Storage**: the values live in the session's file-style store, keyed by load and element id,
  not in the element's data records. So data tables, filters and searches over `data.*`, and the
  attribute columns of an export, never see them, and the export's `graphty.` filter needs no
  exception. They are saved in the project file (an additive section), written in the same
  `data.import` command as the layers (one undo step), and swept with that load's layers on reload
  or replace.
- **Reading**: the selector and binding resolver gives `graphty.style.` paths their own kind beside
  `graphty.notes.` (today a `graphty.` path the element does not know reads nothing, so this is an
  addition).
- **Facts**: `FileStyleOrigin` (5.5) carries, per layer, what each style column means in the file's
  own words as data (`member.3` is the class `kinase`), so an application never parses a path.

Neutral property to channel, with the approximations the element reports as `{ code, params }`:

- Exact: `fill` to `node.color`; `borderColor` to `node.outline`; `label`, `tooltip`; edge
  `color`, `opacity`, `width`, `label`; `lineStyle` solid, dashed, dotted, dash-dot, zigzag,
  sinewave; arrows (target is the head), arrow colors and size; `curved`; arrow captions.
- Approximate (noted per element): 2D shapes to the nearest 3D shape; width and height to one
  `node.size` (the larger); `fillOpacity` times `opacity` to `node.opacity`; lengths through one
  factor per import; `long-dash` and `double` to the nearest pattern; label typography beyond the
  label budget (5.6).
- Dropped (noted per element): `borderWidth`, `borderStyle`, `image`, `labelItalic`, edge
  `tooltip`, and `other:*` values the element has no counterpart for.

### 5.5 Names, order and what the reader sees

- **Order**: `applyTemplate` appends to the TOP of the stack today, so a file's color overrides a
  user layer and a reload stays above layers added since. An additive `TemplateOptions.at`
  (`"top"` by default, `"aboveBase"`, or `{ before: LayerId }`; `styles.add` already takes an `at`)
  lets the import put the file's layers directly above the two base layers.
- **Names**: the rule id alone (`node.by.Modularity Class`, `node.class.3`); a second layer of one
  rule adds `#2`. The facts go in a TYPED field: an exported `FileStyleOrigin`
  (`{ format, importId, ruleId, role, origin, column?, mapping?, entries?, elements?, classes?, distinctValues?, reason? }`)
  read with an exported `fileStyleOf(layer): FileStyleOrigin | null`, so the app never reads
  `userData` by shape. The app writes its own words from those facts ("Colors from the file, by
  Modularity Class (9 values)", "Colors copied from the file: 281 distinct, no column explains them").

### 5.6 graphty-element changes this needs (all additive; each fixes the element, not the import)

Required before file styles ship:

1. **`styles.explain()` must merge label styles field by field**, as the repaint does.
2. **`validate()` and `add()` must refuse a binding on a whole label-style channel.**
3. **`unmapped: "skip"` on a binding** (approved by the owner, 2026-10-11): an element whose key
   the binding's `map` does not hold is left to the layers beneath, instead of today's behavior,
   where with `scale: "passthrough"` an unmapped key that is a valid color name ("green") is
   painted as that color. An optional field whose default keeps today's behavior, so additive.
4. **No long-selector work.** Earlier revisions required n-ary `&&` and `||` parsing because the
   import could emit selectors of thousands of terms (the element's left-deep expression tree
   overflows the stack near 8,000). The import no longer builds such selectors (section 2.3:
   groups become style columns, selectors have at most 8 terms), so this is not a prerequisite.
   The stack overflow on a hand-written 8,000-term expression is an element defect of its own,
   tracked separately and not part of this work.
5. **A `stops` option on continuous scales** (points with number or color outputs, uneven spacing,
   distinct below and above values), so Cytoscape continuous mappings and recovered ramps stay
   editable rules instead of precomputed columns.
6. **Bindable label sub-channels** (label color, size, font, weight, italic). Today label
   typography can only be `set`, so each distinct value needs a layer: the import spends at most 8
   label layers per kind (a declared mapping on one column gets one layer per key; else one per
   distinct tuple; else one per group of fields plus the most common values covering at least
   max(3, 5%) of the labelled elements), and draws the rest as the nearest kept value, noted per
   element. This is the main remaining approximation: 1,230 label values in the real-file corpus
   (12,800 over all corpora with the mutants), almost all label sizes from Cytoscape continuous
   mappings.
7. **Numbers out of a channel's range are counted, not silently clamped**, and node color alpha is
   honored or refused, not dropped.
8. **`TemplateOptions.at`** (5.5) and the typed **`FileStyleOrigin`** (5.5).
9. **The file-style store and its `graphty.style.` paths** (5.4), saved in the project file.
10. **Layers to neutral styles** for export (section 10): the inverse of the translation.

Later, for fewer approximations: node width and height, outline width, flat 2D node shapes, a
`graphty.degree` path, a class-membership operator in the expression language (a `.class` test
without a column), and edge colors derived from the endpoints (Gephi's mixed edge colors).

### 5.7 Editing afterward

- The imported layers are ordinary layers: reordered, disabled, removed, edited. A table is edited
  entry by entry (a style class, a partition value); a continuous mapping by its stops (once 5.6
  item 5 exists); a passthrough can be turned into fixed values with `resolveToStatic`.
- Per-element style values live in the file-style store under `graphty.style.<namespace>.` (5.4),
  saved with the project.
- Reloading a file sweeps that load's layers by its `templateId` in the same command.

---

## 6. Error handling: nothing throws, nothing hangs

### 6.1 Where problems can occur and what happens

| Stage               | Problem                                                                                                                                                                                                                              | Result                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Importer (parse)    | malformed value, unknown enumeration, out-of-range number, unsupported construct                                                                                                                                                     | kept as data where the importer keeps it today, a warning, the element never skipped                                 |
| Style reader        | a value that does not parse in the dialect's namespace, NaN, Infinity, a negative length, a wrong JSON type, a value over 256 characters, a reference cycle, a sparse mapping index, a built-in object name used as a key or a value | the cell is null (or, where the tool does so, the tool's own fallback such as Graphviz's black), one aggregated note |
| Style reader        | a declared rule that cannot be parsed                                                                                                                                                                                                | translated as far as it is valid, else dropped; one note                                                             |
| Planner             | any input                                                                                                                                                                                                                            | a total function: every branch ends in a class, a passthrough or the exceptions; the budget ends in the opaque pool  |
| Replay              | mismatch                                                                                                                                                                                                                             | the element's value goes to the exceptions column                                                                    |
| Element translation | a layer the element refuses                                                                                                                                                                                                          | left out with a note; the other layers still apply                                                                   |

### 6.2 Coding rules for the implementation

The guard of earlier revisions (catch an exception, return no styles) cannot stop a hang, a
prototype write or a stack overflow inside graphty-element, and it turns a crash into "this file
has no styles". These rules make it unnecessary; each was broken by a hostile file of a few
hundred bytes in the spike's robustness review and is now followed there:

1. **No plain object is keyed by file data.** Every lookup table read by a file string is a `Map`
   or a null-prototype object read with `Object.hasOwn`, and every dictionary built from file keys
   (columns, defaults, mappings, discrete maps, attribute titles) is a `Map` or
   `Object.create(null)`; `Object.fromEntries` only at the boundary. A lint rule enforces it.
   (An attribute titled `__proto__` polluted `Object.prototype`; style properties and shapes named
   `constructor` or `toString` threw or became function-valued styles.)
2. **No recursion on file-controlled depth**; references are resolved with a visited set or a
   depth limit, and a cycle is a note.
3. **Length limits before parsing** (256 characters) and **linear parsers**: no pattern whose
   quantifiers compete for the same characters; `data(` and `mapData(` by index.
4. **No spreading of element-sized arrays** into a call (`Math.max(...x)` overflowed the stack at
   about 125,000 values).
5. **Indexes are never array positions** (`K=4294967294=` in a CX definition).
6. **One counted work budget** over readers, planner, translation and replay; the Cytoscape.js
   cascade is indexed by value.
7. **Every emitted selector is short** (8 terms, section 2.3) and every reader output is type-checked.
8. **Tests run every file in its own process under a time limit**, so a hang fails the test.

### 6.3 Size limits

Values over 256 characters are not parsed; at most 8 samples per note; at most 64 candidate
features; discrete tables over 256 keys present become columns; at most 8 selector terms; the work
budget of 4.7; the layer bound of 4.6. No part of `FileStyles` grows with the number of elements.

### 6.4 Valid files that fail today (fix before styles ship)

graph-io, each confirmed against its current source:

- yFiles 3 GraphML (`y:attr.uri` keys, nested `<data>`) exceeds the error limit; GraphML
  `for="graphml"` keys and structured `<data>` under an untyped key are reported as errors.
- GEXF 1.0: edge type `dir`, `pid` naming no node, and `<attvalue id="...">` (graph-io reads only
  `for`, so every attribute value of a GEXF 1.0 file is silently lost; the fix must key attributes
  with a Map).
- Gephi GML (`Creator Gephi` unquoted), OGDF GML (`\"` inside strings); Gephi JSON export misread as
  graphology; Cytoscape.js elements without `data.id`; Pajek trailing `0` and `NaN` arc values; DOT
  `a, b`.
- GEXF colors graph-io drops or misreads (`#rgb`, `#rrggbbaa`, missing channels, `hex` beside `r g b`).
- **Deep XML nesting**: an XGMML file with 20,000 nested `<att>` elements makes `importGraph` reject
  with a bare `RangeError`. The XML readers need a nesting limit reported with a code, like DOT's
  `E_DOT_NESTING`.
- **Numeric endpoint ids**: in NetworkX's Cytoscape JSON, edges name endpoints as numbers (`0`)
  while node ids are strings (`"0"`); Cytoscape.js joins them, graph-io creates a second node per id
  (karate: 68 nodes instead of 34).
- A session's `session_vizmap.xml` is not kept (the style reader needs it in `meta.extra.cys`).

graphty-element's own readers (found by loading every input through `session.data.import`;
requirement 1 applies to them too):

- every Cytoscape.js JSON file with a stylesheet fails with `E_EMPTY_LOAD` (the JSON source does
  not route dialects through graph-io); graphology documents arrive as records holding ids only;
- a GEXF node attribute titled `id` replaces the node id: 117 nodes load as 234, with no error;
  another GEXF file loads 159 nodes instead of 155;
- a Pajek file keeps 132 of its 207 edges; Cytoscape 2.x sessions and a multi-network session load
  a different network than graph-io;
- GraphML `yfiles.*` columns and `parent`, GEXF `label` and suffixed attributes, and CX2 attributes
  named `type` or `color` do not arrive under graph-io's names, so layers reading them are unbound;
- the 7 yFiles 3 files and Gephi's diseasome fail with `E_PARSE_FAILED`;
- two DOT gallery files lose nodes (28 become 24; 2 become 1).

---

## 7. Verification

### 7.1 The exact round trip (graph-io, Node)

For every conformance fixture and real file: import; read styles; plan; translate; then for every
element kind, property and element:

1. the rules resolve to the reader's value exactly, or within a rounding a note names for that
   element;
2. the layers, resolved the element's way, give the expected channel value; a value with no
   counterpart or an approximation passes only when a note covers THAT element and property;
3. no layer paints an element, or a label field, the file left unstyled (label styles compared as
   whole objects, field by field, both ways), except the tool-defaults layer, which paints exactly
   the writing tool's default and is checked against Appendix A per element;
4. the visibility mask equals the elements the file hides;
5. at most 16 layers per kind, distinct layer names, valid selectors of at most 8 terms, user data
   columns unchanged, only `W_STYLE_*` codes, JSON-stable, deterministic.

A committed per-file results table records, besides counts, three measures of MEANING, and a
regression fails: the share of varying values that come from opaque layers, the share from the
exceptions layer, and the declared rules that select nothing. Small element sets report the
absolute layer count beside the ratio.

### 7.2 Checking the truth against the tools that wrote the files

A reader that misreads a file passes 7.1 with a wrong truth, so the truth is checked against the
tool, two-sided (a value the reader missed fails as surely as a wrong one):

- **DOT against Graphviz** (`dot -Txdot`, `dot -Tplain`): node fill, outline, label text, label
  color, shape, width and height (exact or minimum), edge color, line style, and head and tail
  arrows drawn or not.
- **Cytoscape.js against real Cytoscape.js**: every carried property of every node and edge; where
  the reader has no value, the element must look as it does with no stylesheet.
- **CX against an independent implementation**: cytoscape-cx2js, the NDEx team's CX-to-Cytoscape.js
  converter, drawn by real Cytoscape.js; it shares no code with the reader's mapping semantics.
  Where the two disagree, Cytoscape's own source decides (the list rule of 2.3 was settled that way).
- **CX against CX2**: the same NDEx network in both formats, parsed by different code.
- Still open: Cytoscape desktop's own XGMML export of the networks in the session corpus, compared
  per element. The corpus holds no session and export of the same style, and Cytoscape desktop is
  not available here; continuous-mapping edge cases (jumps, equal breakpoints, `includeMin`) and
  `nodeSizeLocked` with a `NODE_WIDTH` mapping are covered by cx2js only for CX version 1.

### 7.3 The element check (graphty-element, Node, through `session.data.import`)

Every file loads through `session.data.import` (the element's own readers, as the app loads it),
and the check asserts: the element holds what graph-io holds; every data column a layer reads
arrives under the same name with the same value; the layers are accepted (none refused, none
unbound); and `explain()` gives every node and edge exactly the predicted value per channel, both
ways (no channel painted by an imported layer that was not predicted), label styles merged field
by field. Until 6.4's element-reader fixes land, the files those defects affect are reported, not
checked. This check compares the element with the translation's own prediction, so it catches a
layer the element draws differently, never a translation that is wrong; that is 7.1's job, and
7.1 needs inputs that exercise it (7.4).

### 7.4 Adversarial inputs

- Mutants of every styled file: one property replaced everywhere by hostile values (empty, NaN,
  `Infinity`, `-1`, `1e308`, broken colors, a 5,000-character string, markup), built-in object
  names (`constructor`, `toString`, `__proto__`), strings shaped against backtracking (runs of
  spaces and digits), sparse CX indexes, and key mutations (style properties, column names and
  mapping keys renamed to built-in names).
- Hostile files: reference cycles, deep nesting, 10,000-key tables with one key uncovered, 100,000
  class tests in one selector, 60 rules on `node`, 20,000 per-value rules, a 300,000-node file with
  a unique integer column, a column named like a style column.
- Stylesheet stress inputs, compared with real Cytoscape.js: adjacent rules that set different
  subsets of the same properties (size and opacity in one rule, color in the next), bisections and
  overlaps of class rules, metadata selectors (`[[degree > 2]]`), and a stylesheet given as a
  string. These found the rule-order defect of section 8, which no corpus file exposed.
- Multi-label yEd nodes (an empty icon label before the visible one), DOT `none`, `invis` and
  color lists, and Cytoscape.js `mapData` with zero or reversed ranges.
- Synthetic worst cases up to 1,000,000 nodes, and series that grow one graph from 50 to 6,000 or
  more nodes to show the layer count does not grow with it.
- Each file in its own process under a time limit.

### 7.5 What counts as done

All of 7.1 to 7.4 pass on every fixture and real file; the oracles of 7.2 show no unexplained
difference; the committed results table shows no kind above 16 layers and no regression in the
meaning measures; and every approximated or dropped value in every file is named by a note covering
its element.

---

## 8. Results of the prototype

A prototype (the spike) implemented this design outside the packages: a style reader per format,
the planner, the translation into graphty-element layers, and the verification of section 7. It ran
on 5,808 inputs: every graph-io conformance fixture, 361 real files downloaded from the web (289
of which carry styles), mutants of every styled file, the hostile files of four adversarial reviews
(correctness, robustness, layer meaning, architecture) and of a final skeptical check, and synthetic
graphs up to 1,000,000 nodes. The full tables are in `style-import-results.md`.

**Requirement 1, no errors: met by the style pipeline, not yet end to end.** 0 exceptions on 5,808
inputs; every hostile file also ran in its own process under a time limit and exited normally (the
slowest in 2.8 s; the 1,000,000-node file in 15.4 s). Two defects outside the pipeline remain, both
in section 6.4: graph-io throws a bare `RangeError` on a deeply nested XGMML file, and
graphty-element's own import path refuses 89 inputs, among them every Cytoscape.js file.

**Requirement 2, exact or noted: met on every corpus, broken by the final check's new inputs.**
On every corpus the layers reproduce the reader's per-element values with 0 mismatches, paint
nothing the file left unstyled, and hide exactly the elements the file hides. The readers agree with
the writing tools, checked in both directions: Graphviz on 142,760 values (9 differences, all
explained), real Cytoscape.js on 146,763 (0 differences), cytoscape-cx2js on 272,530 (683
differences, all explained, mostly an arrow-name choice and one multi-view file), and an
independent XML parse of GEXF and yEd files on about 900,000 values. The real graphty-element,
loaded with the layers, draws 11,749,977 values and 2,812,265 label styles exactly as predicted.

The final check's new inputs found six defects in the spike, each a departure from this design,
which now states each rule explicitly:

1. Layers out of rule order when a rule sets only size or opacity (section 5.4): ordinary
   Cytoscape.js stylesheets such as `node {width:20}` then `.big {width:50}` drew `.big` nodes at
   the default size. The most serious; 357 wrong values in one set of stress files, none noted.
2. The yEd reader took the first `NodeLabel` even when it is an empty icon label (section 3): 15
   nodes in 2 real files lost their only visible label.
3. Cytoscape.js metadata selectors (`[[degree > 2]]`) were treated as invalid (section 3).
4. A Cytoscape.js stylesheet given as a string was ignored without a note (section 3).
5. DOT `none`, `invis` and color lists were drawn black or as their first color (section 3).
6. A `mapData` with a zero or reversed range, and percentages, were dropped with one note per
   property instead of drawn (section 3).

51,534 further values are drawn approximately and noted per element (label typography beyond the
label budget, ramps within the writing tool's rounding), which the requirement allows.

**Requirement 3, few layers: met.** At most 16 node and 15 edge layers on any input; median 4 and 2
on real files; the count stays flat as one graph grows from 60 to 6,000 nodes, or from 2 to 5,000
categories; a 1,000,000-node file needs 2 layers. Of the real files' varying style values, 3.7% come
from an opaque layer (a copy of each element's value) and 0.8% from the exceptions layer; the rest
come from rules a person can edit as groups ("fill by Modularity Class", "style 3 of 12", "fill by
cluster").

**The hypothesis.** Storage is per element in most formats, as the owner expected, but the values
are nearly always a few styles or the flattened output of a mapping on one attribute or on degree,
and the planner recovers that mapping. Where nothing explains the values, one passthrough layer per
property is exact and does not grow with the graph, so per-element storage never forces
per-element layers.

## 9. Open questions

- **Fix order.** The six spike defects of section 8 are rules of the implementation (section 13),
  each with the final check's inputs kept as regression tests; the import defects of section 6.4
  land with the format they belong to, before that format's styles ship, or requirement 1 does not
  hold end to end.
- **Cytoscape desktop's own export.** The Cytoscape readers are checked against an independent
  implementation (cytoscape-cx2js) and against CX2, not against Cytoscape desktop exporting the same
  session. The corpus has no such pair, and Cytoscape desktop was not available. Continuous-mapping
  edge cases (jumps, equal breakpoints) are covered only for CX version 1.
- **One shared work budget.** The planner and the Cytoscape.js cascade count their work against the
  budget of section 4.7; the readers do not yet. Every reader is linear and bounded today, but the
  design asks for one budget across all of them.
- **Layers that mean little.** Colors set by two categories together (100 combinations), more than
  64 combined style classes, and 200 DOT clusters each come out as one exact layer that copies every
  element's value. A pair-of-attributes candidate would give people groups to edit; it is left out
  because finding small conjunctions is NP-hard and no real file needed one.
- **Coincidental mappings.** The planner's guards removed every coincidental explanation found in
  1,936 real and fixture files ("fill linear in the y coordinate"), but cannot prove none remain.
- **Name choices.** Which neutral name a foreign arrow or line style maps to is a judgment call; the
  cytoscape-cx2js check disagrees with one (Cytoscape `ARROW` read as `vee`).
- **Turning file styles on by default** in graphty-element changes what every consumer sees, so it
  is the owner's decision; this design keeps the default `"none"` and the graphty app opts in. The
  same holds for writing styles into exports by default (section 10.6).

---

## 10. Exporting styles

### 10.1 What is written

An export with styles writes three things, each as far as the format can hold it:

1. **The picture**: each element's value for every property, in the format's own style slots, so
   any program that reads the format draws what graphty draws.
2. **The rules**: where the format has a style language of its own (CX, CX2, Cytoscape sessions,
   Cytoscape.js JSON), the layers become rules in that language (defaults, mappings, selectors,
   bypasses), so Cytoscape shows them as a style a person can edit there too.
3. **The graphty style block**: the layer stack as neutral rules (section 2.3), with the
   per-element style values its rules read, so that importing the file back into graphty rebuilds
   the same layers. It is written where the format tolerates extra data and other programs skip
   it (10.3).

Nothing is silently dropped: every style the format cannot hold is a coded loss, reported by a dry
run before anything is written (10.5).

### 10.2 From layers to the file

1. **graphty-element turns its layer stack into `ExtractedStyles`**, the inverse of section 5.4:
    - each layer above the two built-in base layers becomes one rule, in stack order;
    - a selector becomes a predicate when it reads only data columns the export writes or
      `graphty.style.` values and fits the short form of section 2.3; otherwise the layer's
      selection is evaluated into a membership style column;
    - `set` becomes `set`; a binding becomes a mapping (`passthrough`, a `map` table, a two-point
      `linear` scale or `stops`); any other scale (a palette, log, quantile), a calculated value, and
      a binding on a value the file will not hold (an algorithm run's `results.` path) is evaluated
      per element into a style column under a passthrough rule and reported as
      `W_STYLE_LAYER_FLATTENED` with the layer and a reason code: the values stay exact, the layer
      loses its editable form;
    - a channel with a neutral property maps back through section 5.4's table; a channel with none
      (a channel only graphty draws) is carried as an open property `graphty:<channel>`, written only
      into the block;
    - each rule carries the layer's own spec in `ext["@graphty/graphty-element"]`, as
      `applyTemplate` takes it, when every path the layer reads will be in the file, so graphty
      rebuilds the identical layer while every other consumer reads the neutral rule;
    - the two base layers become the defaults of the writing tool: `source.tool` is `"graphty"` and
      the block records the base values, so the file says what graphty drew where no layer applies;
    - the picture of 10.1 item 1 is what the element draws per element, base layers included.
2. **graph-io's style writer for the format** (one per format, beside its exporter) writes the
   picture with `resolveStyles`, translates the rules where the format has a style language, and
   writes the block and the per-element style values (10.3). The writers are graph-io's: the
   element never writes a file.
3. **The block** is JSON: the rules (with `ext`), `units`, `graph`, `source` with the tool's
   defaults, the keys of the style columns, and a fingerprint of the graph it describes (node and
   edge counts and a hash of the node ids in file order). Notes are not written. Its name in every
   format is `graphty.styles`. Per-element style values are written as element attributes named
   `graphty.style.<kind>.<key>`; graphty-element never copies a `graphty.` column into its records,
   so they never reach the element's data. In a format with no per-element attribute for them
   (Pajek), they go inside the block, in file order.

### 10.3 Per format

| Format                          | The picture (native slots)                                                                                                                                                                                                                                 | Rules in the format's own language                                                                                                    | The block                                                                                                                                                                              | Per-element style values      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| GEXF                            | `viz:color` (alpha from opacity), `viz:size`, `viz:shape` (disc, square, triangle, diamond, image), `viz:thickness`, edge `viz:shape` (solid, dotted, dashed, double), label text                                                                          | none                                                                                                                                  | an element in graphty's own XML namespace inside `<meta>`, which GEXF readers skip (verified against graph-io, NetworkX and Gephi's reader; if one rejects it, an XML comment instead) | attributes                    |
| GraphML                         | yEd graphics: `y:ShapeNode` (fill, border color, width and line type, shape, width and height, label text, color, size, font, weight, italic, position), `y:PolyLineEdge` (line color, width and type, arrows, label)                                      | none                                                                                                                                  | a graph `<data>` under its own key                                                                                                                                                     | keys                          |
| GML                             | yEd GML `graphics` (fill, outline, outlineWidth, w, h, type), `LabelGraphics` (color, fontSize, fontName, fontStyle), edge `graphics` (fill, width, style, sourceArrow, targetArrow)                                                                       | none                                                                                                                                  | a graph key, under the GML writer's rule for names that are not GML keys                                                                                                               | node and edge keys, same rule |
| DOT                             | `color`, `fillcolor` with `style=filled`, `shape`, `width` and `height` with `fixedsize`, `penwidth`, `style` dashed, dotted, bold and invis, `arrowhead`, `arrowtail` and `dir`, `fontcolor`, `fontsize`, `fontname`, `label`, `tooltip`, graph `bgcolor` | none                                                                                                                                  | a quoted graph attribute (Graphviz ignores attributes it does not know)                                                                                                                | quoted attributes             |
| Pajek                           | vertex shape keyword, `ic`, `bc`, `bw`, `x_fact` and `y_fact`, `lc`, `fos`; arc `c`, `w`, `p` (Solid, Dots); colors as the nearest Pajek color name                                                                                                        | none                                                                                                                                  | a `%` comment line, which Pajek skips                                                                                                                                                  | inside the block              |
| XGMML                           | `<graphics>` `fill`, `outline`, `width`, `w`, `h`, `type`, and Cytoscape's `cy:` label and arrow properties; edge `fill`, `width`, arrows, line type                                                                                                       | none                                                                                                                                  | a graph `<att>`                                                                                                                                                                        | `<att>` elements              |
| CX                              | `cyVisualProperties` bypasses for what no rule gives                                                                                                                                                                                                       | defaults and passthrough, discrete and continuous mappings over data columns                                                          | an extra aspect (CX readers skip unknown aspects)                                                                                                                                      | node and edge attributes      |
| CX2                             | `nodeBypasses`, `edgeBypasses`                                                                                                                                                                                                                             | `visualProperties` defaults, `nodeMapping`, `edgeMapping`                                                                             | an extra aspect                                                                                                                                                                        | attributes                    |
| Cytoscape session               | view graphics                                                                                                                                                                                                                                              | a style in `session_vizmap.xml` named for the network, which the view's `cy:visualStyle` names (today hard-coded `default`)           | an extra archive entry, which Cytoscape ignores                                                                                                                                        | table columns                 |
| Cytoscape.js JSON               | element `style` bypass for exceptions                                                                                                                                                                                                                      | the `style` stylesheet: selectors from predicates, `data()` for passthrough, `mapData()` for two-point linear, one rule per table key | a top-level key                                                                                                                                                                        | element `data` keys           |
| graphology JSON                 | node `color`, `size`, `label`, `hidden`; edge `color`, `size`                                                                                                                                                                                              | none                                                                                                                                  | a graph attribute                                                                                                                                                                      | attributes                    |
| vis.js JSON                     | node `color`, `shape`, `size`, `font`, `hidden`; edge `color`, `width`, `dashes`, `arrows`                                                                                                                                                                 | group rules as `groups`                                                                                                               | a top-level key                                                                                                                                                                        | element keys                  |
| d3 and NetworkX node-link, JGF  | none (no style vocabulary)                                                                                                                                                                                                                                 | none                                                                                                                                  | a graph attribute                                                                                                                                                                      | attributes                    |
| CSV, Neo4j CSV, OBO, OBO Graphs | none                                                                                                                                                                                                                                                       | none                                                                                                                                  | none: every style is `W_STYLE_NOT_WRITTEN`                                                                                                                                             | none                          |

The catalog fact `FormatDescriptor.styles.write` (section 5.2) is `"rules"` for every format with a
block or a style language, `"values"` for none of today's formats (kept for a third-party writer
with native slots only), and `"none"` for CSV, Neo4j CSV and OBO.

### 10.4 Importing a file graphty wrote

- Every style reader first looks for a graphty block, read by ONE shared parser in
  `@graphty/graph-io/styles` and validated like any file input (size limits, open unions, no
  plain-object keys, the rules of section 6.2).
- **A valid block whose fingerprint matches** the imported graph gives the declared rules, and the
  rules read the tagged per-element values (graph-io maps each style column key to its tagged data
  column; the snapshot is unchanged). The format's native per-element values are still the truth:
  the replay (4.5) moves any element another program edited since into the exceptions rule, so the
  import is exact after an outside edit and, with no edit, gives back the same rules. The tool is
  `"graphty"`, and its defaults are the block's: graphty-element adds a defaults layer only for a
  property whose recorded base value differs from its own base layers.
- **graphty-element** rebuilds each layer from `ext["@graphty/graphty-element"]` when it is present
  and passes the same `validate()` as any layer; otherwise, or when refused (with a note), from the
  neutral rule as in section 5.4.
- **A block that does not parse or whose fingerprint does not match** (a program rewrote the file
  and added or removed elements) is ignored with `W_STYLE_BLOCK_IGNORED` and a reason code, and the
  file is read like any other file of its format.

### 10.5 Losses, reported before writing

graph-io's export result and its dry run (`checkExport` with `styles` given) report, aggregated per
(code, target, property) with a count and up to 8 samples:

- `W_STYLE_NOT_WRITTEN`: the format has no slot for this property and no block (CSV, Neo4j CSV,
  OBO), or no slot at all for it.
- `W_STYLE_APPROXIMATED`: written as the nearest value the format allows (a shape to the nearest
  GEXF shape, a color to the nearest Pajek name, a dash pattern to DOT's `dashed`); the block keeps
  the exact value where there is one.
- `W_STYLE_RULES_NOT_KEPT`: per-element values were written but the rules were not (no block and no
  style language); a re-import infers them again.
- From graphty-element: `W_STYLE_LAYER_FLATTENED` (10.2).

All are added to graphty-element's `ExportLossCode`. The existing `W_VIZ_DROPPED` stays for role
columns exported without styles.

### 10.6 Switching it on

graphty-element's export takes an additive `styles: true` option; the default keeps today's output,
and the graphty app and cytoscape-extensions turn it on. graph-io's `exportGraph` takes
`{ styles: ExtractedStyles }`. `ExportCapabilities.styles` (additive) lists, per target, the
properties the format's writer can hold natively and whether it keeps rules. Writing styles by
default is a changed default, so it is the owner's call for a major release.

### 10.7 The exactness check

For every styled corpus file imported with styles, and for a set of hand-made stacks covering every
kind of layer (fixed values, every scale, calculated values, algorithm-result bindings, label
styles, hidden elements): export to every format with styles, import the file back with styles, and
assert:

1. formats with `write: "rules"`: the same layers (equal specs once layer ids, template ids and the
   style namespace are set aside), the same `explain()` value per element and channel, the same
   visibility; a flattened layer comes back as the same values, as its note says;
2. every property a format cannot hold is named by a loss note with the right count, and no
   difference between the two imports lacks one;
3. export, import and export again gives byte-identical files (determinism);
4. an outside edit (one node's fill changed in the native slot) comes back as one exception, not as
   a stale layer;
5. a block with a wrong fingerprint, a truncated block and a hostile block (the adversarial inputs
   of 7.4) are ignored with a note and never throw.

---

## 11. The graphty app

- **The import choice.** One preference, "import styles from files", default on, kept with the
  reader's other preferences, set in Settings and shown as a checkbox in the Load Data dialog and in
  the Data page's load choices. It is shown only for a format whose catalog entry says
  `styles.read: true`, or for a draft whose `LoadDraft.styles` says the file declares styles; the
  app keeps no format list of its own. Every load path (the Start screen's samples and Open, the
  Load Data dialog and drops, the Data page) passes `styles: "file"` or `"none"` from it.
- **What the import did.** The app words `LoadReport.styles.notes` and each layer's
  `FileStyleOrigin` facts itself ("Colors from the file, by Modularity Class (9 values)"); the
  element returns codes and facts only.
- **Export.** The app exports with `styles: true`. Its export dialog already previews the export;
  when the preview's losses hold any `W_STYLE_*` code, saving first shows a warning in the app's
  words naming what will be lost (which properties, on how many elements, and whether the layers
  come back as layers), with the choices to save anyway or to pick another format. The format menu
  marks the formats whose catalog entry says `styles.write: "rules"`.
- **No graph logic in the app.** Every fact it shows comes from the element: the catalog, the
  draft, the load report and the export preview.

---

## 12. Replacing the old style paths

Before this work several places read or wrote styles on their own, each differently. After it, the
style readers and writers of section 3 and 10 are the only path; the rest is removed where nothing
published depends on it, and deprecated where something does.

| Place                                                                                                                                                     | Today                                                                                                                                                                                      | After                                                                                                                                                                                                     | Breaking to remove?                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| graph-io GEXF viz role columns (`color`, `size`, `shape`, `shape.uri`, `thickness`) and the rename of a declared attribute titled like one (`color#<id>`) | the only source of GEXF styles; copied into data by graphty-element and cytoscape-extensions                                                                                               | read by the GEXF style reader and by nothing else that draws; documented as deprecated                                                                                                                    | yes: they are the import result. Removed in the next major                           |
| graph-io GEXF hex color parser                                                                                                                            | 6-digit only; alpha never clamped                                                                                                                                                          | the shared canonical parser (`#rgb` and `#rrggbbaa` accepted, alpha clamped with a note)                                                                                                                  | no: a value that was a warning now parses                                            |
| graph-io GraphML `yfiles.*` typed columns                                                                                                                 | built only for graphty-element's GraphML reader; ShapeNode and PolyLineEdge only; the first label even when invisible; a target arrow sets `directed`; `yfiles.label` takes the label role | the yEd and yFiles 3 style readers read the kept graphics tree; the columns are deprecated and frozen, not fixed                                                                                          | yes. Removed, with the arrow-as-direction rule and the label role, in the next major |
| graph-io `ExportCapabilities.viz`                                                                                                                         | "can hold color, size, shape, thickness"                                                                                                                                                   | kept with that meaning and deprecated; `ExportCapabilities.styles` is the new fact                                                                                                                        | yes. Removed in the next major                                                       |
| graph-io `W_VIZ_DROPPED` message                                                                                                                          | says the value "cannot be written" in JSON and Neo4j CSV, which do write it as a plain attribute                                                                                           | the message says the role is lost and the value is kept; the code is unchanged                                                                                                                            | no                                                                                   |
| graph-io JSON and Neo4j CSV writing role columns as plain attributes, CSV skipping them                                                                   | inconsistent                                                                                                                                                                               | unchanged and documented; one rule (style goes only into style slots) in the next major                                                                                                                   | yes. Next major                                                                      |
| graph-io Pajek `shape` column without the shape role (GEXF's has it)                                                                                      | inconsistent                                                                                                                                                                               | the Pajek style reader reads the column; the role is unchanged                                                                                                                                            | yes. Next major                                                                      |
| graph-io `W_STYLES_NOT_IMPORTED` (CX, CX2, sessions)                                                                                                      | always emitted                                                                                                                                                                             | emitted only when styles are not asked for, or for what a reader cannot translate                                                                                                                         | no                                                                                   |
| graph-io session vizmap                                                                                                                                   | not kept                                                                                                                                                                                   | its text kept in `meta.extra.cys` and read by the session reader                                                                                                                                          | no (additive)                                                                        |
| graph-io vis.js `options` and `groups`                                                                                                                    | dropped with a warning                                                                                                                                                                     | kept in `meta.extra` and read as defaults and group rules; the warning stays when styles are not asked for                                                                                                | no (additive)                                                                        |
| graph-io GML, XGMML, CX, CX2 and Cytoscape.js stored style data; DOT and Pajek plain attribute columns                                                    | stored raw                                                                                                                                                                                 | the style readers' input and the style writers' target                                                                                                                                                    | no                                                                                   |
| graphty-element GEXF reader's `color` and `size` record keys                                                                                              | viz color and size copied into node data (documented)                                                                                                                                      | kept, documented as deprecated; file styles never read them                                                                                                                                               | yes. Removed in the next major                                                       |
| graphty-element GraphML reader's `yfiles` record keys and its private 2D-to-3D shape table                                                                | records rebuilt from graph-io's `yfiles.*` columns                                                                                                                                         | kept frozen and deprecated; the one shape table is the translation's `styleOptions.shapes`                                                                                                                | yes. Removed in the next major                                                       |
| graphty-element export's `style.*` role columns                                                                                                           | each element's drawn color, size, shape, width                                                                                                                                             | kept: third-party writers read them; the layers now also travel as `styles`                                                                                                                               | no                                                                                   |
| graphty-element JSON reader                                                                                                                               | builds a stub snapshot, so a Cytoscape.js stylesheet never reaches graph-io                                                                                                                | routes Cytoscape.js, graphology and vis.js through graph-io (6.4), same record keys                                                                                                                       | no                                                                                   |
| cytoscape-extensions `graphtyImport` (GEXF `viz:color` to `data.color`) and `graphtyExport` (`data.color` to `viz:color`), with its own CSS color parser  | GEXF and color only, a field named `color` only, `cy.style()` ignored                                                                                                                      | replaced outright: import returns the file's styles as a Cytoscape.js stylesheet built by graph-io; export writes `cy.style()` through graph-io's Cytoscape.js style reader and the format's style writer | no: added after cytoscape-extensions 0.0.9 and never released                        |

**Why deprecation and not removal.** graph-io (0.3) and cytoscape-extensions (0.0) are below 1.0,
where semantic versioning allows a minor release to break. graph-io still deprecates: its import
results are published, graphty-element and third parties read them, and a `!` commit would publish
a major-numbered release the owner has put on hold. cytoscape-extensions replaces outright only
because the behavior never shipped. graphty-element (3.x) deprecates everything it published.

**Deferred to the next major** (each is also added to the issues that track the held major):

1. graph-io: drop the GEXF viz role columns from import results, and the reserved-name rename.
2. graph-io: drop the `yfiles.*` columns, the rule that a target arrow makes an edge directed, and
   `yfiles.label`'s label role.
3. graph-io: drop `ExportCapabilities.viz`.
4. graph-io: give Pajek's `shape` column the shape role.
5. graph-io: JSON and Neo4j CSV stop writing role columns as plain attributes.
6. graphty-element: drop the GEXF reader's `color` and `size` record keys, the GraphML reader's
   `yfiles` record keys and its private shape table.
7. Owner decisions, not deferred removals: whether file styles are imported, and styles exported,
   by default in graphty-element.

---

## 13. Rules from the prototype's defects

The final check found six places where the prototype departed from this design (section 8). Each is
a rule of the implementation with the final check's inputs as its regression tests:

1. **Layers in rule order.** Every layer made from rule i sits below every layer made from rule
   i+1, whatever pass of the translation made it. Test: `node { width: 20 }` then
   `.big { width: 50 }` draws `.big` nodes at 50, and the stylesheet stress set agrees with real
   Cytoscape.js.
2. **yEd labels.** The label is the first VISIBLE `NodeLabel` with text; further visible labels are
   noted per element. Test: icon nodes whose first label is an empty `hasText="false"` one.
3. **Cytoscape.js metadata selectors** (`[[degree > 2]]`, `[[indegree = 0]]`, `[[outdegree ...]]`)
   are evaluated over the degree features, never treated as invalid.
4. **A Cytoscape.js stylesheet given as a string** is parsed and applied like an array.
5. **DOT `none` and `invis` are transparent**, not unknown; a color list is never read as its first
   color where Graphviz draws black; gradients and parallel lines take the first color with a note.
6. **`mapData` with a zero or reversed range, and percentages**, are evaluated the way Cytoscape.js
   draws them; only what cannot be evaluated is noted, per element.

---

## Decisions

| Decision                      | Choice                                                                                                                                                                                                                                                                  | Reason                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Where the common format lives | graph-io: types, canonicalizers, planner and resolver in `@graphty/graph-io/styles`; each format's style reader on its importer                                                                                                                                         | parsing and dialects live there; graphty-element and cytoscape-extensions both consume it; graph-format stays a stable zero-dependency snapshot |
| How it travels                | `importGraph(input, { styles: true })` returns the styles of the importer that read the file; `fromImporter` calls `importer.styles` directly                                                                                                                           | works for any registry and any wrapped importer; no dispatch on an optional string                                                              |
| Importer contract             | `styles?(snapshot, context)` with a simple path (raw values plus a dialect) and an advanced path (canonical values and declared rules)                                                                                                                                  | a third-party format gets styles in one line                                                                                                    |
| Shape of the format           | ordered rules over a neutral vocabulary; predicates over data columns; discrete, continuous and passthrough mappings; per-element values in columns; notes that name their elements; every union open                                                                   | one model covers declared and inferred styles; its semantics match graphty's stack one to one                                                   |
| Canonical values              | `#rrggbb` with alpha moved to opacity or noted; 6 significant digits; per-dialect namespaces; open enumerations; 256-character parse limit                                                                                                                              | grouping and verification compare one spelling                                                                                                  |
| Truth                         | what the writing tool draws, modeled per tool (Graphviz's color, label and size rules; Cytoscape.js's comparisons, cascade and mapper resets; Cytoscape's list matching)                                                                                                | requirement 2 is about the tool's drawing, not the file's text                                                                                  |
| Inference                     | families; discrete (degree included, 20% exceptions, a missing-key bucket), continuous (exact, else within the tool's rounding, noted), existing columns, joint style classes, copies; cost by description length                                                       | measured files are explained by one column, degree or a few classes; NP-hard alternatives buy little                                            |
| Exactness                     | replay against the reference resolver; one sparse exceptions layer; never paint the unstyled                                                                                                                                                                            | exact by construction                                                                                                                           |
| Layer bound                   | 16 per kind in the element, labels included, enforced by the planner's cap and the element's exact fold                                                                                                                                                                 | independent of graph size, by construction                                                                                                      |
| DOT scopes                    | not tracked; cluster membership is a feature                                                                                                                                                                                                                            | inference reproduces every DOT file; a scope column would change every export                                                                   |
| Style columns                 | groups and per-element values become short values on the elements: graph-io style columns; in graphty-element the path `graphty.style.<namespace>.<kind>.<key>`, built by one helper, kept in a per-load store saved with the project                                   | no giant selectors (owner, 2026-10-11); issue #2029 may move the root and changes only the helper                                               |
| Element switch                | `LoadChoices.styles: "file" \| "none"`, default `"none"`; `LoadReport.styles`; `LoadDraft` summary; `styleOptions` with neutral defaults                                                                                                                                | reaches every data source; notes have a home; today's behavior kept                                                                             |
| Element hand-off              | extraction on the element reader's snapshot, columns resolved through `columnsMapping`; apply inside `data.import` (one undo step), per-load import id and scoped selectors, `TemplateOptions.at`                                                                       | the import path the app uses, made exact for merge and reload                                                                                   |
| Layer facts                   | typed `FileStyleOrigin` read with `fileStyleOf()`; names are rule ids                                                                                                                                                                                                   | the app never duck-types; the element stays neutral about presentation                                                                          |
| Element prerequisites         | explain label merge, refuse label-style bindings, `unmapped: "skip"` (approved), `stops` scales, bindable label sub-channels, honest clamping and alpha, `TemplateOptions.at`, `FileStyleOrigin`, the file-style store, layers to neutral styles; no long-selector work | each is an element defect or gap a file import or export exposes, fixed in the element for every consumer                                       |
| Robustness first              | fix the valid files that fail in graph-io and in the element's readers before shipping styles; follow the coding rules of 6.2                                                                                                                                           | requirement 1 fails without it                                                                                                                  |
| Tool defaults                 | each reader adds the writing tool's defaults as one `origin: "tool"` rule at the bottom, only when the writer is identified; values in Appendix A; `toolDefaults: false` leaves them out                                                                                | the graph looks as it does in the program that made it (owner, 2026-10-11)                                                                      |
| Defaults that are rules       | Gephi and vis edge color from the source node, resolved at import into a style column for edges with no color; arrows on directed edges only for Graphviz, Gephi and Pajek; unverified defaults left out                                                                | a constant cannot express them; file values always win                                                                                          |
| Short selectors               | at most 8 terms from graph-io; anything wider becomes a style column at import                                                                                                                                                                                          | a selector of thousands of terms means the import failed to name the group                                                                      |
| Export                        | layers to neutral rules in graphty-element; graph-io writes the picture, the rules in the format's own language, and a `graphty.styles` block plus tagged per-element values                                                                                            | other programs see the picture; graphty gets the same layers back                                                                               |
| Re-import of a graphty file   | the block's rules are the declared rules, the native values the truth; a fingerprint mismatch ignores the block                                                                                                                                                         | exact after an outside edit; same layers without one                                                                                            |
| Export losses                 | `W_STYLE_NOT_WRITTEN`, `W_STYLE_APPROXIMATED`, `W_STYLE_RULES_NOT_KEPT`, `W_STYLE_LAYER_FLATTENED`, reported by the dry run before writing                                                                                                                              | the app warns before anything is lost                                                                                                           |
| Export switch                 | graphty-element `styles: true` on export, default off; graph-io `{ styles }`; `FormatDescriptor.styles` and `ExportCapabilities.styles` facts                                                                                                                           | additive; changing the default is the owner's call                                                                                              |
| App option                    | one "import styles from files" preference, shown for formats whose catalog entry can carry styles, passed on every load path; a warning before a lossy export                                                                                                           | the app consumes element facts and keeps no format list                                                                                         |
| Old style paths               | the style readers and writers are the only path; published copies deprecated, unreleased cytoscape-extensions handling replaced outright; removals listed for the next major                                                                                            | no breaking change while the major is held                                                                                                      |

---

## Appendix A. Defaults of the writing tools

The values each style reader adds for what a file leaves unset (section 3, "Defaults of the
writing tool"). Every value, its source and the tool version are in `style-tool-defaults.md`;
values no primary source states are marked there and are not added.

| Tool                                  | Formats, and how the writer is recognized                                                                                                                        | Nodes                                                        | Edges                                                                            | Labels                                                   | Background  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| Cytoscape desktop, "default" style    | CX, CX2, XGMML (always); GraphML with Cytoscape's `SUID` and `shared name` keys; GML `Creator "Cytoscape"`; JSON `generated_by: "cytoscape-..."` with no `style` | fill `#89d0f5`, round rectangle 75 x 35, no border           | `#848484`, width 2, solid, no arrows, curved                                     | nodes from the `name` column; black, 12                  | `#ffffff`   |
| Cytoscape desktop, renderer fallbacks | .cys sessions                                                                                                                                                    | fill `#c80000`, ellipse 60 x 40, black border 2              | `#404040`, width 1, solid, no arrows                                             | none; black, 12                                          | `#ffffff`   |
| Cytoscape.js 3.x                      | JSON with `elements` (and a `style`, for Cytoscape desktop's export)                                                                                             | fill `#999999`, ellipse 30 x 30, no border                   | `#999999`, width 3, solid, no arrows                                             | none; black, 16, above the node                          | none        |
| Graphviz                              | DOT (always)                                                                                                                                                     | unfilled ellipse, black outline 1, 54 x 36 (0.75 x 0.5 inch) | black, width 1, solid; a target arrow on directed edges                          | every node by its name; black, 14, Times-Roman, centered | none        |
| yEd, yFiles 2                         | GraphML with the `y:` namespace; GML `Creator "yFiles"`                                                                                                          | fill `#ffcc00`, rectangle, black border 1                    | black, width 1, solid; arrows as the file's `y:Arrows`, none when absent         | black, 12, Dialog, centered                              | not added   |
| yFiles 3                              | GraphML with the yFiles 3 namespaces                                                                                                                             | fill `#ffffff`, rectangle, black stroke 1                    | black, width 1, no arrows                                                        | black, 12, Arial                                         | not added   |
| Gephi                                 | GEXF (always); GraphML with `r`, `g`, `b` keys; GML `Creator "Gephi"`                                                                                            | black when no color, size 10, disc                           | the source node's color when the edge has none; a target arrow on directed edges | hidden (no label rule)                                   | `#ffffff`   |
| vis-network                           | JSON with `nodes[].id` and `edges[].from`                                                                                                                        | fill `#97c2fc`, border `#2b7ce9` 1, ellipse                  | the from-node's color when the edge has none, width 1, no arrows                 | the `label` field only; `#343434`, 14                    | none        |
| sigma (graphology files)              | JSON with `nodes[].key` and `attributes`                                                                                                                         | `#999999`, circle, size 2                                    | `#cccccc`, size 0.5, no arrows                                                   | the `label` attribute; black, 14                         | none        |
| Pajek                                 | Pajek (always)                                                                                                                                                   | ellipse                                                      | black, solid; a target arrow on arcs                                             | not added                                                | not added   |
| OGDF                                  | GML `Creator "ogdf::..."`                                                                                                                                        | fill white, rectangle 20 x 20, black stroke 1                | black, width 1                                                                   | not added                                                | not added   |
| graphty                               | any file holding a `graphty.styles` block                                                                                                                        | the block's recorded base values                             | the block's recorded base values                                                 | the block's                                              | the block's |
| none                                  | CSV, Neo4j CSV, OBO, d3 and NetworkX node-link, JGF; GraphML and GML from NetworkX, igraph, SNDlib or an unknown writer                                          | none                                                         | none                                                                             | none                                                     | none        |
