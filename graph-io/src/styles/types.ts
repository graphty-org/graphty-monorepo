/**
 * The common style format: the neutral description of how a graph file draws its nodes and edges, shared by every
 * format's style reader and writer and by the applications that draw it. Everything here is a type; the runtime
 * vocabulary is in `vocabulary.ts`.
 *
 * Every union below is OPEN: a later version may add members, and a consumer skips a member it does not know
 * (with a note of its own) instead of throwing.
 */

import type { StyleIssueCode } from "./codes.js";

// ============================================================ values

/**
 * A plain value a predicate or a mapping table compares with: a string, a number or a boolean.
 * @category Styles
 */
export type Scalar = string | number | boolean;

/**
 * A canonical color: lowercase `#rrggbb`. Alpha never appears here; it is moved to the property's opacity.
 * @category Styles
 */
export type StyleColor = `#${string}`;

/**
 * Node shapes. A shape the vocabulary has no name for is kept as `other:<the file's spelling>`.
 * @category Styles
 */
export type StyleNodeShape =
    | "ellipse"
    | "rectangle"
    | "round-rectangle"
    | "triangle"
    | "diamond"
    | "pentagon"
    | "hexagon"
    | "octagon"
    | "parallelogram"
    | "trapezoid"
    | "star"
    | "vee"
    | "none"
    | `other:${string}`;

/**
 * Node border styles; unknown spellings are kept as `other:<raw>`.
 * @category Styles
 */
export type StyleBorderStyle = "solid" | "dashed" | "dotted" | "dash-dot" | "double" | `other:${string}`;

/**
 * Edge line styles; unknown spellings are kept as `other:<raw>`.
 * @category Styles
 */
export type StyleLineStyle =
    "solid" | "dashed" | "dotted" | "dash-dot" | "long-dash" | "double" | "zigzag" | "sinewave" | `other:${string}`;

/**
 * Arrow shapes at either end of an edge; unknown spellings are kept as `other:<raw>`.
 * @category Styles
 */
export type StyleArrowShape =
    | "none"
    | "triangle"
    | "triangle-open"
    | "vee"
    | "tee"
    | "diamond"
    | "diamond-open"
    | "circle"
    | "circle-open"
    | "square"
    | "crow"
    | "half"
    | "inverted"
    | `other:${string}`;

/**
 * Label font weights.
 * @category Styles
 */
export type StyleLabelWeight = "normal" | "bold";

/**
 * Where a node's label sits relative to the node.
 * @category Styles
 */
export type StyleLabelPosition =
    "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * The neutral node properties and the type of each value. Lengths are in the unit `FileStyles.units.length`
 * names; opacities are 0..1.
 * @category Styles
 */
export interface NodeStyleValues {
    /** The fill color. */
    readonly fill: StyleColor;
    /** The border (outline) color. */
    readonly borderColor: StyleColor;
    /** The label's text color. */
    readonly labelColor: StyleColor;
    /** The opacity of the fill alone, 0..1 (0 is an unfilled node). */
    readonly fillOpacity: number;
    /** The opacity of the whole node, 0..1. */
    readonly opacity: number;
    /** The width. */
    readonly width: number;
    /** The height. */
    readonly height: number;
    /** The border width (0 is no border). */
    readonly borderWidth: number;
    /** The label's font size. */
    readonly labelSize: number;
    /** The shape. */
    readonly shape: StyleNodeShape;
    /** The border's line style. */
    readonly borderStyle: StyleBorderStyle;
    /** The label text, as the tool draws it. */
    readonly label: string;
    /** The tooltip text. */
    readonly tooltip: string;
    /** The label's font family, as the file names it. */
    readonly labelFont: string;
    /** The label's font weight. */
    readonly labelWeight: StyleLabelWeight;
    /** Whether the label is italic. */
    readonly labelItalic: boolean;
    /** Where the label sits relative to the node. */
    readonly labelPosition: StyleLabelPosition;
    /** The URI of an image drawn on the node. */
    readonly image: string;
    /** Whether the node is drawn at all. */
    readonly visible: boolean;
}

/**
 * The neutral edge properties and the type of each value.
 * @category Styles
 */
