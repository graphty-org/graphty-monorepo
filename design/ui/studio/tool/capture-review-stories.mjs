// Captures the owner-review stories at 1440 x 900 and 900 x 700 into the checkpoint folders.
// Usage, from the repository root after `npx storybook build -o <dir>` in graphty/:
//   design/ui/studio/tool/with-browser.sh node design/ui/studio/tool/capture-review-stories.mjs <dir> design/ui/studio/tier3/build/owner-review
// With a third argument "i3": the iteration 3 approval set, at 1366 x 768 and 900 x 700, light and
// dark, into one folder:
//   ... capture-review-stories.mjs <dir> design/ui/studio/tier3/build/i3-owner i3
/* global process, console, document -- a Node script; document is read only inside the page */
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";

import { CHROMIUM_ARGS, serve, storyIds } from "../../../../visual-review/capture/capture.mjs";

const [dir, out, set] = process.argv.slice(2);
const P = "workspace-style-panel-review--";
const CHECKPOINTS = {
    "checkpoint-1": ["tree", "selected-at-rest", "route-at-rest", "two-rows"],
    "checkpoint-2": ["vary-by", "degree-ramp", "louvain-categories", "edge-betweenness", "labels-menu", "label-entry"],
    "checkpoint-3": ["degree-values", "louvain-values", "route-values", "graph-settings"],
};
const SIZES = [
    [1440, 900],
    [900, 700],
];
const SCHEMES = ["light"];
if (set === "i3") {
    for (const key of Object.keys(CHECKPOINTS)) {
        delete CHECKPOINTS[key];
    }
    CHECKPOINTS["."] = [
        "tree",
        "selected-at-rest",
        "key-people-at-rest",
        "route-at-rest",
        "louvain-categories",
        "label-settings",
        "football-conference",
    ];
    SIZES.splice(0, SIZES.length, [1366, 768], [900, 700]);
    SCHEMES.push("dark");
}

// An id the build does not hold would never reach a render phase: name every one and stop before capturing.
const known = new Set(storyIds(JSON.parse(await readFile(join(dir, "index.json"), "utf8"))));
const unknown = Object.values(CHECKPOINTS)
    .flat()
    .filter((story) => !known.has(P + story));
if (unknown.length > 0) {
    console.error(`unknown stories in ${dir}: ${unknown.join(", ")}`);
    process.exit(1);
}

const [server, base] = await serve(dir);
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
let failed = 0;
try {
    for (const [checkpoint, stories] of Object.entries(CHECKPOINTS)) {
        await mkdir(join(out, checkpoint), { recursive: true });
        for (const story of stories) {
            for (const [[width, height], scheme] of SIZES.flatMap((size) => SCHEMES.map((c) => [size, c]))) {
                const context = await browser.newContext({ viewport: { width, height }, locale: "en-US" });
                const errors = [];
                const suffix = SCHEMES.length > 1 ? `-${scheme}` : "";
                const file = join(out, checkpoint, `${story}-${width}x${height}${suffix}.png`);
                try {
                    const page = await context.newPage();
                    page.on("pageerror", (e) => errors.push(e.message));
                    await page.goto(`${base}iframe.html?id=${P}${story}&viewMode=story&globals=colorScheme:${scheme}`);
                    // no deadline: every story reaches one of these phases, and an error or abort ends the wait
                    const phase = await page
                        .waitForFunction(
                            () => {
                                const p = globalThis.__STORYBOOK_PREVIEW__?.currentRender?.phase;
                                return ["completed", "finished", "errored", "aborted"].includes(p) && p;
                            },
                            null,
                            { timeout: 0 },
                        )
                        .then((h) => h.jsonValue());
                    await page.evaluate(() => document.fonts.ready);
                    await page.screenshot({ path: file });
                    const ok = phase === "completed" || phase === "finished";
                    console.log(`${ok ? "ok  " : "FAIL"} ${file} ${errors.join(" | ")}`);
                    if (!ok) {
                        failed++;
                    }
                } catch (e) {
                    console.log(`FAIL ${file} ${[e.message, ...errors].join(" | ")}`);
                    failed++;
                } finally {
                    await context.close();
                }
            }
        }
    }
} finally {
    await browser.close();
    server.close();
}
process.exit(failed === 0 ? 0 : 1);
