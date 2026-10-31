/**
 * @file What is wrong with the loaded data, and how each problem is fixed: `session.data.issues()`,
 * `data.fix()` and `data.ignoreIssue()`.
 *
 * Two kinds of issue. A column issue (a number column holding "N/A", a decimal comma, a padded
 * value, two spellings of one value, mixed types) is read from the records as they are now, so a
 * fix or an edit that clears it clears the issue. A load issue (an edge naming a node no node row
 * gave, a node row repeating an id, a row the reader or the graph refused) is something only the
 * load saw: the load records its facts in the `issues` graph value, and a fix consumes them. That
 * value also holds the ignored issues and the repeated edges kept on purpose, so undo, redo and a
 * project file move all of it with the graph.
 */

import type { AttributeDescriptor, EdgeId, NodeId, SourceKey } from "../catalog/types";
import type { ImportTally } from "../data/report";
import { GraphtyError } from "../errors/GraphtyError";
import { serviceOf } from "./commands/data";
import type { SessionCommand } from "./planning";
import type { UndoableDefinition } from "./project/Dispatcher";
import type { ColumnRef } from "./shared";
import type { EdgeRecord, NodeRecord } from "./types";

/**
 * A stable name for one issue: the same problem has the same id after a fix elsewhere, an undo
 * or a project reload, so an ignored issue stays ignored. Built from the code and the column
 * (`"decimal-comma:edge:amount"`) or the kind of row (`"repeated-id:node"`).
 * @since 3.30.0
 */
export type IssueId = string; // NOSONAR(S6564): a named public type in the API report; removing it breaks consumers

/**
 * What kind of problem an issue is.
 *
 * - `not-a-number`: a column of numbers holds values that are not (`"N/A"`); `params.examples`.
 * - `decimal-comma`: a column of numbers holds numbers written with a decimal comma (`"12,5"`).
 * - `unknown-end`: edges name a node no node row gave, so the load made it; `count` is the
 *   edges, `params.nodes` the nodes, `params.examples` a few of their ids, `params.ends` which
 *   end of those edges names an unknown node (`"source"`, `"target"` or `"both"`).
 * - `repeated-edge`: edges join a pair an earlier edge already joins; `count` is the repeats,
 *   `params.pairs` the pairs.
 * - `repeated-id`: node rows repeat an id an earlier row gave, and were left out;
 *   `params.ids` the ids.
 * - `padded-space`: text values begin or end with spaces.
 * - `case-variant`: one value spelled in more than one case (`"Acme"`, `"ACME"`); `count` is the
 *   values not in the commonest spelling.
 * - `blank-id`: rows with no id, or an edge with no end, which the graph refused;
 *   `params.rowsAre`, `params.examples` (the rows).
 * - `refused-row`: rows the reader could not read (a CSV row with too many fields);
 *   `params.lines`, `params.issues` (the reader's codes).
 * - `mixed-type`: a column holds values of several types and is not a number column;
 *   `params.types` counts each.
 * - `could-be-yes-no`: a text column holds only yes and no (or true and false); `count` is the
 *   values, `params.values` the spellings.
 * - `location-unmatched`: place names in the location column no place in the gazetteer matches,
 *   so those nodes have no place on the map; `count` is the rows, `params.examples` a few names.
 *   Read once the location map has loaded the gazetteer.
 * - `location-ambiguous`: place names more than one place matches even after narrowing, so the
 *   most populous was taken; `count` is the rows, `params.examples` a few names.
 *
 * OPEN UNION: codes may be added in a minor release; handle unknown codes.
 * @since 3.30.0
 */
export type IssueCode =
    | "not-a-number"
    | "decimal-comma"
    | "unknown-end"
    | "repeated-edge"
    | "repeated-id"
    | "padded-space"
    | "case-variant"
    | "blank-id"
    | "refused-row"
    | "mixed-type"
    | "could-be-yes-no"
    | "location-unmatched"
    | "location-ambiguous";