export interface EdgeStyleValues {
    /** The line color. */
    readonly color: StyleColor;
    /** The color of the arrow at the source end. */
    readonly sourceArrowColor: StyleColor;
    /** The color of the arrow at the target end. */
    readonly targetArrowColor: StyleColor;
    /** The label's text color. */
    readonly labelColor: StyleColor;
    /** The opacity of the whole edge, 0..1. */
    readonly opacity: number;
    /** The line width. */
    readonly width: number;
    /** The label's font size. */
    readonly labelSize: number;
    /** The arrow size as a factor: 1 is the writing tool's normal size. */
    readonly arrowSize: number;
    /** The line style. */
    readonly lineStyle: StyleLineStyle;
    /** The arrow at the source end. */
    readonly sourceArrow: StyleArrowShape;
    /** The arrow at the target end. */
    readonly targetArrow: StyleArrowShape;
    /** Whether the edge is drawn curved. */
    readonly curved: boolean;
    /** The label text. */
    readonly label: string;
    /** The tooltip text. */
    readonly tooltip: string;
    /** The label's font family. */
    readonly labelFont: string;
    /** The label's font weight. */
    readonly labelWeight: StyleLabelWeight;
    /** Whether the label is italic. */
    readonly labelItalic: boolean;
    /** The label text at the source end. */
    readonly sourceLabel: string;
    /** The label text at the target end. */
    readonly targetLabel: string;
    /** Whether the edge is drawn at all. */
    readonly visible: boolean;
}

/**
 * The neutral properties of the graph as a whole.
 * @category Styles
 */
export interface GraphStyleValues {
    /** The background color. */
    readonly background: StyleColor;
}

/**
 * A property only graphty draws, carried as `graphty:<channel>` so a file graphty wrote keeps it; other programs
 * never see it.
 * @category Styles
 */
export type GraphtyStyleProperty = `graphty:${string}`;

/**
 * A node property name.
 * @category Styles
 */
export type NodeStyleProperty = keyof NodeStyleValues | GraphtyStyleProperty;

/**
 * An edge property name.
 * @category Styles
 */
export type EdgeStyleProperty = keyof EdgeStyleValues | GraphtyStyleProperty;

/**
 * A node or edge property name.
 * @category Styles
 */
export type StyleProperty = NodeStyleProperty | EdgeStyleProperty;

/**
 * A graph property name.
 * @category Styles
 */
export type GraphStyleProperty = keyof GraphStyleValues;

/**
 * One canonical style value: a color, a number, an enumeration value, a text or a boolean.
 * @category Styles
 */
export type StyleValue = string | number | boolean;

/**
 * Which part of the graph a rule or a note is about.
 * @category Styles
 */
export type StyleTarget = "node" | "edge";

/**
 * The graph's own style values.
 * @category Styles
 */
export type GraphStyle = Partial<GraphStyleValues>;

// ============================================================ dialects and tools

/**
 * How a file spells its style values, which decides how a color name, a number or a shape is read. One line per
 * value; the union is open.
 * @category Styles
 */
export type StyleDialect =
    /** CSS colors (names, `#rgb`, `rgb()`, `hsl()`) and CSS-like lengths: vis.js, sigma, most hand-made JSON. */
    | "css"
    /** X11 color names (`gray` is `#bebebe`). */
    | "x11"
    /** Graphviz: X11 and SVG names, color schemes and `/scheme/name`, `#rrggbbaa`, HSV triples, inches. */
    | "graphviz"
    /** Java's `java.awt.Color` names and `#rrggbb`. */
    | "java"
    /** The dvips CMYK color names Pajek uses (`Red`, `CadetBlue`). */
    | "dvips"
    /** yEd and yFiles for Java 2.x (`y:` GraphML and yEd GML): `#RRGGBBAA` with the alpha last. */
    | "yed"
    /** yFiles 3 and yFiles for HTML: named color constants and `#AARRGGBB` with the alpha first. */
    | "yfiles3"
    /** GEXF `viz:` values: separate r, g, b, a numbers and size factors. */
    | "gexf"
    /** Gephi's GraphML and GML keys (`r`, `g`, `b`, `size`). */
    | "gephi"
    /** Cytoscape desktop's visual property values (CX, CX2, XGMML, sessions). */
    | "cytoscape"
    /** Cytoscape.js stylesheet values. */
    | "cytoscape-js"
    /** vis-network options. */
    | "vis"
    /** graphology attributes as sigma draws them. */
    | "graphology"
    /** A `graphty.styles` block written by graphty: already canonical. */
    | "graphty"
    | (string & {});

