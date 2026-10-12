// Captures the owner-review stories at 1440 x 900 and 900 x 700 into the checkpoint folders.
// Usage, from the repository root after `npx storybook build -o <dir>` in graphty/:
//   design/ui/studio/tool/with-browser.sh node design/ui/studio/tool/capture-review-stories.mjs <dir> design/ui/studio/tier3/build/owner-review
/* global process, console, document -- a Node script; document is read only inside the page */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";

import { CHROMIUM_ARGS, serve } from "../../../../visual-review/capture/capture.mjs";

const [dir, out] = process.argv.slice(2);
const P = "workspace-style-panel-review--";
const CHECKPOINTS = {
    "checkpoint-1": [
        "tree",
        "selected-at-rest",
        "route-at-rest",
        "clear-tooltip",
        "cleared",
        "folder-selection-colors",
        "two-rows",
        "draft",
    ],
    "checkpoint-2": [
        "vary-by",
        "degree-ramp",
        "louvain-categories",
        "edge-betweenness",
        "labels-menu",
        "label-entry",
        "effects-menu",
    ],
    "checkpoint-3": ["degree-values", "louvain-values", "route-values", "graph-settings"],
};
const SIZES = [
    [1440, 900],
    [900, 700],
];

const [server, base] = await serve(dir);
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
let failed = 0;
try {
    for (const [checkpoint, stories] of Object.entries(CHECKPOINTS)) {
        await mkdir(join(out, checkpoint), { recursive: true });
        for (const story of stories) {
            for (const [width, height] of SIZES) {
                const context = await browser.newContext({ viewport: { width, height }, locale: "en-US" });
                const page = await context.newPage();
                const errors = [];
                page.on("pageerror", (e) => errors.push(e.message));
                await page.goto(`${base}iframe.html?id=${P}${story}&viewMode=story&globals=colorScheme:light`);
                const phase = await page
                    .waitForFunction(
                        () => {
                            const p = globalThis.__STORYBOOK_PREVIEW__?.currentRender?.phase;
                            return ["completed", "finished", "errored", "aborted"].includes(p) && p;
                        },
                        null,
                        { timeout: 120_000 },
                    )
                    .then((h) => h.jsonValue());
                await page.evaluate(() => document.fonts.ready);
                const file = join(out, checkpoint, `${story}-${width}x${height}.png`);
                await page.screenshot({ path: file });
                console.log(
                    `${phase === "completed" || phase === "finished" ? "ok  " : "FAIL"} ${file} ${errors.join(" | ")}`,
                );
                if (phase !== "completed" && phase !== "finished") {
                    failed++;
                }
                await context.close();
            }
        }
    }
} finally {
    await browser.close();
    server.close();
}
process.exit(failed === 0 ? 0 : 1);
