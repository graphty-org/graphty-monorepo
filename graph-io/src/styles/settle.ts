/**
 * Settling a file's styles: every decision that depends on the program that wrote the file is made here, before the
 * styles leave graph-io, and written onto the rules as ordinary neutral properties. A consumer then draws the rules
 * the same way whatever program, format or load produced them; `source` stays only for graph-io's own report.
 *
 * What is settled: the program's defaults kept or left out (`toolDefaults`), the program's own arrow, shape, line and
 * border spellings as graphty's generic names, arrows of several pieces as an end cap and a sized row, arrowhead
 * lengths and widths, outline widths of open arrowheads, dash patterns, corner rounding, screen-fixed border widths
 * and label sizes, uniform node sizing, how labels are shifted and placed, the order overlapping nodes are drawn in,
 * end captions in the label's face, the label grid, default rule names and how the lengths are meant to be drawn.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { STYLE_ISSUE } from "./codes.js";
import { type ToolArrowhead, type ToolDefaults, toolDefaults } from "./defaults.js";
import { type LabelGridFrame, labelGridSizes } from "./labelGrid.js";
import { resolveRule, resolveStyles } from "./plan/resolve.js";
import type {
    ExtractedStyles,
    Mapping,
    StyleArrowShape,
    StyleColumn,
    StyleLengths,
    StyleNote,
    StyleProperty,
    StyleRule,
    StyleTarget,
    StyleTool,
    StyleValue,
} from "./types.js";

/**
 * Options of `settleStyles()`.
 * @category Styles
 */
export interface SettleOptions {
    /** Whether the program's defaults are kept (true, the default) or left out. */
    readonly toolDefaults?: boolean;
    /** Where the program first frames the drawing, for its label grid; null or absent without a canvas. */
    readonly frame?: LabelGridFrame | null;
}

// ------------------------------------------------------------ the generic names

/** graphty's name for each node shape a file's own vocabulary keeps as `other:`. */
export const SHAPES: ReadonlyMap<string, string> = new Map([
    ["other:cross", "cross"],
    ["other:house", "house"],
    ["other:man", "man"],
    ["other:woman", "woman"],
    ["other:round-triangle", "round-triangle"],
    ["other:round-diamond", "round-diamond"],
    ["other:round-pentagon", "round-pentagon"],
    ["other:round-hexagon", "round-hexagon"],
    ["other:round-octagon", "round-octagon"],
    ["other:round-polygon", "round-polygon"],
    ["other:barrel", "barrel"],
    ["other:top-round-rectangle", "top-round-rectangle"],
    ["other:bottom-round-rectangle", "bottom-round-rectangle"],
    ["other:database", "database"],
    // Graphviz's cylinder: a box between two ellipses, the near half of the top one drawn across it
    ["other:cylinder", "database"],
    // vis-network's icon node draws its icon's glyph and no body
    ["other:icon", "none"],
]);

/**
 * The program values {@link SHAPES} and {@link ARROWS} settle to a graphty value that only comes near them: each
 * settled value is noted with `W_STYLE_DRAWN_NEAREST`.
 */
const NEAREST: ReadonlySet<string> = new Set(["other:cylinder", "other:icon", "other:inv-curve", "other:chevron"]);

/** graphty's name for each stroke a file's own line or border vocabulary keeps as `other:`. */
export const STROKES: ReadonlyMap<string, string> = new Map([
    ["other:forward-slash", "forward-slash"],
    ["other:backward-slash", "backward-slash"],
    ["other:vertical-slash", "vertical-slash"],
    ["other:separate-arrow", "separate-arrow"],
    ["other:contiguous-arrow", "contiguous-arrow"],
]);

/** graphty's name for each border style a file's own vocabulary keeps as `other:`. */
const BORDER_STYLES: ReadonlyMap<string, string> = new Map([
    ...STROKES,
    ["other:zigzag", "zigzag"],
    ["other:sinewave", "sinewave"],
]);

/** graphty's name for each arrow a file's own vocabulary keeps as `other:`. */
export const ARROWS: ReadonlyMap<string, string> = new Map([
    ["other:half-bottom", "half-open-flipped"],
    ["other:half-circle", "half-circle"],
    ["other:open-half-circle", "open-half-circle"],
    ["other:curve", "curve"],
    // vis-network's inv_curve: an arc a little back from the end, drawn as the nearest open half circle
    ["other:inv-curve", "open-half-circle"],
    ["other:triangle-tee", "triangle-tee"],
    ["other:triangle-cross", "triangle-cross"],
    ["other:circle-triangle", "circle-triangle"],
    ["other:open-square", "open-box"],
    ["other:open-inverted", "open-inverted"],
    ["other:cross-delta", "cross-delta"],
    ["other:cross-open-delta", "open-cross-delta"],
    ["other:image", "image"],
    // Cytoscape.js's chevron, drawn as the nearest arrow: a short vee
    ["other:chevron", "vee"],
    ["other:cross", "cross"],
    ["other:kite", "kite"],
    ["other:deltoid", "deltoid"],
    ["other:open-vee", "open-vee"],
    // the end cap of each arrow of several pieces (`ARROW_RUNS`); the rest is its row
    ["other:white_delta_bar", "triangle-open"],
    ["other:crows_foot_many_optional", "crow"],
    ["other:crows_foot_many_mandatory", "crow"],
    ["other:crows_foot_one", "stem"],
    ["other:crows_foot_one_mandatory", "stem"],
    ["other:crows_foot_one_optional", "stem"],
    ["other:crows_foot_optional", "stem"],
    ["other:dash", "stem"],
    ["other:skewed-dash", "stem"],
]);

/**
 * The arrows a program draws unlike the shape's own cap: Cytoscape desktop strokes its half arrows (HALF_TOP,
 * HALF_BOTTOM) as one thin barb where Graphviz's halfopen is a filled wedge, and vis-network's crow is a vee turned
 * round where Graphviz's is a crow's foot with a tine along the line.
 */
export const TOOL_ARROWS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(
    Object.entries({
        cytoscape: { half: "half-barb", "other:half-bottom": "half-barb-flipped" },
        "cytoscape-fallbacks": { half: "half-barb", "other:half-bottom": "half-barb-flipped" },
        "vis-network": { crow: "inverted-vee" },
    }).map(([tool, own]) => [tool, new Map([...ARROWS, ...Object.entries(own)])]),
);

/** The basic arrows a viewer draws a cap for. */
export const BASIC_ARROWS: ReadonlySet<string> = new Set([
    "triangle",
    "triangle-open",
    "vee",
    "tee",
    "diamond",
    "diamond-open",
    "circle",
    "circle-open",
    "square",
    "crow",
    "half",
    "inverted",
]);

