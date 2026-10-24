/**
 * Mock data for the style panel mock (StylePanelMock.stories.tsx): the Les Miserables network
 * (77 nodes, 254 edges) with Louvain, degree, edge betweenness and a shortest path from Valjean
 * to Javert. Nothing here reads graphty-element; every count is made up to look plausible.
 *
 * The shape lists, palettes, defaults and units are graphty-element's own, copied here only
 * because the mock never loads the element. The real panel reads them from the element
 * (`NodeShapes`, `PALETTE_DESCRIPTORS`, the channel descriptors) and never keeps a copy.
 *
 * The layout follows design/ui/style-panel-organization.md.
 */

/** How a value is read: categories, a quantity, free text, or yes/no. */
export type Level = "categories" | "number" | "text" | "yesno";

/** What a rule, a value or a section applies to. */
export type Target = "node" | "edge" | "both";

/** A value a property can vary by: a data column, a run's field or a fact. */
export interface ValueRef {
    readonly id: string;
    readonly name: string;
    /** "Data", a run's name, or "Facts". */
    readonly group: string;
    readonly level: Level;
    readonly on: Target;
    /** Shown beside the run's name in the picker. */
    readonly state?: string;
    /** The level was guessed, not declared: the pill says so and offers the other reading. */
    readonly guessed?: boolean;
    /** How many distinct values it holds, when few. */
    readonly distinct?: number;
    /** A number that is a position in an order (a route's steps). */
    readonly ordered?: boolean;
}

export const VALUES: readonly ValueRef[] = [
    { id: "name", name: "name", group: "Data", level: "text", on: "node" },
    { id: "weight", name: "weight", group: "Data", level: "number", on: "edge" },
    {
        id: "group",
        name: "group",
        group: "Louvain",
        level: "categories",
        on: "node",
        state: "ran 2 min ago",
        guessed: true,
    },
    { id: "degree", name: "degree", group: "Degree", level: "number", on: "node", state: "ran 2 min ago" },
    { id: "betweenness", name: "betweenness", group: "Edge betweenness", level: "number", on: "edge" },
    {
        id: "onRoute",
        name: "on route",
        group: "Shortest path",
        level: "yesno",
        on: "both",
        state: "out of date",
        distinct: 2,
    },
    {
        id: "step",
        name: "step",
        group: "Shortest path",
        level: "number",
        on: "both",
        state: "out of date",
        distinct: 5,
        ordered: true,
    },
    { id: "selected", name: "is selected", group: "Facts", level: "yesno", on: "both" },
    { id: "hovered", name: "is hovered", group: "Facts", level: "yesno", on: "both" },
];

/**
 * The name a pill shows: the value, and the run it came from ("group, Louvain").
 * @param id - The value's id.
 * @returns The pill text.
 */
export function valueLabel(id: string): string {
    const value = VALUES.find((v) => v.id === id);
    if (value === undefined) {
        return id;
    }
    if (value.group === "Data" || value.group === "Facts") {
        return value.name;
    }
    if (value.group === "Shortest path") {
        return `${value.name}, route`;
    }
    return value.group.toLowerCase().includes(value.name) ? value.name : `${value.name}, ${value.group}`;
}

/** What graphty-element needs before it can draw each marked control (the mock's "i" marks). */
export const GAPS = {
    facts: "graphty-element needs is-selected and is-hovered values, scoped to a view.",
    tree: "graphty-element needs folders, pins and a reader-set lock in the layer stack. Its lock today means made by the element.",
    split: "graphty-element needs split by value, with children matched across re-runs.",
    combine: "graphty-element needs a combine mode on each property write.",
    append: "graphty-element draws one outline, one glow and one halo per node: it needs rings that stack.",
    pause: "graphty-element needs a paused flag on each property write, saved with the layer.",
    slots: "graphty-element needs label slots keyed by name before a second label can be drawn.",
    looks: "graphty-element needs label size, color and background to take bindings.",
    format: "graphty-element needs a number format on text bindings.",
    shapes: "graphty-element needs named shape schemes, distinct shapes first.",
    keep: "graphty-element needs a domain kept across re-runs.",
    unmapped: "graphty-element needs a Skip option for values a value table does not list.",
    visible: "graphty-element needs visibility as a style write; it hides elements only through session filters.",
    priority:
        "graphty-element needs a label priority it reads from a layer; declutter ranks by selection, degree and id.",
    halo: "graphty-element draws the selection halo from the selection, not from a layer: it needs halo color, size and opacity as style channels.",
    fills: "graphty-element draws linear and radial node fills, but no style channel reaches them.",
    branch: "Not in graphty-element yet: it arrives with the studio branch, pull request #1727.",
} as const;

export type GapId = keyof typeof GAPS;

/** The properties a fixed or derived row writes. Labels, effects and ends are lists of their own. */
export type PropId =
    | "shape"
    | "size"
    | "nodeVisible"
    | "nodeOpacity"
    | "edgeVisible"
    | "edgeOpacity"
    | "nodeColor"
    | "edgeColor"
    | "edgeWidth"
    | "pattern"
    | "patternCount"
    | "curved"
    | "wireframe";

