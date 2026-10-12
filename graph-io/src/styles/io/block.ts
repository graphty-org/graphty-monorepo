/**
 * The `graphty.styles` block: the rules of a graph's styles written into a file so that importing the file back into
 * graphty rebuilds the same rules. The block is JSON; the per-element values its rules read are written beside it as
 * element attributes named `graphty.style.<target>.<key>` (or, in a format with no per-element attributes, inside
 * the block). A block is file input like any other: it is size-limited, validated member by member, never keyed into
 * a plain object, and a block that fails any check is ignored with a reason code, never thrown.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { toolDefaults } from "../defaults.js";
import { featuresOf, styleFingerprint } from "../plan/features.js";
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
const SAFE_ESCAPES: Readonly<Record<string, string>> = { "\\": "\\u005c", n: "\\u000a", t: "\\u0009" };

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
    if (options.inlineColumns === true) {
        out.values = {
            node: Object.fromEntries(columns.node),
            edge: Object.fromEntries(columns.edge),
        };
    }
    const { snapshot } = options;
    if (snapshot !== undefined) {
        const hashes = (target: StyleTarget): Record<string, string> => {
            const table = target === "node" ? snapshot.nodes : snapshot.edges;
            const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
            const read = dataNames(styles.rules.filter((r) => r.target === target)).filter((c) => table.has(c));
            return Object.fromEntries(read.map((c) => [c, columnHash(table, c, n)]));
        };
        out.data = { node: hashes("node"), edge: hashes("edge") };
    }
    out.fingerprint = { nodes: fingerprint.nodes, edges: fingerprint.edges, ids: fingerprint.ids };
    return JSON.stringify(out).replace(/\\(.)/g, (escape, c: string) => SAFE_ESCAPES[c] ?? escape);
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
    if (f.nodes !== fingerprint.nodes || f.edges !== fingerprint.edges || f.ids !== fingerprint.ids) {
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
        if (depth >= MAX_DEPTH) {
            return false;
        }
        if (Array.isArray(v)) {
            for (const item of v) {
                if (item !== null && typeof item === "object") {
                    stack.push([item, depth + 1]);
                }
            }
            continue;
        }
        for (const key of Object.keys(v)) {
            if (FORBIDDEN_KEYS.has(key)) {
                return false;
            }
            const item = (v as Record<string, unknown>)[key];
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
    const withData = top.data === undefined ? block : { ...block, data: readData(top.data) };
    if (top.values === undefined) {
        return withData;
    }
    const v = isObject(top.values) ? top.values : invalid();
    const inline = { node: new Map<string, StyleColumn>(), edge: new Map<string, StyleColumn>() };
    for (const target of TARGETS) {
        const n = target === "node" ? block.fingerprint.nodes : block.fingerprint.edges;
        const byKey = isObject(v[target]) ? v[target] : invalid();
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
    return { ...withData, values: inline };
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
            const code = text.charCodeAt(c);
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
            out.set(key, inline);
            continue;
        }
        const tag = styleTag(target, key);
        if (!table.has(tag)) {
            return null;
        }
        const col = new Array<StyleValue | null>(n);
        for (let i = 0; i < n; i++) {
            const v = plainCell(table.value(tag, i));
            col[i] = isScalar(v) ? v : null;
        }
        out.set(key, col);
    }
    return out;
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
): ExtractedStyles | null {
    const node = blockColumns(block, snapshot, "node");
    const edge = blockColumns(block, snapshot, "edge");
    if (node === null || edge === null) {
        return null;
    }
    const columns = { node, edge };
    const features = { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") };
    // a data column the file holds under another name is read there
    const moved = { node: movedColumns(block, snapshot, "node"), edge: movedColumns(block, snapshot, "edge") };
    const blockRules = block.rules.map((r) => (moved[r.target].size === 0 ? r : renameData(r, moved[r.target])));
    const rules: StyleRule[] = [...blockRules];
    for (const target of TARGETS) {
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const src = refSource(target, n, columns[target], features[target], snapshot);
        const map = Object.create(null) as Record<string, Mapping>;
        for (const [property, values] of Object.entries(truth[target] ?? {})) {
            if (values === undefined) {
                continue;
            }
            const resolved = resolveRules(blockRules, target, property, src);
            const unset = (tool === null ? null : toolDefaults(tool))?.[target]?.[property as never] as
                { readonly value: StyleValue } | undefined;
            let exceptions: (StyleValue | null)[] | null = null;
            for (let i = 0; i < n; i++) {
                const t = values[i] ?? null;
                if (t !== null && !within(t, resolved[i]) && !(resolved[i] === null && t === unset?.value)) {
                    exceptions ??= new Array<StyleValue | null>(n).fill(null);
                    exceptions[i] = t;
                }
            }
            if (exceptions !== null) {
                let key = `exceptions.${property}`;
                for (let k = 2; columns[target].has(key); k++) {
                    key = `exceptions.${property}#${String(k)}`;
                }
                columns[target].set(key, exceptions);
                map[property] = { kind: "passthrough", by: { style: key } };
            }
        }
        if (Object.keys(map).length > 0) {
            // the block's own rules may hold an exceptions rule already (a file graphty wrote from an edited one)
            let id = `${target}.exceptions`;
            for (let k = 2; rules.some((r) => r.id === id); k++) {
                id = `${target}.exceptions#${String(k)}`;
            }
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
