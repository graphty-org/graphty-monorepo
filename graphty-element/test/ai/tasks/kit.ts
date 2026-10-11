/**
 * @file The task-based behavior suite's kit: what a task is, the sessions it runs on, the checks
 * every task gets, and the metrics each run records. A task is a reader's request on real data,
 * graded on the session's state afterwards (read through the public session API), never on what
 * the model said it did. Two drivers run the same tasks: the paid one in the llm-regression project
 * (a real model) and the free replay, which plays each task's reference calls through a scripted
 * engine, so a wrong check is found without spending anything.
 */

// Registers every algorithm class the element ships, so the executor below can build them.
import "../../../src/algorithms";

import { appendFileSync } from "node:fs";

import { assert } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { SavedMessage } from "../../../src/ai/engine/types";
import { algorithmByKey } from "../../../src/catalog/algorithms";
import { AlgorithmManager } from "../../../src/managers/AlgorithmManager";
import { digest } from "../../helpers/assistant";

/** What a task needs, as the design's tiers name it. */
export type Tier = "core" | "catalog" | "search" | "multi-step";

/** A tool call: a tool and its arguments. */
export interface Call {
    readonly tool: string;
    readonly args?: Record<string, unknown>;
    /**
     * Arguments that depend on what the session holds when the message is sent (a layer or note
     * id a model would read from a list result first). Reference calls only.
     */
    readonly resolve?: (s: GraphSession) => Record<string, unknown>;
}

/** The graph-samples datasets the tasks run on. */
export type DatasetName =
    | "karate"
    | "florentine-families"
    | "davis-southern-women"
    | "les-miserables"
    | "football"
    | "dolphins"
    | "contiguous-usa"
    | "knuth-miles"
    | "celegans-neural"
    | "political-blogs"
    | "political-books"
    | "openflights"
    | "yeast-perturbation"
    | "stelzl-interactome"
    | "wikipathways-senescence-autophagy"
    | "go-slim-generic";

/** Records a session takes. */
export interface GraphRecords {
    readonly nodes: readonly Record<string, unknown>[];
    readonly edges: readonly Record<string, unknown>[];
    readonly directed?: boolean;
}

/** One tool result as the model read it. */
export interface ToolResultRecord {
    /** The tool. */
    readonly tool: string;
    /** How the call ended: AI_COMPLETED when it succeeded. */
    readonly outcome: string;
    /** What the model read: `{ code, params, data?, page? }`. */
    readonly body: { code?: string; params?: Record<string, unknown>; data?: unknown; page?: Record<string, unknown> };
}

/** What one message did, as a driver reports it. */
export interface MessageRecord {
    readonly prompt: string;
    readonly calls: readonly Call[];
    readonly results: readonly ToolResultRecord[];
    /** The model's final text. */
    readonly text: string;
    /** The message's result code. */
    readonly code: string;
    readonly inputTokens: number;
    readonly outputTokens: number;
    /** Model turns the message took. */
    readonly turns: number;
}

/** Sends one reader message, with the reference calls a scripted driver plays for it. */
export type Driver = (prompt: string, reference: readonly (readonly Call[])[]) => Promise<MessageRecord>;

/** What a task's check is handed. */
export interface TaskContext {
    /** The session the assistant worked on. */
    readonly s: GraphSession;
    /** Every message, in order. */
    readonly messages: readonly MessageRecord[];
    /** A fresh session on the same data, for expected values. */
    oracle(): Promise<GraphSession>;
}

