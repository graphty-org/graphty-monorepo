/**
 * The LLM regression tests' Gemini transport, against a fake Gemini API: the cached prefix, the Flex tier and its
 * retries, and the cost it logs.
 * @module test/ai/llm-regression-gemini.test
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { VercelAiProvider } from "../../src/ai/providers/VercelAiProvider";
import { FLEX_CAPACITY_CODE, GeminiTransport } from "../helpers/llm-regression-gemini";

const API = "https://generativelanguage.googleapis.com/v1beta";
const GENERATE = `${API}/models/gemini-3.8-flash:generateContent`;

interface Sent {
    method: string;
    url: string;
    body?: Record<string, unknown>;
}

/**
 * A fake Gemini API: answers generateContent with `usage`, or with each of `failures` first, and records
 * every request.
 */
function fakeGemini(options: { failures?: { status: number; text: string }[]; cacheStatus?: number } = {}) {
    const sent: Sent[] = [];
    const failures = [...(options.failures ?? [])];
    const fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = input instanceof Request ? input.url : input.toString();
        const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
        sent.push({ method: init?.method ?? "GET", url, body });
        if (url.endsWith("/cachedContents")) {
            const status = options.cacheStatus ?? 200;
            const answer =
                status === 200 ? { name: "cachedContents/c1", usageMetadata: { totalTokenCount: 5000 } } : {};
            return Promise.resolve(Response.json(answer, { status }));
        }

        if (init?.method === "DELETE") {
            return Promise.resolve(new Response("{}"));
        }

        const failure = failures.shift();
        if (failure) {
            return Promise.resolve(new Response(failure.text, { status: failure.status }));
        }

        const cached = body?.cachedContent ? 5000 : 0;
        const usageMetadata = {
            promptTokenCount: 5600,
            cachedContentTokenCount: cached,
            candidatesTokenCount: 30,
            thoughtsTokenCount: 120,
            serviceTier: body?.serviceTier === "flex" ? "flex" : "standard",
        };
        const candidates = [{ content: { role: "model", parts: [{ text: "done" }] }, finishReason: "STOP" }];
        return Promise.resolve(Response.json({ candidates, usageMetadata }));
    };
    return { fetch, sent };
}

const request = (toolConfig = "AUTO") => ({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are an AI assistant" }] },
        tools: [{ functionDeclarations: [{ name: "findNodes" }] }],
        toolConfig: { functionCallingConfig: { mode: toolConfig } },
        contents: [{ role: "user", parts: [{ text: "find the servers" }] }],
    }),
});

const sleeps: number[] = [];
const noWait = (ms: number): Promise<void> => {
    sleeps.push(ms);
    return Promise.resolve();
};

