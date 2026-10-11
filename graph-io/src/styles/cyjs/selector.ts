/**
 * Cytoscape.js's selector grammar, parsed the way Cytoscape.js 3.x parses it, by index in one pass. The grammar is
 * Cytoscape.js's own: the same tokens tried in the same order (group, state, `#id`, `.class`, `[a]`, `[a op v]`,
 * `[?a]`, `[[degree op n]]`, then the separators `,` `->` `<->` `>` and a space, and the subject `$`), building the
 * same query structure, so a selector that is valid there is valid here and selects the same elements.
 *
 * Two of Cytoscape.js's behaviors are kept on purpose because files depend on them:
 * - an invalid selector keeps what was parsed before the error. A selector whose first token fails has one empty
 *   query and matches every node and edge; `node:not(.a)` keeps `node` and matches every node.
 * - a string value is kept as written between its quotes: `[a = "x\"y"]` compares with `x\"y`.
 */

/** A comparison operator after its `!` and `@` flags are taken off. */
export type CyjsCompareOp = "=" | ">" | ">=" | "<" | "<=" | "*=" | "^=" | "$=";

/** One check of a query; a query matches when every check does. */
export type CyjsCheck =
    | { readonly type: "group"; readonly value: "nodes" | "edges" | "*" }
    | { readonly type: "state"; readonly value: string }
    | { readonly type: "id"; readonly value: string }
    | { readonly type: "class"; readonly value: string }
    | { readonly type: "exist"; readonly field: string }
    | {
          readonly type: "compare";
          readonly field: string;
          readonly op: CyjsCompareOp;
          readonly not: boolean;
          readonly ci: boolean;
          readonly value: string | number;
      }
    | { readonly type: "bool"; readonly field: string; readonly op: "?" | "!" | "^" }
    | {
          readonly type: "meta";
          readonly field: "degree" | "indegree" | "outdegree";
          readonly op: CyjsCompareOp;
          readonly not: boolean;
          readonly ci: boolean;
          readonly value: number;
      }
    | { readonly type: "true" }
    | { readonly type: "child"; readonly parent: CyjsQuery; readonly child: CyjsQuery }
    | { readonly type: "descendant"; readonly ancestor: CyjsQuery; readonly descendant: CyjsQuery }
    | { readonly type: "parent"; readonly parent: CyjsQuery; readonly child: CyjsQuery }
    | { readonly type: "ancestor"; readonly ancestor: CyjsQuery; readonly descendant: CyjsQuery }
    | { readonly type: "split"; readonly left: CyjsQuery; readonly right: CyjsQuery; readonly subject: CyjsQuery }
    | { readonly type: "directedEdge"; readonly source: CyjsQuery; readonly target: CyjsQuery }
    | { readonly type: "undirectedEdge"; readonly nodes: readonly [CyjsQuery, CyjsQuery] }
    | { readonly type: "nodeSource"; readonly source: CyjsQuery; readonly target: CyjsQuery }
    | { readonly type: "nodeTarget"; readonly source: CyjsQuery; readonly target: CyjsQuery }
    | { readonly type: "nodeNeighbor"; readonly node: CyjsQuery; readonly neighbor: CyjsQuery };

/** One comma-separated alternative of a selector. */
export interface CyjsQuery {
    /** The checks; an empty list matches every element. */
    checks: CyjsCheck[];
}

/** A parsed selector. */
export interface CyjsSelector {
    /** The alternatives; an element matches when any one does. None: the selector matches nothing. */
    readonly queries: readonly CyjsQuery[];
    /** Cytoscape.js rejects the selector; the queries hold what it parsed before the error. */
    readonly invalid: boolean;
}

/** Every state selector Cytoscape.js 3.x knows. */
const CYJS_STATES: ReadonlySet<string> = new Set([
    "selected",
    "unselected",
    "selectable",
    "unselectable",
    "locked",
    "unlocked",
    "visible",
    "hidden",
    "transparent",
    "grabbed",
    "free",
    "removed",
    "inside",
    "grabbable",
    "ungrabbable",
    "animated",
    "unanimated",
    "parent",
    "childless",
    "child",
    "orphan",
    "nonorphan",
    "compound",
    "loop",
    "simple",
    "active",
    "inactive",
    "backgrounding",
    "nonbackgrounding",
]);