/** One task. */
export interface AssistantTask {
    /** A stable id, in kebab case. */
    readonly id: string;
    /** The workflows (W01-W25) and use cases it is drawn from. */
    readonly source: readonly string[];
    readonly tier: readonly Tier[];
    readonly dataset: DatasetName | GraphRecords;
    /** The reader's messages, in order. */
    readonly prompts: readonly string[];
    /**
     * How each message moves the history: 1 a change (one step), 0 a question or a camera or
     * selection change (no step), -1 an undo, null either 0 or 1 (a question a model may answer by
     * running an algorithm). Default 1 for every message.
     */
    readonly effects?: readonly (1 | 0 | -1 | null)[];
    /** The tools a right answer uses besides catalog and query; any other call counts as a wrong tool. */
    readonly tools: readonly string[];
    /** What the session holds before the first message, done through the API, not the model. */
    readonly prepare?: (s: GraphSession) => Promise<void>;
    /** Per message, the calls of each model turn a right answer makes: the free replay plays them. */
    readonly reference: readonly (readonly (readonly Call[])[])[];
    /** The end state, read through the session API. Throws when it is wrong. */
    readonly check: (context: TaskContext) => void | Promise<void>;
}

/**
 * Declare a task.
 * @param task - The task.
 * @returns It.
 */
export function defineTask(task: AssistantTask): AssistantTask {
    return task;
}

/** The most records any tool result may carry (the tools' page cap). */
const PAGE_CAP = 50;

/**
 * A graph-samples dataset as records: ids where the dataset names its nodes (else the row index),
 * every node column, and the edge weights.
 * @param name - The dataset.
 * @returns Its records.
 */
export async function datasetRecords(name: DatasetName): Promise<GraphRecords> {
    const module = (await import(`@graphty/graph-samples/datasets/${name}`)) as Record<string, unknown>;
    const load = Object.values(module).find((value) => typeof value === "function") as () => {
        directed: boolean;
        nodeCount: number;
        src: Uint32Array;
        dst: Uint32Array;
        weights?: Float32Array;
        ids?: readonly string[];
        nodeColumns?: Record<string, unknown>;
    };
    const graph = load();
    const nodes: Record<string, unknown>[] = [];
    for (let index = 0; index < graph.nodeCount; index++) {
        const record: Record<string, unknown> = { id: graph.ids?.[index] ?? String(index) };
        for (const [column, input] of Object.entries(graph.nodeColumns ?? {})) {
            const values = ((input as { data?: ArrayLike<unknown> }).data ?? input) as ArrayLike<unknown>;
            const value = values[index];
            // A missing value is absent from the record, as an importer leaves it.
            if (value !== null && value !== undefined && value !== "" && !Number.isNaN(value)) {
                record[column] = value;
            }
        }

        nodes.push(record);
    }

    const edges = Array.from(graph.src, (source, edge) => ({
        source: nodes[source].id,
        target: nodes[graph.dst[edge]].id,
        ...(graph.weights === undefined ? {} : { weight: graph.weights[edge] }),
    }));
    return { nodes, edges, directed: graph.directed };
}

/**
 * A session holding a task's data that runs the element's own algorithms. A standalone session
 * cannot run them (every algorithm is built from the renderer's Graph), so this hands the element's
 * AlgorithmManager the few members of a Graph it reads: the session, its snapshot store, and an
 * accelerator that is never attached.
 * @param dataset - A dataset name or records.
 * @returns The session, loaded.
 */
export async function taskSession(dataset: DatasetName | GraphRecords): Promise<GraphSession> {
    const records = typeof dataset === "string" ? await datasetRecords(dataset) : dataset;
    const holder: { session?: GraphSession } = {};
    // ponytail: reads the session's private store, the one the renderer's data manager would hand
    // the algorithms; replace with a public headless executor if graphty-element grows one.
    const store = (): { getSnapshot(): unknown; undirected(snapshot: unknown): unknown } =>
        (holder.session!.data as unknown as { graphStore: { getSnapshot(): unknown; undirected(s: unknown): unknown } })
            .graphStore;
    const graph = {
        getSession: () => holder.session,
        getDataManager: () => ({
            getSnapshot: () => store().getSnapshot(),
            undirected: (snapshot: unknown) => store().undirected(snapshot),
        }),
        acceleration: {
            policy: "auto",
            run: () => Promise.resolve({ accelerated: false, reason: "no accelerator" }),
        },
    };
    const manager = new AlgorithmManager({} as never, graph as never);
    const session = createGraphSession({
        ...(records.directed === undefined ? {} : { config: { data: { directed: records.directed } } }),
        runs: { execute: (context) => manager.execute(context, algorithmByKey(context.algorithm)) },
    });
    holder.session = session;
    await session.data.addNodes(records.nodes);
    await session.data.addEdges(records.edges);
    return session;
}