/**
 * Whether an arrow value draws a cap.
 * @param shape - the value, before it is renamed
 * @returns true for a basic arrow or one with a generic name
 */
function drawsCap(shape: unknown): shape is string {
    return typeof shape === "string" && (BASIC_ARROWS.has(shape) || (ARROWS.get(shape) ?? "none") !== "none");
}

/** One piece of a row: its arrow, and how long along the line and how wide across it, in yEd's pixels. */
interface ArrowRunPart {
    readonly shape: StyleArrowShape;
    readonly along: number;
    readonly across?: number;
    /** Whether its width is the cap's own proportions, which a row may leave out. */
    readonly own?: true;
}

/** yEd's bar, 16 across its line. */
const BAR: ArrowRunPart = { shape: "tee", along: 1, across: 16 };
/**
 * yEd's circle, 10 across: its white disc hides the line, which the stem ahead of it and the line behind it leave out.
 * Its width is the cap's own, so a row may leave it out; on an export, its length against the end cap's tells it from
 * Graphviz's `crowodot`.
 */
const RING: ArrowRunPart = { shape: "circle-open", along: 10, across: 10, own: true };

/**
 * yEd's arrows of several pieces (yed-graphml-specimen-arrows at line width 1, on its standard head's 12 pixels; every
 * length grows with the line as that head does): `lead` is how long the end cap, a stem, reaches back from the line's
 * end, where the line runs on through the row to its end, `head` how long an end cap that is no stem is drawn (12,
 * the standard head's, when not given), and `parts` what is drawn behind the end cap, nearest first.
 */
export const ARROW_RUNS: ReadonlyMap<
    string,
    { readonly lead?: number; readonly head?: number; readonly parts: readonly ArrowRunPart[] }
> = new Map([
    ["other:dash", { lead: 8, parts: [{ ...BAR, across: 8 }] }],
    ["other:skewed-dash", { lead: 4, parts: [{ shape: "slash", along: 8 }] }],
    ["other:crows_foot_one", { lead: 10, parts: [BAR] }],
    ["other:crows_foot_one_mandatory", { lead: 6, parts: [BAR, { shape: "stem", along: 8 }, BAR] }],
    ["other:crows_foot_one_optional", { lead: 6, parts: [BAR, { shape: "stem", along: 3 }, RING] }],
    ["other:crows_foot_optional", { lead: 10, parts: [RING] }],
    ["other:crows_foot_many_mandatory", { parts: [{ shape: "stem", along: 3 }, BAR] }],
    ["other:crows_foot_many_optional", { parts: [RING] }],
    ["other:white_delta_bar", { head: 16, parts: [{ shape: "stem", along: 5 }, BAR] }],
]);

/** How long yEd draws its standard head at line width 1, the pixels `ARROW_RUNS` measures in. */
export const YED_HEAD_LENGTH = 12;

/**
 * The arrows drawn in their cap's own proportions rather than the program's stated width: the stem that ends an arrow
 * of several pieces (the program's width is the whole row's), and yEd Live's cross, kite and deltoid, whose stated
 * widths are not measured against a cap.
 */
// ponytail: a fixed list; give each a measured width when a viewer draws these caps in the program's proportions
const OWN_PROPORTIONS: ReadonlySet<string> = new Set([
    "other:dash",
    "other:skewed-dash",
    "other:crows_foot_one",
    "other:crows_foot_one_mandatory",
    "other:crows_foot_one_optional",
    "other:crows_foot_optional",
    "other:cross",
    "other:kite",
    "other:deltoid",
]);

/** The arrows drawn in the program's triangle proportions where it states none of their own. */
const TRIANGLE_PROPORTIONS: ReadonlySet<string> = new Set([
    "triangle",
    "triangle-open",
    "vee",
    // an open vee has the vee's proportions
    "other:open-vee",
    "inverted",
    "diamond",
    "diamond-open",
]);

/** The programs that stroke an open arrowhead with the edge's own pen, so its outline is as thick as the line. */
const OPEN_ARROWS_STROKED: ReadonlySet<string> = new Set(["graphviz", "cytoscape-js"]);

/** The properties whose values are renamed, per target, with the table each uses. */
const RENAMED: Readonly<Record<StyleTarget, readonly (readonly [string, "shape" | "border" | "line" | "arrow"])[]>> = {
    node: [
        ["shape", "shape"],
        ["underlayShape", "shape"],
        ["overlayShape", "shape"],
        ["borderStyle", "border"],
        ["outerBorderStyle", "border"],
    ],
    edge: [
        ["lineStyle", "line"],
        ["outlineStyle", "line"],
        ["targetArrow", "arrow"],
        ["sourceArrow", "arrow"],
        ["midTargetArrow", "arrow"],
        ["midSourceArrow", "arrow"],
    ],
};

// ------------------------------------------------------------ rule helpers

/**
 * The key of `StyleRule.ext` under which graph-io records what settling changed, so its writers write what the file
 * read (`unsettledStyles()`). A consumer never reads it.
 */
export const SETTLED_EXT = "@graphty/graph-io";

/** What settling changed on one rule. */
interface SettledMark {
    /** The rule holds only values derived for drawing: settling added it. */
    readonly derived?: true;
    /** Each property settling changed, with what the rule gave before (null for nothing). */
    readonly was?: {
        readonly set?: Readonly<Record<string, StyleValue | null>>;
        readonly map?: Readonly<Record<string, Mapping | null>>;
    };
    /** Settling gave the rule its name. */
    readonly named?: true;
}

/**
 * What settling changed on a rule, if anything.
 * @param rule - the rule
 * @returns the mark, or undefined
 */
function markOf(rule: StyleRule): SettledMark | undefined {
    return rule.ext?.[SETTLED_EXT] as SettledMark | undefined;
}

/**
 * A rule with its mark replaced.
 * @param rule - the rule
 * @param mark - the new mark
 * @returns the rule
 */
function withMark(rule: StyleRule, mark: SettledMark): StyleRule {
    return { ...rule, ext: { ...rule.ext, [SETTLED_EXT]: mark } };
}

/**
 * Whether a rule writes a property.
 * @param rule - the rule
 * @param property - the property
 * @returns true when its `set` or `map` gives it
 */
function writes(rule: StyleRule, property: string): boolean {
    return rule.set?.[property as StyleProperty] !== undefined || rule.map?.[property as StyleProperty] !== undefined;
}

/**
 * An object with some entries changed, in its own key order: a value of undefined or null takes the key out, and a key
 * it does not hold yet takes the place of the first key taken out (a renamed property stays where it was), else goes
 * last.
 * @param object - the object
 * @param change - the new values by key
 * @returns the changed object
 */
