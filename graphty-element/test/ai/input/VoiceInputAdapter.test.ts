/**
 * VoiceInputAdapter Tests - Tests for voice input adapter, over a fake Web Speech API.
 * @module test/ai/input/VoiceInputAdapter.test
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { InputCallback } from "../../../src/ai/input/types";
import { VoiceInputAdapter } from "../../../src/ai/input/VoiceInputAdapter";
import { type FakeSpeech, flushMicrotasks, installFakeSpeech } from "../../helpers/fake-speech";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("VoiceInputAdapter", () => {
    it("has type 'voice' and starts inactive", () => {
        installFakeSpeech();
        const adapter = new VoiceInputAdapter();
        assert.strictEqual(adapter.type, "voice");
        assert.strictEqual(adapter.isActive, false);
    });

    describe("without the Web Speech API", () => {
        it("is unsupported, and start and stop do nothing", () => {
            installFakeSpeech({ recognition: "absent" });
            const adapter = new VoiceInputAdapter();
            assert.strictEqual(adapter.isSupported, false);
            adapter.start();
            assert.strictEqual(adapter.isActive, false);
            adapter.stop();
            assert.strictEqual(adapter.isActive, false);
        });
    });

    describe("with the Web Speech API", () => {
        /**
         * A started adapter over a fake recognizer.
         * @param options - The adapter's start options.
         * @returns The adapter and the fake page.
         */
        async function started(
            options?: Parameters<VoiceInputAdapter["start"]>[0],
        ): Promise<{ adapter: VoiceInputAdapter; speech: FakeSpeech }> {
            const speech = installFakeSpeech();
            const adapter = new VoiceInputAdapter();
            assert.strictEqual(adapter.isSupported, true);
            adapter.start(options);
            await flushMicrotasks();
            return { adapter, speech };
        }

        it("start sets isActive once the recognizer starts", async () => {
            const { adapter } = await started();
            assert.strictEqual(adapter.isActive, true);
        });

        it("passes the start options to the recognizer", async () => {
            const { speech } = await started({ continuous: true, interimResults: false, language: "de-DE" });
            const [recognizer] = speech.recognizers;
            assert.strictEqual(recognizer.continuous, true);
            assert.strictEqual(recognizer.interimResults, false);
            assert.strictEqual(recognizer.lang, "de-DE");
        });

        it("leaves the recognizer's language unset without one, so the page's language is used", async () => {
            const { speech } = await started();
            assert.strictEqual(speech.recognizers[0].lang, "");
        });

        it("a removed input callback hears nothing more, and the others still do", async () => {
            const { adapter, speech } = await started();
            const removed = vi.fn<InputCallback>();
            const kept = vi.fn<InputCallback>();
            const off = adapter.onInput(removed);
            adapter.onInput(kept);

            off();
            speech.recognizers[0].hear("hello", true);

            assert.strictEqual(removed.mock.calls.length, 0);
            assert.deepStrictEqual(kept.mock.calls, [["hello", true]]);
        });

        it("hands every registered callback what the recognizer heard, interim and final", async () => {
            const { adapter, speech } = await started();
            const one = vi.fn<InputCallback>();
            const two = vi.fn<InputCallback>();
            adapter.onInput(one);
            adapter.onInput(two);

            speech.recognizers[0].hear("hello", false);
            speech.recognizers[0].hear("hello world", true);

            const heard = [
                ["hello", false],
                ["hello world", true],
            ];
            assert.deepStrictEqual(one.mock.calls, heard);
            assert.deepStrictEqual(two.mock.calls, heard);
        });

        it("stop sets isActive to false and stops the recognizer", async () => {
            const { adapter, speech } = await started();
            adapter.stop();
            assert.strictEqual(adapter.isActive, false);
            assert.strictEqual(speech.recognizers[0].stopCalls, 1);
        });

        it("the recognizer ending on its own sets isActive to false", async () => {
            const { adapter, speech } = await started();
            const active = vi.fn();
            adapter.onActiveChange(active);
            speech.recognizers[0].onend?.();
            assert.strictEqual(adapter.isActive, false);
            assert.deepStrictEqual(active.mock.calls, [[false, "timeout"]]);
        });

        it("dispose stops, and no callback hears anything after", async () => {
            const { adapter, speech } = await started();
            const callback = vi.fn<InputCallback>();
            adapter.onInput(callback);
            const [recognizer] = speech.recognizers;

            adapter.dispose();
            adapter.dispose();
            recognizer.hear("too late", true);

            assert.strictEqual(adapter.isActive, false);
            assert.strictEqual(recognizer.stopCalls, 1, "a second dispose stops nothing more");
            assert.strictEqual(callback.mock.calls.length, 0);
        });
    });
});
