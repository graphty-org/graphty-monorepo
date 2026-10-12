/**
 * @file The scripted engines and the assistant harness the helper and plan tests drive: every case
 * runs on `FakeEngine` and on `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { assert } from "vitest";

import type { GraphSession } from "../../../session";
import { AiController, type AiControllerOptions } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { type ConversationStore, STORE_OVERRIDE } from "../../../src/ai/conversation/Conversation";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { LlmProviderEngine } from "../../../src/ai/engine/LlmProviderEngine";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import type { AiEngine, TurnEvent, TurnRequest } from "../../../src/ai/engine/types";
import { installAssistantTools } from "../../../src/ai/tools/install";
import type { AiEvent } from "../../../src/events";
import { QueuedProvider } from "../../helpers/queued-provider";

/** One scripted model turn. */
export interface Turn {
    readonly text?: string;
    readonly calls?: readonly { readonly tool: string; readonly args: Record<string, unknown> }[];
    readonly usage?: { readonly input: number; readonly output: number };
}

/** An engine the cases script, and the requests it was sent. */
export interface Driver {
    readonly engine: AiEngine;
    readonly requests: TurnRequest[];
    push(...turns: Turn[]): void;
}

let callIds = 0;

/**
 * A turn's calls with unique ids.
 * @param turn - The turn.
 * @returns Its calls.
 */
function withIds(turn: Turn): { id: string; name: string; arguments: Record<string, unknown> }[] {
    return (turn.calls ?? []).map((call) => ({ id: `c${String(++callIds)}`, name: call.tool, arguments: call.args }));
}

/**
 * The scripted engine.
 * @returns Its driver.
 */
export function fakeDriver(): Driver {
    const engine = new FakeEngine();
    return {
        engine,
        requests: engine.requests,
        push: (...turns) => {
            engine.push(
                ...turns.map((turn): TurnEvent[] => [
                    ...(turn.text === undefined ? [] : [{ type: "text" as const, delta: turn.text }]),
                    ...withIds(turn).map((call): TurnEvent => ({ type: "tool-call", ...call })),
                    ...(turn.usage === undefined
                        ? []
                        : [{ type: "usage" as const, inputTokens: turn.usage.input, outputTokens: turn.usage.output }]),
                    { type: "finish", reason: turn.calls === undefined ? "stop" : "tool-calls" },
                ]),
            );
        },
    };
}

/** `LlmProviderEngine`, recording each turn's request. */
class RecordingEngine extends LlmProviderEngine {
    readonly requests: TurnRequest[] = [];

    override async *turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent> {
        this.requests.push(request);
        yield* super.turn(request, signal);
    }
}

/**
 * `LlmProviderEngine` over a mock provider.
 * @returns Its driver.
 */
export function mockDriver(): Driver {
    const provider = new QueuedProvider();
    const engine = new RecordingEngine(provider);
    return {
        engine,
        requests: engine.requests,
        push: (...turns) => {
            provider.queue.push(
                ...turns.map((turn) => ({
                    text: turn.text ?? "",
                    toolCalls: withIds(turn),
                    ...(turn.usage === undefined
                        ? {}
                        : { usage: { promptTokens: turn.usage.input, completionTokens: turn.usage.output } }),
                })),
            );
        },
    };
}

/** An assistant over a session, on one driver. */
export class Harness {
    readonly events: AiEvent[] = [];
    readonly registry = new CommandRegistry();
    readonly controller: AiController;

    /**
     * An assistant.
     * @param session - The session.
     * @param driver - The engine.
     * @param options - Helpers, keys, questions, history.
     * @param store - The store conversations are kept in, instead of the one `history` names.
     */
    constructor(
        readonly session: GraphSession,
        readonly driver: Driver,
        options: Pick<AiControllerOptions, "agents" | "apiKeys" | "questions" | "history" | "approvals"> = {},
        store?: ConversationStore,
    ) {
        installAssistantTools(this.registry, session);
        this.controller = new AiController({
            provider: { name: "scripted" } as never,
            commandRegistry: this.registry,
            graph: { getSession: () => session } as unknown as CommandContext["graph"],
            emitEvent: (event: AiEvent) => this.events.push(event),
            ...options,
            [ENGINE_OVERRIDE]: driver.engine,
            ...(store === undefined ? {} : { [STORE_OVERRIDE]: store }),
        } as never);
    }

    /**
     * The helper events, as `type:agent`.
     * @returns Them, in order.
     */
    agentEvents(): string[] {
        return this.events.flatMap((event) =>
            event.type === "ai-agent-start" || event.type === "ai-agent-end" ? [`${event.type}:${event.agent}`] : [],
        );
    }
}

export const COUNTER = { name: "counter", purpose: "Count and read nodes.", commands: ["query"] };
export const STYLIST = { name: "stylist", purpose: "Color nodes.", commands: ["style"] };
export const PAINTER = { name: "painter", purpose: "Also color nodes.", commands: ["style"] };
export const COUNT = { tool: "query", args: { action: "count", where: "data.type == 'server'" } };
export const STYLE_RED = {
    tool: "style",
    args: { action: "add", where: "data.team == 'red'", values: { "node.color": "red" } },
};
export const ADD_F = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };

/**
 * A `delegate` call.
 * @param agent - The helper.
 * @param task - The task.
 * @returns The call.
 */
export function delegate(agent: string, task: string): { tool: string; args: Record<string, unknown> } {
    return { tool: "delegate", args: { agent, task } };
}

/**
 * What a helper was told earlier helpers answered: a graph-data part of its first message, apart
 * from its task, so what they quoted stays data.
 * @param request - The helper's first request.
 * @returns The text, or "" when it was told none.
 */
export function answersOf(request: TurnRequest): string {
    const part = request.messages[0].parts.find(
        (each) => each.type === "text" && each.origin === "graph-data" && each.text.startsWith("What the helpers"),
    );
    return part?.type === "text" ? part.text : "";
}

/**
 * The tool results a request's last message carries.
 * @param request - The request.
 * @returns Each result's code and parsed content.
 */
export function lastResults(request: TurnRequest): { code: string; content: { data?: { answer?: string } } }[] {
    const last = request.messages.at(-1);
    assert.strictEqual(last?.role, "tool");
    return (last?.parts ?? []).flatMap((part) =>
        part.type === "tool-result"
            ? [{ code: part.code, content: JSON.parse(part.content) as { data?: { answer?: string } } }]
            : [],
    );
}