function rekeyed<V>(
    object: Readonly<Record<string, V | undefined>>,
    change: Readonly<Record<string, V | null | undefined>>,
): Record<string, V> {
    const added = Object.keys(change).filter(
        (key) => !(key in object) && change[key] !== undefined && change[key] !== null,
    );
    const out: Record<string, V> = {};
    for (const [key, value] of Object.entries(object)) {
        if (!(key in change)) {
            if (value !== undefined) {
                out[key] = value;
            }
            continue;
        }
        const next = change[key];
        if (next !== undefined && next !== null) {
            out[key] = next;
        } else {
            const moved = added.shift();
            if (moved !== undefined) {
                out[moved] = change[moved] as V;
            }
        }
    }
    for (const key of added) {
        out[key] = change[key] as V;
    }
    return out;
}

/**
 * A rule with some of its values changed, what it gave before recorded in its mark. A value of undefined takes the
 * property out.
 * @param rule - the rule
 * @param change - the new constants and mappings by property
 * @param change.set - the new constants
 * @param change.map - the new mappings
 * @returns the rule
 */
function changed(
    rule: StyleRule,
    change: {
        readonly set?: Readonly<Record<string, StyleValue | undefined>>;
        readonly map?: Readonly<Record<string, Mapping | undefined>>;
    },
): StyleRule {
    const mark = markOf(rule) ?? {};
    const wasSet: Record<string, StyleValue | null> = { ...mark.was?.set };
    const wasMap: Record<string, Mapping | null> = { ...mark.was?.map };
    for (const property of Object.keys(change.set ?? {})) {
        if (!(property in wasSet)) {
            wasSet[property] = rule.set?.[property as StyleProperty] ?? null;
        }
    }
    for (const property of Object.keys(change.map ?? {})) {
        if (!(property in wasMap)) {
            wasMap[property] = rule.map?.[property as StyleProperty] ?? null;
        }
    }
    const set = rekeyed<StyleValue>(rule.set ?? {}, change.set ?? {});
    const map = rekeyed<Mapping>(rule.map ?? {}, change.map ?? {});
    const was = {
        ...(Object.keys(wasSet).length === 0 ? {} : { set: wasSet }),
        ...(Object.keys(wasMap).length === 0 ? {} : { map: wasMap }),
    };
    const out: StyleRule = {
        ...rule,
        ...(rule.set === undefined && Object.keys(set).length === 0 ? {} : { set: set }),
        ...(rule.map === undefined && Object.keys(map).length === 0 ? {} : { map: map }),
    };
    return withMark(out, { ...mark, was });
}

/** The rules and columns being settled. */
interface Work {
    rules: StyleRule[];
    columns: { node: Map<string, StyleColumn>; edge: Map<string, StyleColumn> };
    /** The program values settled to the nearest graphty value, per target and property, each once per rule. */
    nearest?: Map<string, { target: StyleTarget; property: string; seen: Set<string>; samples: Set<string> }>;
}

/**
 * The styles as they stand in the work, to resolve values under.
 * @param extracted - the styles being settled
 * @param work - the work
 * @param rules - other rules to resolve under, in place of the work's
 * @returns the styles
 */
function current(extracted: ExtractedStyles, work: Work, rules: readonly StyleRule[] = work.rules): ExtractedStyles {
    return { ...extracted, styles: { ...extracted.styles, rules }, columns: work.columns };
}

/**
 * A style column key not yet used for the target.
 * @param work - the work
 * @param target - nodes or edges
 * @param key - the key wanted
 * @returns the key, with a number added when it is taken
 */
function freeKey(work: Work, target: StyleTarget, key: string): string {
    let free = key;
    let k = 2;
    while (work.columns[target].has(free)) {
        free = `${key}.${String(k)}`;
        k++;
    }
    return free;
}

/** Where `addValues()` puts its rule: at the top, or just above the topmost rule writing one of some properties. */
type Placement = "top" | { readonly above: readonly string[] } | { readonly at: number };

/**
 * Adds a rule of values derived for drawing: a property every element gets the same value of is a constant, any other
 * a column of its own read per element. A property with no value anywhere is left out, and no rule is added when none
 * has one.
 * @param work - the work
 * @param rule - the rule's id, name and target
 * @param rule.id - the rule's id
 * @param rule.name - the rule's default name
 * @param rule.target - nodes or edges
 * @param values - the values per property, by element index
 * @param placement - where the rule goes
 */
function addValues(
    work: Work,
    rule: { readonly id: string; readonly name: string; readonly target: StyleTarget },
    values: Readonly<Record<string, readonly (StyleValue | null)[]>>,
    placement: Placement = "top",
): void {
    const set: Record<string, StyleValue> = {};
    const map: Record<string, Mapping> = {};
    for (const [property, column] of Object.entries(values)) {
        const first = column[0] ?? null;
        if (first !== null && column.every((value) => value === first)) {
            set[property] = first;
        } else if (column.some((value) => value !== null)) {
            const key = freeKey(work, rule.target, `${rule.id}.${property}`);
            work.columns[rule.target].set(key, column);
            map[property] = { kind: "passthrough", by: { style: key } };
        }
    }
    if (Object.keys(set).length + Object.keys(map).length === 0) {
        return;
    }
    let { id } = rule;
    let k = 2;
    while (work.rules.some((r) => r.id === id)) {
        id = `${rule.id}.${String(k)}`;
        k++;
    }
    const added: StyleRule = {
        id,
        name: rule.name,
        target: rule.target,
        role: Object.keys(map).length === 0 ? "group" : "passthrough",
        origin: "inferred",
        where: { all: true },
        ...(Object.keys(set).length === 0 ? {} : { set: set }),
        ...(Object.keys(map).length === 0 ? {} : { map: map }),
        ext: { [SETTLED_EXT]: { derived: true } satisfies SettledMark },
    };
    let at = work.rules.length;
    if (typeof placement === "object" && "at" in placement) {
        ({ at } = placement);
    } else if (typeof placement === "object") {
        at = 0;
        work.rules.forEach((r, i) => {
            if (r.target === rule.target && placement.above.some((property) => writes(r, property))) {
                at = i + 1;
            }
        });
    }
    work.rules.splice(at, 0, added);
}

/**
 * Each element's value of a property under rules, read as `resolveStyles()` reads it.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param target - nodes or edges
 * @param property - the property
 * @param rules - other rules to resolve under, in place of the work's
 * @returns the values by element index
 */
function resolved(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    target: StyleTarget,
    property: string,
    rules?: readonly StyleRule[],
): readonly (StyleValue | null)[] {
    return resolveStyles(current(extracted, work, rules), target, property as StyleProperty, snapshot);
}

// ------------------------------------------------------------ settling and back

