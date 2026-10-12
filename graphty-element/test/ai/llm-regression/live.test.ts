/**
 * A live conversation with the provider, for real (paid; Google only for now): graphty mints a
 * token with the key, the realtime adapter opens a WebSocket from Node over a fake audio stack,
 * and the committed clip, resampled to 16 kHz, is streamed while talk is held.
 * @module test/ai/llm-regression/live.test
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { AiController, type ExecutionResult, LIVE_MESSAGE, liveFacts } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import type { CommandContext } from "../../../src/ai/commands/types";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { LiveConnection, LiveEvent, LiveToolResult } from "../../../src/ai/engine/types";
import { installAssistantTools } from "../../../src/ai/tools/install";
import type { AiPointing } from "../../../src/ai/tools/prompt";
import { LiveTurnEngine } from "../../../src/ai/voice/liveTurns";
import { assistantSession } from "../../helpers/assistant";
import { installFakeLiveTransport, wavSamples } from "../../helpers/fake-live-transport";
import {
    getLlmRegressionApiKey,
    getLlmRegressionModel,
    getLlmRegressionProvider,
    skipIfNoApiKey,
} from "../../helpers/llm-regression-env";
import { redNodes } from "./red";

const FIXTURE = new URL("fixtures/voice/make-all-the-nodes-red.json", import.meta.url);
const { clip, expectedWords } = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
    clip: string;
    expectedWords: string[];
};

/** What a run cost, as the harness counts it and setup.ts prints it. */
const cost = globalThis as {
    __LLM_REGRESSION_API_CALLS__?: number;
    __LLM_REGRESSION_TOKENS__?: { input: number; output: number };
};

/** Counts one request (a live token), as the harness does. */
function counted(): void {
    cost.__LLM_REGRESSION_API_CALLS__ = (cost.__LLM_REGRESSION_API_CALLS__ ?? 0) + 1;
}

/**
 * Count a live connection's cost: each response the model made is a request, with its tokens.
 * @param connection - The connection.
 */
