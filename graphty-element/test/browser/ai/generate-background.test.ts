/**
 * @file The assistant makes a background picture from a prompt: the reader is asked about the cost
 * before the provider is called, the picture is decoded and scaled to the device's texture limit in
 * the browser and set as a skybox, and one undo brings the previous background back. The provider
 * is Gemini's API, answered by a recorded response at `fetch`: no live call, no key.
 */

import { assert, describe, it } from "vitest";

import { ProviderApiEngine } from "../../../src/ai/engine/ProviderApiEngine";
import { AI_IMAGE_MODELS } from "../../../src/catalog/ai";
import type { AiApprovalRequest } from "../../../src/events";
import { RECORDED_IMAGE_ANSWER, recordedFetch } from "../../ai/engine/imageFixtures";
import { assistantSession, ScriptedAssistant, textTurn } from "../../helpers/assistant";

const GENERATE = { tool: "project", args: { action: "generate_background", prompt: "a starry night" } };

/**
 * An assistant whose provider makes pictures through Gemini's API, answered by the recording.
 * @param maxTextureSize - The device's texture limit; absent, no renderer reports one.
 * @returns The assistant, its session and the requests the provider was sent.
 */
async function geminiAssistant(maxTextureSize?: number): Promise<{
    assistant: ScriptedAssistant;
    session: Awaited<ReturnType<typeof assistantSession>>;
    requests: ReturnType<typeof recordedFetch>["requests"];
}> {
    const session = await assistantSession();
    const assistant = new ScriptedAssistant(session, {
        ...(maxTextureSize === undefined ? {} : { graph: { engine: { getCaps: () => ({ maxTextureSize }) } } }),
    });
    const recorded = recordedFetch(RECORDED_IMAGE_ANSWER);
    const gemini = new ProviderApiEngine(() => ({
        provider: "google",
        apiKey: "test-key",
        model: "gemini-3.8-flash",
        fetch: recorded.fetch,
    }));
    Object.assign(assistant.engine, { imageModel: gemini.imageModel, generateImage: gemini.generateImage });
    return { assistant, session, requests: recorded.requests };
}

/**
 * Generate, approve the cost, and let the model answer.
 * @param assistant - The assistant.
 * @returns The approval request, and the action's result.
 */
async function generateApproved(
    assistant: ScriptedAssistant,
): Promise<{ request: AiApprovalRequest; result: { code: string; params: Record<string, unknown> } }> {
    const { events } = await assistant.say("give this graph a starry night background", [GENERATE]);
    const asked = events.find((event) => event.type === "ai-approval-requested");
    assert.exists(asked, "the cost is put to the reader first");
    const request = asked.type === "ai-approval-requested" ? asked.request : ({} as AiApprovalRequest);
    assistant.engine.push(textTurn("Done."));
    await assistant.controller.resolveAiApproval(request.id, { approve: true });
    return { request, result: assistant.lastResults()[0] };
}

describe("project generate_background", () => {
    it("states the provider and cost before calling, then sets the recorded picture as a skybox", async () => {
        const { assistant, session, requests } = await geminiAssistant();
        const { events } = await assistant.say("give this graph a starry night background", [GENERATE]);
        const asked = events.find((event) => event.type === "ai-approval-requested");
        assert.exists(asked);
        if (asked.type !== "ai-approval-requested") {
            return;
        }

        assert.strictEqual(asked.request.gate, "paid");
        const google = AI_IMAGE_MODELS.google!;
        // The provider is the engine's: the scripted engine stands in for Google's turns.
        const provider = assistant.engine.providerName;
        assert.deepInclude(asked.request.preview, { provider, model: google.id, costUsd: google.costUsd });
        assert.lengthOf(requests, 0, "nothing is sent before the reader approves the cost");

        assistant.engine.push(textTurn("Done."));
        await assistant.controller.resolveAiApproval(asked.request.id, { approve: true });

        assert.lengthOf(requests, 1);
        const [result] = assistant.lastResults();
        assert.strictEqual(result.code, "AI_OK", JSON.stringify(result));
        assert.deepInclude(result.params, { model: google.id, provider, width: 64, height: 36, scaled: false });
        const { background } = session.config;
        assert.strictEqual(background.backgroundType, "skybox");
        const data = background.backgroundType === "skybox" ? background.data : "";
        assert.match(data, /^data:image\/png;base64,/);
        assert.strictEqual(result.params.bytes, data.length, "the size the project stores is reported");
    });

    it("scales an image larger than the device's texture limit down to it", async () => {
        const { assistant, session } = await geminiAssistant(32);
        const { result } = await generateApproved(assistant);

        assert.deepInclude(result.params, { width: 32, height: 18, scaled: true });
        const { background } = session.config;
        const image = new Image();
        image.src = background.backgroundType === "skybox" ? background.data : "";
        await image.decode();
        assert.deepStrictEqual([image.naturalWidth, image.naturalHeight], [32, 18]);
    });

    it("one undo restores the previous background", async () => {
        const { assistant, session } = await geminiAssistant();
        await session.config.set({ background: { backgroundType: "color", color: "#203040" } });
        const before = JSON.stringify(session.config.background);
        await generateApproved(assistant);
        assert.strictEqual(session.config.background.backgroundType, "skybox");

        await session.undo();

        assert.strictEqual(JSON.stringify(session.config.background), before);
    });

    it("reports a provider with no image model as a code naming the shader alternative, changing nothing", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const before = JSON.stringify(session.config.background);
        const steps = session.history.position;

        const { events } = await assistant.say("give this graph a starry night background", [GENERATE]);

        assert.isUndefined(events.find((event) => event.type === "ai-approval-requested"));
        const [result] = assistant.lastResults();
        assert.strictEqual(result.code, "AI_NOT_AVAILABLE");
        assert.deepInclude(result.params, {
            name: "generate_background",
            requirement: "image-model",
            alternative: "shaders",
        });
        assert.strictEqual(session.history.position, steps);
        assert.strictEqual(JSON.stringify(session.config.background), before);
    });
});
