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
 * The work an exporter shares between the check and the write of one export call, by the styles input made for that
 * call (null until the first exporter step does it). Only an input writePlan() made is here, so an input a caller
 * builds and changes in place is always worked out again.
 */
const CALL_WORK = new WeakMap<
    ExporterStyleInput,
    { readonly key: readonly unknown[]; readonly value: unknown } | null
>();

/**
 * Work an exporter does from its styles input once per export call: the registry checks before it writes, with the
 * same input, graph and options. Outside an export call (an input the caller made) it is done every time.
 * @param input - the exporter's `options.styles`
 * @param key - what else the work reads (the graph, options), compared by identity
 * @param compute - the work
 * @returns its result
 */
export function sharedInExportCall<T>(input: ExporterStyleInput, key: readonly unknown[], compute: () => T): T {
    if (!CALL_WORK.has(input)) {
        return compute();
    }
    const done = CALL_WORK.get(input);
    if (done?.key.length === key.length && done.key.every((k, i) => k === key[i])) {
        return done.value as T;
    }
    const value = compute();
    CALL_WORK.set(input, { key, value });
    return value;
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
    const input = exporter.styles === undefined ? null : { picture, block, tags, rules: extracted };
    if (input !== null) {
        CALL_WORK.set(input, null);
    }
    return {
        snapshot: styledSnapshot(snapshot, caps, tags, block, extracted.styles.rules),
        input,
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
    const carrier = new LostInputs(snapshot, lost, direction, extracted.columns);
    const rules = extracted.styles.rules.map((rule) => carrier.carry(rule));
    const changed = rules.some((rule, i) => rule !== extracted.styles.rules[i]);
    return changed ? { ...extracted, styles: { ...extracted.styles, rules }, columns: carrier.columns } : extracted;
}

/** Carries the inputs of rules that the format will not read back into style columns of their own. */
class LostInputs {
    /** The style columns, the copies added. */
    readonly columns: { readonly node: Map<string, StyleColumn>; readonly edge: Map<string, StyleColumn> };

    /** Whether the rule being carried read a lost input. */
    private touched = false;

    /**
     * A carrier for one export.
     * @param snapshot - the graph
     * @param lost - the data columns the export drops or changes
     * @param direction - whether the file loses the edges' direction (and so the in and out degrees)
     * @param columns - the styles' own style columns
     * @param columns.node - the node columns
     * @param columns.edge - the edge columns
     */
    constructor(
        private readonly snapshot: GraphSnapshot,
        private readonly lost: ReadonlySet<string>,
        private readonly direction: boolean,
        columns: { readonly node: ReadonlyMap<string, StyleColumn>; readonly edge: ReadonlyMap<string, StyleColumn> },
    ) {
        this.columns = { node: new Map(columns.node), edge: new Map(columns.edge) };
    }

    /**
     * A rule with every lost input it reads replaced by a copy of its values.
     * @param rule - the rule
     * @returns the rule read from copies, or the rule itself when it reads no lost input
     */
    carry(rule: StyleRule): StyleRule {
        this.touched = false;
        const { ext, ...given } = rule;
        const map = this.carryMap(rule);
        const where = this.walk(rule, given.where);
        if (!this.touched) {
            return rule;
        }
        const { map: _given, ...unmapped } = given;
        const plain = Object.keys(map).length === 0 ? { ...unmapped, where } : { ...unmapped, where, map };
        // a JSON copy drops undefined members, as the written block does; structuredClone would keep them
        const moved = JSON.parse(JSON.stringify(plain)) as StyleRule; // NOSONAR(S7784): undefined members must go
        return ext === undefined ? moved : { ...moved, ext };
    }

    /**
     * A rule's mappings with their lost inputs replaced. A passthrough reads a data column as the property's value: its
     * copy holds those values; one that gives no element a value (a list, text that is not a color) is left out, so
     * no other value the file reads back in the column (a list written as text) is given either.
     * @param rule - the rule
     * @returns the mappings
     */
    private carryMap(rule: StyleRule): Record<string, Mapping> {
        const map = Object.create(null) as Record<string, Mapping>;
        const { table } = this.tableOf(rule.target);
        for (const [property, mapping] of Object.entries(rule.map ?? {})) {
            if (mapping === undefined) {
                continue;
            }
            if (mapping.kind !== "passthrough") {
                map[property] = this.walk(rule, mapping);
                continue;
            }
            const name = (mapping.by as { data?: unknown }).data;
            const lostColumn = typeof name === "string" && this.lost.has(name) && table.has(name);
            const values = lostColumn ? this.cells(rule.target, name, canonicalFor(rule.target, property)) : null;
            if (values !== null && !values.some((v) => v !== null)) {
                this.touched = true;
            } else if (values !== null && this.isLost(rule.target, name)) {
                this.touched = true;
                map[property] = { ...mapping, by: this.copy(rule.target, `${property}.data.${name}`, () => values) };
            } else {
                map[property] = mapping;
            }
        }
        return map;
    }

    /**
     * A value with every other reference to a lost input reading a copy of its values as they are.
     * @param rule - the rule it belongs to
     * @param value - the value
     * @returns the value, references replaced
     */
    private walk<T>(rule: StyleRule, value: T): T {
        return JSON.parse(JSON.stringify(value, (_k, v: unknown) => this.replaced(rule, v))) as T;
    }

    /**
     * One reference with a lost input replaced by its copy: a data column, or a degree the file does not keep.
     * @param rule - the rule it belongs to
     * @param v - a value of the rule
     * @returns the value, or the reference to the copy
     */
    private replaced(rule: StyleRule, v: unknown): unknown {
        if (typeof v !== "object" || v === null || Array.isArray(v) || Object.keys(v).length !== 1) {
            return v;
        }
        const ref = v as { data?: unknown; computed?: unknown };
        if (this.isLost(rule.target, ref.data)) {
            const name = ref.data;
            this.touched = true;
            return this.copy(rule.target, `data.${name}`, () =>
                this.cells(rule.target, name, (raw) => (isStyleScalar(raw) ? raw : null)),
            );
        }
        const which = ref.computed;
        if ((which === "indegree" || which === "outdegree") && this.direction && rule.target === "node") {
            this.touched = true;
            return this.copy(rule.target, `computed.${which}`, () => degreeValues(this.snapshot, which));
        }
        return v;
    }

    /**
     * The reference to a copy of an input, made on first use and shared by every rule that reads it.
     * @param target - nodes or edges
     * @param base - what is copied
     * @param values - its values
     * @returns the reference
     */
    private copy(target: StyleTarget, base: string, values: () => StyleColumn): { style: string } {
        const key = `input.${base}`;
        const held = this.columns[target];
        if (!held.has(key)) {
            held.set(key, values());
        }
        return { style: key };
    }

    /**
     * Whether a name is a lost input that can be copied: only a column of plain values can, and a list, or a column with
     * no value, stays as it is.
     * @param target - nodes or edges
     * @param name - the name
     * @returns true for a lost input
     */
    private isLost(target: StyleTarget, name: unknown): name is string {
        const { table, n } = this.tableOf(target);
        return typeof name === "string" && this.lost.has(name) && table.has(name) && carriable(table, n, name);
    }

    /**
     * Every element's value of a data column.
     * @param target - nodes or edges
     * @param name - the column
     * @param read - the value of a cell
     * @returns the values
     */
    private cells(target: StyleTarget, name: string, read: (raw: unknown) => StyleValue | null): StyleColumn {
        const { table, n } = this.tableOf(target);
        return Array.from({ length: n }, (_u, i) => read(dataCell(table, name, i)));
    }

    /**
     * A target's table and row count.
     * @param target - nodes or edges
     * @returns the table and its row count
     */
    private tableOf(target: StyleTarget): { table: GraphSnapshot["nodes"]; n: number } {
        const { snapshot } = this;
        return target === "node"
            ? { table: snapshot.nodes, n: snapshot.nodeCount }
            : { table: snapshot.edges, n: snapshot.edgeCount };
    }
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
function keepsStyleBlock(exporter: GraphExporter): boolean {
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
        for (const property of ruleProperties(extracted.styles.rules, target)) {
            // a property only graphty draws is written into the block alone: lost only when the block is
            if (written.has(property) || (kept && property.startsWith("graphty:"))) {
                if (target === "edge") {
                    notes.push(...pairNotes(snapshot, exporter, property, picture("edge", property as StyleProperty)));
                }
            } else {
                notes.push(notWrittenNote(target, property, exporter, picture));
            }
        }
    }
    notes.push(...graphLossNotes(extracted, exporter, caps));
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
 * W_STYLE_NOT_WRITTEN for every graph property the format does not write.
 * @param extracted - the styles
 * @param exporter - the exporter
 * @param caps - its style capabilities, or null
 * @returns the notes
 */
function graphLossNotes(
    extracted: ExtractedStyles,
    exporter: GraphExporter,
    caps: StyleWriteCapabilities | null,
): LossNote[] {
    const graphWritten = new Set<string>(caps?.graph ?? []);
    return Object.keys(extracted.styles.graph)
        .filter((property) => !graphWritten.has(property))
        .map((property) =>
            Object.freeze({
                code: STYLE_ISSUE.NOT_WRITTEN,
                message: `the graph's ${property} is not written: the ${exporter.format} format has no place for it`,
                column: null,
                count: 1,
                style: Object.freeze({ target: "graph" as const, property: property as "background" }),
            }),
        );
}

/**
 * The properties the rules of a target write, in first-written order.
 * @param rules - the rules
 * @param target - nodes or edges
 * @returns the properties
 */
function ruleProperties(rules: readonly StyleRule[], target: StyleTarget): Set<string> {
    return new Set(
        rules
            .filter((rule) => rule.target === target)
            .flatMap((rule) => [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})]),
    );
}

