/**
 * @file Lets each test file's page be garbage collected while v8 coverage is on (issue #2247).
 *
 * Vitest's browser mode runs every test file in a fresh iframe of one long-lived page, and with
 * `--coverage` it switches V8 precise coverage on once for the whole session. While precise
 * coverage is on, V8 keeps every function's feedback vector in a list of its own so it can count
 * calls, and that list keeps the heap of the iframe that made them alive after the iframe is
 * removed. So every test file's page stays in memory for the rest of the run (about 25 MB per file
 * for graphty-element's bundle alone, more for the unbundled modules Vite serves), garbage
 * collection slows as the heap grows, and late in a long shard each story takes about ten times as
 * long as it did at the start.
 *
 * Switching precise coverage off drops that list, a garbage collection then frees every removed
 * iframe, and switching it back on builds a new list from what is still alive. The collection has
 * to come between the two: switched straight back on, V8 lists the dead iframes' functions again.
 *
 * As the FIRST entry of a browser project's `setupFiles` this runs once per test file, after
 * Vitest has taken the previous file's coverage and before this file's own code has loaded, so no
 * count is lost. Code a setup file loads before this one runs would lose its block counts.
 *
 * Does nothing without v8 coverage, outside Playwright's Chromium (no CDP there), or when the
 * project runs several files at once: coverage is switched per renderer process, and another page
 * sharing this one's process would lose the block counts of whatever it was running.
 */

import { cdp, server } from "vitest/browser";

/** The part of a CDP session this needs. */
interface CdpSender {
    /** Send one DevTools protocol command. */
    send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Free every removed page that V8 precise coverage is holding, and leave precise coverage on.
 * @param session - A DevTools protocol session on the test page.
 */
export async function releaseCoverageHeldPages(session: CdpSender): Promise<void> {
    await session.send("Profiler.enable");
    await session.send("Profiler.stopPreciseCoverage");
    await session.send("HeapProfiler.collectGarbage");
    // The same switches @vitest/browser's own coverage start uses.
    await session.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
}

const { coverage, maxWorkers } = server.config;

if (
    coverage.enabled &&
    coverage.provider === "v8" &&
    maxWorkers === 1 &&
    server.provider === "playwright" &&
    server.browser === "chromium"
) {
    await releaseCoverageHeldPages(cdp() as unknown as CdpSender);
}
