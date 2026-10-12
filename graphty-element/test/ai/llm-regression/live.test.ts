/**
 * A live conversation with the provider, for real (paid; Google only for now): graphty mints a
 * token with the key, the realtime adapter opens a WebSocket from Node over a fake audio stack,
 * and the committed clip, resampled to 16 kHz, is streamed while talk is held.
 * @module test/ai/llm-regression/live.test
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { LiveEvent } from "../../../src/ai/engine/types";
import { installFakeLiveTransport, wavSamples } from "../../helpers/fake-live-transport";
import {
    getLlmRegressionApiKey,
    getLlmRegressionModel,
    getLlmRegressionProvider,
    skipIfNoApiKey,
} from "../../helpers/llm-regression-env";

const FIXTURE = new URL("fixtures/voice/make-all-the-nodes-red.json", import.meta.url);
const { clip, expectedWords } = JSON.parse(readFileSync(FIXTURE, "utf8")) as {
    clip: string;
    expectedWords: string[];
};

/** Counts each request, as the harness does, so the run reports what it cost. */
function counted(): void {
    const counter = globalThis as { __LLM_REGRESSION_API_CALLS__?: number };
    counter.__LLM_REGRESSION_API_CALLS__ = (counter.__LLM_REGRESSION_API_CALLS__ ?? 0) + 1;
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
