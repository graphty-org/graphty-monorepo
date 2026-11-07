/**
 * The catalog's voice table (`AI_VOICE_CAPABILITIES`, in `./catalog`, which may not import
 * TanStack) against the models each TanStack adapter knows: every transcription and speech model
 * the catalog names must be in the adapter's own list, or the default would ask the API for a model
 * the adapter was never built for. The lists are read from each adapter's `model-meta.js` (plain
 * data, no imports) in a VM context, as capabilities.test.ts reads the chat models.
 * @module test/ai/engine/tanstack/voice-models.test
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { assert, describe, it } from "vitest";

import { AI_VOICE_CAPABILITIES, type AiProviderId, type AiProviderVoice } from "../../../../src/catalog/ai";

/**
 * Model lists from an adapter's model-meta.
 * @param pkg - The adapter package.
 * @param lists - The names of the lists.
 * @returns Each list, by name.
 */
function modelLists(pkg: string, lists: readonly string[]): Record<string, string[]> {
    const file = join(dirname(fileURLToPath(import.meta.resolve(pkg))), "model-meta.js");
    const source = readFileSync(file, "utf8").replace(/^export \{[^}]*\};?\s*$/m, "");
    return runInNewContext(`${source}\n({ ${lists.join(", ")} });`) as Record<string, string[]>;
}

const OPENAI = modelLists("@tanstack/ai-openai", ["OPENAI_TRANSCRIPTION_MODELS", "OPENAI_TTS_MODELS"]);
const GEMINI = modelLists("@tanstack/ai-gemini", ["GEMINI_TTS_MODELS"]);

/** The models each provider's adapters know, per direction; a provider absent here has no adapter. */
const ADAPTER_MODELS: Partial<Record<AiProviderId, { transcription?: string[]; speech?: string[] }>> = {
    openai: { transcription: OPENAI.OPENAI_TRANSCRIPTION_MODELS, speech: OPENAI.OPENAI_TTS_MODELS },
    // `GeminiTTSModels`; Gemini transcribes on the chat model, so it has no transcription list.
    google: { speech: GEMINI.GEMINI_TTS_MODELS },
};

/**
 * Every model a voice table names that the adapters do not know.
 * @param table - The voice table.
 * @returns One "provider direction model" line per unknown model.
 */
function unknownModels(table: Readonly<Record<AiProviderId, AiProviderVoice>>): string[] {
    return Object.entries(table).flatMap(([provider, voice]) =>
        (["transcription", "speech"] as const).flatMap((direction) => {
            const { model } = voice[direction];
            const known = ADAPTER_MODELS[provider as AiProviderId]?.[direction] ?? [];
            return model !== undefined && !known.includes(model) ? [`${provider} ${direction} ${model}`] : [];
        }),
    );
}

describe("the catalog's voice models against TanStack's model lists", () => {
    it("reads the adapters' lists", () => {
        assert.include(OPENAI.OPENAI_TRANSCRIPTION_MODELS, "whisper-1");
        assert.include(OPENAI.OPENAI_TTS_MODELS, "tts-1");
        assert.isNotEmpty(GEMINI.GEMINI_TTS_MODELS);
    });

    it("names only models the adapters know", () => {
        assert.deepEqual(unknownModels(AI_VOICE_CAPABILITIES), []);
    });

    it("names a model wherever it says available, except where the chat model transcribes", () => {
        const unnamed = Object.entries(AI_VOICE_CAPABILITIES).flatMap(([provider, voice]) => [
            ...(voice.transcription.status === "available" &&
            voice.transcription.model === undefined &&
            voice.transcription.viaChatModel !== true
                ? [`${provider} transcription`]
                : []),
            ...(voice.speech.status === "available" && voice.speech.model === undefined ? [`${provider} speech`] : []),
        ]);
        assert.deepEqual(unnamed, []);
    });

    it("refuses a planted model no adapter knows, and one on a provider with no adapter", () => {
        const planted = {
            ...AI_VOICE_CAPABILITIES,
            openai: { ...AI_VOICE_CAPABILITIES.openai, speech: { status: "available", model: "tts-9" } },
            anthropic: { ...AI_VOICE_CAPABILITIES.anthropic, transcription: { status: "available", model: "ears-1" } },
        } as const;
        assert.deepEqual(unknownModels(planted).sort(), ["anthropic transcription ears-1", "openai speech tts-9"]);
    });
});
