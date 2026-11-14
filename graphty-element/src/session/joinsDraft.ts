/**
 * @file A join recipe held as a draft: `session.data.prepareJoins()`. An ordered list of joins over
 * the loaded sources and tables the draft holds, run on a copy of the graph so every step's counts,
 * row fates and the resulting graph can be shown before anything changes; `commit()` joins them
 * all as one undoable step. Pure over what the host hands it; `data.ts` commits.
 */

import type { EdgeId, NodeId, SourceKey } from "../catalog/types";
import { GraphtyError, type GraphtyErrorCode } from "../errors";
import {
    columnSamples,
    joinClashes,
    type JoinGraph,
    type JoinPlan,
    joinReport,
    type JoinTable,
    keyMatchesOf,
    planJoin,
    suggestFor,
    suggestJoin,
} from "./join";
import { isSourceFactKey } from "./sources/ids";
import type {
    JoinChoices,
    JoinClash,
    JoinElementFate,
    JoinInput,
    JoinKeyMatch,
    JoinLookup,
    JoinPage,
    JoinPreview,
    JoinPreviewEdge,
    JoinPreviewNode,
    JoinPreviewRow,
    JoinRowFate,
    JoinsDraft,
    JoinStep,
    JoinStepEntry,
    JoinStepOutcome,
    JoinSuggestion,
    JoinSuggestOptions,
} from "./types";

/** One node or edge of the draft's copy of the graph. */
interface DraftNode {
    readonly id: NodeId;
    readonly data: Readonly<Record<string, unknown>>;
}

/** One edge of the draft's copy of the graph. */
interface DraftEdge extends DraftNode {
    readonly id: EdgeId;
    readonly source: NodeId;
    readonly target: NodeId;
}

/** The draft's copy of the graph, by `String(id)`. */
interface DraftGraph {
    readonly nodes: ReadonlyMap<string, DraftNode>;
    readonly edges: ReadonlyMap<string, DraftEdge>;
}

/** What the draft reads from the session. */
export interface JoinsDraftHost {
    /** The graph now: every node and edge with its attributes. */
    graph(): {
        readonly nodes: readonly DraftNode[];
        readonly edges: readonly DraftEdge[];
        /** Whether an edge's ends are ordered; directed when absent. */
        readonly directed?: boolean;
    };
    /** The loads a recipe can read (every load but the joins), with what each supplied. */
    sources(): readonly {
        readonly key: SourceKey;
        readonly name: string;
        readonly nodes: readonly NodeId[];
        readonly edges: readonly EdgeId[];
        /** Read as its edges: it read a table of edges only. */
        readonly asEdges: boolean;
    }[];
    /** A joined table's rows by its load's key, for a `via` naming one. */
    joinedTable(key: SourceKey): JoinTable | undefined;
    /** Joins the steps, in order, as one undoable step. */
    commit(steps: readonly { readonly table: JoinTable; readonly choices: JoinChoices }[]): Promise<void>;
}

/** The recipe at one point of its history. */
interface State {
    readonly steps: readonly JoinStepEntry[];
}

/** What running the recipe found for one step. */
interface StepRun {
    readonly entry: JoinStepEntry;
    readonly outcome: JoinStepOutcome;
    /** The table it read, its split columns not yet split. */
    readonly table?: JoinTable;
    /** The choices with the shape filled in. */
    readonly choices?: JoinChoices;
    readonly before: DraftGraph;
    readonly after: DraftGraph;
    readonly fates: ReadonlyMap<string, JoinElementFate>;
}

/** The prefix a held table's key starts with. */
const HELD = "held:";

/** The default page size of `rows` and `clashes`. */
const PAGE = 100;

/**
 * A refusal of a draft call.
 * @param code - The code.
 * @param message - What is wrong.
 * @param details - The facts.
 * @returns The error.
 */
function refuse(code: GraphtyErrorCode, message: string, details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({ code, source: "data", message, details });
}

/**
 * The draft's copy of a graph.
 * @param graph - The nodes and edges.
 * @param graph.nodes - The nodes.
 * @param graph.edges - The edges.
 * @returns The copy.
 */
