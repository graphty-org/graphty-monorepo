/**
 * Neutral styles written as a Cytoscape.js stylesheet: the rules in order as stylesheet rules, the per-element values
 * those rules read as element data under flat keys, and per-element bypasses for the values no rule gives.
 *
 * - A short predicate becomes a selector (`all`, `has`, `eq`, `in`, `not`, one `and`); a predicate a selector cannot
 *   state exactly (a computed degree, a boolean value, a column whose name a selector cannot spell) becomes a
 *   membership value written into element data and tested with `[key]`.
 * - A passthrough becomes `data(key)` over the values, written ready for Cytoscape.js; a discrete mapping becomes one
 *   rule per table key; a continuous mapping becomes `mapData()`, one per segment; every mapped rule is scoped to the
 *   elements it gives a value, because a Cytoscape.js mapper that finds nothing resets the property to its default.
 * - The stylesheet is then applied to the element data with graph-io's own Cytoscape.js engine, and every element
 *   whose drawn value still differs from the styles gets a bypass (its own `style`), so the result is exact.
 * - With an import id, every element gets `graphty_import: <id>` and every selector tests it, so two imports in one
 *   core never style each other's elements.
 * - Cytoscape.js draws what it draws regardless of any stylesheet: a loop is always curved, and its own default rules
 *   (compound parents, selected elements) apply beneath the stylesheet. A file Cytoscape.js wrote keeps those
 *   defaults as Cytoscape.js's own; they are not written again.
 */

import { STYLE_ISSUE } from "../codes.js";
import { StyleNotes } from "../notes.js";
import { matches, refSource, resolveRules } from "../plan/resolve.js";
import type {
    ColumnRef,
    ExtractedStyles,
    Mapping,
    Predicate,
    Scalar,
    StyleNote,
    StyleRule,
    StyleTarget,
    StyleValue,
} from "../types.js";
import { STYLE_PROPERTIES } from "../vocabulary.js";
import { evaluateCytoscapeJs } from "./cascade.js";
import { CYJS_EDGE_PROPERTIES, CYJS_NODE_PROPERTIES, type CyjsPropertySpec, isFontFamily } from "./mappers.js";
import { parseCyjsSelector } from "./selector.js";

/** One rule of a Cytoscape.js stylesheet. */
export interface CytoscapeStylesheetRule {
    /** The selector. */
    readonly selector: string;
    /** Property name to value, as Cytoscape.js reads them. */
    readonly style: Readonly<Record<string, string | number>>;
}

/** A value written into an element's `data`. */
export type CytoscapeDataValue = string | number | boolean;

/** Per target, one object per element (by element index), or null where the element needs nothing. */
export interface CytoscapePerElement<T> {
    /** Nodes. */
    readonly node: readonly (Readonly<Record<string, T>> | null)[];
    /** Edges. */
    readonly edge: readonly (Readonly<Record<string, T>> | null)[];
}

/** Options of `toCytoscapeStylesheet()`. */
export interface CytoscapeStylesheetOptions {
    /**
     * Scopes the stylesheet to one import: every element gets `graphty_import: <importId>` in its data and every
     * selector tests it. Quotes and backslashes are replaced with `_`, in the data and the selectors alike.
     */
    readonly importId?: string;
}

/** The stylesheet, the element data it reads and the bypasses that make it exact. */
export interface CytoscapeStylesheetResult {
    /** The rules, in order; append them to a core's stylesheet. */
    readonly stylesheet: CytoscapeStylesheetRule[];
    /** What to merge into each element's `data`. */
    readonly elementData: CytoscapePerElement<CytoscapeDataValue>;
    /** What to give each element as its own `style` (a bypass over every rule). */
    readonly bypass: CytoscapePerElement<string | number>;
    /** Every style that could not be written, or only approximately. */
    readonly notes: readonly StyleNote[];
}

/** The element data key that holds the import id. */
export const CYTOSCAPE_IMPORT_KEY = "graphty_import";

/**
 * The flat element data key of a style column: Cytoscape.js reads a dot in a data selector as a nested path, so the
 * key has none (`member.3` is `graphty_style_member_3`).
 * @param key - the style column's key
 * @returns the element data key
 * @category Styles
 */