function metered(connection: LiveConnection): void {
    connection.on((event) => {
        if (event.type === "response-end") {
            counted();
        } else if (event.type === "usage") {
            const tokens = (cost.__LLM_REGRESSION_TOKENS__ ??= { input: 0, output: 0 });
            tokens.input += event.inputTokens;
            tokens.output += event.outputTokens;
        }
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe.skipIf(skipIfNoApiKey() || getLlmRegressionProvider() !== "google")("a live conversation on Google", () => {
    it("hears the committed clip streamed while talk is held, and answers it", async () => {
        // Node's own WebSocket; the microphone and the speakers are fakes.
        const transport = installFakeLiveTransport({ webSocket: false });
        const engine = new ProviderApiEngine(() => ({
            provider: "google",
            apiKey: getLlmRegressionApiKey(),
            model: getLlmRegressionModel(),
        }));
        counted();
        const opened = await engine.openLive?.(
            { instructions: "Answer the reader in one short sentence.", tools: [], language: "en-US" },
            new AbortController().signal,
        );
        assert.strictEqual(opened?.code, "AI_COMPLETED", JSON.stringify(opened));
        if (opened?.code !== "AI_COMPLETED") {
            return;
        }

        const { connection } = opened;
        metered(connection);
        const events: LiveEvent[] = [];
        const answered = new Promise<void>((resolve, reject) => {
            connection.on((event) => {
                events.push(event);
                if (event.type === "closed") {
                    reject(new Error(`closed: ${JSON.stringify(event)}`));
                }

                if (event.type === "response-end" && events.some((e) => e.type === "answer-text")) {
                    resolve();
                }
            });
        });

        const samples = wavSamples(
            new Uint8Array(readFileSync(new URL(`fixtures/voice/${clip}`, import.meta.url))),
            16_000,
        );
        connection.capture(true);
        await Promise.resolve();
        transport.speak(samples);
        // Half a second of silence after the words, then release: the release pads the silence the
        // server's turn detection waits for and ends the stream (the Gemini patch), so it answers.
        transport.speak(new Float32Array(8_000));
        connection.capture(false);
        try {
            await answered;
        } finally {
            connection.close();
        }

        const heard = events.filter((e) => e.type === "reader-transcript").at(-1);
        const words = (heard?.type === "reader-transcript" ? heard.text : "").toLowerCase().match(/[a-z]+/g) ?? [];
        for (const word of expectedWords) {
            assert.include(words, word, `"${word}" is in the reader transcript ${JSON.stringify(heard)}`);
        }

        const answer = events.flatMap((e) => (e.type === "answer-text" ? [e.delta] : [])).join("");
        assert.isAbove(answer.trim().length, 0, "an assistant transcript arrived");
        assert.isFalse(
            events.some((e) => e.type === "tool-calls"),
            "no tools were declared, so none were called",
        );
        assert.isTrue(
            transport.tracks.every((t) => t.readyState === "ended"),
            "close() stopped the microphone",
        );
    });
});

const NODES = ["n1", "n2", "n3", "n4", "n5"].map((id) => ({ id }));

/**
 * A committed clip, as 16 kHz samples, and the words it says.
 * @param name - The fixture's JSON file.
 * @returns The samples.
 */
function clipSamples(name: string): Float32Array {
    const fixture = JSON.parse(readFileSync(new URL(`fixtures/voice/${name}`, import.meta.url), "utf8")) as {
        clip: string;
    };
    return wavSamples(new Uint8Array(readFileSync(new URL(`fixtures/voice/${fixture.clip}`, import.meta.url))), 16_000);
}

/**
 * Speak a clip on a real live connection to an assistant over five nodes: the message runs
 * through graphty's loop, and the session is read after it.
 * @param clip - The fixture's JSON file.
 * @param pointing - What the reader points at while talking.
 * @returns The session, the controller, the message's result and every tool result sent.
 */
async function speakToAssistant(clip: string, pointing?: AiPointing) {
    const transport = installFakeLiveTransport({ webSocket: false });
    const engine = new ProviderApiEngine(() => ({
        provider: "google",
        apiKey: getLlmRegressionApiKey(),
        model: getLlmRegressionModel(),
    }));
    const session = await assistantSession({ nodes: NODES, edges: [] });
    const registry = new CommandRegistry();
    installAssistantTools(registry, session);
    const controller = new AiController({
        provider: { name: "google" } as never,
        commandRegistry: registry,
        graph: { getSession: () => session } as unknown as CommandContext["graph"],
        history: "memory",
        [ENGINE_OVERRIDE]: engine,
    } as never);
    const facts = liveFacts(controller);
    assert.exists(facts);
    counted();
    const opened = await engine.openLive?.(
        { ...(await facts.session()), language: "en-US" },
        new AbortController().signal,
    );
    assert.strictEqual(opened?.code, "AI_COMPLETED", JSON.stringify(opened));
    if (opened?.code !== "AI_COMPLETED") {
        throw new Error("no connection");
    }

    const { connection } = opened;
    metered(connection);
    const sent: LiveToolResult[][] = [];
    const send = connection.sendToolResults.bind(connection);
    connection.sendToolResults = (results) => {
        sent.push([...results]);
        send(results);
    };
    const result = new Promise<ExecutionResult>((resolve, reject) => {
        connection.on((event) => {
            if (event.type === "closed") {
                reject(new Error(`closed: ${JSON.stringify(event)}`));
            }
        });
        const live: LiveTurnEngine = new LiveTurnEngine(connection, "google", {
            run: (text, pointed, words) =>
                controller.execute(text, {
                    via: "voice",
                    ...(pointed === undefined ? {} : { pointing: pointed }),
                    [LIVE_MESSAGE]: { engine: live, heard: words.heard, saved: words.saved },
                } as never),
            pointing: () => pointing,
            readerContext: (pointed) => facts.readerContext(pointed),
            close: () => {
                connection.close();
            },
            answered: resolve,
        });
    });

    connection.capture(true);
    await Promise.resolve();
    transport.speak(clipSamples(clip));
    transport.speak(new Float32Array(8_000));
    connection.capture(false);
    try {
        return { session, controller, result: await result, sent };
    } finally {
        connection.close();
    }
}

describe.skipIf(skipIfNoApiKey() || getLlmRegressionProvider() !== "google")(
    "a live conversation runs graphty's own tools on Google",
    () => {
        it("'make all the nodes red', spoken, paints every node in one undo step, saved as a voice message", async () => {
            const { session, controller, result } = await speakToAssistant("make-all-the-nodes-red.json");

            assert.notStrictEqual(result.code, "AI_PROVIDER_ERROR", JSON.stringify(result));
            assert.deepStrictEqual(redNodes(session, NODES), ["n1", "n2", "n3", "n4", "n5"], JSON.stringify(result));
            const reader = controller.getConversation()?.messages.find((message) => message.role === "reader");
            assert.strictEqual(reader?.role === "reader" ? reader.via : undefined, "voice");
            await session.undo();
            assert.deepStrictEqual(redNodes(session, NODES), [], "one undo takes the whole message back");
        });

        it("'make this one red' while pointing at n3 paints exactly n3, through reader_context", async () => {
            const { session, result, sent } = await speakToAssistant("make-this-one-red.json", {
                pointed: ["n3"],
                selected: [],
            });

            assert.deepStrictEqual(redNodes(session, NODES), ["n3"], JSON.stringify(result));
            const context = sent.flat().find((part) => part.content.includes("Pointed at"));
            assert.exists(context, `reader_context answered: ${JSON.stringify(sent)}`);
        });
    },
);
