/**
 * The `graphty.styles` block: the rules of a graph's styles written into a file so that importing the file back into
 * graphty rebuilds the same rules. The block is JSON; the per-element values its rules read are written beside it as
 * element attributes named `graphty.style.<target>.<key>` (or, in a format with no per-element attributes, inside
 * the block). A block is file input like any other: it is size-limited, validated member by member, never keyed into
 * a plain object, and a block that fails any check is ignored with a reason code, never thrown.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { LossNote } from "../../types.js";
import { STYLE_ISSUE } from "../codes.js";
import { toolDefaults } from "../defaults.js";
import { featuresOf, heldEdgeRows, styleFingerprint } from "../plan/features.js";
import { plainCell, refSource, resolveRules, within } from "../plan/resolve.js";
import type {
    ColumnRef,
    ContinuousPoint,
    ExtractedStyles,
    FileStyles,
    Mapping,
    Predicate,
    Scalar,
    StyleBlockIgnoredReason,
    StyleColumn,
    StyleFingerprint,
    StyleNote,
    StyleRule,
    StyleRuleFacts,
    StyleTarget,
    StyleTool,
    StyleValue,
} from "../types.js";
import { STYLE_PROPERTIES } from "../vocabulary.js";

/**
 * The name of the block in every format: a graph attribute, a key, an aspect or an archive entry.
 * @category Styles
 */
export const STYLE_BLOCK_NAME = "graphty.styles";

/**
 * The longest block graph-io reads, in characters; a longer one is ignored (`TOO_LARGE`).
 * @category Styles
 */
export const MAX_STYLE_BLOCK_LENGTH = 16 * 1024 * 1024;

/** The deepest nesting of JSON values a block may have. */
const MAX_DEPTH = 64;
/** The most rules a block may hold. */
const MAX_RULES = 4096;
/** The longest id, key, property name or source field. */
const MAX_NAME = 256;
/** Keys that would reach an object's prototype; a block holding one anywhere is ignored. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);
const TARGETS: readonly StyleTarget[] = ["node", "edge"];
const COMPUTED: ReadonlySet<string> = new Set(["degree", "indegree", "outdegree"]);

/**
 * The name of the element attribute holding one style column: `graphty.style.<target>.<key>`.
 * @param target - nodes or edges
 * @param key - the style column's key (`class`, `member.3`, `exceptions.fill`)
 * @returns the attribute name
 * @category Styles
 */
export function styleTag(target: StyleTarget, key: string): string {
    return `graphty.style.${target}.${key}`;
}

/**
 * The content of a `graphty.styles` block.
 * @category Styles
 */
export interface StyleBlock {
    /** The block's version: 1. */
    readonly version: 1;
    /** The format, dialect and tool the styles were described with. */
    readonly source: FileStyles["source"];
    /** The unit of every length. */
    readonly units: FileStyles["units"];
    /** The graph's own style. */
    readonly graph: FileStyles["graph"];
    /** The rules, bottom to top, with their `ext` members. */
    readonly rules: readonly StyleRule[];
    /** The keys of the style columns the rules read, per target. */
    readonly columns: {
        /** Node style column keys. */
        readonly node: readonly string[];
        /** Edge style column keys. */
        readonly edge: readonly string[];
    };
    /**
     * The text of each node's id, in the order the inline style columns list the nodes, so they are matched to a graph
     * read back in another order; absent without inline columns.
     */
    readonly order?: readonly string[];
    /**
     * The keys of the style columns that hold booleans, per target, so a format that has no booleans (GML writes 0
     * and 1) reads them back as booleans; absent when none does.
     */
    readonly booleans?: {
        /** Node style column keys. */
        readonly node: readonly string[];
        /** Edge style column keys. */
        readonly edge: readonly string[];
    };
    /** The style columns themselves, for a format with no per-element attributes; absent otherwise. */
    readonly values?: {
        /** Node style columns by key. */
        readonly node: ReadonlyMap<string, StyleColumn>;
        /** Edge style columns by key. */
        readonly edge: ReadonlyMap<string, StyleColumn>;
    };
    /**
     * A hash of the values of every data column the rules read, per target, by the column's name when the block was
     * written; absent in a block written without its graph. A column the file reads back under another name (a
     * format writes its label column as its own `label`) is found again by its values.
     */
    readonly data?: {
        /** Node data column hashes by column name. */
        readonly node: ReadonlyMap<string, string>;
        /** Edge data column hashes by column name. */
        readonly edge: ReadonlyMap<string, string>;
    };
    /** The graph the block describes. */
    readonly fingerprint: StyleFingerprint;
}

/**
 * Options of `writeStyleBlock()`.
 * @category Styles
 */
export interface WriteStyleBlockOptions {
    /** Write the style columns inside the block, for a format with no per-element attributes; defaults to false. */
    readonly inlineColumns?: boolean;
    /**
     * The graph being written: with it, the block records a hash of each data column the rules read, so the rules
     * still find their columns in a file that renames them.
     */
    readonly snapshot?: GraphSnapshot;
}

