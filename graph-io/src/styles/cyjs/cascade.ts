/**
 * The Cytoscape.js style engine: a stylesheet applied to the raw element JSON the way Cytoscape.js 3.34 applies it,
 * giving what Cytoscape.js draws for every node and edge, and the stylesheet's rules as neutral rules.
 *
 * - Elements are taken as `cy.add()` takes them: nodes first, ids made text, duplicates and edges to missing nodes
 *   dropped, compound parents linked without cycles.
 * - Comparisons read the RAW element data (a field of mixed types is compared with `===`, not as graph-io's column
 *   holds it), and a dotted field reads a nested path.
 * - Beneath the file's rules lie Cytoscape.js's own default rules (edges 3px wide, compound parents gray rectangles,
 *   selected elements blue); per property the last matching rule wins; a mapper that fails resets the property to
 *   its Cytoscape.js default; an element's own `style` is a bypass over every rule.
 * - Every selector is evaluated through indexes (class, id, value) where one test decides, so a sheet of 20,000
 *   per-value rules or a selector of 100,000 class tests costs one pass over the elements it names. Every step spends
 *   from the extraction's one counted budget.
 *
 * The rules: a selector a short predicate expresses exactly over graph-io's columns becomes that predicate; any other
 * becomes a membership style column (`member.<n>`) with a short `has` test. A run of three or more rules that each
 * test one class, one id or one value of the same field and only set values becomes ONE mapping rule over a winner
 * column. A `data()` or `mapData()` mapper becomes a passthrough or continuous mapping when graph-io's column gives
 * exactly Cytoscape.js's values, else the mapper's per-element values as a style column.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { StyleBudget } from "../budget.js";
import type { CanonSite } from "../canon/site.js";
import { STYLE_ISSUE } from "../codes.js";
import { StyleNotes } from "../notes.js";
import { canonicalFor, degreeValues, evalContinuous, numberOf, plainCell } from "../plan/resolve.js";
import type {
    ColumnRef,
    ContinuousPoint,
    ImporterStyles,
    Mapping,
    Predicate,
    ReaderOutput,
    Scalar,
    StyleColumn,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWorkBudget,
} from "../types.js";
import { CYJS_DEFAULT_STYLESHEET, CYJS_PROPERTY_DEFAULTS } from "./defaults-table.js";
import {
    applyCyjsMapper,
    CYJS_THROWS,
    type CyjsFlat,
    cyjsNeutral,
    type CyjsParsed,
    cyjsProperties,
    cyjsPropertyName,
    type CyjsPropertySpec,
    cyjsRendered,
    parseCyjsValue,
} from "./mappers.js";
import { type CyjsCheck, type CyjsQuery, type CyjsSelector, parseCyjsSelector } from "./selector.js";
import { type CyjsSheetEntry, parseCyjsStylesheetText } from "./stylesheet-text.js";

// ============================================================ elements

/** One element as a Cytoscape.js core holds it. */
export interface CyjsElement {
    /** The element's JSON as given. */
    readonly json: Readonly<Record<string, unknown>>;
    /** Its `data` object as given. */
    readonly data: Readonly<Record<string, unknown>>;
    /** Fields Cytoscape.js rewrites on add: an id made text or generated, endpoints and parent made text. */
    readonly overrides: ReadonlyMap<string, unknown>;
    /** The id. */
    readonly id: string;
    /** The classes. */
    readonly classes: ReadonlySet<unknown>;
    /** `:selected`. */
    readonly selected: boolean;
    /** `:selectable`. */
    readonly selectable: boolean;
    /** `:locked`. */
    readonly locked: boolean;
    /** `:grabbable`. */
    readonly grabbable: boolean;
}

/** The elements of a Cytoscape.js core, with their links. */
export interface CyjsGraph {
    /** Nodes in the order the core holds them. */
    readonly nodes: readonly CyjsElement[];
    /** Edges in the order the core holds them. */
    readonly edges: readonly CyjsElement[];
    /** Each edge's source node. */
    readonly source: Int32Array;
    /** Each edge's target node. */
    readonly target: Int32Array;
    /** Each node's compound parent, or -1. */
    readonly parent: Int32Array;
    /** Each node's children. */
    readonly children: readonly (readonly number[])[];
    /** Each node's incident edges (a loop once). */
    readonly incident: readonly (readonly number[])[];
}

/**
 * Whether a value is a plain object (not an array).
 * @param v - the value
 * @returns true for an object
 */
function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * An id as Cytoscape.js keeps it: a finite number made text, a non-blank string as it is; null when Cytoscape.js
 * refuses it.
 * @param v - the value
 * @returns the id, or null
 */
function idText(v: unknown): string | null {
    if (typeof v === "number" && !Number.isNaN(v)) {
        return String(v);
    }
    if (typeof v === "string" && v !== "" && !/^\s+$/.test(v)) {
        return v;
    }
    return null;
}

/**
 * The flags of an element from its JSON.
 * @param json - the element
 * @param edge - whether it is an edge
 * @returns the selection, lock and grab flags
 */
function flags(
    json: Readonly<Record<string, unknown>>,
    edge: boolean,
): Pick<CyjsElement, "selected" | "selectable" | "locked" | "grabbable"> {
    const pannable = json.pannable === undefined ? edge : Boolean(json.pannable);
    const grabbable = json.grabbable === undefined ? true : Boolean(json.grabbable);
    return {
        selected: Boolean(json.selected),
        selectable: json.selectable === undefined ? true : Boolean(json.selectable),
        locked: Boolean(json.locked),
        grabbable: !pannable && grabbable,
    };
}

/**
 * An element's classes as Cytoscape.js reads them: an array's truthy items, or a string split at whitespace.
 * @param v - the `classes` field
 * @returns the classes
 */
function classSet(v: unknown): Set<unknown> {
    const out = new Set<unknown>();
    let items: unknown[] = [];
    if (Array.isArray(v)) {
        items = v;
    } else if (typeof v === "string") {
        items = v.split(/\s+/);
    }
    for (const c of items) {
        if (c) {
            out.add(c);
        }
    }
    return out;
}

/**
 * Each node's compound parent, as Cytoscape.js keeps it: a parent naming no node, an edge, or a descendant of the
 * node itself (which would make a cycle) is dropped. Near-linear in the nodes, however deep the hierarchy.
 * @param nodes - the core's nodes, in order; a dropped parent is recorded in their overrides
 * @param ids - the index of each node id (edge ids map to -1)
 * @returns each node's parent index (-1 for none) and each node's children
 */
function parentsOf(
    nodes: readonly CyjsElement[],
    ids: ReadonlyMap<string, number>,
): { parent: Int32Array; children: number[][] } {
    const parent = new Int32Array(nodes.length).fill(-1);
    const children: number[][] = nodes.map(() => []);
    // root[x] leads to the root of x's parent chain; paths are halved as they are walked
    const root = Int32Array.from(nodes, (_n, i) => i);
    const rootOf = (x: number): number => {
        while (root[x] !== x) {
            root[x] = root[root[x]];
            x = root[x];
        }
        return x;
    };
    for (let i = 0; i < nodes.length; i++) {
        const raw = nodes[i].data.parent;
        if (raw === undefined || raw === null) {
            continue;
        }
        const text = typeof raw === "number" && !Number.isNaN(raw) ? String(raw) : raw;
        const p = typeof text === "string" ? ids.get(text) : undefined;
        if (p === undefined || p < 0) {
            (nodes[i].overrides as Map<string, unknown>).set("parent", undefined);
            continue;
        }
        if (typeof raw === "number") {
            (nodes[i].overrides as Map<string, unknown>).set("parent", text);
        }
        // a node never becomes its own ancestor: node i has no parent yet, so it is an ancestor of p exactly when it
        // is the root of p's chain, found in near-constant time through the union-find roots
        if (rootOf(p) === i) {
            (nodes[i].overrides as Map<string, unknown>).set("parent", undefined);
            continue;
        }
        parent[i] = p;
        root[i] = p;
        children[p].push(i);
    }
    return { parent, children };
}

/**
 * The elements a Cytoscape.js core holds after `cy.add(elements)`.
 * @param elements - an array of element JSON, or `{ nodes, edges }`
 * @returns the elements and their links
 */