/**
 * Every tool result in a conversation, with the tool that made it, in order.
 * @param messages - The conversation as the last model request carried it.
 * @returns The results.
 */
export function resultsOf(messages: readonly SavedMessage[]): ToolResultRecord[] {
    const tools = new Map<string, string>();
    const out: ToolResultRecord[] = [];
    for (const part of messages.flatMap((message) => message.parts)) {
        if (part.type === "tool-call") {
            tools.set(part.callId, part.command);
        } else if (part.type === "tool-result") {
            let body: ToolResultRecord["body"];
            try {
                body = JSON.parse(part.content) as ToolResultRecord["body"];
            } catch {
                body = { code: "UNPARSABLE" };
            }

            out.push({ tool: tools.get(part.callId) ?? "?", outcome: part.code, body });
        }
    }

    return out;
}

/** One task's numbers. */
export interface TaskMetrics {
    readonly task: string;
    readonly tier: readonly Tier[];
    readonly success: boolean;
    readonly failure?: string;
    readonly toolCalls: number;
    readonly turns: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
    /** Calls to a tool the task's right answer does not use. */
    readonly wrongTools: number;
    /** Calls whose result was a refusal or a failure. */
    readonly refusedCalls: number;
    readonly calls: readonly string[];
    readonly refusals: readonly string[];
    readonly ms: number;
}

/** The tools any task may call without counting as a wrong choice: looking things up. */
const LOOKUP_TOOLS = new Set(["catalog", "query"]);

/**
 * The value a call's `action` names, or "".
 * @param call - The call.
 * @returns The action.
 */
function actionOf(call: Call): string {
    return typeof call.args?.action === "string" ? call.args.action : "";
}

/**
 * Run one task through a driver: prepare the session, send each message, then the task's own
 * check and the checks every task gets. Never throws; the metrics say whether it passed and why not.
 * @param task - The task.
 * @param driver - Sends a message.
 * @param session - The session the driver's assistant works on, built by {@link taskSession}.
 * @returns The task's metrics.
 */
export async function runTask(task: AssistantTask, driver: Driver, session: GraphSession): Promise<TaskMetrics> {
    const start = Date.now();
    const messages: MessageRecord[] = [];
    let failure: string | undefined;
    try {
        await task.prepare?.(session);
        let before = "";
        let lastEffect: 1 | 0 | -1 = 0;
        for (const [index, prompt] of task.prompts.entries()) {
            const effect = task.effects === undefined || index >= task.effects.length ? 1 : task.effects[index];
            before = await digest(session);
            const { position } = session.history;
            const message = await driver(prompt, task.reference[index] ?? []);
            messages.push(message);
            const moved = session.history.position - position;
            const allowed = effect === null ? [0, 1] : [effect];
            assert.include(
                allowed,
                moved,
                `message ${String(index + 1)} ("${prompt}") moved the history by ${String(moved)} steps, not ${allowed.join(" or ")}`,
            );
            lastEffect = moved === 1 ? 1 : 0;
        }

        await task.check({ s: session, messages, oracle: () => taskSession(task.dataset) });
        assertCompactResults(messages);
        if (lastEffect === 1) {
            // One undo takes the last message back whole.
            await session.undo();
            assert.strictEqual(
                await digest(session),
                before,
                "one undo did not restore the state before the last message",
            );
        }
    } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
    }

    const calls = messages.flatMap((message) => message.calls);
    const results = messages.flatMap((message) => message.results);
    const allowed = new Set([...task.tools, ...LOOKUP_TOOLS]);
    return {
        task: task.id,
        tier: task.tier,
        success: failure === undefined,
        ...(failure === undefined ? {} : { failure }),
        toolCalls: calls.length,
        turns: messages.reduce((sum, message) => sum + message.turns, 0),
        inputTokens: messages.reduce((sum, message) => sum + message.inputTokens, 0),
        outputTokens: messages.reduce((sum, message) => sum + message.outputTokens, 0),
        wrongTools: calls.filter((call) => !allowed.has(call.tool)).length,
        refusedCalls: results.filter((result) => result.outcome !== "AI_COMPLETED").length,
        calls: calls.map((call) => (actionOf(call) === "" ? call.tool : `${call.tool}.${actionOf(call)}`)),
        refusals: results
            .filter((result) => result.outcome !== "AI_COMPLETED")
            .map((result) => `${result.tool}:${result.body.code ?? result.outcome}`),
        ms: Date.now() - start,
    };
}

