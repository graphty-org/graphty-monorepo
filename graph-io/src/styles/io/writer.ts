/**
 * Writing a graph's styles: what `exportGraph(snapshot, format, { styles })` hands a format's exporter, the losses
 * reported before anything is written, and, for an exporter whose block goes into attributes, the snapshot with the
 * `graphty.styles` block and the tagged per-element values added as attributes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { agree, plural } from "../../common/plural.js";
import type { GraphExporter, LossNote } from "../../types.js";
import { STYLE_ISSUE } from "../codes.js";
import { styleFingerprint } from "../plan/features.js";
import { canonicalFor, dataCell, degreeValues, plainCell, resolveStyles } from "../plan/resolve.js";
import type {
    ExtractedStyles,
    Mapping,
    StyleColumn,
    StyleProperty,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWriteCapabilities,
} from "../types.js";
import { STYLE_BLOCK_NAME, styleBlockLosses, styleTag, writeStyleBlock } from "./block.js";

/**
 * What an exporter with a `styles` member receives as `options.styles` when styles are being written.
 * @category Styles
 */
export interface ExporterStyleInput {
    /**
     * Each element's value of one property, by element index (null where no rule gives one): what graphty draws, to
     * write into the format's own style slots.
     * @param target - nodes or edges
     * @param property - the property
     * @returns the values
     */
    picture(target: StyleTarget, property: StyleProperty): readonly (StyleValue | null)[];
    /** The `graphty.styles` block (JSON text) to place where the format keeps extra data. */
    readonly block: string;
    /** The per-element style values the block's rules read, by attribute name (`graphty.style.<target>.<key>`). */
    readonly tags: {
        /** Node values. */
        readonly node: ReadonlyMap<string, StyleColumn>;
        /** Edge values. */
        readonly edge: ReadonlyMap<string, StyleColumn>;
    };
    /** The styles themselves, for a format with a style language of its own. */
    readonly rules: ExtractedStyles;
}

/**
 * The options an exporter with a `styles` member reads its styles from: type its options as `Opts &
 * ExporterStyleOptions`.
 * @category Styles
 */
export interface ExporterStyleOptions {
    /** Present when styles are being written. */
    readonly styles?: ExporterStyleInput | undefined;
}

/** What an export with styles writes and loses, worked out before writing. */
interface PreparedStyleExport {
    /** The snapshot to hand the exporter: style roles removed, and the block and tagged values added as attributes. */
    readonly snapshot: GraphSnapshot;
    /** The exporter's `options.styles`, or null for an exporter without a `styles` member. */
    readonly input: ExporterStyleInput | null;
    /** W_STYLE_ notes: every property not written natively, and the rules when they are not kept. */
    readonly notes: readonly LossNote[];
    /** E_STYLES_MISMATCH when the styles belong to a different graph; nothing is then written. */
    readonly refusal: LossNote | null;
}

/** The roles of columns that hold styles; with styles given they are data, never written into a style slot. */
const STYLE_ROLES: ReadonlySet<string> = new Set(["color", "size", "shape", "thickness", "hidden"]);
const TARGETS: readonly StyleTarget[] = ["node", "edge"];

/**
 * Works out an export with styles: the refusal when the styles belong to another graph, the losses, the exporter's
 * `options.styles`, and the snapshot to write.
 * @param snapshot - the graph being written
 * @param exporter - the format's exporter
 * @param given - the styles
 * @param plain - the export's other options, which decide what the format loses of the graph's data
 * @returns what to write and what is lost
 */
export function prepareStyleExport(
    snapshot: GraphSnapshot,
    exporter: GraphExporter,
    given: ExtractedStyles,
    plain?: Readonly<Record<string, unknown>>,
): PreparedStyleExport {
    const fp = styleFingerprint(snapshot);
    const want = given.fingerprint;
    if (fp.nodes !== want.nodes || fp.edges !== want.edges || fp.ids !== want.ids) {
        return {
            snapshot,
            input: null,
            notes: [],
            refusal: Object.freeze({
                code: STYLE_ISSUE.MISMATCH,
                message: `the styles were read from or built for a different graph (${String(want.nodes)} nodes and ${String(want.edges)} edges, this graph has ${String(fp.nodes)} and ${String(fp.edges)}, or other node ids); nothing is written`,
                column: null,
                count: null,
            }),
        };
    }
    const caps = exporter.styles?.capabilities ?? null;
    let plan = writePlan(snapshot, exporter, given);
    if (keepsStyleBlock(exporter)) {
        // what the export loses of the graph's data, styles written as they are: the rules' inputs among it are carried
        let checked: readonly LossNote[];
        try {
            checked = exporter.check(plan.snapshot, plan.input === null ? plain : { ...plain, styles: plan.input });
        } catch {
            checked = [];
        }
        const carried = withLostInputsCarried(given, snapshot, checked);
        if (carried !== given) {
            plan = writePlan(snapshot, exporter, carried);
        }
    }
    return {
        snapshot: plan.snapshot,
        input: plan.input,
        notes: lossNotes(plan.extracted, exporter, caps, plan.picture, snapshot),
        refusal: null,
    };
}

