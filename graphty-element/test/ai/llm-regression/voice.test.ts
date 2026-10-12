/**
 * Voice on the provider, for real: a committed clip transcribed by the chat model, and a sentence
 * spoken by the provider's speech model, through the provider-API engine (paid; Google by default).
 * @module test/ai/llm-regression/voice
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
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

/**
 * The provider-API engine on the regression provider and model.
 * @returns The engine.
 */
function engine(): ProviderApiEngine {
    return new ProviderApiEngine(() => ({
        provider: getLlmRegressionProvider(),
        apiKey: getLlmRegressionApiKey(),
        model: getLlmRegressionModel(),
    }));
}

describe.skipIf(skipIfNoApiKey())("voice through the provider", () => {
    const voice = engine();

    it.skipIf(!("transcribe" in voice))(
        "transcribes the committed clip into text holding every expected word",
        async () => {
            const audio = new Blob([readFileSync(new URL(`fixtures/voice/${clip}`, import.meta.url))], {
                type: "audio/wav",
            });
            counted();
            const heard = await voice.transcribe?.(audio, { language: "en-US" }, new AbortController().signal);
            assert.strictEqual(heard?.code, "AI_COMPLETED", JSON.stringify(heard));
            const words = (heard?.code === "AI_COMPLETED" ? heard.text : "").toLowerCase().match(/[a-z]+/g) ?? [];
            for (const word of expectedWords) {
                assert.include(words, word, `"${word}" is in the transcript`);
            }
        },
    );

    it.skipIf(!("speak" in voice))("speaks a fixed sentence as a WAV file with a non-empty data chunk", async () => {
        counted();
        const said = await voice.speak?.("Two hubs hold the network together.", {}, new AbortController().signal);
        assert.strictEqual(said?.code, "AI_COMPLETED", JSON.stringify(said));
        const audio = said?.code === "AI_COMPLETED" ? said.audio : new Blob();
        const bytes = new Uint8Array(await audio.arrayBuffer());
        const view = new DataView(bytes.buffer);
        const ascii = (at: number): string => String.fromCharCode(...bytes.subarray(at, at + 4));
        if (getLlmRegressionProvider() === "google") {
            assert.strictEqual(audio.type, "audio/wav");
            assert.strictEqual(ascii(0), "RIFF");
            assert.strictEqual(ascii(8), "WAVE");
            // The chunks after the header, to the data chunk.
            let at = 12;
            while (at + 8 <= bytes.length && ascii(at) !== "data") {
                at += 8 + view.getUint32(at + 4, true);
            }

            assert.strictEqual(ascii(at), "data", "the file has a data chunk");
            assert.isAbove(view.getUint32(at + 4, true), 0, "the data chunk holds samples");
        } else {
            assert.isAbove(bytes.length, 0);
        }
    });
});