/**
 * A fix `data.fix` can apply to an issue that lists it.
 *
 * - `make-blank`: the values that are not numbers become blank.
 * - `read-decimal-comma`: `"12,5"` becomes `12.5`, `"1.234,5"` becomes `1234.5`.
 * - `add-nodes`: keep the nodes the edges made, as nodes of their own.
 * - `leave-out`: remove the nodes the edges made, and those edges.
 * - `merge`: remove the repeated edges, keeping the first edge of each pair.
 * - `keep`: keep the repeated edges as edges of their own.
 * - `keep-first`: keep each node as its first row gave it.
 * - `merge-rows`: write each later row's values onto the node, later rows winning.
 * - `trim`: take the spaces off both ends.
 * - `merge-case`: rewrite every spelling to the commonest one.
 * - `read-yes-no`: yes and true become `true`, no and false become `false`.
 *
 * OPEN UNION: fixes may be added in a minor release.
 * @since 3.30.0
 */
export type FixCode =
    | "make-blank"
    | "read-decimal-comma"
    | "add-nodes"
    | "leave-out"
    | "merge"
    | "keep"
    | "keep-first"
    | "merge-rows"
    | "trim"
    | "merge-case"
    | "read-yes-no";

/**
 * Where an issue stands: `"open"` (in the data now), `"ignored"` (in the data, ignored with
 * `data.ignoreIssue`) or `"fixed"` (settled by `data.fix`, listed with `includeFixed`).
 *
 * OPEN UNION: states may be added in a minor release.
 * @since 3.30.0
 */
export type IssueStatus = "open" | "ignored" | "fixed";

/**
 * One problem with the loaded data: what `session.data.issues()` lists. Neutral facts: a reader
 * words them from `code`, `count` and `params`. An issue with a zero count is never listed.
 *
 * ```ts
 * for (const issue of session.data.issues()) {
 *     console.log(issue.code, issue.column?.name, issue.count, issue.fixes);
 * }
 * await session.data.fix(session.data.issues()[0], "trim");
 * ```
 * @since 3.30.0
 */
export interface DataIssue {
    /** The issue's stable id. */
    readonly id: IssueId;
    /** What kind of problem it is. */
    readonly code: IssueCode;
    /** The column it is in, for a column issue. */
    readonly column?: ColumnRef;
    /** The load it came from, when one load alone gave it. */
    readonly source?: SourceKey;
    /** How many values, rows or edges have the problem: always more than zero. */
    readonly count: number;
    /** The facts its code names. */
    readonly params: Readonly<Record<string, unknown>>;
    /**
     * The fixes that would change the data, in the order a reader would try them; may be empty.
     * Never `current`, and empty for a fixed issue.
     */
    readonly fixes: readonly FixCode[];
    /**
     * The fix whose outcome the data already shows, for an issue the load settled one way by
     * default: the made nodes are kept (`"add-nodes"`), the first row of a repeated id is kept
     * (`"keep-first"`), the repeated edges are kept (`"keep"`). `data.fix` takes it too, and then
     * only marks the issue fixed. Absent when no fix describes the data as it is.
     */
    readonly current?: FixCode;
    /** Where the issue stands. */
    readonly status: IssueStatus;
    /** For a fixed issue, the fix that settled it; `count` and `params` are as they were then. */
    readonly fixedBy?: FixCode;
    /** Whether it was ignored with `data.ignoreIssue`; only listed so with `includeIgnored`. */
    readonly ignored: boolean;
}

/**
 * What a fix did: how many nodes and edges it changed, added or removed.
 * @since 3.30.0
 */
export interface FixResult {
    /** The nodes changed, kept or removed. */
    readonly nodes: number;
    /** The edges changed, kept or removed. */
    readonly edges: number;
}

/** What one load saw that the graph does not keep: the facts the load issues are read from. */
export interface LoadFacts {
    /** Node ids an edge named that no node row gave, which the load made. */
    readonly unknownEnds: readonly NodeId[];
    /** Node rows left out for repeating an earlier row's id, in order. */
    readonly repeatedIds: readonly { readonly id: NodeId; readonly record: Readonly<Record<string, unknown>> }[];
    /** Rows refused for a blank id or end, and a few of them. */
    readonly blankIds: {
        readonly nodes: number;
        readonly edges: number;
        readonly examples: readonly Readonly<Record<string, unknown>>[];
    };
    /** Rows the reader could not read: the line and the reader's code. */
    readonly refusedRows: readonly { readonly line: number; readonly issue: string }[];
}