describe("GeminiTransport", () => {
    it("caches a prefix on its second use and sends later requests by the cache's name, without the prefix", async () => {
        const api = fakeGemini();
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, sleep: noWait });
        for (let i = 0; i < 3; i++) {
            await transport.fetch(GENERATE, request());
        }

        const generates = api.sent.filter((s) => s.url === GENERATE);
        assert.strictEqual(generates.length, 3);
        assert.ok(generates[0].body?.tools, "the first request is sent whole");
        assert.strictEqual(generates[0].body?.cachedContent, undefined);
        for (const later of generates.slice(1)) {
            assert.strictEqual(later.body?.cachedContent, "cachedContents/c1");
            assert.strictEqual(later.body?.tools, undefined);
            assert.strictEqual(later.body?.systemInstruction, undefined);
            assert.strictEqual(later.body?.toolConfig, undefined);
            assert.ok(later.body?.contents);
        }

        const creates = api.sent.filter((s) => s.url === `${API}/cachedContents`);
        assert.strictEqual(creates.length, 1);
        assert.deepStrictEqual(Object.keys(creates[0].body ?? {}).sort(), [
            "model",
            "systemInstruction",
            "toolConfig",
            "tools",
            "ttl",
        ]);
        assert.strictEqual(creates[0].body?.model, "models/gemini-3.8-flash");
        assert.strictEqual(creates[0].body?.ttl, "1200s");

        await transport.close();
        assert.deepStrictEqual(
            api.sent.filter((s) => s.method === "DELETE").map((s) => s.url),
            [`${API}/cachedContents/c1`],
        );
    });

    it("keeps a different prefix (the answer-only ask's tool config) in a group of its own", async () => {
        const api = fakeGemini();
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, sleep: noWait });
        await transport.fetch(GENERATE, request("AUTO"));
        await transport.fetch(GENERATE, request("NONE"));
        await transport.fetch(GENERATE, request("AUTO"));
        await transport.fetch(GENERATE, request("NONE"));

        assert.strictEqual(api.sent.filter((s) => s.url === `${API}/cachedContents`).length, 2);
        const createdFor = api.sent
            .filter((s) => s.url === `${API}/cachedContents`)
            .map((s) => (s.body?.toolConfig as { functionCallingConfig: { mode: string } }).functionCallingConfig.mode);
        assert.deepStrictEqual(createdFor, ["AUTO", "NONE"]);
    });

    it("sends the prefix whole when the API refuses to cache it", async () => {
        const api = fakeGemini({ cacheStatus: 400 });
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, sleep: noWait });
        for (let i = 0; i < 3; i++) {
            await transport.fetch(GENERATE, request());
        }

        const generates = api.sent.filter((s) => s.url === GENERATE);
        assert.ok(generates.every((s) => s.body?.tools && s.body.cachedContent === undefined));
        assert.strictEqual(api.sent.filter((s) => s.url === `${API}/cachedContents`).length, 1, "asked once only");
    });

    it("asks for the Flex tier, and for none on standard", async () => {
        const flex = fakeGemini();
        await new GeminiTransport({ apiKey: "k", tier: "flex", fetch: flex.fetch }).fetch(GENERATE, request());
        assert.strictEqual(flex.sent[0].body?.serviceTier, "flex");

        const standard = fakeGemini();
        await new GeminiTransport({ apiKey: "k", tier: "standard", fetch: standard.fetch }).fetch(GENERATE, request());
        assert.strictEqual(standard.sent[0].body?.serviceTier, undefined);
    });

    it("retries Flex's capacity errors with Google's backoff, then answers", async () => {
        sleeps.length = 0;
        const api = fakeGemini({
            failures: [
                { status: 503, text: "overloaded" },
                { status: 429, text: "busy" },
            ],
        });
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, sleep: noWait });
        const response = await transport.fetch(GENERATE, request());

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(sleeps, [5000, 10000]);
        assert.strictEqual(transport.usage.requests, 1);
    });

    it("fails with a coded error when Flex never has capacity", async () => {
        const capacity = { status: 503, text: "overloaded" };
        const api = fakeGemini({ failures: [capacity, capacity, capacity] });
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, sleep: noWait });

        let error: unknown;
        await transport.fetch(GENERATE, request()).catch((e: unknown) => (error = e));
        assert.ok(error instanceof Error);
        assert.include(error.message, FLEX_CAPACITY_CODE);
        assert.include(error.message, "3 attempts");
        assert.strictEqual(api.sent.filter((s) => s.url === GENERATE).length, 3);
    });

    it("hands an account refusal straight back, never retried", async () => {
        const api = fakeGemini({
            failures: [{ status: 429, text: '{"error":{"message":"You exceeded your current quota"}}' }],
        });
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, sleep: noWait });
        const response = await transport.fetch(GENERATE, request());

        assert.strictEqual(response.status, 429);
        assert.strictEqual(api.sent.length, 1);
    });

    it("passes other providers' and non-generate requests through untouched", async () => {
        const api = fakeGemini();
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch });
        const init = { method: "POST", body: '{"model":"x"}' };
        await transport.fetch(`${API}/models/gemini-3.8-flash:countTokens`, init);
        assert.deepStrictEqual(api.sent[0].body, { model: "x" });
        assert.strictEqual(transport.usage.requests, 0);
    });

    it("prices each answer at the tier that served it, cached tokens at the cached price", async () => {
        const api = fakeGemini();
        const now = () => Date.parse("2026-11-01T00:00:00Z");
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch, now });
        await transport.fetch(GENERATE, request());
        await transport.fetch(GENERATE, request());
        const usage = await transport.close();

        // Request 1: 5600 uncached; request 2: 600 uncached + 5000 cached; both 150 output (30 + 120 thinking).
        const flex = (600 + 5600) * 0.375 + 5000 * 0.0375 + 300 * 1.875;
        // The cache: 5000 tokens created at Standard input, stored for its whole 1200 s TTL.
        const cache = 5000 * (0.75 + (0.5 * 1200) / 3600);
        assert.closeTo(usage.usd ?? 0, (flex + cache) / 1e6, 1e-12);
        assert.deepInclude(usage, {
            requests: 2,
            promptTokens: 11200,
            cachedTokens: 5000,
            outputTokens: 60,
            thinkingTokens: 240,
            flexServed: 2,
            caches: 1,
            cacheTokens: 5000,
        });
        assert.match(
            transport.summary(),
            /^, prompt tokens 11200 \(cached 5000\), output tokens 60, thinking tokens 240, flex 2\/2, caches 1 \(5000 tokens\), cost \$0\.\d{4}$/,
        );
    });

    it("doubles every price from 2027-01-01, and leaves the cost unknown for a model it has no price for", async () => {
        const at = (iso: string) => () => Date.parse(iso);
        const before = new GeminiTransport({
            apiKey: "k",
            tier: "standard",
            cache: false,
            fetch: fakeGemini().fetch,
            now: at("2026-12-31T23:00:00Z"),
        });
        const after = new GeminiTransport({
            apiKey: "k",
            tier: "standard",
            cache: false,
            fetch: fakeGemini().fetch,
            now: at("2027-01-01T01:00:00Z"),
        });
        await before.fetch(GENERATE, request());
        await after.fetch(GENERATE, request());
        assert.closeTo(after.usage.usd ?? 0, 2 * (before.usage.usd ?? 0), 1e-12);

        const other = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: fakeGemini().fetch });
        await other.fetch(`${API}/models/gemini-9-pro:generateContent`, request());
        assert.strictEqual(other.usage.usd, undefined);
        assert.match(other.summary(), /cost unknown$/);
    });

    it("is the fetch the element's Google provider sends with, and caches the prefix the AI SDK writes", async () => {
        const api = fakeGemini();
        const transport = new GeminiTransport({ apiKey: "k", tier: "flex", fetch: api.fetch });
        const provider = new VercelAiProvider("google");
        provider.configure({ apiKey: "k", model: "gemini-3.8-flash", fetch: transport.fetch });
        const messages = [
            { role: "system" as const, content: "You are an AI assistant" },
            { role: "user" as const, content: "find the servers" },
        ];
        const tools = [{ name: "findNodes", description: "Find nodes", parameters: z.object({}) }];
        for (let i = 0; i < 3; i++) {
            const answer = await provider.generate(messages, tools);
            assert.strictEqual(answer.text, "done");
        }

        const generates = api.sent.filter((s) => s.url === GENERATE);
        assert.strictEqual(generates.length, 3);
        assert.ok(generates[0].body?.systemInstruction && generates[0].body.tools);
        assert.deepStrictEqual(
            generates.map((s) => [s.body?.serviceTier, s.body?.cachedContent ?? null]),
            [
                ["flex", null],
                ["flex", "cachedContents/c1"],
                ["flex", "cachedContents/c1"],
            ],
        );
        assert.strictEqual(generates[2].body?.tools, undefined);
        assert.strictEqual(transport.usage.requests, 3);
    });
});
