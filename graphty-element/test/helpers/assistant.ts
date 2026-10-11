/**
 * @file A real session with the assistant's generated tools, driven by the scripted engine: what
 * the tool contract tests, the coverage test and the replay of reference calls run on. Algorithms
 * run on a stand-in executor, since every algorithm the element ships is built from the renderer:
 * it publishes a node's degree for a metric, a two-way split for a community, and the descriptor's
 * own fields, so a run, its summary, its encoding and its result selectors behave as the real ones do.
 */

import { createGraphSession, type GraphSession } from "../../session";
import { AiController, type ExecutionResult } from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandContext } from "../../src/ai/commands/types";
import { FakeEngine, type FakeTurn } from "../../src/ai/engine/FakeEngine";
import { ENGINE_OVERRIDE } from "../../src/ai/engine/load";
import type { TurnEvent, TurnRequest } from "../../src/ai/engine/types";
import { installAssistantTools } from "../../src/ai/tools/install";
import type { AssistantGateLimits } from "../../src/ai/tools/types";
import { algorithmByKey } from "../../src/catalog/algorithms";
import type { AiEvent } from "../../src/events";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/** A node record. */
type Row = Record<string, unknown>;

/** The small graph most cases run on: two teams of servers and clients. */
export const SMALL_GRAPH: { nodes: Row[]; edges: Row[] } = {
    nodes: [
        { id: "a", label: "Alpha", type: "server", team: "red", load: 0.9 },
        { id: "b", label: "Bravo", type: "client", team: "red", load: 0.2 },
        { id: "c", label: "Charlie", type: "server", team: "blue", load: 0.7 },
        { id: "d", label: "Delta", type: "client", team: "blue", load: 0.1 },
        { id: "e", label: "Echo", type: "client", team: "blue", load: 0.4 },
    ],
    edges: [
        { source: "a", target: "b", weight: 0.9 },
        { source: "a", target: "c", weight: 0.5 },
        { source: "c", target: "d", weight: 0.2 },
        { source: "c", target: "e", weight: 0.8 },
        { source: "d", target: "e", weight: 0.3 },
    ],
};

/**
 * A stand-in algorithm executor: a degree per node for every algorithm, a two-way split for a
 * community, and a route from the first node to the last for a path.
 * @param session - Reads the session it runs for.
 * @returns The executor.
 */
function standInExecutor(session: () => GraphSession): (context: RunExecutionContext) => Promise<RunOutcome> {
    return async (context) => {
        await Promise.resolve();
        context.signal.throwIfAborted();
        const snapshot = session().data.snapshot();
        const degrees = snapshot.degree();
        const descriptor = algorithmByKey(context.algorithm);
        const shape = descriptor?.shape ?? "node-metric";
        const nodes: { id: unknown; values: Record<string, unknown> }[] = [];
        for (let index = 0; index < snapshot.nodeCount; index++) {
            let values: Record<string, unknown> = { value: degrees[index] };
            if (shape === "community") {
                values = { group: index % 2 };
            } else if (shape === "path") {
                values = { onPath: index === 0 || index === snapshot.nodeCount - 1, order: index };
            }

            nodes.push({ id: snapshot.ids.idOf(index), values });
        }

        const fields = (
            descriptor?.fields ?? [
                {
                    name: "value",
                    plainName: "Value",
                    technicalName: "value",
                    kind: "node",
                    type: "number",
                    path: "results.$.value",
                },
            ]
        )
            .filter((field) => field.kind === "node" && field.name in (nodes[0]?.values ?? {}))
            .map((field) => ({ ...field, path: field.path.replace("$", context.runId) }));
        return {
            result: createRunResult({
                runId: context.runId,
                shape,
                fields,
                measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                graph: {},
                nodes,
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: context.algorithm,
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
            } as Parameters<typeof createRunResult>[0]),
        };
    };
}

/** A session holding the small graph, with the stand-in executor. */
export async function assistantSession(data: { nodes: Row[]; edges: Row[] } = SMALL_GRAPH): Promise<GraphSession> {
    const holder: { session?: GraphSession } = {};
    const session = createGraphSession({ runs: { execute: standInExecutor(() => holder.session!) } });
    holder.session = session;
    await session.data.addNodes(data.nodes);
    await session.data.addEdges(data.edges);
    return session;
}