/**
 * The styles a settled result was settled from, as far as the result says: the rules settling added are taken out,
 * every value it changed is given back, the names it gave are taken off and the columns only those read are dropped.
 * graph-io's writers write these, so a file keeps the program's own spellings and gains no values derived for drawing.
 * Styles that were never settled are given back as they are.
 * @param extracted - the styles
 * @returns the styles as read
 * @internal
 */
export function unsettledStyles(extracted: ExtractedStyles): ExtractedStyles {
    if (
        extracted.styles.lengths === undefined &&
        !extracted.styles.rules.some((rule) => markOf(rule) !== undefined) &&
        !extracted.styles.notes.some((note) => note.code === STYLE_ISSUE.DRAWN_NEAREST)
    ) {
        return extracted;
    }
    const dropped: StyleRule[] = [];
    const rules: StyleRule[] = [];
    for (const rule of extracted.styles.rules) {
        const mark = markOf(rule);
        if (mark === undefined) {
            rules.push(rule);
        } else if (mark.derived === true) {
            dropped.push(rule);
        } else {
            dropped.push(rule);
            rules.push(restored(rule, mark));
        }
    }
    const used = (target: StyleTarget, list: readonly StyleRule[]): Set<string> =>
        new Set(list.filter((r) => r.target === target).flatMap((r) => styleKeysOf(r)));
    const columns = { node: new Map(extracted.columns.node), edge: new Map(extracted.columns.edge) };
    for (const target of ["node", "edge"] as const) {
        const kept = used(target, rules);
        for (const key of used(target, dropped)) {
            if (!kept.has(key)) {
                columns[target].delete(key);
            }
        }
    }
    const { lengths: _lengths, ...styles } = extracted.styles;
    // settling's own notes go with what it settled
    const notes = styles.notes.filter((note) => note.code !== STYLE_ISSUE.DRAWN_NEAREST);
    return { ...extracted, styles: { ...styles, rules, notes }, columns };
}

/**
 * A rule as it was before settling changed it.
 * @param rule - the rule
 * @param mark - what settling changed
 * @returns the rule
 */
function restored(rule: StyleRule, mark: SettledMark): StyleRule {
    const set = rekeyed<StyleValue>(rule.set ?? {}, mark.was?.set ?? {});
    const map = rekeyed<Mapping>(rule.map ?? {}, mark.was?.map ?? {});
    const { [SETTLED_EXT]: _mark, ...ext } = rule.ext ?? {};
    // in the rule's own key order, so a writer writes the same text as before settling
    const parts: Record<string, unknown> = { set, map, ext };
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rule)) {
        const part = parts[key] as Record<string, unknown> | undefined;
        if (part !== undefined) {
            if (Object.keys(part).length > 0) {
                out[key] = part;
            }
        } else if (key !== "name" || mark.named !== true) {
            out[key] = value;
        }
    }
    return out as unknown as StyleRule;
}

/**
 * The style columns a rule reads.
 * @param rule - the rule
 * @returns their keys
 */
function styleKeysOf(rule: StyleRule): string[] {
    const keys: string[] = [];
    const walk = (value: unknown): void => {
        if (Array.isArray(value)) {
            for (const item of value) {
                walk(item);
            }
        } else if (value !== null && typeof value === "object") {
            const { style } = value as { style?: unknown };
            if (typeof style === "string") {
                keys.push(style);
            }
            for (const item of Object.values(value)) {
                walk(item);
            }
        }
    };
    walk(rule.where);
    walk(rule.map);
    return keys;
}

/**
 * Settles a file's styles: every decision that depends on the program that wrote the file is written onto the rules
 * as neutral properties, so a consumer draws them the same way whatever produced them. `extractStyles()` and
 * `importGraph()` return settled styles; settling them again changes nothing.
 * @param extracted - the styles as read
 * @param snapshot - the graph they belong to
 * @param options - whether the program's defaults are kept, and the first framing for a label grid
 * @returns the settled styles
 * @category Styles
 */
export function settleStyles(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    options: SettleOptions = {},
): ExtractedStyles {
    return settleFor(extracted, snapshot, options, extracted.styles.source.tool);
}

/**
 * Settles styles for a program's drawing, which may differ from `source.tool`: a `graphty.styles` block graph-io wrote
 * when it converted another program's file records that program.
 * @param extracted - the styles as read
 * @param snapshot - the graph they belong to
 * @param options - whether the program's defaults are kept, and the first framing for a label grid
 * @param tool - the program whose drawing they are settled for
 * @returns the settled styles
 * @internal
 */
export function settleFor(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    options: SettleOptions,
    tool: StyleTool | null,
): ExtractedStyles {
    if (extracted.styles.lengths !== undefined) {
        return extracted;
    }
    const graphty = tool === "graphty";
    const defaults = tool === null || graphty ? null : toolDefaults(tool);
    // a file graphty wrote keeps the defaults its block carries: they are the look of the program it was converted from
    const keepDefaults = options.toolDefaults !== false;
    const work: Work = {
        rules: extracted.styles.rules.filter((rule) => keepDefaults || rule.origin !== "tool"),
        columns: { node: new Map(extracted.columns.node), edge: new Map(extracted.columns.edge) },
    };
    if (graphty) {
        // graphty wrote a viewer's node outline as `borderColor` before the outline had a property of its own
        work.rules = work.rules.map((rule) => (rule.target === "node" ? outlined(rule) : rule));
    } else {
        corners(work, defaults);
        drawing(extracted, snapshot, work, tool, defaults);
    }
    // per-element values, read before the names change: the program's own measures are keyed by its own names
    if (defaults?.dashes !== undefined) {
        dashes(extracted, snapshot, work, defaults.dashes);
    }
    if (defaults?.arrowhead !== undefined) {
        arrows(extracted, snapshot, work, defaults.arrowhead, tool);
    }
    if (!graphty && snapshot.nodeCount > 1) {
        const last = snapshot.nodeCount - 1;
        addValues(
            work,
            { id: "node.draw-order", name: "Draw order", target: "node" },
            { drawOrder: Array.from({ length: snapshot.nodeCount }, (_unused, i) => Math.round((i * 100) / last)) },
        );
    }
    labelGrid(extracted, snapshot, work, options.frame ?? null);
    renameAll(extracted, snapshot, work, tool);
    const lengths: StyleLengths = graphty ? { units: "scene" } : lengthsOf(defaults, snapshot.nodeCount);
    const notes = [...extracted.styles.notes, ...nearestNotes(work)];
    return {
        ...extracted,
        styles: { ...extracted.styles, lengths, rules: named(work.rules), notes },
        columns: work.columns,
    };
}