/**
 * The program whose defaults fill in what a file leaves unset, by id: the keys of the tool defaults table.
 * @category Styles
 */
export type StyleTool =
    /** Cytoscape desktop's "default" visual style. */
    | "cytoscape"
    /** Cytoscape desktop's renderer fallbacks, used for sessions. */
    | "cytoscape-fallbacks"
    /** Cytoscape.js 3.x. */
    | "cytoscape-js"
    /** Graphviz. */
    | "graphviz"
    /** yEd and yFiles for Java 2.x. */
    | "yed"
    /** yFiles 3 and yFiles for HTML. */
    | "yfiles3"
    /** Gephi. */
    | "gephi"
    /** vis-network. */
    | "vis-network"
    /** sigma.js, which draws graphology files. */
    | "sigma"
    /** Pajek. */
    | "pajek"
    /** OGDF. */
    | "ogdf"
    /** NetworkX's matplotlib drawing (`draw_networkx`). */
    | "networkx"
    /** graphty itself, for a file holding a `graphty.styles` block. */
    | "graphty"
    | (string & {});

// ============================================================ rules

/**
 * A reference to the per-element values a predicate or a mapping reads. Open union.
 * @category Styles
 */
export type ColumnRef =
    | {
          /** An attribute column of the snapshot, by name. */
          readonly data: string;
      }
    | {
          /** A column of `ExtractedStyles.columns`, by its generated key. */
          readonly style: string;
      }
    | {
          /** A value computed from the graph itself, live: it follows later edits. */
          readonly computed: "degree" | "indegree" | "outdegree";
      };

/**
 * Which elements a rule applies to. Readers and the planner emit only `all`, `has`, `not` over `has`, `eq` and `in`
 * (at most 8 values), with at most one `and`; a wider group is written onto the elements as a style column and
 * selected with `has`. Open union.
 * @category Styles
 */
export type Predicate =
    | {
          /** Every element. */
          readonly all: true;
      }
    | {
          /** The elements whose column holds a value (not null, not false). */
          readonly has: ColumnRef;
      }
    | {
          /** The elements whose column equals the value. */
          readonly eq: readonly [ColumnRef, Scalar];
      }
    | {
          /** The elements whose column equals one of the values. */
          readonly in: readonly [ColumnRef, readonly Scalar[]];
      }
    | {
          /** The elements every predicate matches. */
          readonly and: readonly Predicate[];
      }
    | {
          /** The elements any predicate matches. */
          readonly or: readonly Predicate[];
      }
    | {
          /** The elements the predicate does not match. */
          readonly not: Predicate;
      };

/**
 * One point of a continuous mapping, in Cytoscape's model: exactly at `at` the value is `value`; between two points
 * `above` of the left one interpolates to `below` of the right one (numbers linearly, colors per sRGB channel);
 * below the first point the value is its `below`, above the last its `above`.
 * @category Styles
 */
export interface ContinuousPoint {
    /** The input value. */
    readonly at: number;
    /** The value just below `at`. */
    readonly below: StyleValue;
    /** The value exactly at `at`. */
    readonly value: StyleValue;
    /** The value just above `at`. */
    readonly above: StyleValue;
}

/**
 * How a rule turns an element's value into a style value. A discrete table's absent key, a passthrough's null and
 * a continuous mapping over a missing or non-numeric value give no result, and the rules beneath decide.
 * Open union.
 * @category Styles
 */
export type Mapping =
    | {
          /** The column's value is the style value. */
          readonly kind: "passthrough";
          /** The column read. */
          readonly by: ColumnRef;
      }
    | {
          /** A table from the column's value to the style value. */
          readonly kind: "discrete";
          /** The column read. */
          readonly by: ColumnRef;
          /** `[key, style value]` pairs; a list value matches by its first item that has an entry. */
          readonly table: readonly (readonly [Scalar, StyleValue])[];
      }
    | {
          /** Points between which numbers and colors are interpolated. */
          readonly kind: "continuous";
          /** The column read; it must hold numbers. */
          readonly by: ColumnRef;
          /** The points, in increasing `at`. */
          readonly points: readonly ContinuousPoint[];
      };