/**
 * Every result is compact: no more than a page of records, and every failure is `{ code, params }`.
 * @param messages - The messages.
 */
function assertCompactResults(messages: readonly MessageRecord[]): void {
    for (const result of messages.flatMap((message) => message.results)) {
        const { data, page } = result.body;
        if (Array.isArray(data)) {
            assert.isAtMost(data.length, PAGE_CAP, `${result.tool} returned ${String(data.length)} records`);
        }

        if (page !== undefined) {
            assert.isAtMost(Number(page.returned), PAGE_CAP, `${result.tool} returned a page past the cap`);
        }

        if (result.outcome !== "AI_COMPLETED") {
            assert.isString(result.body.code, `a refused ${result.tool} call carries no code`);
        }
    }
}

/**
 * Append a task's metrics to the JSONL file `LLM_REGRESSION_TASK_METRICS` names; off when unset.
 * @param metrics - The metrics.
 * @param provider - Which provider and profile ran it.
 */
export function recordMetrics(metrics: TaskMetrics, provider: string): void {
    const path = process.env.LLM_REGRESSION_TASK_METRICS;
    if (path !== undefined && path !== "") {
        appendFileSync(path, `${JSON.stringify({ provider, ...metrics })}\n`);
    }
}

/**
 * A summary table of a run's tasks, per tier and overall.
 * @param all - Every task's metrics.
 * @returns The table, as lines.
 */
export function summarize(all: readonly TaskMetrics[]): string[] {
    const line = (label: string, rows: readonly TaskMetrics[]): string => {
        const passed = rows.filter((row) => row.success).length;
        const sum = (pick: (row: TaskMetrics) => number): number => rows.reduce((total, row) => total + pick(row), 0);
        return `${label.padEnd(12)} ${String(passed).padStart(3)}/${String(rows.length).padEnd(3)} calls ${String(sum((row) => row.toolCalls)).padStart(4)}  wrong-tool ${String(sum((row) => row.wrongTools)).padStart(3)}  refused ${String(sum((row) => row.refusedCalls)).padStart(3)}  tokens in ${String(sum((row) => row.inputTokens))} out ${String(sum((row) => row.outputTokens))}`;
    };
    const tiers: Tier[] = ["core", "catalog", "search", "multi-step"];
    return [
        line("all", all),
        ...tiers.map((tier) =>
            line(
                tier,
                all.filter((row) => row.tier.includes(tier)),
            ),
        ),
        ...all.filter((row) => !row.success).map((row) => `FAILED ${row.task}: ${row.failure ?? ""}`),
    ];
}

// ---------------------------------------------------------------------------------------------
// Helpers the checks share.
// ---------------------------------------------------------------------------------------------

