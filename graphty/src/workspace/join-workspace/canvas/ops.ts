/**
 * The model canvas's join kinds: what a drop of one column onto another (or onto empty canvas) can
 * mean, as graphty-element's join choices. The element does every count; this only names the
 * choices a kind hands it, and reads back which kind a step's choices are.
 */

import type { JoinChoices, JoinInput, JoinKey, JoinReport, JoinSuggestion } from "@graphty/graphty-element/session";

/** A join kind: one tile of the drop menu. */
export type JoinOp = "values" | "edges" | "link" | "map" | "merge" | "compare" | "flag" | "kind" | "split";

/** Every kind, in tile order. */
export const OPS: readonly JoinOp[] = ["values", "edges", "link", "map", "merge", "compare", "flag", "kind", "split"];

/** Each kind's short name (tabs, pills, the kind select) and its tile title. */
export const OP_WORDS: Readonly<Record<JoinOp, { readonly name: string; readonly tile: string }>> = {
    values: { name: "Values", tile: "Put values on nodes" },
    edges: { name: "Edges", tile: "Turn rows into edges" },
    link: { name: "Link", tile: "Link by shared value" },
    map: { name: "Map", tile: "Map ids through a table" },
    merge: { name: "Merge", tile: "Merge on a key" },
    compare: { name: "Compare", tile: "Compare two graphs" },
    flag: { name: "Flag", tile: "Flag nodes on a list" },
    kind: { name: "Kind", tile: "Column to node kind" },
    split: { name: "Split", tile: "Split a;b;c" },
};

/** What a drop names: the input whose rows are read, its column, and where it was let go. */
export interface DropContext {
    /** The input whose rows the step reads. */
    readonly from: JoinInput;
    /** Its column the drag started on (or ended on, when the drop was turned round). */
    readonly column: string;
    /** The graph value the column matches: `"id"` or `"data.<column>"`; absent on empty canvas. */
    readonly path?: string;
    /** The columns of the box let go on, so a second end is looked for elsewhere. */
    readonly ontoColumns?: readonly string[];
    /** Every column the graph's boxes draw, so a table's column named like one is matched to it. */
    readonly graphColumns?: readonly string[];
    /** A held table let go on: the mapping table of a "map". */
    readonly via?: { readonly input: JoinInput; readonly column: string };
    /** graphty-element's suggestion for the input. */
    readonly suggestion: JoinSuggestion;
}

/**
 * A box column's graph value.
 * @param column - the column.
 * @returns `"id"` or `"data.<column>"`.
 */
export function pathOf(column: string): string {
    return column === "id" ? "id" : `data.${column}`;
}

/**
 * The column a graph value names.
 * @param path - `"id"` or `"data.<column>"`.
 * @returns the column.
 */
export function columnOf(path: string): string {
    return path.startsWith("data.") ? path.slice("data.".length) : path;
}

/**
 * The kinds a drop can mean.
 * @param ctx - the drop.
 * @returns the kinds, in tile order.
 */
export function opsFor(ctx: DropContext): readonly JoinOp[] {
    if (ctx.via !== undefined) {
        return ["map"];
    }
    if (ctx.path === undefined) {
        return ctx.from.lists[ctx.column] === undefined ? ["kind"] : ["kind", "split"];
    }
    return ["values", "edges", "link", "merge", "compare", "flag"];
}

/**
 * The kind a drop most likely means: graphty-element's suggestion read as a kind.
 * @param ctx - the drop.
 * @returns the kind.
 */
export function suggestedOp(ctx: DropContext): JoinOp {
    const ops = opsFor(ctx);
    if (ops.includes("edges") && ctx.suggestion.shape === "edges") {
        return "edges";
    }
    return ops[0];
}

/**
 * The key pair a kind starts from, besides the dropped one, for the joins that need two.
 * @param ctx - the drop.
 * @returns the other key.
 */
function otherKey(ctx: DropContext): JoinKey {
    const keys = ctx.suggestion.keys.filter((key) => key.file !== ctx.column);
    // A suggested end named like a column of the box let go on is the end the drop replaced.
    const onto = ctx.ontoColumns ?? [];
    const elsewhere = keys.filter(
        (key) => !onto.includes(key.file) && (key.graph === "id" || !onto.includes(columnOf(key.graph))),
    );
    const found =
        elsewhere.find((key) => key.graph !== ctx.path) ?? keys.find((key) => key.graph !== ctx.path) ?? keys[0];
    if (found !== undefined) {
        return found;
    }
    const column = ctx.from.columns.find((each) => each !== ctx.column) ?? ctx.column;
    return { file: column, graph: "id" };
}

/**
 * The key that ties a new kind's nodes back to the rows' own nodes.
 * @param ctx - the drop.
 * @returns the key.
 */