/**
 * What a rule is: the defaults, a group, a data mapping, per-element copies or the exceptions on top. Open union.
 * @category Styles
 */
export type StyleRuleRole = "defaults" | "group" | "mapping" | "passthrough" | "exceptions" | (string & {});

/**
 * Where a rule came from: written by the file, recovered from its values, or the writing tool's default. Open union.
 * @category Styles
 */
export type StyleRuleOrigin = "declared" | "inferred" | "tool" | (string & {});

/**
 * Why a rule copies values instead of explaining them, or how it was built. Open union.
 * @category Styles
 */
export type StyleRuleReason =
    /** No attribute, degree or class explains the values: they are copied per element. */
    | "NO_EXPLANATION"
    /** The values are explained by classes of elements that share a combination of styles. */
    | "STYLE_CLASS"
    /** The rule was folded into a copy to keep the number of rules per kind bounded. */
    | "LAYER_CAP"
    /** Edges with no color of their own take their source node's color, as the writing tool draws them. */
    | "SOURCE_NODE_COLOR"
    /** The file computes the value with a function; the drawn values are copied. */
    | "FUNCTION"
    /** The work budget ran out before the values were explained; they are copied. */
    | "BUDGET"
    /** The file's selector is too wide for a short predicate; its members are marked on the elements. */
    | "SELECTOR"
    /** A mapping table too large to keep as a table; its results are precomputed per element. */
    | "TABLE_SIZE"
    /** A scale the format cannot express (a palette, a logarithmic or quantile scale); values are copied. */
    | "SCALE"
    /** A calculated value; the computed values are copied. */
    | "CALCULATED"
    /** A value read from a path the file does not hold (an algorithm result); values are copied. */
    | "RESULT_PATH"
    | (string & {});

/**
 * Facts about a rule an application may show; never sentences.
 * @category Styles
 */
export interface StyleRuleFacts {
    /** How many elements the rule applies to. */
    readonly elements?: number;
    /** How many classes a class rule holds. */
    readonly classes?: number;
    /** How many distinct values a copied column has. */
    readonly distinctValues?: number;
    /** Why the rule copies values or how it was built. */
    readonly reason?: StyleRuleReason;
    /** The file's own name for each generated value: `[generated key or class number, the file's name]`. */
    readonly names?: readonly (readonly [Scalar, string])[];
}

/**
 * One rule of a file's styles. Rules are ordered bottom to top; per property the topmost matching rule that gives a
 * value wins. A property is written by `set` or by `map`, never both, within one rule.
 * @category Styles
 */
export interface StyleRule {
    /** Stable within one extraction (`node.defaults`, `node.by.Modularity Class`). */
    readonly id: string;
    /** Nodes or edges. */
    readonly target: StyleTarget;
    /** What the rule is. */
    readonly role: StyleRuleRole;
    /** Written by the file, recovered from its values, or the writing tool's default. */
    readonly origin: StyleRuleOrigin;
    /** Which elements the rule applies to. */
    readonly where: Predicate;
    /** Constant values. */
    readonly set?: Partial<Record<StyleProperty, StyleValue>>;
    /** Values computed per element. */
    readonly map?: Partial<Record<StyleProperty, Mapping>>;
    /** Facts an application may show. */
    readonly facts?: StyleRuleFacts;
    /**
     * JSON a consumer attaches for its own round trip, keyed by the consumer's package name; carried untouched and
     * never interpreted.
     */
    readonly ext?: Readonly<Record<string, unknown>>;
}

// ============================================================ notes

/**
 * The code of a style note: every `W_STYLE_` code of `STYLE_ISSUE`.
 * @category Styles
 */
export type StyleNoteCode = Extract<StyleIssueCode, `W_STYLE_${string}`>;

/**
 * One aggregated note: everything approximated, dropped or malformed for one code, target and property.
 * @category Styles
 */