function copyOf(graph: { readonly nodes: readonly DraftNode[]; readonly edges: readonly DraftEdge[] }): DraftGraph {
    return {
        nodes: new Map(graph.nodes.map((node) => [String(node.id), node])),
        edges: new Map(graph.edges.map((edge) => [edge.id, edge])),
    };
}

/**
 * A page of a list.
 * @param items - The list.
 * @param page - The page asked for.
 * @param page.offset - The first position.
 * @param page.limit - The most items.
 * @returns The page.
 */
function pageOf<T>(items: readonly T[], page: { readonly offset?: number; readonly limit?: number } = {}): JoinPage<T> {
    const offset = Math.max(0, page.offset ?? 0);
    const limit = Math.max(0, page.limit ?? PAGE);
    return Object.freeze({
        items: Object.freeze(items.slice(offset, offset + limit)),
        offset,
        total: items.length,
    });
}

/**
 * Apply a plan to a copy of the graph, as `data.ts` dispatches it.
 * @param graph - The graph before.
 * @param plan - The plan.
 * @param step - The step's id, which names the edges it adds.
 * @returns The graph after, and what the step did to each element, by `n:<id>` or `e:<id>`.
 */
function applied(
    graph: DraftGraph,
    plan: Exclude<JoinPlan, { kind: "rows" }>,
    step: string,
): { readonly graph: DraftGraph; readonly fates: Map<string, JoinElementFate> } {
    const nodes = new Map(graph.nodes);
    const edges = new Map(graph.edges);
    const fates = new Map<string, JoinElementFate>();
    const changes = (held: Readonly<Record<string, unknown>>, values: Readonly<Record<string, unknown>>): boolean =>
        Object.entries(values).some(([name, value]) => JSON.stringify(held[name]) !== JSON.stringify(value));
    if (plan.kind === "values") {
        const elements = plan.target === "node" ? nodes : edges;
        const prefix = plan.target === "node" ? "n:" : "e:";
        plan.matchedIds.forEach((id) => fates.set(`${prefix}${String(id)}`, "matched"));
        for (const row of plan.rows) {
            const held = elements.get(String(row.id));
            if (held !== undefined) {
                if (changes(held.data, row.values)) {
                    fates.set(`${prefix}${String(row.id)}`, "updated");
                }

                elements.set(String(row.id), { ...held, data: { ...held.data, ...row.values } });
            }
        }

        return { graph: { nodes, edges }, fates };
    }

    for (const row of plan.edgeRows ?? []) {
        const held = edges.get(row.id);
        if (held !== undefined) {
            edges.set(row.id, { ...held, data: { ...held.data, ...row.values } });
            fates.set(`e:${row.id}`, changes(held.data, row.values) ? "updated" : "matched");
        }
    }

    const merged = new Set(plan.matchedIds.map(String));
    for (const { id, ...values } of plan.nodes) {
        const key = String(id);
        const held = nodes.get(key);
        if (held === undefined) {
            nodes.set(key, { id: id as NodeId, data: values });
            fates.set(`n:${key}`, "added");
        } else {
            nodes.set(key, { ...held, data: { ...held.data, ...values } });
            if (merged.has(key)) {
                fates.set(`n:${key}`, "merged");
            } else if (changes(held.data, values)) {
                fates.set(`n:${key}`, "updated");
            }
        }
    }

    plan.edges.forEach((record, at) => {
        const { [plan.source]: source, [plan.target]: target, ...values } = record;
        for (const end of [source, target]) {
            const key = String(end);
            if (nodes.has(key)) {
                if (!fates.has(`n:${key}`)) {
                    fates.set(`n:${key}`, "matched");
                }
            } else {
                nodes.set(key, { id: end as NodeId, data: {} });
                fates.set(`n:${key}`, "added");
            }
        }

        const id = `${step}:${String(at)}`;
        edges.set(id, { id, source: source as NodeId, target: target as NodeId, data: values });
        fates.set(`e:${id}`, "added");
    });
    return { graph: { nodes, edges }, fates };
}

/**
 * Open a join recipe draft over a session's graph.
 * @param host - What it reads from the session, and how it commits.
 * @returns The draft.
 */
