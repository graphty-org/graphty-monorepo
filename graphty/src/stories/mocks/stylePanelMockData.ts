/**
 * Mock data for the style panel mock (StylePanelMock.stories.tsx): the Les Miserables network
 * (77 nodes, 254 edges) with Louvain, degree, edge betweenness and a shortest path from Valjean
 * to Javert. Nothing here reads graphty-element; every number is made up to look plausible.
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
}

export const VALUES: readonly ValueRef[] = [
    { id: "name", name: "name", group: "Data", level: "text", on: "node" },
    { id: "weight", name: "weight", group: "Data", level: "number", on: "edge" },
    { id: "group", name: "group", group: "Louvain", level: "categories", on: "node", state: "ran 2 min ago" },
    { id: "degree", name: "degree", group: "Degree", level: "number", on: "node", state: "ran 2 min ago" },
    { id: "betweenness", name: "betweenness", group: "Edge betweenness", level: "number", on: "edge" },
    { id: "onRoute", name: "on route", group: "Shortest path", level: "yesno", on: "both", state: "out of date" },
    { id: "step", name: "step", group: "Shortest path", level: "number", on: "both", state: "out of date" },
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

/** The properties a fixed or derived row writes. Labels, effects and ends are lists of their own. */
export type PropId = "shape" | "size" | "visible" | "opacity" | "nodeColor" | "edgeColor" | "edgeWidth" | "wireframe";

export type Control = "color" | "number" | "select" | "switch";

/** How a property can vary by categories. */
export type SchemeKind = "palette" | "shapes" | "table" | "rule";

export interface PropDef {
    readonly id: PropId;
    readonly label: string;
    readonly on: "node" | "edge";
    readonly control: Control;
    readonly unit?: string;
    readonly options?: readonly string[];
    /** The floor of defaults: what off falls back to. */
    readonly floor: string | number;
    readonly scheme: SchemeKind;
    /** Whether a number can drive it as a ramp, and how the canvas draws it. */
    readonly ramp: "smooth" | "steps" | "none";
}

export const SHAPES = [
    "Icosphere",
    "Box",
    "Octahedron",
    "Cylinder",
    "Cone",
    "Torus",
    "Sphere",
    "Tetrahedron",
    "Dodecahedron",
    "Icosahedron",
    "Capsule",
    "Geodesic",
] as const;

export const PATTERNS = ["Solid", "Dot", "Star", "Box", "Dash", "Diamond", "Dash-dot", "Sine wave", "Zigzag"] as const;

export const ARROW_KINDS = [
    "None",
    "Normal",
    "Inverted",
    "Dot",
    "Sphere dot",
    "Open dot",
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
        label: "Shape",
        on: "node",
        control: "select",
        options: SHAPES,
        floor: "Icosphere",
        scheme: "shapes",
        ramp: "none",
    },
    size: { id: "size", label: "Size", on: "node", control: "number", floor: 1, scheme: "table", ramp: "steps" },
    visible: {
        id: "visible",
        label: "Visible",
        on: "node",
        control: "switch",
        floor: "on",
        scheme: "rule",
        ramp: "none",
    },
    opacity: {
        id: "opacity",
        label: "Opacity",
        on: "node",
        control: "number",
        unit: "%",
        floor: 100,
        scheme: "table",
        ramp: "steps",
    },
    nodeColor: {
        id: "nodeColor",
        label: "Node color",
        on: "node",
        control: "color",
        floor: "6366F1",
        scheme: "palette",
        ramp: "smooth",
    },
    edgeColor: {
        id: "edgeColor",
        label: "Edge color",
        on: "edge",
        control: "color",
        floor: "A9A9A9",
        scheme: "palette",
        ramp: "smooth",
    },
    edgeWidth: {
        id: "edgeWidth",
        label: "Edge width",
        on: "edge",
        control: "number",
        unit: "px",
        floor: 8,
        scheme: "table",
        ramp: "steps",
    },
    wireframe: {
        id: "wireframe",
        label: "Wireframe",
        on: "node",
        control: "switch",
        floor: "off",
        scheme: "rule",
        ramp: "none",
    },
};

export type SectionId = "shape" | "visibility" | "text" | "fill" | "stroke" | "ends" | "effects" | "rendering";

export interface SectionDef {
    readonly id: SectionId;
    readonly title: string;
    readonly on: Target;
    readonly props: readonly PropId[];
}

/** The one fixed section order every layer shares. */
export const SECTIONS: readonly SectionDef[] = [
    { id: "shape", title: "Shape", on: "node", props: ["shape", "size"] },
    { id: "visibility", title: "Visibility", on: "both", props: ["visible", "opacity"] },
    { id: "text", title: "Text", on: "both", props: [] },
    { id: "fill", title: "Fill", on: "node", props: ["nodeColor"] },
    { id: "stroke", title: "Stroke", on: "edge", props: ["edgeColor", "edgeWidth"] },
    { id: "ends", title: "Ends", on: "edge", props: [] },
    { id: "effects", title: "Effects", on: "both", props: [] },
    { id: "rendering", title: "Rendering", on: "node", props: ["wireframe"] },
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
    readonly order: string;
    readonly combine: Combine;
    readonly paused: boolean;
    /** Category index (1-based) to the color a split child chose. */
    readonly overrides?: Readonly<Record<number, string>>;
    /** Category index to the number typed for it (value tables). */
    readonly table?: Readonly<Record<number, number>>;
}