/** The JSON escapes a reader of Cytoscape's convention would change, as `\u` escapes that mean the same. */
const SAFE_ESCAPES: Readonly<Record<string, string>> = {
    "\\": String.raw`\u005c`,
    n: String.raw`\u000a`,
    t: String.raw`\u0009`,
};

/**
 * Writes a graph's styles as a `graphty.styles` block. Notes are not written. The output is deterministic: the same
 * styles always give the same text. A backslash, newline or tab inside a string is written as a `\u` escape, so a
 * format that decodes `\n` and `\t` in attribute values (Cytoscape's convention) reads the block back unchanged.
 * @param extracted - the styles
 * @param options - whether to write the style columns inside the block
 * @returns the block's JSON text
 * @category Styles
 */
export function writeStyleBlock(extracted: ExtractedStyles, options: WriteStyleBlockOptions = {}): string {
    const { styles, columns, fingerprint } = extracted;
    const out: Record<string, unknown> = {
        version: 1,
        source: styles.source,
        units: styles.units,
        graph: styles.graph,
        rules: styles.rules,
        columns: { node: Array.from(columns.node.keys()), edge: Array.from(columns.edge.keys()) },
    };
    const booleanKeys = (byKey: ReadonlyMap<string, StyleColumn>): string[] =>
        Array.from(byKey)
            .filter(([, col]) => col.some((x) => x !== null) && col.every((x) => x === null || typeof x === "boolean"))
            .map(([key]) => key);
    const booleans = { node: booleanKeys(columns.node), edge: booleanKeys(columns.edge) };
    if (booleans.node.length > 0 || booleans.edge.length > 0) {
        out.booleans = booleans;
    }
    if (options.inlineColumns === true) {
        if (options.snapshot !== undefined) {
            const { ids, nodeCount } = options.snapshot;
            out.order = Array.from({ length: nodeCount }, (_unused, i) => String(ids.idOf(i)));
        }
        // an edge's values are listed once per edge the file holds
        const held = options.snapshot === undefined ? null : heldEdgeRows(options.snapshot);
        out.values = {
            node: Object.fromEntries(columns.node),
            edge: Object.fromEntries(
                Array.from(columns.edge, ([key, col]) => [key, held === null ? col : held.map((e) => col[e] ?? null)]),
            ),
        };
    }
    const { snapshot } = options;
    if (snapshot !== undefined) {
        const hashes = (target: StyleTarget): Record<string, string> => {
            const table = target === "node" ? snapshot.nodes : snapshot.edges;
            const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
            // a name the reader refuses as a key is left out: its rules then find the column by its name alone
            const read = dataNames(styles.rules.filter((r) => r.target === target))
                .filter((c) => table.has(c) && !FORBIDDEN_KEYS.has(c) && c.length <= MAX_NAME)
                .slice(0, MAX_RULES);
            return Object.fromEntries(read.map((c) => [c, columnHash(table, c, n)]));
        };
        out.data = { node: hashes("node"), edge: hashes("edge") };
    }
    out.fingerprint = {
        nodes: fingerprint.nodes,
        edges: fingerprint.heldEdges ?? fingerprint.edges,
        ids: fingerprint.ids,
    };
    return JSON.stringify(out).replaceAll(/\\(.)/g, (escape, c: string) => SAFE_ESCAPES[c] ?? escape);
}

/**
 * The loss when graph-io would ignore a block it has just written: one longer than `MAX_STYLE_BLOCK_LENGTH`, or one
 * past another limit the reader enforces (too many rules, a name too long). The format's own styles are still
 * written, so importing the file back infers the rules again from them.
 * @param text - the block's text, as `writeStyleBlock()` wrote it
 * @param rules - how many rules the block holds
 * @param check - "size" to check only the length: a block rewritten with its columns inline, whose rules were
 * checked already
 * @returns one `W_STYLE_RULES_NOT_KEPT` note naming the reason, or none when the block reads back
 * @category Styles
 */
export function styleBlockLosses(text: string, rules: number, check: "all" | "size" = "all"): LossNote[] {
    let reason: StyleBlockIgnoredReason | null = null;
    if (text.length > MAX_STYLE_BLOCK_LENGTH) {
        reason = "TOO_LARGE";
    } else if (check === "all") {
        const top = JSON.parse(text) as { fingerprint: { nodes: number; edges: number; ids: string } };
        const { nodes, edges, ids } = top.fingerprint;
        const parsed = parseStyleBlock(text, { nodes, edges, ids });
        reason = parsed.ok ? null : parsed.reason;
    }
    if (reason === null) {
        return [];
    }
    return [
        Object.freeze({
            code: STYLE_ISSUE.RULES_NOT_KEPT,
            message: `the ${STYLE_BLOCK_NAME} block would not read back (${reason}): the styles are written as the format's own, and importing the file infers the rules again`,
            column: null,
            count: rules,
        }),
    ];
}