/** An issue as it stood when a fix settled it. */
export type FixedIssue = Omit<DataIssue, "fixes" | "current" | "status" | "ignored"> & { readonly fixedBy: FixCode };

/** The `issues` graph value. */
export interface IssueState {
    /** What each load saw, by its key. */
    readonly facts: Readonly<Record<SourceKey, LoadFacts>>;
    /** The ignored issues. */
    readonly ignored: readonly IssueId[];
    /** The node pairs whose repeated edges were kept, by {@link pairKey}. */
    readonly kept: readonly string[];
    /** The issues fixed, oldest first, one per id. Absent in a state saved before it existed. */
    readonly fixed?: readonly FixedIssue[];
}

/** The graph value holding the {@link IssueState}. */
export const ISSUES_VALUE = "issues";

/** The state of a graph nothing was recorded for. */
export const NO_ISSUE_STATE: IssueState = Object.freeze({ facts: Object.freeze({}), ignored: [], kept: [] });

/** How many refused rows a load keeps as examples. */
const EXAMPLES = 5;

/** A number written with a decimal comma, with or without dots between thousands. */
const DECIMAL_COMMA = /^[+-]?\d+(?:\.\d{3})*,\d+$/;

/**
 * The facts a load leaves for its issues, or null when it saw nothing wrong.
 * @param tally - The load's tally.
 * @param leftOut - Whether the load left unmatched edges out, so it made no node for them.
 * @returns The facts.
 */
export function loadFactsOf(tally: ImportTally, leftOut: boolean): LoadFacts | null {
    const blank = tally.refusedRows;
    const facts: LoadFacts = {
        unknownEnds: leftOut ? [] : ([...tally.unmatchedValues] as NodeId[]),
        repeatedIds: [...tally.droppedRows],
        blankIds: {
            nodes: blank.filter((row) => row.rowsAre === "nodes").length,
            edges: blank.filter((row) => row.rowsAre === "edges").length,
            examples: blank.slice(0, EXAMPLES).map((row) => row.record),
        },
        refusedRows: tally.errors.flatMap((error) =>
            error.code !== "refused-row" && typeof error.line === "number" && error.params.skipped !== "value"
                ? [
                      {
                          line: error.line,
                          issue: typeof error.params.issue === "string" ? error.params.issue : error.code,
                      },
                  ]
                : [],
        ),
    };
    const empty =
        facts.unknownEnds.length === 0 &&
        facts.repeatedIds.length === 0 &&
        blank.length === 0 &&
        facts.refusedRows.length === 0;
    return empty ? null : facts;
}

/**
 * The state with one more load's facts.
 * @param state - The state now, or undefined.
 * @param key - The load's key.
 * @param facts - What it saw.
 * @returns The state.
 */
export function withLoadFacts(state: IssueState | undefined, key: SourceKey, facts: LoadFacts): IssueState {
    const base = state ?? NO_ISSUE_STATE;
    return { ...base, facts: { ...base.facts, [key]: facts } };
}

/**
 * A node pair as a string, the same either way round for an undirected graph.
 * @param source - One end.
 * @param target - The other.
 * @param directed - Whether the graph is directed.
 * @returns The key.
 */
export function pairKey(source: NodeId, target: NodeId, directed: boolean): string {
    const ends = [String(source), String(target)];
    if (!directed) {
        ends.sort(); // NOSONAR(S2871): code-unit order is the point: a locale-free key for the pair
    }
    return JSON.stringify(ends);
}

/** What the issues are read from. */
export interface IssueInput {
    readonly columns: readonly AttributeDescriptor[];
    readonly nodes: readonly NodeRecord[];
    readonly edges: readonly EdgeRecord[];
    readonly directed: boolean;
    readonly state: IssueState;
    /** The node location column of place names, and its rows the gazetteer could not place. */
    readonly places?: PlaceRows | null;
}