/**
 * The notes of the program values settled to the nearest graphty value.
 * @param work - the work
 * @returns one note per target and property
 */
function nearestNotes(work: Work): StyleNote[] {
    return [...(work.nearest?.values() ?? [])].map(({ target, property, seen, samples }) => ({
        code: STYLE_ISSUE.DRAWN_NEAREST,
        params: { property, target, count: seen.size, samples: [...samples] },
        elements: { count: seen.size },
        message: `${target} ${property} ${[...samples].join(", ")} is drawn as the nearest graphty value`,
    }));
}

/**
 * A rule of a file graphty wrote with its `borderColor`, which held a viewer's node outline, as that outline.
 * @param rule - the rule
 * @returns the rule
 */
function outlined(rule: StyleRule): StyleRule {
    const value = rule.set?.borderColor;
    const mapping = rule.map?.borderColor;
    if (value === undefined && mapping === undefined) {
        return rule;
    }
    return changed(rule, {
        ...(value === undefined ? {} : { set: { borderColor: undefined, "graphty:node.outline": value } }),
        ...(mapping === undefined ? {} : { map: { borderColor: undefined, "graphty:node.outline": mapping } }),
    });
}

/**
 * How the program rounds a rounded shape whose file gives no radius, just above each rule of its defaults that gives
 * none: the share of the shorter side and the largest radius, so a 513 x 453 Graphviz cluster keeps small corners and
 * a Cytoscape desktop group an eighth of its side.
 * @param work - the work
 * @param defaults - the program's defaults, or null
 */
function corners(work: Work, defaults: ToolDefaults | null): void {
    const cap = defaults?.roundedCornerRadius?.value;
    const fraction = defaults?.roundedCornerFraction?.value;
    if (cap === undefined && fraction === undefined) {
        return;
    }
    const candidates = work.rules.flatMap((rule, i) =>
        rule.target === "node" && rule.origin === "tool" && rule.set?.cornerRadius === undefined ? [i] : [],
    );
    // the rounding is the program's, for every node: one rule, above its defaults over every node where it has them
    // ponytail: drawn for every node even when the program's only defaults rule is narrower; scope it by that rule's
    // condition if a reader ever writes one
    if (candidates.length === 0) {
        return;
    }
    const at = candidates.find((i) => "all" in work.rules[i].where) ?? candidates[0];
    const one = (value: number | undefined): (number | null)[] => [value ?? null];
    addValues(
        work,
        { id: "node.corners", name: "Corners", target: "node" },
        { cornerRadiusCap: one(cap), cornerFraction: one(fraction) },
        { at: at + 1 },
    );
}

/**
 * How the program draws what the rules hold, per element: every node shape of one size the same extent across, a
 * label shifted by its words, an outside label placed by its words, a border width and label sizes fixed on screen,
 * and an edge's end captions in its label's face.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param tool - the program that wrote the file
 * @param defaults - its defaults, or null
 */
function drawing(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    tool: string | null,
    defaults: ToolDefaults | null,
): void {
    const writer = (target: StyleTarget, props: readonly string[]): boolean =>
        work.rules.some((rule) => rule.target === target && props.some((p) => writes(rule, p)));
    const any = (target: StyleTarget, props: readonly string[], value: StyleValue): (StyleValue | null)[] => {
        const columns = props.map((p) => resolved(extracted, snapshot, work, target, p));
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        return Array.from({ length: n }, (_unused, i) => (columns.some((c) => c[i] !== null) ? value : null));
    };
    const screen = defaults?.labelSizeOnScreen?.value === true;
    const node: Record<string, readonly (StyleValue | null)[]> = {};
    const edge: Record<string, readonly (StyleValue | null)[]> = {};
    if (writer("node", ["width", "height", "shape"])) {
        node.sizeMode = any("node", ["width", "height", "shape"], "uniform");
    }
    const shifts = ["labelShiftX", "labelShiftY"];
    if (tool !== "graphviz") {
        if (writer("node", shifts)) {
            node.labelShiftOf = any("node", shifts, "words");
        }
        if (writer("edge", shifts)) {
            edge.labelShiftOf = any("edge", shifts, "words");
        }
    }
    if (tool === "cytoscape-js" && writer("node", ["labelPosition"])) {
        node.labelGapOf = any("node", ["labelPosition"], "words");
    }
    if (defaults?.nodeBorderOnScreen?.value === true && writer("node", ["borderWidth"])) {
        node.borderScreenWidth = resolved(extracted, snapshot, work, "node", "borderWidth");
    }
    if (screen && writer("node", ["labelSize"])) {
        node.labelScreenSize = resolved(extracted, snapshot, work, "node", "labelSize");
    }
    endCaptions(extracted, snapshot, work, screen, edge);
    if (screen) {
        edge.labelScreenSize = resolved(extracted, snapshot, work, "edge", "labelSize");
    }
    addValues(work, { id: "node.drawing", name: "Drawing", target: "node" }, node);
    addValues(work, { id: "edge.drawing", name: "Drawing", target: "edge" }, edge);
}

/**
 * An edge's end captions as the program draws them, in its label's face: written to `edge` where they differ from what
 * the rules already give them.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param screen - whether the program fixes label sizes on screen
 * @param edge - receives the edge values
 */
function endCaptions(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    screen: boolean,
    edge: Record<string, readonly (StyleValue | null)[]>,
): void {
    // every program draws an edge's end captions in its label's face, size, color, weight and opacity: rule by rule,
    // bottom to top, an end's own value where the rule gives one and the label's elsewhere, the topmost winning
    const fields = ["Size", "Color", "Font", "Weight", "Opacity"];
    const edges = snapshot.edgeCount;
    const caption = (property: string, from: string): (StyleValue | null)[] => {
        const now = current(extracted, work);
        const out = new Array<StyleValue | null>(edges).fill(null);
        for (const rule of work.rules) {
            if (rule.target !== "edge" || (!writes(rule, property) && !writes(rule, from))) {
                continue;
            }
            const own = writes(rule, property) ? resolveRule(now, rule, property as StyleProperty, snapshot) : null;
            const label = writes(rule, from) ? resolveRule(now, rule, from as StyleProperty, snapshot) : null;
            for (let i = 0; i < edges; i++) {
                const value = own?.[i] ?? label?.[i] ?? null;
                if (value !== null) {
                    out[i] = value;
                }
            }
        }
        return out;
    };
    for (const end of ["target", "source"]) {
        for (const f of fields) {
            if (screen && f === "Size") {
                continue;
            }
            const property = `${end}Label${f}`;
            const drawn = caption(property, `label${f}`);
            const own = resolved(extracted, snapshot, work, "edge", property);
            if (drawn.some((value, i) => value !== own[i])) {
                edge[property] = drawn.map((value, i) => (value === own[i] ? null : value));
            }
        }
        if (screen) {
            edge[`${end}LabelScreenSize`] = caption(`${end}LabelSize`, "labelSize");
        }
    }
}