/**
 * What `parseStyleBlock()` found: a valid block, or the reason it is ignored.
 * @category Styles
 */
export type ParsedStyleBlock =
    | {
          /** The block is valid and describes this graph. */
          readonly ok: true;
          /** The block. */
          readonly block: StyleBlock;
      }
    | {
          /** The block is ignored. */
          readonly ok: false;
          /** Why. */
          readonly reason: StyleBlockIgnoredReason;
      };

/** Thrown inside the validator only; turned into an `INVALID` result before parseStyleBlock() returns. */
class Invalid extends Error {}

/**
 * Fails validation: throws `Invalid`, which parseStyleBlock() turns into an `INVALID` result.
 * @throws Invalid always
 */
function invalid(): never {
    throw new Invalid();
}

/**
 * Reads a `graphty.styles` block as untrusted input. It never throws: a block that is not text, too large, not JSON,
 * of another version, nested too deep, holding a key that reaches a prototype (`__proto__`), shaped wrongly or
 * written for a different graph is ignored with the reason.
 * @param text - the block's text, as the file holds it
 * @param fingerprint - the graph being imported (`styleFingerprint(snapshot)`)
 * @returns the block, or why it is ignored
 * @category Styles
 */
export function parseStyleBlock(text: unknown, fingerprint: StyleFingerprint): ParsedStyleBlock {
    if (typeof text !== "string") {
        return { ok: false, reason: "INVALID" };
    }
    if (text.length > MAX_STYLE_BLOCK_LENGTH) {
        return { ok: false, reason: "TOO_LARGE" };
    }
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        return { ok: false, reason: "NOT_JSON" };
    }
    if (!safeTree(json)) {
        return { ok: false, reason: "INVALID" };
    }
    const top = isObject(json) ? json : null;
    if (top === null) {
        return { ok: false, reason: "INVALID" };
    }
    if (top.version !== 1) {
        return { ok: false, reason: "VERSION" };
    }
    // a block for another graph says so, whatever else in it would not fit this one
    const fp = isObject(top.fingerprint) ? top.fingerprint : null;
    if (
        fp !== null &&
        (fp.nodes !== fingerprint.nodes ||
            fp.edges !== (fingerprint.heldEdges ?? fingerprint.edges) ||
            fp.ids !== fingerprint.ids)
    ) {
        return { ok: false, reason: "FINGERPRINT" };
    }
    let block: StyleBlock;
    try {
        block = readBlock(top);
    } catch (err) {
        if (err instanceof Invalid) {
            return { ok: false, reason: "INVALID" };
        }
        throw err;
    }
    const f = block.fingerprint;
    if (
        f.nodes !== fingerprint.nodes ||
        f.edges !== (fingerprint.heldEdges ?? fingerprint.edges) ||
        f.ids !== fingerprint.ids
    ) {
        return { ok: false, reason: "FINGERPRINT" };
    }
    return { ok: true, block };
}

/**
 * Whether a parsed JSON value is at most `MAX_DEPTH` deep and holds no key that reaches a prototype. Walked with an
 * explicit stack, never by recursion.
 * @param root - the parsed value
 * @returns true when safe
 */
function safeTree(root: unknown): boolean {
    const stack: [unknown, number][] = [[root, 0]];
    while (stack.length > 0) {
        const [v, depth] = stack.pop() as [unknown, number];
        if (v === null || typeof v !== "object") {
            continue;
        }
        if (depth >= MAX_DEPTH || (!Array.isArray(v) && Object.keys(v).some((key) => FORBIDDEN_KEYS.has(key)))) {
            return false;
        }
        const items: unknown[] = Array.isArray(v) ? v : Object.values(v);
        for (const item of items) {
            if (item !== null && typeof item === "object") {
                stack.push([item, depth + 1]);
            }
        }
    }
    return true;
}

/**
 * Whether a value is a plain JSON object (not an array, not null).
 * @param v - the value
 * @returns true for an object
 */
function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * A short string, or invalid.
 * @param v - the value
 * @returns the string
 */
function name(v: unknown): string {
    return typeof v === "string" && v.length <= MAX_NAME ? v : invalid();
}

/**
 * A short string or null, or invalid.
 * @param v - the value
 * @returns the string or null
 */
function nameOrNull(v: unknown): string | null {
    return v === null || v === undefined ? null : name(v);
}

/**
 * Whether a value is a scalar: a string, a finite number or a boolean.
 * @param v - the value
 * @returns true for a scalar
 */
function isScalar(v: unknown): v is Scalar {
    return typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));
}

/**
 * A scalar, or invalid.
 * @param v - the value
 * @returns the scalar
 */
function scalar(v: unknown): Scalar {
    return isScalar(v) ? v : invalid();
}