/** A node column of place names read through the gazetteer: its unmatched and ambiguous rows. */
export interface PlaceRows {
    readonly column: string;
    /** Rows of `nodes` whose name no place matches. */
    readonly unmatched: readonly number[];
    /** Rows of `nodes` whose name several places match. */
    readonly ambiguous: readonly number[];
}

/**
 * The issues of the location column of place names: names nothing matched, and names several
 * places matched. Neither has a fix; the reader edits the names or narrows them.
 * @param input - The records and the place rows.
 * @returns The issues found.
 */
function placeIssues(input: IssueInput): FoundIssue[] {
    const { places, nodes, state } = input;
    if (places === undefined || places === null) {
        return [];
    }

    const ref = Object.freeze({ kind: "node" as const, name: places.column });
    const found: FoundIssue[] = [];
    const add = (code: IssueCode, rows: readonly number[]): void => {
        if (rows.length === 0) {
            return;
        }

        const examples = [...new Set(rows.map((row) => nodes[row]?.[places.column]))].slice(0, EXAMPLES);
        found.push({
            issue: {
                id: `${code}:node:${places.column}`,
                code,
                column: ref,
                count: rows.length,
                params: { examples },
                fixes: [],
            },
            plan: () => ({ steps: [], state, result: { nodes: 0, edges: 0 } }),
        });
    };
    add("location-unmatched", places.unmatched);
    add("location-ambiguous", places.ambiguous);
    return found;
}

/** What a fix does: the commands, the state after, and what it touched. */
interface FixPlan {
    readonly steps: readonly SessionCommand[];
    readonly state: IssueState;
    readonly result: FixResult;
}

/** An issue as found: the public issue and how each of its fixes is carried out. */
export interface FoundIssue {
    readonly issue: Omit<DataIssue, "ignored" | "status" | "fixedBy">;
    readonly plan: (fix: FixCode) => FixPlan;
    /**
     * The records in the graph the issue is on, by kind; absent for an issue on rows the graph
     * never held (a blank id, a refused row).
     */
    readonly affected?: { readonly kind: "node" | "edge"; readonly ids: readonly (NodeId | EdgeId)[] };
}

/** The spellings a yes/no column holds, and the truth value each reads as. */
const YES_NO: ReadonlyMap<string, boolean> = new Map([
    ["yes", true],
    ["no", false],
    ["true", true],
    ["false", false],
]);

type ValueKind = "blank" | "number" | "decimal-comma" | "boolean" | "text" | "other";

/**
 * What kind of value a cell holds, as the column checks read it.
 * @param value - The value.
 * @returns Its kind.
 */
function kindOf(value: unknown): ValueKind {
    if (value === null || value === undefined) {
        return "blank";
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? "number" : "text";
    }

    if (typeof value === "boolean") {
        return "boolean";
    }

    if (typeof value !== "string") {
        return "other";
    }

    const text = value.trim();
    if (text === "") {
        return "blank";
    }

    if (DECIMAL_COMMA.test(text)) {
        return "decimal-comma";
    }

    return Number.isFinite(Number(text)) ? "number" : "text";
}

/**
 * A decimal-comma number read as a number.
 * @param value - `"1.234,5"`.
 * @returns `1234.5`.
 */
function readDecimalComma(value: string): number {
    return Number(value.trim().replaceAll(".", "").replace(",", "."));
}

/**
 * The list a map holds under a key, made when it holds none.
 * @param map - The map.
 * @param key - The key.
 * @returns The list.
 */
function listIn<K, V>(map: Map<K, V[]>, key: K): V[] {
    let list = map.get(key);
    if (list === undefined) {
        list = [];
        map.set(key, list);
    }

    return list;
}

/** One row of a column: the element it is on and its value. */
interface Cell {
    readonly id: NodeId | EdgeId;
    readonly value: unknown;
}

/**
 * A command that writes one value per row.
 * @param kind - Nodes or edges.
 * @param name - The column.
 * @param cells - The rows and their new values.
 * @returns The command.
 */
function writeCells(kind: "node" | "edge", name: string, cells: readonly Cell[]): SessionCommand {
    return {
        op: "data.apply",
        mutation: {
            kind: "update-rows",
            target: kind,
            rows: cells.map(({ id, value }) => ({ id, values: { [name]: value } })),
        },
    };
}

