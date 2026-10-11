/**
 * Reading a file's styles after an import: the importer's own `styles()` (the simple path, canonicalized and planned
 * here, or the advanced path), the generic reader of the style roles (`color`, `size`, `shape`, `thickness`,
 * `hidden`) for an importer without one, and the `graphty.styles` block when a file graphty wrote carries it as a
 * graph attribute.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { keptForStyles } from "../../common/report.js";
import type { GraphImporter, ImportReport } from "../../types.js";
import { StyleBudget } from "../budget.js";
import { canonColor, colorOpacity } from "../canon/color.js";
import { canonEnum, type StyleEnumKind } from "../canon/enums.js";
import { canonBoolean, canonNumber, canonOpacity, DOT_POINTS_PER_INCH, styleLengthUnit } from "../canon/number.js";
import type { CanonSite } from "../canon/site.js";
import { canonText } from "../canon/text.js";
import { STYLE_ISSUE } from "../codes.js";
import { StyleNotes } from "../notes.js";
import { featuresOf, styleFingerprint } from "../plan/features.js";
import { planStyles } from "../plan/plan.js";
import { plainCell } from "../plan/resolve.js";
import type {
    ExtractedStyles,
    GraphStyle,
    ImporterStyles,
    ReaderOutput,
    StyleColumn,
    StyleDialect,
    StyleNote,
    StyleTarget,
    StyleTool,
    StyleValue,
} from "../types.js";
import { STYLE_PROPERTIES } from "../vocabulary.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME } from "./block.js";

/**
 * The `styles` option of `importGraph()` given as an object.
 * @category Styles
 */
export interface StyleImportOptions {
    /**
     * Whether a property the file leaves to its writing program's default gets that program's default (Cytoscape's,
     * Graphviz's, Gephi's ...), so the graph looks as it does there. Defaults to true.
     */
    readonly toolDefaults?: boolean;
}

/**
 * Options of `extractStyles()`.
 * @category Styles
 */
export interface ExtractStylesOptions extends StyleImportOptions {
    /** Cancels the extraction. */
    readonly signal?: AbortSignal | null;
}

const TARGETS: readonly StyleTarget[] = ["node", "edge"];
const ENUM_KINDS: ReadonlySet<string> = new Set(["shape", "borderStyle", "lineStyle", "arrow", "weight", "position"]);

/** What the readers here produce before planning: canonical values and the data columns they came from. */
interface Canonical {
    readonly dialect: StyleDialect | null;
    readonly tool: StyleTool | null;
    readonly units: "px" | "relative";
    readonly graph: GraphStyle;
    readonly node: ReaderOutput;
    readonly edge: ReaderOutput;
    readonly raw: { readonly node: readonly string[]; readonly edge: readonly string[] };
    readonly notes: readonly StyleNote[];
}

/**
 * Reads the styles of a file after its import: the reading importer's own `styles()` (with what its `import()` kept
 * for it), or the columns whose role is a style role when it has none; a `graphty.styles` block carried as a graph
 * attribute gives the rules, with the importer's values as the truth. Called by `importGraph()` when styles are
 * requested; a caller that drives an importer itself (into its own builder) calls it with the report `import()`
 * returned.
 * @param importer - the importer that read the file
 * @param snapshot - the graph it built
 * @param report - the report its `import()` returned
 * @param options - tool defaults and a cancel signal
 * @returns the styles, or null when the file has none
 * @category Styles
 */
