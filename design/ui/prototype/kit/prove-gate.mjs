#!/usr/bin/env node
// Proves the gate in kit/check.mjs fails on each kind of violation: every case serves a page that
// passes the gate with one violation planted (check.mjs --plant: nothing on disk changes) and
// expects exit 1 with the named problem; the controls expect a clean pass.
//
//   node kit/prove-gate.mjs        (from design/ui/prototype/; about a minute)
import { spawnSync } from "node:child_process";

const FAR = "screens/frame-at-rest.html"; // passes the gate as drawn
const NOTE = "screens/take-a-note.html";
const cases = [
    // control: the page as drawn passes
    { name: "control: the resting frame passes", page: FAR, plant: null, pass: true },
    // 1. a retired string
    { name: "retired string", page: FAR, plant: ["Statistics<", "Statistics<span>Export files...</span><"], expect: 'retired "Export files"' },
    { name: "retired string inside a Before frame is skipped", page: FAR, plant: ["Statistics<", 'Statistics<span data-frame="before">Export files...</span><'], pass: true },
    { name: "retired string: 'result' used to mean a value", page: FAR, plant: ["Statistics<", "Statistics<span>Valjean's result</span><"], expect: "retired 'result' used to mean a value" },
    // 2. a required string, mapped to a state: the note editor's Ctrl+Enter hint
    { name: "required string present in its state", page: NOTE, plant: ["Enter adds", "Ctrl+Enter posts"], expect: `${NOTE}#s4: missing "Ctrl+Enter"`, absent: `${NOTE}#s2: missing` },
    { name: "required string missing from its state", page: NOTE, plant: null, expect: `${NOTE}#s2: missing "Ctrl+Enter"` },
    // 3. a count the fixtures do not hold, typed or bound
    { name: "count that differs from the page's dataset (76 of Les Miserables' 77 nodes)", page: FAR, plant: ['k-section-head">Graphs', 'k-section-head"><div class="k-data"><span class="k-name">nodes</span><span class="k-value">76</span></div>Graphs'], expect: "shows 76 nodes" },
    { name: "typed count no fixture holds", page: FAR, plant: ["Statistics<", "Statistics<span>9,999,991 proteins</span><"], expect: "9,999,991 proteins" },
    { name: "bound number that differs from its fixture", page: "kit/template.html", plant: ['data-fx="datasets.lesmis.rows.11.betweenness">0.57', 'data-fx="datasets.lesmis.rows.11.betweenness">0.58'], expect: "datasets.lesmis.rows.11.betweenness" },
    // 4. one capability in two homes
    { name: "two homes: a Results section in the empty-selection inspector", page: FAR, plant: ['k-section-head">Statistics', 'k-section-head">Results</div></section><section class="k-section"><div class="k-section-head">Statistics'], expect: "two homes: a Results section" },
    { name: "two homes: Previous selection", page: FAR, plant: ["Statistics<", "Statistics<span>Previous selection</span><"], expect: "two homes: Previous selection" },
    { name: "two homes: a second Apply dialog", page: FAR, plant: ["Statistics<", 'Statistics<div class="k-modal"><div class="k-modal-head">Apply style file</div><div class="k-modal-body">Apply on top</div></div><'], expect: "two homes: a second Apply dialog" },
    // the frame
    { name: "frame: an avatar", page: FAR, plant: ["Statistics<", 'Statistics<span class="k-avatar">M</span><'], expect: "an avatar in the header" },
    { name: "frame: an avatar letter in a page's own class", page: FAR, plant: ['<div class="k-header1 an-t an-r" data-n="13">', '<div class="k-header1 an-t an-r" data-n="13"><span style="display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#888">M</span>'], expect: 'an avatar letter "M"' },
    { name: "frame: a rail without Results", page: FAR, plant: [">Results</div>", "></div>"], expect: "a rail of Graph, Data, Notes" },
];

let failed = 0;
for (const c of cases) {
    const args = ["kit/check.mjs", c.page];
    if (c.plant) args.push("--plant", `${c.page}@${c.plant[0]}@${c.plant[1]}`);
    const r = spawnSync(process.execPath, args, { encoding: "utf8" });
    const out = `${r.stdout}${r.stderr}`;
    const ok = c.pass ? r.status === 0 : r.status === 1 && out.includes(c.expect) && !(c.absent && out.includes(c.absent));
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${c.name}${ok ? "" : `\n     exit ${r.status}; expected ${c.pass ? "a pass" : `"${c.expect}"`}\n${out.split("\n").map((l) => `     | ${l}`).join("\n")}`}`);
}
console.log(failed ? `${failed} of ${cases.length} proofs failed` : `all ${cases.length} proofs hold`);
process.exitCode = failed ? 1 : 0;