function anchorKey(ctx: DropContext): JoinKey {
    if (!ctx.from.held) {
        return { file: "id", graph: "id" };
    }
    // A column named like one the graph draws ties the rows to those nodes.
    const named = ctx.from.columns.find(
        (each) => each !== ctx.column && each !== "id" && ctx.graphColumns?.includes(each) === true,
    );
    if (named !== undefined) {
        return { file: named, graph: pathOf(named) };
    }
    return ctx.suggestion.keys.find((key) => key.file !== ctx.column) ?? otherKey(ctx);
}

/**
 * A flag column's name: the list's file name, without its extension.
 * @param name - the input's name.
 * @returns the column.
 */
function flagName(name: string): string {
    return name.replace(/\.[^.]+$/, "");
}

/**
 * The join a kind hands graphty-element for a drop.
 * @param op - the kind.
 * @param ctx - the drop.
 * @returns the choices.
 */
export function choicesFor(op: JoinOp, ctx: DropContext): JoinChoices {
    const key: JoinKey = { file: ctx.column, graph: ctx.path ?? "id" };
    switch (op) {
        case "values":
            return { shape: "node-values", keys: [key] };
        case "flag":
            return { shape: "node-values", keys: [key], columns: [], flag: flagName(ctx.from.name) };
        case "link": {
            const suggested = ctx.suggestion.link?.columns.filter((each) => each !== ctx.column) ?? [];
            const fallback = ctx.from.columns.filter((each) => each !== ctx.column && each !== "id").slice(0, 1);
            return { shape: "link", keys: [key], link: { columns: suggested.length > 0 ? suggested : fallback } };
        }
        case "merge":
            return { shape: "merge", keys: [key] };
        case "compare":
            return { shape: "merge", compare: true, keys: [key] };
        case "edges":
            return { shape: "edges", keys: [key, otherKey(ctx)] };
        case "map": {
            const { via } = ctx;
            const to = via?.input.columns.find((each) => each !== via.column) ?? "id";
            return {
                shape: "node-values",
                keys: [{ file: ctx.column, graph: "id" }],
                ...(via === undefined ? {} : { via: via.input.key, mapping: { columns: [via.column, to] as const } }),
            };
        }
        default:
            return {
                shape: "edges",
                keys: [anchorKey(ctx), { file: ctx.column, graph: "id" }],
                endKinds: { target: ctx.column },
                kindIds: "scoped",
                unknownEnds: "add",
                ...(op === "split" ? { split: { [ctx.column]: ctx.from.lists[ctx.column] ?? ";" } } : {}),
            };
    }
}

/**
 * Which kind a step's choices are.
 * @param choices - the step's join.
 * @returns the kind.
 */
export function opOf(choices: JoinChoices): JoinOp {
    if (choices.via !== undefined || choices.lookup !== undefined) {
        return "map";
    }
    switch (choices.shape) {
        case "link":
            return "link";
        case "merge":
            return choices.compare === true ? "compare" : "merge";
        case "edges":
            if (choices.split !== undefined && Object.keys(choices.split).length > 0) {
                return "split";
            }
            return choices.endKinds === undefined ? "edges" : "kind";
        default:
            return choices.flag === undefined ? "values" : "flag";
    }
}

/**
 * The one number a step is judged by: its pill's, its tab's and its tile's.
 * @param op - the kind.
 * @param report - graphty-element's counts.
 * @param choices - the join, for link's nodes or edges.
 * @returns the count.
 */
export function mainCount(op: JoinOp, report: JoinReport, choices?: JoinChoices): number {
    switch (op) {
        case "edges":
        case "kind":
        case "split":
            return report.newEdges;
        case "link":
            return choices?.link?.as === "nodes" ? report.newNodes : report.pairsLinked;
        case "merge":
            return report.merged;
        case "compare":
            return report.regions?.nodes.both ?? report.merged;
        default:
            return report.matched;
    }
}

/**
 * Whether a kind's count is of things it adds (shown with a "+").
 * @param op - the kind.
 * @param choices - the join.
 * @returns true for a count of new things.
 */
export function addsThings(op: JoinOp, choices?: JoinChoices): boolean {
    return op === "kind" || op === "split" || (op === "link" && choices?.link?.as === "nodes");
}

/**
 * The new node kinds a step makes, each as the columns its nodes carry: the boxes drawn for them.
 * @param choices - the step's join.
 * @returns each kind and its columns.
 */
export function kindsOf(
    choices: JoinChoices,
): readonly { readonly kind: string; readonly columns: readonly string[] }[] {
    if (choices.shape === "link" && choices.link?.as === "nodes") {
        return choices.link.columns.map((column) => ({ kind: choices.link?.kind ?? column, columns: ["id", column] }));
    }
    if (choices.shape === "edges" && choices.endKinds !== undefined) {
        return [choices.endKinds.source, choices.endKinds.target].flatMap((kind) =>
            kind === undefined ? [] : [{ kind, columns: ["id"] }],
        );
    }
    return [];
}
