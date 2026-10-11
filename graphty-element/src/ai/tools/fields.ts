/**
 * @file The fields every tool shares, and the checks behind them: a target is exactly one of
 * `where`, `ids` or `result`; a selector is the element's own language, repaired for the two
 * unambiguous mistakes; a node is named by its id or by a unique label.
 */

import { z } from "zod";

import { isGraphtyError } from "../../errors";
import type { GraphSession, TransactionScope } from "../../session/types";
import { type JsonObject, ToolRefusal } from "./types";

/** The most ids, records or positions one call carries. */
export const MAX_ITEMS = 500;

/** The longest selector. */
export const MAX_SELECTOR = 500;

/** The longest other string. */
export const MAX_STRING = 1000;

/** How a selector is written, said once for every field that takes one. */
export const SELECTOR_HELP = "Selector: data.type == 'server', data.weight > `0.5`; \"all\" = all.";

/** A selector. */
export const whereField = z.string().max(MAX_SELECTOR).describe(SELECTOR_HELP);

/** Element ids. */
export const idsField = z.array(z.string().max(MAX_STRING)).max(MAX_ITEMS).describe("Node ids or unique labels.");

/** The comparison operators a `result` target takes. */
const RESULT_OPS = ["==", "!=", "<", "<=", ">", ">=", "in"] as const;

/** A primitive record value. */
const primitive = z.union([z.string().max(MAX_STRING), z.number(), z.boolean(), z.null()]);

/** Selects by a run's value: the tool writes the selector, since run ids are hard to quote. */
export const resultField = z
    .strictObject({
        run: z.string().max(200),
        field: z.string().max(200),
        op: z.enum(RESULT_OPS),
        value: z.unknown().describe("A value; a list for in."),
    })
    .describe('Run value: {run: "louvain", field: "group", op: "==", value: 3}.');

/** The three ways to name a target. */
export const targetFields = {
    where: whereField.optional().describe(SELECTOR_HELP),
    ids: idsField.optional().describe("Node ids or unique labels."),
    result: resultField.optional().describe(resultField.description ?? ""),
};

/** Record values: primitives or arrays of primitives, never `__proto__`. */
export const recordField = z.record(z.string().max(200), z.unknown()).superRefine((record, context) => {
    const value = z.union([primitive, z.array(primitive).max(MAX_ITEMS)]);
    for (const [key, item] of Object.entries(record)) {
        if (isForbiddenKey(key) || !value.safeParse(item).success) {
            context.addIssue({ code: "custom", path: [key], message: "a primitive or a list of primitives" });
        }
    }
});

/** Records to add or change. */
export const recordsField = z.array(recordField).max(MAX_ITEMS);

/**
 * A model-supplied value as text: a string, number or boolean as written, anything else the fallback.
 * @param value - The value.
 * @param fallback - What to use when it is not a primitive.
 * @returns The text.
 */
export function text(value: unknown, fallback = ""): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : fallback;
}

/**
 * Whether a key could reach an object's prototype.
 * @param key - The key.
 * @returns True for `__proto__`, `constructor` and `prototype`.
 */
export function isForbiddenKey(key: string): boolean {
    return key === "__proto__" || key === "constructor" || key === "prototype";
}

/** A target, its form settled. */
export type Target =
    | { readonly kind: "all" }
    | { readonly kind: "where"; readonly where: string }
    | { readonly kind: "ids"; readonly ids: readonly string[] };

/** Words that mean every element. */
const ALL_WORDS = new Set(["all", "*", "everything", "true"]);

/** A comparison operator, after which a double-quoted run is a value, not a field name. */
const BEFORE_VALUE = /(==|!=|<=|>=|<|>)\s*$/;

/**
 * A text as the selector's raw string literal: single-quoted, its backslashes and single quotes
 * escaped.
 * @param value - The text.
 * @returns The literal.
 */
export function rawString(value: string): string {
    const escaped = value.replaceAll("\\", String.raw`\\`).replaceAll("'", String.raw`\'`);
    return `'${escaped}'`;
}

/**
 * Rewrite a value written in double quotes (`data.label == "O'Brien"`) as the raw string literal
 * the parser reads. In the selector language double quotes name a field (`data."first name"`), so
 * only a double-quoted run on the right of a comparison is a value; quotes inside a literal are
 * left alone.
 * @param where - The selector.
 * @returns It, its double-quoted values as raw strings.
 */
