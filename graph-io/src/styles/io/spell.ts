/**
 * Spelling neutral styles in a program's own vocabulary before an exporter writes them. A consumer such as
 * graphty-element hands graph-io styles in graphty's generic names (an end cap and a row of arrow parts, `half-barb`,
 * `inverted-vee`, element shape names, `graphty:node.outline`) with no record of which program they came from; this
 * is the inverse of settling's renames, so a file written from them names what its program reads.
 *
 * Styles graph-io read and gave back with `unsettledStyles()` already hold the program's spellings, and pass through
 * unchanged.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { resolveRule, resolveStyles } from "../plan/resolve.js";
import { ARROW_RUNS, ARROWS, BASIC_ARROWS, SHAPES, STROKES, TOOL_ARROWS, YED_HEAD_LENGTH } from "../settle.js";
import type { ExtractedStyles, Mapping, StyleColumn, StyleProperty, StyleRule, StyleValue } from "../types.js";

/**
 * The file spelling of each generic name: the first spelling settled into it, a name that is itself a basic value
 * kept as it is.
 * @param tables - the settling tables, file spelling to generic name, first wins
 * @param basic - the names never renamed
 * @returns generic name to file spelling
 */
function inverse(tables: readonly ReadonlyMap<string, string>[], basic: Iterable<string>): Map<string, string> {
    const out = new Map<string, string>([...basic].map((name) => [name, name]));
    for (const table of tables) {
        for (const [spelling, generic] of table) {
            if (!out.has(generic)) {
                out.set(generic, spelling);
            }
        }
    }
    return out;
}

// Cytoscape's half barbs and vis-network's turned vee are spelled as those programs name them.
const ARROW_SPELLING = inverse([ARROWS, ...TOOL_ARROWS.values()], BASIC_ARROWS);
const SHAPE_SPELLING = inverse([SHAPES], ["none"]);
// zigzag and sinewave are line styles of their own; only the strokes are `other:` spellings
const STROKE_SPELLING = inverse([STROKES], ["zigzag", "sinewave"]);

/** The formats whose program spells a generic shape otherwise than the first spelling: Graphviz's database is its cylinder. */
const FORMAT_SHAPES: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
    ["dot", new Map([...SHAPE_SPELLING, ["database", "other:cylinder"]])],
]);

const ARROW_PROPERTIES = ["targetArrow", "sourceArrow", "midTargetArrow", "midSourceArrow"] as const;
const RENAMED: Readonly<Record<"node" | "edge", readonly (readonly [string, ReadonlyMap<string, string>])[]>> = {
    node: [
        ["shape", SHAPE_SPELLING],
        ["underlayShape", SHAPE_SPELLING],
        ["overlayShape", SHAPE_SPELLING],
        ["borderStyle", STROKE_SPELLING],
        ["outerBorderStyle", STROKE_SPELLING],
    ],
    edge: [
        ["lineStyle", STROKE_SPELLING],
        ["outlineStyle", STROKE_SPELLING],
        ...ARROW_PROPERTIES.map((p) => [p, ARROW_SPELLING] as const),
    ],
};

/** The formats whose programs name yEd's arrows of several pieces. */
const YED_ROW_FORMATS: ReadonlySet<string> = new Set(["graphml", "gml"]);
/** The formats that spell an arrow's parts in its name (Graphviz's compound arrows). */
const PART_NAME_FORMATS: ReadonlySet<string> = new Set(["dot"]);

/** One word of an arrow row: `shape[:side][*along[xacross]]`. */
interface Piece {
    readonly shape: string;
    readonly side: string;
    readonly along: number | null;
    readonly across: number | null;
}

/**
 * The words of an arrow row.
 * @param value - the row
 * @returns its pieces, or null when it is no row
 */
function piecesOf(value: StyleValue | null): Piece[] | null {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }
    return value
        .trim()
        .split(/\s+/)
        .map((word) => {
            const match: readonly (string | undefined)[] =
                /^([^:*]+)(:left|:right)?(?:\*([^x]+)(?:x(.+))?)?$/.exec(word) ?? [];
            const [, shape = word, side = "", along, across] = match;
            return {
                shape,
                side,
                along: along === undefined ? null : Number(along),
                across: across === undefined ? null : Number(across),
            };
        });
}

/**
 * Whether two lengths agree, to rounding.
 * @param a - one
 * @param b - the other
 * @returns true when equal within a thousandth
 */
const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));

/** One piece of a yEd arrow's row, as `ARROW_RUNS` gives it. */
type RunPart = NonNullable<ReturnType<typeof ARROW_RUNS.get>>["parts"][number];

/**
 * Whether a piece of a row is a piece of a yEd arrow's row, at a scale.
 * @param piece - the piece
 * @param part - the yEd arrow's piece
 * @param unit - the row's length per yEd pixel, null for a row with no lengths
 * @returns true when it is
 */
