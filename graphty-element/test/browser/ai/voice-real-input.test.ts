/**
 * @file A page's own talk button, held for real: wired as the AI guide's simple path wires it
 * (`pointerdown` / `pointerup` and Space on the button call `aiTalk`), holding it with the real
 * mouse, or holding Space on it, sends exactly one command with what the recognizer heard, and
 * the microphone is closed after release. A button that latches on a click ends each press when
 * the speaker stops, press after press, and the recognizer starts only once the page's own
 * microphone request has opened. The recognizer is a fake that hears a fixed sentence and then
 * the end of speech; the microphone is Chromium's fake device (vitest.config.ts).
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../../index.js";
import { FakeRecognition } from "../../helpers/fake-speech";
import { press, release } from "../../helpers/real-input";

const HEARD = "how many nodes are there";

let element: Graphty;
let talk: HTMLButtonElement;
/** Every command the element started, by its input. */
let commands: string[];
/** Every recognizer started. */
let recognizers: FakeRecognition[];
/** Every microphone stream the page opened. */
let streams: MediaStream[];
/** How many streams had opened when each recognizer started. */
let streamsAtStart: number[];

beforeEach(async () => {
    recognizers = [];
    streams = [];
    streamsAtStart = [];
    // A recognizer that hears one sentence as soon as it starts, then the speaker stop.
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal(
        "webkitSpeechRecognition",
        class extends FakeRecognition {
            constructor() {
                super(false, recognizers);
            }

            override start(): void {
                streamsAtStart.push(streams.length);
                super.start();
                queueMicrotask(() => {
                    this.hear(HEARD, true);
                    this.onspeechend?.();
                });
            }
        },
    );
    const open = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockImplementation(async (constraints) => {
        const stream = await open(constraints);
        streams.push(stream);
        return stream;
    });

    element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    document.body.appendChild(element);
    await element.waitForSettled();
    await element.enableAiControl({ toolset: "generated", provider: "mock", voice: {} });
    commands = [];
    element.addEventListener("ai-command-start", (event) => {
        commands.push((event as CustomEvent<{ input: string }>).detail.input);
    });

    // The guide's talk button.
    talk = document.createElement("button");
    talk.textContent = "Talk";
    talk.style.cssText = "display:block;width:120px;height:40px";
    talk.onpointerdown = (event) => {
        talk.setPointerCapture(event.pointerId);
        element.aiTalk(true);
    };
    talk.onpointerup = talk.onpointercancel = () => {
        element.aiTalk(false);
    };
    talk.onkeydown = (event) => {
        if (event.key === " " && !event.repeat) {
            element.aiTalk(true);
        }
    };
    talk.onkeyup = (event) => {
        if (event.key === " ") {
            element.aiTalk(false);
        }
    };
    document.body.appendChild(talk);
});

afterEach(() => {
    element.disableAiControl();
    element.remove();
    talk.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/**
 * Wait until the recognizer is listening and the microphone is open.
 */
async function listening(): Promise<void> {
    await vi.waitFor(() => {
        assert.lengthOf(recognizers, 1, "a recognizer started");
        assert.lengthOf(streams, 1, "the microphone opened");
    });
}

/**
 * After release: exactly one command with what was heard, and every microphone track ended.
 */
async function sentOnce(): Promise<void> {
    await vi.waitFor(() => {
        assert.deepStrictEqual(commands, [HEARD]);
    });
    await vi.waitFor(() => {
        const live = streams.flatMap((stream) => stream.getTracks()).filter((track) => track.readyState === "live");
        assert.lengthOf(live, 0, "the microphone closed");
    });
    assert.deepStrictEqual(commands, [HEARD], "exactly one command");
}

describe("a talk button held for real", () => {
    it("held with the mouse, sends one command with what was heard", async () => {
        const middle = { x: 60, y: 20 };
        await press(talk, middle);
        await listening();
        assert.lengthOf(commands, 0, "nothing is sent while talk is held");
        await release(talk, middle);
        await sentOnce();
    });

    it("held with Space, sends one command with what was heard", async () => {
        talk.focus();
        await userEvent.keyboard("[Space>]");
        await listening();
        assert.lengthOf(commands, 0, "nothing is sent while talk is held");
        await userEvent.keyboard("[/Space]");
        await sentOnce();
    });
});

describe("a talk button that latches on a click", () => {
    it("each click listens until the speaker stops, and sends what was heard, press after press", async () => {
        const latch = document.createElement("button");
        latch.textContent = "Talk once";
        latch.style.cssText = "display:block;width:120px;height:40px";
        latch.onclick = () => {
            element.aiTalk(true, { endOnSilence: true });
        };
        document.body.appendChild(latch);
        try {
            for (const sent of [1, 2]) {
                await userEvent.click(latch);
                await vi.waitFor(() => {
                    assert.lengthOf(commands, sent, "the press ended on its own and sent");
                });
                await vi.waitFor(() => {
                    assert.isFalse(element.isAiTalking());
                });
            }

            assert.deepStrictEqual(commands, [HEARD, HEARD]);
            assert.deepStrictEqual(streamsAtStart, [1, 2], "each recognizer started after its press's stream opened");
            const live = streams.flatMap((stream) => stream.getTracks()).filter((track) => track.readyState === "live");
            assert.lengthOf(live, 0, "the microphone closed");
        } finally {
            latch.remove();
        }
    });
});