export function cyjsGraph(elements: unknown): CyjsGraph {
    const nodeJson: Record<string, unknown>[] = [];
    const edgeJson: Record<string, unknown>[] = [];
    const take = (item: unknown, group: unknown): void => {
        if (!isObject(item)) {
            return;
        }
        const data = item.data === undefined || item.data === null ? {} : item.data;
        if (!isObject(data)) {
            return;
        }
        let g = group ?? item.group;
        if (g === undefined || g === null) {
            g =
                data.source !== undefined && data.source !== null && data.target !== undefined && data.target !== null
                    ? "edges"
                    : "nodes";
        }
        if (g === "nodes") {
            nodeJson.push(item);
        } else if (g === "edges") {
            edgeJson.push(item);
        }
    };
    if (Array.isArray(elements)) {
        for (const item of elements) {
            take(item, undefined);
        }
    } else if (isObject(elements)) {
        for (const item of Array.isArray(elements.nodes) ? elements.nodes : []) {
            take(item, "nodes");
        }
        for (const item of Array.isArray(elements.edges) ? elements.edges : []) {
            take(item, "edges");
        }
    }
    const ids = new Map<string, number>();
    const nodes: CyjsElement[] = [];
    let generated = 0;
    const element = (
        json: Record<string, unknown>,
        edge: boolean,
        overrides: Map<string, unknown>,
    ): CyjsElement | null => {
        const data = isObject(json.data) ? json.data : {};
        let id: string | null;
        if (data.id === undefined) {
            id = `${String.fromCharCode(0)}generated-${String(generated++)}`;
            overrides.set("id", id);
        } else {
            id = idText(data.id);
            if (id === null || ids.has(id)) {
                return null;
            }
            if (typeof data.id === "number") {
                overrides.set("id", id);
            }
        }
        return { json, data, overrides, id, classes: classSet(json.classes), ...flags(json, edge) };
    };
    for (const json of nodeJson) {
        const e = element(json, false, new Map());
        if (e !== null) {
            ids.set(e.id, nodes.length);
            nodes.push(e);
        }
    }
    const edges: CyjsElement[] = [];
    const src: number[] = [];
    const tgt: number[] = [];
    const edgeIds = new Set<string>();
    for (const json of edgeJson) {
        const overrides = new Map<string, unknown>();
        const e = element(json, true, overrides);
        if (e === null || edgeIds.has(e.id)) {
            continue;
        }
        const ends: number[] = [];
        for (const field of ["source", "target"] as const) {
            const raw = e.data[field];
            const text = typeof raw === "number" && !Number.isNaN(raw) ? String(raw) : raw;
            if (typeof raw === "number") {
                overrides.set(field, text);
            }
            const at = typeof text === "string" ? ids.get(text) : undefined;
            if (at !== undefined) {
                ends.push(at);
            }
        }
        if (ends.length !== 2) {
            continue;
        }
        edgeIds.add(e.id);
        edges.push(e);
        src.push(ends[0]);
        tgt.push(ends[1]);
    }
    for (const id of edgeIds) {
        ids.set(id, -1);
    }
    const { parent, children } = parentsOf(nodes, ids);
    const incident: number[][] = nodes.map(() => []);
    for (let e = 0; e < edges.length; e++) {
        incident[src[e]].push(e);
        if (src[e] !== tgt[e]) {
            incident[tgt[e]].push(e);
        }
    }
    return {
        nodes,
        edges,
        source: Int32Array.from(src),
        target: Int32Array.from(tgt),
        parent,
        children,
        incident,
    };
}

/**
 * A data field as a selector reads it (`ele.data(field)`): the field itself, else a dotted path walked step by step.
 * @param e - the element
 * @param field - the field
 * @returns the value, or undefined
 */
function selectorField(e: CyjsElement, field: string): unknown {
    if (e.overrides.has(field)) {
        return e.overrides.get(field);
    }
    const direct = e.data[field];
    if (direct !== undefined || !field.includes(".")) {
        return direct;
    }
    let v: unknown = e.data;
    const path = field.split(".");
    let k = 0;
    while (v !== null && v !== undefined && k < path.length) {
        v = (v as Record<string, unknown>)[path[k++]];
    }
    return k === path.length ? v : undefined;
}

/**
 * An element's data as a mapper reads it, with Cytoscape.js's rewrites of id, endpoints and parent.
 * @param e - the element
 * @returns an object to read fields from
 */
function mapperData(e: CyjsElement): unknown {
    if (e.overrides.size === 0) {
        return e.data;
    }
    return new Proxy(e.data, {
        get: (target, key) =>
            typeof key === "string" && e.overrides.has(key)
                ? e.overrides.get(key)
                : (target as Record<string | symbol, unknown>)[key],
    });
}

// ============================================================ the stylesheet

/** One stylesheet entry ready to apply. */
interface Entry {
    /** The position in the sheet (default rules first, negative). */
    readonly index: number;
    /** Cytoscape.js's own default rule. */
    readonly tool: boolean;
    /** The selector as written. */
    readonly text: string;
    readonly selector: CyjsSelector;
    readonly properties: readonly (readonly [string, unknown])[];
    readonly dashOnly: boolean;
}

/**
 * The entries of a stylesheet given as JSON (an array of `{ selector, style }`) or as text.
 * @param style - the stylesheet
 * @param notes - where problems are noted
 * @returns the entries in order
 */
function sheetEntries(style: unknown, notes: StyleNotes): CyjsSheetEntry[] {
    if (typeof style === "string") {
        const { entries, stop } = parseCyjsStylesheetText(style);
        if (stop !== null) {
            notes.add(STYLE_ISSUE.UNREADABLE, null, "stylesheet", { sample: stop });
        }
        return entries;
    }
    if (!Array.isArray(style)) {
        return [];
    }
    const out: CyjsSheetEntry[] = [];
    for (const item of style) {
        if (!isObject(item)) {
            continue;
        }
        const props = item.style ?? item.css;
        const properties: [string, unknown][] = [];
        if (isObject(props)) {
            for (const name of Object.keys(props)) {
                properties.push([name, props[name]]);
            }
        }
        out.push({ selector: item.selector, properties, dashOnly: false });
    }
    return out;
}

// ============================================================ matching

/** The most nested combinators a selector may hold before it is noted and matched to nothing. */
const MAX_SELECTOR_NESTING = 64;

/**
 * How deep a query nests.
 * @param q - the query
 * @param depth - the depth so far
 * @returns the depth, capped just above the limit
 */
function nesting(q: CyjsQuery, depth = 0): number {
    if (depth > MAX_SELECTOR_NESTING) {
        return depth;
    }
    let max = depth;
    for (const c of q.checks) {
        for (const sub of subQueries(c)) {
            max = Math.max(max, nesting(sub, depth + 1));
            if (max > MAX_SELECTOR_NESTING) {
                return max;
            }
        }
    }
    return max;
}

/**
 * The queries a check holds.
 * @param c - the check
 * @returns its sub-queries
 */
function subQueries(c: CyjsCheck): CyjsQuery[] {
    switch (c.type) {
        case "child":
        case "parent":
            return [c.parent, c.child];
        case "descendant":
        case "ancestor":
            return [c.ancestor, c.descendant];
        case "split":
            return [c.left, c.right, c.subject];
        case "directedEdge":
        case "nodeSource":
        case "nodeTarget":
            return [c.source, c.target];
        case "undirectedEdge":
            return [c.nodes[0], c.nodes[1]];
        case "nodeNeighbor":
            return [c.node, c.neighbor];
        default:
            return [];
    }
}

/**
 * Cytoscape.js's comparison of a field with a selector's value.
 * @param field - the element's value
 * @param op - the base operator
 * @param not - the `!` flag
 * @param ci - the `@` flag
 * @param value - the selector's value
 * @returns whether it matches
 */
function valCmp(field: unknown, op: string, not: boolean, ci: boolean, value: string | number): boolean {
    let a: unknown = field;
    let b: unknown = value;
    const isFieldStr = typeof field === "string";
    const isFieldNum = typeof field === "number" && !Number.isNaN(field);
    let fs: string | null = null;
    let vs: string | null = null;
    if (isFieldStr || typeof value === "string" || ci) {
        fs = !isFieldStr && !isFieldNum ? "" : String(field);
        vs = String(value);
    }
    if (ci && fs !== null && vs !== null) {
        fs = fs.toLowerCase();
        vs = vs.toLowerCase();
        a = fs;
        b = vs;
    }
    let m = false;
    let ineq = false;
    switch (op) {
        case "*=":
            m = fs !== null && vs !== null && fs.includes(vs);
            break;
        case "$=":
            m = fs !== null && vs !== null && fs.indexOf(vs, fs.length - vs.length) >= 0;
            break;
        case "^=":
            m = fs !== null && vs !== null && fs.startsWith(vs);
            break;
        case "=":
            m = a === b;
            break;
        case ">":
            ineq = true;
            m = (a as number) > (b as number);
            break;
        case ">=":
            ineq = true;
            m = (a as number) >= (b as number);
            break;
        case "<":
            ineq = true;
            m = (a as number) < (b as number);
            break;
        case "<=":
            ineq = true;
            m = (a as number) <= (b as number);
            break;
        default:
            m = false;
    }
    if (not && ((field !== null && field !== undefined) || !ineq)) {
        m = !m;
    }
    return m;
}

/** States whose value changes while Cytoscape.js runs; they are evaluated as at load and noted. */
const RUNTIME_STATES: ReadonlySet<string> = new Set([
    "active",
    "inactive",
    "grabbed",
    "free",
    "animated",
    "unanimated",
    "visible",
    "hidden",
    "transparent",
    "backgrounding",
    "nonbackgrounding",
]);

/** Thrown inside a selector match when the counted budget runs out partway through it. */
class BudgetStop extends Error {}

/** How many units of work a match does between checks of the budget and the signal. */
const CHECK_EVERY = 4096;

/** Evaluates selectors over one graph. */
class Matcher {
    readonly degree: Int32Array;
    readonly indegree: Int32Array;
    readonly outdegree: Int32Array;
    work = 0;
    /** Where the work is charged while a match runs; null between matches. */
    #charge: { kind: StyleTarget; budget: StyleWorkBudget; signal?: AbortSignal } | null = null;
    #charged = 0;
    /**
     * The answers of nested sub-queries for one match, per element: 0 unknown, 1 true, 2 false. Each sub-query is
     * then evaluated at most once per element, so a nested compound selector costs polynomial, not exponential, time.
     */
    readonly #memo = { node: new Map<CyjsQuery, Uint8Array>(), edge: new Map<CyjsQuery, Uint8Array>() };

    constructor(
        readonly g: CyjsGraph,
        readonly notes: StyleNotes,
    ) {
        const n = g.nodes.length;
        this.degree = new Int32Array(n);
        this.indegree = new Int32Array(n);
        this.outdegree = new Int32Array(n);
        for (let e = 0; e < g.edges.length; e++) {
            const s = g.source[e];
            const t = g.target[e];
            this.degree[s] += s === t ? 2 : 1;
            if (s !== t) {
                this.degree[t]++;
            }
            this.outdegree[s]++;
            this.indegree[t]++;
        }
    }