export function cytoscapeStyleKey(key: string): string {
    return `graphty_style_${key.replaceAll(/\W/g, "_")}`;
}

/** A name a selector and a mapper can both spell without escapes or paths. */
const PLAIN_NAME = /^[A-Za-z_]\w*$/;

/** A neutral value written as Cytoscape.js properties, and whether that is only approximate. */
interface Written {
    readonly props: Record<string, string | number>;
    readonly approximate: boolean;
}

const SHAPES_TO_CYJS: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["rectangle", "rectangle"],
    ["round-rectangle", "round-rectangle"],
    ["triangle", "triangle"],
    ["diamond", "diamond"],
    ["pentagon", "pentagon"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["parallelogram", "rhomboid"],
    ["star", "star"],
    ["vee", "vee"],
]);
const ARROWS_TO_CYJS: ReadonlyMap<string, string> = new Map([
    ["none", "none"],
    ["triangle", "triangle"],
    ["vee", "vee"],
    ["tee", "tee"],
    ["diamond", "diamond"],
    ["circle", "circle"],
    ["square", "square"],
]);
const ARROWS_NEAREST: ReadonlyMap<string, string> = new Map([
    ["triangle-open", "triangle"],
    ["diamond-open", "diamond"],
    ["circle-open", "circle"],
    ["half", "triangle"],
    ["inverted", "triangle"],
    ["crow", "vee"],
]);

/**
 * A neutral value as Cytoscape.js properties.
 * @param target - nodes or edges
 * @param property - the neutral property
 * @param value - the value
 * @returns the properties, or null when Cytoscape.js has no place for it
 */
function toCyjs(target: StyleTarget, property: string, value: StyleValue): Written | null {
    const specs = target === "node" ? CYJS_NODE_PROPERTIES : CYJS_EDGE_PROPERTIES;
    switch (property) {
        case "visible":
            return exact({ display: value === false ? "none" : "element" });
        case "labelItalic":
            return exact({ "font-style": value === true ? "italic" : "normal" });
        case "curved":
            return exact({ "curve-style": value === true ? "bezier" : "straight" });
        case "labelPosition":
            return labelPositionToCyjs(String(value));
        case "shape":
            return enumToCyjs("shape", String(value), SHAPES_TO_CYJS, specs);
        case "borderStyle":
            return borderStyleToCyjs(String(value));
        case "lineStyle":
            return lineStyleToCyjs(String(value));
        case "sourceArrow":
        case "targetArrow":
            return arrowToCyjs(
                property === "sourceArrow" ? "source-arrow-shape" : "target-arrow-shape",
                String(value),
                specs,
            );
        case "labelFont":
            return isFontFamily(String(value)) ? exact({ "font-family": String(value) }) : null;
        default:
            return propertyToCyjs(property, value, specs);
    }
}

/**
 * Properties written exactly.
 * @param props - the properties
 * @returns the written value
 */
function exact(props: Record<string, string | number>): Written {
    return { props, approximate: false };
}

/**
 * Properties written as the nearest Cytoscape.js has.
 * @param props - the properties
 * @returns the written value
 */
function near(props: Record<string, string | number>): Written {
    return { props, approximate: true };
}

/**
 * A label position as the vertical and horizontal alignments.
 * @param text - the position
 * @returns the written value
 */
function labelPositionToCyjs(text: string): Written {
    const v = ["top", "bottom"].find((x) => text.startsWith(x)) ?? "center";
    const h = ["left", "right"].find((x) => text.endsWith(x)) ?? "center";
    return exact({ "text-valign": v, "text-halign": h });
}

/**
 * An enumeration value: Cytoscape.js's name for it, or an `other:` value Cytoscape.js has.
 * @param name - the Cytoscape.js property
 * @param value - the neutral value
 * @param table - the neutral values Cytoscape.js has, by their Cytoscape.js names
 * @param specs - the target's properties
 * @returns the written value, or null when Cytoscape.js has none
 */
function enumToCyjs(
    name: string,
    value: string,
    table: ReadonlyMap<string, string>,
    specs: ReadonlyMap<string, CyjsPropertySpec>,
): Written | null {
    const cy = table.get(value);
    if (cy !== undefined) {
        return exact({ [name]: cy });
    }
    const other = value.startsWith("other:") ? value.slice(6) : null;
    return other !== null && specs.get(name)?.enums?.includes(other) === true ? exact({ [name]: other }) : null;
}

