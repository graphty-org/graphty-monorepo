/**
 * The provider-API engine beyond the common contract: graphty's retry schedule, where each request
 * goes and with which key, the consumer's base URL, the options each provider names its own way,
 * and Gemini's thought signatures, against each provider's HTTP API faked at `fetch`.
 * @module test/ai/engine/providerApi.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";
import { z } from "zod";

import { readConversation, writeConversation } from "../../../src/ai/conversation/formats";
import { toolJsonSchema } from "../../../src/ai/engine/jsonSchema";
import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type {
    HostedToolRequest,
    ProviderState,
    SavedMessage,
    TurnEvent,
    TurnRequest,
} from "../../../src/ai/engine/types";
import { AI_CONVERSATION_FORMAT } from "../../../src/catalog/ai";
import {
    geminiSpeechAnswer,
    HOSTS,
    KEYS,
    providerApiFixture,
    SPEECH_MP3,
    SPEECH_PCM,
    TRANSCRIPT,
    wav,
} from "./providerApiFixtures";

const PROVIDERS = ["openai", "anthropic", "google"] as const;

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
async function events(
    engine: ProviderApiEngine,
    turn: TurnRequest,
    signal = new AbortController().signal,
): Promise<TurnEvent[]> {
    const out: TurnEvent[] = [];
    for await (const event of engine.turn(turn, signal)) {
        out.push(event);
    }

    return out;
}

/**
 * A turn's provider-run tools, without the round-trip state a provider that pauses turns adds.
 * @param out - The turn's events.
 * @returns Its hosted-tool events.
 */
function hostedOf(out: TurnEvent[]): TurnEvent[] {
    return out.flatMap((event) => {
        if (event.type !== "hosted-tool") {
            return [];
        }

        const { providerState: _state, ...rest } = event;
        return [rest];
    });
}