export type Control = "color" | "number" | "select" | "switch";

/** How a property can vary by categories: a palette, a shape scheme, a list of kinds, numbers per category, or never. */
export type SchemeKind = "palette" | "shapes" | "list" | "table" | "rule";

export interface PropDef {
    readonly id: PropId;
    /** The full name, used where the row's group is not in view ("Node opacity"). */
    readonly label: string;
    /** The name on the row, under its Nodes or Edges heading ("Opacity"). */
    readonly short: string;
    readonly on: "node" | "edge";
    readonly control: Control;
    readonly unit?: string;
    readonly options?: readonly string[];
    /** The floor of defaults: what off falls back to. */
    readonly floor: string | number;
    readonly scheme: SchemeKind;
    /** Whether a number can drive it as a ramp, and how the canvas draws it. */
    readonly ramp: "smooth" | "steps" | "none";
    /** How many categories it can tell apart, when it takes a list. */
    readonly capacity?: number;
    /** Drawn, but not drawable by graphty-element today. */
    readonly gap?: GapId;
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
}

/** graphty-element's 25 node shapes, in its order, with the default first among equals. */
const SHAPES = [
    "Box",
    "Sphere",
    "Cylinder",
    "Cone",
    "Capsule",
    "Torus",
    "Torus knot",
    "Tetrahedron",
    "Octahedron",
    "Dodecahedron",
    "Icosahedron",
    "Rhombicuboctahedron",
    "Triangular prism",
    "Pentagonal prism",
    "Hexagonal prism",
    "Square pyramid",
    "Pentagonal pyramid",
    "Triangular dipyramid",
    "Pentagonal dipyramid",
    "Elongated square dipyramid",
    "Elongated pentagonal dipyramid",
    "Elongated pentagonal cupola",
    "Goldberg",
    "Icosphere",
    "Geodesic",
] as const;

const PATTERNS = ["Solid", "Dot", "Star", "Box", "Dash", "Diamond", "Dash-dot", "Sine wave", "Zigzag"] as const;

/** The patterns drawn as repeated elements, which a pattern count spreads. */
export const COUNTED_PATTERNS = ["Dot", "Star", "Box", "Dash", "Diamond", "Dash-dot"];

export const ARROW_KINDS = [
    "Normal",
    "Inverted",
    "Dot",
    "Sphere dot",
    "Open dot",
    "None",
    "Tee",
    "Open normal",
    "Diamond",
    "Open diamond",
    "Crow",
    "Box",
    "Half open",
    "Vee",
] as const;

export const PROPS: Record<PropId, PropDef> = {
    shape: {
        id: "shape",
        short: "Shape",
        label: "Shape",
        on: "node",
        control: "select",
        options: SHAPES,
        floor: "Icosphere",
        scheme: "shapes",
        ramp: "none",
        capacity: 25,
    },
    size: {
        id: "size",
        short: "Size",
        label: "Size",
        on: "node",
        control: "number",
        floor: 1,
        scheme: "table",
        ramp: "steps",
    },
    nodeVisible: {
        id: "nodeVisible",
        short: "Show",
        label: "Show nodes",
        on: "node",
        control: "switch",
        floor: "on",
        scheme: "rule",
        ramp: "none",
        gap: "visible",
    },
    nodeOpacity: {
        id: "nodeOpacity",
        short: "Opacity",
        label: "Node opacity",
        on: "node",
        control: "number",
        unit: "%",
        floor: 100,
        scheme: "table",
        ramp: "steps",
        min: 0,
        max: 100,
    },
    edgeVisible: {
        id: "edgeVisible",
        short: "Show",
        label: "Show edges",
        on: "edge",
        control: "switch",
        floor: "on",
        scheme: "rule",
        ramp: "none",
        gap: "visible",
    },
    edgeOpacity: {
        id: "edgeOpacity",
        short: "Opacity",
        label: "Edge opacity",
        on: "edge",
        control: "number",
        unit: "%",
        floor: 100,
        scheme: "table",
        ramp: "steps",
        min: 0,
        max: 100,
    },
    nodeColor: {
        id: "nodeColor",
        short: "Color",
        label: "Node color",
        on: "node",
        control: "color",
        floor: "6366F1",
        scheme: "palette",
        ramp: "smooth",
    },
    edgeColor: {
        id: "edgeColor",
        short: "Color",
        label: "Edge color",
        on: "edge",
        control: "color",
        floor: "A9A9A9",
        scheme: "palette",
        ramp: "smooth",
    },
    edgeWidth: {
        id: "edgeWidth",
        short: "Width",
        label: "Edge width",
        on: "edge",
        control: "number",
        floor: 8,
        scheme: "table",
        ramp: "steps",
        min: 0,
    },
    pattern: {
        id: "pattern",
        short: "Pattern",
        label: "Pattern",
        on: "edge",
        control: "select",
        options: PATTERNS,
        floor: "Solid",
        scheme: "list",
        ramp: "none",
        capacity: 9,
    },
    patternCount: {
        id: "patternCount",
        short: "Pattern count",
        label: "Pattern count",
        on: "edge",
        control: "number",
        floor: "spaced by length",
        scheme: "table",
        ramp: "steps",
        min: 2,
    },
    curved: {
        id: "curved",
        short: "Curved",
        label: "Curved",
        on: "edge",
        control: "switch",
        floor: "off",
        scheme: "rule",
        ramp: "none",
    },
    wireframe: {
        id: "wireframe",
        short: "Wireframe",
        label: "Wireframe",
        on: "node",
        control: "switch",
        floor: "off",
        scheme: "rule",
        ramp: "none",
    },
};

