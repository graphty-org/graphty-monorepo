/**
 * @file A test file's page is freed after it is removed, even under v8 coverage (issue #2247).
 *
 * Vitest runs each test file in its own iframe, and V8 precise coverage (`--coverage`) keeps every
 * removed iframe's heap alive. Over a long shard that heap made each storybook test about ten
 * times slower. `vitest.browser-coverage-setup.ts` at the repository root frees them once per test
 * file; this checks that it does, with a page made here standing in for a finished test file.
 */

import { assert, test } from "vitest";
import { cdp, server } from "vitest/browser";

import { releaseCoverageHeldPages } from "../../../vitest.browser-coverage-setup";

/** The DevTools protocol calls this test makes. */
interface Session {
    send(method: "Runtime.getHeapUsage"): Promise<{ usedSize: number }>;
    send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

const MB = 1024 * 1024;

/**
 * The page's used JS heap after a full garbage collection.
 * @param session - A DevTools protocol session on the test page.
 * @returns Used bytes.
 */
async function heapAfterCollection(session: Session): Promise<number> {
    await session.send("HeapProfiler.collectGarbage");

    return (await session.send("Runtime.getHeapUsage")).usedSize;
}

/** Load a page that holds about 100 MB of objects and functions, then remove it. */
async function loadAndRemoveAPage(): Promise<void> {
    const frame = document.createElement("iframe");
    const loaded = new Promise((resolve) => {
        frame.addEventListener("load", resolve, { once: true });
    });

    frame.srcdoc = "<script>window.kept = Array.from({ length: 1000000 }, (_, i) => ({ i, f: () => i }));</script>";
    // Out of mouse hit testing. Earlier test files leave the pointer wherever their real input put
    // it, and a frame the pointer is over becomes its parent's blink::EventHandler
    // last_mouse_move_event_subframe_, a strong pointer that removing the iframe does not clear
    // and only the next mouse event replaces. Held that way, the page outlives every collection
    // and this test fails with the whole page (about 72 MB) still in memory -- the failure of
    // issue #2871 that two heap snapshots traced to that field. A frame with no pointer events is
    // never a hit-test target, so it is never held there.
    frame.style.pointerEvents = "none";
    document.body.append(frame);
    await loaded;
    frame.remove();
}

test("a removed page is freed while v8 precise coverage is on", async () => {
    const session = cdp() as unknown as Session;
    const coverageWasOn = server.config.coverage.enabled;

    // Under --coverage Vitest has it on already; without, switch it on the way Vitest does.
    await session.send("Profiler.enable");
    await session.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true });

    try {
        const before = await heapAfterCollection(session);

        await loadAndRemoveAPage();

        const held = await heapAfterCollection(session);

        assert.isAbove(
            held - before,
            50 * MB,
            "V8 no longer keeps a removed page alive under precise coverage: vitest.browser-coverage-setup.ts " +
                "and this test can go",
        );

        await releaseCoverageHeldPages(session);

        const after = await heapAfterCollection(session);

        assert.isBelow(after - before, 10 * MB, "the removed page is still in memory");
    } finally {
        if (!coverageWasOn) {
            await session.send("Profiler.stopPreciseCoverage");
        }
    }
});