/**
 * W_STYLE_NOT_WRITTEN for a property the format has no place for.
 * @param target - nodes or edges
 * @param property - the property
 * @param exporter - the exporter
 * @param picture - each element's value of a property
 * @returns the note
 */
function notWrittenNote(
    target: StyleTarget,
    property: string,
    exporter: GraphExporter,
    picture: (target: StyleTarget, property: StyleProperty) => readonly (StyleValue | null)[],
): LossNote {
    const count = picture(target, property as StyleProperty).filter((v) => v !== null).length;
    return Object.freeze({
        code: STYLE_ISSUE.NOT_WRITTEN,
        message: `${target} ${property} is not written: the ${exporter.format} format has no place for it (${String(count)} ${target}${plural(count)} ${agree(count, "has", "have")} a value)`,
        column: null,
        count,
        style: Object.freeze({ target, property: property as StyleProperty }),
    });
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
    const stale = { node: staleTags(snapshot.nodes, rules, "node"), edge: staleTags(snapshot.edges, rules, "edge") };
    // a format that writes the label from the styles has its label slot taken: the label column is data there too
    const roles = { node: roledNames(snapshot.nodes, caps, "node"), edge: roledNames(snapshot.edges, caps, "edge") };
    // the block of an earlier import is replaced by the one these styles write, wherever the format puts that
    const staleBlock = snapshot.graph.has(STYLE_BLOCK_NAME);
    const changes = [stale.node, stale.edge, roles.node, roles.edge].some((names) => names.length > 0);
    if (!attributes && !staleBlock && !changes) {
        return snapshot;
    }
    const out = snapshot.withColumns();
    if (staleBlock) {
        out.graph.remove(STYLE_BLOCK_NAME);
    }
    for (const target of TARGETS) {
        const table = target === "node" ? out.nodes : out.edges;
        for (const name of stale[target]) {
            table.remove(name);
        }
        for (const name of roles[target]) {
            const col = table.get(name);
            if (col !== null) {
                // an explicit undefined role in the patch replaces the column's role with none
                table.set(name, col, { role: undefined });
            }
        }
    }
    if (attributes) {
        setTagAttributes(out, tags);
        out.graph.set(STYLE_BLOCK_NAME, [block], { dtype: "string" });
    }
    return out;
}