export type SectionId = "shape" | "visibility" | "text" | "fill" | "line" | "ends" | "effects" | "rendering";

export interface SectionDef {
    readonly id: SectionId;
    readonly title: string;
    readonly on: "node" | "edge";
    readonly props: readonly PropId[];
}

/**
 * The Style tab's two groups, Nodes then Edges, each in one fixed section order. A group shows
 * only when the layer's rule can match that kind of element, and a section holds only what
 * graphty-element can draw on that kind.
 */
export const SECTIONS: readonly SectionDef[] = [
    { id: "shape", title: "Shape", on: "node", props: ["shape", "size"] },
    { id: "visibility", title: "Visibility", on: "node", props: ["nodeVisible", "nodeOpacity"] },
    { id: "text", title: "Text", on: "node", props: [] },
    { id: "fill", title: "Fill", on: "node", props: ["nodeColor"] },
    { id: "effects", title: "Effects", on: "node", props: [] },
    { id: "rendering", title: "Rendering", on: "node", props: ["wireframe"] },
    { id: "visibility", title: "Visibility", on: "edge", props: ["edgeVisible", "edgeOpacity"] },
    { id: "text", title: "Text", on: "edge", props: [] },
    { id: "line", title: "Line", on: "edge", props: ["edgeColor", "edgeWidth", "pattern", "patternCount", "curved"] },
    { id: "ends", title: "Ends", on: "edge", props: [] },
    { id: "effects", title: "Effects", on: "edge", props: [] },
];

/**
 * Whether a section or property aimed at `section` is reachable by a rule matching `rule`.
 * @param rule - What the rule matches.
 * @param section - What the section applies to.
 * @returns Whether the section is shown.
 */
export function reaches(rule: Target, section: Target): boolean {
    return rule === "both" || section === "both" || rule === section;
}

export type Combine = "Replace" | "Multiply" | "Add" | "Mix" | "Set hue" | "Set lightness" | "Set transparency";

export const NUMBER_COMBINES: readonly Combine[] = ["Replace", "Multiply", "Add"];
export const COLOR_COMBINES: readonly Combine[] = ["Replace", "Mix", "Set hue", "Set lightness", "Set transparency"];

export type Scale = "Linear" | "Log" | "-log10" | "Square root" | "Power" | "Equal ranges" | "Equal counts";
export const SCALES: readonly Scale[] = [
    "Linear",
    "Log",
    "-log10",
    "Square root",
    "Power",
    "Equal ranges",
    "Equal counts",
];

export interface FixedWrite {
    readonly mode: "fixed";
    readonly value?: string | number | boolean;
    readonly combine: Combine;
    readonly paused: boolean;
}

export interface DerivedWrite {
    readonly mode: "derived";
    readonly source: string;
    /** ramp: a number over a palette or range; categories: a scheme; table: numbers per category. */
    readonly binding: "ramp" | "categories" | "table";
    /** A palette id, a shape scheme or a kind list. */
    readonly palette: string;
    readonly reverse: boolean;
    readonly scale: Scale;
    readonly steps?: number;
    readonly exponent?: number;
    readonly midpoint?: number;
    readonly from?: number;
    readonly to?: number;
    readonly domainMin?: number;
    readonly domainMax?: number;
    readonly keep: boolean;
    readonly clampLow?: number;
    readonly clampHigh?: number;
    readonly noValue: "Skip" | "Paint";
    readonly noValueColor?: string;
    readonly unmapped: "Skip" | "Paint";
    readonly overflow: string;
    readonly otherThreshold: number;
    readonly otherColor?: string;
    readonly order: string;
    /** Categories (1-based) the reader hid: not painted, kept in the legend. */
    readonly hiddenValues?: readonly number[];
    /** A guessed level the reader overrode ("Read as a number"). */
    readonly readAs?: Level;
    readonly combine: Combine;
    readonly paused: boolean;
    /** Category index to the number typed for it (value tables). */
    readonly table?: Readonly<Record<number, number>>;
}

export type Write = FixedWrite | DerivedWrite;

export type LabelSource =
    { readonly kind: "value"; readonly value: string } | { readonly kind: "text"; readonly text: string };

/** One label look field's value, keyed by graphty-element's `LabelStyle` field name. */
export type LookValue = string | number | boolean;