/** The turn's error, which a failed turn ends with. */
function lastError(out: TurnEvent[]): Extract<TurnEvent, { type: "error" }> {
    const last = out.at(-1);
    assert.strictEqual(last?.type, "error");
    return last as Extract<TurnEvent, { type: "error" }>;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe.each(PROVIDERS)("provider-API engine: %s", (provider) => {
    describe("retries, on graphty's schedule", () => {
        it("asks again after a 429 and answers: two requests, the provider's wait honored", async () => {
            const { engine, failOnce, requests, waits } = providerApiFixture(provider);
            failOnce(429, 250);
            const out = await events(engine, request());
            assert.strictEqual(requests.length, 2);
            assert.deepStrictEqual(waits, [250]);
            assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "stop" });
            assert.notOk(out.some((e) => e.type === "error"));
        });

        it("gives up after three 500s: three requests, the backoff doubling, the status in the code", async () => {
            const { engine, failOnce, requests, waits } = providerApiFixture(provider);
            failOnce(500, Number.NaN);
            failOnce(500, Number.NaN);
            failOnce(500, Number.NaN);
            const error = lastError(await events(engine, request()));
            assert.strictEqual(requests.length, 3);
            assert.deepStrictEqual(waits, [2000, 4000]);
            assert.strictEqual(error.code, "AI_PROVIDER_ERROR");
            assert.strictEqual(error.params.status, 500);
        });

        it("waits the backoff when the provider asks for more than a minute", async () => {
            const { engine, failOnce, waits } = providerApiFixture(provider);
            failOnce(503, 120_000);
            await events(engine, request());
            assert.deepStrictEqual(waits, [2000]);
        });

        it("asks again after a dropped connection", async () => {
            const { engine, dropConnection, requests } = providerApiFixture(provider);
            dropConnection();
            const out = await events(engine, request());
            assert.strictEqual(requests.length, 2);
            assert.strictEqual(out.at(-1)?.type, "finish");
        });

        it("never asks again after a refused key", async () => {
            const { engine, failOnce, requests } = providerApiFixture(provider);
            failOnce(401);
            assert.strictEqual(lastError(await events(engine, request())).code, "AI_KEY_REJECTED");
            assert.strictEqual(requests.length, 1);
        });

        it("stops waiting when the turn is cancelled during the wait", async () => {
            const { failOnce, requests } = providerApiFixture(provider);
            const settings = { provider, apiKey: KEYS[provider], model: "m" } as const;
            const controller = new AbortController();
            // The real wait, with the backoff (2 s): the cancel must end it, not the clock.
            const engine = new ProviderApiEngine(() => settings);
            failOnce(500, Number.NaN);
            const pending = events(engine, request(), controller.signal);
            await vi.waitFor(() => {
                assert.strictEqual(requests.length, 1);
            });
            controller.abort();
            const out = await pending;
            assert.strictEqual(lastError(out).code, "AI_CANCELLED");
            assert.strictEqual(requests.length, 1);
        });
    });

    it("refuses a turn with no key before loading the adapter or sending anything", async () => {
        const { requests } = providerApiFixture(provider);
        let loads = 0;
        const engine = new ProviderApiEngine(() => ({ provider, model: "m" }), {
            load: () => {
                loads++;
                return Promise.reject(new Error("not loaded"));
            },
        });
        const error = lastError(await events(engine, request()));
        assert.strictEqual(error.code, "AI_KEY_MISSING");
        assert.deepStrictEqual(error.params, { provider });
        assert.strictEqual(loads, 0);
        assert.strictEqual(requests.length, 0);
    });

    it("sends the key only to the provider's own host, and contacts no other", async () => {
        const { engine, requests } = providerApiFixture(provider);
        await events(engine, request());
        assert.strictEqual(requests.length, 1);
        const [sent] = requests;
        assert.strictEqual(new URL(sent.url).host, HOSTS[provider]);
        const others = Object.entries(KEYS).filter(([p]) => p !== provider);
        const all = `${sent.url}\n${JSON.stringify(sent.headers)}\n${JSON.stringify(sent.body)}`;
        assert.include(JSON.stringify(sent.headers), KEYS[provider]);
        for (const [, key] of others) {
            assert.notInclude(all, key);
        }

        assert.notInclude(`${sent.url}\n${JSON.stringify(sent.body)}`, KEYS[provider], "the key is in a header only");
    });

    it("keeps the key out of every error, even when the provider echoes it", async () => {
        const { engine } = providerApiFixture(provider);
        vi.stubGlobal("fetch", () =>
            Promise.resolve(
                new Response(JSON.stringify({ error: { message: `bad key ${KEYS[provider]}` } }), {
                    status: 401,
                    headers: { "content-type": "application/json" },
                }),
            ),
        );
        const error = lastError(await events(engine, request()));
        assert.strictEqual(error.code, "AI_KEY_REJECTED");
        assert.notInclude(
            `${error.cause.message}\n${error.cause.stack}\n${JSON.stringify(error.params)}`,
            KEYS[provider],
        );
    });

    it("finishes an answer cut off at the output limit with what it had, as the AI SDK did", async () => {
        const { engine, reply } = providerApiFixture(provider);
        reply({
            text: "Making them red.",
            toolCalls: [{ id: "t1", name: "findNodes", arguments: { selector: "a" } }],
            cutOff: true,
        });
        const out = await events(engine, request());
        assert.notOk(out.some((e) => e.type === "error"));
        assert.strictEqual(out.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join(""), "Making them red.");
        assert.deepStrictEqual(
            out.flatMap((e) => (e.type === "tool-call" ? [[e.id, e.arguments, e.invalidArguments]] : [])),
            [["t1", { selector: "a" }, undefined]],
        );
        assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "tool-calls" });

        reply({ text: "A long answer that", cutOff: true });
        assert.deepStrictEqual((await events(engine, request())).at(-1), { type: "finish", reason: "stop" });
    });

    it("sends none of the SDKs' telemetry headers, which a proxy's CORS preflight may refuse", async () => {
        const { engine, requests } = providerApiFixture(provider);
        await events(engine, request());
        const names = Object.keys(requests[0].headers);
        assert.deepStrictEqual(
            names.filter((name) => name.startsWith("x-stainless-") || name === "x-goog-api-client"),
            [],
        );
    });

    it("takes a model id no table lists, and asks the API for it", async () => {
        const { engine, requests, settings } = providerApiFixture(provider);
        settings.model = "not-a-listed-model";
        const out = await events(engine, request());
        assert.strictEqual(out.at(-1)?.type, "finish");
        assert.include(`${requests[0].url} ${JSON.stringify(requests[0].body)}`, "not-a-listed-model");
    });
});

describe.each(["openai", "anthropic"] as const)("%s: a call whose argument text does not parse", (provider) => {
    it("is marked invalid with no arguments, so nothing runs with defaults", async () => {
        const { engine, reply } = providerApiFixture(provider);
        reply({ toolCalls: [{ id: "t1", name: "findNodes", arguments: '{"selector": "red-no' }] });
        const out = await events(engine, request());
        const calls = out.flatMap((e) => (e.type === "tool-call" ? [e] : []));
        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].arguments, {});
        assert.isTrue(calls[0].invalidArguments);
        assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "tool-calls" });
    });
});