export function createJoinsDraft(host: JoinsDraftHost): JoinsDraft {
    const given = host.graph();
    const start = copyOf(given);
    const directed = given.directed ?? true;
    const loads = host.sources();
    const held = new Map<string, JoinTable>();
    let history: State[] = [{ steps: [] }];
    let at = 0;
    let serial = 0;
    let done = false;
    let cached: readonly StepRun[] | null = null;

    const live = (verb: string): void => {
        if (done) {
            throw refuse("E_DISPOSED", `The join draft was committed or discarded, so it cannot ${verb}.`, { verb });
        }
    };
    const state = (): State => history[at];
    const push = (next: State): void => {
        history = [...history.slice(0, at + 1), next];
        at = history.length - 1;
        cached = null;
    };

    /**
     * An input read as a table, as the graph stands.
     * @param key - The input's key.
     * @param graph - The graph.
     * @returns The table, or undefined for a key no input has.
     */
    const tableOf = (key: string, graph: DraftGraph): JoinTable | undefined => {
        const table = held.get(key);
        if (table !== undefined) {
            return table;
        }

        const load = loads.find((each) => each.key === key);
        if (load === undefined) {
            return host.joinedTable(key);
        }

        // A network load's `_source.` bookkeeping is no value of the table: a step never joins on it.
        const own = (data: Readonly<Record<string, unknown>>): Record<string, unknown> =>
            Object.fromEntries(Object.entries(data).filter(([name]) => !isSourceFactKey(name)));
        const rows: Readonly<Record<string, unknown>>[] = load.asEdges
            ? load.edges.flatMap((id) => {
                  const edge = graph.edges.get(id);
                  return edge === undefined
                      ? []
                      : [{ ...own(edge.data), id: edge.id, source: edge.source, target: edge.target }];
              })
            : load.nodes.flatMap((id) => {
                  const node = graph.nodes.get(String(id));
                  return node === undefined ? [] : [{ ...own(node.data), id: node.id }];
              });
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
            (column) => !load.asEdges || column !== "id",
        );
        return { name: load.name, columns, rows };
    };
    const joinGraph = (graph: DraftGraph): JoinGraph => ({
        nodes: [...graph.nodes.values()],
        edges: [...graph.edges.values()].map((edge) => ({
            id: edge.id,
            data: { ...edge.data, source: edge.source, target: edge.target },
        })),
        table: (key) => tableOf(key, graph),
        directed,
    });

    const run = (): readonly StepRun[] => {
        if (cached !== null) {
            return cached;
        }

        const runs: StepRun[] = [];
        let graph = start;
        for (const entry of state().steps) {
            const before = graph;
            const table = tableOf(entry.from, before);
            if (table === undefined) {
                runs.push({
                    entry,
                    outcome: Object.freeze({
                        id: entry.id,
                        error: Object.freeze({
                            code: "E_SOURCE_UNKNOWN",
                            details: Object.freeze({ from: entry.from }),
                        }),
                    }),
                    before,
                    after: before,
                    fates: new Map(),
                });
                continue;
            }

            try {
                const read = joinGraph(before);
                const shape = entry.choices.shape ?? suggestJoin(table, read).shape;
                const choices: JoinChoices = { ...entry.choices, shape };
                const report = joinReport(table, read, choices, shape);
                const { plan } = planJoin(table, read, choices, shape);
                if (plan.kind === "rows") {
                    throw refuse("E_BAD_COMMAND", `Rows read as ${shape} are a load, not a join.`, {
                        reason: "not-a-join",
                        shape,
                    });
                }

                const { graph: after, fates } = applied(before, plan, entry.id);
                graph = after;
                runs.push({
                    entry,
                    outcome: Object.freeze({ id: entry.id, report }),
                    table,
                    choices,
                    before,
                    after,
                    fates,
                });
            } catch (error) {
                if (!(error instanceof GraphtyError)) {
                    throw error;
                }

                runs.push({
                    entry,
                    outcome: Object.freeze({
                        id: entry.id,
                        error: Object.freeze({ code: error.code, details: Object.freeze({ ...error.details }) }),
                    }),
                    table,
                    before,
                    after: before,
                    fates: new Map(),
                });
            }
        }

        cached = runs;
        return runs;
    };
    const stepRun = (id: string): StepRun => {
        const found = run().find((each) => each.entry.id === id);
        if (found === undefined) {
            throw refuse("E_BAD_COMMAND", `The join draft has no step ${JSON.stringify(id)}.`, {
                reason: "unknown-step",
                id,
                known: state().steps.map((each) => each.id),
            });
        }

        return found;
    };
    const checkFrom = (step: JoinStep): void => {
        if (!held.has(step.from) && !loads.some((each) => each.key === step.from)) {
            throw refuse("E_SOURCE_UNKNOWN", `No input of the join draft has key ${JSON.stringify(step.from)}.`, {
                key: step.from,
                known: [...loads.map((each) => each.key), ...held.keys()],
            });
        }
    };
    const indexOf = (id: string): number => {
        const found = state().steps.findIndex((each) => each.id === id);
        if (found === -1) {
            stepRun(id);
        }

        return found;
    };
    const frozenStep = (id: string, step: JoinStep): JoinStepEntry =>
        Object.freeze({
            id,
            from: step.from,
            choices: step.choices,
            ...(step.name === undefined ? {} : { name: step.name }),
        });

    const draft: JoinsDraft = {
        get inputs(): readonly JoinInput[] {
            const now = run().at(-1)?.after ?? start;
            return Object.freeze([
                ...loads.map((load) => {
                    const table = tableOf(load.key, now);
                    return Object.freeze({
                        key: load.key,
                        name: load.name,
                        held: false,
                        columns: Object.freeze([...(table?.columns ?? [])]),
                        rows: table?.rows.length ?? 0,
                    });
                }),
                ...[...held].map(([key, table]) =>
                    Object.freeze({
                        key,
                        name: table.name,
                        held: true,
                        columns: Object.freeze([...table.columns]),
                        rows: table.rows.length,
                    }),
                ),
            ]);
        },
        hold(table: JoinLookup): string {
            live("hold a table");
            const key = `${HELD}${String(held.size + 1)}`;
            const columns = table.columns ?? [...new Set(table.rows.flatMap((row) => Object.keys(row)))];
            held.set(key, Object.freeze({ name: table.name ?? key, columns, rows: table.rows }));
            cached = null;
            return key;
        },
        get steps(): readonly JoinStepEntry[] {
            return state().steps;
        },
        add(step: JoinStep, position?: number): string {
            live("add a step");
            checkFrom(step);
            serial += 1;
            const id = `j${String(serial)}`;
            const steps = [...state().steps];
            steps.splice(position ?? steps.length, 0, frozenStep(id, step));
            push({ steps: Object.freeze(steps) });
            return id;
        },
        change(id: string, step: JoinStep): void {
            live("change a step");
            checkFrom(step);
            const index = indexOf(id);
            const steps = [...state().steps];
            steps[index] = frozenStep(id, step);
            push({ steps: Object.freeze(steps) });
        },
        remove(id: string): void {
            live("remove a step");
            indexOf(id);
            push({ steps: Object.freeze(state().steps.filter((each) => each.id !== id)) });
        },
        move(id: string, to: number): void {
            live("move a step");
            const steps = [...state().steps];
            const [step] = steps.splice(indexOf(id), 1);
            steps.splice(Math.max(0, Math.min(to, steps.length)), 0, step);
            push({ steps: Object.freeze(steps) });
        },
        get canUndo(): boolean {
            return !done && at > 0;
        },
        get canRedo(): boolean {
            return !done && at < history.length - 1;
        },
        undo(): void {
            live("undo");
            if (at > 0) {
                at -= 1;
                cached = null;
            }
        },
        redo(): void {
            live("redo");
            if (at < history.length - 1) {
                at += 1;
                cached = null;
            }
        },
        suggest(from: string, before?: string, options: JoinSuggestOptions = {}): JoinSuggestion {
            live("suggest a join");
            checkFrom({ from, choices: { keys: [] } });
            const graph = before === undefined ? (run().at(-1)?.after ?? start) : stepRun(before).before;
            const table = tableOf(from, graph) ?? { name: from, columns: [], rows: [] };
            return options.shape === undefined
                ? suggestJoin(table, joinGraph(graph))
                : suggestFor(table, joinGraph(graph), options.shape);
        },
        samples(from: string, column: string): readonly unknown[] {
            live("read an input's values");
            checkFrom({ from, choices: { keys: [] } });
            const table = tableOf(from, run().at(-1)?.after ?? start);
            return Object.freeze(table === undefined ? [] : columnSamples(table, column));
        },
        keyMatches(from, column, options = {}): readonly JoinKeyMatch[] {
            live("match a column");
            checkFrom({ from, choices: { keys: [] } });
            const graph =
                options.before === undefined ? (run().at(-1)?.after ?? start) : stepRun(options.before).before;
            const table = tableOf(from, graph);
            if (table === undefined) {
                return Object.freeze([]);
            }

            const read = joinGraph(graph);
            const loose = { ignoreCase: options.ignoreCase === true, ignoreSpaces: options.ignoreSpaces === true };
            return Object.freeze(
                keyMatchesOf(table, column, options.target === "edge" ? read.edges : read.nodes, loose).map((each) =>
                    Object.freeze({ ...each, samples: Object.freeze(each.samples) }),
                ),
            );
        },
        outcome(id: string): JoinStepOutcome {
            live("count a step");
            return stepRun(id).outcome;
        },
        rows(id, page = {}): JoinPage<JoinPreviewRow> {
            live("read a step's rows");
            const found = stepRun(id);
            const { report } = found.outcome;
            const rows = found.table?.rows ?? [];
            // A split edge table reads one row per part: the fates are the split rows'.
            const count = report?.rowFates.length ?? rows.length;
            const all: JoinPreviewRow[] = [];
            for (let index = 0; index < count; index++) {
                const fate: JoinRowFate | undefined = report?.rowFates[index];
                if (page.fate !== undefined && fate !== page.fate) {
                    continue;
                }

                all.push(
                    Object.freeze({
                        index,
                        values: rows[index] ?? {},
                        ...(fate === undefined ? {} : { fate }),
                        matches: report?.rowMatches[index] ?? Object.freeze([]),
                    }),
                );
            }

            return pageOf(all, page);
        },
        clashes(id, column, page = {}): JoinPage<JoinClash> {
            live("read a step's clashes");
            const found = stepRun(id);
            if (found.table === undefined || found.choices === undefined) {
                return pageOf([], page);
            }

            const shape = found.choices.shape ?? "node-values";
            return pageOf(joinClashes(found.table, joinGraph(found.before), found.choices, shape, column), page);
        },
        preview(options = {}): JoinPreview {
            live("preview");
            const runs = run();
            const last = runs.at(-1);
            const chosen = options.step === undefined ? last : stepRun(options.step);
            let graph = start;
            if (chosen !== undefined) {
                graph = options.before === true ? chosen.before : chosen.after;
            }
            const fates = options.before === true || chosen === undefined ? new Map() : chosen.fates;
            const nodes = [...graph.nodes.values()].map((node): JoinPreviewNode => {
                const fate = fates.get(`n:${String(node.id)}`);
                return Object.freeze({ id: node.id, data: node.data, ...(fate === undefined ? {} : { fate }) });
            });
            const edges = [...graph.edges.values()].map((edge): JoinPreviewEdge => {
                const fate = fates.get(`e:${edge.id}`);
                return Object.freeze({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    data: edge.data,
                    ...(fate === undefined ? {} : { fate }),
                });
            });
            return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
        },
        async commit(): Promise<void> {
            live("commit");
            // A step that changes nothing (a key matching no row) is not joined: it would leave an
            // empty source behind.
            const steps = run().flatMap((each) => {
                if (
                    each.table === undefined ||
                    each.choices === undefined ||
                    each.outcome.error !== undefined ||
                    each.fates.size === 0
                ) {
                    return [];
                }

                const { via, ...rest } = each.choices;
                const lookup = via === undefined ? undefined : held.get(via);
                const choices: JoinChoices =
                    lookup === undefined
                        ? each.choices
                        : { ...rest, lookup: { name: lookup.name, columns: lookup.columns, rows: lookup.rows } };
                const name = each.entry.name ?? each.table.name;
                return [{ table: { ...each.table, name }, choices }];
            });
            done = true;
            if (steps.length > 0) {
                await host.commit(steps);
            }
        },
        discard(): void {
            done = true;
            cached = null;
        },
    };
    return draft;
}