export interface LabelEntry {
    readonly id: string;
    readonly source: LabelSource;
    /** Letter height in label px; empty shows the element's 48. */
    readonly size?: number;
    /** graphty-element's `location` on a node ("top"); a placement word on an edge ("On the line"). */
    readonly position: string;
    readonly hidden: boolean;
    /** The rest of the label's look, by `LabelStyle` field. */
    readonly look: Readonly<Record<string, LookValue>>;
    /** How a number source is written: "As is", "1,234" and so on. */
    readonly format?: string;
    /** What a missing value shows: undefined shows nothing. */
    readonly missingText?: string;
    /** Drawn greyed: a second label the element cannot draw today. */
    readonly preview?: boolean;
}

export type EffectType = "Outline" | "Glow" | "Halo" | "Motion";

/** An effect's fields that can vary by a value. */
export type EffectField = "color" | "strength" | "speed" | "scale" | "opacity";

export interface EffectEntry {
    readonly id: string;
    readonly type: EffectType;
    readonly color?: string;
    readonly speed?: number;
    readonly strength?: number;
    /** Halo: size as a multiple of the node. */
    readonly scale?: number;
    /** Halo: opacity, percent. */
    readonly opacity?: number;
    /** Replace the layers beneath, or add a ring beside theirs. */
    readonly combine: "Replace" | "Append";
    /** Fields bound to a value, by field: the value's id. */
    readonly bound: Readonly<Partial<Record<EffectField, string>>>;
    readonly hidden: boolean;
}

export type EndField = "kind" | "size" | "color" | "opacity";

export interface EndEntry {
    readonly id: string;
    readonly end: "Head" | "Tail";
    readonly kind: string;
    readonly size?: number;
    readonly color?: string;
    readonly opacity?: number;
    readonly bound: Readonly<Partial<Record<EndField, string>>>;
    readonly hidden: boolean;
}

export type RuleKind =
    "everyNode" | "everyEdge" | "everything" | "where" | "top" | "named" | "members" | "selected" | "hovered";

export const RULE_KINDS: readonly { value: RuleKind; label: string }[] = [
    { value: "everything", label: "Every node and edge" },
    { value: "everyNode", label: "Every node" },
    { value: "everyEdge", label: "Every edge" },
    { value: "where", label: "Where a value..." },
    { value: "top", label: "Top N by..." },
    { value: "named", label: "Named elements" },
    { value: "members", label: "Members of a set" },
    { value: "selected", label: "Selected elements" },
    { value: "hovered", label: "Hovered element" },
];

export interface Rule {
    readonly kind: RuleKind | "draft";
    readonly words: string;
    readonly count: string;
    readonly matches: Target;
    /** The parent's part of a split child's rule, drawn in secondary text and not editable. */
    readonly parentPart?: string;
    readonly value?: string;
    readonly comparison?: string;
    readonly operand?: string;
}

/** Layers above that cover every element a property paints: the topmost, and how many more. */
export interface PaintedOver {
    readonly by: string;
    readonly more: number;
}

export interface MockLayer {
    readonly id: string;
    readonly name: string;
    readonly kind: "layer" | "folder" | "split" | "child";
    readonly pin?: "top" | "bottom";
    readonly locked: boolean;
    readonly hidden: boolean;
    /** Everything, Selected and Hovered: their delete offers "Restore starting layers". */
    readonly starting?: boolean;
    readonly draft?: boolean;
    readonly rule: Rule;
    readonly props: Partial<Record<PropId, Write>>;
    /** Properties added with "+" that have no value yet: they write nothing. */
    readonly pending: readonly PropId[];
    readonly labels: readonly LabelEntry[];
    readonly tooltip?: LabelEntry;
    readonly effects: readonly EffectEntry[];
    readonly ends: readonly EndEntry[];
    /** A split parent: the value it splits on. Its scheme is its Fill binding's. */
    readonly split?: { readonly value: string };
    /** A split child: its parent, its category and the parent's chit. */
    readonly child?: { readonly parentId: string; readonly group: number; readonly chit: string };
    /** Properties the layers above cover entirely. */
    readonly paintedOver?: Partial<Record<PropId, PaintedOver>>;
}

/** A palette as graphty-element describes it: id, plain name, kind and colors. */
interface PaletteDef {
    readonly id: string;
    readonly name: string;
    readonly kind: "sequential" | "diverging" | "categorical";
    readonly colors: readonly string[];
}