describe("Gemini errors and streaming", () => {
    it("codes a wrong key (400 API_KEY_INVALID) as AI_KEY_REJECTED, in Google's own words, and never retries", async () => {
        const { engine, respondOnce, requests } = providerApiFixture("google");
        // Google's answer to a wrong key, as the API sends it (checked 2026-10-10).
        respondOnce(
            400,
            JSON.stringify({
                error: {
                    code: 400,
                    message: "API key not valid. Please pass a valid API key.",
                    status: "INVALID_ARGUMENT",
                    details: [
                        {
                            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                            reason: "API_KEY_INVALID",
                            domain: "googleapis.com",
                        },
                    ],
                },
            }),
            { "content-type": "application/json" },
        );
        const error = lastError(await events(engine, request()));
        assert.strictEqual(error.code, "AI_KEY_REJECTED");
        assert.deepStrictEqual(error.params, { provider: "google", status: 400 });
        assert.strictEqual(error.cause.message, "API key not valid. Please pass a valid API key.");
        assert.strictEqual(requests.length, 1);
    });

    it("keeps any other 400 a provider error", async () => {
        const { engine, respondOnce } = providerApiFixture("google");
        respondOnce(400, JSON.stringify({ error: { code: 400, message: "bad request", status: "INVALID_ARGUMENT" } }), {
            "content-type": "application/json",
        });
        const error = lastError(await events(engine, request()));
        assert.strictEqual(error.code, "AI_PROVIDER_ERROR");
        assert.strictEqual(error.cause.message, "bad request");
    });

    it("reads a call whose arguments arrive over two chunks once, not twice", async () => {
        const { engine, respondOnce } = providerApiFixture("google");
        const chunk = (finish: boolean): string =>
            `data: ${JSON.stringify({
                candidates: [
                    {
                        content: {
                            role: "model",
                            parts: [{ functionCall: { id: "t1", name: "findNodes", args: { selector: "a" } } }],
                        },
                        ...(finish && { finishReason: "STOP" }),
                        index: 0,
                    },
                ],
            })}\n\n`;
        respondOnce(200, chunk(false) + chunk(true), { "content-type": "text/event-stream" });
        const out = await events(engine, request());
        const calls = out.flatMap((e) => (e.type === "tool-call" ? [e] : []));
        assert.deepStrictEqual(
            calls.map((c) => [c.arguments, c.invalidArguments]),
            [[{ selector: "a" }, undefined]],
        );
    });
});

describe("Anthropic's output limit", () => {
    it.each([
        ["claude-opus-4-20250514", 32_000],
        ["claude-haiku-4-5-20251001", 64_000],
        ["claude-3-5-haiku-20241022", 4096],
        ["claude-sonnet-4-6", 128_000],
        ["my-proxy-model", 4096],
    ])("sends %s a max_tokens it accepts (%i), when the consumer set none", async (model, maxTokens) => {
        const { engine, requests, settings } = providerApiFixture("anthropic");
        settings.model = model;
        await events(engine, request());
        assert.strictEqual(requests[0].body.max_tokens, maxTokens);
    });
});

describe("the consumer's baseUrl keeps the AI SDK's meaning, version path included", () => {
    it.each([
        ["openai", undefined, "https://api.openai.com/v1/responses"],
        ["openai", "https://proxy.example/openai/v1", "https://proxy.example/openai/v1/responses"],
        ["anthropic", undefined, "https://api.anthropic.com/v1/messages?beta=true"],
        ["anthropic", "https://proxy.example/anthropic/v1", "https://proxy.example/anthropic/v1/messages?beta=true"],
        ["anthropic", "https://proxy.example/anthropic/v1/", "https://proxy.example/anthropic/v1/messages?beta=true"],
        ["anthropic", "https://proxy.example/anthropic", "https://proxy.example/anthropic/messages?beta=true"],
        [
            "google",
            undefined,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse",
        ],
        [
            "google",
            "https://proxy.example/google/v1beta",
            "https://proxy.example/google/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse",
        ],
        [
            "google",
            "https://proxy.example/google/v1",
            "https://proxy.example/google/v1/models/gemini-3.8-flash:streamGenerateContent?alt=sse",
        ],
        [
            "google",
            "https://proxy.example/google",
            "https://proxy.example/google/models/gemini-3.8-flash:streamGenerateContent?alt=sse",
        ],
    ] as const)("%s with base URL %s asks %s", async (provider, baseUrl, url) => {
        const { engine, requests, settings } = providerApiFixture(provider);
        settings.baseUrl = baseUrl;
        await events(engine, request());
        assert.strictEqual(requests[0].url, url);
    });
});

describe("each provider gets the turn's options under its own names", () => {
    it.each([
        ["openai", (b: Record<string, unknown>) => [b.max_output_tokens, b.temperature, b.tool_choice]],
        [
            "anthropic",
            (b: Record<string, unknown>) => [b.max_tokens, b.temperature, (b.tool_choice as { type: string }).type],
        ],
        [
            "google",
            (b: Record<string, unknown>) => {
                const config = b.generationConfig as Record<string, unknown>;
                const { mode } = (b.toolConfig as { functionCallingConfig: { mode: string } }).functionCallingConfig;
                return [config.maxOutputTokens, config.temperature, mode];
            },
        ],
    ] as const)("%s", async (provider, read) => {
        const { engine, requests, settings } = providerApiFixture(provider);
        settings.maxTokens = 300;
        settings.temperature = 0.25;
        await events(engine, request({ toolMode: "none" }));
        assert.deepStrictEqual(read(requests[0].body), [300, 0.25, provider === "google" ? "NONE" : "none"]);
    });

    it("sends no tool choice with no tools, as a key check has none", async () => {
        for (const provider of PROVIDERS) {
            const { engine, requests } = providerApiFixture(provider);
            await events(engine, request({ tools: [] }));
            const { body } = requests[0];
            assert.notProperty(body, "tool_choice", provider);
            assert.notProperty(body, "toolConfig", provider);
            vi.unstubAllGlobals();
        }
    });
});