/** The longest selector parsed; a longer one is treated as invalid (and noted by the caller). */
const MAX_SELECTOR_LENGTH = 1 << 22;

/** Cytoscape.js's escapable meta characters. */
const META = new Set("!\"#$%&'()*+,./:;<=>?@[]^`{|}~");
/** The base comparison operators, longest first so a scan takes `>=` before `>`. */
const BASE_OPS: readonly string[] = ["!=", ">=", "<=", "*=", "^=", "$=", "=", ">", "<"];
const META_FIELDS: readonly ("indegree" | "outdegree" | "degree")[] = ["indegree", "outdegree", "degree"];

/**
 * Whether a character is a JavaScript regular expression word character.
 * @param c - the character
 * @returns true for `[A-Za-z0-9_]`
 */
function isWord(c: string | undefined): boolean {
    if (c === undefined) {
        return false;
    }
    const k = c.charCodeAt(0);
    return (k >= 48 && k <= 57) || (k >= 65 && k <= 90) || (k >= 97 && k <= 122) || k === 95;
}

/**
 * Whether a character is JavaScript regular expression whitespace (`\s`).
 * @param c - the character
 * @returns true for whitespace
 */
function isSpace(c: string | undefined): boolean {
    return c !== undefined && /\s/.test(c);
}

/** The text being parsed and the position reached. */
class Cursor {
    pos = 0;
    constructor(readonly text: string) {}

    /**
     * The end of a run of whitespace.
     * @param from - where the run starts
     * @returns the first position after it
     */
    spaceEnd(from: number): number {
        let i = from;
        while (i < this.text.length && isSpace(this.text[i])) {
            i++;
        }
        return i;
    }

    /**
     * A name at `from`: word characters, `-`, and `.` when `dots` (Cytoscape.js's variable and id tokens), or a
     * backslash before a meta character.
     * @param from - the start
     * @param dots - whether `.` belongs to the name
     * @returns the raw name and its end, or null when there is none
     */
    name(from: number, dots: boolean): { raw: string; end: number } | null {
        let i = from;
        const t = this.text;
        while (i < t.length) {
            const c = t[i];
            if (isWord(c) || c === "-" || (dots && c === ".")) {
                i++;
            } else if (c === "\\" && i + 1 < t.length && META.has(t[i + 1])) {
                i += 2;
            } else {
                break;
            }
        }
        return i > from ? { raw: t.slice(from, i), end: i } : null;
    }

    /**
     * A number literal at `from` (Cytoscape.js's `[-+]?(\d+|\d*\.\d+)([Ee][+-]?\d+)?`). Both readings of the
     * mantissa are returned, longest first, because the regular expression backtracks to the shorter one.
     * @param from - the start
     * @returns the possible ends, longest first
     */
    numberEnds(from: number): number[] {
        const t = this.text;
        let i = from;
        if (t[i] === "+" || t[i] === "-") {
            i++;
        }
        const digits = (k: number): number => {
            let j = k;
            while (j < t.length && t[j] >= "0" && t[j] <= "9") {
                j++;
            }
            return j;
        };
        const mantissas: number[] = [];
        const intEnd = digits(i);
        if (intEnd > i) {
            mantissas.push(intEnd);
        }
        // \d*\.\d+
        if (t[intEnd] === ".") {
            const fracEnd = digits(intEnd + 1);
            if (fracEnd > intEnd + 1) {
                mantissas.unshift(fracEnd);
            }
        }
        const ends: number[] = [];
        for (const m of mantissas) {
            if (t[m] === "e" || t[m] === "E") {
                let j = m + 1;
                if (t[j] === "+" || t[j] === "-") {
                    j++;
                }
                const expEnd = digits(j);
                if (expEnd > j) {
                    ends.push(expEnd);
                }
            }
            ends.push(m);
        }
        return ends;
    }

    /**
     * The possible ends of a quoted string at `from`: every quote that may close it, longest first (a quote after a
     * backslash may also be escaped; the first quote with no backslash before it must close the string).
     * @param from - the opening quote
     * @returns the possible ends (after the closing quote), longest first
     */
    stringEnds(from: number): number[] {
        const t = this.text;
        const q = t[from];
        const ends: number[] = [];
        for (let i = from + 1; i < t.length; i++) {
            if (t[i] !== q) {
                continue;
            }
            ends.push(i + 1);
            if (t[i - 1] !== "\\" || i - 1 === from) {
                break;
            }
        }
        return ends.reverse();
    }

