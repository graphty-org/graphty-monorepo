/**
 * @file A later `enableAiControl` or `disableAiControl` supersedes an enable still settling: the
 * earlier call resolves without effect, so the assistant the reader asked for last is the one on.
 * An application that switches the assistant on again whenever a setting changes (the graphty app
 * does, for every tool switch) needs no ordering of its own.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

let mounted: Graphty | null = null;

/**
 * Mount a graphty-element.
 * @returns The element, settled.
 */
async function mount(): Promise<Graphty> {
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
    mounted?.disableAiControl();
    mounted?.remove();
    mounted = null;
});

/** A helper, so the enable that names it takes one more load before it builds anything. */
const COUNTER = { name: "counter", purpose: "Counts nodes.", commands: ["query"] };

describe("enableAiControl, superseded", () => {
    it("a disable while an enable is still loading leaves the assistant off", async () => {
        const element = await mount();

        const enabling = element.enableAiControl({ provider: "mock" });
        element.disableAiControl();
        await enabling;

        assert.isNull(element.getAiManager(), "no assistant was built after the disable");
        const result = await element.aiCommand("hello");
        assert.strictEqual(result.code, "AI_NOT_ENABLED");
    });

    it("an earlier enable that settles after a later one never replaces it", async () => {
        const element = await mount();

        // The first names a helper, which it checks in a module of its own first: the second,
        // started after it, gets to build before it.
        const first = element.enableAiControl({ provider: "mock", agents: [COUNTER] });
        const second = element.enableAiControl({ provider: "mock", history: "memory" });
        await Promise.all([first, second]);

        const result = await element.aiCommand("hello");
        assert.notStrictEqual(result.code, "AI_NOT_ENABLED");
        assert.isNotNull(element.getAiConversation(), "the second assistant, with history, is the one on");
    });
});