/**
 * Whether a column is the rows' own id or end, which a value fix must not rewrite: every value
 * is the id of its node, or the source or target of its edge.
 * @param kind - Nodes or edges.
 * @param name - The column.
 * @param rows - The records.
 * @returns True for an id or end column.
 */
function isIdColumn(kind: "node" | "edge", name: string, rows: readonly (NodeRecord | EdgeRecord)[]): boolean {
    const same = (pick: (row: NodeRecord | EdgeRecord) => NodeId): boolean =>
        rows.every((row) => {
            const value = row[name];
            return (
                value === undefined ||
                ((typeof value === "string" || typeof value === "number") && String(value) === String(pick(row)))
            );
        });
    if (kind === "node") {
        return same((row) => row.id);
    }

    return same((row) => (row as EdgeRecord).source) || same((row) => (row as EdgeRecord).target);
}

/**
 * The issues of one column.
 * @param column - The column.
 * @param rows - The records of its kind.
 * @param state - The issue state, passed through to the plans.
 * @returns The issues found.
 */
function columnIssues(
    column: AttributeDescriptor,
    rows: readonly (NodeRecord | EdgeRecord)[],
    state: IssueState,
): FoundIssue[] {
    const { kind, name } = column;
    if (isIdColumn(kind, name, rows)) {
        return [];
    }

    const byKind = new Map<ValueKind, Cell[]>();
    const padded: Cell[] = [];
    const spellings = new Map<string, Map<string, Cell[]>>();
    for (const row of rows) {
        const value = row[name];
        const cell = { id: row.id, value };
        const valueKind = kindOf(value);
        listIn(byKind, valueKind).push(cell);
        if (typeof value === "string" && valueKind !== "blank") {
            if (value !== value.trim()) {
                padded.push(cell);
            }

            if (valueKind === "text") {
                const folded = value.trim().toLowerCase();
                const group = spellings.get(folded) ?? new Map<string, Cell[]>();
                listIn(group, value.trim()).push(cell);
                spellings.set(folded, group);
            }
        }
    }

    const count = (valueKind: ValueKind): number => byKind.get(valueKind)?.length ?? 0;
    const cells = (...kinds: ValueKind[]): Cell[] => kinds.flatMap((each) => byKind.get(each) ?? []);
    const ref = Object.freeze({ kind, name });
    const source = column.sources?.length === 1 ? { source: column.sources[0] } : {};
    const found: FoundIssue[] = [];
    const issue = (
        code: IssueCode,
        affected: readonly Cell[],
        params: Record<string, unknown>,
        fix: FixCode | null,
        rewrite: (cell: Cell) => unknown,
    ): void => {
        if (affected.length === 0) {
            return;
        }

        found.push({
            issue: {
                id: `${code}:${kind}:${name}`,
                code,
                column: ref,
                ...source,
                count: affected.length,
                params,
                fixes: fix === null ? [] : [fix],
            },
            affected: { kind, ids: affected.map((cell) => cell.id) },
            plan: () => ({
                steps: [
                    writeCells(
                        kind,
                        name,
                        affected.map((cell) => ({ id: cell.id, value: rewrite(cell) })),
                    ),
                ],
                state,
                result: { nodes: kind === "node" ? affected.length : 0, edges: kind === "edge" ? affected.length : 0 },
            }),
        });
    };
    const examples = (affected: readonly Cell[]): unknown[] =>
        [...new Set(affected.map((cell) => cell.value))].slice(0, EXAMPLES);

    const numeric = count("number") + count("decimal-comma");
    const filled = numeric + count("boolean") + count("text");
    if (numeric > 0 && numeric * 2 >= filled) {
        const decimals = cells("decimal-comma");
        issue("decimal-comma", decimals, { examples: examples(decimals) }, "read-decimal-comma", (cell) =>
            readDecimalComma(String(cell.value)),
        );
        const notNumbers = cells("text", "boolean");
        issue("not-a-number", notNumbers, { examples: examples(notNumbers) }, "make-blank", () => null);
    } else {
        const types = { number: numeric, boolean: count("boolean"), text: count("text") };
        const present = Object.values(types).filter((each) => each > 0);
        if (present.length > 1) {
            const most = Math.max(...present);
            const commonest = (Object.keys(types) as (keyof typeof types)[]).find((key) => types[key] === most);
            const minority = cells(
                ...(["number", "decimal-comma", "boolean", "text"] as const).filter(
                    (each) => (each === "decimal-comma" ? "number" : each) !== commonest,
                ),
            );
            issue("mixed-type", minority, { types }, null, (cell) => cell.value);
        }
    }

    const texts = cells("text");
    const spelled = new Set(texts.map((cell) => String(cell.value).trim().toLowerCase()));
    if (texts.length === filled && spelled.size > 0 && [...spelled].every((each) => YES_NO.has(each))) {
        issue("could-be-yes-no", texts, { values: [...spelled] }, "read-yes-no", (cell) =>
            YES_NO.get(String(cell.value).trim().toLowerCase()),
        );
    }

    issue("padded-space", padded, { examples: examples(padded) }, "trim", (cell) => String(cell.value).trim());

    const variants: Cell[] = [];
    const commonest = new Map<Cell, string>();
    for (const group of spellings.values()) {
        if (group.size > 1) {
            // The commonest spelling wins; a tie goes to the one met first.
            const entries = [...group];
            const [winner] = entries.reduce(
                (best, each) => (each[1].length > best[1].length ? each : best),
                entries[0],
            );
            for (const [spelling, held] of group) {
                if (spelling !== winner) {
                    for (const cell of held) {
                        variants.push(cell);
                        commonest.set(cell, winner);
                    }
                }
            }
        }
    }

    issue("case-variant", variants, { examples: examples(variants) }, "merge-case", (cell) => commonest.get(cell));
    return found;
}