/**
 * An arrow, or the nearest arrow Cytoscape.js has.
 * @param name - the Cytoscape.js property
 * @param value - the neutral arrow
 * @param specs - the target's properties
 * @returns the written value, or null when Cytoscape.js has none near
 */
function arrowToCyjs(name: string, value: string, specs: ReadonlyMap<string, CyjsPropertySpec>): Written | null {
    const own = enumToCyjs(name, value, ARROWS_TO_CYJS, specs);
    if (own !== null) {
        return own;
    }
    const nearest = ARROWS_NEAREST.get(value);
    return nearest === undefined ? null : near({ [name]: nearest });
}

/**
 * A border style: dash-dot is drawn dashed.
 * @param value - the neutral style
 * @returns the written value, or null when Cytoscape.js has none
 */
function borderStyleToCyjs(value: string): Written | null {
    if (value === "dash-dot") {
        return near({ "border-style": "dashed" });
    }
    return ["solid", "dotted", "dashed", "double"].includes(value) ? exact({ "border-style": value }) : null;
}

/**
 * A line style: the dashed kinds are drawn dashed, any other solid.
 * @param value - the neutral style
 * @returns the written value
 */
function lineStyleToCyjs(value: string): Written {
    if (["solid", "dotted", "dashed"].includes(value)) {
        return exact({ "line-style": value });
    }
    return near({ "line-style": value === "dash-dot" || value === "long-dash" ? "dashed" : "solid" });
}

/**
 * Any other property: the Cytoscape.js property that carries it, the value as it is.
 * @param property - the neutral property
 * @param value - the value
 * @param specs - the target's properties
 * @returns the written value, or null when no property carries it
 */
function propertyToCyjs(
    property: string,
    value: StyleValue,
    specs: ReadonlyMap<string, CyjsPropertySpec>,
): Written | null {
    const entry = Array.from(specs).find(([, spec]) => spec.property === property);
    if (entry === undefined) {
        return null;
    }
    const [name, spec] = entry;
    if (spec.type === "positive" && !(typeof value === "number" && value > 0)) {
        return null;
    }
    // Cytoscape.js takes an empty bypass as no bypass at all; a blank, which it trims, draws no text
    if (value === "" && /label$/i.test(property)) {
        return exact({ [name]: " " });
    }
    return exact({ [name]: typeof value === "boolean" ? String(value) : value });
}

/**
 * A selector value literal: a string in quotes (when it holds no quote of that kind and no backslash) or a number.
 * @param v - the value
 * @returns the literal, or null when a selector cannot state it
 */
function literal(v: Scalar): string | null {
    if (typeof v === "number") {
        return Number.isFinite(v) ? String(v) : null;
    }
    if (typeof v !== "string" || v.includes("\\") || /[\n\r\u2028\u2029]/.test(v)) {
        return null;
    }
    if (!v.includes('"')) {
        return `"${v}"`;
    }
    return v.includes("'") ? null : `'${v}'`;
}

/** The state of one emit. */
interface Emit {
    readonly extracted: ExtractedStyles;
    readonly notes: StyleNotes;
    readonly scope: string;
    readonly stylesheet: CytoscapeStylesheetRule[];
    readonly data: { node: Record<string, CytoscapeDataValue>[]; edge: Record<string, CytoscapeDataValue>[] };
    /** Per target, the source (a style column key or a generated name) to the flat key written for it. */
    readonly keys: { readonly node: Map<string, string>; readonly edge: Map<string, string> };
    /** Per target, the flat keys in use. */
    readonly used: { readonly node: Set<string>; readonly edge: Set<string> };
}

/**
 * A flat element data key for a source, unique within the target's data.
 * @param e - the emit
 * @param target - nodes or edges
 * @param source - the source: a style column key, or a generated name
 * @returns the flat key, and whether it is new
 */