describe("Gemini thought signatures", () => {
    /**
     * A history whose assistant message made two calls, each with the given provider state.
     * @param states - Each call's state.
     * @returns The messages.
     */
    function history(states: readonly (ProviderState | undefined)[]): SavedMessage[] {
        return [
            ...request().messages,
            {
                id: "m2",
                role: "assistant",
                parts: states.map((state, index) => ({
                    type: "tool-call" as const,
                    origin: "model" as const,
                    callId: `t${index + 1}`,
                    command: "findNodes",
                    arguments: { selector: String(index) },
                    ...(state && { providerState: state }),
                })),
            },
            {
                id: "m3",
                role: "tool",
                parts: states.map((_, index) => ({
                    type: "tool-result" as const,
                    origin: "graph-data" as const,
                    callId: `t${index + 1}`,
                    code: "AI_COMPLETED" as const,
                    params: {},
                    content: "{}",
                })),
            },
        ];
    }

    /** Each function call's signature in the request's history. */
    function signatures(body: Record<string, unknown>): (string | undefined)[] {
        return (body.contents as { parts: { functionCall?: unknown; thoughtSignature?: string }[] }[]).flatMap((c) =>
            c.parts.flatMap((p) => (p.functionCall ? [p.thoughtSignature] : [])),
        );
    }

    it("hands back the signature a call came with, as provider state, and sends it back with the call", async () => {
        const { engine, reply, requests } = providerApiFixture("google");
        reply({
            toolCalls: [
                { id: "t1", name: "findNodes", arguments: { selector: "a" }, signature: "c2lnLTE=" },
                { id: "t2", name: "findNodes", arguments: { selector: "b" } },
            ],
        });
        const out = await events(engine, request());
        const states = out.flatMap((e) => (e.type === "tool-call" ? [e.providerState] : []));
        assert.deepStrictEqual(states[0], {
            engine: "provider-api",
            provider: "google",
            model: "gemini-3.8-flash",
            data: { thoughtSignature: "c2lnLTE=" },
        });
        assert.isUndefined(states[1]);

        await events(engine, request({ messages: history(states) }));
        // The second call is not signed, and needs no placeholder: Gemini signs the first of a batch.
        assert.deepStrictEqual(signatures(requests[1].body), ["c2lnLTE=", undefined]);
    });

    it("echoes the signature of a held call saved as JSON when its approval resumes after a reload", async () => {
        const held = providerApiFixture("google");
        held.reply({
            toolCalls: [{ id: "t1", name: "findNodes", arguments: { selector: "a" }, signature: "aGVsZA==" }],
        });
        const states = (await events(held.engine, request())).flatMap((e) =>
            e.type === "tool-call" ? [e.providerState] : [],
        );
        // The held message is saved, the page reloads, and the approved call's result is sent from
        // the record alone, on a new engine.
        const at = "2026-10-11T00:00:00.000Z";
        const json = writeConversation({
            format: AI_CONVERSATION_FORMAT,
            version: 1,
            revision: 3,
            id: "c1",
            key: "graph:/",
            createdAt: at,
            updatedAt: at,
            graph: { dataKey: null, fingerprint: "f" },
            messages: history(states),
            pending: [],
        });
        const read = readConversation(json);
        assert.isTrue(read.ok);
        const resumed = providerApiFixture("google");
        resumed.reply({ text: "Done." });

        await events(resumed.engine, request({ messages: read.ok ? [...read.record.messages] : [] }));

        assert.deepStrictEqual(signatures(resumed.requests[0].body), ["aGVsZA=="]);
    });

    it("sends the documented placeholder for calls another engine, provider or model made", async () => {
        const { engine, requests } = providerApiFixture("google");
        const foreign: ProviderState = { engine: "provider-api", provider: "anthropic", model: "claude", data: {} };
        const otherModel: ProviderState = {
            engine: "provider-api",
            provider: "google",
            model: "gemini-older",
            data: { thoughtSignature: "old" },
        };
        await events(engine, request({ messages: history([foreign, otherModel]) }));
        assert.deepStrictEqual(signatures(requests[0].body), [
            "skip_thought_signature_validator",
            "skip_thought_signature_validator",
        ]);
    });

    it("sends no placeholder to a model that does not check signatures", async () => {
        const { engine, requests, settings } = providerApiFixture("google");
        settings.model = "gemini-2.5-flash";
        await events(engine, request({ messages: history([undefined]) }));
        assert.deepStrictEqual(signatures(requests[0].body), [undefined]);
    });
});

