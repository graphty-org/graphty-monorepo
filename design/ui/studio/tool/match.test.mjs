// design/ui/studio/tool/with-browser.sh node --test design/ui/studio/tool/match.test.mjs
// The study tool's matcher on a known page: a control's exact name wins over a dialog, a focused
// heading or a card whose words include it, and a name two real controls share is still refused. And
// a replay's comparison of refusals: by what was refused and the candidates offered, in any wording.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { find, refusalFacts, refusedName, resolvedLine } from "./match.mjs";
import { LAUNCH } from "./measure.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
// the three shapes tier 4's tool dry run met, each with a negative tabindex the app focuses
const PAGE = `<!doctype html><body>
<nav><button>Graph</button><button>Data</button></nav>
<h2 tabindex="-1"><span>Graph</span>, pantries: 13 nodes, 18 edges</h2>
<div role="group" tabindex="-1" aria-label="Node id contains P13, Hide">
  <span>Node id contains P13, Hide</span>
  <label><input type="radio" name="e" value="hide"> hide</label>
</div>
<button>Samples</button><a href="#s">Samples</a>
<div role="dialog" aria-modal="true" aria-label="Server" tabindex="-1">
  <p>Example: <span>Kind</span> <span>Endpoint</span></p>
  <label>Endpoint <input type="text"></label>
  <label>Kind <select><option>GraphML</option></select></label>
</div>
</body>`;

test("an exact control name wins over a dialog, heading or card whose words include it", async () => {
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const browser = await chromium.launch(LAUNCH);
    try {
        const page = await browser.newPage();
        await page.setContent(PAGE);
        // the dialog is modal: inside it, the field's label and the example table's header share a word
        let f = await find(page, "Endpoint");
        assert.equal(f.miss, undefined, f.miss);
        assert.equal(f.desc, 'textbox ""');
        f = await find(page, "Kind");
        assert.equal(f.miss, undefined, f.miss);
        assert.match(f.desc, /^combobox /);
        // close the dialog: the rail's button against the canvas heading, the card's radio against the card
        await page.evaluate(() => document.querySelector("[role=dialog]").remove());
        f = await find(page, "Graph");
        assert.equal(f.miss, undefined, f.miss);
        assert.equal(f.desc, 'button "Graph"');
        f = await find(page, "Hide");
        assert.equal(f.miss, undefined, f.miss);
        assert.match(f.desc, /^radio /);
        // two real controls of one name are still refused, each offered by kind
        f = await find(page, "Samples");
        assert.match(f.miss ?? "", /^ambiguous: "Samples" matches 2 controls/);
        // a container alone still answers to its name: nothing better bears it
        f = await find(page, "Node id contains P13, Hide");
        assert.equal(f.miss, undefined, f.miss);
        assert.match(f.desc, /^group /);
    } finally {
        await browser.close();
    }
});

test("a replay compares a refusal by what was refused and the candidates, not its wording", () => {
    const old =
        'ambiguous: "Samples" matches 2 controls, so the step did nothing; name one: "Samples#1" button "Samples", "Samples#2" link "Samples"';
    const now =
        'ambiguous: "Samples" matches 2 controls, so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples" link "Samples"';
    assert.equal(refusalFacts(old), refusalFacts(now));
    assert.equal(refusalFacts(now), 'refused "Samples": button "Samples" | link "Samples"');
    assert.equal(refusedName(old), "Samples");
    // a different candidate is a different screen
    assert.notEqual(refusalFacts(old), refusalFacts(old.replace('link "Samples"', 'tab "Samples"')));
    // a refusal the matcher now resolves, because the rival was a container: the same facts
    const rival =
        'ambiguous: "Graph" matches 2 controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" heading "Graph, pantries: 13 nodes, 18 edges"';
    assert.equal(refusalFacts(rival), refusalFacts(resolvedLine("Graph", 'button "Graph"')));
    assert.notEqual(refusalFacts(rival), refusalFacts(resolvedLine("Graph", 'link "Graph"')));
    // the position form, with candidates whose names hold commas
    const pos =
        'ambiguous: "weight#1" picks by position among different kinds of control, so the step did nothing; name it by kind: "role=option:weight", "role=row:weight" (option "weight" in the open list, row "weight, number, 3 of 4")';
    assert.equal(refusedName(pos), "weight#1");
    assert.equal(
        refusalFacts(pos),
        'refused "weight#1": option "weight" in the open list | row "weight, number, 3 of 4"',
    );
    // any other line is compared as it is
    assert.equal(refusalFacts('clicked node "A"'), 'clicked node "A"');
});