function literalQuotes(where: string): string {
    let out = "";
    let at = 0;
    while (at < where.length) {
        const character = where[at];
        if (character !== "'" && character !== "`" && character !== '"') {
            out += character;
            at++;
            continue;
        }

        const close = closingQuote(where, at);
        const run = where.slice(at, close + 1);
        out += character === '"' && close < where.length && BEFORE_VALUE.test(out) ? rawString(unquoted(run)) : run;
        at = close + 1;
    }

    return out;
}

/**
 * Where the quoted run that opens at a position closes, past escaped characters.
 * @param where - The selector.
 * @param at - The opening quote.
 * @returns The closing quote's position, or the length when it never closes.
 */
function closingQuote(where: string, at: number): number {
    let close = at + 1;
    while (close < where.length && where[close] !== where[at]) {
        close += where[close] === "\\" ? 2 : 1;
    }

    return close;
}

/**
 * The text of a double-quoted run: JSON's escapes read, or the characters as written.
 * @param run - The run, quotes included.
 * @returns Its text.
 */
function unquoted(run: string): string {
    try {
        return JSON.parse(run) as string;
    } catch {
        return run.slice(1, -1);
    }
}

/**
 * Repair the unambiguous mistakes a model makes in a selector: a bare attribute name gets
 * `data.`, a bare number on the right of a comparison gets backticks, and a value in double quotes
 * becomes the single-quoted literal the parser takes.
 * @param where - The selector as written.
 * @param attributes - The attribute names the graph holds.
 * @returns The repaired selector.
 */
export function repairSelector(where: string, attributes: readonly string[]): string {
    let out = literalQuotes(where);
    for (const name of attributes) {
        // A bare name at the start or after a boolean operator or parenthesis, not already a path.
        const bare = new RegExp(String.raw`(^|[\s(!&|])(${escapeRegExp(name)})(?=\s*(==|!=|<=|>=|<|>|\)|$))`, "g");
        out = out.replaceAll(bare, (_match: string, lead: string, key: string) => `${lead}data.${key}`);
    }

    return out.replaceAll(/(==|!=|<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)(?![\d`.])/g, (_match, op: string, num: string) => {
        return `${op} \`${num}\``;
    });
}

/** `results.<run>.<field>`, the run written as an id, an algorithm key (quoted or not) or "latest". */
const RESULT_REFERENCE = /results\.(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([\w:-]+))\.([A-Za-z_]\w*)/g;

/**
 * Rewrite each run a selector names by what the model knows -- its algorithm key, quoted or not, or
 * "latest" -- to the run's own path. A run id is not the key (`shortest-path` runs as
 * `shortest_path`), and a hyphen is no identifier character, so the model's natural spelling would
 * not parse. A reference to no run is left for the parser to report.
 * @param session - The runs.
 * @param where - The selector.
 * @returns The selector, its run references resolved.
 */
function resultReferences(session: Pick<GraphSession, "runs" | "results">, where: string): string {
    return where.replaceAll(
        RESULT_REFERENCE,
        (match: string, double?: string, single?: string, tick?: string, bare?: string, field = ""): string => {
            const name = double ?? single ?? tick ?? bare ?? "";
            try {
                return session.results.path(resolveRun(session, name), field);
            } catch {
                return match;
            }
        },
    );
}

/**
 * Escape a string for a regular expression.
 * @param text - The text.
 * @returns It, escaped.
 */
function escapeRegExp(text: string): string {
    return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * The attribute names a graph holds, by element kind.
 * @param session - The session.
 * @param kind - Nodes or edges.
 * @returns The names.
 */
export function attributeNames(session: Pick<GraphSession, "data">, kind: "node" | "edge"): string[] {
    return session.data
        .attributes()
        .filter((attribute) => attribute.kind === kind && attribute.path.startsWith("data."))
        .map((attribute) => attribute.path.slice("data.".length));
}

/**
 * Settle a call's target: exactly one of `where`, `ids` or `result`.
 * @param session - Where to resolve labels and runs.
 * @param args - The call's arguments.
 * @param kind - Nodes or edges.
 * @param required - Whether a missing target is refused.
 * @returns The target, its selector repaired and its labels resolved, and what was repaired.
 * @throws {ToolRefusal} `AI_ARG_INVALID` for none or more than one; `AI_UNKNOWN_NODE` for an id that names nothing.
 */
export function settleTarget(
    session: TransactionScope,
    args: Record<string, unknown>,
    kind: "node" | "edge",
    required: boolean,
): { target: Target | undefined; notes: JsonObject } {
    const named = (["where", "ids", "result"] as const).filter((key) => args[key] !== undefined);
    if (named.length > 1) {
        throw new ToolRefusal("AI_ARG_INVALID", {
            path: named.join(","),
            expected: "exactly one of where, ids, result",
        });
    }

    if (named.length === 0) {
        if (required) {
            throw new ToolRefusal("AI_ARG_INVALID", {
                path: "where",
                expected: 'a target: where (use "all" for everything), ids or result',
            });
        }

        return { target: undefined, notes: {} };
    }

    const notes: JsonObject = {};
    if (args.ids !== undefined) {
        const ids = args.ids as string[];
        if (kind === "edge") {
            return { target: { kind: "ids", ids }, notes };
        }

        const resolved: JsonObject = {};
        const out = ids.map((id) => {
            const node = resolveNode(session, id);
            if (node !== id) {
                resolved[id] = node;
            }

            return node;
        });
        if (Object.keys(resolved).length > 0) {
            notes.resolved = resolved;
        }

        return { target: { kind: "ids", ids: out }, notes };
    }

    if (args.result !== undefined) {
        const where = resultSelector(session, args.result as z.infer<typeof resultField>);
        notes.rewritten = where;
        return { target: { kind: "where", where }, notes };
    }

    const raw = text(args.where).trim();
    if (ALL_WORDS.has(raw.toLowerCase())) {
        return { target: { kind: "all" }, notes };
    }

    if (raw === "") {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "where", expected: 'a selector, or "all"' });
    }

    const where = repairSelector(resultReferences(session, raw), attributeNames(session, kind));
    if (where !== raw) {
        notes.rewritten = where;
    }

    return { target: { kind: "where", where }, notes };
}

