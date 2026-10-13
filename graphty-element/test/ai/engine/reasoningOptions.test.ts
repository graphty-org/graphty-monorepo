/**
 * The model options a consumer sets beside the model -- reasoning effort, Anthropic's thinking
 * budget, temperature -- reach each provider's request under the provider's own names, and are
 * absent from it when unset (the provider's default). A turn that reasoned before it called a tool
 * sends its signed reasoning back with the call, which Anthropic needs to continue the turn.
 * @module test/ai/engine/reasoningOptions.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";
import { z } from "zod";

import { toolJsonSchema } from "../../../src/ai/engine/jsonSchema";
import type { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { SavedMessage, TurnEvent, TurnRequest } from "../../../src/ai/engine/types";
import { providerApiFixture } from "./providerApiFixtures";

const FIND = z.object({ selector: z.string() });

/** A turn with one user message and one tool. */
function request(overrides: Partial<TurnRequest> = {}): TurnRequest {
    return {
        system: "You drive a graph.",
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", origin: "reader", text: "find the servers" }] }],
        tools: [{ name: "findNodes", description: "Find nodes", schema: FIND, jsonSchema: toolJsonSchema(FIND) }],
        toolMode: "auto",
        ...overrides,
    };
}

/** Every event of one turn. */
async function events(engine: ProviderApiEngine, turn: TurnRequest): Promise<TurnEvent[]> {
    const out: TurnEvent[] = [];
    for await (const event of engine.turn(turn, new AbortController().signal)) {
        out.push(event);
    }

    return out;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("reasoning effort", () => {
    it("reaches Gemini as its thinking level, under the API's enum name", async () => {
        const { engine, requests, settings } = providerApiFixture("google");
        settings.reasoningEffort = "low";
        await events(engine, request());
        const config = requests[0].body.generationConfig as { thinkingConfig?: { thinkingLevel?: string } };
        assert.strictEqual(config.thinkingConfig?.thinkingLevel, "LOW");
    });

    it("reaches OpenAI as the reasoning effort", async () => {
        const { engine, requests, settings } = providerApiFixture("openai");
        settings.model = "gpt-5-mini";
        settings.reasoningEffort = "high";
        await events(engine, request());
        assert.deepStrictEqual((requests[0].body.reasoning as { effort?: string }).effort, "high");
    });

    it("is not sent when unset, so each provider keeps its own default", async () => {
        for (const provider of ["openai", "anthropic", "google"] as const) {
            const { engine, requests } = providerApiFixture(provider);
            await events(engine, request());
            const { body } = requests[0];
            assert.notProperty(body, "reasoning", provider);
            assert.notProperty(body, "thinking", provider);
            assert.notProperty(body.generationConfig ?? {}, "thinkingConfig", provider);
            vi.unstubAllGlobals();
        }
    });
});

describe("Anthropic's extended thinking", () => {
    it("sends the budget, and no temperature beside it", async () => {
        const { engine, requests, settings } = providerApiFixture("anthropic");
        settings.thinkingBudgetTokens = 2048;
        settings.temperature = 0.3;
        await events(engine, request());
        assert.deepStrictEqual(requests[0].body.thinking, { type: "enabled", budget_tokens: 2048 });
        assert.notProperty(requests[0].body, "temperature");
    });

    it("keeps the temperature when thinking is off", async () => {
        const { engine, requests, settings } = providerApiFixture("anthropic");
        settings.temperature = 0.3;
        await events(engine, request());
        assert.strictEqual(requests[0].body.temperature, 0.3);
        assert.notProperty(requests[0].body, "thinking");
    });

    it("sends a tool turn's signed thinking back with its call, before the call", async () => {
        const { engine, requests, settings, respondOnce } = providerApiFixture("anthropic");
        settings.thinkingBudgetTokens = 2048;
        const sse = (events: readonly [string, unknown][]): string =>
            events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");
        const block = (index: number, start: unknown, deltas: unknown[]): [string, unknown][] => [
            ["content_block_start", { type: "content_block_start", index, content_block: start }],
            ...deltas.map((delta): [string, unknown] => [
                "content_block_delta",
                { type: "content_block_delta", index, delta },
            ]),
            ["content_block_stop", { type: "content_block_stop", index }],
        ];
        respondOnce(
            200,
            sse([
                [
                    "message_start",
                    {
                        type: "message_start",
                        message: {
                            id: "msg_1",
                            type: "message",
                            role: "assistant",
                            model: settings.model,
                            content: [],
                            stop_reason: null,
                            stop_sequence: null,
                            usage: { input_tokens: 1, output_tokens: 1 },
                        },
                    },
                ],
                ...block(0, { type: "thinking", thinking: "", signature: "" }, [
                    { type: "thinking_delta", thinking: "Servers are nodes." },
                    { type: "signature_delta", signature: "c2lnbmVk" },
                ]),
                ...block(1, { type: "tool_use", id: "t1", name: "findNodes", input: {} }, [
                    { type: "input_json_delta", partial_json: '{"selector":"server"}' },
                ]),
                [
                    "message_delta",
                    {
                        type: "message_delta",
                        delta: { stop_reason: "tool_use", stop_sequence: null },
                        usage: { output_tokens: 1 },
                    },
                ],
                ["message_stop", { type: "message_stop" }],
            ]),
            { "content-type": "text/event-stream" },
        );

        const out = await events(engine, request());
        const call = out.find((event) => event.type === "tool-call");
        assert(call?.type === "tool-call");
        const history: SavedMessage[] = [
            ...request().messages,
            {
                id: "m2",
                role: "assistant",
                parts: [
                    {
                        type: "tool-call",
                        origin: "model",
                        callId: call.id,
                        command: call.name,
                        arguments: call.arguments,
                        ...(call.providerState && { providerState: call.providerState }),
                    },
                ],
            },
            {
                id: "m3",
                role: "tool",
                parts: [
                    {
                        type: "tool-result",
                        origin: "graph-data",
                        callId: call.id,
                        code: "AI_COMPLETED",
                        params: {},
                        content: "{}",
                    },
                ],
            },
        ];
        await events(engine, request({ messages: history }));

        const sent = requests[1].body.messages as { role: string; content: { type: string; signature?: string }[] }[];
        const assistant = sent.find((message) => message.role === "assistant");
        assert.deepStrictEqual(
            assistant?.content.map((part) => part.type),
            ["thinking", "tool_use"],
        );
        assert.strictEqual(assistant?.content[0].signature, "c2lnbmVk");
    });
});
