/*
 * A story whose page stops answering after its render completed: capture() records it as a failed
 * item naming the stalled step, and the other stories of the run still finish (#9220). The step's
 * limit is stepped on a fake setTimeout, never waited out: only the limits capture.mjs's `bounded`
 * arms are fired, since Playwright's own waits are timers on the same clock.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { capture } from "../capture/capture.mjs";

import { tempDir } from "./helpers.mjs";

// The stalled story's main thread spins forever on the first step after its render completed,
// when capture reads the play function's result from the preview's channel.
const IFRAME = `<!doctype html><html><body><script>
const id = new URLSearchParams(location.search).get("id");
document.body.insertAdjacentHTML("beforeend", "<h1>" + id + "</h1>");
window.__STORYBOOK_PREVIEW__ = {
    storyStoreValue: {},
    currentRender: { phase: "completed" },
    channel: { last: () => { if (id === "demo--stalls") { for (;;) {} } } },
    extract: async () => ({ "demo--stalls": { parameters: {} }, "demo--plain": { parameters: {} } }),
};
</script></body></html>`;

beforeAll(() => {
    vi.stubEnv("GITHUB_ACTIONS", "");
    process.env.FC_FONTATIONS = "1";
});
afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("capture of a story that stalls after its render", () => {
    it("records it as failed, naming the step, and finishes the rest", async () => {
        const sb = tempDir("vr-sb-");
        // In this order: the plain story is captured (with no stepped timer) before the stalled one.
        const ids = ["demo--plain", "demo--stalls"];
        const entries = Object.fromEntries(ids.map((id) => [id, { id, type: "story" }]));
        writeFileSync(join(sb, "index.json"), JSON.stringify({ entries }));
        writeFileSync(join(sb, "iframe.html"), IFRAME);
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        // The pending limits capture.mjs's bounded() armed, by handle.
        const limits = new Map();
        const [fakeSet, fakeClear] = [globalThis.setTimeout, globalThis.clearTimeout];
        vi.spyOn(globalThis, "setTimeout").mockImplementation((fn, ms, ...args) => {
            const handle = fakeSet(fn, ms, ...args);
            if (/\bat bounded\b/.test(new Error("stack").stack)) {
                limits.set(handle, ms);
            }
            return handle;
        });
        vi.spyOn(globalThis, "clearTimeout").mockImplementation((handle) => {
            limits.delete(handle);
            fakeClear(handle);
        });
        let done = false;
        const logged = [];
        const run = capture({
            project: "demo",
            storybook: sb,
            baselines: tempDir("vr-bl-"),
            out: tempDir("vr-out-"),
            workers: 1,
            waitFor: null,
            log: (line) => logged.push(line),
        }).finally(() => {
            done = true;
        });
        // Once the plain story is recorded, the only limit armed is the stalled step's, in the
        // first attempt and then in its retry: step the clock to it.
        await vi.waitFor(() => {
            if (logged.some((l) => l.endsWith(" demo--plain.png")) && limits.size > 0) {
                const [[handle, ms]] = limits;
                limits.delete(handle);
                vi.advanceTimersByTime(ms);
            }
            if (!done) {
                throw new Error("capture still running");
            }
        });
        vi.restoreAllMocks();
        vi.useRealTimers();
        const items = Object.fromEntries((await run).items.map((i) => [i.file, i]));
        expect(items["demo--stalls.png"]).toMatchObject({
            status: "failed",
            reason: "play function result: Timeout 30000ms exceeded",
        });
        expect(items["demo--plain.png"].status).toBe("new");
    });
});