/**
 * An array, or invalid.
 * @param v - the value
 * @param max - the most items allowed
 * @returns the array
 */
function array(v: unknown, max: number): readonly unknown[] {
    return Array.isArray(v) && v.length <= max ? v : invalid();
}

/**
 * The whole block.
 * @param top - the parsed object
 * @returns the block
 */
function readBlock(top: Record<string, unknown>): StyleBlock {
    const source = isObject(top.source) ? top.source : invalid();
    const units = isObject(top.units) ? top.units : invalid();
    const length = units.length === "px" || units.length === "relative" ? units.length : invalid();
    const fp = isObject(top.fingerprint) ? top.fingerprint : invalid();
    const count = (v: unknown): number => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : invalid());
    const cols = isObject(top.columns) ? top.columns : invalid();
    const block: StyleBlock = {
        version: 1,
        source: { format: name(source.format), dialect: nameOrNull(source.dialect), tool: nameOrNull(source.tool) },
        units: { length },
        graph: values(top.graph ?? {}),
        rules: array(top.rules, MAX_RULES).map(readRule),
        columns: {
            node: array(cols.node, MAX_RULES).map(name),
            edge: array(cols.edge, MAX_RULES).map(name),
        },
        fingerprint: { nodes: count(fp.nodes), edges: count(fp.edges), ids: name(fp.ids) },
    };
    const read = top.data === undefined ? block : { ...block, data: readData(top.data) };
    const withData = top.booleans === undefined ? read : { ...read, booleans: readBooleans(top.booleans) };
    if (top.values === undefined) {
        return withData;
    }
    const order = top.order === undefined ? undefined : readOrder(top.order, block.fingerprint.nodes);
    const inline = readInline(top.values, block);
    return { ...withData, ...(order === undefined ? {} : { order }), values: inline };
}

/**
 * The boolean style columns of a block, by target.
 * @param v - the parsed `booleans` member
 * @returns the column keys
 */
function readBooleans(v: unknown): NonNullable<StyleBlock["booleans"]> {
    const booleans = isObject(v) ? v : invalid();
    return {
        node: array(booleans.node ?? [], MAX_RULES).map(name),
        edge: array(booleans.edge ?? [], MAX_RULES).map(name),
    };
}

/**
 * The node ids of a block, in the order its inline values list the nodes.
 * @param v - the parsed `order` member
 * @param nodes - the node count of its fingerprint
 * @returns the ids
 */
function readOrder(v: unknown, nodes: number): string[] {
    const order = array(v, nodes).map((id) => (typeof id === "string" ? id : invalid()));
    return order.length === nodes ? order : invalid();
}

/**
 * The style columns written inside a block: one value per node or edge for each column the block names.
 * @param v - the parsed `values` member
 * @param block - the block read so far
 * @returns the columns, by target
 */
function readInline(v: unknown, block: StyleBlock): { node: Map<string, StyleColumn>; edge: Map<string, StyleColumn> } {
    const values = isObject(v) ? v : invalid();
    const inline = { node: new Map<string, StyleColumn>(), edge: new Map<string, StyleColumn>() };
    for (const target of TARGETS) {
        const n = target === "node" ? block.fingerprint.nodes : block.fingerprint.edges;
        const byKey = isObject(values[target]) ? values[target] : invalid();
        for (const key of block.columns[target]) {
            const col = array(Object.hasOwn(byKey, key) ? byKey[key] : invalid(), n);
            if (col.length !== n) {
                invalid();
            }
            inline[target].set(
                key,
                col.map((x) => (x === null ? null : scalar(x))),
            );
        }
    }
    return inline;
}

/**
 * The data column hashes of a block.
 * @param v - the parsed `data` member
 * @returns the hashes by column name, per target
 */
function readData(v: unknown): NonNullable<StyleBlock["data"]> {
    const d = isObject(v) ? v : invalid();
    const byTarget = (t: unknown): Map<string, string> => {
        const o = isObject(t) ? t : invalid();
        const keys = Object.keys(o);
        if (keys.length > MAX_RULES) {
            invalid();
        }
        return new Map(keys.map((k) => [name(k), name(o[k])]));
    };
    return { node: byTarget(d.node), edge: byTarget(d.edge) };
}

/**
 * A cell's value as text: a list as JSON, no value as a character no text holds.
 * @param v - the cell
 * @returns the text
 */
function cellText(v: unknown): string {
    if (v === null) {
        return "\u0001";
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return String(v);
    }
    return JSON.stringify(v);
}

/**
 * A hash of a column's values as text, by element index: the text of a value, so a format that reads the number 7
 * back as "7" keeps the hash.
 * @param table - the node or edge table
 * @param column - the column's name
 * @param n - the element count
 * @returns the hash
 */