/** What one assistant message did. */
export interface MessageRun {
    readonly result: ExecutionResult;
    readonly events: AiEvent[];
    readonly engine: FakeEngine;
}

/** An assistant over a session, with the generated tools and a scripted engine. */
export class ScriptedAssistant {
    readonly registry = new CommandRegistry();
    readonly events: AiEvent[] = [];
    readonly engine = new FakeEngine();
    readonly controller: AiController;

    /**
     * An assistant.
     * @param session - The session.
     * @param options - The gate and the profile.
     * @param options.gate - The gate's limits, or false.
     * @param options.toolProfile - The profile.
     * @param options.graph - A graph to stand behind the session (a renderer stub).
     */
    constructor(
        readonly session: GraphSession,
        options: {
            gate?: Partial<AssistantGateLimits> | false;
            toolProfile?: "standard" | "small";
            graph?: object;
        } = {},
    ) {
        installAssistantTools(this.registry, session);
        const graph = { getSession: () => session, ...options.graph } as unknown as CommandContext["graph"];
        this.controller = new AiController({
            provider: { name: "scripted" } as never,
            commandRegistry: this.registry,
            graph,
            emitEvent: (event: AiEvent) => this.events.push(event),
            ...(options.gate === undefined ? {} : { gate: options.gate }),
            ...(options.toolProfile === undefined ? {} : { toolProfile: options.toolProfile }),
            [ENGINE_OVERRIDE]: this.engine,
        } as never);
    }

    /**
     * Send one message whose model makes the given calls, one batch per turn, then answers.
     * @param text - The reader's message.
     * @param batches - Each turn's calls.
     * @returns What the message did.
     */
    async say(text: string, ...batches: { tool: string; args?: Record<string, unknown> }[][]): Promise<MessageRun> {
        const start = this.events.length;
        const turns: FakeTurn[] = batches.map((calls, turn) => callsTurn(calls, turn));
        this.engine.push(...turns, textTurn("done"));
        const result = await this.controller.execute(text);
        return { result, events: this.events.slice(start), engine: this.engine };
    }

    /**
     * What the model read for each call of the last message, parsed.
     * @returns The results, in order.
     */
    lastResults(): { code: string; params: Record<string, unknown>; data?: unknown; page?: Record<string, unknown> }[] {
        const request = this.engine.requests.at(-1)!;
        return request.messages
            .flatMap((message) => message.parts)
            .flatMap((part) => (part.type === "tool-result" ? [JSON.parse(part.content) as never] : []));
    }

    /**
     * The tools a turn offered, by name.
     * @param request - The turn.
     * @returns The names.
     */
    static offered(request: TurnRequest): string[] {
        return request.tools.map((tool) => tool.name);
    }
}

/**
 * A turn that makes calls.
 * @param calls - The calls.
 * @param turn - Which turn, for unique ids.
 * @returns The turn's events.
 */
export function callsTurn(calls: { tool: string; args?: Record<string, unknown> }[], turn = 0): TurnEvent[] {
    return [
        ...calls.map((call, index): TurnEvent => ({
            type: "tool-call",
            id: `t${String(turn)}-${String(index)}`,
            name: call.tool,
            arguments: call.args ?? {},
        })),
        { type: "finish", reason: "tool-calls" },
    ];
}

/**
 * A turn that answers in text.
 * @param text - The answer.
 * @returns The turn's events.
 */
export function textTurn(text: string): TurnEvent[] {
    return [
        { type: "text", delta: text },
        { type: "finish", reason: "stop" },
    ];
}

/**
 * A digest of what a project saves, for "nothing changed" checks: the save without the camera and
 * the selection, plus the runs.
 * @param session - The session.
 * @returns The digest.
 */
export async function digest(session: GraphSession): Promise<string> {
    const saved = JSON.parse((await session.project.save()).text) as { members?: Record<string, unknown>[] };
    // The selection is not part of the project: an undo selects what it changed.
    for (const member of saved.members ?? []) {
        delete member.selection;
    }

    return JSON.stringify([saved, session.runs.list().map((run) => [run.id, run.status])]);
}