    /**
     * Whether an element matches a query.
     * @param q - the query
     * @param kind - the element's kind
     * @param i - the element
     * @returns true when every check matches
     */
    query(q: CyjsQuery, kind: StyleTarget, i: number): boolean {
        for (const c of q.checks) {
            this.work++;
            if (this.#charge !== null && this.work - this.#charged >= CHECK_EVERY) {
                this.settle();
            }
            if (!this.check(c, kind, i)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Starts one selector match: its work is charged to the budget as it runs, and the sub-query answers are fresh.
     * @param kind - the target the work is charged to
     * @param budget - the counted budget
     * @param signal - cancels the match
     */
    begin(kind: StyleTarget, budget: StyleWorkBudget, signal?: AbortSignal): void {
        this.#charge = { kind, budget, signal };
        this.#charged = this.work;
        this.#memo.node.clear();
        this.#memo.edge.clear();
    }

    /** Ends a match: its remaining work is charged (never throwing) and its sub-query answers are dropped. */
    end(): void {
        const charge = this.#charge;
        this.#charge = null;
        charge?.budget.spend(charge.kind, this.work - this.#charged);
        this.#charged = this.work;
        this.#memo.node.clear();
        this.#memo.edge.clear();
    }

    /**
     * Charges the work done since the last charge; throws BudgetStop once the budget is exhausted.
     * @throws BudgetStop - when the target's budget is exhausted
     */
    settle(): void {
        const charge = this.#charge;
        if (charge === null) {
            return;
        }
        charge.budget.spend(charge.kind, this.work - this.#charged);
        this.#charged = this.work;
        charge.signal?.throwIfAborted();
        if (charge.budget.exhausted(charge.kind)) {
            throw new BudgetStop();
        }
    }

    /**
     * Whether an element matches a nested sub-query, remembered for the rest of the match.
     * @param q - the sub-query
     * @param kind - the element's kind
     * @param i - the element
     * @returns true when every check matches
     */
    sub(q: CyjsQuery, kind: StyleTarget, i: number): boolean {
        const memo = this.#memo[kind];
        let seen = memo.get(q);
        if (seen === undefined) {
            seen = new Uint8Array(kind === "node" ? this.g.nodes.length : this.g.edges.length);
            memo.set(q, seen);
        }
        if (seen[i] !== 0) {
            return seen[i] === 1;
        }
        const m = this.query(q, kind, i);
        seen[i] = m ? 1 : 2;
        return m;
    }

    /**
     * Whether an element matches one check.
     * @param c - the check
     * @param kind - the element's kind
     * @param i - the element
     * @returns true when it matches
     */
    check(c: CyjsCheck, kind: StyleTarget, i: number): boolean {
        const { g } = this;
        const e = kind === "node" ? g.nodes[i] : g.edges[i];
        switch (c.type) {
            case "group":
                return c.value === "*" || c.value === `${kind}s`;
            case "state":
                return this.state(c.value, kind, i, e);
            case "id":
                return e.id === c.value;
            case "class":
                return e.classes.has(c.value);
            case "exist":
                return selectorField(e, c.field) !== undefined;
            case "bool": {
                const v = selectorField(e, c.field);
                if (c.op === "?") {
                    return Boolean(v);
                }
                return c.op === "!" ? !v : v === undefined;
            }
            case "compare":
                return valCmp(selectorField(e, c.field), c.op, c.not, c.ci, c.value);
            case "meta": {
                const v = kind === "node" ? this[c.field][i] : undefined;
                return valCmp(v, c.op, c.not, c.ci, c.value);
            }
            case "true":
                return true;
            case "child":
                return (
                    this.sub(c.child, kind, i) &&
                    kind === "node" &&
                    g.parent[i] >= 0 &&
                    this.sub(c.parent, "node", g.parent[i])
                );
            case "parent":
                return (
                    this.sub(c.parent, kind, i) &&
                    kind === "node" &&
                    g.children[i].some((k) => this.sub(c.child, "node", k))
                );
            case "descendant":
                return this.sub(c.descendant, kind, i) && kind === "node" && this.someAncestor(i, c.ancestor);
            case "ancestor":
                return this.sub(c.ancestor, kind, i) && kind === "node" && this.someDescendant(i, c.descendant);
            case "split":
                return this.sub(c.subject, kind, i) && this.sub(c.left, kind, i) && this.sub(c.right, kind, i);
            case "directedEdge":
                return (
                    kind === "edge" &&
                    this.sub(c.source, "node", g.source[i]) &&
                    this.sub(c.target, "node", g.target[i])
                );
            case "undirectedEdge": {
                if (kind !== "edge") {
                    return false;
                }
                const [a, b] = c.nodes;
                const s = g.source[i];
                const t = g.target[i];
                return (
                    (this.sub(a, "node", s) && this.sub(b, "node", t)) ||
                    (this.sub(b, "node", s) && this.sub(a, "node", t))
                );
            }
            case "nodeSource":
                return (
                    kind === "node" &&
                    this.sub(c.source, kind, i) &&
                    g.incident[i].some((ed) => g.source[ed] === i && this.sub(c.target, "node", g.target[ed]))
                );
            case "nodeTarget":
                return (
                    kind === "node" &&
                    this.sub(c.target, kind, i) &&
                    g.incident[i].some((ed) => g.target[ed] === i && this.sub(c.source, "node", g.source[ed]))
                );
            case "nodeNeighbor":
                return (
                    kind === "node" &&
                    this.sub(c.node, kind, i) &&
                    g.incident[i].some((ed) => {
                        const other = g.source[ed] === i ? g.target[ed] : g.source[ed];
                        return this.sub(c.neighbor, "node", other);
                    })
                );
            default:
                return false;
        }
    }

    /**
     * Whether an ancestor of a node matches a query (cycle-safe: parents never form a cycle).
     * @param i - the node
     * @param q - the query
     * @returns true when one does
     */
    someAncestor(i: number, q: CyjsQuery): boolean {
        for (let a = this.g.parent[i]; a >= 0; a = this.g.parent[a]) {
            if (this.sub(q, "node", a)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether a descendant of a node matches a query, walked without recursion.
     * @param i - the node
     * @param q - the query
     * @returns true when one does
     */
    someDescendant(i: number, q: CyjsQuery): boolean {
        const stack = [...this.g.children[i]];
        while (stack.length > 0) {
            const k = stack.pop() as number;
            if (this.sub(q, "node", k)) {
                return true;
            }
            for (const c of this.g.children[k]) {
                stack.push(c);
            }
        }
        return false;
    }

    /**
     * A state selector, evaluated as at load.
     * @param s - the state
     * @param kind - the element's kind
     * @param i - the element
     * @param e - the element
     * @returns whether the element is in the state
     */
    state(s: string, kind: StyleTarget, i: number, e: CyjsElement): boolean {
        const { g } = this;
        if (RUNTIME_STATES.has(s)) {
            this.notes.add(STYLE_ISSUE.STATE_ASSUMED, kind, `:${s}`, { sample: `:${s}` });
        }
        const node = kind === "node";
        switch (s) {
            case "selected":
                return e.selected;
            case "unselected":
                return !e.selected;
            case "selectable":
                return e.selectable;
            case "unselectable":
                return !e.selectable;
            case "locked":
                return e.locked;
            case "unlocked":
                return !e.locked;
            case "grabbable":
                return e.grabbable;
            case "ungrabbable":
                return !e.grabbable;
            case "free":
            case "inside":
            case "unanimated":
            case "inactive":
            case "nonbackgrounding":
            case "visible":
                return true;
            case "parent":
                return node && g.children[i].length > 0;
            case "childless":
                return node && g.children[i].length === 0;
            case "child":
            case "nonorphan":
                return node && g.parent[i] >= 0;
            case "orphan":
                return node && g.parent[i] < 0;
            case "compound":
                return node
                    ? g.children[i].length > 0
                    : g.children[g.source[i]].length > 0 || g.children[g.target[i]].length > 0;
            case "loop":
                return !node && g.source[i] === g.target[i];
            case "simple":
                return !node && g.source[i] !== g.target[i];
            default:
                return false;
        }
    }
}

/** Indexes of one target's elements: by class, by id, and by value per field (built on first use). */
class Indexes {
    readonly byClass = new Map<unknown, number[]>();
    readonly byId = new Map<string, number>();
    readonly byValue = new Map<string, Map<string, number[]>>();
    /** Per element, the stamp of the last selector that matched it. */
    readonly marks: Int32Array;
    /** The last stamp handed out. */
    stamp = 0;

    constructor(
        readonly elements: readonly CyjsElement[],
        readonly spend: (ops: number) => void,
    ) {
        this.marks = new Int32Array(elements.length);
        for (let i = 0; i < elements.length; i++) {
            for (const c of elements[i].classes) {
                let list = this.byClass.get(c);
                if (list === undefined) {
                    list = [];
                    this.byClass.set(c, list);
                }
                list.push(i);
            }
            if (!this.byId.has(elements[i].id)) {
                this.byId.set(elements[i].id, i);
            }
        }
        spend(elements.length);
    }

    /**
     * The elements whose field is `===` a value.
     * @param field - the field
     * @param value - the value
     * @returns the element indexes
     */
    equal(field: string, value: string | number): readonly number[] {
        let m = this.byValue.get(field);
        if (m === undefined) {
            m = new Map();
            for (let i = 0; i < this.elements.length; i++) {
                const v = selectorField(this.elements[i], field);
                if (typeof v !== "string" && typeof v !== "number") {
                    continue;
                }
                const k = `${typeof v}:${String(v)}`;
                let list = m.get(k);
                if (list === undefined) {
                    list = [];
                    m.set(k, list);
                }
                list.push(i);
            }
            this.byValue.set(field, m);
            this.spend(this.elements.length);
        }
        if (typeof value === "number" && Number.isNaN(value)) {
            return [];
        }
        return m.get(`${typeof value}:${String(value)}`) ?? [];
    }
}

/**
 * The candidates of one query for a target: the element list of its most selective indexed check, or null when
 * every element must be tested.
 * @param q - the query
 * @param kind - the target
 * @param ix - the target's indexes
 * @returns the candidates, or null
 */
function candidates(q: CyjsQuery, kind: StyleTarget, ix: Indexes): readonly number[] | null {
    let best: readonly number[] | null = null;
    for (const c of q.checks) {
        let list: readonly number[] | null = null;
        if (c.type === "group" && c.value !== "*" && c.value !== `${kind}s`) {
            return [];
        }
        if (c.type === "class") {
            list = ix.byClass.get(c.value) ?? [];
        } else if (c.type === "id") {
            const at = ix.byId.get(c.value);
            list = at === undefined ? [] : [at];
        } else if (c.type === "compare" && c.op === "=" && !c.not && !c.ci) {
            list = ix.equal(c.field, c.value);
        }
        if (list !== null && (best === null || list.length < best.length)) {
            best = list;
        }
    }
    return best;
}

// ============================================================ the engine

/** A cell of the cascade: a flat value, a failed mapper (the default), or a value Cytoscape.js cannot draw. */
type Cell = CyjsFlat | "reset" | "fn" | typeof CYJS_THROWS;

/** One property of one entry, parsed. */
interface EntryProperty {
    readonly name: string;
    readonly spec: CyjsPropertySpec;
    readonly parsed: CyjsParsed;
}

/** One target's result. */
export interface CyjsTargetStyles {
    /** The element count (in snapshot order when a snapshot was given). */
    readonly n: number;
    /** What Cytoscape.js draws, per neutral property, by element index. */
    readonly values: Partial<Record<string, StyleColumn>>;
    /** The stylesheet's rules, bottom to top. */
    readonly rules: StyleRule[];
    /** The style columns the rules read. */
    readonly columns: Map<string, StyleColumn>;
    /** The data columns the rules or the values were read from. */
    readonly rawColumns: string[];
    /** Each element's Cytoscape.js element, by index (null where the core holds none). */
    readonly elements: readonly (CyjsElement | null)[];
}

/** The input of the engine. */
export interface CyjsStyleInput {
    /** The elements: an array of element JSON, or `{ nodes, edges }`. */
    readonly elements: unknown;
    /** The stylesheet: an array of `{ selector, style }` (or `css`), or a stylesheet written as text. */
    readonly style: unknown;
    /**
     * The graph the styles are for. Elements are matched to its nodes by id and to its edges in order, and the
     * values come out indexed like it; its columns let a selector or a mapper become a predicate or a mapping over
     * graph-io's columns. Without it, values are indexed like the core holds the elements.
     */
    readonly snapshot?: GraphSnapshot;
    /** Whether Cytoscape.js's own default rules (edges 3px wide, gray compound parents) are applied; default true. */
    readonly toolDefaults?: boolean;
    /**
     * What a live core draws, per element JSON object (`ele.style()` beside `ele.json()`): taken as the truth over what
     * the stylesheet gives, and the only source for a property whose stylesheet value is a function.
     */
    readonly rendered?: ReadonlyMap<object, Readonly<Record<string, unknown>>>;
    /** Where problems are noted. */
    readonly notes?: StyleNotes;
    /** The counted work budget. */
    readonly budget?: StyleWorkBudget;
    /** Cancels the work. */
    readonly signal?: AbortSignal;
}

/** The engine's result. */
export interface CyjsStyles {
    /** Nodes. */
    readonly node: CyjsTargetStyles;
    /** Edges. */
    readonly edge: CyjsTargetStyles;
    /** The elements as the core holds them. */
    readonly graph: CyjsGraph;
}

const POSITIONS: ReadonlyMap<string, string> = new Map([
    ["top,left", "top-left"],
    ["top,center", "top"],
    ["top,right", "top-right"],
    ["center,left", "left"],
    ["center,center", "center"],
    ["center,right", "right"],
    ["bottom,left", "bottom-left"],
    ["bottom,center", "bottom"],
    ["bottom,right", "bottom-right"],
]);

/**
 * Applies a Cytoscape.js stylesheet to its elements as Cytoscape.js 3.34 does.
 * @param input - the elements, the stylesheet, the graph and the options
 * @returns what is drawn per element and the stylesheet's rules, per target
 */
export function evaluateCytoscapeJs(input: CyjsStyleInput): CyjsStyles {
    const notes = input.notes ?? new StyleNotes();
    const budget = input.budget ?? new StyleBudget();
    const graph = cyjsGraph(input.elements);
    const sheet: Entry[] = [];
    if (input.toolDefaults !== false) {
        CYJS_DEFAULT_STYLESHEET.forEach((d, k) => {
            sheet.push({
                index: k - CYJS_DEFAULT_STYLESHEET.length,
                tool: true,
                text: d.selector,
                selector: parseCyjsSelector(d.selector),
                properties: Object.entries(d.style),
                dashOnly: true,
            });
        });
    }
    const raw = sheetEntries(input.style, notes);
    let invalid = 0;
    let deep = 0;
    raw.forEach((r, k) => {
        let selector = parseCyjsSelector(r.selector);
        if (selector.invalid) {
            invalid++;
        }
        if (selector.queries.some((q) => nesting(q) > MAX_SELECTOR_NESTING)) {
            deep++;
            selector = { queries: [], invalid: true };
        }
        sheet.push({
            index: k,
            tool: false,
            text: typeof r.selector === "string" ? r.selector : "",
            selector,
            properties: r.properties,
            dashOnly: r.dashOnly,
        });
    });
    if (invalid > 0) {
        notes.add(STYLE_ISSUE.SELECTOR, null, "selector", { count: invalid, sample: "invalid" });
    }
    if (deep > 0) {
        notes.add(STYLE_ISSUE.SELECTOR, null, "selector", { count: deep, sample: "nested too deep" });
    }
    const matcher = new Matcher(graph, notes);
    const node = evaluateTarget("node", graph, sheet, matcher, input, notes, budget);
    const edge = evaluateTarget("edge", graph, sheet, matcher, input, notes, budget);
    return { node, edge, graph };
}

/**
 * The order of the output: for each output index, the core's element (or -1).
 * @param kind - the target
 * @param graph - the core's elements
 * @param snapshot - the graph, when given
 * @param notes - where problems are noted
 * @returns the core element of each output index
 */
function outputOrder(
    kind: StyleTarget,
    graph: CyjsGraph,
    snapshot: GraphSnapshot | undefined,
    notes: StyleNotes,
): Int32Array {
    const els = kind === "node" ? graph.nodes : graph.edges;
    if (snapshot === undefined) {
        return Int32Array.from(els, (_e, i) => i);
    }
    if (kind === "node") {
        const order = new Int32Array(snapshot.nodeCount).fill(-1);
        for (let i = 0; i < els.length; i++) {
            const at = snapshotIndex(snapshot, els[i].id);
            if (at >= 0 && order[at] < 0) {
                order[at] = i;
            }
        }
        return order;
    }
    const order = new Int32Array(snapshot.edgeCount).fill(-1);
    const nodeAt = outputOrder("node", graph, snapshot, notes);
    const coreToSnap = new Int32Array(graph.nodes.length).fill(-1);
    nodeAt.forEach((c, s) => {
        if (c >= 0) {
            coreToSnap[c] = s;
        }
    });
    let j = 0;
    for (let e = 0; e < els.length && j < snapshot.edgeCount; e++) {
        if (
            coreToSnap[graph.source[e]] === snapshot.edgeSource(j) &&
            coreToSnap[graph.target[e]] === snapshot.edgeTarget(j)
        ) {
            order[j++] = e;
        }
    }
    if (j < snapshot.edgeCount) {
        notes.add(STYLE_ISSUE.UNRESOLVED, "edge", "elements", { count: snapshot.edgeCount - j, sample: "edge order" });
    }
    return order;
}

/**
 * A node's index in the graph by its Cytoscape.js id (text), trying the id as a number too.
 * @param snapshot - the graph
 * @param id - the id
 * @returns the index, or -1
 */
function snapshotIndex(snapshot: GraphSnapshot, id: string): number {
    if (snapshot.ids.has(id)) {
        return snapshot.ids.indexOf(id);
    }
    const n = Number(id);
    return id.trim() !== "" && Number.isFinite(n) && snapshot.ids.has(n) ? snapshot.ids.indexOf(n) : -1;
}

/** The cascade's winning cells, per Cytoscape.js property, by core element. */
type Cells = Map<string, (Cell | undefined)[]>;

/** One entry applied to a target: its elements and its parsed properties. */
interface Applied {
    readonly entry: Entry;
    readonly list: readonly number[];
    readonly props: EntryProperty[];
}

/**
 * A property's cells, created on first use.
 * @param cells - the cells
 * @param name - the Cytoscape.js property
 * @param n - the element count
 * @returns the property's cells
 */
function cellsOf(cells: Cells, name: string, n: number): (Cell | undefined)[] {
    let c = cells.get(name);
    if (c === undefined) {
        c = new Array<Cell | undefined>(n);
        cells.set(name, c);
    }
    return c;
}

/**
 * Applies the sheet to one target.
 * @param kind - nodes or edges
 * @param graph - the core's elements
 * @param sheet - the entries
 * @param matcher - the selector evaluator
 * @param input - the input
 * @param notes - where problems are noted
 * @param budget - the counted budget
 * @returns the target's values and rules
 */
function evaluateTarget(
    kind: StyleTarget,
    graph: CyjsGraph,
    sheet: readonly Entry[],
    matcher: Matcher,
    input: CyjsStyleInput,
    notes: StyleNotes,
    budget: StyleWorkBudget,
): CyjsTargetStyles {
    const els = kind === "node" ? graph.nodes : graph.edges;
    const spend = (ops: number): void => {
        budget.spend(kind, ops);
    };
    const { cells, applied } = cascade(kind, els, sheet, matcher, input, notes, budget);
    const order = outputOrder(kind, graph, input.snapshot, notes);
    const coreToOut = new Int32Array(els.length).fill(-1);
    order.forEach((c, k) => {
        if (c >= 0) {
            coreToOut[c] = k;
        }
    });
    applyBypasses(kind, els, cells, coreToOut, notes);
    if (kind === "edge") {
        forceLoopCurves(graph, cells.get("curve-style"));
    }
    const drawn = drawnValues(kind, els, cells, order, input.rendered, notes, spend);
    const built = buildRules(kind, applied, els, order, coreToOut, input, drawn, matcher, notes, spend);
    return {
        n: order.length,
        values: drawn,
        rules: built.rules,
        columns: built.columns,
        rawColumns: built.rawColumns,
        elements: Array.from(order, (i) => (i >= 0 ? els[i] : null)),
    };
}

/**
 * The cascade over one target: per property, the cell of the last rule that sets it, per element.
 * @param kind - nodes or edges
 * @param els - the core's elements of the target
 * @param sheet - the entries
 * @param matcher - the selector evaluator
 * @param input - the input
 * @param notes - where problems are noted
 * @param budget - the counted budget
 * @returns the cells and the entries applied
 */
function cascade(
    kind: StyleTarget,
    els: readonly CyjsElement[],
    sheet: readonly Entry[],
    matcher: Matcher,
    input: CyjsStyleInput,
    notes: StyleNotes,
    budget: StyleWorkBudget,
): { cells: Cells; applied: Applied[] } {
    const n = els.length;
    const specs = cyjsProperties(kind);
    const spend = (ops: number): void => {
        budget.spend(kind, ops);
    };
    const ix = new Indexes(els, spend);
    const cells: Cells = new Map();
    const notCarried = new Map<string, number>();
    const applied: Applied[] = [];
    let stopped = false;
    for (const entry of sheet) {
        input.signal?.throwIfAborted();
        const props = entryProperties(entry, kind, specs, notes, notCarried);
        if (props.length === 0) {
            continue;
        }
        if (budget.exhausted(kind)) {
            stopped = true;
            break;
        }
        let list: readonly number[];
        matcher.begin(kind, budget, input.signal);
        try {
            list = matchList(entry.selector, kind, n, matcher, ix);
            matcher.end();
        } catch (error) {
            matcher.end();
            if (!(error instanceof BudgetStop)) {
                throw error;
            }
            stopped = true;
            break;
        }
        spend(list.length);
        applied.push({ entry, list, props });
        for (const p of props) {
            const col = cellsOf(cells, p.name, n);
            for (const i of list) {
                col[i] = cellFor(p, els[i]);
            }
            spend(list.length);
        }
    }
    if (stopped) {
        notes.add(STYLE_ISSUE.BUDGET, kind, null, { sample: "stylesheet" });
    }
    for (const [name, count] of notCarried) {
        notes.add(STYLE_ISSUE.NOT_CARRIED, kind, name, { count, sample: name });
    }
    return { cells, applied };
}

/**
 * Each element's own `style` (a bypass) over every rule; a mapper there is refused, as Cytoscape.js refuses it.
 * @param kind - nodes or edges
 * @param els - the core's elements of the target
 * @param cells - the cells; changed in place
 * @param coreToOut - the output index of each core element
 * @param notes - where problems are noted
 */
function applyBypasses(
    kind: StyleTarget,
    els: readonly CyjsElement[],
    cells: Cells,
    coreToOut: Int32Array,
    notes: StyleNotes,
): void {
    const specs = cyjsProperties(kind);
    for (let i = 0; i < els.length; i++) {
        const { json } = els[i];
        const bypass = json.style ?? json.css;
        if (!isObject(bypass)) {
            continue;
        }
        for (const name0 of Object.keys(bypass)) {
            const name = cyjsPropertyName(name0);
            const spec = specs.get(name);
            const value = bypass[name0];
            if (spec === undefined || value === "" || value === null) {
                continue;
            }
            const parsed = parseCyjsValue(spec, value, "bypass");
            if (parsed === null || parsed === CYJS_THROWS || !isFlat(parsed)) {
                notes.add(STYLE_ISSUE.BAD_VALUE, kind, spec.property, { sample: value, element: coreToOut[i] });
                continue;
            }
            cellsOf(cells, name, els.length)[i] = parsed;
        }
    }
}

/**
 * What is drawn per neutral property, in output order: the cells as neutral values, overridden by what a live core
 * reports, with the label alignments and the visibility parts combined. Properties with no value are left out.
 * @param kind - nodes or edges
 * @param els - the core's elements of the target
 * @param cells - the cascade's cells
 * @param order - the core element of each output index
 * @param rendered - what a live core reports per element JSON, when given
 * @param notes - where problems are noted
 * @param spend - spends from the budget
 * @returns the values by property
 */
function drawnValues(
    kind: StyleTarget,
    els: readonly CyjsElement[],
    cells: Cells,
    order: Int32Array,
    rendered: CyjsStyleInput["rendered"],
    notes: StyleNotes,
    spend: (ops: number) => void,
): Record<string, (StyleValue | null)[]> {
    const out = order.length;
    const values: Record<string, (StyleValue | null)[]> = {};
    const words = new Map<string, (string | null)[]>();
    for (const [name, spec] of cyjsProperties(kind)) {
        if (!cells.has(name) && rendered === undefined) {
            continue;
        }
        const col = new Array<StyleValue | null | undefined>(out).fill(null);
        const cellCol = cells.get(name);
        for (let k = 0; k < out && cellCol !== undefined; k++) {
            const c = order[k] >= 0 ? cellCol[order[k]] : undefined;
            if (c !== undefined) {
                col[k] = neutralOfCell(spec, name, c, { notes, target: kind, property: spec.property, element: k });
            }
        }
        for (let k = 0; k < out && rendered !== undefined; k++) {
            const r = order[k] >= 0 ? rendered.get(els[order[k]].json) : undefined;
            if (r !== undefined && Object.hasOwn(r, name)) {
                const site = { notes, target: kind, property: spec.property, element: k };
                const v = cyjsRendered(kind, name, r[name], site);
                // a live core reports "" for a label it does not draw
                col[k] = v === undefined || (v === "" && spec.type === "text") ? null : v;
            }
        }
        spend(2 * out);
        if (spec.property.startsWith("_")) {
            words.set(
                spec.property,
                col.map((v) => (typeof v === "string" ? v : null)),
            );
            continue;
        }
        const target = (values[spec.property] ??= new Array<StyleValue | null>(out).fill(null));
        for (let k = 0; k < out; k++) {
            const v = col[k];
            if (v !== null && v !== undefined) {
                target[k] = v;
            }
        }
    }
    combineParts(kind, out, words, values, notes);
    const drawn: Record<string, (StyleValue | null)[]> = {};
    for (const [p, col] of Object.entries(values)) {
        if (col.some((v) => v !== null)) {
            drawn[p] = col;
        }
    }
    return drawn;
}

/**
 * Cytoscape.js draws every loop curved: a loop whose curve style is anything but `bezier` becomes `bezier`, except
 * `haystack`, which Cytoscape.js leaves as it is because it is the property's own default.
 * @param graph - the core's elements
 * @param col - the winning curve style per edge, if any rule set one
 */
function forceLoopCurves(graph: CyjsGraph, col: (Cell | undefined)[] | undefined): void {
    if (col === undefined) {
        return;
    }
    for (let e = 0; e < graph.edges.length; e++) {
        const c = col[e];
        if (
            graph.source[e] === graph.target[e] &&
            typeof c === "object" &&
            c.kind === "word" &&
            c.value !== "bezier" &&
            c.value !== "haystack"
        ) {
            col[e] = { kind: "word", value: "bezier", str: "bezier" };
        }
    }
}

/**
 * The properties of one entry that apply to a target, parsed.
 * @param entry - the entry
 * @param kind - the target
 * @param specs - the target's carried properties
 * @param notes - where problems are noted
 * @param notCarried - counts of property names not carried
 * @returns the parsed properties, later duplicates last
 */
function entryProperties(
    entry: Entry,
    kind: StyleTarget,
    specs: ReadonlyMap<string, CyjsPropertySpec>,
    notes: StyleNotes,
    notCarried: Map<string, number>,
): EntryProperty[] {
    const out: EntryProperty[] = [];
    for (const [name0, value] of entry.properties) {
        let name = cyjsPropertyName(name0);
        if (entry.dashOnly) {
            name = name0 === "content" ? "label" : name0;
        }
        const spec = specs.get(name);
        if (spec === undefined) {
            if (kind === "node" && !CYJS_EDGE_ONLY.has(name) && !entry.tool) {
                notCarried.set(name, (notCarried.get(name) ?? 0) + 1);
            }
            continue;
        }
        const parsed = parseCyjsValue(spec, value, "rule");
        if (parsed === null || parsed === CYJS_THROWS) {
            // a rule's own value: noted for the target as a whole, so per-element notes keep their element lists
            if (!entry.tool) {
                notes.add(STYLE_ISSUE.BAD_VALUE, kind, null, { sample: `${name}: ${String(value)}` });
            }
            continue;
        }
        out.push({ name, spec, parsed });
    }
    return out;
}

/** Edge properties a node never carries: not noted as dropped on nodes. */
const CYJS_EDGE_ONLY: ReadonlySet<string> = new Set([
    "line-color",
    "line-style",
    "target-arrow-shape",
    "source-arrow-shape",
    "target-arrow-color",
    "source-arrow-color",
    "curve-style",
    "arrow-scale",
    "source-label",
    "target-label",
]);

/**
 * The elements of a target a selector matches, in order.
 * @param sel - the selector
 * @param kind - the target
 * @param n - the element count
 * @param matcher - the evaluator
 * @param ix - the target's indexes
 * @returns the element indexes
 */
function matchList(sel: CyjsSelector, kind: StyleTarget, n: number, matcher: Matcher, ix: Indexes): readonly number[] {
    if (sel.queries.length === 0) {
        return [];
    }
    // one stamp per call marks the elements found, so a selector costs what its candidates cost, not the graph
    const stamp = ++ix.stamp;
    const marked = ix.marks;
    const hits: number[] = [];
    let scanned = false;
    for (const q of sel.queries) {
        const cands = candidates(q, kind, ix);
        if (cands === null) {
            scanned = true;
            for (let i = 0; i < n; i++) {
                if (marked[i] !== stamp && matcher.query(q, kind, i)) {
                    marked[i] = stamp;
                    hits.push(i);
                }
            }
            continue;
        }
        matcher.work += cands.length;
        for (const i of cands) {
            if (marked[i] !== stamp && matcher.query(q, kind, i)) {
                marked[i] = stamp;
                hits.push(i);
            }
        }
    }
    if (scanned || sel.queries.length > 1) {
        hits.sort((a, b) => a - b);
    }
    matcher.work += hits.length;
    return hits;
}

/**
 * The cell a property gives one element: its constant, or its mapper evaluated.
 * @param p - the property
 * @param e - the element
 * @returns the cell
 */
function cellFor(p: EntryProperty, e: CyjsElement): Cell {
    const v = p.parsed;
    if (v.kind === "data" || v.kind === "mapData") {
        const r = applyCyjsMapper(p.spec, v, mapperData(e));
        return r === null ? "reset" : r;
    }
    if (v.kind === "fn") {
        return "fn";
    }
    return v;
}

/** Parsed property defaults, per property name. */
const DEFAULT_CELLS = new Map<string, CyjsFlat | null>();

/**
 * A property's Cytoscape.js default as a flat value.
 * @param name - the property
 * @param spec - its spec
 * @returns the default
 */
function defaultCell(name: string, spec: CyjsPropertySpec): CyjsFlat | null {
    const key = `${spec.type}|${name}`;
    if (!DEFAULT_CELLS.has(key)) {
        const raw = CYJS_PROPERTY_DEFAULTS.get(name);
        const parsed = raw === undefined ? null : parseCyjsValue(spec, raw, "flat");
        DEFAULT_CELLS.set(key, parsed === null || parsed === CYJS_THROWS || !isFlat(parsed) ? null : parsed);
    }
    return DEFAULT_CELLS.get(key) ?? null;
}

/**
 * Whether a parsed value is flat.
 * @param v - the value
 * @returns true for a color, number or word
 */
function isFlat(v: CyjsParsed): v is CyjsFlat {
    return v.kind === "color" || v.kind === "number" || v.kind === "word";
}

/**
 * The neutral value of a cell.
 * @param spec - the property
 * @param name - its Cytoscape.js name
 * @param c - the cell
 * @param site - where it is read
 * @returns the value, null for none, or undefined when it cannot be evaluated (noted)
 */
function neutralOfCell(spec: CyjsPropertySpec, name: string, c: Cell, site: CanonSite): StyleValue | null | undefined {
    if (c === CYJS_THROWS) {
        site.notes.add(STYLE_ISSUE.BAD_VALUE, site.target, site.property, {
            sample: "unstyleable",
            element: site.element,
        });
        return undefined;
    }
    if (c === "fn") {
        site.notes.add(STYLE_ISSUE.LAYER_FLATTENED, site.target, site.property, {
            sample: "FUNCTION",
            element: site.element,
        });
        return undefined;
    }
    const flat = c === "reset" ? defaultCell(name, spec) : c;
    if (flat === null) {
        return null;
    }
    return cyjsNeutral(spec, flat, site);
}

/**
 * Combines the label alignments into `labelPosition` and `visibility` with `display` into `visible`.
 * @param kind - the target
 * @param n - the element count
 * @param words - the parts by internal name
 * @param values - the values; changed in place
 * @param notes - where problems are noted
 */
function combineParts(
    kind: StyleTarget,
    n: number,
    words: ReadonlyMap<string, (string | null)[]>,
    values: Record<string, (StyleValue | null)[]>,
    notes: StyleNotes,
): void {
    const va = words.get("_valign");
    const ha = words.get("_halign");
    if (kind === "node" && (va !== undefined || ha !== undefined)) {
        const col = new Array<StyleValue | null>(n).fill(null);
        for (let i = 0; i < n; i++) {
            const v = va?.[i] ?? null;
            const h = ha?.[i] ?? null;
            if (v === null && h === null) {
                continue;
            }
            const vv = (v ?? "top").replace("-inside", "");
            const hh = (h ?? "center").replace("-inside", "");
            if ((v ?? "").endsWith("-inside") || (h ?? "").endsWith("-inside")) {
                notes.add(STYLE_ISSUE.UNKNOWN_VALUE, kind, "labelPosition", {
                    sample: `${v ?? ""} ${h ?? ""}`,
                    element: i,
                });
            }
            col[i] = POSITIONS.get(`${vv},${hh}`) ?? null;
        }
        values.labelPosition = col;
    }
    const vis = words.get("_visibility");
    const disp = words.get("_display");
    if (vis !== undefined || disp !== undefined) {
        const col = new Array<StyleValue | null>(n).fill(null);
        for (let i = 0; i < n; i++) {
            const a = vis?.[i] ?? null;
            const b = disp?.[i] ?? null;
            if (a === null && b === null) {
                continue;
            }
            col[i] = a !== "hidden" && b !== "none";
        }
        values.visible = col;
    }
}

// ============================================================ rules

/**
 * The stylesheet as neutral rules over graph-io's columns and the style columns it adds.
 * @param kind - the target
 * @param applied - the entries with their matched elements and properties
 * @param els - the core's elements
 * @param order - the core element of each output index
 * @param coreToOut - the output index of each core element, or -1
 * @param input - the input (the graph, the rendered values)
 * @param truth - what is drawn per property, by output index
 * @param matcher - the evaluator (degrees)
 * @param notes - where problems are noted
 * @param spend - spends from the budget
 * @returns the rules, the style columns and the data columns they read
 */
function buildRules(
    kind: StyleTarget,
    applied: readonly { entry: Entry; list: readonly number[]; props: EntryProperty[] }[],
    els: readonly CyjsElement[],
    order: Int32Array,
    coreToOut: Int32Array,
    input: CyjsStyleInput,
    truth: Readonly<Record<string, readonly (StyleValue | null)[]>>,
    matcher: Matcher,
    notes: StyleNotes,
    spend: (ops: number) => void,
): { rules: StyleRule[]; columns: Map<string, StyleColumn>; rawColumns: string[] } {
    const out = order.length;
    const columns = new Map<string, StyleColumn>();
    const raw = new Set<string>();
    const ctx: RuleContext = {
        kind,
        els,
        coreToOut,
        out,
        snapshot: input.snapshot,
        truth: input.rendered === undefined ? null : truth,
        matcher,
        notes,
        spend,
        columns,
        raw,
        members: new Map(),
        faithful: new Map(),
        degrees: new Map(),
    };
    const drafts: Draft[] = [];
    for (const a of applied) {
        const props = a.props.filter((p) => !p.spec.property.startsWith("_"));
        if (props.length === 0 || a.list.length === 0) {
            continue;
        }
        drafts.push(draftOf(ctx, a.entry, a.list, props));
    }
    const rules = collapse(ctx, drafts);
    return { rules, columns, rawColumns: [...raw] };
}

/** The state shared while rules are built. */
interface RuleContext {
    readonly kind: StyleTarget;
    readonly els: readonly CyjsElement[];
    readonly coreToOut: Int32Array;
    readonly out: number;
    readonly snapshot: GraphSnapshot | undefined;
    /** What a live core drew, when given: the values a function-valued property is copied from. */
    readonly truth: Readonly<Record<string, readonly (StyleValue | null)[]>> | null;
    readonly matcher: Matcher;
    readonly notes: StyleNotes;
    readonly spend: (ops: number) => void;
    readonly columns: Map<string, StyleColumn>;
    readonly raw: Set<string>;
    readonly members: Map<string, string>;
    readonly faithful: Map<string, boolean>;
    readonly degrees: Map<string, boolean>;
}

/** A rule with what collapsing needs. */
interface Draft {
    /** Builds the rule (and its predicate's column) when it stays a rule of its own. */
    readonly rule: () => StyleRule;
    /** The rule's id. */
    readonly id: string;
    /** Its constants. */
    readonly set: Readonly<Record<string, StyleValue>>;
    /** Cytoscape.js's own default rule. */
    readonly tool: boolean;
    /** For a rule of one class, one id or one value test that only sets values: its kind and key. */
    readonly single: { readonly sig: string; readonly key: Scalar } | null;
    /** The matched core elements. */
    readonly list: readonly number[];
}

/**
 * One entry as a rule.
 * @param ctx - the shared state
 * @param entry - the entry
 * @param list - the matched core elements
 * @param props - the carried properties
 * @returns the draft
 */
function draftOf(ctx: RuleContext, entry: Entry, list: readonly number[], props: readonly EntryProperty[]): Draft {
    const setting = new Map<string, StyleValue>();
    const mapping = new Map<string, Mapping>();
    let flattened = false;
    const id = entry.tool
        ? `${ctx.kind}.cytoscape-js.${String(entry.index + CYJS_DEFAULT_STYLESHEET.length)}`
        : `${ctx.kind}.sheet.${String(entry.index)}`;
    for (const p of props) {
        // a later duplicate of a property replaces the earlier one
        setting.delete(p.spec.property);
        mapping.delete(p.spec.property);
        const v = p.parsed;
        if (v.kind === "fn") {
            // a function: its values as the live core drew them, copied per element
            const drawn = ctx.truth?.[p.spec.property];
            if (drawn !== undefined) {
                const key = `function.${String(entry.index)}.${p.spec.property}`;
                const col = new Array<StyleValue | null>(ctx.out).fill(null);
                for (const i of list) {
                    const k = ctx.coreToOut[i];
                    if (k >= 0) {
                        col[k] = drawn[k];
                    }
                }
                ctx.columns.set(key, col);
                mapping.set(p.spec.property, { kind: "passthrough", by: { style: key } });
                flattened = true;
            }
            continue;
        }
        if (isFlat(v)) {
            const neutral = cyjsNeutral(p.spec, v, {
                notes: new StyleNotes(),
                target: ctx.kind,
                property: p.spec.property,
            });
            if (neutral !== undefined) {
                setting.set(p.spec.property, neutral);
            }
            continue;
        }
        mapping.set(p.spec.property, mapperMapping(ctx, entry, list, p));
    }
    const set = Object.fromEntries(setting);
    const map = Object.fromEntries(mapping);
    const hasMap = mapping.size > 0;
    // the predicate is built only for a rule that is not collapsed into a run: a run's rules need no column each
    const rule = (): StyleRule => {
        const where = predicateOf(ctx, entry, list);
        return {
            id,
            target: ctx.kind,
            role: roleOf(hasMap, where),
            origin: entry.tool ? "tool" : "declared",
            where,
            ...(setting.size > 0 ? { set } : {}),
            ...(hasMap ? { map } : {}),
            facts: flattened ? { elements: list.length, reason: "FUNCTION" } : { elements: list.length },
        };
    };
    return {
        rule,
        id,
        set,
        tool: entry.tool,
        single: hasMap || entry.tool ? null : singleTest(entry.selector, ctx.kind),
        list,
    };
}

/**
 * A rule's role from what it does.
 * @param hasMap - whether it maps values
 * @param where - its predicate
 * @returns "mapping", "defaults" (constants on every element) or "group"
 */
function roleOf(hasMap: boolean, where: Predicate): string {
    if (hasMap) {
        return "mapping";
    }
    return "all" in where ? "defaults" : "group";
}

/**
 * The varying test of a single-query selector, for collapsing runs: its last class, id or value test, with the other
 * tests (a shared scope such as `[graphty_import = "a"]`) in the signature so a run only joins rules that agree on them.
 * @param sel - the selector
 * @param kind - the target
 * @returns the run signature and the rule's key, or null
 */
function singleTest(sel: CyjsSelector, kind: StyleTarget): { sig: string; key: Scalar } | null {
    if (sel.invalid || sel.queries.length !== 1) {
        return null;
    }
    const checks = sel.queries[0].checks.filter(
        (c) => !(c.type === "group" && (c.value === "*" || c.value === `${kind}s`)),
    );
    const c = checks.at(-1);
    if (c === undefined || checks.slice(0, -1).some((x) => x.type !== "compare" && x.type !== "class")) {
        return null;
    }
    const context = JSON.stringify(checks.slice(0, -1));
    if (c.type === "class" && typeof c.value === "string") {
        return { sig: `class\u0000${context}`, key: c.value };
    }
    if (c.type === "id") {
        return { sig: `id\u0000${context}`, key: c.value };
    }
    if (c.type === "compare" && c.op === "=" && !c.not && !c.ci) {
        return { sig: `eq\u0000${context}\u0000${c.field}`, key: c.value };
    }
    return null;
}

/**
 * Whether graph-io's column holds exactly what a selector reads for every element: the same value (`===`) where the
 * raw data has a scalar, nothing where it has none, and no raw null or false (a selector sees those, a column does
 * not).
 * @param ctx - the shared state
 * @param field - the field
 * @returns true when a predicate over the column selects what the selector selects
 */
function faithful(ctx: RuleContext, field: string): boolean {
    const known = ctx.faithful.get(field);
    if (known !== undefined) {
        return known;
    }
    let ok = ctx.snapshot !== undefined;
    const table = ctx.kind === "node" ? ctx.snapshot?.nodes : ctx.snapshot?.edges;
    const has = table?.names().includes(field) ?? false;
    for (let c = 0; ok && c < ctx.els.length; c++) {
        const k = ctx.coreToOut[c];
        const rv = selectorField(ctx.els[c], field);
        if (rv === null || rv === false) {
            ok = false;
            break;
        }
        const gv = k >= 0 && has && table !== undefined ? plainCell(table.value(field, k)) : null;
        if (rv === undefined ? gv !== null : rv !== gv) {
            ok = false;
        }
    }
    ctx.spend(ctx.els.length);
    ctx.faithful.set(field, ok);
    return ok;
}

/**
 * Whether the graph's degree equals Cytoscape.js's for every node.
 * @param ctx - the shared state
 * @param which - the degree
 * @returns true when a predicate over the computed degree selects what the selector selects
 */
function degreeAgrees(ctx: RuleContext, which: "degree" | "indegree" | "outdegree"): boolean {
    const known = ctx.degrees.get(which);
    if (known !== undefined) {
        return known;
    }
    let ok = ctx.snapshot !== undefined && ctx.kind === "node" && (which === "degree" || ctx.snapshot.directed);
    if (ok && ctx.snapshot !== undefined) {
        const mine = degreeValues(ctx.snapshot, which);
        for (let c = 0; c < ctx.els.length; c++) {
            const k = ctx.coreToOut[c];
            if (k < 0 || mine[k] !== ctx.matcher[which][c]) {
                ok = false;
                break;
            }
        }
        ok &&= ctx.els.length === ctx.out;
    }
    ctx.degrees.set(which, ok);
    return ok;
}

/**
 * A selector as a short predicate when one expresses it exactly, else a membership style column.
 * @param ctx - the shared state
 * @param entry - the entry
 * @param list - the matched core elements
 * @returns the predicate
 */
function predicateOf(ctx: RuleContext, entry: Entry, list: readonly number[]): Predicate {
    const short = shortPredicate(ctx, entry.selector);
    if (short !== null) {
        return short;
    }
    if (list.length === ctx.els.length && ctx.els.length === ctx.out) {
        return { all: true };
    }
    const sig = `${entry.tool ? "tool" : "file"}\u0000${entry.text}`;
    let key = ctx.members.get(sig);
    if (key === undefined) {
        key = `member.${String(ctx.members.size + 1)}`;
        ctx.members.set(sig, key);
        const col = new Array<StyleValue | null>(ctx.out).fill(null);
        for (const i of list) {
            const k = ctx.coreToOut[i];
            if (k >= 0) {
                col[k] = true;
            }
        }
        ctx.spend(ctx.out + list.length);
        ctx.columns.set(key, col);
        ctx.notes.add(STYLE_ISSUE.SELECTOR_AS_COLUMN, ctx.kind, key, { sample: entry.text });
    }
    return { has: { style: key } };
}

/**
 * The short predicate of a selector, or null: every query of one alternative with at most 8 tests, each a group,
 * a value test or an existence test over a column graph-io holds exactly, or a degree test the graph computes the
 * same way; several alternatives only as equal tests of one field (`in`).
 * @param ctx - the shared state
 * @param sel - the selector
 * @returns the predicate, or null
 */
function shortPredicate(ctx: RuleContext, sel: CyjsSelector): Predicate | null {
    if (sel.invalid) {
        return null;
    }
    const alts: Predicate[][] = [];
    for (const q of sel.queries) {
        const terms: Predicate[] = [];
        let never = false;
        for (const c of q.checks) {
            if (c.type === "group") {
                if (c.value !== "*" && c.value !== `${ctx.kind}s`) {
                    never = true;
                }
                continue;
            }
            const t = termOf(ctx, c);
            if (t === null) {
                return null;
            }
            terms.push(t);
        }
        if (never) {
            continue;
        }
        alts.push(terms);
    }
    if (alts.length === 0) {
        return null;
    }
    if (alts.some((t) => t.length === 0)) {
        return ctx.els.length === ctx.out ? { all: true } : null;
    }
    if (alts.length === 1) {
        const t = alts[0];
        if (t.length > 8) {
            return null;
        }
        return t.length === 1 ? t[0] : { and: t };
    }
    // several alternatives: equal tests of one column
    const ref = alts[0][0];
    if (alts.length > 8 || !alts.every((t) => t.length === 1 && "eq" in t[0])) {
        return null;
    }
    const by = (ref as { eq: readonly [ColumnRef, Scalar] }).eq[0];
    const values: Scalar[] = [];
    for (const t of alts) {
        const [r, v] = (t[0] as { eq: readonly [ColumnRef, Scalar] }).eq;
        if (JSON.stringify(r) !== JSON.stringify(by)) {
            return null;
        }
        values.push(v);
    }
    return { in: [by, values] };
}

/**
 * One check as a short predicate term, or null.
 * @param ctx - the shared state
 * @param c - the check
 * @returns the term, or null
 */
function termOf(ctx: RuleContext, c: CyjsCheck): Predicate | null {
    switch (c.type) {
        case "compare":
            if (c.op !== "=" || c.ci || !faithful(ctx, c.field)) {
                return null;
            }
            return c.not ? { not: { eq: [{ data: c.field }, c.value] } } : { eq: [{ data: c.field }, c.value] };
        case "exist":
            return faithful(ctx, c.field) ? { has: { data: c.field } } : null;
        case "bool":
            return c.op === "^" && faithful(ctx, c.field) ? { not: { has: { data: c.field } } } : null;
        case "meta":
            if (c.ci || !degreeAgrees(ctx, c.field)) {
                return null;
            }
            return degreeTerm(c.field, c.op, c.not, c.value);
        default:
            return null;
    }
}

/**
 * A degree test as a predicate over the computed degree, so it follows later edits: `=` as `eq`, and an order test
 * as the degrees it keeps or the degrees it leaves out (degrees are whole numbers from 0), at most 8 of them.
 * @param field - the degree
 * @param op - the comparison
 * @param not - whether the test is negated
 * @param value - the number compared with
 * @returns the predicate, or null when it needs more than 8 values
 */
function degreeTerm(
    field: "degree" | "indegree" | "outdegree",
    op: string,
    not: boolean,
    value: number,
): Predicate | null {
    const ref: ColumnRef = { computed: field };
    if (op === "=") {
        return not ? { not: { eq: [ref, value] } } : { eq: [ref, value] };
    }
    // The whole numbers from 0 the test leaves out (`>`, `>=`) or keeps (`<`, `<=`).
    let below: number;
    if (op === ">" || op === "<=") {
        below = Math.floor(value) + 1;
    } else if (op === ">=" || op === "<") {
        below = Math.ceil(value);
    } else {
        return null;
    }
    if (!Number.isFinite(below) || below < 1 || below > 8) {
        return null;
    }
    const values = Array.from({ length: below }, (_, k) => k);
    const keeps = op === "<" || op === "<=";
    const inSet: Predicate = { in: [ref, values] };
    return keeps !== not ? inSet : { not: inSet };
}

/**
 * A mapper as a neutral mapping over graph-io's column when that gives Cytoscape.js's values for every element the
 * rule applies to, else the mapper's per-element values as a style column (`value.<rule>.<property>`).
 * @param ctx - the shared state
 * @param entry - the entry
 * @param list - the matched core elements
 * @param p - the property
 * @returns the mapping
 */
function mapperMapping(ctx: RuleContext, entry: Entry, list: readonly number[], p: EntryProperty): Mapping {
    const v = p.parsed as CyjsParsed & { kind: "data" | "mapData" };
    const want = new Array<StyleValue | null>(list.length);
    const site: CanonSite = { notes: new StyleNotes(), target: ctx.kind, property: p.spec.property };
    for (let k = 0; k < list.length; k++) {
        const c = cellFor(p, ctx.els[list[k]]);
        const neutral = neutralOfCell(p.spec, p.name, c, site);
        want[k] = neutral ?? null;
    }
    ctx.spend(list.length * 2);
    const candidate = candidateMapping(ctx, v, p);
    if (candidate !== null && ctx.snapshot !== undefined) {
        const table = ctx.kind === "node" ? ctx.snapshot.nodes : ctx.snapshot.edges;
        const canon = canonicalFor(ctx.kind, p.spec.property);
        let exact = table.names().includes(v.field);
        for (let k = 0; exact && k < list.length; k++) {
            const o = ctx.coreToOut[list[k]];
            if (o < 0) {
                continue;
            }
            const cell = plainCell(table.value(v.field, o));
            let got: StyleValue | null = null;
            if (cell !== null && !Array.isArray(cell)) {
                got = candidate.kind === "passthrough" ? canon(cell) : evalContinuous(candidate.points, numberOf(cell));
            }
            if (got !== want[k]) {
                exact = false;
            }
        }
        ctx.spend(list.length);
        if (exact) {
            ctx.raw.add(v.field);
            return candidate;
        }
    }
    const key = `value.${entry.tool ? "tool" : String(entry.index)}.${p.spec.property}`;
    const col = new Array<StyleValue | null>(ctx.out).fill(null);
    for (let k = 0; k < list.length; k++) {
        const o = ctx.coreToOut[list[k]];
        if (o >= 0) {
            col[o] = want[k];
        }
    }
    ctx.columns.set(key, col);
    return { kind: "passthrough", by: { style: key } };
}

/**
 * The neutral mapping a mapper would be over its field, before it is checked.
 * @param ctx - the shared state
 * @param v - the mapper
 * @param p - the property
 * @returns a passthrough for `data()`, a two-point continuous mapping for `mapData()`, or null
 */
function candidateMapping(
    ctx: RuleContext,
    v: CyjsParsed & { kind: "data" | "mapData" },
    p: EntryProperty,
): (Mapping & { kind: "passthrough" }) | (Mapping & { kind: "continuous" }) | null {
    if (v.kind === "data") {
        return { kind: "passthrough", by: { data: v.field } };
    }
    if (v.fieldMin === v.fieldMax) {
        return null;
    }
    const site: CanonSite = { notes: new StyleNotes(), target: ctx.kind, property: p.spec.property };
    const a = cyjsNeutral(p.spec, v.min, site);
    const b = cyjsNeutral(p.spec, v.max, site);
    if (a === undefined || b === undefined) {
        return null;
    }
    const lo: ContinuousPoint = { at: v.fieldMin, below: a, value: a, above: a };
    const hi: ContinuousPoint = { at: v.fieldMax, below: b, value: b, above: b };
    return { kind: "continuous", by: { data: v.field }, points: v.fieldMin < v.fieldMax ? [lo, hi] : [hi, lo] };
}

/**
 * Collapses runs of three or more rules that each test one class, one id or one value of the same field and only set
 * values into ONE mapping rule: per property, a winner column holds the key (class, id or value) of the last rule in
 * the run that matches the element and sets the property (the cascade's winner), and a discrete table maps each key
 * to that rule's value. A run keyed by a value whose column graph-io holds exactly reads that column instead.
 * @param ctx - the shared state
 * @param drafts - the rules in order
 * @returns the rules
 */
function collapse(ctx: RuleContext, drafts: readonly Draft[]): StyleRule[] {
    const out: StyleRule[] = [];
    let run = 0;
    for (let i = 0; i < drafts.length;) {
        const sig = drafts[i].single?.sig ?? null;
        let j = i + 1;
        if (sig !== null) {
            while (j < drafts.length && drafts[j].single?.sig === sig) {
                j++;
            }
        }
        if (sig === null || j - i < 3) {
            for (let k = i; k < j; k++) {
                const rule = drafts[k].rule();
                // Cytoscape.js's own default rule over every element: the writing tool's constants already say it
                if (!(drafts[k].tool && "all" in rule.where)) {
                    out.push(rule);
                }
            }
            i = j;
            continue;
        }
        run++;
        const members = drafts.slice(i, j);
        const props = new Set<string>();
        for (const d of members) {
            for (const p of Object.keys(d.set)) {
                props.add(p);
            }
        }
        // a value run with no shared tests may read the field itself
        const parts = sig.split("\u0000");
        const field = parts[0] === "eq" && parts[1] === "[]" ? parts[2] : null;
        const map: Record<string, Mapping> = {};
        for (const p of props) {
            const winner = new Array<StyleValue | null>(ctx.out).fill(null);
            const table = new Map<string, [Scalar, StyleValue]>();
            for (const d of members) {
                const value = (d.set as Record<string, StyleValue | undefined>)[p];
                if (value === undefined || d.single === null) {
                    continue;
                }
                const { key } = d.single;
                table.set(`${typeof key}:${String(key)}`, [key, value]);
                for (const c of d.list) {
                    const k = ctx.coreToOut[c];
                    if (k >= 0) {
                        winner[k] = key;
                    }
                }
                ctx.spend(d.list.length);
            }
            const entries = [...table.values()];
            // a table key that names a later rule's value: the table maps each key to the last rule's value for it
            const byKey = new Map(entries.map(([k, v]) => [`${typeof k}:${String(k)}`, v]));
            let by: ColumnRef;
            if (field !== null && faithful(ctx, field) && sameByData(ctx, field, winner, byKey)) {
                by = { data: field };
            } else {
                const key = `winner.${String(run)}.${p}`;
                ctx.columns.set(key, winner);
                by = { style: key };
            }
            map[p] = { kind: "discrete", by, table: entries };
        }
        const first = members[0].id.split(".").pop() ?? "";
        out.push({
            id: `${ctx.kind}.sheet.by.${parts[0] === "eq" ? "value" : parts[0]}.${first}`,
            target: ctx.kind,
            role: "mapping",
            origin: "declared",
            where: { all: true },
            map,
            facts: { elements: members.reduce((s, d) => s + d.list.length, 0) },
        });
        i = j;
    }
    return out;
}

/**
 * Whether a discrete table keyed by a column's own values gives every element its winner's value.
 * @param ctx - the shared state
 * @param field - the column
 * @param winner - each element's winning key, or null
 * @param byKey - the table
 * @returns true when reading the column gives the same values
 */
function sameByData(
    ctx: RuleContext,
    field: string,
    winner: readonly (StyleValue | null)[],
    byKey: ReadonlyMap<string, StyleValue>,
): boolean {
    const table = ctx.kind === "node" ? ctx.snapshot?.nodes : ctx.snapshot?.edges;
    if (table === undefined || !table.names().includes(field)) {
        return false;
    }
    for (let k = 0; k < ctx.out; k++) {
        const v = plainCell(table.value(field, k));
        const viaData =
            typeof v === "string" || typeof v === "number" ? (byKey.get(`${typeof v}:${String(v)}`) ?? null) : null;
        const w = winner[k];
        const viaWinner = w === null ? null : (byKey.get(`${typeof w}:${String(w)}`) ?? null);
        if (viaData !== viaWinner) {
            return false;
        }
    }
    return true;
}

// ============================================================ the importer path

/**
 * A Cytoscape.js file's styles as an importer's `styles()` returns them: what Cytoscape.js draws per element and the
 * stylesheet's rules, with Cytoscape.js as the writing tool whose defaults fill what the stylesheet leaves unset.
 * @param input - the elements, the stylesheet, the graph and the options
 * @returns the styles for graph-io's planner
 */
export function cytoscapeJsStyles(input: CyjsStyleInput & { readonly snapshot: GraphSnapshot }): ImporterStyles {
    const notes = input.notes ?? new StyleNotes();
    const r = evaluateCytoscapeJs({ ...input, notes });
    const output = (t: CyjsTargetStyles): ReaderOutput => ({ values: t.values, rules: t.rules, columns: t.columns });
    return {
        canonical: true,
        dialect: "cytoscape-js",
        tool: "cytoscape-js",
        units: "px",
        node: output(r.node),
        edge: output(r.edge),
        notes: notes.list(),
    };
}