function columnHash(table: GraphSnapshot["nodes"], column: string, n: number): string {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < n; i++) {
        const text = `${cellText(plainCell(table.value(column, i)))}\u0000`;
        for (let c = 0; c < text.length; c++) {
            const code = text.charCodeAt(c); // NOSONAR(S7758): hashes UTF-16 code units; code points would change every written hash
            h1 = Math.imul(h1 ^ code, 0x01000193);
            h2 = Math.imul(h2 ^ code, 0x01000193) ^ (h2 >>> 13);
        }
    }
    const hex = (h: number): string => (h >>> 0).toString(16).padStart(8, "0");
    return hex(h1) + hex(h2);
}

/**
 * Every data column some rule reads, in first-read order. A rule's `ext` is the consumer's own and is not read.
 * @param rules - the rules
 * @returns the column names
 */
function dataNames(rules: readonly StyleRule[]): string[] {
    const out = new Set<string>();
    for (const { ext: _ext, ...rule } of rules) {
        JSON.stringify(rule, (_k, v: unknown) => {
            if (isObject(v) && typeof v.data === "string" && Object.keys(v).length === 1) {
                out.add(v.data);
            }
            return v;
        });
    }
    return [...out];
}

/**
 * A rule with its data column references renamed; its `ext` is kept untouched.
 * @param rule - the rule
 * @param rename - the new name of each column that moved
 * @returns the rule
 */
function renameData(rule: StyleRule, rename: ReadonlyMap<string, string>): StyleRule {
    const { ext, ...rest } = rule;
    const moved = JSON.parse(
        JSON.stringify(rest, (_k, v: unknown) =>
            isObject(v) && typeof v.data === "string" && Object.keys(v).length === 1 && rename.has(v.data)
                ? { data: rename.get(v.data) }
                : v,
        ),
    ) as StyleRule;
    return ext === undefined ? moved : { ...moved, ext };
}

/**
 * Where each data column a block's rules read is in the imported graph: under its own name when its values are the
 * same, else the first column holding the same values (a format that renamed it), else under its own name.
 * @param block - the block
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the new name of each column that moved
 */
function movedColumns(block: StyleBlock, snapshot: GraphSnapshot, target: StyleTarget): Map<string, string> {
    const moved = new Map<string, string>();
    const want = block.data?.[target];
    if (want === undefined || want.size === 0) {
        return moved;
    }
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    let have: Map<string, string> | null = null;
    for (const [column, hash] of want) {
        if (table.has(column) && columnHash(table, column, n) === hash) {
            continue;
        }
        have ??= new Map(Array.from(table.names(), (c) => [c, columnHash(table, c, n)]));
        for (const [c, h] of have) {
            if (h === hash) {
                moved.set(column, c);
                break;
            }
        }
    }
    return moved;
}

/**
 * A record of style values, copied into a null-prototype object.
 * @param v - the parsed record
 * @returns the copy
 */
function values(v: unknown): Record<string, StyleValue> {
    const o = isObject(v) ? v : invalid();
    const out = Object.create(null) as Record<string, StyleValue>;
    for (const key of Object.keys(o)) {
        out[name(key)] = scalar(o[key]);
    }
    return out;
}

/**
 * One rule.
 * @param v - the parsed rule
 * @returns the rule
 */
function readRule(v: unknown): StyleRule {
    const r = isObject(v) ? v : invalid();
    const target = r.target === "node" || r.target === "edge" ? r.target : invalid();
    const rule: {
        -readonly [K in keyof StyleRule]: StyleRule[K];
    } = {
        id: name(r.id),
        target,
        role: name(r.role),
        origin: name(r.origin),
        where: predicate(r.where),
    };
    if (r.set !== undefined) {
        rule.set = values(r.set);
    }
    if (r.map !== undefined) {
        const m = isObject(r.map) ? r.map : invalid();
        const map = Object.create(null) as Record<string, Mapping>;
        for (const key of Object.keys(m)) {
            map[name(key)] = mapping(m[key]);
        }
        rule.map = map;
    }
    if (r.facts !== undefined) {
        rule.facts = facts(r.facts);
    }
    if (r.ext !== undefined) {
        // carried untouched for the consumer that wrote it; safeTree() already checked its keys and depth
        rule.ext = isObject(r.ext) ? r.ext : invalid();
    }
    return rule;
}

/**
 * A column reference.
 * @param v - the parsed reference
 * @returns the reference
 */
function columnRef(v: unknown): ColumnRef {
    const o = isObject(v) ? v : invalid();
    if (typeof o.data === "string") {
        return { data: name(o.data) };
    }
    if (typeof o.style === "string") {
        return { style: name(o.style) };
    }
    if (typeof o.computed === "string" && COMPUTED.has(o.computed)) {
        return { computed: o.computed as "degree" | "indegree" | "outdegree" };
    }
    return invalid();
}

/**
 * A predicate. A predicate of a kind this version does not know is kept as it is and matches nothing.
 * @param v - the parsed predicate
 * @returns the predicate
 */