describe.each(PROVIDERS)("%s: web search, run by the provider", (provider) => {
    const PAGES = [
        { url: "https://en.wikipedia.org/wiki/Eiffel_Tower", title: "Eiffel Tower" },
        { url: "https://www.toureiffel.paris/en", title: "Official site" },
    ];
    const SEARCH: HostedToolRequest = { tool: "web-search" };

    /** Each provider's tool list, normalized: a function tool by its name, a provider tool as sent. */
    function tools(body: Record<string, unknown>): unknown[] {
        return ((body.tools as Record<string, unknown>[] | undefined) ?? []).flatMap((tool) => {
            if (Array.isArray(tool.functionDeclarations)) {
                return (tool.functionDeclarations as { name: string }[]).map(({ name }) => name);
            }

            return tool.type === "function" || tool.input_schema !== undefined ? [tool.name] : [tool];
        });
    }

    it("yields the search with its sources, then the text, and no tool call, in one request", async () => {
        const { engine, reply, requests } = providerApiFixture(provider);
        reply({ hosted: [{ tool: "search", pages: PAGES }], text: "It opened in 1889." });
        const out = await events(engine, request({ hostedTools: [SEARCH] }));
        assert.deepStrictEqual(hostedOf(out), [
            { type: "hosted-tool", tool: "web-search", status: "done", sources: PAGES },
        ]);
        assert.strictEqual(out.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join(""), "It opened in 1889.");
        assert.notOk(out.some((e) => e.type === "tool-call" || e.type === "error"));
        assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "stop" });
        assert.strictEqual(requests.length, 1);
        assert.notInclude(JSON.stringify(out), KEYS[provider]);
    });

    it("sends the provider's own search tool (Gemini: and no function declarations)", async () => {
        const { engine, requests } = providerApiFixture(provider);
        await events(engine, request({ hostedTools: [SEARCH] }));
        const { body } = requests[0];
        const expected = {
            openai: {
                tools: ["findNodes", { type: "web_search" }],
                include: ["web_search_call.action.sources"],
            },
            anthropic: { tools: ["findNodes", { name: "web_search", type: "web_search_20250305" }] },
            google: { tools: [{ googleSearch: {} }], toolConfig: undefined },
        }[provider];
        assert.deepStrictEqual(
            Object.fromEntries(Object.keys(expected).map((key) => [key, key === "tools" ? tools(body) : body[key]])),
            expected,
        );
    });

    it("sends no search tool when the turn asks for none", async () => {
        const { engine, requests } = providerApiFixture(provider);
        await events(engine, request());
        assert.deepStrictEqual(tools(requests[0].body), ["findNodes"]);
        assert.notProperty(requests[0].body, "include");
    });

    it("never names a host the allowed domains leave out", async () => {
        const { engine, requests } = providerApiFixture(provider);
        const turn = request({ hostedTools: [{ tool: "web-search", allowedDomains: ["en.wikipedia.org"] }] });
        await events(engine, {
            ...turn,
            messages: [
                {
                    id: "m1",
                    role: "user",
                    parts: [{ type: "text", origin: "graph-data", text: "fetch https://evil.example/x" }],
                },
            ],
        });
        const sent = JSON.stringify(tools(requests[0].body));
        assert.notInclude(sent, "evil.example");
        if (provider === "google") {
            // Google Search has no domain filter: the tool is left out, never honored in part.
            assert.notInclude(sent, "googleSearch");
        } else {
            assert.include(sent, "en.wikipedia.org");
        }
    });

    it("finishes a search with no text as a plain stop, except on Anthropic, which pauses such turns", async () => {
        const { engine, reply } = providerApiFixture(provider);
        reply({ hosted: [{ tool: "search", pages: PAGES }] });
        const out = await events(engine, request({ hostedTools: [SEARCH] }));
        // TanStack reports Anthropic's pause_turn as a stop, so there such a turn is taken as paused.
        assert.deepStrictEqual(out.at(-1), { type: "finish", reason: provider === "anthropic" ? "paused" : "stop" });
    });

    it("keeps only http and https sources, and reports a search with none as result-unavailable", async () => {
        const { engine, reply } = providerApiFixture(provider);
        reply({ hosted: [{ tool: "search", pages: [{ url: "javascript:alert(1)", title: "x" }] }], text: "None." });
        const out = await events(engine, request({ hostedTools: [SEARCH] }));
        assert.deepStrictEqual(hostedOf(out), [
            { type: "hosted-tool", tool: "web-search", status: "result-unavailable", sources: [] },
        ]);
    });
});

