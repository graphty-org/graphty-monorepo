/**
 * @file Reviewing a transcript, for real: with `voice.review` a finished press of a real talk button
 * sends nothing. The press's one final `ai-voice-transcript` carries the text and what the reader
 * pointed at, for the page to send with `aiCommand`. The recognizer is a fake that hears a fixed
 * sentence; the microphone is Chromium's fake device (vitest.config.ts). `voice-real-input.test.ts`
 * keeps the default, a press that sends on release.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import type { AiVoiceTranscriptEvent } from "../../../src/events";
import { FakeRecognition } from "../../helpers/fake-speech";
import { press, release } from "../../helpers/real-input";

const HEARD = "color these red";

let element: Graphty;
let talk: HTMLButtonElement;
let commands: string[];
let transcripts: AiVoiceTranscriptEvent[];
let recognizers: FakeRecognition[];

/**
 * An element on the page.
 * @param features - Its experiments.
 * @returns It, settled.
 */
async function mount(features: readonly string[]): Promise<Graphty> {
    const made = document.createElement("graphty-element");
    made.style.cssText = "display:block;width:400px;height:300px";
    made.features = [...features];
    document.body.appendChild(made);
    await made.waitForSettled();
    return made;
}

beforeEach(() => {
    recognizers = [];
    commands = [];
    transcripts = [];
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal(
        "webkitSpeechRecognition",
        class extends FakeRecognition {
            constructor() {
                super(false, recognizers);
            }

            override start(): void {
                super.start();
                queueMicrotask(() => {
                    this.hear(HEARD, true);
                });
            }
        },
    );
});

afterEach(() => {
    element.disableAiControl();
    element.remove();
    talk?.remove();
    vi.unstubAllGlobals();
});

describe("voice.review", () => {
    beforeEach(async () => {
        element = await mount(["assistant"]);
        await element.enableAiControl({ toolset: "generated", provider: "mock", voice: { review: true } });
        element.addEventListener("ai-command-start", (event) => {
            commands.push((event as CustomEvent<{ input: string }>).detail.input);
        });
        element.addEventListener("ai-voice-transcript", (event) => {
            transcripts.push(event.detail);
        });
        talk = document.createElement("button");
        talk.textContent = "Talk";
        talk.style.cssText = "display:block;width:120px;height:40px";
        talk.onpointerdown = () => {
            element.aiTalk(true);
        };
        talk.onpointerup = () => {
            element.aiTalk(false);
        };
        document.body.appendChild(talk);
    });

    it("sends nothing on release, and its one final transcript carries the text and the pointing", async () => {
        const middle = { x: talk.offsetWidth / 2, y: talk.offsetHeight / 2 };
        await press(talk, middle);
        await vi.waitFor(() => {
            assert.lengthOf(recognizers, 1, "a recognizer started");
        });
        await release(talk, middle);

        const final = await vi.waitFor(() => {
            const found = transcripts.filter((transcript) => transcript.isFinal);
            assert.lengthOf(found, 1, "one final transcript");
            return found[0];
        });
        assert.strictEqual(final.transcript, HEARD);
        assert.deepEqual(final.pointing, { pointed: [], selected: [] });
        assert.deepEqual(commands, [], "nothing was sent");

        await element.aiCommand(final.transcript, {
            via: "voice",
            ...(final.pointing === undefined ? {} : { pointing: final.pointing }),
        });
        assert.deepEqual(commands, [HEARD], "the page sends it");
    });
});

describe("voice.review refused", () => {
    it("rejects with E_FEATURE_OFF while the experiment is off", async () => {
        element = await mount([]);
        const refused = await element
            .enableAiControl({ toolset: "generated", provider: "mock", voice: { review: true } })
            .catch((error: unknown) => error as { code: string; details: unknown });
        assert.strictEqual((refused as { code: string }).code, "E_FEATURE_OFF");
        assert.deepEqual((refused as { details: unknown }).details, { feature: "assistant", key: "voice.review" });
    });

    it("rejects a live conversation, whose words cannot wait", async () => {
        element = await mount(["assistant"]);
        const refused = await element
            .enableAiControl({ toolset: "generated", provider: "mock", voice: { review: true, mode: "live" } })
            .catch((error: unknown) => error as { params: unknown });
        assert.deepEqual((refused as { params: unknown }).params, { field: "voice.review", reason: "needs-turns" });
    });
});