function predicate(v: unknown): Predicate {
    const o = isObject(v) ? v : invalid();
    if ("all" in o) {
        return o.all === true ? { all: true } : invalid();
    }
    if ("has" in o) {
        return { has: columnRef(o.has) };
    }
    if ("eq" in o) {
        const t = array(o.eq, 2);
        return t.length === 2 ? { eq: [columnRef(t[0]), scalar(t[1])] } : invalid();
    }
    if ("in" in o) {
        const t = array(o.in, 2);
        return t.length === 2 ? { in: [columnRef(t[0]), array(t[1], 65536).map(scalar)] } : invalid();
    }
    if ("and" in o) {
        return { and: array(o.and, 64).map(predicate) };
    }
    if ("or" in o) {
        return { or: array(o.or, 64).map(predicate) };
    }
    if ("not" in o) {
        return { not: predicate(o.not) };
    }
    return o as Predicate;
}

/**
 * A mapping. A mapping of a kind this version does not know is kept and gives no value.
 * @param v - the parsed mapping
 * @returns the mapping
 */
function mapping(v: unknown): Mapping {
    const o = isObject(v) ? v : invalid();
    const by = columnRef(o.by);
    switch (o.kind) {
        case "passthrough":
            return { kind: "passthrough", by };
        case "discrete":
            return {
                kind: "discrete",
                by,
                table: array(o.table, 1 << 20).map((pair) => {
                    const p = array(pair, 2);
                    return p.length === 2 ? ([scalar(p[0]), scalar(p[1])] as const) : invalid();
                }),
            };
        case "continuous":
            return {
                kind: "continuous",
                by,
                points: array(o.points, 4096).map((pt): ContinuousPoint => {
                    const q = isObject(pt) ? pt : invalid();
                    return {
                        at: typeof q.at === "number" && Number.isFinite(q.at) ? q.at : invalid(),
                        below: scalar(q.below),
                        value: scalar(q.value),
                        above: scalar(q.above),
                    };
                }),
            };
        default:
            return { ...o, kind: name(o.kind), by } as unknown as Mapping;
    }
}

/**
 * A rule's facts: the known members, each checked; anything else is left out.
 * @param v - the parsed facts
 * @returns the facts
 */
function facts(v: unknown): StyleRuleFacts {
    const o = isObject(v) ? v : invalid();
    const count = (x: unknown): number | undefined =>
        typeof x === "number" && Number.isSafeInteger(x) && x >= 0 ? x : undefined;
    const out: { -readonly [K in keyof StyleRuleFacts]: StyleRuleFacts[K] } = {};
    const elements = count(o.elements);
    const classes = count(o.classes);
    const distinctValues = count(o.distinctValues);
    if (elements !== undefined) {
        out.elements = elements;
    }
    if (classes !== undefined) {
        out.classes = classes;
    }
    if (distinctValues !== undefined) {
        out.distinctValues = distinctValues;
    }
    if (typeof o.reason === "string") {
        out.reason = name(o.reason);
    }
    if (o.names !== undefined) {
        out.names = array(o.names, 1 << 20).map((pair) => {
            const p = array(pair, 2);
            return p.length === 2 ? ([scalar(p[0]), String(scalar(p[1]))] as const) : invalid();
        });
    }
    return out;
}

/**
 * The style columns a block's rules read, from the block itself or from the tagged element attributes of the
 * snapshot; null when one is missing.
 * @param block - the block
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @returns the columns by key, or null
 */
function blockColumns(
    block: StyleBlock,
    snapshot: GraphSnapshot,
    target: StyleTarget,
): Map<string, StyleColumn> | null {
    const out = new Map<string, StyleColumn>();
    const table = target === "node" ? snapshot.nodes : snapshot.edges;
    const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
    for (const key of block.columns[target]) {
        const inline = block.values?.[target].get(key);
        if (inline !== undefined) {
            out.set(key, target === "node" ? inNodeOrder(block, snapshot, inline) : onEdgeRows(snapshot, inline));
            continue;
        }
        const tag = styleTag(target, key);
        if (!table.has(tag)) {
            return null;
        }
        const col = Array.from({ length: n }, (_, i): StyleValue | null => {
            const v = plainCell(table.value(tag, i));
            return isScalar(v) ? v : null;
        });
        out.set(key, target === "edge" ? withPairValues(snapshot, col) : col);
    }
    return out;
}

/**
 * The style columns the block lists as booleans, as booleans: a format with no booleans (GML) holds them as 0 and 1
 * (or their text).
 * @param block - the block
 * @param columns - the style columns per target, changed in place
 */
function asBooleans(block: StyleBlock, columns: Record<StyleTarget, Map<string, StyleColumn>>): void {
    for (const target of TARGETS) {
        for (const key of block.booleans?.[target] ?? []) {
            const col = columns[target].get(key);
            if (col !== undefined) {
                columns[target].set(key, col.map(asBoolean));
            }
        }
    }
}