/**
 * The state with every load's facts of one kind rewritten.
 * @param state - The state.
 * @param change - What each load's facts become.
 * @returns The state.
 */
function mapFacts(state: IssueState, change: (facts: LoadFacts) => LoadFacts): IssueState {
    return {
        ...state,
        facts: Object.fromEntries(Object.entries(state.facts).map(([key, facts]) => [key, change(facts)])),
    };
}

/**
 * The load a set of facts came from, when it was one load.
 * @param keys - The loads that gave any.
 * @returns `{ source }`, or nothing.
 */
function oneSource(keys: readonly SourceKey[]): { source?: SourceKey } {
    return keys.length === 1 ? { source: keys[0] } : {};
}

/**
 * Which end of the edges names an unknown node: "source", "target" or "both".
 * @param touching - The edges that name one.
 * @param unknown - The unknown nodes.
 * @returns The end.
 */
function unknownSide(
    touching: readonly { readonly source: NodeId; readonly target: NodeId }[],
    unknown: ReadonlySet<NodeId>,
): "source" | "target" | "both" {
    const atSource = touching.some((edge) => unknown.has(edge.source));
    const atTarget = touching.some((edge) => unknown.has(edge.target));
    if (atSource && atTarget) {
        return "both";
    }
    return atSource ? "source" : "target";
}

/**
 * The issues the loads saw: unknown ends, repeated ids, blank ids and refused rows.
 * @param input - The records and the state.
 * @returns The issues found.
 */
