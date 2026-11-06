// design/ui/studio/tool/with-browser.sh node --test design/ui/studio/tool/bar8-9.test.mjs
// Bar 9 leaves the data's names out of the app's words, and bar 8's scroll check reads whether a
// list's active option is in view -- each on a known page, and each failing on its planted case.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { activeInView, LAUNCH, plant, wordsOnScreen } from "./measure.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const browse = async (fn) => {
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const browser = await chromium.launch(LAUNCH);
    try {
        await fn(await browser.newPage({ viewport: { width: 1280, height: 800 } }));
    } finally {
        await browser.close();
    }
};

// a session holding the names a screen shows: a source, its file, a table, a column, a node
const SESSION = `<graphty-element></graphty-element><script>
const ids = ["n1"];
document.querySelector("graphty-element").session = { data: {
    sources: () => [{ name: "friends.csv", tables: ["team"] }],
    attributes: () => [{ name: "weight", origin: "imported" }, { name: "PageRank", origin: "result" }],
    nodes: () => ids.map((id) => ({ id })),
    name: () => "Ava",
} };
</script>`;

test("bar 9 leaves out the source, file, table, column and node names the session holds", async () => {
    await browse(async (page) => {
        await page.setContent(
            `<!doctype html><body><p>friends friends.csv team weight Ava's connections Weight Color PageRank</p>${SESSION}</body>`,
        );
        const { words, left } = await page.evaluate(wordsOnScreen);
        // "Weight" is the app's label, not the column "weight"
        assert.deepEqual(words, ["connections", "Weight", "Color", "PageRank"]);
        assert.deepEqual(left, ["friends", "friends.csv", "team", "weight", "Ava's"]);
        // without the session, the same names count as the app's words
        await page.setContent("<!doctype html><body><p>friends team weight Ava's</p></body>");
        assert.equal((await page.evaluate(wordsOnScreen)).words.length, 4);
    });
});

test("the scroll check reads the active option in or out of view, and catches it scrolled away", async () => {
    await browse(async (page) => {
        const rows = Array.from(
            { length: 30 },
            (_, i) => `<div role="option" id="o${i}" style="height:30px">Row ${i}</div>`,
        );
        await page.setContent(`<!doctype html><body>
<input role="combobox" aria-controls="list" aria-activedescendant="o20">
<div id="list" role="listbox" style="height:120px;overflow-y:auto">${rows.join("")}</div></body>`);
        await page.focus("input");
        assert.deepEqual(await page.evaluate(activeInView), { option: "Row 20", inView: false });
        await page.evaluate(() => document.getElementById("o20").scrollIntoView({ block: "nearest" }));
        assert.deepEqual(await page.evaluate(activeInView), { option: "Row 20", inView: true });
        await page.evaluate(plant, "unscroll");
        assert.equal((await page.evaluate(activeInView)).inView, false);
        await page.focus("#list");
        assert.equal(await page.evaluate(activeInView), null, "no active option, no reading");
    });
});