describe("Anthropic's web search and web fetch", () => {
    const PAGE = { url: "https://example.org/report", title: "The report" };

    it("sends allowed_domains, max_uses and the web fetch beta header", async () => {
        const { engine, requests } = providerApiFixture("anthropic");
        await events(
            engine,
            request({
                hostedTools: [
                    { tool: "web-search", maxUses: 2, allowedDomains: ["example.org"] },
                    { tool: "web-fetch", maxUses: 1, allowedDomains: ["example.org"] },
                ],
            }),
        );
        const { body, headers } = requests[0];
        const sent = (body.tools as Record<string, unknown>[]).slice(1);
        assert.deepStrictEqual(
            sent.map((tool) => [tool.name, tool.type, tool.allowed_domains, tool.max_uses]),
            [
                ["web_search", "web_search_20250305", ["example.org"], 2],
                ["web_fetch", "web_fetch_20250910", ["example.org"], 1],
            ],
        );
        assert.include(headers["anthropic-beta"].split(","), "web-fetch-2025-09-10");
    });

    it("adds no beta header to a turn with no web fetch", async () => {
        const { engine, requests } = providerApiFixture("anthropic");
        await events(engine, request({ hostedTools: [{ tool: "web-search" }] }));
        assert.notInclude(requests[0].headers["anthropic-beta"] ?? "", "web-fetch");
    });

    it("reads a fetched page as a web-fetch source", async () => {
        const { engine, reply } = providerApiFixture("anthropic");
        reply({ hosted: [{ tool: "fetch", pages: [PAGE] }], text: "It says so." });
        const out = await events(engine, request({ hostedTools: [{ tool: "web-fetch" }] }));
        assert.deepStrictEqual(hostedOf(out), [
            { type: "hosted-tool", tool: "web-fetch", status: "done", sources: [PAGE] },
        ]);
    });

    it("reports a web_search_tool_result_error as result-unavailable", async () => {
        const { engine, reply } = providerApiFixture("anthropic");
        reply({ hosted: [{ tool: "search", error: "max_uses_exceeded" }], text: "I could not search." });
        const out = await events(engine, request({ hostedTools: [{ tool: "web-search" }] }));
        assert.deepStrictEqual(hostedOf(out), [
            { type: "hosted-tool", tool: "web-search", status: "result-unavailable", sources: [] },
        ]);
        assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "stop" });
    });

    it("finishes a turn paused after a search, with no text, as paused, not stopped", async () => {
        const { engine, reply, requests } = providerApiFixture("anthropic");
        reply({ hosted: [{ tool: "search", pages: [PAGE] }], paused: true });
        const out = await events(engine, request({ hostedTools: [{ tool: "web-search" }] }));
        assert.deepStrictEqual(out.at(-1), { type: "finish", reason: "paused" });
        assert.notOk(out.some((e) => e.type === "tool-call"));
        assert.strictEqual(requests.length, 1);
    });

    it("sends a paused turn back with its server_tool_use block and result, so the provider continues", async () => {
        const { engine, reply, requests } = providerApiFixture("anthropic");
        reply({ hosted: [{ tool: "search", pages: [PAGE] }], paused: true });
        const paused = await events(engine, request({ hostedTools: [{ tool: "web-search" }] }));
        const searched = paused.find((e) => e.type === "hosted-tool");
        assert.ok(searched?.type === "hosted-tool" && searched.providerState !== undefined, "the state is kept");

        reply({ text: "It says so." });
        const turn = request({ hostedTools: [{ tool: "web-search" }] });
        await events(engine, {
            ...turn,
            messages: [
                ...turn.messages,
                {
                    id: "a1",
                    role: "assistant",
                    parts: [
                        {
                            type: "hosted-tool",
                            origin: "web",
                            tool: "web-search",
                            status: "done",
                            sources: [PAGE],
                            ...(searched?.type === "hosted-tool" && { providerState: searched.providerState }),
                        },
                    ],
                },
            ],
        });

        const sent = (requests[1].body.messages as { role: string; content: { type: string }[] }[]).at(-1);
        assert.strictEqual(sent?.role, "assistant");
        assert.deepStrictEqual(
            sent?.content.map((block) => block.type),
            ["server_tool_use", "web_search_tool_result"],
        );
    });
});

/** A clip as a browser's `MediaRecorder` makes it. */
function clip(): Blob {
    return new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4])], { type: "audio/webm;codecs=opus" });
}

/**
 * A request's URL without its host, query or key, and its body, as a case compares them.
 * @param request - The recorded request.
 * @param request.url - Its URL.
 * @param request.body - Its body.
 * @returns The path and the body.
 */
function normalized(request: { url: string; body: Record<string, unknown> }): { path: string; body: unknown } {
    return { path: new URL(request.url).pathname, body: request.body };
}