export function extractStyles(
    importer: GraphImporter,
    snapshot: GraphSnapshot,
    report: ImportReport,
    options: ExtractStylesOptions = {},
): ExtractedStyles | null {
    const signal = options.signal ?? undefined;
    signal?.throwIfAborted();
    const notes = new StyleNotes();
    const budget = new StyleBudget();
    let canonical: Canonical | null;
    if (importer.styles === undefined) {
        canonical = roleStyles(snapshot, importer.format, notes, budget);
    } else {
        const got = importer.styles(snapshot, { signal, budget, kept: keptForStyles(report) });
        canonical = got === null ? null : canonicalOf(got, snapshot, notes, budget, signal);
    }
    signal?.throwIfAborted();
    const fingerprint = styleFingerprint(snapshot);
    const blockText = graphValue(snapshot, STYLE_BLOCK_NAME);
    if (blockText !== undefined) {
        const parsed = parseStyleBlock(blockText, fingerprint);
        if (parsed.ok) {
            const truth = canonical === null ? {} : { node: canonical.node.values, edge: canonical.edge.values };
            const fromBlock = blockStyles(parsed.block, snapshot, importer.format, truth, canonical?.notes ?? []);
            if (fromBlock !== null) {
                return fromBlock;
            }
            notes.add(STYLE_ISSUE.BLOCK_IGNORED, null, null, { sample: "INVALID" });
        } else {
            notes.add(STYLE_ISSUE.BLOCK_IGNORED, null, null, { sample: parsed.reason });
        }
    }
    if (canonical === null) {
        const list = notes.list();
        return list.length === 0 ? null : emptyStyles(importer.format, list, snapshot, fingerprint);
    }
    const raw = { node: new Set(canonical.raw.node), edge: new Set(canonical.raw.edge) };
    const features = {
        node: featuresOf(snapshot, "node").filter((f) => !("data" in f.ref && raw.node.has(f.ref.data))),
        edge: featuresOf(snapshot, "edge").filter((f) => !("data" in f.ref && raw.edge.has(f.ref.data))),
    };
    const planned = planStyles(
        {
            format: importer.format,
            dialect: canonical.dialect,
            tool: canonical.tool,
            units: canonical.units,
            graph: canonical.graph,
            node: canonical.node,
            edge: canonical.edge,
            fingerprint,
        },
        features,
        {
            toolDefaults: options.toolDefaults,
            budget,
            notes,
            rawColumns: { node: canonical.raw.node, edge: canonical.raw.edge },
            signal,
        },
    );
    if (canonical.notes.length === 0) {
        return planned;
    }
    return { ...planned, styles: { ...planned.styles, notes: [...canonical.notes, ...planned.styles.notes] } };
}

/**
 * A graph attribute's value, or undefined.
 * @param snapshot - the graph
 * @param name - the attribute
 * @returns its value
 */
function graphValue(snapshot: GraphSnapshot, name: string): unknown {
    return snapshot.graph.has(name) ? plainCell(snapshot.graph.value(name, 0)) : undefined;
}

/**
 * Styles holding nothing but notes.
 * @param format - the format
 * @param notes - the notes
 * @param snapshot - the graph
 * @param fingerprint - its fingerprint
 * @returns the styles
 */