    /**
     * A comparison operator at `from`: `!` and `@` flags, then a base operator (`!` before a base that holds `!`
     * is not allowed).
     * @param from - the start
     * @returns the operator text and its end, or null
     */
    op(from: number): { text: string; end: number } | null {
        const t = this.text;
        let i = from;
        let prefix = "";
        if (t[i] === "!" && t[i + 1] !== "=") {
            prefix += "!";
            i++;
        }
        if (t[i] === "@") {
            prefix += "@";
            i++;
        }
        for (const base of BASE_OPS) {
            if (t.startsWith(base, i)) {
                if (prefix.includes("!") && base === "!=") {
                    return null;
                }
                return { text: prefix + base, end: i + base.length };
            }
        }
        return null;
    }
}

/**
 * A name with its backslash escapes of meta characters removed.
 * @param raw - the name as written
 * @returns the name
 */
function cleanMeta(raw: string): string {
    let out = "";
    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === "\\" && i + 1 < raw.length && META.has(raw[i + 1])) {
            out += raw[i + 1];
            i++;
        } else {
            out += raw[i];
        }
    }
    return out;
}

/**
 * Splits an operator into its base and its flags.
 * @param text - the operator as written
 * @returns the base operator and the `!` and `@` flags
 */
function splitOp(text: string): { op: CyjsCompareOp; not: boolean; ci: boolean } {
    let op = text;
    let not = false;
    let ci = false;
    if (op.includes("!")) {
        op = op.replace("!", "");
        not = true;
    }
    if (op.includes("@")) {
        op = op.replace("@", "");
        ci = true;
    }
    return { op: op as CyjsCompareOp, not, ci };
}

/** The parser's state across queries: Cytoscape.js's selector object while it is filled. */
interface Building {
    readonly queries: CyjsQuery[];
    subject: CyjsQuery | null;
    edgeCount: number;
    compoundCount: number;
    readonly counts: { edgeCount: number; compoundCount: number; subject: CyjsQuery | null }[];
}

/** A token matched at the cursor: how to fill the selector, and where it ends. */
interface Token {
    readonly end: number;
    readonly fill: (b: Building, q: CyjsQuery) => CyjsQuery | null | false;
}

/**
 * Replaces the last query of the selector.
 * @param b - the selector being built
 * @param q - the replacement
 */
function replaceLast(b: Building, q: CyjsQuery): void {
    b.queries[b.queries.length - 1] = q;
}

/**
 * The compound separators (`>` and a space) as Cytoscape.js fills them.
 * @param kind - child or descendant
 * @returns the fill function
 */
function compoundFill(kind: "child" | "descendant"): Token["fill"] {
    return (b, query) => {
        if (b.subject === null) {
            const outer: CyjsQuery = { checks: [] };
            const inner: CyjsQuery = { checks: [] };
            const left = b.queries[b.queries.length - 1];
            outer.checks.push(
                kind === "child"
                    ? { type: "child", parent: left, child: inner }
                    : { type: "descendant", ancestor: left, descendant: inner },
            );
            replaceLast(b, outer);
            b.compoundCount++;
            return inner;
        }
        if (b.subject === query) {
            const compound: CyjsQuery = { checks: [] };
            const left = b.queries[b.queries.length - 1];
            const right: CyjsQuery = { checks: [] };
            const subject: CyjsQuery = { checks: query.checks };
            const inner: CyjsQuery = { checks: [] };
            const outer: CyjsQuery = { checks: [{ type: "true" }] };
            query.checks = [{ type: "true" }];
            right.checks.push(
                kind === "child"
                    ? { type: "parent", parent: outer, child: inner }
                    : { type: "ancestor", ancestor: outer, descendant: inner },
            );
            compound.checks.push({ type: "split", left, right, subject });
            replaceLast(b, compound);
            b.subject = subject;
            b.compoundCount++;
            return inner;
        }
        const outer: CyjsQuery = { checks: query.checks };
        const inner: CyjsQuery = { checks: [] };
        query.checks = [
            kind === "child"
                ? { type: "parent", parent: outer, child: inner }
                : { type: "ancestor", ancestor: outer, descendant: inner },
        ];
        b.compoundCount++;
        return inner;
    };
}