/** graphty-element's 18 built-in palettes (`PALETTE_DESCRIPTORS`), in its order. */
const PALETTES: readonly PaletteDef[] = [
    {
        id: "viridis",
        name: "Purple to Yellow",
        kind: "sequential",
        colors: ["440154", "482878", "3E4989", "31688E", "26828E", "1F9E89", "35B779", "6ECE58", "B5DE2B", "FDE724"],
    },
    {
        id: "ylorbr",
        name: "Orange to Brown",
        kind: "sequential",
        colors: ["EF7818", "D85A09", "B84203", "8E3104", "662506"],
    },
    {
        id: "plasma",
        name: "Blue to Yellow",
        kind: "sequential",
        colors: ["0D0887", "5302A3", "8B0AA5", "B83289", "DB5C68", "F48849", "FEBD2A", "F0F921"],
    },
    {
        id: "inferno",
        name: "Black to Yellow",
        kind: "sequential",
        colors: ["000004", "1B0C41", "4A0C6B", "781C6D", "A52C60", "CF4446", "ED6925", "FB9B06", "F7D13D"],
    },
    {
        id: "blues",
        name: "Shades of Blue",
        kind: "sequential",
        colors: ["F7FBFF", "DEEBF7", "C6DBEF", "9ECAE1", "6BAED6", "4292C6", "2171B5", "08519C", "08306B"],
    },
    {
        id: "greens",
        name: "Shades of Green",
        kind: "sequential",
        colors: ["F7FCF5", "E5F5E0", "C7E9C0", "A1D99B", "74C476", "41AB5D", "238B45", "006D2C", "00441B"],
    },
    {
        id: "oranges",
        name: "Shades of Orange",
        kind: "sequential",
        colors: ["FFF5EB", "FEE6CE", "FDD0A2", "FDAE6B", "FD8D3C", "F16913", "D94801", "A63603", "7F2704"],
    },
    {
        id: "okabe-ito",
        name: "Eight Distinct Colors",
        kind: "categorical",
        colors: ["E69F00", "56B4E9", "009E73", "0072B2", "D55E00", "CC79A7", "000000", "F0E442"],
    },
    {
        id: "tol-vibrant",
        name: "Seven Bright Colors",
        kind: "categorical",
        colors: ["0077BB", "33BBEE", "009988", "EE7733", "CC3311", "EE3377", "BBBBBB"],
    },
    {
        id: "tol-muted",
        name: "Nine Soft Colors",
        kind: "categorical",
        colors: ["332288", "88CCEE", "44AA99", "117733", "999933", "DDCC77", "CC6677", "882255", "AA4499"],
    },
    {
        id: "pastel",
        name: "Eight Pale Colors",
        kind: "categorical",
        colors: ["FFD699", "A8D8F0", "66C9B2", "FFF099", "669DD6", "FF9980", "EBB8D2", "CCCCCC"],
    },
    {
        id: "carbon",
        name: "Five Enterprise Colors",
        kind: "categorical",
        colors: ["6929C4", "1192E8", "005D5D", "9F1853", "FA4D56"],
    },
    {
        id: "purple-green",
        name: "Purple to Green",
        kind: "diverging",
        colors: ["762A83", "9970AB", "C2A5CF", "E7D4E8", "F7F7F7", "D9F0D3", "A6DBA0", "5AAE61", "1B7837"],
    },
    {
        id: "blue-orange",
        name: "Blue to Orange",
        kind: "diverging",
        colors: ["2166AC", "4393C3", "92C5DE", "D1E5F0", "F7F7F7", "FDDBC7", "F4A582", "D6604D", "B2182B"],
    },
    {
        id: "red-blue",
        name: "Red to Blue",
        kind: "diverging",
        colors: ["67001F", "B2182B", "D6604D", "F4A582", "FDDBC7", "F7F7F7", "D1E5F0", "92C5DE", "4393C3", "2166AC"],
    },
    { id: "blue-highlight", name: "Blue Highlight", kind: "categorical", colors: ["0072B2", "CCCCCC"] },
    { id: "green-highlight", name: "Green Highlight", kind: "categorical", colors: ["009E73", "999999"] },
    { id: "orange-highlight", name: "Orange Highlight", kind: "categorical", colors: ["E69F00", "CCCCCC"] },
];

/** The default palettes: numbers and categories. */
export const DEFAULT_RAMP = "ylorbr";
export const DEFAULT_CATEGORICAL = "okabe-ito";

/**
 * A palette by id, falling back to the default of its kind.
 * @param id - The palette id.
 * @returns The palette.
 */
export function paletteOf(id: string): PaletteDef {
    return PALETTES.find((p) => p.id === id) ?? (PALETTES.find((p) => p.id === DEFAULT_RAMP) as PaletteDef);
}

export const RAMP_PALETTES = PALETTES.filter((p) => p.kind !== "categorical");
export const CATEGORY_PALETTES = PALETTES.filter((p) => p.kind === "categorical");

/** Okabe-Ito, the default categorical palette. */
const OKABE_ITO = paletteOf(DEFAULT_CATEGORICAL).colors;

/** graphty-element's color for groups folded into Other. */
export const OTHER_COLOR = "686868";

export const SHAPE_SCHEMES = ["Distinct shapes", "Platonic solids", "Prisms"];

/**
 * A CSS gradient for a ramp palette, drawn in steps when `steps` is given.
 * @param palette - The palette's id.
 * @param reverse - Whether to run it backwards.
 * @param steps - The step count, or undefined for a smooth ramp.
 * @returns A linear-gradient.
 */
