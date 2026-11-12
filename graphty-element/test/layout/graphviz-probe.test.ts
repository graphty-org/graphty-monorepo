/**
 * @file The Graphviz availability probe keeps an answer, never a timeout: a probe whose Worker
 * was too slow to load the package on a busy machine says nothing about whether the package is
 * there, so the next ask probes again instead of reporting "unavailable" for the life of the page.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

/** The probe Workers spawned so far, in order; the test answers them when it chooses. */
const spawned: FakeWorker[] = [];

/** A Worker that answers only when the test tells it to. */
class FakeWorker extends EventTarget {
    constructor() {
        super();
        spawned.push(this);
    }

    postMessage(): void {
        // The request is ignored: the test decides when, and whether, this Worker answers.
    }

    terminate(): void {
        // Nothing to stop.
    }

    answer(ok: boolean): void {
        this.dispatchEvent(Object.assign(new Event("message"), { data: { ok } }));
    }
}

describe("probeGraphviz", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        spawned.length = 0;
    });

    it("probes again after a probe that timed out, instead of keeping the timeout", async () => {
        vi.useFakeTimers();
        vi.stubGlobal("Worker", FakeWorker);
        vi.resetModules();
        const { probeGraphviz } = await import("../../src/layout/graphviz/host");

        const first = probeGraphviz();
        assert.strictEqual(spawned.length, 1);
        // The slow machine: the Worker never answers within the probe's budget.
        await vi.runAllTimersAsync();
        assert.isFalse(await first);

        const second = probeGraphviz();
        assert.strictEqual(spawned.length, 2, "a timed-out probe is asked again");
        spawned[1].answer(true);
        assert.isTrue(await second);

        assert.isTrue(await probeGraphviz(), "and a real answer is kept");
        assert.strictEqual(spawned.length, 2);
    });
});
