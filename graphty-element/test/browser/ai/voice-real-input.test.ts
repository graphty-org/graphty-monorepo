/**
 * @file A page's own talk button, held for real: wired as the AI guide's simple path wires it
 * (`pointerdown` / `pointerup` and Space on the button call `aiTalk`), holding it with the real
 * mouse, or holding Space on it, sends exactly one command with what the recognizer heard, and
 * the microphone is closed after release. The recognizer is a fake that hears a fixed sentence;
 * the microphone is Chromium's fake device (vitest.config.ts).
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

beforeEach(async () => {
    recognizers = [];
    streams = [];
    // A recognizer that hears one sentence as soon as it starts.
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
    await element.enableAiControl({ provider: "mock", voice: {} });
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