export function rampGradient(palette: string, reverse: boolean, steps?: number): string {
    const base = paletteOf(palette).colors;
    const stops = reverse ? [...base].reverse() : [...base];
    if (steps === undefined) {
        return `linear-gradient(to right, ${stops.map((s) => `#${s}`).join(", ")})`;
    }
    const parts: string[] = [];
    for (let i = 0; i < steps; i++) {
        const color = stops[Math.round((i / Math.max(1, steps - 1)) * (stops.length - 1))];
        parts.push(`#${color} ${String((i / steps) * 100)}%`, `#${color} ${String(((i + 1) / steps) * 100)}%`);
    }
    return `linear-gradient(to right, ${parts.join(", ")})`;
}

interface Community {
    readonly n: number;
    readonly size: number;
    readonly members: readonly string[];
}

export const COMMUNITIES: readonly Community[] = [
    { n: 1, size: 11, members: ["Myriel", "Napoleon", "Mlle Baptistine", "Mme Magloire", "Countess de Lo"] },
    { n: 2, size: 10, members: ["Thenardier", "Mme Thenardier", "Eponine", "Anzelma", "Boulatruelle"] },
    {
        n: 3,
        size: 12,
        members: [
            "Fantine",
            "Tholomyes",
            "Listolier",
            "Fameuil",
            "Blacheville",
            "Favourite",
            "Dahlia",
            "Zephine",
            "Marguerite",
            "Perpetue",
            "Simplice",
            "Bamatabois",
        ],
    },
    { n: 4, size: 17, members: ["Gavroche", "Enjolras", "Courfeyrac", "Bossuet", "Bahorel", "Combeferre"] },
    { n: 5, size: 11, members: ["Valjean", "Javert", "Fauchelevent", "Cosette", "Champmathieu"] },
    { n: 6, size: 16, members: ["Marius", "Gillenormand", "Mlle Gillenormand", "Pontmercy", "Baroness"] },
];

export const TOP_TEN: readonly (readonly [string, number])[] = [
    ["Valjean", 36],
    ["Gavroche", 22],
    ["Marius", 19],
    ["Javert", 17],
    ["Thenardier", 16],
    ["Fantine", 15],
    ["Enjolras", 15],
    ["Courfeyrac", 13],
    ["Bossuet", 13],
    ["Bahorel", 12],
];

export const ROUTE = ["Valjean", "Fauchelevent", "Cosette", "Thenardier", "Javert"];

interface Bin {
    readonly label: string;
    readonly count: number;
}

/** What a number value holds, for its histogram and its summary rows. */
interface NumberFacts {
    readonly bins: readonly Bin[];
    readonly domain: readonly [number, number];
    readonly min: string;
    readonly median: string;
    readonly max: string;
    readonly maxAt?: string;
    /** A note on the axes, when not linear. */
    readonly axes?: string;
}

export const NUMBER_FACTS: Record<string, NumberFacts> = {
    degree: {
        bins: [
            { label: "Degree 1: 17 nodes", count: 17 },
            { label: "Degree 2: 12 nodes", count: 12 },
            { label: "Degree 3 to 4: 14 nodes", count: 14 },
            { label: "Degree 5 to 8: 17 nodes", count: 17 },
            { label: "Degree 9 to 16: 13 nodes", count: 13 },
            { label: "Degree 17 to 36: 4 nodes", count: 4 },
        ],
        domain: [1, 36],
        min: "1",
        median: "6",
        max: "36",
        maxAt: "Valjean",
        axes: "log-log",
    },
    betweenness: {
        bins: [
            { label: "0 to 40: 168 edges", count: 168 },
            { label: "40 to 120: 51 edges", count: 51 },
            { label: "120 to 260: 22 edges", count: 22 },
            { label: "260 to 520: 9 edges", count: 9 },
            { label: "520 to 1,140: 4 edges", count: 4 },
        ],
        domain: [0, 1140],
        min: "0.5",
        median: "18",
        max: "1,140",
    },
    weight: {
        bins: [
            { label: "1 to 2: 150 edges", count: 150 },
            { label: "3 to 5: 70 edges", count: 70 },
            { label: "6 to 31: 34 edges", count: 34 },
        ],
        domain: [1, 31],
        min: "1",
        median: "2",
        max: "31",
    },
    step: {
        bins: [1, 2, 3, 4, 5].map((s) => ({ label: `Step ${String(s)}: 1 node`, count: 1 })),
        domain: [1, 5],
        min: "1",
        median: "3",
        max: "5",
    },
};

/** Label counts per layer that writes a label: labeled, drawn, hidden by overlap. */
export const LABEL_COUNTS: Record<string, readonly [number, number, number]> = {
    keyPeople: [5, 5, 0],
    topTen: [10, 7, 3],
    route: [5, 5, 0],
};