function pieceFits(piece: Piece, part: RunPart, unit: number | null): boolean {
    if (piece.shape !== part.shape || piece.side !== "") {
        return false;
    }
    if (unit === null) {
        return piece.along === null && (piece.across === null) === (part.across === undefined);
    }
    if (piece.along === null || !near(piece.along, part.along * unit)) {
        return false;
    }
    if (part.across === undefined || piece.across === null) {
        // a width left out is the cap's own proportions
        return piece.across === null && (part.across === undefined || part.own === true);
    }
    return near(piece.across, part.across * unit);
}

/**
 * The yEd arrow an end cap and the row behind it draw: the same pieces in the same proportions, at any line width,
 * and, where the end cap's own length is given, in the same proportion to it.
 * @param cap - the end cap
 * @param parts - the row
 * @param extent - how long the end cap is drawn, in the row's lengths, or null when not known
 * @returns the yEd arrow's `other:` name, or undefined
 */
export function yedRowOf(
    cap: StyleValue | null,
    parts: StyleValue | null,
    extent: StyleValue | null = null,
): string | undefined {
    const pieces = piecesOf(parts);
    if (typeof cap !== "string" || pieces === null) {
        return undefined;
    }
    const generic = ARROWS.get(cap) ?? cap;
    for (const [name, run] of ARROW_RUNS) {
        if (ARROWS.get(name) !== generic || run.parts.length !== pieces.length) {
            continue;
        }
        const lead = pieces[0].along;
        const unit = lead === null ? null : lead / run.parts[0].along;
        const head = run.lead ?? run.head ?? YED_HEAD_LENGTH;
        if (unit !== null && typeof extent === "number" && !near(extent, head * unit)) {
            continue;
        }
        if (run.parts.every((part, k) => pieceFits(pieces[k], part, unit))) {
            return name;
        }
    }
    return undefined;
}

/**
 * An arrow row as Graphviz's writer reads it: each piece by its file spelling, with its side and no size.
 * @param value - the row
 * @returns the row
 */
function partNames(value: StyleValue): StyleValue {
    const pieces = piecesOf(value);
    return pieces === null ? value : pieces.map((p) => `${ARROW_SPELLING.get(p.shape) ?? p.shape}${p.side}`).join(" ");
}

/** The styles being spelled. */
interface Work {
    readonly extracted: ExtractedStyles;
    readonly snapshot: GraphSnapshot;
    readonly columns: { node: Map<string, StyleColumn>; edge: Map<string, StyleColumn> };
}

/**
 * A rule with one property's values changed: a renaming of every value (`pure`) changes a constant or a table in
 * place; any other change, or a value read per element, gets a column of its own.
 * @param work - the work
 * @param rule - the rule
 * @param property - the property
 * @param change - the new value of an element's value, null for none
 * @param pure - whether the change depends on the value alone
 * @returns the rule
 */
function rewritten(
    work: Work,
    rule: StyleRule,
    property: string,
    change: (value: StyleValue, i: number) => StyleValue | null,
    pure: boolean,
): StyleRule {
    const p = property as StyleProperty;
    const set = rule.set?.[p];
    const mapping = rule.map?.[p];
    if (set === undefined && mapping === undefined) {
        return rule;
    }
    if (pure && set !== undefined) {
        const next = change(set, 0);
        return next === set ? rule : { ...rule, set: withEntry(rule.set, p, next) };
    }
    if (pure && mapping?.kind === "discrete") {
        if (!mapping.table.some(([, value]) => change(value, 0) !== value)) {
            return rule;
        }
        const table = mapping.table.map(([key, value]) => [key, change(value, 0) ?? value] as const);
        return { ...rule, map: { ...rule.map, [p]: { ...mapping, table } } };
    }
    if (mapping !== undefined && mapping.kind !== "passthrough" && mapping.kind !== "discrete") {
        return rule;
    }
    const current = { ...work.extracted, columns: work.columns };
    const values = resolveRule(current, rule, p, work.snapshot);
    const next = values.map((value, i) => (value === null ? null : change(value, i)));
    if (next.every((value, i) => value === values[i])) {
        return rule;
    }
    const key = freeColumnKey(work.columns[rule.target], `${rule.id}.${property}`);
    work.columns[rule.target].set(key, next);
    const map: Partial<Record<StyleProperty, Mapping>> = {
        ...rule.map,
        [p]: { kind: "passthrough", by: { style: key } },
    };
    return withoutSet({ ...rule, map }, p);
}

/**
 * A column key not yet taken: the key, else the key with `.2`, `.3` and so on.
 * @param columns - the columns
 * @param key - the key wanted
 * @returns the key
 */
function freeColumnKey(columns: ReadonlyMap<string, StyleColumn>, key: string): string {
    let free = key;
    let k = 2;
    while (columns.has(free)) {
        free = `${key}.${String(k)}`;
        k++;
    }
    return free;
}

/**
 * A rule without one property's constant, and without its `set` once that is empty.
 * @param rule - the rule
 * @param property - the property
 * @returns the rule
 */
