/**
 * @file The provider-API engine's picture call, against recorded Gemini answers at `fetch`: the
 * request it sends, the picture it decodes, and the codes it fails with. No live call, no key.
 */

import { assert, describe, it } from "vitest";

import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import type { ProviderApiId } from "../../../src/ai/engine/types";
import { AI_IMAGE_MODELS } from "../../../src/catalog/ai";
import { RECORDED_DECLINED_ANSWER, RECORDED_IMAGE_ANSWER, RECORDED_PNG_BASE64, recordedFetch } from "./imageFixtures";

/**
 * An engine over a provider with a recorded fetch.
 * @param provider - The provider.
 * @param fetch - The fetch.
 * @param apiKey - The key; a stand-in when absent.
 * @returns The engine.
 */
function engine(provider: ProviderApiId, fetch: typeof globalThis.fetch, apiKey = "test-key"): ProviderApiEngine {
    return new ProviderApiEngine(() => ({ provider, apiKey, model: "any", fetch }));
}

describe("generateImage", () => {
    it("asks Gemini's image model for a picture and returns the picture it answers with", async () => {
        const recorded = recordedFetch(RECORDED_IMAGE_ANSWER);
        const google = engine("google", recorded.fetch);
        assert.deepStrictEqual(google.imageModel, AI_IMAGE_MODELS.google);

        const made = await google.generateImage!("a starry night", new AbortController().signal);

        assert.strictEqual(made.code, "AI_COMPLETED");
        const [request] = recorded.requests;
        assert.strictEqual(
            request.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
        );
        assert.strictEqual(request.headers["x-goog-api-key"], "test-key");
        assert.deepStrictEqual(request.body, {
            contents: [{ role: "user", parts: [{ text: "a starry night" }] }],
            generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
        });
        const image = made.code === "AI_COMPLETED" ? made.image : new Blob();
        assert.strictEqual(image.type, "image/png");
        const bytes = new Uint8Array(await image.arrayBuffer());
        assert.strictEqual(Buffer.from(bytes).toString("base64"), RECORDED_PNG_BASE64);
    });

    it("reports a declined prompt as AI_NO_RESPONSE, a refused key as AI_KEY_REJECTED, and sends nothing without a key", async () => {
        const declined = await engine("google", recordedFetch(RECORDED_DECLINED_ANSWER).fetch).generateImage!(
            "x",
            new AbortController().signal,
        );
        assert.deepStrictEqual(declined, { code: "AI_NO_RESPONSE", params: { provider: "google" } });

        const refused = await engine("google", recordedFetch({}, 403).fetch).generateImage!(
            "x",
            new AbortController().signal,
        );
        assert.deepStrictEqual(refused, { code: "AI_KEY_REJECTED", params: { provider: "google", status: 403 } });

        const unsent = recordedFetch(RECORDED_IMAGE_ANSWER);
        const missing = await engine("google", unsent.fetch, "").generateImage!("x", new AbortController().signal);
        assert.deepStrictEqual(missing, { code: "AI_KEY_MISSING", params: { provider: "google" } });
        assert.lengthOf(unsent.requests, 0);
    });

    it("is absent on a provider with no image model", () => {
        for (const provider of ["openai", "anthropic"] as const) {
            const other = engine(provider, recordedFetch({}).fetch);
            assert.notProperty(other, "generateImage", provider);
            assert.isUndefined(other.imageModel, provider);
        }
    });
});