/**
 * The label grid settled into each node's minimum screen size, the grid's own property taken out of every rule.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param frame - the program's first framing, or null
 */
function labelGrid(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    frame: LabelGridFrame | null,
): void {
    if (!work.rules.some((rule) => rule.target === "node" && writes(rule, "labelGridCellSize"))) {
        return;
    }
    const sizes = frame === null ? null : labelGridSizes(current(extracted, work), snapshot, frame);
    work.rules = work.rules.map((rule) =>
        rule.target === "node" && writes(rule, "labelGridCellSize")
            ? changed(rule, {
                  ...(rule.set?.labelGridCellSize === undefined ? {} : { set: { labelGridCellSize: undefined } }),
                  ...(rule.map?.labelGridCellSize === undefined ? {} : { map: { labelGridCellSize: undefined } }),
              })
            : rule,
    );
    if (sizes !== null) {
        addValues(
            work,
            { id: "node.label-grid", name: "Label density", target: "node" },
            {
                labelMinNodeScreenSize: sizes,
            },
        );
    }
}

/**
 * How the lengths are meant to be drawn, and how far apart the program lays out a file's nodes: its stated settled
 * spacing or, for a program that scatters the nodes over a square at random (Gephi), the median nearest-node distance
 * of that many uniform points, side * sqrt(ln 2 / (pi n)).
 * @param defaults - the program's defaults, or null
 * @param nodes - how many nodes the file has
 * @returns the lengths
 */
function lengthsOf(defaults: ToolDefaults | null, nodes: number): StyleLengths {
    const side = defaults?.layoutScatterSide?.value;
    const spacing =
        defaults?.layoutSpacing?.value ??
        (side === undefined || nodes < 2 ? undefined : side * Math.sqrt(Math.LN2 / (Math.PI * nodes)));
    return spacing !== undefined && spacing > 0 ? { units: "file", spacing } : { units: "file" };
}

/**
 * Each edge's dash and gap in its own line's widths, where its program draws its line style in dashes of its own and
 * the file gives the edge none (`dashLength` and `dashGap`). Dots that would repeat within a width, which would merge
 * into a solid line, keep the consumer's own spacing.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param table - the program's dash patterns
 */
function dashes(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    table: NonNullable<ToolDefaults["dashes"]>,
): void {
    const writers: StyleProperty[] = ["width", "lineStyle", "dashLength", "dashGap"];
    if (!work.rules.some((rule) => rule.target === "edge" && writers.some((p) => writes(rule, p)))) {
        return;
    }
    const now = current(extracted, work);
    const [width, style, ownDash, ownGap] = writers.map((p) => resolveStyles(now, "edge", p, snapshot));
    const pattern = style.map((value, i) => {
        const w = width[i];
        const dash = typeof value === "string" ? table[value as keyof typeof table]?.value : undefined;
        if (typeof ownDash[i] === "number" || typeof ownGap[i] === "number") {
            return null;
        }
        if (dash === undefined || typeof w !== "number" || Number.isNaN(w) || w <= 0) {
            return null;
        }
        const pair = dash(w);
        // a dot is drawn round and one width across, so dots repeating within a width would draw a solid line
        return value === "dotted" && pair.dash + pair.gap <= w ? null : pair;
    });
    addValues(
        work,
        { id: "edge.dashes", name: "Dashes", target: "edge" },
        {
            dashLength: pattern.map((p, i) => (p === null ? null : p.dash / (width[i] as number))),
            dashGap: pattern.map((p, i) => (p === null ? null : p.gap / (width[i] as number))),
        },
        { above: writers },
    );
}

/** One end's arrow values per edge. */
interface ArrowEnd {
    readonly shapes: readonly (StyleValue | null)[];
    readonly size: (i: number) => number;
    readonly sources: readonly (StyleValue | null)[];
    readonly length: readonly (StyleValue | null)[];
    readonly breadth: readonly (StyleValue | null)[];
    readonly imageWidth: readonly (StyleValue | null)[];
    readonly imageHeight: readonly (StyleValue | null)[];
}

/**
 * A number of a column, or a fallback.
 * @param values - the column
 * @param i - the element
 * @param fallback - the value where it holds none
 * @returns the number
 */
function factor(values: readonly (StyleValue | null)[], i: number, fallback = 1): number {
    const value = values[i];
    return typeof value === "number" ? value : fallback;
}

/**
 * The size an image arrow is drawn at, where the file gives one: its width across the line and its height along it,
 * a side the file leaves out taken as the other.
 * @param end - the end
 * @param shape - the arrow at the edge
 * @param i - the edge
 * @returns the size, or null for an arrow that is not a sized picture
 */
