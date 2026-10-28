/**
 * @file An assistant with no `voice`: a typed command emits no voice event, `aiTalk(true)` ends at
 * once with `AI_NOT_ENABLED` (before AI is enabled too), a release and `stopAiSpeech()` do nothing,
 * and `getAiVoiceSupport()` reports both directions unavailable.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, expect, it } from "vitest";

import type { Graphty } from "../../../index.js";

/** Every AI event the element dispatches, the voice ones included. */
const AI_EVENTS = [
    "ai-agent-end",
    "ai-agent-start",
    "ai-approval-requested",
    "ai-capability-unavailable",
    "ai-command-cancelled",
    "ai-command-complete",
    "ai-command-error",
    "ai-command-start",
    "ai-conversation-changed",
    "ai-export-ready",
    "ai-hosted-tool-result",
    "ai-pending-resolved",
    "ai-question-asked",
    "ai-status-change",
    "ai-stream-chunk",
    "ai-stream-tool-call",
    "ai-stream-tool-result",
    "ai-voice-start",
    "ai-voice-transcript",
    "ai-voice-end",
    "ai-voice-level",
    "ai-speech-start",
    "ai-speech-end",
] as const;

let mounted: Graphty | null = null;

/**
 * Mount a graphty-element that records every AI event it dispatches.
 * @returns The element, settled, and its events as `[type, detail]`.
 */
async function mount(): Promise<{ element: Graphty; events: [string, unknown][] }> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted = element;
    await element.waitForSettled();
    const events: [string, unknown][] = [];
    for (const type of AI_EVENTS) {
        element.addEventListener(type, (event) => events.push([type, (event as CustomEvent).detail]));
    }

    return { element, events };
}

afterEach(() => {
    mounted?.disableAiControl();
    mounted?.remove();
    mounted = null;
});

/** One direction of speech that cannot be used, without `voice`. */
const NONE = { path: "none", status: "unavailable", code: "AI_NOT_ENABLED", params: {}, destination: "none" } as const;

describe("an assistant without voice", () => {
    it("emits no voice event for a typed command", async () => {
        const { element, events } = await mount();
        await element.enableAiControl({ provider: "mock" });
        await element.aiCommand("hello");

        const types = [...new Set(events.map(([type]) => type))].sort();
        assert.notOk(
            types.some((type) => type.startsWith("ai-voice") || type.startsWith("ai-speech")),
            types.join(", "),
        );
        expect(types).toMatchSnapshot();
    });

    it("ends a press at once with AI_NOT_ENABLED, ignores a release and a stop, and reports no voice", async () => {
        const { element, events } = await mount();
        await element.enableAiControl({ provider: "mock" });
        element.aiTalk(true);
        element.aiTalk(false);
        element.stopAiSpeech();

        const voice = events.filter(([type]) => type.startsWith("ai-voice") || type.startsWith("ai-speech"));
        assert.deepStrictEqual(voice, [
            ["ai-voice-end", { type: "ai-voice-end", reason: "error", code: "AI_NOT_ENABLED", params: {} }],
        ]);
        assert.deepStrictEqual(await element.getAiVoiceSupport(), { input: NONE, output: NONE });
    });

    it("answers the same before the assistant is enabled", async () => {
        const { element, events } = await mount();
        element.aiTalk(true);
        element.stopAiSpeech();

        assert.deepStrictEqual(events, [
            ["ai-voice-end", { type: "ai-voice-end", reason: "error", code: "AI_NOT_ENABLED", params: {} }],
        ]);
        assert.deepStrictEqual(await element.getAiVoiceSupport(), { input: NONE, output: NONE });
    });
});