function flatKey(e: Emit, target: StyleTarget, source: string): { key: string; fresh: boolean } {
    const known = e.keys[target].get(source);
    if (known !== undefined) {
        return { key: known, fresh: false };
    }
    let key = cytoscapeStyleKey(source);
    let k = 2;
    while (e.used[target].has(key)) {
        key = `${cytoscapeStyleKey(source)}_${String(k)}`;
        k++;
    }
    e.keys[target].set(source, key);
    e.used[target].add(key);
    return { key, fresh: true };
}

/**
 * Writes a column into element data.
 * @param e - the emit
 * @param target - nodes or edges
 * @param key - the flat key
 * @param values - the values by element index; null and false are not written
 */
function writeColumn(
    e: Emit,
    target: StyleTarget,
    key: string,
    values: ArrayLike<CytoscapeDataValue | null | undefined>,
): void {
    const rows = e.data[target];
    for (let i = 0; i < rows.length && i < values.length; i++) {
        const v = values[i];
        if (v !== null && v !== undefined && v !== false) {
            rows[i][key] = v;
        }
    }
}

/**
 * The selector tests of a predicate, as alternatives of conjunctions; null when a selector cannot state it exactly.
 * @param e - the emit
 * @param target - nodes or edges
 * @param where - the predicate
 * @returns the alternatives (each a string of tests), or null
 */
function testsOf(e: Emit, target: StyleTarget, where: Predicate): string[] | null {
    if ("all" in where) {
        return where.all ? [""] : null;
    }
    if ("has" in where) {
        const k = keyOf(e, target, where.has);
        return k === null || !("style" in where.has) ? null : [`[${k}]`];
    }
    if ("eq" in where) {
        return equalTest(e, target, where.eq, "=");
    }
    if ("in" in where) {
        const k = keyOf(e, target, where.in[0]);
        const values = where.in[1].map((x) => literal(x));
        if (values.length === 0) {
            return [];
        }
        return k === null || values.includes(null) ? null : values.map((v) => `[${k} = ${String(v)}]`);
    }
    if ("not" in where) {
        return notTests(e, target, where.not);
    }
    if ("and" in where) {
        return andTests(e, target, where.and);
    }
    if ("or" in where) {
        return orTests(e, target, where.or);
    }
    return null;
}

/**
 * An equality test, or its negation.
 * @param e - the emit
 * @param target - nodes or edges
 * @param eq - the column and the value
 * @param op - `=` or `!=`
 * @returns the test, or null when a selector cannot state it
 */
function equalTest(e: Emit, target: StyleTarget, eq: readonly [ColumnRef, Scalar], op: "=" | "!="): string[] | null {
    const k = keyOf(e, target, eq[0]);
    const v = literal(eq[1]);
    return k === null || v === null ? null : [`[${k} ${op} ${v}]`];
}

/**
 * A negated predicate: only a style column's absence and an inequality are stated.
 * @param e - the emit
 * @param target - nodes or edges
 * @param inner - the predicate negated
 * @returns the tests, or null
 */
function notTests(e: Emit, target: StyleTarget, inner: Predicate): string[] | null {
    if ("has" in inner && "style" in inner.has) {
        const k = keyOf(e, target, inner.has);
        return k === null ? null : [`[^${k}]`];
    }
    return "eq" in inner ? equalTest(e, target, inner.eq, "!=") : null;
}

/**
 * A conjunction: every combination of its parts' alternatives, at most 8.
 * @param e - the emit
 * @param target - nodes or edges
 * @param parts - the predicates joined
 * @returns the alternatives, or null
 */
function andTests(e: Emit, target: StyleTarget, parts: readonly Predicate[]): string[] | null {
    let alts = [""];
    for (const p of parts) {
        const t = testsOf(e, target, p);
        if (t === null) {
            return null;
        }
        alts = alts.flatMap((a) => t.map((b) => a + b));
        if (alts.length > 8) {
            return null;
        }
    }
    return alts;
}

/**
 * A disjunction: its parts' alternatives, at most 8.
 * @param e - the emit
 * @param target - nodes or edges
 * @param parts - the predicates joined
 * @returns the alternatives, or null
 */
function orTests(e: Emit, target: StyleTarget, parts: readonly Predicate[]): string[] | null {
    const out: string[] = [];
    for (const p of parts) {
        const t = testsOf(e, target, p);
        if (t === null) {
            return null;
        }
        out.push(...t);
    }
    return out.length > 8 ? null : out;
}