/** Painted counts per layer: what each property it writes actually reaches. */
export const PAINTED: Record<string, readonly (readonly [string, string])[]> = {
    everything: [
        ["Shape", "72 of 77"],
        ["Size", "75 of 77"],
        ["Node color", "0 of 77, painted over"],
        ["Edge color", "246 of 254"],
        ["Edge width", "0 of 254, painted over"],
        ["Head", "250 of 254"],
    ],
    selected: [
        ["Halo", "2 of 2"],
        ["Edge width", "0 of 0"],
    ],
    hovered: [
        ["Tooltip", "0 of 0"],
        ["Glow", "0 of 0"],
    ],
    community3: [
        ["Node color", "12 of 12"],
        ["Glow", "11 of 12"],
    ],
    degree: [["Node color", "11 of 77, the rest painted over by Louvain"]],
    route: [
        ["Label", "5 of 5"],
        ["Node color", "5 of 5"],
        ["Edge color", "4 of 4"],
        ["Edge width", "4 of 4"],
        ["Head", "4 of 4"],
    ],
    betweenness: [["Edge width", "250 of 254"]],
    keyPeople: [
        ["Shape", "5 of 5"],
        ["Size", "3 of 5"],
        ["Label", "5 of 5"],
    ],
    topTen: [["Label", "7 of 10"]],
};

let nextId = 1;

/**
 * A fresh id for rows and list entries the reader adds.
 * @param prefix - What it is.
 * @returns A unique id.
 */
export function newId(prefix: string): string {
    nextId += 1;
    return `${prefix}-${String(nextId)}`;
}

const BASE_DERIVED = {
    reverse: false,
    keep: false,
    noValue: "Skip",
    unmapped: "Skip",
    overflow: "Fold into Other",
    otherThreshold: 1,
    order: "Largest first",
    combine: "Replace",
    paused: false,
} as const;

/**
 * A new derived write with every setting at its neutral value.
 * @param source - The value it reads.
 * @param binding - ramp, categories or table.
 * @param palette - The palette id or scheme.
 * @returns The write.
 */
export function derived(source: string, binding: DerivedWrite["binding"], palette: string): DerivedWrite {
    return { ...BASE_DERIVED, mode: "derived", source, binding, palette, scale: "Linear" };
}

/**
 * A fixed write.
 * @param value - The value.
 * @param combine - How it meets the layers beneath.
 * @returns The write.
 */
export function fixed(value: string | number | boolean | undefined, combine: Combine = "Replace"): FixedWrite {
    return { mode: "fixed", value, combine, paused: false };
}

/**
 * A label entry with nothing but its source and position.
 * @param id - Its id.
 * @param value - The value it shows.
 * @param position - Where it sits.
 * @returns The entry.
 */
export function labelEntry(id: string, value: string, position: string): LabelEntry {
    return { id, source: { kind: "value", value }, position, hidden: false, look: {} };
}

const NO_LISTS = { pending: [], labels: [], effects: [], ends: [] } as const;

/**
 * One split child of Louvain.
 * @param c - The community.
 * @returns The child layer.
 */
function communityLayer(c: Community): MockLayer {
    const overridden = c.n === 3;
    return {
        ...NO_LISTS,
        id: `community${String(c.n)}`,
        name: `Community ${String(c.n)}`,
        kind: "child",
        locked: false,
        hidden: c.n === 5,
        rule: {
            kind: "where",
            words: `where group is ${String(c.n)}`,
            parentPart: "Louvain's nodes",
            count: `${String(c.size)} nodes`,
            matches: "node",
            value: "group",
            comparison: "is",
            operand: String(c.n),
        },
        props: overridden ? { nodeColor: fixed("882255") } : {},
        effects: overridden
            ? [
                  {
                      id: "glow-c3",
                      type: "Glow",
                      color: "882255",
                      strength: 1,
                      combine: "Replace",
                      bound: {},
                      hidden: false,
                  },
              ]
            : [],
        child: { parentId: "louvain", group: c.n, chit: OKABE_ITO[c.n - 1] },
    };
}