/**
 * A value of a boolean style column as a boolean: 1 and 0, and their text, as GML and untyped formats hold them.
 * @param v - the value read
 * @returns the boolean, or the value when it is neither
 */
function asBoolean(v: StyleValue | null): StyleValue | null {
    if (v === 1 || v === "1" || v === "true") {
        return true;
    }
    return v === 0 || v === "0" || v === "false" ? false : v;
}

/**
 * Inline node values in the order of the graph read back: by each node's id, when the block lists the order it wrote
 * them in and the file read its nodes back in another.
 * @param block - the block
 * @param snapshot - the graph
 * @param col - the values in the block's order
 * @returns the values per node row
 */
function inNodeOrder(block: StyleBlock, snapshot: GraphSnapshot, col: StyleColumn): StyleColumn {
    const { order } = block;
    if (order === undefined || order.every((id, i) => id === String(snapshot.ids.idOf(i)))) {
        return col;
    }
    const at = new Map<string, number>();
    order.forEach((id, i) => {
        if (!at.has(id)) {
            at.set(id, i);
        }
    });
    return Array.from(
        { length: snapshot.nodeCount },
        (_unused, i) => col[at.get(String(snapshot.ids.idOf(i))) ?? -1] ?? null,
    );
}

/**
 * Inline edge values, listed once per edge the file holds, per edge row: both halves of an undirected edge in a
 * directed graph take the edge's value.
 * @param snapshot - the graph
 * @param col - the values per held edge
 * @returns the values per edge row
 */
function onEdgeRows(snapshot: GraphSnapshot, col: StyleColumn): StyleColumn {
    const held = heldEdgeRows(snapshot);
    if (held.length === snapshot.edgeCount) {
        return col;
    }
    const out = new Array<StyleValue | null>(snapshot.edgeCount).fill(null);
    held.forEach((e, k) => {
        out[e] = col[k] ?? null;
    });
    return withPairValues(snapshot, out);
}

/**
 * Per-edge values with each half of an undirected edge in a directed graph given its other half's value where it has
 * none: the file holds the edge once, and the format reads its values onto one half.
 * @param snapshot - the graph
 * @param col - the values per edge row
 * @returns the values
 */
function withPairValues(snapshot: GraphSnapshot, col: (StyleValue | null)[]): (StyleValue | null)[] {
    const pair = snapshot.edges.byRole("pair");
    if (pair === null) {
        return col;
    }
    for (let i = 0; i < col.length; i++) {
        if (col[i] === null && pair.isSet(i)) {
            col[i] = col[pair.value(i) as number] ?? null;
        }
    }
    return col;
}

/** The color property whose alpha carries an opacity, and that opacity, per target. */
const ALPHA_SLOT: Readonly<Record<StyleTarget, readonly [string, string]>> = {
    node: ["fill", "fillOpacity"],
    edge: ["color", "opacity"],
};

/**
 * The native values with opacity 1 wherever the color is opaque (it has a color and no opacity) and the rules give a
 * translucent opacity: a format that writes the opacity as the color's alpha states 1 with an opaque color.
 * @param values - the native values of one target
 * @param target - nodes or edges
 * @param rules - the block's rules
 * @param src - the values the rules read
 * @param n - the element count
 * @returns the values, the opacity column replaced where it changes
 */
function opaqueColors(
    values: Partial<Record<string, StyleColumn>>,
    target: StyleTarget,
    rules: readonly StyleRule[],
    src: ReturnType<typeof refSource>,
    n: number,
): Partial<Record<string, StyleColumn>> {
    const [colorProperty, opacityProperty] = ALPHA_SLOT[target];
    const color = values[colorProperty];
    if (color === undefined) {
        return values;
    }
    const native = values[opacityProperty];
    const resolved = resolveRules(rules, target, opacityProperty, src);
    let out: (StyleValue | null)[] | null = null;
    for (let i = 0; i < n; i++) {
        const r = resolved[i];
        if ((color[i] ?? null) !== null && (native?.[i] ?? null) === null && r !== null && r !== 1) {
            out ??= native === undefined ? new Array<StyleValue | null>(n).fill(null) : [...native];
            out[i] = 1;
        }
    }
    return out === null ? values : { ...values, [opacityProperty]: out };
}

/**
 * A name not yet taken: the base, else the base with `#2`, `#3` and so on.
 * @param taken - whether a name is taken
 * @param base - the preferred name
 * @returns the name
 */
function freeName(taken: (name: string) => boolean, base: string): string {
    let name = base;
    let k = 2;
    while (taken(name)) {
        name = `${base}#${String(k)}`;
        k++;
    }
    return name;
}

/**
 * Whether a property's values are text: an empty text draws what no text draws, so a format that holds no "unset"
 * (CyCSV) reads one back as "".
 * @param target - nodes or edges
 * @param property - the property
 * @returns true for text
 */