/**
 * The first of Cytoscape.js's expressions that matches at the cursor, in its order.
 * @param c - the cursor
 * @returns the token, or null when none matches (the selector is invalid)
 */
function nextToken(c: Cursor): Token | null {
    const t = c.text;
    const i = c.pos;
    const ch = t[i];
    // group
    for (const [g, value] of [
        ["node", "nodes"],
        ["edge", "edges"],
        ["*", "*"],
    ] as const) {
        if (t.startsWith(g, i)) {
            return {
                end: i + g.length,
                fill: (_b, q) => {
                    q.checks.push({ type: "group", value });
                    return null;
                },
            };
        }
    }
    // state: the longest state name that is a prefix here
    if (ch === ":") {
        let best: string | null = null;
        for (const s of CYJS_STATES) {
            if (t.startsWith(s, i + 1) && (best === null || s.length > best.length)) {
                best = s;
            }
        }
        if (best !== null) {
            const value = best;
            return {
                end: i + 1 + best.length,
                fill: (_b, q) => {
                    q.checks.push({ type: "state", value });
                    return null;
                },
            };
        }
    }
    // id and class
    if (ch === "#" || ch === ".") {
        const n = c.name(i + 1, ch === "#");
        if (n !== null) {
            const value = cleanMeta(n.raw);
            const type = ch === "#" ? "id" : "class";
            return {
                end: n.end,
                fill: (_b, q) => {
                    q.checks.push({ type, value });
                    return null;
                },
            };
        }
    }
    if (ch === "[") {
        const tok = dataToken(c, i);
        if (tok !== null) {
            return tok;
        }
    }
    // separators: `\s*,\s*`, `\s+->\s+`, `\s+<->\s+`, `\s+>\s+`, `\s+`
    const ws = c.spaceEnd(i);
    if (t[ws] === ",") {
        return {
            end: c.spaceEnd(ws + 1),
            fill: (b) => {
                b.counts.push({ edgeCount: b.edgeCount, compoundCount: b.compoundCount, subject: b.subject });
                b.subject = null;
                b.edgeCount = 0;
                b.compoundCount = 0;
                const next: CyjsQuery = { checks: [] };
                b.queries.push(next);
                return next;
            },
        };
    }
    if (ws > i) {
        for (const [sep, kind] of [
            ["->", "directed"],
            ["<->", "undirected"],
            [">", "child"],
        ] as const) {
            if (t.startsWith(sep, ws)) {
                const after = c.spaceEnd(ws + sep.length);
                if (after > ws + sep.length) {
                    return { end: after, fill: kind === "child" ? compoundFill("child") : edgeFill(kind) };
                }
            }
        }
        return { end: ws, fill: compoundFill("descendant") };
    }
    if (ch === "$") {
        return {
            end: i + 1,
            fill: (b, q) => {
                if (b.subject !== null && b.subject !== q) {
                    return false;
                }
                b.subject = q;
                const top = b.queries[b.queries.length - 1];
                const first = top.checks.at(0);
                if (first?.type === "directedEdge") {
                    top.checks[0] = { type: "nodeTarget", source: first.source, target: first.target };
                } else if (first?.type === "undirectedEdge") {
                    top.checks[0] = { type: "nodeNeighbor", node: first.nodes[1], neighbor: first.nodes[0] };
                }
                return null;
            },
        };
    }
    return null;
}

/**
 * The edge separators (`->`, `<->`) as Cytoscape.js fills them.
 * @param kind - directed or undirected
 * @returns the fill function
 */
function edgeFill(kind: "directed" | "undirected"): Token["fill"] {
    return (b, query) => {
        const target: CyjsQuery = { checks: [] };
        const outer: CyjsQuery = { checks: [] };
        if (b.subject === null) {
            outer.checks.push(
                kind === "directed"
                    ? { type: "directedEdge", source: query, target }
                    : { type: "undirectedEdge", nodes: [query, target] },
            );
            replaceLast(b, outer);
            b.edgeCount++;
            return target;
        }
        if (kind === "directed") {
            outer.checks.push({ type: "nodeSource", source: query, target });
            replaceLast(b, outer);
            b.edgeCount++;
            return target;
        }
        outer.checks.push({ type: "nodeNeighbor", node: query, neighbor: target });
        replaceLast(b, outer);
        return target;
    };
}