function withoutSet(rule: StyleRule, property: StyleProperty): StyleRule {
    if (rule.set?.[property] === undefined) {
        return rule;
    }
    const rest = withEntry(rule.set, property, null);
    if (Object.keys(rest).length === 0) {
        const { set: _set, ...bare } = rule;
        return bare;
    }
    return { ...rule, set: rest };
}

/**
 * A record with one entry changed, in place; null takes it out.
 * @param record - the record
 * @param key - the entry
 * @param value - its new value
 * @returns the record
 */
function withEntry<V>(
    record: Readonly<Partial<Record<StyleProperty, V>>> | undefined,
    key: StyleProperty,
    value: V | null,
): Partial<Record<StyleProperty, V>> {
    const out: Partial<Record<StyleProperty, V>> = {};
    for (const [k, v] of Object.entries(record ?? {}) as [StyleProperty, V][]) {
        if (k !== key) {
            out[k] = v;
        } else if (value !== null) {
            out[k] = value;
        }
    }
    return out;
}

/**
 * A node rule's `graphty:node.outline` as the `borderColor` a program draws a node's outline with, where the rule
 * gives no border color of its own.
 * @param rule - the rule
 * @returns the rule
 */
function outlineAsBorder(rule: StyleRule): StyleRule {
    const key = "graphty:node.outline" as StyleProperty;
    const border = "borderColor" as StyleProperty;
    const value = rule.set?.[key];
    const mapping = rule.map?.[key];
    if (
        (value === undefined && mapping === undefined) ||
        rule.set?.[border] !== undefined ||
        rule.map?.[border] !== undefined
    ) {
        return rule;
    }
    const rename = <V>(record: Readonly<Partial<Record<StyleProperty, V>>>): Partial<Record<StyleProperty, V>> =>
        Object.fromEntries(Object.entries(record).map(([k, v]) => [k === key ? border : k, v]));
    return {
        ...rule,
        ...(rule.set === undefined ? {} : { set: rename(rule.set) }),
        ...(rule.map === undefined ? {} : { map: rename(rule.map) }),
    };
}

/**
 * Styles in the vocabulary of the program a format is written for: graphty's generic shape, stroke and arrow names as
 * the file's own spellings, an end cap and row that draw a yEd arrow as that arrow's name (GraphML and GML), an arrow
 * row as the parts of a Graphviz arrow name (DOT), and a node outline as its border color. A value no program
 * spelling holds is left as it is, for the writer to write the nearest or leave out.
 * @param extracted - the styles
 * @param snapshot - the graph they belong to
 * @param format - the format being written
 * @returns the styles, the same object when nothing changes
 */
export function spellForFormat(extracted: ExtractedStyles, snapshot: GraphSnapshot, format: string): ExtractedStyles {
    const work: Work = {
        extracted,
        snapshot,
        columns: { node: new Map(extracted.columns.node), edge: new Map(extracted.columns.edge) },
    };
    let rules = extracted.styles.rules.map((rule) => (rule.target === "node" ? outlineAsBorder(rule) : rule));

    // a yEd arrow is read per element, from the end cap and the row of whichever rules give them
    if (YED_ROW_FORMATS.has(format) || PART_NAME_FORMATS.has(format)) {
        const current = { ...extracted, styles: { ...extracted.styles, rules }, columns: work.columns };
        for (const end of ["target", "source"] as const) {
            const caps = resolveStyles(current, "edge", `${end}Arrow`, snapshot);
            const parts = resolveStyles(current, "edge", `${end}ArrowParts`, snapshot);
            const extents = resolveStyles(current, "edge", `${end}ArrowExtent`, snapshot);
            const rows = caps.map((cap, i) => yedRowOf(cap, parts[i] ?? null, extents[i] ?? null));
            if (rows.every((row) => row === undefined)) {
                continue;
            }
            rules = rules.map((rule) => {
                if (rule.target !== "edge") {
                    return rule;
                }
                // the row is the arrow's name, so the parts are not written again
                let out = rewritten(
                    work,
                    rule,
                    `${end}ArrowParts`,
                    (value, i) => (rows[i] === undefined ? value : null),
                    false,
                );
                if (YED_ROW_FORMATS.has(format)) {
                    out = rewritten(work, out, `${end}Arrow`, (value, i) => rows[i] ?? value, false);
                }
                return out;
            });
        }
    }

    rules = rules.map((rule) => {
        let out = rule;
        for (const [property, common] of RENAMED[rule.target]) {
            const table = common === SHAPE_SPELLING ? (FORMAT_SHAPES.get(format) ?? common) : common;
            out = rewritten(
                work,
                out,
                property,
                (value) => (typeof value === "string" ? (table.get(value) ?? value) : value),
                true,
            );
        }
        if (rule.target === "edge" && PART_NAME_FORMATS.has(format)) {
            for (const property of ["targetArrowParts", "sourceArrowParts"]) {
                out = rewritten(work, out, property, partNames, true);
            }
        }
        return out;
    });

    const changed = rules.some((rule, k) => rule !== extracted.styles.rules[k]);
    return changed ? { ...extracted, styles: { ...extracted.styles, rules }, columns: work.columns } : extracted;
}