/**
 * What an exporter is handed to write a graph's styles: the snapshot with the block and tagged values added where
 * the format keeps them, and its `options.styles`.
 * @param snapshot - the graph
 * @param exporter - the exporter
 * @param extracted - the styles
 * @returns the plan
 */
function writePlan(
    snapshot: GraphSnapshot,
    exporter: GraphExporter,
    extracted: ExtractedStyles,
): {
    readonly snapshot: GraphSnapshot;
    readonly input: ExporterStyleInput | null;
    readonly extracted: ExtractedStyles;
    readonly picture: (target: StyleTarget, property: StyleProperty) => readonly (StyleValue | null)[];
} {
    const caps = exporter.styles?.capabilities ?? null;
    const pictures = new Map<string, readonly (StyleValue | null)[]>();
    const picture = (target: StyleTarget, property: StyleProperty): readonly (StyleValue | null)[] => {
        const key = `${target}\u0000${property}`;
        let values = pictures.get(key);
        if (values === undefined) {
            values = resolveStyles(extracted, target, property, snapshot);
            pictures.set(key, values);
        }
        return values;
    };
    const tags = { node: new Map<string, StyleColumn>(), edge: new Map<string, StyleColumn>() };
    for (const target of TARGETS) {
        for (const [key, col] of extracted.columns[target]) {
            tags[target].set(styleTag(target, key), col);
        }
    }
    const block = writeStyleBlock(extracted, { snapshot });
    return {
        snapshot: styledSnapshot(snapshot, caps, tags, block, extracted.styles.rules),
        input: exporter.styles === undefined ? null : { picture, block, tags, rules: extracted },
        extracted,
        picture,
    };
}

/**
 * Loss notes about a column whose values read back the same: written elsewhere (CSV's node table), under another
 * name a block finds by its values, with another role, storage or number type, or as a wider type.
 */
const VALUES_KEPT = /NODE_TABLE|NAME_CHANGED|ROLE_ASSUMED|STORAGE_CLASS|NUMBER_TYPE|INTEGRAL|WIDENED/;

/**
 * The styles with every input the format will not read back as it is given carried as a style column of its own: a
 * data column the export drops or changes (its loss notes name it), and the in and out degrees when the file does not
 * keep the edges' direction. The rules then read the copies, which the file keeps beside the block, and give back the
 * same values.
 * @param extracted - the styles
 * @param snapshot - the graph
 * @param notes - what the export, styles written as they are, loses
 * @returns the styles, the same object when nothing is lost
 */