export interface StyleNote {
    /** The condition. */
    readonly code: StyleNoteCode;
    /** The facts. */
    readonly params: {
        /** The property (or the file's own name for the construct) the note is about, or null. */
        readonly property: string | null;
        /** Nodes, edges, the graph, or null for the file as a whole. */
        readonly target: StyleTarget | "graph" | null;
        /** How many times the condition occurred. */
        readonly count: number;
        /** Up to 8 distinct examples, each at most 80 characters. */
        readonly samples: readonly string[];
    };
    /**
     * The element indexes the note covers, sorted, when every occurrence named one; otherwise only how many
     * occurrences there were.
     */
    readonly elements?:
        | readonly number[]
        | {
              /** How many occurrences there were. */
              readonly count: number;
          };
    /** English for graph-io's own report; an application writes its own words from the code and params. */
    readonly message: string;
}

// ============================================================ the description

/**
 * The small, JSON-serializable description of a file's styles.
 * @category Styles
 */
export interface FileStyles {
    /** Changes only when the meaning of an existing construct changes. */
    readonly version: 1;
    /** The format, the dialect of its values, and the program whose defaults were applied (null when unknown). */
    readonly source: {
        /** The graph-io format id. */
        readonly format: string;
        /** How the file spells its values. */
        readonly dialect: StyleDialect | null;
        /** The program whose defaults were applied, or null when the writer is not identified. */
        readonly tool: StyleTool | null;
    };
    /** The unit of every length: pixels, or the writing tool's relative size factor. */
    readonly units: {
        /** Pixels, or the writing tool's relative size factor. */
        readonly length: "px" | "relative";
    };
    /** The graph's own style. */
    readonly graph: GraphStyle;
    /** Bottom to top. */
    readonly rules: readonly StyleRule[];
    /** Everything approximated, dropped or malformed. */
    readonly notes: readonly StyleNote[];
}

/**
 * One column of per-element style values, by element index; null where the column has no value.
 * @category Styles
 */
export type StyleColumn = readonly (StyleValue | null)[];

/**
 * The per-element style columns a description's rules read through `{ style: key }`, per target. Keys are generated
 * by graph-io (`class`, `member.3`, `exceptions.fill`, `copy.fill`), never taken from file text.
 * @category Styles
 */
export interface StyleColumns {
    /** Node columns by key. */
    readonly node: ReadonlyMap<string, StyleColumn>;
    /** Edge columns by key. */
    readonly edge: ReadonlyMap<string, StyleColumn>;
}

/**
 * One candidate column that may explain style values: an attribute, a computed degree or a style column.
 * @category Styles
 */
export interface StyleFeature {
    /** Where the values come from. */
    readonly ref: ColumnRef;
    /** The values, by element index. */
    readonly values: readonly (Scalar | null)[];
}

/**
 * The candidate explaining columns per target, kept so a consumer can plan again with the same inputs.
 * @category Styles
 */
export interface StyleFeatures {
    /** Node features. */
    readonly node: readonly StyleFeature[];
    /** Edge features. */
    readonly edge: readonly StyleFeature[];
}

/**
 * Which graph a set of styles belongs to: style values are indexed by element, so they are never written onto a
 * different graph.
 * @category Styles
 */
export interface StyleFingerprint {
    /** The node count. */
    readonly nodes: number;
    /** The edge count. */
    readonly edges: number;
    /** A hash of the node ids in snapshot order. */
    readonly ids: string;
}

/**
 * A file's styles: the description, the per-element values it reads, the candidate features and the graph it
 * belongs to.
 * @category Styles
 */
export interface ExtractedStyles {
    /** The JSON-serializable description. */
    readonly styles: FileStyles;
    /** The per-element values the description refers to. */
    readonly columns: StyleColumns;
    /** Candidate explaining columns, for planning again. */
    readonly features: StyleFeatures;
    /** The graph the styles were read from or built for. */
    readonly fingerprint: StyleFingerprint;
}

// ============================================================ reading styles (the importer contract)

/**
 * One counted work budget, shared by everything that reads, plans or replays one import's styles.
 * @category Styles
 */
export interface StyleWorkBudget {
    /** Spends `operations` for a target; false once that target's budget is exhausted. */
    spend(target: StyleTarget, operations: number): boolean;
    /** Whether the target's budget is exhausted. */
    exhausted(target: StyleTarget): boolean;
}

/**
 * What an importer's `styles()` receives.
 * @category Styles
 */
