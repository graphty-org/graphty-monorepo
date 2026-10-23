// design/ui/studio/tool/with-browser.sh node --test design/ui/studio/tool/bar10.test.mjs
// Bar 10's scripted counts on a known page: what is cut with no way to read it whole, what is cut but
// readable, and which visible strings are the element's or the code's rather than the app's words.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { bar10, LAUNCH, plant } from "./measure.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CUT = "overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:60px;display:block";
const PAGE = `<!doctype html><body>
<main role="main" aria-label="Data place">
  <p class="bare" style="${CUT}">Eastside Cold Storage and Packing Facility</p>
  <p class="titled" style="${CUT}" title="Harbor Street Warehouse North">Harbor Street Warehouse North</p>
  <button aria-label="Open Airport Freight Terminal B"><span style="${CUT}">Airport Freight Terminal B</span></button>
  <div style="overflow:auto;width:60px;white-space:nowrap">A pane a person scrolls sideways</div>
  <p>Fits</p>
  <p style="${CUT}">Southern Depot Loading Dock Number Two</p>
  <p>id Southern Depot Loading Dock Number Two</p>
  <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">A status line E_HIDDEN_CODE</span>
  <p class="code">Refused: E_BAD_SELECTOR</p>
  <p class="path">Colored by results.louvain.group and data.weight</p>
  <p>Loaded friends-v2.csv</p>
  <p>Node a.b.c from the file</p>
</main>
<graphty-element></graphty-element>
<script>document.querySelector("graphty-element").getNodes = () => [{ id: "a.b.c", data: {} }];</script>
</body>`;

test("bar 10 counts cut text and raw strings by element, and leaves out what can be read or is data", async () => {
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const browser = await chromium.launch(LAUNCH);
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.setContent(PAGE);
        const { cut, raw } = await page.evaluate(bar10);
        const by = Object.fromEntries(cut.map((c) => [c.text, c]));
        assert.equal(by["Eastside Cold Storage and Packing Facility"].readable, null);
        assert.equal(by["Eastside Cold Storage and Packing Facility"].element, 'p.bare in main "Data place"');
        assert.equal(by["Harbor Street Warehouse North"].readable, "title");
        assert.equal(by["Airport Freight Terminal B"].readable, "name");
        assert.equal(by["Southern Depot Loading Dock Number Two"].readable, "shown");
        assert.equal(by["A pane a person scrolls sideways"], undefined, "a scrolling pane is not cut");
        assert.equal(by["A status line E_HIDDEN_CODE"], undefined, "visually hidden text is not on screen");
        assert.equal(cut.length, 4);
        // the unreadable one is marked for the tooltip hover
        assert.equal(await page.locator("[data-studio-cut]").count(), 1);

        assert.deepEqual(
            raw.map((r) => `${r.kind} ${r.text} @ ${r.element}`),
            [
                'code E_BAD_SELECTOR @ p.code in main "Data place"',
                'field path results.louvain.group @ p.path in main "Data place"',
                'field path data.weight @ p.path in main "Data place"',
            ],
        );

        // the planted cases bars.mjs relies on are caught
        await page.setContent("<!doctype html><body><p>Fits</p></body>");
        await page.evaluate(plant, "cut");
        await page.evaluate(plant, "raw");
        const planted = await page.evaluate(bar10);
        assert.ok(planted.cut.some((c) => c.text.startsWith("Planted cut") && !c.readable));
        assert.ok(planted.raw.some((r) => r.text === "E_BAD_SELECTOR"));
    } finally {
        await browser.close();
    }
});