export type Write = FixedWrite | DerivedWrite;

export type LabelSource =
    { readonly kind: "value"; readonly value: string } | { readonly kind: "text"; readonly text: string };

export interface LabelEntry {
    readonly id: string;
    readonly source: LabelSource;
    readonly size: number;
    /** A matrix cell on a node ("bottom-center"), a placement word on an edge ("On the line"). */
    readonly position: string;
    readonly hidden: boolean;
    readonly textColor?: string;
    readonly background?: string;
}

export type EffectType = "Outline" | "Glow" | "Motion";

export interface EffectEntry {
    readonly id: string;
    readonly type: EffectType;
    readonly color?: string;
    readonly speed?: number;
    readonly strength?: number;
    readonly hidden: boolean;
}

export interface EndEntry {
    readonly id: string;
    readonly end: "Head" | "Tail";
    readonly kind: string;
    readonly size?: number;
    readonly color?: string;
    readonly opacity?: number;
    readonly caption?: string;
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

export type ValuesKind =
    | "everything"
    | "selected"
    | "hovered"
    | "louvain"
    | "community"
    | "degree"
    | "route"
    | "betweenness"
    | "keyPeople"
    | "topTen"
    | "folder"
    | "generic";

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
    /** Line settings behind the Stroke section's settings button. */
    readonly line?: { readonly pattern: string; readonly patternCount?: number; readonly curved: boolean };
    readonly split?: { readonly value: string; readonly scheme: string };
    /** A split child: its parent, its category and the parent's chit. */
    readonly child?: { readonly parentId: string; readonly group: number; readonly chit: string };
    /** The layer that covers every element this one paints. */
    readonly paintedOverBy?: string;
    readonly values: ValuesKind;
}

/** Okabe-Ito, the default categorical palette (graphty-element's `okabe-ito`). */
export const OKABE_ITO = ["E69F00", "56B4E9", "009E73", "0072B2", "D55E00", "CC79A7", "000000", "F0E442"];

export const CATEGORY_PALETTES: Record<string, readonly string[]> = {
    "Okabe-Ito": OKABE_ITO,
    "Tol vibrant": ["0077BB", "33BBEE", "009988", "EE7733", "CC3311", "EE3377", "BBBBBB"],
    "Tol muted": ["332288", "88CCEE", "44AA99", "117733", "999933", "DDCC77", "CC6677", "882255", "AA4499"],
    Pastel: ["FFD699", "A8D8F0", "66C9B2", "FFF099", "669DD6", "FF9980", "EBB8D2", "CCCCCC"],
};

export const RAMP_PALETTES: Record<string, readonly string[]> = {
    "Yellow-orange-brown": ["FFF7BC", "FEC44F", "EF7818", "B84203", "662506"],
    Viridis: ["440154", "3E4989", "26828E", "35B779", "FDE724"],
    Blues: ["F7FBFF", "C6DBEF", "6BAED6", "2171B5", "08306B"],
    Plasma: ["0D0887", "8B0AA5", "DB5C68", "FEBD2A", "F0F921"],
    "Blue-orange (diverging)": ["2166AC", "92C5DE", "F7F7F7", "F4A582", "B2182B"],
};

export const SHAPE_SCHEMES = ["Distinct shapes", "Platonic solids", "Prisms"];

/**
 * A CSS gradient for a ramp palette, drawn in steps when `steps` is given.
 * @param palette - The palette's name.
 * @param reverse - Whether to run it backwards.
 * @param steps - The step count, or undefined for a smooth ramp.
 * @returns A linear-gradient.
 */