function loadIssues(input: IssueInput): FoundIssue[] {
    const { state, nodes, edges } = input;
    const found: FoundIssue[] = [];
    const loads = Object.entries(state.facts);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const noFix = (): FixPlan => ({ steps: [], state, result: { nodes: 0, edges: 0 } });

    // Unknown ends: a node the load made for an edge, still held and still with nothing but its id.
    const made = (id: NodeId): boolean => {
        const node = byId.get(id);
        return node !== undefined && Object.keys(node).every((key) => key === "id");
    };
    const unknown = new Set<NodeId>();
    const unknownFrom: SourceKey[] = [];
    for (const [key, facts] of loads) {
        const held = facts.unknownEnds.filter(made);
        held.forEach((id) => unknown.add(id));
        if (held.length > 0) {
            unknownFrom.push(key);
        }
    }

    const touching = edges.filter((edge) => unknown.has(edge.source) || unknown.has(edge.target));
    if (touching.length > 0) {
        const ids = [...unknown];
        const ends = unknownSide(touching, unknown);
        const forget = (facts: LoadFacts): LoadFacts => ({
            ...facts,
            unknownEnds: facts.unknownEnds.filter((id) => !unknown.has(id)),
        });
        found.push({
            issue: {
                id: "unknown-end:edge",
                code: "unknown-end",
                ...oneSource(unknownFrom),
                count: touching.length,
                params: { nodes: ids.length, examples: ids.slice(0, EXAMPLES), ends },
                fixes: ["leave-out"],
                current: "add-nodes",
            },
            affected: { kind: "edge", ids: touching.map((edge) => edge.id) },
            plan: (fix) =>
                fix === "add-nodes"
                    ? { steps: [], state: mapFacts(state, forget), result: { nodes: ids.length, edges: 0 } }
                    : {
                          // Removing a node removes the edges that name it.
                          steps: [{ op: "data.apply", mutation: { kind: "remove-nodes", ids } }],
                          state: mapFacts(state, forget),
                          result: { nodes: ids.length, edges: touching.length },
                      },
        });
    }

    // Repeated ids: the rows left out whose node is still held.
    const repeated = loads.flatMap(([key, facts]) =>
        facts.repeatedIds.filter((row) => byId.has(row.id)).map((row) => ({ key, row })),
    );
    if (repeated.length > 0) {
        const ids = [...new Set(repeated.map(({ row }) => row.id))];
        const forget = (facts: LoadFacts): LoadFacts => ({
            ...facts,
            repeatedIds: facts.repeatedIds.filter((row) => !byId.has(row.id)),
        });
        found.push({
            issue: {
                id: "repeated-id:node",
                code: "repeated-id",
                column: undefined,
                ...oneSource([...new Set(repeated.map(({ key }) => key))]),
                count: repeated.length,
                params: { ids },
                fixes: ["merge-rows"],
                current: "keep-first",
            },
            affected: { kind: "node", ids },
            plan: (fix) => ({
                steps:
                    fix === "merge-rows"
                        ? [
                              {
                                  op: "data.apply",
                                  mutation: {
                                      kind: "update-rows",
                                      target: "node",
                                      rows: repeated.map(({ row }) => ({ id: row.id, values: row.record })),
                                  },
                              },
                          ]
                        : [],
                state: mapFacts(state, forget),
                result: { nodes: fix === "merge-rows" ? ids.length : 0, edges: 0 },
            }),
        });
    }

    // Blank ids and refused rows: only facts, which nothing but ignoring settles.
    for (const rowsAre of ["nodes", "edges"] as const) {
        const from = loads.filter(([, facts]) => facts.blankIds[rowsAre] > 0);
        const count = from.reduce((sum, [, facts]) => sum + facts.blankIds[rowsAre], 0);
        if (count > 0) {
            found.push({
                issue: {
                    id: `blank-id:${rowsAre === "nodes" ? "node" : "edge"}`,
                    code: "blank-id",
                    ...oneSource(from.map(([key]) => key)),
                    count,
                    params: {
                        rowsAre,
                        examples: from.flatMap(([, facts]) => facts.blankIds.examples).slice(0, EXAMPLES),
                    },
                    fixes: [],
                },
                plan: noFix,
            });
        }
    }

    const refused = loads.filter(([, facts]) => facts.refusedRows.length > 0);
    const rows = refused.flatMap(([, facts]) => facts.refusedRows);
    if (rows.length > 0) {
        found.push({
            issue: {
                id: "refused-row",
                code: "refused-row",
                ...oneSource(refused.map(([key]) => key)),
                count: rows.length,
                params: { lines: rows.map((row) => row.line), issues: rows.map((row) => row.issue) },
                fixes: [],
            },
            plan: noFix,
        });
    }

    return found;
}

/**
 * The repeated-edge issue: edges after the first between a pair, unless the pair was kept.
 * @param input - The records and the state.
 * @returns The issue, or nothing.
 */