/**
 * The element data key a column reference is read from: a style column's flat key (its values written into element
 * data) or a data column's own name when a selector can spell it; null for anything else.
 * @param e - the emit
 * @param target - nodes or edges
 * @param ref - the reference
 * @returns the key, or null
 */
function keyOf(e: Emit, target: StyleTarget, ref: ColumnRef): string | null {
    if ("style" in ref) {
        const col = e.extracted.columns[target].get(ref.style);
        if (col === undefined) {
            return null;
        }
        const { key, fresh } = flatKey(e, target, ref.style);
        if (fresh) {
            writeColumn(e, target, key, col);
        }
        return key;
    }
    if (
        "data" in ref &&
        PLAIN_NAME.test(ref.data) &&
        ref.data !== CYTOSCAPE_IMPORT_KEY &&
        !ref.data.startsWith("graphty_")
    ) {
        return ref.data;
    }
    return null;
}

/**
 * The selectors of a rule: its predicate as tests, or a membership value written into element data.
 * @param e - the emit
 * @param rule - the rule
 * @param index - the rule's position
 * @returns the selector prefixes (group and scope included), one per alternative
 */
function selectorsOf(e: Emit, rule: StyleRule, index: number): string[] {
    const head = `${rule.target}${e.scope}`;
    const tests = testsOf(e, rule.target, rule.where);
    if (tests !== null) {
        return tests.map((t) => head + t);
    }
    const src = refSource(
        rule.target,
        e.data[rule.target].length,
        e.extracted.columns[rule.target],
        e.extracted.features[rule.target],
    );
    const { key } = flatKey(e, rule.target, `emit.where.${String(index)}`);
    const col = new Array<boolean | null>(src.n);
    for (let i = 0; i < src.n; i++) {
        col[i] = matches(rule.where, src, i) ? true : null;
    }
    writeColumn(e, rule.target, key, col);
    return [`${head}[${key}]`];
}

/**
 * Emits one rule's constants and mappings.
 * @param e - the emit
 * @param rule - the rule
 * @param index - the rule's position
 */
function emitRule(e: Emit, rule: StyleRule, index: number): void {
    const { target } = rule;
    const selectors = selectorsOf(e, rule, index);
    const constants: Record<string, string | number> = {};
    for (const [p, v] of Object.entries<StyleValue | undefined>(rule.set ?? {})) {
        if (v === undefined) {
            continue;
        }
        const w = written(e, target, p, v);
        if (w !== null) {
            Object.assign(constants, w);
        }
    }
    if (Object.keys(constants).length > 0) {
        for (const sel of selectors) {
            e.stylesheet.push({ selector: sel, style: constants });
            // Cytoscape.js curves a straight loop, but keeps a loop it is told to draw as a haystack
            if (target === "edge" && constants["curve-style"] === "straight") {
                e.stylesheet.push({ selector: `${sel}:loop`, style: { "curve-style": "haystack" } });
            }
        }
    }
    for (const [p, m] of Object.entries<Mapping | undefined>(rule.map ?? {})) {
        if (m !== undefined) {
            emitMapping(e, rule, index, selectors, p, m);
        }
    }
}

/**
 * Whether Cytoscape.js holds a neutral value exactly: a value it cannot hold, or holds only as a nearest one, reads back
 * as something else.
 * @param target - nodes or edges
 * @param property - the neutral property
 * @param value - the value
 * @returns true when it is written as it is
 */
export function cyjsHoldsExactly(target: StyleTarget, property: string, value: StyleValue): boolean {
    const w = toCyjs(target, property, value);
    return w !== null && !w.approximate;
}

/**
 * A value as Cytoscape.js properties, noted when it cannot be written or only approximately.
 * @param e - the emit
 * @param target - nodes or edges
 * @param property - the neutral property
 * @param value - the value
 * @returns the properties, or null
 */
function written(
    e: Emit,
    target: StyleTarget,
    property: string,
    value: StyleValue,
): Record<string, string | number> | null {
    const w = toCyjs(target, property, value);
    if (w === null) {
        e.notes.add(STYLE_ISSUE.NOT_WRITTEN, target, property, { sample: value });
        return null;
    }
    if (w.approximate) {
        e.notes.add(STYLE_ISSUE.APPROXIMATED, target, property, { sample: value });
    }
    return w.props;
}