function withLostInputsCarried(
    extracted: ExtractedStyles,
    snapshot: GraphSnapshot,
    notes: readonly LossNote[],
): ExtractedStyles {
    const lost = new Set<string>();
    let direction = false;
    for (const note of notes) {
        if (!VALUES_KEPT.test(note.code)) {
            for (const name of note.columns ?? (note.column === null ? [] : [note.column])) {
                lost.add(name);
            }
        }
        direction ||= /DIRECTION/.test(note.code);
    }
    const rules: StyleRule[] = [];
    const columns = { node: new Map(extracted.columns.node), edge: new Map(extracted.columns.edge) };
    let changed = false;
    for (const rule of extracted.styles.rules) {
        const table = rule.target === "node" ? snapshot.nodes : snapshot.edges;
        const n = rule.target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const held = columns[rule.target];
        // one copy per input, shared by every rule that reads it
        const carry = (base: string, values: () => StyleColumn): { style: string } => {
            const key = `input.${base}`;
            if (!held.has(key)) {
                held.set(key, values());
            }
            return { style: key };
        };
        // only a column of plain values can be copied: a list, or a column with no value, stays as it is
        const isLost = (name: unknown): name is string =>
            typeof name === "string" && lost.has(name) && table.has(name) && carriable(table, n, name);
        const cells = (name: string, read: (raw: unknown) => StyleValue | null): StyleColumn =>
            Array.from({ length: n }, (_u, i) => read(dataCell(table, name, i)));
        const { ext, ...given } = rule;
        let touched = false;
        // every other reference to a lost input reads a copy of its values as they are
        const walk = <T>(value: T): T =>
            JSON.parse(
                JSON.stringify(value, (_k, v: unknown) => {
                    if (typeof v !== "object" || v === null || Array.isArray(v) || Object.keys(v).length !== 1) {
                        return v;
                    }
                    const ref = v as { data?: unknown; computed?: unknown };
                    if (isLost(ref.data)) {
                        const name = ref.data;
                        touched = true;
                        return carry(`data.${name}`, () => cells(name, (raw) => (isStyleScalar(raw) ? raw : null)));
                    }
                    const which = ref.computed;
                    if ((which === "indegree" || which === "outdegree") && direction && rule.target === "node") {
                        touched = true;
                        return carry(`computed.${which}`, () => degreeValues(snapshot, which));
                    }
                    return v;
                }),
            ) as T;
        // a passthrough reads a data column as the property's value: its copy holds those values
        const map = Object.create(null) as Record<string, Mapping>;
        for (const [property, mapping] of Object.entries(given.map ?? {})) {
            if (mapping === undefined) {
                continue;
            }
            const name = (mapping.by as { data?: unknown }).data;
            if (mapping.kind !== "passthrough") {
                map[property] = walk(mapping);
                continue;
            }
            const lostColumn = typeof name === "string" && lost.has(name) && table.has(name);
            const values = lostColumn ? cells(name, canonicalFor(rule.target, property)) : null;
            if (values !== null && !values.some((v) => v !== null)) {
                // it gave no element a value (a list, text that is not a color): it is left out, so no other value
                // the file reads back in the column (a list written as text) is given either
                touched = true;
            } else if (values !== null && isLost(name)) {
                touched = true;
                map[property] = { ...mapping, by: carry(`${property}.data.${name}`, () => values) };
            } else {
                map[property] = mapping;
            }
        }
        const where = walk(given.where);
        const { map: _given, ...unmapped } = given;
        const text = JSON.stringify(
            Object.keys(map).length === 0 ? { ...unmapped, where } : { ...unmapped, where, map },
        );
        if (touched) {
            changed = true;
            const moved = JSON.parse(text) as StyleRule;
            rules.push(ext === undefined ? moved : { ...moved, ext });
        } else {
            rules.push(rule);
        }
    }
    return changed ? { ...extracted, styles: { ...extracted.styles, rules }, columns } : extracted;
}

/**
 * Whether a data column can be copied into a style column: some value, and every value text, a finite number or a
 * boolean.
 * @param table - the table
 * @param n - its row count
 * @param name - the column
 * @returns true when it can
 */
function carriable(table: GraphSnapshot["nodes"], n: number, name: string): boolean {
    let some = false;
    for (let i = 0; i < n; i++) {
        const cell = plainCell(table.value(name, i));
        if (cell !== null && cell !== undefined) {
            if (!isStyleScalar(cell)) {
                return false;
            }
            some = true;
        }
    }
    return some;
}

/**
 * Whether a cell is a value a style column holds: text, a finite number or a boolean.
 * @param v - the cell
 * @returns true for a scalar
 */
function isStyleScalar(v: unknown): v is StyleValue {
    return typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));
}

/**
 * Whether an exporter keeps the `graphty.styles` block, natively or as a graph attribute.
 * @param exporter - the exporter
 * @returns true when the block is written
 */
export function keepsStyleBlock(exporter: GraphExporter): boolean {
    const caps = exporter.styles?.capabilities;
    return (
        caps !== undefined &&
        (caps.block === "native" || (caps.block === "attributes" && exporter.capabilities.graphAttributes))
    );
}

/**
 * Whether a loss note is about a property only graphty draws (`graphty:<channel>`) in a file that keeps the block:
 * the block carries it, and no other program would draw it, so nothing is lost.
 * @param note - the note
 * @param exporter - the exporter writing the file
 * @returns true when the note names nothing lost
 */
export function isKeptGraphtyProperty(note: LossNote, exporter: GraphExporter): boolean {
    return note.style?.property.startsWith("graphty:") === true && keepsStyleBlock(exporter);
}

/**
 * The losses of an export with styles: W_STYLE_NOT_WRITTEN for every property the format does not write natively
 * (all of them for an exporter without a `styles` member), and W_STYLE_RULES_NOT_KEPT when the block is not kept.
 * @param extracted - the styles
 * @param exporter - the exporter
 * @param caps - its style capabilities, or null
 * @param picture - each element's value of a property
 * @param snapshot - the graph
 * @returns the notes
 */