function imageSizeOf(end: ArrowEnd, shape: unknown, i: number): { width: number; height: number } | null {
    const w = end.imageWidth[i];
    const h = end.imageHeight[i];
    if (shape !== "other:image" || (typeof w !== "number" && typeof h !== "number")) {
        return null;
    }
    const width = typeof w === "number" ? w : (h as number);
    const height = typeof h === "number" ? h : width;
    return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * How long the program draws its plain head at an edge's end, in its units.
 * @param geometry - how the program sizes its arrowheads
 * @param end - the end
 * @param width - the line's width
 * @param i - the edge
 * @returns the length
 */
function headLengthOf(geometry: ToolArrowhead, end: ArrowEnd, width: number, i: number): number {
    const source = end.sources[i];
    return (
        geometry.length(end.size(i), width, typeof source === "string" ? (source as StyleArrowShape) : undefined) *
        factor(end.length, i)
    );
}

/**
 * The program's triangle width over its length at an edge's end: its fixed `aspect`, or its `width` rule over its
 * length where its width grows with the line's (Tk's).
 * @param geometry - how the program sizes its arrowheads
 * @param end - the end
 * @param width - the line's width
 * @param i - the edge
 * @returns the aspect
 */
function triangleAspect(geometry: ToolArrowhead, end: ArrowEnd, width: number, i: number): number {
    if (geometry.width === undefined) {
        return geometry.aspect;
    }
    const size = end.size(i);
    const source = end.sources[i];
    const length = geometry.length(size, width, typeof source === "string" ? (source as StyleArrowShape) : undefined);
    return length > 0 ? geometry.width(size, width) / length : geometry.aspect;
}

/**
 * How long and how wide an arrow is drawn at an edge's end, in the program's units.
 * @param geometry - how the program sizes its arrowheads
 * @param end - the end
 * @param shape - the arrow, by its file name
 * @param width - the line's width
 * @param i - the edge
 * @returns the extent and the breadth (null for the cap's own proportions), or null where no cap is drawn
 */
function arrowSizeOf(
    geometry: ToolArrowhead,
    end: ArrowEnd,
    shape: unknown,
    width: number,
    i: number,
): { extent: number; breadth: number | null } | null {
    if (!drawsCap(shape)) {
        return null;
    }
    const picture = imageSizeOf(end, shape, i);
    if (picture !== null) {
        return { extent: picture.height, breadth: picture.width };
    }
    const own = geometry.shapes?.[shape as StyleArrowShape];
    const lead = ARROW_RUNS.get(shape)?.lead;
    const extent =
        headLengthOf(geometry, end, width, i) * (lead === undefined ? (own?.length ?? 1) : lead / YED_HEAD_LENGTH);
    const aspect =
        own?.aspect ?? (TRIANGLE_PROPORTIONS.has(shape) ? triangleAspect(geometry, end, width, i) : undefined);
    const breadth =
        aspect === undefined || OWN_PROPORTIONS.has(shape)
            ? null
            : (extent * aspect * factor(end.breadth, i)) / factor(end.length, i);
    return { extent, breadth };
}

/**
 * Arrow sizes in the program's proportions: each program sizes its arrowheads from the line width and its own size
 * setting, so each end's length and width are worked out per edge, with the outline of an open arrowhead the program
 * strokes with the line's pen, and each piece of a row behind an end cap at its own size.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param geometry - how the program sizes its arrowheads
 * @param tool - the program, whose own arrow names and pen decide the rest
 */
function arrows(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    geometry: ToolArrowhead,
    tool: StyleTool | null,
): void {
    const stroked = tool !== null && OPEN_ARROWS_STROKED.has(tool);
    const props = [
        "width",
        "arrowSize",
        "targetArrow",
        "sourceArrow",
        "sourceArrowSize",
        "targetArrowLength",
        "sourceArrowLength",
        "targetArrowWidth",
        "sourceArrowWidth",
        "midTargetArrow",
        "midSourceArrow",
        "targetArrowImageWidth",
        "targetArrowImageHeight",
        "sourceArrowImageWidth",
        "sourceArrowImageHeight",
        "midTargetArrowImageWidth",
        "midTargetArrowImageHeight",
        "targetArrowParts",
        "sourceArrowParts",
    ] as const;
    if (!work.rules.some((rule) => rule.target === "edge" && props.some((p) => writes(rule, p)))) {
        return;
    }
    const now = current(extracted, work);
    const r = Object.fromEntries(props.map((p) => [p, resolveStyles(now, "edge", p, snapshot)])) as Record<
        (typeof props)[number],
        readonly (StyleValue | null)[]
    >;
    const none: readonly (StyleValue | null)[] = [];
    const size = (i: number): number => factor(r.arrowSize, i);
    const ends: Record<"target" | "source" | "midTarget" | "midSource", ArrowEnd> = {
        target: {
            shapes: r.targetArrow,
            size,
            sources: r.sourceArrow,
            length: r.targetArrowLength,
            breadth: r.targetArrowWidth,
            imageWidth: r.targetArrowImageWidth,
            imageHeight: r.targetArrowImageHeight,
        },
        source: {
            shapes: r.sourceArrow,
            size: (i) => factor(r.sourceArrowSize, i, size(i)),
            sources: r.sourceArrow,
            length: r.sourceArrowLength,
            breadth: r.sourceArrowWidth,
            imageWidth: r.sourceArrowImageWidth,
            imageHeight: r.sourceArrowImageHeight,
        },
        midTarget: {
            shapes: r.midTargetArrow,
            size,
            sources: r.sourceArrow,
            length: none,
            breadth: none,
            imageWidth: r.midTargetArrowImageWidth,
            imageHeight: r.midTargetArrowImageHeight,
        },
        midSource: {
            shapes: r.midSourceArrow,
            size,
            sources: r.sourceArrow,
            length: none,
            breadth: none,
            imageWidth: none,
            imageHeight: none,
        },
    };
    const parts: Record<"target" | "source", readonly (StyleValue | null)[]> = {
        target: r.targetArrowParts,
        source: r.sourceArrowParts,
    };
    const lineWidth = (i: number): number => factor(r.width, i, 0);
    const values: Record<string, (StyleValue | null)[]> = {};
    const names = TOOL_ARROWS.get(tool ?? "") ?? ARROWS;
    for (const [name, end] of Object.entries(ends) as ["target" | "source" | "midTarget" | "midSource", ArrowEnd][]) {
        const sized = end.shapes.map((shape, i) => arrowSizeOf(geometry, end, shape, lineWidth(i), i));
        values[`${name}ArrowExtent`] = sized.map((s) => s?.extent ?? null);
        values[`${name}ArrowBreadth`] = sized.map((s) => s?.breadth ?? null);
        if (stroked) {
            values[`${name}ArrowOutlineWidth`] = end.shapes.map((shape, i) =>
                drawsCap(shape) && lineWidth(i) > 0 ? lineWidth(i) : null,
            );
        }
        if (name === "target" || name === "source") {
            values[`${name}ArrowParts`] = parts[name].map((value, i) => {
                const shape = end.shapes[i];
                const run = typeof shape === "string" ? ARROW_RUNS.get(shape) : undefined;
                if ((value ?? null) === null && run !== undefined) {
                    const unit = headLengthOf(geometry, end, lineWidth(i), i) / YED_HEAD_LENGTH;
                    return run.parts
                        .map(({ shape: piece, along, across }) =>
                            sizedWord(piece, "", along * unit, across === undefined ? null : across * unit),
                        )
                        .join(" ");
                }
                return sizedParts(value, names, (piece) => arrowSizeOf(geometry, end, piece, lineWidth(i), i));
            });
        }
    }
    addValues(work, { id: "edge.arrows", name: "Arrows", target: "edge" }, values, { above: props });
}

/**
 * One piece of a row as `shape[:side]*length[xwidth]`, in the file's lengths.
 * @param shape - the arrow
 * @param side - `:left`, `:right` or nothing
 * @param along - its length along the line
 * @param across - its width across it, or null for its own proportions
 * @returns the word
 */
function sizedWord(shape: string, side: string, along: number, across: number | null): string {
    const width = across === null ? "" : `x${String(across)}`;
    return `${shape}${side}*${String(along)}${width}`;
}

/**
 * A row's pieces each with its size and width, its arrows by their generic names.
 * @param value - the row: arrows separated by spaces, each optionally followed by `:left` or `:right`
 * @param names - the generic name of each arrow the file names otherwise
 * @param sizeOf - a piece's size, or null where no cap is drawn
 * @returns the sized row, or null when no piece is sized
 */
function sizedParts(
    value: StyleValue | null,
    names: ReadonlyMap<string, string>,
    sizeOf: (shape: string) => { extent: number; breadth: number | null } | null,
): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const words = value
        .trim()
        .split(/\s+/)
        .map((word) => {
            const [, shape = word, side = ""] = /^(.+?)(:left|:right)?$/.exec(word) ?? [];
            const size = sizeOf(shape);
            const name = names.get(shape) ?? shape;
            return size === null
                ? { word: `${name}${side}`, sized: false }
                : {
                      word: sizedWord(name, side, size.extent, size.breadth),
                      sized: true,
                  };
        });
    return words.some((w) => w.sized) ? words.map((w) => w.word).join(" ") : null;
}