function emptyStyles(
    format: string,
    notes: readonly StyleNote[],
    snapshot: GraphSnapshot,
    fingerprint: ExtractedStyles["fingerprint"],
): ExtractedStyles {
    return {
        styles: {
            version: 1,
            source: { format, dialect: null, tool: null },
            units: { length: "px" },
            graph: {},
            rules: [],
            notes,
        },
        columns: { node: new Map(), edge: new Map() },
        features: { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        fingerprint,
    };
}

/**
 * An importer's styles as canonical values: the advanced path as it is, the simple path read and canonicalized.
 * @param got - what the importer's `styles()` returned
 * @param snapshot - the graph
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @param signal - cancels the work
 * @returns the canonical values
 */
function canonicalOf(
    got: ImporterStyles,
    snapshot: GraphSnapshot,
    notes: StyleNotes,
    budget: StyleBudget,
    signal: AbortSignal | undefined,
): Canonical {
    if ("canonical" in got) {
        return {
            dialect: got.dialect ?? null,
            tool: got.tool ?? null,
            units: got.units ?? "px",
            graph: got.graph ?? {},
            node: got.node ?? { values: {} },
            edge: got.edge ?? { values: {} },
            raw: { node: [], edge: [] },
            notes: got.notes ?? [],
        };
    }
    const { dialect } = got;
    const raw = { node: [] as string[], edge: [] as string[] };
    const out = { node: { values: {} } as ReaderOutput, edge: { values: {} } as ReaderOutput };
    for (const target of TARGETS) {
        const given = got[target];
        if (given === undefined) {
            continue;
        }
        const columns = new Map<string, readonly unknown[]>();
        for (const [property, source] of Object.entries(given)) {
            signal?.throwIfAborted();
            const values = rawValues(snapshot, target, property, source, notes, raw[target]);
            if (values !== null) {
                columns.set(property, values);
            }
        }
        out[target] = { values: canonicalize(target, columns, dialect, count(snapshot, target), notes, budget) };
    }
    return {
        dialect,
        tool: null,
        units: styleLengthUnit(dialect),
        graph: {},
        node: out.node,
        edge: out.edge,
        raw,
        notes: [],
    };
}

/**
 * The element count of a target.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the count
 */
function count(snapshot: GraphSnapshot, target: StyleTarget): number {
    return target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
}

/**
 * The raw values of one property on the simple path: a snapshot column by name, or an array by element index.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param property - the property
 * @param source - `{ data: "<column>" }` or an array
 * @param notes - where a missing column is noted
 * @param raw - collects the names of the columns read
 * @returns the values, or null
 */
function rawValues(
    snapshot: GraphSnapshot,
    target: StyleTarget,
    property: string,
    source: unknown,
    notes: StyleNotes,
    raw: string[],
): readonly unknown[] | null {
    if (Array.isArray(source)) {
        return source;
    }
    if (source === null || typeof source !== "object" || typeof (source as { data?: unknown }).data !== "string") {
        notes.add(STYLE_ISSUE.BAD_MAPPING, target, property, { sample: source });
        return null;
    }
    const name = (source as { data: string }).data;
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    if (!table.has(name)) {
        notes.add(STYLE_ISSUE.MAPPING_COLUMN_MISSING, target, property, { sample: name });
        return null;
    }
    raw.push(name);
    const n = count(snapshot, target);
    const out = new Array<unknown>(n);
    for (let i = 0; i < n; i++) {
        out[i] = plainCell(table.value(name, i));
    }
    return out;
}

/**
 * Canonical values of every property of one target. A list value is read as its first item. A color's alpha moves
 * into the fill's or the edge's opacity (multiplied with an opacity the file also states) or is dropped with a note.
 * @param target - nodes or edges
 * @param columns - the raw values per property
 * @param dialect - how they are spelled
 * @param n - the element count
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the canonical values per property
 */
function canonicalize(
    target: StyleTarget,
    columns: ReadonlyMap<string, readonly unknown[]>,
    dialect: StyleDialect,
    n: number,
    notes: StyleNotes,
    budget: StyleBudget,
): Record<string, StyleColumn> {
    const out: Record<string, (StyleValue | null)[]> = {};
    const alphas = new Map<string, (number | null)[]>();
    for (const [property, raws] of columns) {
        const kind = STYLE_PROPERTIES[target].get(property);
        const col = new Array<StyleValue | null>(n).fill(null);
        let alpha: (number | null)[] | null = null;
        for (let i = 0; i < n && i < raws.length; i++) {
            const site: CanonSite = { notes, target, property, element: i, budget };
            let v = raws[i];
            if (Array.isArray(v)) {
                if (v.length > 1) {
                    notes.add(STYLE_ISSUE.BAD_VALUE, target, property, { sample: v, element: i });
                }
                v = v.length === 0 ? null : v[0];
            }
            if (v === null || v === undefined) {
                continue;
            }
            if (kind === "color") {
                const c = canonColor(v, dialect, site, { use: colorUse(target, property) });
                if (c !== null) {
                    col[i] = c.color;
                    if (c.alpha < 1) {
                        alpha ??= new Array<number | null>(n).fill(null);
                        alpha[i] = c.alpha;
                    }
                }
                continue;
            }
            col[i] = canonValue(kind, property, v, dialect, site);
        }
        out[property] = col;
        if (alpha !== null) {
            alphas.set(property, alpha);
        }
    }
    for (const [property, alpha] of alphas) {
        const carrier = OPACITY_OF.get(`${target}.${property}`) ?? null;
        const opacity = carrier === null ? null : (out[carrier] ??= new Array<StyleValue | null>(n).fill(null));
        for (let i = 0; i < n; i++) {
            const a = alpha[i];
            if (a === null) {
                continue;
            }
            const site: CanonSite = { notes, target, property, element: i, budget };
            const stated = opacity === null ? null : (opacity[i] as number | null);
            const merged = colorOpacity(
                { color: out[property][i] as `#${string}`, alpha: a },
                stated,
                site,
                carrier !== null,
            );
            if (opacity !== null) {
                opacity[i] = merged;
            }
        }
    }
    return out;
}

/** The opacity property that carries a color's alpha: a node's fill and an edge's line. */
const OPACITY_OF: ReadonlyMap<string, string> = new Map([
    ["node.fill", "fillOpacity"],
    ["edge.color", "opacity"],
]);

/**
 * How a color is drawn, which decides how a Graphviz color list is read.
 * @param target - nodes or edges
 * @param property - the property
 * @returns the use
 */
function colorUse(target: StyleTarget, property: string): "fill" | "edge" | "line" {
    if (property === "fill") {
        return "fill";
    }
    return target === "edge" && property === "color" ? "edge" : "line";
}

/**
 * The canonical value of a property that is not a color.
 * @param kind - the property's value kind, or undefined for a property outside the vocabulary
 * @param property - the property
 * @param raw - the raw value
 * @param dialect - how it is spelled
 * @param site - where it was read
 * @returns the value, or null
 */
function canonValue(
    kind: string | undefined,
    property: string,
    raw: unknown,
    dialect: StyleDialect,
    site: CanonSite,
): StyleValue | null {
    switch (kind) {
        case "number":
            return canonNumber(
                raw,
                site,
                dialect === "graphviz" && (property === "width" || property === "height") ? DOT_POINTS_PER_INCH : 1,
            );
        case "opacity":
            return canonOpacity(raw, dialect, site);
        case "boolean":
            return canonBoolean(raw, site);
        case "text":
            return canonText(raw, site);
        case undefined:
            // a property only one consumer draws (graphty:<channel>) is carried as it is
            return typeof raw === "string" ||
                typeof raw === "boolean" ||
                (typeof raw === "number" && Number.isFinite(raw))
                ? raw
                : null;
        default:
            return ENUM_KINDS.has(kind) ? canonEnum(kind as StyleEnumKind, raw, dialect, site) : null;
    }
}

/** The style roles and the property each sets, per target; `size` sets a node's width and height. */
const ROLE_PROPERTIES: Readonly<Record<StyleTarget, readonly (readonly [string, readonly string[]])[]>> = {
    node: [
        ["color", ["fill"]],
        ["size", ["width", "height"]],
        ["shape", ["shape"]],
        ["hidden", ["visible"]],
    ],
    edge: [
        ["color", ["color"]],
        ["thickness", ["width"]],
        ["shape", ["lineStyle"]],
        ["hidden", ["visible"]],
    ],
};

/**
 * The generic reader: the styles of the columns whose role is `color`, `size`, `shape`, `thickness` or `hidden`, so a
 * format that tags its style columns needs no reader of its own. A color column holds CSS text or channel numbers
 * (0..1 in a float column, 0..255 otherwise, with an optional alpha); a hidden column holds booleans.
 * @param snapshot - the graph
 * @param dialect - how text values are spelled (the format's name; CSS for a format with no dialect of its own)
 * @param notes - where problems are noted
 * @param budget - the work budget
 * @returns the canonical values, or null when no column has a style role
 */
function roleStyles(
    snapshot: GraphSnapshot,
    dialect: StyleDialect,
    notes: StyleNotes,
    budget: StyleBudget,
): Canonical | null {
    const raw = { node: [] as string[], edge: [] as string[] };
    const out = { node: { values: {} } as ReaderOutput, edge: { values: {} } as ReaderOutput };
    for (const target of TARGETS) {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = count(snapshot, target);
        const columns = new Map<string, readonly unknown[]>();
        for (const [role, properties] of ROLE_PROPERTIES[target]) {
            const col = table.byRole(role);
            if (col === null) {
                continue;
            }
            const { name, dtype } = col.meta;
            raw[target].push(name);
            const vals = new Array<unknown>(n);
            for (let i = 0; i < n; i++) {
                const v = plainCell(table.value(name, i));
                if (role === "color") {
                    vals[i] = channelsColor(v, dtype);
                } else if (role === "hidden") {
                    // a hidden column holds booleans; the neutral property says the opposite
                    vals[i] = typeof v === "boolean" ? !v : null;
                } else {
                    vals[i] = v;
                }
            }
            for (const p of properties) {
                columns.set(p, vals);
            }
        }
        out[target] = { values: canonicalize(target, columns, dialect, n, notes, budget) };
    }
    if (raw.node.length === 0 && raw.edge.length === 0) {
        return null;
    }
    return {
        dialect,
        tool: null,
        units: styleLengthUnit(dialect),
        graph: {},
        node: out.node,
        edge: out.edge,
        raw,
        notes: [],
    };
}

/**
 * A color cell as text: channel numbers become `rgba()` (floats 0..1, integers 0..255); text stays as it is.
 * @param v - the cell
 * @param dtype - the column's dtype
 * @returns the color's text, or the cell unchanged
 */
function channelsColor(v: unknown, dtype: string): unknown {
    if (
        !Array.isArray(v) ||
        (v.length !== 3 && v.length !== 4) ||
        !v.every((x) => typeof x === "number" && Number.isFinite(x))
    ) {
        return v;
    }
    const scale = dtype === "f32" || dtype === "f64" ? 255 : 1;
    const [r, g, b] = (v as number[]).map((x) => Math.round(x * scale));
    const a = v.length === 4 ? (v[3] as number) / (scale === 255 ? 1 : 255) : 1;
    return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(a)})`;
}