/**
 * Emits one mapping of a rule.
 * @param e - the emit
 * @param rule - the rule
 * @param index - the rule's position
 * @param selectors - the rule's selectors
 * @param property - the property
 * @param m - the mapping
 */
function emitMapping(
    e: Emit,
    rule: StyleRule,
    index: number,
    selectors: readonly string[],
    property: string,
    m: Mapping,
): void {
    const { target } = rule;
    if (m.kind === "discrete") {
        // one rule per table key, when a selector can state every key; else the per-element values
        const key = keyOf(e, target, m.by);
        const keys = m.table.map(([k]) => literal(k));
        if (key === null || keys.includes(null)) {
            emitValues(e, rule, index, selectors, property);
            return;
        }
        m.table.forEach(([, v], j) => {
            const w = written(e, target, property, v);
            if (w === null) {
                return;
            }
            for (const sel of selectors) {
                e.stylesheet.push({ selector: `${sel}[${key} = ${String(keys[j])}]`, style: w });
            }
        });
        return;
    }
    if (m.kind === "continuous" && isNumericOutput(target, property)) {
        const key = numericKey(e, target, m.by, index);
        if (key !== null) {
            emitContinuous(e, target, selectors, property, key, m.points);
            return;
        }
    }
    emitValues(e, rule, index, selectors, property);
}

/**
 * Whether a property's values are numbers or colors, which `mapData()` interpolates.
 * @param target - nodes or edges
 * @param property - the property
 * @returns true for a number, opacity or color property
 */
function isNumericOutput(target: StyleTarget, property: string): boolean {
    const kind = STYLE_PROPERTIES[target].get(property);
    return kind === "number" || kind === "opacity" || kind === "color";
}

/**
 * The element data key of a mapping's numeric input: a data column a mapper can spell, or the input copied into
 * element data.
 * @param e - the emit
 * @param target - nodes or edges
 * @param by - the input
 * @param index - the rule's position
 * @returns the key, or null when the input has no values
 */