/**
 * The newest run of one of the algorithms, asserting there is one that succeeded.
 * @param s - The session.
 * @param algorithms - Acceptable algorithm keys.
 * @returns The run.
 */
export function runOf(
    s: GraphSession,
    ...algorithms: readonly string[]
): ReturnType<GraphSession["runs"]["list"]>[number] {
    const run = [...s.runs.list()].reverse().find((each) => algorithms.includes(each.algorithm));
    assert.isDefined(
        run,
        `no ${algorithms.join(" or ")} run; runs: ${
            s.runs
                .list()
                .map((each) => `${each.algorithm}(${each.status})`)
                .join(", ") || "none"
        }`,
    );
    assert.strictEqual(run.status, "succeeded", `the ${run.algorithm} run ${run.status}`);
    return run;
}

/**
 * A run's node values for one field, by node id.
 * @param s - The session.
 * @param runId - The run.
 * @param field - The field.
 * @returns The values.
 */
export function nodeValues(s: GraphSession, runId: string, field: string): Map<string, unknown> {
    const result = s.runs.get(runId)?.result;
    const out = new Map<string, unknown>();
    for (const node of s.data.nodes()) {
        const id = String((node as unknown as { id: unknown }).id);
        out.set(id, result?.node(id)?.[field]);
    }

    return out;
}

/**
 * The ids of the nodes with the k highest values of a field (ties at the boundary all kept).
 * @param values - Values by id.
 * @param k - How many.
 * @returns The ids.
 */
export function topIds(values: ReadonlyMap<string, unknown>, k: number): Set<string> {
    const sorted = [...values].filter((entry): entry is [string, number] => typeof entry[1] === "number");
    sorted.sort((a, b) => b[1] - a[1]);
    const floor = sorted[k - 1]?.[1] ?? -Infinity;
    return new Set(sorted.filter(([, value]) => value >= floor).map(([id]) => id));
}

/**
 * The node ids a set holds now.
 * @param s - The session.
 * @param name - The set's name.
 * @returns The ids.
 */
export async function setMembers(s: GraphSession, name: string): Promise<string[]> {
    const set = s.sets.list().find((each) => each.name === name);
    assert.isDefined(
        set,
        `no set named "${name}"; sets: ${
            s.sets
                .list()
                .map((each) => each.name)
                .join(", ") || "none"
        }`,
    );
    const resolved = await s.scope.resolve({ set: set.id });
    return [...(resolved as unknown as { nodes: Iterable<unknown> }).nodes].map(String);
}

/**
 * The node ids a selector matches.
 * @param s - The session.
 * @param where - The selector.
 * @returns The ids.
 */
export async function matching(s: GraphSession, where: string): Promise<string[]> {
    const resolved = await s.scope.resolve({ where });
    return [...(resolved as unknown as { nodes: Iterable<unknown> }).nodes].map(String);
}

/**
 * The value a style channel resolves to on a node.
 * @param s - The session.
 * @param node - The node.
 * @param channel - The channel, such as node.color.
 * @returns The value, or undefined.
 */
export function styleOf(s: GraphSession, node: string, channel: string): unknown {
    const merged = s.styles.explain({ node }).merged as unknown as Record<string, unknown>;
    if (channel in merged) {
        return merged[channel];
    }

    // A nested form: { node: { color } }.
    const [head, tail] = channel.split(".");
    return (merged[head] as Record<string, unknown> | undefined)?.[tail];
}

/**
 * The layers the assistant added.
 * @param s - The session.
 * @returns The layers, bottom first.
 */
export function assistantLayers(s: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
    return s.styles.list().filter((layer) => layer.source.by === "plugin" && layer.source.name === "graphty-ai");
}

/**
 * Whether a value was read out by the assistant: it appears in its final answer or in a tool result.
 * @param messages - The messages (the last one is read).
 * @param values - Values any one of which will do (numbers are matched to 2 decimals as well).
 * @returns True when one appears.
 */