export interface StyleReadContext {
    /** Cancels the extraction. */
    readonly signal?: AbortSignal;
    /** The counted work budget. */
    readonly budget: StyleWorkBudget;
    /**
     * What this import's `import()` passed to `report.keepForStyles(value)`: a stylesheet, a groups object, a legend;
     * undefined when it kept nothing. Per import, so imports running at once never mix.
     */
    readonly kept: unknown;
}

/**
 * The simple path's raw values: per property, either a snapshot column by name (`{ data: "color" }`, read by
 * graph-io, list values flattened) or an array of raw values by element index.
 * @category Styles
 */
export type RawStyleValues = Partial<Record<StyleProperty, RawStyleColumn | readonly unknown[]>>;

/**
 * A snapshot column named as the source of raw style values.
 * @category Styles
 */
export interface RawStyleColumn {
    /** The column's name. */
    readonly data: string;
}

/**
 * The advanced path's per-target output: canonical values, the rules the file declares, and the reader's own
 * style columns and features.
 * @category Styles
 */
export interface ReaderOutput {
    /** Canonical values per property, by element index: what the writing tool draws. */
    readonly values: Partial<Record<StyleProperty, StyleColumn>>;
    /** Rules the file declares, bottom to top. */
    readonly rules?: readonly StyleRule[];
    /** The reader's own style columns (memberships, cascade winners). */
    readonly columns?: ReadonlyMap<string, StyleColumn>;
    /** Extra candidate features. */
    readonly features?: readonly StyleFeature[];
}

/**
 * What an importer's `styles()` returns: the simple path (a dialect and raw values; graph-io does the rest) or the
 * advanced path (canonical values and declared rules).
 * @category Styles
 */
export type ImporterStyles =
    | {
          /** How the raw values are spelled. */
          readonly dialect: StyleDialect;
          /** Raw node values. */
          readonly node?: RawStyleValues;
          /** Raw edge values. */
          readonly edge?: RawStyleValues;
      }
    | {
          /** Marks the advanced path. */
          readonly canonical: true;
          /** How the file spelled its values. */
          readonly dialect?: StyleDialect | null;
          /** The program whose defaults apply, or null. */
          readonly tool?: StyleTool | null;
          /** The unit of every length. */
          readonly units?: "px" | "relative";
          /** Node output. */
          readonly node?: ReaderOutput;
          /** Edge output. */
          readonly edge?: ReaderOutput;
          /** The graph's own style. */
          readonly graph?: GraphStyle;
          /** The reader's notes. */
          readonly notes?: readonly StyleNote[];
          /**
           * The text of a `graphty.styles` block the file holds in a place of its own (an XML element, an aspect, a
           * comment) rather than as a graph attribute; graph-io reads it exactly as it reads a block carried as a
           * graph attribute.
           */
          readonly block?: string | null;
          /**
           * The data columns the values were read from (a format's own style columns), per target: they hold the
           * styles themselves, so they are not offered to the planner as columns that explain them.
           */
          readonly readFrom?: {
              /** Node columns. */
              readonly node?: readonly string[];
              /** Edge columns. */
              readonly edge?: readonly string[];
          };
      };

// ============================================================ writing styles (the exporter contract)

/**
 * What a format's writer can hold: per target, the properties it writes natively, and where the `graphty.styles`
 * block and the tagged per-element values go: `"native"` (the exporter places them itself), `"attributes"`
 * (graph-io adds them to the snapshot as a graph attribute and element attributes) or `"none"`.
 * @category Styles
 */
export interface StyleWriteCapabilities {
    /** Node properties written natively. */
    readonly node: readonly NodeStyleProperty[];
    /** Edge properties written natively. */
    readonly edge: readonly EdgeStyleProperty[];
    /** Graph properties written natively. */
    readonly graph?: readonly GraphStyleProperty[];
    /** Where the block and the tagged values go. */
    readonly block: "native" | "attributes" | "none";
}

/**
 * Why a `graphty.styles` block was ignored. Open union.
 * @category Styles
 */
export type StyleBlockIgnoredReason =
    /** The block is not valid JSON. */
    | "NOT_JSON"
    /** The block is larger than graph-io reads. */
    | "TOO_LARGE"
    /** The block's version is one this graph-io does not read. */
    | "VERSION"
    /** The block describes a different graph: elements were added or removed since it was written. */
    | "FINGERPRINT"
    /** The block's content does not have the expected shape. */
    | "INVALID"
    | (string & {});
