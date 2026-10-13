// Browser commands that stop v8 coverage from keeping every finished test file alive.
//
// Spread into a browser project's `test.browser.commands`. They replace @vitest/browser's own
// `__vitest_startV8Coverage`, which every test file's iframe calls once when it starts.
//
// What goes wrong without them: @vitest/browser turns on V8's precise coverage
// (`Profiler.startPreciseCoverage`) and never turns it off, because the page and its V8 isolate
// outlive every test file. While precise coverage is on, V8 keeps every feedback vector it has
// ever created reachable from a list on the isolate, so nothing a finished file's iframe ran can
// be garbage collected: its feedback vectors hold its allocation sites, and through them its
// whole JavaScript world. A graphty-element story file left about 40 MB behind, still there after
// a forced garbage collection, so the heap grew with every file a shard ran. Each new file then
// paid for all of them, in garbage collection and in the full-heap walk that starting precise
// coverage does, until stories ran ten times slower and timed out (issue #2256).
//
// The fix: before starting precise coverage for a new file, stop it and collect garbage. Stopping
// clears V8's list, so the collection frees the previous files' iframes. The collection must come
// before the restart, because starting precise coverage rebuilds the list from every feedback
// vector still on the heap, dead or not, and would bring them all back. Starting again covers the
// new file exactly as before. A file's coverage is taken (`__vitest_takeV8Coverage`) before its iframe goes away
// and the next file starts, so no counts are lost. Each test session has its own browser context,
// and so its own renderer process and isolate, so a restart never touches another session.

/**
 * Start V8 precise coverage for the test file about to run, releasing what earlier files left.
 * @param context - the browser command context @vitest/browser passes, with its CDP session
 */
async function startV8Coverage(context) {
    const session = await context.__ensureCDPHandler();
    await session.send("Profiler.enable");
    await session.send("Profiler.stopPreciseCoverage");
    await session.send("HeapProfiler.collectGarbage");
    await session.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
}

/** The browser commands to spread into a browser project's `test.browser.commands`. */
export const browserCoverageCommands = { __vitest_startV8Coverage: startV8Coverage };