export function answered(messages: readonly MessageRecord[], ...values: readonly (string | number)[]): boolean {
    const last = messages.at(-1);
    if (last === undefined) {
        return false;
    }

    const haystack =
        `${last.text}\n${last.results.map((result) => JSON.stringify(result.body)).join("\n")}`.toLowerCase();
    return values.some((value) => {
        if (typeof value === "number") {
            const forms = new Set([
                String(value),
                value.toFixed(2),
                value.toFixed(3),
                String(Math.round(value * 1e6) / 1e6),
            ]);
            return [...forms].some((form) => haystack.includes(form));
        }

        return haystack.includes(value.toLowerCase());
    });
}

/**
 * Assert a question was answered with a value.
 * @param messages - The messages.
 * @param what - What the value is, for the failure message.
 * @param values - Acceptable values.
 */
export function assertAnswered(
    messages: readonly MessageRecord[],
    what: string,
    ...values: readonly (string | number)[]
): void {
    assert.isTrue(
        answered(messages, ...values),
        `the answer does not give ${what} (${values.join(" or ")}); it said: ${messages.at(-1)?.text.slice(0, 300) ?? ""}`,
    );
}

/**
 * The same members, in any order.
 * @param actual - What is there.
 * @param expected - What should be.
 * @param what - What it is, for the message.
 */
export function assertSameMembers(actual: Iterable<unknown>, expected: Iterable<unknown>, what: string): void {
    const have = [...new Set([...actual].map(String))].sort();
    const want = [...new Set([...expected].map(String))].sort();
    assert.deepEqual(have, want, what);
}

/**
 * Node ids within some hops of a node.
 * @param s - The session.
 * @param node - The node.
 * @param hops - How far.
 * @returns The ids, the node included.
 */
export function neighborhood(s: GraphSession, node: string, hops: number): Set<string> {
    // One pass over the edges, not one per frontier node: on political-blogs a two-hop frontier
    // rescanned its 19,000 edges hundreds of times.
    const adjacent = new Map<string, string[]>();
    for (const edge of s.data.edges()) {
        const { source, target } = edge as unknown as { source: unknown; target: unknown };
        const [a, b] = [String(source), String(target)];
        for (const [from, to] of [
            [a, b],
            [b, a],
        ]) {
            const list = adjacent.get(from) ?? [];
            list.push(to);
            adjacent.set(from, list);
        }
    }

    const seen = new Set([node]);
    let frontier = [node];
    for (let hop = 0; hop < hops; hop++) {
        const next: string[] = [];
        for (const id of frontier) {
            for (const neighbor of adjacent.get(id) ?? []) {
                if (!seen.has(neighbor)) {
                    seen.add(neighbor);
                    next.push(neighbor);
                }
            }
        }

        frontier = next;
    }

    return seen;
}

/**
 * A node's neighbors, either direction.
 * @param s - The session.
 * @param node - The node.
 * @returns Their ids.
 */
export function neighborIds(s: GraphSession, node: string): string[] {
    const out = new Set<string>();
    for (const edge of s.data.edges()) {
        const { source, target } = edge as unknown as { source: unknown; target: unknown };
        if (String(source) === node) {
            out.add(String(target));
        } else if (String(target) === node) {
            out.add(String(source));
        }
    }

    return [...out];
}

/**
 * Every node's degree, either direction, by id.
 * @param s - The session.
 * @returns The degrees.
 */
export function degrees(s: GraphSession): Map<string, number> {
    const out = new Map<string, number>();
    for (const node of s.data.nodes()) {
        out.set(String((node as unknown as { id: unknown }).id), 0);
    }

    for (const edge of s.data.edges()) {
        const { source, target } = edge as unknown as { source: unknown; target: unknown };
        out.set(String(source), (out.get(String(source)) ?? 0) + 1);
        out.set(String(target), (out.get(String(target)) ?? 0) + 1);
    }

    return out;
}