function textProperty(target: StyleTarget, property: string): boolean {
    return STYLE_PROPERTIES[target].get(property) === "text";
}

/**
 * The elements whose native value differs from what the rules give: another program edited them. Where the rules
 * give no value, the program's own drawing of an unset property, and an empty text, are no edit.
 * @param values - the native values
 * @param resolved - what the rules give
 * @param unset - what the writing program draws for the unset property, or undefined
 * @param text - whether the property is text
 * @returns the edited values, null where an element is not edited; null when none is
 */
function editedValues(
    values: readonly (StyleValue | null)[],
    resolved: readonly (StyleValue | null)[],
    unset: StyleValue | undefined,
    text: boolean,
): (StyleValue | null)[] | null {
    const empty = text ? "" : undefined;
    let exceptions: (StyleValue | null)[] | null = null;
    for (let i = 0; i < resolved.length; i++) {
        const t = values[i] ?? null;
        const unchanged = resolved[i] === null && (t === unset || t === empty);
        if (t !== null && !within(t, resolved[i]) && !unchanged) {
            exceptions ??= new Array<StyleValue | null>(resolved.length).fill(null);
            exceptions[i] = t;
        }
    }
    return exceptions;
}

/**
 * The styles a valid block describes, read against the graph it was imported into. The block's rules are the
 * file's declared rules and read the tagged per-element values. Where the file's own native values are given, they
 * are the truth: an element whose value differs from what the rules give (another program edited it) is written
 * into one exceptions rule on top, so the styles stay exact and, with no edit, are the block's rules unchanged.
 * @param block - a block `parseStyleBlock()` accepted for this graph
 * @param snapshot - the graph
 * @param format - the format the file was read as
 * @param truth - the native per-element values per target and property, when the format has any
 * @param notes - notes to carry (the reader's own)
 * @param tool - the program whose drawing the native values describe: where the rules give an element no value and
 * the file holds only what that program draws for an unset property (a font written with "plain" style), it is not
 * an edit
 * @param opacityInColor - whether the format writes a fill's and an edge's opacity as its color's alpha: a native
 * color with no native opacity then states opacity 1 where the rules give a translucent one
 * @returns the styles, or null when a style column the rules read is missing from the file
 * @category Styles
 */
export function blockStyles(
    block: StyleBlock,
    snapshot: GraphSnapshot,
    format: string,
    truth: Partial<Record<StyleTarget, Partial<Record<string, StyleColumn>>>> = {},
    notes: readonly StyleNote[] = [],
    tool: StyleTool | null = null,
    opacityInColor = false,
): ExtractedStyles | null {
    const node = blockColumns(block, snapshot, "node");
    const edge = blockColumns(block, snapshot, "edge");
    if (node === null || edge === null) {
        return null;
    }
    const columns = { node, edge };
    asBooleans(block, columns);
    const features = { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") };
    // a data column the file holds under another name is read there
    const moved = { node: movedColumns(block, snapshot, "node"), edge: movedColumns(block, snapshot, "edge") };
    const blockRules = block.rules.map((r) => (moved[r.target].size === 0 ? r : renameData(r, moved[r.target])));
    const rules: StyleRule[] = [...blockRules];
    for (const target of TARGETS) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const src = refSource(target, n, columns[target], features[target], snapshot);
        const own = opacityInColor ? opaqueColors(truth[target] ?? {}, target, blockRules, src, n) : truth[target];
        const unsetOf = (property: string): StyleValue | undefined =>
            (
                (tool === null ? null : toolDefaults(tool))?.[target]?.[property as never] as
                    { readonly value: StyleValue } | undefined
            )?.value;
        const map = Object.create(null) as Record<string, Mapping>;
        // in one order whatever order the reader found the properties in, so a file written again is the same
        for (const [property, values] of Object.entries(own ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))) {
            const resolved = values === undefined ? null : resolveRules(blockRules, target, property, src);
            const exceptions =
                values === undefined || resolved === null
                    ? null
                    : editedValues(values, resolved, unsetOf(property), textProperty(target, property));
            if (exceptions !== null) {
                const key = freeName((k) => columns[target].has(k), `exceptions.${property}`);
                columns[target].set(key, exceptions);
                map[property] = { kind: "passthrough", by: { style: key } };
            }
        }
        if (Object.keys(map).length > 0) {
            // the block's own rules may hold an exceptions rule already (a file graphty wrote from an edited one)
            const id = freeName((x) => rules.some((r) => r.id === x), `${target}.exceptions`);
            rules.push({
                id,
                target,
                role: "exceptions",
                origin: "inferred",
                where: { all: true },
                map,
            });
        }
    }
    return {
        styles: {
            version: 1,
            source: { format, dialect: "graphty", tool: "graphty" },
            units: block.units,
            graph: block.graph,
            rules,
            notes,
        },
        columns,
        features,
        fingerprint: styleFingerprint(snapshot),
    };
}