function lossNotes(
    extracted: ExtractedStyles,
    exporter: GraphExporter,
    caps: StyleWriteCapabilities | null,
    picture: (target: StyleTarget, property: StyleProperty) => readonly (StyleValue | null)[],
    snapshot: GraphSnapshot,
): LossNote[] {
    const notes: LossNote[] = [];
    const kept = keepsStyleBlock(exporter);
    for (const target of TARGETS) {
        const written = new Set<string>(caps?.[target] ?? []);
        const properties = new Set<string>();
        for (const rule of extracted.styles.rules) {
            if (rule.target === target) {
                for (const p of [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})]) {
                    properties.add(p);
                }
            }
        }
        for (const property of properties) {
            // a property only graphty draws is written into the block alone: lost only when the block is
            if (written.has(property) || (kept && property.startsWith("graphty:"))) {
                if (target === "edge") {
                    notes.push(...pairNotes(snapshot, exporter, property, picture("edge", property as StyleProperty)));
                }
                continue;
            }
            const count = picture(target, property as StyleProperty).filter((v) => v !== null).length;
            notes.push(
                Object.freeze({
                    code: STYLE_ISSUE.NOT_WRITTEN,
                    message: `${target} ${property} is not written: the ${exporter.format} format has no place for it (${String(count)} ${target}${plural(count)} ${agree(count, "has", "have")} a value)`,
                    column: null,
                    count,
                    style: Object.freeze({ target, property: property as StyleProperty }),
                }),
            );
        }
    }
    const graphWritten = new Set<string>(caps?.graph ?? []);
    for (const property of Object.keys(extracted.styles.graph)) {
        if (!graphWritten.has(property)) {
            notes.push(
                Object.freeze({
                    code: STYLE_ISSUE.NOT_WRITTEN,
                    message: `the graph's ${property} is not written: the ${exporter.format} format has no place for it`,
                    column: null,
                    count: 1,
                    style: Object.freeze({ target: "graph" as const, property: property as "background" }),
                }),
            );
        }
    }
    if (kept) {
        notes.push(...styleBlockLosses(writeStyleBlock(extracted, { snapshot }), extracted.styles.rules.length));
    } else if (extracted.styles.rules.length > 0) {
        notes.push(
            Object.freeze({
                code: STYLE_ISSUE.RULES_NOT_KEPT,
                message: `the style rules are not kept: the ${exporter.format} format has no place for them; importing the file infers them again from what it holds`,
                column: null,
                count: extracted.styles.rules.length,
            }),
        );
    }
    return notes;
}

/**
 * W_STYLE_APPROXIMATED for the second halves of undirected edges in a directed graph whose value of a property
 * differs from the first half's: every format writes such an edge once, so both halves read back with one value.
 * @param snapshot - the graph
 * @param exporter - the exporter
 * @param property - the edge property
 * @param values - each edge's value
 * @returns the note, or none
 */
function pairNotes(
    snapshot: GraphSnapshot,
    exporter: GraphExporter,
    property: string,
    values: readonly (StyleValue | null)[],
): LossNote[] {
    const pair = snapshot.edges.byRole("pair");
    let count = 0;
    for (let i = 0; pair !== null && i < values.length; i++) {
        const other = pair.isSet(i) ? (pair.value(i) as number) : i;
        if (other < i && values[i] !== values[other]) {
            count++;
        }
    }
    if (count === 0) {
        return [];
    }
    return [
        Object.freeze({
            code: STYLE_ISSUE.APPROXIMATED,
            message: `edge ${property}: ${String(count)} undirected edge${plural(count)} in a directed graph ${agree(count, "has", "have")} another value on each half; the ${exporter.format} format writes the edge once, with the first half's value`,
            column: null,
            count,
            style: Object.freeze({ target: "edge" as const, property: property as StyleProperty }),
        }),
    ];
}

/**
 * The snapshot an exporter writes when styles are given: columns with a style role keep their data but lose the
 * role (the style writer is the only thing that writes the format's style slots), and for `block: "attributes"`
 * the block becomes a graph attribute and the tagged values element attributes.
 * @param snapshot - the graph
 * @param caps - the exporter's style capabilities, or null
 * @param tags - the tagged per-element values
 * @param tags.node - node values by attribute name
 * @param tags.edge - edge values by attribute name
 * @param block - the block's text
 * @param rules - the rules written, which keep a style value column of an earlier write they read as data
 * @returns the snapshot to write (the same object when nothing changes)
 */