/** Every layer of the mock, by id. */
export const INITIAL_LAYERS: Record<string, MockLayer> = Object.fromEntries(
    (
        [
            {
                ...NO_LISTS,
                id: "hovered",
                name: "Hovered",
                kind: "layer",
                pin: "top",
                starting: true,
                locked: false,
                hidden: false,
                rule: { kind: "hovered", words: "Hovered element", count: "None now", matches: "both" },
                props: {},
                tooltip: labelEntry("tooltip-hovered", "name", "top-right"),
                effects: [
                    {
                        id: "glow-hovered",
                        type: "Glow",
                        color: "FFD54F",
                        strength: 1,
                        combine: "Replace",
                        bound: {},
                        hidden: false,
                    },
                ],
            },
            {
                ...NO_LISTS,
                id: "selected",
                name: "Selected",
                kind: "layer",
                pin: "top",
                starting: true,
                locked: false,
                hidden: false,
                rule: { kind: "selected", words: "Selected elements", count: "2 nodes", matches: "both" },
                props: { edgeWidth: fixed(2, "Multiply") },
                effects: [
                    {
                        id: "halo-selected",
                        type: "Halo",
                        color: "FFD700",
                        scale: 1.45,
                        opacity: 40,
                        combine: "Append",
                        bound: {},
                        hidden: false,
                    },
                ],
            },
            {
                ...NO_LISTS,
                id: "annotations",
                name: "Annotations",
                kind: "folder",
                locked: false,
                hidden: false,
                rule: { kind: "everything", words: "", count: "", matches: "both" },
                props: {},
            },
            {
                ...NO_LISTS,
                id: "keyPeople",
                name: "Key people",
                kind: "layer",
                locked: false,
                hidden: false,
                rule: {
                    kind: "named",
                    words: "Named nodes: Valjean, Javert, Cosette, Marius, Fantine",
                    count: "5 nodes",
                    matches: "node",
                    operand: "Valjean, Javert, Cosette, Marius, Fantine",
                },
                props: { shape: fixed("Octahedron"), size: fixed(2) },
                labels: [
                    { ...labelEntry("label-key", "name", "bottom"), look: { color: "FFFFFF", background: "1F2933" } },
                    { ...labelEntry("label-key-2", "degree", "top"), size: 24, preview: true },
                ],
            },
            {
                ...NO_LISTS,
                id: "topTen",
                name: "Top 10 labels",
                kind: "layer",
                locked: false,
                hidden: false,
                rule: {
                    kind: "top",
                    words: "Top 10 nodes by degree",
                    count: "10 nodes",
                    matches: "node",
                    value: "degree",
                    operand: "10",
                },
                props: {},
                labels: [{ ...labelEntry("label-top", "name", "top"), size: 24, look: { color: "F0E442" } }],
            },
            {
                ...NO_LISTS,
                id: "route",
                name: "Route Valjean to Javert",
                kind: "layer",
                locked: false,
                hidden: false,
                rule: {
                    kind: "members",
                    words: "Nodes and edges on the route",
                    count: "5 nodes, 4 edges",
                    matches: "both",
                    value: "onRoute",
                    operand: "the route",
                },
                props: { nodeColor: fixed("D55E00"), edgeColor: fixed("D55E00"), edgeWidth: fixed(24) },
                labels: [{ ...labelEntry("label-route", "step", "top-right"), size: 36 }],
                ends: [{ id: "head-route", end: "Head", kind: "Normal", bound: {}, hidden: false }],
            },
            {
                ...NO_LISTS,
                id: "betweenness",
                name: "Edge betweenness",
                kind: "layer",
                locked: false,
                hidden: false,
                rule: { kind: "everyEdge", words: "Every edge", count: "254 edges", matches: "edge" },
                props: {
                    edgeWidth: { ...derived("betweenness", "ramp", DEFAULT_RAMP), from: 8, to: 16, steps: 5 },
                },
            },
            {
                ...NO_LISTS,
                id: "louvain",
                name: "Louvain",
                kind: "split",
                locked: false,
                hidden: false,
                rule: { kind: "everyNode", words: "Every node", count: "77 nodes", matches: "node" },
                split: { value: "group" },
                props: { nodeColor: derived("group", "categories", DEFAULT_CATEGORICAL) },
            },
            ...COMMUNITIES.map(communityLayer),
            {
                ...NO_LISTS,
                id: "degree",
                name: "Degree",
                kind: "layer",
                locked: false,
                hidden: false,
                rule: { kind: "everyNode", words: "Every node", count: "77 nodes", matches: "node" },
                // Not painted over: Community 5 is hidden, so Degree still colors its 11 nodes.
                props: { nodeColor: derived("degree", "ramp", DEFAULT_RAMP) },
            },
            {
                ...NO_LISTS,
                id: "everything",
                name: "Everything",
                kind: "layer",
                pin: "bottom",
                starting: true,
                locked: false,
                hidden: false,
                rule: {
                    kind: "everything",
                    words: "Every node and edge",
                    count: "77 nodes, 254 edges",
                    matches: "both",
                },
                props: {
                    shape: fixed("Icosphere"),
                    size: fixed(1),
                    nodeColor: fixed("6366F1"),
                    edgeColor: fixed("A9A9A9"),
                    edgeWidth: fixed(8),
                },
                ends: [{ id: "head-everything", end: "Head", kind: "Normal", bound: {}, hidden: false }],
                paintedOver: { nodeColor: { by: "louvain", more: 2 }, edgeWidth: { by: "betweenness", more: 2 } },
            },
        ] satisfies MockLayer[]
    ).map((layer): [string, MockLayer] => [layer.id, layer]),
);

/** The tree's shape: ids only, top of the paint order first. */
export interface TreeShape {
    readonly id: string;
    readonly children?: readonly TreeShape[];
}

export const INITIAL_TREE: readonly TreeShape[] = [
    { id: "hovered" },
    { id: "selected" },
    { id: "annotations", children: [{ id: "keyPeople" }, { id: "topTen" }] },
    { id: "route" },
    { id: "betweenness" },
    { id: "louvain", children: COMMUNITIES.map((c) => ({ id: `community${String(c.n)}` })) },
    { id: "degree" },
    { id: "everything" },
];