/**
 * Settle a target a call must have.
 * @param session - Where to resolve labels and runs.
 * @param args - The call's arguments.
 * @param kind - Nodes or edges.
 * @returns The target and what was repaired.
 * @throws {ToolRefusal} `AI_ARG_INVALID` for none or more than one.
 */
export function requireTarget(
    session: TransactionScope,
    args: Record<string, unknown>,
    kind: "node" | "edge",
): { target: Target; notes: JsonObject } {
    const { target, notes } = settleTarget(session, args, kind, true);
    if (target === undefined) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "where" });
    }

    return { target, notes };
}

/**
 * The selector a `result` target means.
 * @param session - The session, for the run.
 * @param result - The target.
 * @returns The selector.
 */
function resultSelector(session: TransactionScope, result: z.infer<typeof resultField>): string {
    const valid = z.union([primitive, z.array(primitive).max(MAX_ITEMS)]).safeParse(result.value);
    if (!valid.success) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "result.value", expected: "a value, or a list of values" });
    }

    const run = resolveRun(session, result.run);
    const path = session.results.path(run, result.field);
    const literal = (value: unknown): string =>
        typeof value === "string" ? rawString(value) : `\`${JSON.stringify(value)}\``;
    if (result.op === "in") {
        const values = Array.isArray(result.value) ? result.value : [result.value];
        return values.map((value) => `${path} == ${literal(value)}`).join(" || ");
    }

    return `${path} ${result.op} ${literal(result.value)}`;
}

/**
 * Name a run by what the model knows: its id, an algorithm key (its newest run) or "latest".
 * @param session - The session.
 * @param name - The name.
 * @returns The run's id.
 * @throws {ToolRefusal} `AI_UNKNOWN_RUN` when no run answers it.
 */
export function resolveRun(session: Pick<GraphSession, "runs">, name: string): string {
    const runs = session.runs.list();
    const lower = name.toLowerCase().replaceAll("_", "-");
    const found =
        lower === "latest"
            ? runs.at(-1)
            : (runs.find((run) => run.id === name) ??
              [...runs].reverse().find((run) => run.algorithm.toLowerCase() === lower));
    if (found === undefined) {
        throw new ToolRefusal("AI_UNKNOWN_RUN", { run: name, runs: runs.map((run) => run.id).slice(-10) });
    }

    return found.id;
}

