/**
 * @file Each `startVoiceInput` session's `onTranscript` hears only that session.
 *
 * The element keeps one voice adapter for the life of the graph. A session's `onTranscript` was
 * added to it and never removed, so every later session also called every earlier session's
 * callback (issue #6842). A session also defaulted recognition to `"en-US"` instead of leaving the
 * browser to use the page's language.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";

/** A stand-in for the browser's speech recognizer, driven by the test. */
class FakeRecognition {
    static all: FakeRecognition[] = [];
    continuous = false;
    interimResults = true;
    lang = "";
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    onstart: (() => void) | null = null;

    /** Start listening. */
    start(): void {
        FakeRecognition.all.push(this);
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

    /**
     * Deliver one final result.
     * @param transcript - What was heard.
     */
    hear(transcript: string): void {
        const result = Object.assign([{ transcript, confidence: 1 }], { isFinal: true });
        this.onresult?.({ resultIndex: 0, results: [result] });
    }
}

let mounted: Graphty | null = null;
const savedRecognition = window.SpeechRecognition;

/**
 * Mount a graphty-element over the fake recognizer.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    FakeRecognition.all = [];
    window.SpeechRecognition = FakeRecognition as unknown as Window["SpeechRecognition"];
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted = element;
    await element.waitForSettled();
    return element;
}

afterEach(() => {
    mounted?.remove();
    mounted = null;
    window.SpeechRecognition = savedRecognition;
});

describe("startVoiceInput", () => {
    it("calls only the running session's onTranscript, after a stop and after a restart", async () => {
        const element = await mount();
        const first = vi.fn();
        const second = vi.fn();
        const third = vi.fn();

        assert.isTrue(element.startVoiceInput({ onTranscript: first }));
        FakeRecognition.all[0].hear("one");
        element.stopVoiceInput();

        assert.isTrue(element.startVoiceInput({ onTranscript: second }));
        FakeRecognition.all[1].hear("two");

        // Started again without a stop: the new session replaces the running one.
        assert.isTrue(element.startVoiceInput({ onTranscript: third }));
        FakeRecognition.all[2].hear("three");

        assert.deepStrictEqual(first.mock.calls, [["one", true]]);
        assert.deepStrictEqual(second.mock.calls, [["two", true]]);
        assert.deepStrictEqual(third.mock.calls, [["three", true]]);
    });

    it("drops a session's onTranscript when the recognizer ends on its own", async () => {
        const element = await mount();
        const callback = vi.fn();

        element.startVoiceInput({ onTranscript: callback });
        const [recognition] = FakeRecognition.all;
        recognition.onend?.();
        recognition.hear("late");

        assert.strictEqual(callback.mock.calls.length, 0);
    });

    it("leaves the language to the page unless one is given", async () => {
        const element = await mount();

        element.startVoiceInput();
        element.startVoiceInput({ language: "de-DE" });

        assert.deepStrictEqual(
            FakeRecognition.all.map((recognition) => recognition.lang),
            ["", "de-DE"],
        );
    });
});