/**
 * A `[...]` token at `i`: data existence, a data comparison, a data boolean or a metadata comparison, tried in
 * Cytoscape.js's order.
 * @param c - the cursor
 * @param i - the position of `[`
 * @returns the token, or null
 */
function dataToken(c: Cursor, i: number): Token | null {
    const t = c.text;
    const inner = c.spaceEnd(i + 1);
    const v = c.name(inner, true);
    if (v !== null) {
        const field = cleanMeta(v.raw);
        const afterName = c.spaceEnd(v.end);
        // [a]
        if (t[afterName] === "]") {
            return {
                end: afterName + 1,
                fill: (_b, q) => {
                    q.checks.push({ type: "exist", field });
                    return null;
                },
            };
        }
        // [a op value]
        const op = c.op(afterName);
        if (op !== null) {
            const at = c.spaceEnd(op.end);
            const quoted = t[at] === '"' || t[at] === "'";
            const ends = quoted ? c.stringEnds(at) : c.numberEnds(at);
            for (const end of ends) {
                const close = c.spaceEnd(end);
                if (t[close] !== "]") {
                    continue;
                }
                const literal = t.slice(at, end);
                const value: string | number = quoted ? literal.slice(1, -1) : parseFloat(literal);
                const { op: base, not, ci } = splitOp(op.text);
                return {
                    end: close + 1,
                    fill: (_b, q) => {
                        q.checks.push({ type: "compare", field, op: base, not, ci, value });
                        return null;
                    },
                };
            }
        }
    }
    // [?a] [!a] [^a]
    const flag = t[inner];
    if (flag === "?" || flag === "!" || flag === "^") {
        const n = c.name(c.spaceEnd(inner + 1), true);
        if (n !== null) {
            const close = c.spaceEnd(n.end);
            if (t[close] === "]") {
                const field = cleanMeta(n.raw);
                return {
                    end: close + 1,
                    fill: (_b, q) => {
                        q.checks.push({ type: "bool", field, op: flag });
                        return null;
                    },
                };
            }
        }
    }
    // [[degree op n]]
    if (t[i + 1] === "[") {
        const at = c.spaceEnd(i + 2);
        const field = META_FIELDS.find((f) => t.startsWith(f, at));
        if (field !== undefined) {
            const op = c.op(c.spaceEnd(at + field.length));
            if (op !== null) {
                const numAt = c.spaceEnd(op.end);
                for (const end of c.numberEnds(numAt)) {
                    const close = c.spaceEnd(end);
                    if (t[close] === "]" && t[close + 1] === "]") {
                        const value = parseFloat(t.slice(numAt, end));
                        const { op: base, not, ci } = splitOp(op.text);
                        return {
                            end: close + 2,
                            fill: (_b, q) => {
                                q.checks.push({ type: "meta", field, op: base, not, ci, value });
                                return null;
                            },
                        };
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Parses a selector the way Cytoscape.js does.
 * @param text - the selector
 * @returns the queries and whether Cytoscape.js rejects the selector
 */
export function parseCyjsSelector(text: unknown): CyjsSelector {
    if (
        typeof text !== "string" ||
        (/^\s*$/.test(text.length > 1024 ? text.slice(0, 1024) : text) && text.trim() === "")
    ) {
        // a missing or blank selector matches nothing
        return { queries: [], invalid: false };
    }
    if (text.length > MAX_SELECTOR_LENGTH) {
        return { queries: [], invalid: true };
    }
    const c = new Cursor(text);
    const first: CyjsQuery = { checks: [] };
    const b: Building = { queries: [first], subject: null, edgeCount: 0, compoundCount: 0, counts: [] };
    let current = first;
    c.pos = c.spaceEnd(0);
    for (;;) {
        const tok = nextToken(c);
        if (tok === null) {
            return { queries: b.queries, invalid: true };
        }
        const next = tok.fill(b, current);
        if (next === false) {
            return { queries: b.queries, invalid: true };
        }
        if (next !== null) {
            current = next;
        }
        c.pos = tok.end;
        if (c.spaceEnd(c.pos) >= text.length) {
            break;
        }
    }
    b.counts.push({ edgeCount: b.edgeCount, compoundCount: b.compoundCount, subject: b.subject });
    for (const k of b.counts) {
        if ((k.compoundCount > 0 && k.edgeCount > 0) || k.edgeCount > 1) {
            return { queries: b.queries, invalid: true };
        }
    }
    return { queries: b.queries, invalid: false };
}