/**
 * A node by its id, or by a label that names exactly one node (ignoring case).
 * @param session - The session.
 * @param name - The id or label.
 * @returns The node's id.
 * @throws {ToolRefusal} `AI_UNKNOWN_NODE` with suggestions when nothing answers it.
 */
export function resolveNode(session: Pick<GraphSession, "data">, name: string): string {
    if (session.data.node(name) !== undefined) {
        return name;
    }

    const lower = name.toLowerCase();
    const candidates = session.data.nodePage({ matching: { text: name, mode: "substring" }, limit: 20 }).records;
    // The label column when the data names one; a `label` or `name` field when it does not.
    const labelOf = (record: Readonly<Record<string, unknown>>): string | undefined => {
        const named = session.data.name(record.id as string);
        const own = named !== undefined && named !== String(record.id) ? named : (record.label ?? record.name);
        return typeof own === "string" || typeof own === "number" ? String(own) : undefined;
    };
    const exact = candidates.filter((record) => labelOf(record)?.toLowerCase() === lower);
    if (exact.length === 1) {
        return String(exact[0].id);
    }

    throw new ToolRefusal("AI_UNKNOWN_NODE", {
        id: name,
        didYouMean: candidates.slice(0, 5).map((record) => String(record.id)),
    });
}

/**
 * The scope a node target covers, as the session reads one.
 * @param target - The target.
 * @returns The scope.
 */
export function scopeOf(target: Target): "graph" | { where: string } | { nodes: readonly string[] } {
    if (target.kind === "all") {
        return "graph";
    }

    return target.kind === "where" ? { where: target.where } : { nodes: target.ids };
}

/**
 * The ids a target names, for nodes or edges, through the session's own pages.
 * @param session - The session.
 * @param target - The target.
 * @param kind - Nodes or edges.
 * @param limit - The most to read.
 * @returns The ids and how many there are in all.
 * @throws {ToolRefusal} `AI_BAD_SELECTOR` for a selector that does not parse.
 */
export function idsOf(
    session: Pick<GraphSession, "data">,
    target: Target,
    kind: "node" | "edge",
    limit = Infinity,
): { ids: string[]; total: number } {
    if (target.kind === "ids") {
        if (kind === "edge") {
            return { ids: target.ids.filter((id) => session.data.edge(id) !== undefined), total: target.ids.length };
        }

        return { ids: [...target.ids], total: target.ids.length };
    }

    const options = target.kind === "where" ? { where: target.where, limit } : { limit };
    const page = guardSelector(target, () =>
        kind === "node" ? session.data.nodePage(options) : session.data.edgePage(options),
    );
    return { ids: page.records.map((record) => String(record.id)), total: page.total };
}

/**
 * Run a read that parses a selector, turning a parse failure into `AI_BAD_SELECTOR`.
 * @param target - The target, for its selector.
 * @param read - The read.
 * @returns What the read returned.
 * @throws {ToolRefusal} `AI_BAD_SELECTOR` when the selector does not parse.
 */
export function guardSelector<T>(target: Target | undefined, read: () => T): T {
    try {
        return read();
    } catch (error) {
        if (isGraphtyError(error) && error.code === "E_BAD_SELECTOR" && target?.kind === "where") {
            throw new ToolRefusal("AI_BAD_SELECTOR", { where: target.where, expected: SELECTOR_HELP });
        }

        throw error;
    }
}

/**
 * Refuse a write whose target matches nothing.
 * @param total - How many elements it matches.
 * @param target - The target.
 * @throws {ToolRefusal} `AI_EMPTY_MATCH` when it matches none.
 */
export function requireMatch(total: number, target: Target): void {
    if (total === 0) {
        throw new ToolRefusal("AI_EMPTY_MATCH", { where: targetText(target), nodes: 0, edges: 0 });
    }
}

/**
 * A target as the text a refusal names it by.
 * @param target - The target.
 * @returns Its selector, its ids, or "all".
 */
export function targetText(target: Target): string {
    if (target.kind === "where") {
        return target.where;
    }

    return target.kind === "ids" ? target.ids.join(",") : "all";
}