function styledSnapshot(
    snapshot: GraphSnapshot,
    caps: StyleWriteCapabilities | null,
    tags: { readonly node: ReadonlyMap<string, StyleColumn>; readonly edge: ReadonlyMap<string, StyleColumn> },
    block: string,
    rules: readonly StyleRule[],
): GraphSnapshot {
    const attributes = caps?.block === "attributes";
    // the per-element style values of an earlier write whose block was set aside are data now; these styles write
    // their own under the same names, so the old ones go, unless these styles read them as data
    const stale = (table: GraphSnapshot["nodes"], target: StyleTarget): string[] => {
        const read = dataRead(rules, target);
        return Array.from(table.names()).filter((name) => isStyleTagName(name) && !read.has(name));
    };
    const nodeStale = stale(snapshot.nodes, "node");
    const edgeStale = stale(snapshot.edges, "edge");
    // a format that writes the label from the styles has its label slot taken: the label column is data there too
    const roled = (table: GraphSnapshot["nodes"], target: StyleTarget): string[] =>
        Array.from(table.names()).filter((name) => {
            const role = table.get(name)?.meta.role ?? "";
            return STYLE_ROLES.has(role) || (role === "label" && (caps?.[target] ?? []).includes("label"));
        });
    const nodeRoles = roled(snapshot.nodes, "node");
    const edgeRoles = roled(snapshot.edges, "edge");
    // the block of an earlier import is replaced by the one these styles write, wherever the format puts that
    const staleBlock = snapshot.graph.has(STYLE_BLOCK_NAME);
    if (
        !attributes &&
        !staleBlock &&
        nodeRoles.length === 0 &&
        edgeRoles.length === 0 &&
        nodeStale.length === 0 &&
        edgeStale.length === 0
    ) {
        return snapshot;
    }
    const out = snapshot.withColumns();
    if (staleBlock) {
        out.graph.remove(STYLE_BLOCK_NAME);
    }
    for (const [table, names] of [
        [out.nodes, nodeStale],
        [out.edges, edgeStale],
    ] as const) {
        for (const name of names) {
            table.remove(name);
        }
    }
    for (const [table, names] of [
        [out.nodes, nodeRoles],
        [out.edges, edgeRoles],
    ] as const) {
        for (const name of names) {
            const col = table.get(name);
            if (col !== null) {
                // an explicit undefined role in the patch replaces the column's role with none
                table.set(name, col, { role: undefined });
            }
        }
    }
    if (attributes) {
        for (const [table, byName, target] of [
            [out.nodes, tags.node, "node"],
            [out.edges, tags.edge, "edge"],
        ] as const) {
            // the tagged values of an earlier import are replaced, in the order of these styles' columns, so writing
            // a file read back gives the same bytes whichever elements held a value first
            const prefix = styleTag(target, "");
            for (const name of Array.from(table.names())) {
                if (name.startsWith(prefix)) {
                    table.remove(name);
                }
            }
            for (const [name, col] of byName) {
                const dtype = tagDtype(col);
                table.set(name, dtype === "string" ? col.map((v) => (v === null ? null : String(v))) : col, { dtype });
            }
        }
        out.graph.set(STYLE_BLOCK_NAME, [block], { dtype: "string" });
    }
    return out;
}

/**
 * Whether a column name is one graphty writes per-element style values under: `graphty.style.<target>.<key>`, or
 * `graphty_style_<...>` where the format allows no dots in a name (GML, Cytoscape.js).
 * @param name - the column name
 * @returns true for a style value name
 */
function isStyleTagName(name: string): boolean {
    return name.startsWith("graphty.style.") || name.startsWith("graphty_style_");
}

/**
 * The data columns the rules of one target read.
 * @param rules - the rules
 * @param target - nodes or edges
 * @returns the column names
 */
export function dataRead(rules: readonly StyleRule[], target: StyleTarget): Set<string> {
    const out = new Set<string>();
    for (const { ext: _ext, ...rule } of rules.filter((r) => r.target === target)) {
        JSON.stringify(rule, (_k, v: unknown) => {
            const data =
                typeof v === "object" && v !== null && !Array.isArray(v) ? (v as { data?: unknown }).data : null;
            if (typeof data === "string" && Object.keys(v as object).length === 1) {
                out.add(data);
            }
            return v;
        });
    }
    return out;
}

/**
 * The dtype a tagged column is written with: numbers, booleans or text (a mixed column as text).
 * @param col - the values
 * @returns the dtype
 */
function tagDtype(col: StyleColumn): "f64" | "bool" | "string" {
    let kind: string | null = null;
    for (const v of col) {
        if (v === null) {
            continue;
        }
        if (kind === null) {
            kind = typeof v;
        } else if (kind !== typeof v) {
            return "string";
        }
    }
    if (kind === "number") {
        return "f64";
    }
    return kind === "boolean" ? "bool" : "string";
}