/**
 * The per-element style values of an earlier write that these rules do not read as data.
 * @param table - the node or edge table
 * @param rules - the rules written
 * @param target - nodes or edges
 * @returns the column names
 */
function staleTags(table: GraphSnapshot["nodes"], rules: readonly StyleRule[], target: StyleTarget): string[] {
    const read = dataRead(rules, target);
    return table.names().filter((name) => isStyleTagName(name) && !read.has(name));
}

/**
 * The columns whose style role the styles take: every style role, and the label where the format writes the label
 * from the styles.
 * @param table - the node or edge table
 * @param caps - the exporter's style capabilities, or null
 * @param target - nodes or edges
 * @returns the column names
 */
function roledNames(table: GraphSnapshot["nodes"], caps: StyleWriteCapabilities | null, target: StyleTarget): string[] {
    const writesLabel = (caps?.[target] ?? []).includes("label");
    return table.names().filter((name) => {
        const role = table.get(name)?.meta.role ?? "";
        return STYLE_ROLES.has(role) || (role === "label" && writesLabel);
    });
}

/**
 * Sets the tagged per-element values as element attributes, replacing those of an earlier import in the order of
 * these styles' columns, so writing a file read back gives the same bytes whichever elements held a value first.
 * @param out - the graph, changed in place
 * @param tags - the tagged values
 * @param tags.node - node values by attribute name
 * @param tags.edge - edge values by attribute name
 */
function setTagAttributes(
    out: GraphSnapshot,
    tags: { readonly node: ReadonlyMap<string, StyleColumn>; readonly edge: ReadonlyMap<string, StyleColumn> },
): void {
    for (const target of TARGETS) {
        const table = target === "node" ? out.nodes : out.edges;
        const prefix = styleTag(target, "");
        for (const name of table.names().filter((c) => c.startsWith(prefix))) {
            table.remove(name);
        }
        for (const [name, col] of tags[target]) {
            const dtype = tagDtype(col);
            table.set(name, dtype === "string" ? col.map((v) => (v === null ? null : String(v))) : col, { dtype });
        }
    }
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
