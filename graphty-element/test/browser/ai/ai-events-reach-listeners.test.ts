/**
 * @file The AI events reach a consumer, through the element's own event channels.
 *
 * The element declares eleven `ai-*` events. The controller that emits them was built without
 * an emitter, and `addListener` threw "Unknown event type" for every one of them, so a consumer
 * listening for progress, streamed text or errors heard nothing. These tests enable AI the way a
 * consumer does -- `enableAiControl` on a mounted `<graphty-element>` -- and listen the two ways
 * a consumer can: `addListener` and a DOM `addEventListener`.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import type { EventType } from "../../../src/events";

/** How long the element needs to connect and finish its first update. */
const ELEMENT_READY_MS = 300;

let mounted: Graphty | null = null;
let savedRecognition: Window["SpeechRecognition"];

/**
 * Mount a graphty-element with AI enabled on the mock provider.
 * @returns the element
 */
async function mountWithAi(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted = element;

    await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));
    await element.enableAiControl({ provider: "mock" });

    return element;
}

/**
 * Record every event of the given types, through both of a consumer's routes.
 * @param element - The element to listen on.
 * @param types - The event types.
 * @returns What `addListener` heard and what the DOM heard, in arrival order.
 */
function listen(element: Graphty, types: EventType[]): { api: string[]; dom: string[] } {
    const heard = { api: [] as string[], dom: [] as string[] };

    for (const type of types) {
        element.addListener(type, (event) => {
            heard.api.push(event.type);
        });
        element.addEventListener(type, (event) => {
            heard.dom.push(event.type);
        });
    }

    return heard;
}

afterEach(() => {
    mounted?.remove();
    mounted = null;
    window.SpeechRecognition = savedRecognition;
});

describe("AI events", () => {
    it("reach addListener and the DOM when a command runs", async () => {
        const element = await mountWithAi();
        const heard = listen(element, ["ai-command-start", "ai-status-change", "ai-command-complete"]);

        await element.aiCommand("hello");

        for (const route of ["api", "dom"] as const) {
            assert.include(heard[route], "ai-command-start", `${route} heard the command start`);
            assert.include(heard[route], "ai-status-change", `${route} heard the status change`);
            assert.include(heard[route], "ai-command-complete", `${route} heard the command complete`);
        }
    });

    it("reach listeners for voice input start, transcript and end", async () => {
        /** A stand-in for the browser's speech recogniser, driven by the test. */
        class FakeRecognition {
            static last: FakeRecognition | null = null;
            continuous = false;
            interimResults = true;
            lang = "en-US";
            onresult: ((event: unknown) => void) | null = null;
            onerror: ((event: unknown) => void) | null = null;
            onend: (() => void) | null = null;
            onstart: (() => void) | null = null;

            /** Start listening. */
            start(): void {
                FakeRecognition.last = this;
                this.onstart?.();
            }

            /** Stop listening. */
            stop(): void {
                this.onend?.();
            }

            /** Abort listening. */
            abort(): void {
                this.onend?.();
            }
        }

        savedRecognition = window.SpeechRecognition;
        window.SpeechRecognition = FakeRecognition as unknown as Window["SpeechRecognition"];

        const element = await mountWithAi();
        const heard = listen(element, ["ai-voice-start", "ai-voice-transcript", "ai-voice-end"]);

        assert.isTrue(element.startVoiceInput());
        const recognition = FakeRecognition.last;
        assert.isNotNull(recognition);

        const result = Object.assign([{ transcript: "show me the hubs", confidence: 1 }], { isFinal: true });
        recognition.onresult?.({ resultIndex: 0, results: [result] });

        element.stopVoiceInput();

        for (const route of ["api", "dom"] as const) {
            assert.deepStrictEqual(
                heard[route],
                ["ai-voice-start", "ai-voice-transcript", "ai-voice-end"],
                `${route} heard the voice session, once each`,
            );
        }
    });
});