function repeatedEdges(input: IssueInput): FoundIssue[] {
    const { edges, directed, state } = input;
    const kept = new Set(state.kept);
    const seen = new Set<string>();
    const repeats: EdgeRecord[] = [];
    const pairs = new Set<string>();
    for (const edge of edges) {
        const key = pairKey(edge.source, edge.target, directed);
        if (seen.has(key) && !kept.has(key)) {
            repeats.push(edge);
            pairs.add(key);
        }

        seen.add(key);
    }

    if (repeats.length === 0) {
        return [];
    }

    return [
        {
            issue: {
                id: "repeated-edge:edge",
                code: "repeated-edge",
                count: repeats.length,
                params: { pairs: pairs.size },
                fixes: ["merge"],
                current: "keep",
            },
            affected: { kind: "edge", ids: repeats.map((edge) => edge.id) },
            plan: (fix) =>
                fix === "keep"
                    ? {
                          steps: [],
                          state: { ...state, kept: [...state.kept, ...pairs] },
                          result: { nodes: 0, edges: repeats.length },
                      }
                    : {
                          steps: [
                              {
                                  op: "data.apply",
                                  mutation: { kind: "remove-edges", ids: repeats.map((edge) => edge.id) },
                              },
                          ],
                          state,
                          result: { nodes: 0, edges: repeats.length },
                      },
        },
    ];
}

/**
 * Every issue in the data now, ignored ones included, load issues first.
 * @param input - The records, the columns and the state.
 * @returns The issues, each with its plans.
 */
export function findIssues(input: IssueInput): FoundIssue[] {
    const rows = { node: input.nodes, edge: input.edges };
    return [
        ...loadIssues(input),
        ...repeatedEdges(input),
        ...placeIssues(input),
        ...input.columns.flatMap((column) =>
            column.origin === "imported" || column.origin === "joined"
                ? columnIssues(column, rows[column.kind], input.state)
                : [],
        ),
    ];
}

/** `data.issues`: replace the issue state. */
export interface DataIssuesCommand {
    readonly op: "data.issues";
    readonly state: IssueState;
}

/**
 * Whether a value is an issue state, as a project file may hold it.
 * @param value - The value.
 * @returns True when it has the shape.
 */
export function isIssueState(value: unknown): value is IssueState {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const { facts, ignored, kept, fixed } = value as Record<string, unknown>;
    const strings = (list: unknown): boolean => Array.isArray(list) && list.every((each) => typeof each === "string");
    const records =
        fixed === undefined ||
        (Array.isArray(fixed) &&
            fixed.every(
                (each: unknown) =>
                    typeof each === "object" &&
                    each !== null &&
                    typeof (each as FixedIssue).id === "string" &&
                    typeof (each as FixedIssue).fixedBy === "string",
            ));
    return (
        typeof facts === "object" &&
        facts !== null &&
        !Array.isArray(facts) &&
        strings(ignored) &&
        strings(kept) &&
        records
    );
}

const dataIssues: UndoableDefinition<DataIssuesCommand> = {
    op: "data.issues",
    undo: {
        kind: "undoable",
        label: () => "Change the data issues",
        fact: () => ({ code: "data.issues", params: {} }),
    },
    // Which issues are ignored or settled repaints nothing.
    moves: false,
    keys: () => [`graph/v:${ISSUES_VALUE}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        if (!isIssueState(command.state)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "An issue state holds each load's facts, the ignored issues and the kept pairs.",
                source: "data",
                details: { state: command.state },
            });
        }

        const service = serviceOf(ctx.services.data);
        if (service.values === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot write graph values, so it cannot keep data issues.",
                source: "data",
            });
        }

        const { facts, ignored, kept, fixed = [] } = command.state;
        const empty =
            Object.keys(facts).length === 0 && ignored.length === 0 && kept.length === 0 && fixed.length === 0;
        service.values(
            {
                [ISSUES_VALUE]: empty
                    ? undefined
                    : Object.freeze({
                          facts,
                          ignored: [...ignored],
                          kept: [...kept],
                          ...(fixed.length === 0 ? {} : { fixed: [...fixed] }),
                      }),
            },
            ctx.draft,
        );
    },
};

/** The issue ops' definitions. */
export const ISSUE_DEFINITIONS = [dataIssues] as const;