describe("speech through OpenAI's audio endpoints", () => {
    it("transcribes one clip in one multipart request, with the model, the language and a file named for its type", async () => {
        const { engine, requests } = providerApiFixture("openai");
        const heard = await engine.transcribe?.(clip(), { language: "en-US" }, new AbortController().signal);
        assert.deepStrictEqual(heard, { code: "AI_COMPLETED", params: {}, text: TRANSCRIPT });
        assert.deepStrictEqual(requests.map(normalized), [
            {
                path: "/v1/audio/transcriptions",
                body: {
                    model: "gpt-4o-mini-transcribe",
                    file: { file: "audio.webm", type: "audio/webm;codecs=opus", size: 8 },
                    language: "en",
                    response_format: "json",
                },
            },
        ]);
        assert.strictEqual(new URL(requests[0].url).host, HOSTS.openai);
    });

    it("sends the clip to the consumer's base URL, and takes another transcription model", async () => {
        const { engine, requests, settings } = providerApiFixture("openai");
        settings.baseUrl = "https://proxy.example.org/openai/v1";
        await engine.transcribe?.(clip(), { model: "whisper-1" }, new AbortController().signal);
        assert.strictEqual(requests.length, 1);
        assert.strictEqual(requests[0].url, "https://proxy.example.org/openai/v1/audio/transcriptions");
        assert.strictEqual(requests[0].body.model, "whisper-1");
    });

    it("speaks one text in one request and returns the MP3 as audio/mpeg", async () => {
        const { engine, requests } = providerApiFixture("openai");
        const said = await engine.speak?.("Two hubs.", { voiceName: "nova" }, new AbortController().signal);
        assert.strictEqual(said?.code, "AI_COMPLETED");
        const audio = said?.code === "AI_COMPLETED" ? said.audio : new Blob();
        assert.strictEqual(audio.type, "audio/mpeg");
        assert.deepStrictEqual(new Uint8Array(await audio.arrayBuffer()), SPEECH_MP3);
        assert.deepStrictEqual(requests.map(normalized), [
            { path: "/v1/audio/speech", body: { model: "tts-1", input: "Two hubs.", voice: "nova" } },
        ]);
    });
});

describe("speech through Gemini", () => {
    it("transcribes on the chat model: one generateContent with the clip as inline audio and no tools", async () => {
        const { engine, requests } = providerApiFixture("google");
        const heard = await engine.transcribe?.(clip(), { language: "de-DE" }, new AbortController().signal);
        assert.deepStrictEqual(heard, { code: "AI_COMPLETED", params: {}, text: TRANSCRIPT });
        assert.strictEqual(requests.length, 1);
        const { path, body } = normalized(requests[0]);
        assert.match(path, /\/models\/gemini-3\.8-flash:(stream)?[gG]enerateContent$/);
        const parts = (body as { contents: { parts: Record<string, unknown>[] }[] }).contents.flatMap((c) => c.parts);
        assert.deepStrictEqual(
            parts.flatMap((part) => (part.inlineData ? [part.inlineData] : [])),
            [{ mimeType: "audio/webm", data: btoa(String.fromCharCode(0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4)) }],
        );
        assert.include(JSON.stringify(parts), "de-DE", "the instruction names the language");
        const sent = JSON.stringify(body);
        assert.notInclude(sent, "functionDeclarations");
        // TanStack's Gemini adapter always sends a tools list; it is empty.
        assert.deepStrictEqual((body as { tools?: unknown[] }).tools ?? [], []);
        assert.notProperty(body, "toolConfig");
    });

    it("speaks through the speech model, asking for audio, and wraps Gemini's PCM as a WAV file", async () => {
        const { engine, requests } = providerApiFixture("google");
        const said = await engine.speak?.("Two hubs.", {}, new AbortController().signal);
        assert.strictEqual(said?.code, "AI_COMPLETED");
        const audio = said?.code === "AI_COMPLETED" ? said.audio : new Blob();
        assert.strictEqual(audio.type, "audio/wav");
        const bytes = new Uint8Array(await audio.arrayBuffer());
        const text = (from: number, to: number): string => String.fromCharCode(...bytes.subarray(from, to));
        assert.strictEqual(text(0, 4), "RIFF");
        assert.strictEqual(text(8, 12), "WAVE");
        assert.deepStrictEqual(bytes, wav(SPEECH_PCM));

        assert.strictEqual(requests.length, 1);
        const { path, body } = normalized(requests[0]);
        assert.strictEqual(path, "/v1beta/models/gemini-3.1-flash-tts-preview:generateContent");
        const config = (body as { generationConfig: Record<string, unknown> }).generationConfig;
        assert.deepStrictEqual(config.responseModalities, ["AUDIO"]);
        assert.include(JSON.stringify(config.speechConfig), "Kore", "the adapter's default voice");
    });

    it("refuses a voice Gemini does not list with AI_VOICE_UNAVAILABLE, before any request", async () => {
        const { engine, requests } = providerApiFixture("google");
        const said = await engine.speak?.("Two hubs.", { voiceName: "Nova" }, new AbortController().signal);
        assert.deepStrictEqual(said, {
            code: "AI_VOICE_UNAVAILABLE",
            params: { path: "output", reason: "no-provider-speech" },
        });
        assert.strictEqual(requests.length, 0);
        const named = await engine.speak?.("Two hubs.", { voiceName: "Puck" }, new AbortController().signal);
        assert.strictEqual(named?.code, "AI_COMPLETED");
        assert.include(JSON.stringify(requests[0].body), "Puck");
    });

    it("takes the speech answer the API sends, exactly as recorded", () => {
        // The recorded answer is the one the fake sends: a guard on the fixture itself.
        assert.strictEqual(
            (geminiSpeechAnswer().candidates as { content: { parts: { inlineData: { mimeType: string } }[] } }[])[0]
                .content.parts[0].inlineData.mimeType,
            "audio/L16;codec=pcm;rate=24000",
        );
    });
});