/**
 * The program's own shape, line, border and arrow spellings written as graphty's generic names, in every rule and
 * every value a rule reads.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param tool - the program that wrote the file
 */
function renameAll(extracted: ExtractedStyles, snapshot: GraphSnapshot, work: Work, tool: string | null): void {
    const arrowNames = TOOL_ARROWS.get(tool ?? "") ?? ARROWS;
    const tables = { shape: SHAPES, border: BORDER_STYLES, line: STROKES, arrow: arrowNames };
    const noted = (rule: StyleRule, property: string, value: string): void => {
        if (!NEAREST.has(value)) {
            return;
        }
        work.nearest ??= new Map();
        const key = `${rule.target}:${property}`;
        const entry = work.nearest.get(key) ?? {
            target: rule.target,
            property,
            seen: new Set<string>(),
            samples: new Set<string>(),
        };
        entry.seen.add(`${rule.id}\u0000${value}`);
        if (entry.samples.size < 8) {
            entry.samples.add(value);
        }
        work.nearest.set(key, entry);
    };
    const partsOf = (rule: StyleRule, property: string, value: StyleValue): StyleValue =>
        typeof value === "string"
            ? value
                  .split(" ")
                  .map((word) => {
                      // the arrow's name, then its side and its size (`crow:left*8x4`)
                      const cut = word.search(/:left|:right|\*/);
                      const shape = cut <= 0 ? word : word.slice(0, cut);
                      const rest = cut <= 0 ? "" : word.slice(cut);
                      noted(rule, property, shape);
                      return `${arrowNames.get(shape) ?? shape}${rest}`;
                  })
                  .join(" ")
            : value;
    work.rules = work.rules.map((rule) => {
        const renames: (readonly [string, (value: StyleValue) => StyleValue])[] = RENAMED[rule.target].map(
            ([property, kind]) =>
                [
                    property,
                    (value: StyleValue) => {
                        if (typeof value !== "string") {
                            return value;
                        }
                        const renamed = tables[kind].get(value);
                        if (renamed !== undefined) {
                            noted(rule, property, value);
                        }
                        return renamed ?? value;
                    },
                ] as const,
        );
        if (rule.target === "edge") {
            renames.push(
                ["targetArrowParts", (value) => partsOf(rule, "targetArrowParts", value)],
                ["sourceArrowParts", (value) => partsOf(rule, "sourceArrowParts", value)],
            );
        }
        let out = rule;
        for (const [property, rename] of renames) {
            out = renamedIn(extracted, snapshot, work, out, property, rename);
        }
        return out;
    });
}

/**
 * A rule with one property's values renamed: its constant, its table and, for a value read per element, a column of
 * its own holding the renamed values.
 * @param extracted - the styles being settled
 * @param snapshot - the graph
 * @param work - the work
 * @param rule - the rule
 * @param property - the property
 * @param rename - the renaming
 * @returns the rule
 */
function renamedIn(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    work: Work,
    rule: StyleRule,
    property: string,
    rename: (value: StyleValue) => StyleValue,
): StyleRule {
    const p = property as StyleProperty;
    const set = rule.set?.[p];
    const mapping = rule.map?.[p];
    if (set !== undefined) {
        return rename(set) === set ? rule : changed(rule, { set: { [p]: rename(set) } });
    }
    if (mapping === undefined) {
        return rule;
    }
    if (mapping.kind === "discrete") {
        if (!mapping.table.some(([, value]) => rename(value) !== value)) {
            return rule;
        }
        const table = mapping.table.map(([key, value]) => [key, rename(value)] as const);
        return changed(rule, { map: { [p]: { ...mapping, table } } });
    }
    if (mapping.kind !== "passthrough") {
        return rule;
    }
    const values = resolveRule(current(extracted, work), rule, p, snapshot);
    if (!values.some((value) => value !== null && rename(value) !== value)) {
        return rule;
    }
    const key = freeKey(work, rule.target, `${rule.id}.${property}`);
    work.columns[rule.target].set(
        key,
        values.map((value) => (value === null ? null : rename(value))),
    );
    return changed(rule, { map: { [p]: { kind: "passthrough", by: { style: key } } } });
}

/**
 * Every rule with a default name that says what it does, never what produced it; a name the rule has is kept.
 * @param rules - the rules
 * @returns the rules, each named
 */
function named(rules: readonly StyleRule[]): StyleRule[] {
    const used = new Map<string, number>();
    return rules.map((rule) => {
        let name = rule.name ?? defaultName(rule);
        const seen = used.get(`${rule.target} ${name}`) ?? 0;
        used.set(`${rule.target} ${name}`, seen + 1);
        if (seen > 0) {
            name = `${name} ${String(seen + 1)}`;
        }
        if (rule.name === name) {
            return rule;
        }
        const mark = markOf(rule);
        return mark?.derived === true ? { ...rule, name } : withMark({ ...rule, name }, { ...mark, named: true });
    });
}

/**
 * A rule's default name, from what it does.
 * @param rule - the rule
 * @returns the name
 */
function defaultName(rule: StyleRule): string {
    const props = [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})];
    if (props.length === 1 && props[0] === "visible" && rule.set?.visible === false) {
        return rule.target === "node" ? "Hidden nodes" : "Hidden edges";
    }
    if (rule.role === "defaults") {
        return "Defaults";
    }
    if (rule.role === "exceptions") {
        return "Exceptions";
    }
    // a mapping is named by the column it reads; a style column's key is graph-io's own, so it names nothing
    const by = Object.values(rule.map ?? {})
        .map((mapping) => mapping?.by)
        .find((ref) => ref !== undefined && !("style" in ref));
    if (by !== undefined && rule.role !== "group") {
        if ("data" in by) {
            return `By ${by.data}`;
        }
        if ("computed" in by) {
            return `By ${by.computed}`;
        }
    }
    return rule.role === "group" ? "Group" : "Values";
}