function numericKey(e: Emit, target: StyleTarget, by: ColumnRef, index: number): string | null {
    const src = refSource(target, e.data[target].length, e.extracted.columns[target], e.extracted.features[target]);
    const col = src.column(by);
    if (col === null) {
        return null;
    }
    if ("data" in by && PLAIN_NAME.test(by.data) && !by.data.startsWith("graphty_")) {
        return by.data;
    }
    const { key } = flatKey(e, target, `emit.input.${String(index)}`);
    const values = new Array<number | null>(src.n);
    for (let i = 0; i < src.n; i++) {
        const v = col[i];
        values[i] = typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    writeColumn(e, target, key, values);
    return key;
}

/**
 * A continuous mapping as `mapData()` rules: one per segment, the values below the first point and above the last,
 * and the exact values at the points, each scoped to its input range.
 * @param e - the emit
 * @param target - nodes or edges
 * @param selectors - the rule's selectors
 * @param property - the property
 * @param key - the input's element data key
 * @param points - the points
 */
function emitContinuous(
    e: Emit,
    target: StyleTarget,
    selectors: readonly string[],
    property: string,
    key: string,
    points: readonly { at: number; below: StyleValue; value: StyleValue; above: StyleValue }[],
): void {
    if (points.length === 0) {
        return;
    }
    const lit = String;
    const push = (test: string, style: Record<string, string | number> | null): void => {
        if (style === null) {
            return;
        }
        for (const sel of selectors) {
            e.stylesheet.push({ selector: `${sel}${test}`, style });
        }
    };
    const first = points[0];
    const last = points.at(-1) ?? first;
    push(`[${key} < ${lit(first.at)}]`, written(e, target, property, first.below));
    for (let k = 0; k + 1 < points.length; k++) {
        const a = points[k];
        const b = points[k + 1];
        const wa = written(e, target, property, a.above);
        const wb = written(e, target, property, b.below);
        if (wa === null || wb === null) {
            continue;
        }
        const style: Record<string, string | number> = {};
        for (const name of Object.keys(wa)) {
            style[name] = `mapData(${key}, ${lit(a.at)}, ${lit(b.at)}, ${String(wa[name])}, ${String(wb[name])})`;
        }
        push(`[${key} > ${lit(a.at)}][${key} < ${lit(b.at)}]`, style);
    }
    push(`[${key} > ${lit(last.at)}]`, written(e, target, property, last.above));
    for (const p of points) {
        push(`[${key} = ${lit(p.at)}]`, written(e, target, property, p.value));
    }
}

/**
 * A mapping as its per-element values: what the rule gives each element, written ready for Cytoscape.js into element
 * data and read with `data()`, scoped to the elements that have a value.
 * @param e - the emit
 * @param rule - the rule
 * @param index - the rule's position
 * @param selectors - the rule's selectors
 * @param property - the property
 */
function emitValues(e: Emit, rule: StyleRule, index: number, selectors: readonly string[], property: string): void {
    const { target } = rule;
    const n = e.data[target].length;
    const src = refSource(target, n, e.extracted.columns[target], e.extracted.features[target]);
    const mapping = new Map(Object.entries<Mapping | undefined>(rule.map ?? {})).get(property);
    const only: StyleRule = { ...rule, where: { all: true }, set: undefined, map: { [property]: mapping } };
    const values = resolveRules([only], target, property, src);
    const names = new Map<string, (string | number | null)[]>();
    for (let i = 0; i < n; i++) {
        const v = values[i];
        if (v === null) {
            continue;
        }
        const w = written(e, target, property, v);
        if (w === null) {
            continue;
        }
        for (const [name, x] of Object.entries(w)) {
            let col = names.get(name);
            if (col === undefined) {
                col = new Array<string | number | null>(n).fill(null);
                names.set(name, col);
            }
            col[i] = x;
        }
    }
    for (const [name, col] of names) {
        const { key } = flatKey(e, target, `emit.value.${String(index)}.${name}`);
        writeColumn(e, target, key, col);
        for (const sel of selectors) {
            e.stylesheet.push({ selector: `${sel}[${key}]`, style: { [name]: `data(${key})` } });
        }
    }
}

/**
 * Writes neutral styles as a Cytoscape.js stylesheet, the element data it reads and the bypasses that make it exact.
 * @param extracted - the styles
 * @param options - the import id that scopes the stylesheet
 * @returns the stylesheet, the element data, the bypasses and the notes of what could not be written
 * @category Styles
 */
export function toCytoscapeStylesheet(
    extracted: ExtractedStyles,
    options: CytoscapeStylesheetOptions = {},
): CytoscapeStylesheetResult {
    const notes = new StyleNotes();
    const importId = options.importId?.replaceAll(/["'\\\n\r\u2028\u2029]/g, "_");
    const { nodes } = extracted.fingerprint;
    const { edges } = extracted.fingerprint;
    const e: Emit = {
        extracted,
        notes,
        scope: importId === undefined ? "" : `[${CYTOSCAPE_IMPORT_KEY} = "${importId}"]`,
        stylesheet: [],
        data: {
            node: Array.from({ length: nodes }, () => ({})),
            edge: Array.from({ length: edges }, () => ({})),
        },
        keys: { node: new Map(), edge: new Map() },
        // a flat key never takes the name of a data field the elements already hold
        used: {
            node: new Set([CYTOSCAPE_IMPORT_KEY, ...dataNames(extracted, "node")]),
            edge: new Set([CYTOSCAPE_IMPORT_KEY, ...dataNames(extracted, "edge")]),
        },
    };
    if (importId !== undefined) {
        for (const rows of [e.data.node, e.data.edge]) {
            for (const row of rows) {
                row[CYTOSCAPE_IMPORT_KEY] = importId;
            }
        }
    }
    // Cytoscape.js draws its own defaults: the rules that state them are not written again
    const rules =
        extracted.styles.source.tool === "cytoscape-js"
            ? extracted.styles.rules.filter((r) => r.origin !== "tool")
            : extracted.styles.rules;
    rules.forEach((rule, k) => {
        if (rule.role !== "exceptions") {
            emitRule(e, rule, k);
        }
    });
    const bypass = exactness(e, rules);
    for (const sel of e.stylesheet) {
        if (parseCyjsSelector(sel.selector).invalid) {
            notes.add(STYLE_ISSUE.NOT_WRITTEN, null, "selector", { sample: sel.selector });
        }
    }
    const rows = (list: Record<string, CytoscapeDataValue>[]): (Record<string, CytoscapeDataValue> | null)[] =>
        list.map((r) => (Object.keys(r).length > 0 ? r : null));
    return {
        stylesheet: e.stylesheet,
        elementData: { node: rows(e.data.node), edge: rows(e.data.edge) },
        bypass,
        notes: notes.list(),
    };
}

/**
 * Applies the stylesheet to the element data with graph-io's Cytoscape.js engine and gives every element whose drawn
 * value differs from the styles a bypass with the right value.
 * @param e - the emit
 * @param rules - the rules written (Cytoscape.js's own defaults left out)
 * @returns the bypasses
 */
function exactness(e: Emit, rules: readonly StyleRule[]): CytoscapePerElement<string | number> {
    const { extracted } = e;
    const nodes = e.data.node.length;
    const elements: unknown[] = [];
    for (let i = 0; i < nodes; i++) {
        elements.push({
            group: "nodes",
            data: { ...dataColumns(extracted, "node", i), ...e.data.node[i], id: `n${String(i)}` },
        });
    }
    // the edges join two nodes (no loops: Cytoscape.js draws a loop curved whatever the stylesheet says)
    const far = nodes > 1 ? "n1" : "n0";
    for (let i = 0; i < e.data.edge.length && nodes > 0; i++) {
        elements.push({
            group: "edges",
            data: {
                ...dataColumns(extracted, "edge", i),
                ...e.data.edge[i],
                id: `e${String(i)}`,
                source: "n0",
                target: far,
            },
        });
    }
    const drawn = evaluateCytoscapeJs({ elements, style: e.stylesheet, toolDefaults: false });
    const out = {
        node: [] as (Record<string, string | number> | null)[],
        edge: [] as (Record<string, string | number> | null)[],
    };
    for (const target of ["node", "edge"] as const) {
        const n = e.data[target].length;
        const src = refSource(target, n, extracted.columns[target], extracted.features[target]);
        const rows = new Array<Record<string, string | number> | null>(n).fill(null);
        for (const property of STYLE_PROPERTIES[target].keys()) {
            const want = resolveRules(rules, target, property, src);
            addBypasses(rows, target, property, want, drawn[target].values[property]);
        }
        out[target] = rows;
    }
    return out;
}

/**
 * A bypass of one property for every element whose drawn value differs from the styles' and that Cytoscape.js can
 * hold exactly.
 * @param rows - the bypasses, changed in place
 * @param target - nodes or edges
 * @param property - the property
 * @param want - the styles' values
 * @param got - what is drawn, or undefined for nothing
 */
function addBypasses(
    rows: (Record<string, string | number> | null)[],
    target: StyleTarget,
    property: string,
    want: readonly (StyleValue | null)[],
    got: readonly (StyleValue | null)[] | undefined,
): void {
    for (let i = 0; i < rows.length; i++) {
        const w = want[i];
        const conv = w === null || (got?.[i] ?? null) === w ? null : toCyjs(target, property, w);
        if (conv !== null && !conv.approximate) {
            rows[i] = { ...rows[i], ...conv.props };
        }
    }
}

/**
 * The names of the data columns among the styles' features.
 * @param extracted - the styles
 * @param target - nodes or edges
 * @returns the names
 */
function dataNames(extracted: ExtractedStyles, target: StyleTarget): string[] {
    return extracted.features[target].flatMap((f) => ("data" in f.ref ? [f.ref.data] : []));
}

/**
 * An element's data columns from the styles' features: what a consumer writes into element data from the graph.
 * @param extracted - the styles
 * @param target - nodes or edges
 * @param i - the element
 * @returns the data fields
 */
function dataColumns(extracted: ExtractedStyles, target: StyleTarget, i: number): Record<string, unknown> {
    const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const f of extracted.features[target]) {
        if ("data" in f.ref && f.values[i] !== null) {
            out[f.ref.data] = f.values[i];
        }
    }
    return out;
}