/** Each speech call, as a case runs it: its code and the request count. */
const SPEECH_CALLS = {
    transcribe: (engine: ProviderApiEngine, signal: AbortSignal) => engine.transcribe?.(clip(), {}, signal),
    speak: (engine: ProviderApiEngine, signal: AbortSignal) => engine.speak?.("Two hubs.", {}, signal),
} as const;

describe.each(["openai", "google"] as const)("speech on %s: graphty's retries, codes and keys", (provider) => {
    describe.each(["transcribe", "speak"] as const)("%s", (kind) => {
        const call = SPEECH_CALLS[kind];

        it("asks again after a 429 and succeeds: exactly two requests, the provider's wait honored", async () => {
            const { engine, failOnce, requests, waits } = providerApiFixture(provider);
            failOnce(429, 250);
            const done = await call(engine, new AbortController().signal);
            assert.strictEqual(done?.code, "AI_COMPLETED");
            assert.strictEqual(requests.length, 2);
            assert.deepStrictEqual(waits, [250]);
        });

        it("gives up after three 500s: exactly three requests, the status in the params", async () => {
            const { engine, failOnce, requests, waits } = providerApiFixture(provider);
            failOnce(500, Number.NaN);
            failOnce(500, Number.NaN);
            failOnce(500, Number.NaN);
            const done = await call(engine, new AbortController().signal);
            assert.deepStrictEqual(done, { code: "AI_PROVIDER_ERROR", params: { provider, status: 500 } });
            assert.strictEqual(requests.length, 3);
            assert.deepStrictEqual(waits, [2000, 4000]);
        });

        it("codes a refused key AI_KEY_REJECTED and never asks again", async () => {
            const { engine, failOnce, requests } = providerApiFixture(provider);
            failOnce(401);
            const done = await call(engine, new AbortController().signal);
            assert.strictEqual(done?.code, "AI_KEY_REJECTED");
            assert.strictEqual(requests.length, 1);
        });

        it("is cancelled by its signal: AI_CANCELLED, and no further request", async () => {
            const { engine, hang, requests } = providerApiFixture(provider);
            const controller = new AbortController();
            hang();
            const pending = call(engine, controller.signal);
            await vi.waitFor(() => {
                assert.strictEqual(requests.length, 1);
            });
            controller.abort();
            const done = await pending;
            assert.deepStrictEqual(done, { code: "AI_CANCELLED", params: {} });
            assert.strictEqual(requests.length, 1);

            const already = await call(engine, AbortSignal.abort());
            assert.strictEqual(already?.code, "AI_CANCELLED");
            assert.strictEqual(requests.length, 1, "an aborted signal sends nothing");
        });

        it("refuses a call with no key before sending anything", async () => {
            const { engine, requests, settings } = providerApiFixture(provider);
            settings.apiKey = "";
            const done = await call(engine, new AbortController().signal);
            assert.deepStrictEqual(done, { code: "AI_KEY_MISSING", params: { provider } });
            assert.strictEqual(requests.length, 0);
        });

        it("keeps the key out of the result and of every request but its header, even when the provider echoes it", async () => {
            const { engine, requests, respondOnce } = providerApiFixture(provider);
            const key = KEYS[provider];
            const ok = await call(engine, new AbortController().signal);
            respondOnce(401, JSON.stringify({ error: { message: `bad key ${key}` } }), {
                "content-type": "application/json",
            });
            const refused = await call(engine, new AbortController().signal);
            assert.strictEqual(refused?.code, "AI_KEY_REJECTED");
            assert.notInclude(JSON.stringify([ok, refused]), key);
            for (const sent of requests) {
                assert.notInclude(`${sent.url}\n${JSON.stringify(sent.body)}`, key, "the key is in a header only");
                assert.strictEqual(new URL(sent.url).host, HOSTS[provider]);
            }
        });
    });
});

describe("speech on Anthropic", () => {
    it("has neither member: Anthropic transcribes and speaks nothing itself", () => {
        const { engine } = providerApiFixture("anthropic");
        assert.isFalse("transcribe" in engine);
        assert.isFalse("speak" in engine);
    });
});