export function rampGradient(palette: string, reverse: boolean, steps?: number): string {
    const base = RAMP_PALETTES[palette] ?? RAMP_PALETTES["Yellow-orange-brown"];
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

export interface Community {
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

/** Degree bins on log-spaced edges: 1, 2, 3-4, 5-8, 9-16, 17-36. */
export const DEGREE_BINS = [
    { label: "Degree 1: 17 nodes", count: 17 },
    { label: "Degree 2: 12 nodes", count: 12 },
    { label: "Degree 3 to 4: 14 nodes", count: 14 },
    { label: "Degree 5 to 8: 17 nodes", count: 17 },
    { label: "Degree 9 to 16: 13 nodes", count: 13 },
    { label: "Degree 17 to 36: 4 nodes", count: 4 },
];

/** Edge betweenness in the five steps edge width is drawn in. */
export const BETWEENNESS_BINS = [
    { label: "0 to 40: 168 edges, 1 px", count: 168 },
    { label: "40 to 120: 51 edges, 2.25 px", count: 51 },
    { label: "120 to 260: 22 edges, 3.5 px", count: 22 },
    { label: "260 to 520: 9 edges, 4.75 px", count: 9 },
    { label: "520 to 1,140: 4 edges, 6 px", count: 4 },
];

/** Painted counts per layer: what each property it writes actually reaches. */
export const PAINTED: Record<string, readonly (readonly [string, string])[]> = {
    everything: [
        ["Shape", "72 of 77"],
        ["Size", "75 of 77"],
        ["Node color", "0 of 77"],
        ["Edge color", "246 of 254"],
        ["Edge width", "0 of 254"],
    ],
    selected: [
        ["Size", "2 of 2"],
        ["Edge width", "0 of 0"],
        ["Outline", "2 of 2"],
    ],
    hovered: [
        ["Tooltip", "1 of 1"],
        ["Glow", "1 of 1"],
    ],
    louvain: [["Node color", "65 of 77"]],
    community3: [
        ["Node color", "12 of 12"],
        ["Glow", "11 of 12"],
    ],
    degree: [["Node color", "0 of 77"]],
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
 * @param palette - The palette or scheme.
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
        },
        props: overridden ? { nodeColor: fixed("882255") } : {},
        effects: overridden ? [{ id: "glow-c3", type: "Glow", color: "882255", strength: 1, hidden: false }] : [],
        child: { parentId: "louvain", group: c.n, chit: OKABE_ITO[c.n - 1] },
        values: "community",
    };
}

/** Every layer of the mock, by id. */
export const INITIAL_LAYERS: Record<string, MockLayer> = Object.fromEntries(
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
            rule: { kind: "hovered", words: "Hovered element", count: "1 node", matches: "both" },
            props: {},
            tooltip: {
                id: "tooltip-hovered",
                source: { kind: "value", value: "name" },
                size: 12,
                position: "top-center",
                hidden: false,
            },
            effects: [{ id: "glow-hovered", type: "Glow", color: "FFD54F", strength: 1, hidden: false }],
            values: "hovered",
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
            props: { size: fixed(1.5, "Multiply"), edgeWidth: fixed(2, "Multiply") },
            effects: [{ id: "outline-selected", type: "Outline", color: "0D99FF", hidden: false }],
            values: "selected",
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
            values: "folder",
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
            },
            props: { shape: fixed("Octahedron"), size: fixed(2) },
            labels: [
                {
                    id: "label-key",
                    source: { kind: "value", value: "name" },
                    size: 48,
                    position: "bottom-center",
                    hidden: false,
                    textColor: "FFFFFF",
                    background: "1F2933",
                },
            ],
            values: "keyPeople",
        },
        {
            ...NO_LISTS,
            id: "topTen",
            name: "Top 10 labels",
            kind: "layer",
            locked: false,
            hidden: false,
            rule: { kind: "top", words: "Top 10 nodes by degree", count: "10 nodes", matches: "node" },
            props: {},
            labels: [
                {
                    id: "label-top",
                    source: { kind: "value", value: "name" },
                    size: 24,
                    position: "top-center",
                    hidden: false,
                    textColor: "F0E442",
                },
            ],
            values: "topTen",
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
            },
            props: { nodeColor: fixed("D55E00"), edgeColor: fixed("D55E00"), edgeWidth: fixed(3) },
            labels: [
                {
                    id: "label-route",
                    source: { kind: "value", value: "step" },
                    size: 36,
                    position: "top-right",
                    hidden: false,
                },
            ],
            ends: [{ id: "head-route", end: "Head", kind: "Normal", size: 1, opacity: 100, hidden: false }],
            values: "route",
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
                edgeWidth: { ...derived("betweenness", "ramp", "Yellow-orange-brown"), from: 1, to: 6, steps: 5 },
            },
            values: "betweenness",
        },
        {
            ...NO_LISTS,
            id: "louvain",
            name: "Louvain",
            kind: "split",
            locked: false,
            hidden: false,
            rule: { kind: "everyNode", words: "Every node", count: "77 nodes", matches: "node" },
            split: { value: "group", scheme: "Okabe-Ito" },
            props: { nodeColor: { ...derived("group", "categories", "Okabe-Ito"), overrides: { 3: "882255" } } },
            values: "louvain",
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
            props: { nodeColor: derived("degree", "ramp", "Yellow-orange-brown") },
            paintedOverBy: "louvain",
            values: "degree",
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
            rule: { kind: "everything", words: "Every node and edge", count: "77 nodes, 254 edges", matches: "both" },
            props: {
                shape: fixed("Icosphere"),
                size: fixed(1),
                nodeColor: fixed("5B8FF9"),
                edgeColor: fixed("BBBBBB"),
                edgeWidth: fixed(1),
            },
            line: { pattern: "Solid", curved: false },
            values: "everything",
        },
    ].map((layer): [string, MockLayer] => [layer.id, layer as MockLayer]),
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
