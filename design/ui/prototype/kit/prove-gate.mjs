#!/usr/bin/env node
// Proves the gate in kit/check.mjs fails on each kind of violation: every case serves a page that
// passes the gate with one violation planted (check.mjs --plant: nothing on disk changes) and
// expects exit 1 with the named problem; the controls expect a clean pass.
//
//   node kit/prove-gate.mjs        (from design/ui/prototype/; a few minutes)
import { spawnSync } from "node:child_process";

const FAR = "screens/frame-at-rest.html"; // passes the gate as drawn
const NOTE = "screens/take-a-note.html";
const UNDO = "screens/undo.html";
const HINT = "Ctrl+Enter adds the note.";
const cases = [
    // control: the page as drawn passes
    { name: "control: the resting frame passes", page: FAR, plant: null, pass: true },
    // 1. a retired string
    { name: "retired string", page: FAR, plant: ["Statistics<", "Statistics<span>Export files...</span><"], expect: 'retired "Export files"' },
    { name: "retired string inside a Before frame is skipped", page: FAR, plant: ["Statistics<", 'Statistics<span data-frame="before">Export files...</span><'], pass: true },
    { name: "retired string: 'result' used to mean a value", page: FAR, plant: ["Statistics<", "Statistics<span>Valjean's result</span><"], expect: "retired 'result' used to mean a value" },
    { name: "retired string: the invented tie rule's 'within 1%'", page: FAR, plant: ["Statistics<", "Statistics<span>ranks within 1% of each other</span><"], expect: 'retired "within 1%"' },
    { name: "retired string: 'near #8' in a rank cell", page: FAR, plant: ["Statistics<", "Statistics<span>#7, near #8</span><"], expect: "retired 'near #N' in a rank cell" },
    { name: "retired string: 'not used yet'", page: FAR, plant: ["Statistics<", "Statistics<span>amount, not used yet</span><"], expect: 'retired "not used yet"' },
    { name: "retired string: 'Change...' on a data source", page: FAR, plant: ["Statistics<", "Statistics<span>Loaded: miserables.json. Change...</span><"], expect: "retired 'Change...' on a data source" },
    { name: "the note editor's 'Saving as: Marcus. Change...' is not a data source", page: NOTE, plant: null, pass: true },
    // 2. a required string, mapped to a state: the note editor's Ctrl+Enter hint (in states s2, s4, s6)
    { name: "required string: the note editor as drawn passes", page: NOTE, plant: null, pass: true },
    { name: "required string removed from one state fails that state alone", page: NOTE, plant: [HINT, "adds the note."], expect: `${NOTE}#s2: missing "Ctrl+Enter"`, absent: `${NOTE}#s4: missing` },
    { name: "required string removed everywhere fails every state", page: NOTE, plant: [HINT, "adds the note.", "*"], expect: [`${NOTE}#s2: missing "Ctrl+Enter"`, `${NOTE}#s4: missing "Ctrl+Enter"`, `${NOTE}#s6: missing "Ctrl+Enter"`] },
    // 3. a count the fixtures do not hold, typed or bound, or one the formatter did not write
    { name: "count that differs from the page's dataset (76 of Les Miserables' 77 nodes)", page: FAR, plant: ['k-section-head">Graphs', 'k-section-head"><div class="k-data"><span class="k-name">nodes</span><span class="k-value">76</span></div>Graphs'], expect: "shows 76 nodes" },
    { name: "typed count no fixture holds", page: FAR, plant: ["Statistics<", "Statistics<span>9,999,991 proteins</span><"], expect: "9,999,991 proteins" },
    { name: "bound number that differs from its fixture", page: "kit/template.html", plant: ['data-fx="datasets.lesmis.rows.11.betweenness">0.570', 'data-fx="datasets.lesmis.rows.11.betweenness">0.58'], expect: "datasets.lesmis.rows.11.betweenness" },
    { name: "count the formatter did not write (the right number, typed)", page: FAR, plant: ['k-section-head">Graphs', 'k-section-head"><span>77 characters</span> Graphs'], expect: 'a count the formatter did not write: "77 characters"' },
    { name: "the same count written by the formatter passes", page: FAR, plant: ['k-section-head">Graphs', 'k-section-head"><span data-fx="datasets.lesmis.nodes" data-fx-noun="characters">77 characters</span> Graphs'], pass: true },
    { name: "formatter: 'N of M' typed without its noun fails as a typed mismatch", page: FAR, plant: ["Statistics<", 'Statistics<span data-fx="datasets.lesmis.filterSteps.after.step3" data-fx-of="datasets.lesmis.nodes" data-fx-noun="characters">27 of 77</span><'], expect: 'where datasets.lesmis.filterSteps.after.step3 is "27 of 77 characters"' },
    { name: "a mismatched number inside a framed screen (a page that shows itself in frames)", page: "screens/navigation.html", plant: ["${b(11)}>0.570<", "${b(11)}>0.57<", "*"], expect: '(in the frame screens/navigation.html?frame=' },
    // 4. one capability in two homes
    { name: "two homes: a Results section in the empty-selection inspector", page: FAR, plant: ['k-section-head">Statistics', 'k-section-head">Results</div></section><section class="k-section"><div class="k-section-head">Statistics'], expect: "two homes: a Results section" },
    { name: "two homes: Previous selection", page: FAR, plant: ["Statistics<", "Statistics<span>Previous selection</span><"], expect: "two homes: Previous selection" },
    { name: "two homes: a second Apply dialog", page: FAR, plant: ["Statistics<", 'Statistics<div class="k-modal"><div class="k-modal-head">Apply style file</div><div class="k-modal-body">Apply on top</div></div><'], expect: "two homes: a second Apply dialog" },
    // the frame
    { name: "frame: an avatar", page: FAR, plant: ["Statistics<", 'Statistics<span class="k-avatar">M</span><'], expect: "an avatar in the header" },
    { name: "frame: an avatar letter in a page's own class", page: FAR, plant: ['<div class="k-header1 an-t an-r" data-n="13">', '<div class="k-header1 an-t an-r" data-n="13"><span style="display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#888">M</span>'], expect: 'an avatar letter "M"' },
    { name: "frame: a rail without Results", page: FAR, plant: [">Results</div>", "></div>"], expect: "a rail of Graph, Data, Notes" },
    { name: "frame: a Note tool on the toolbar", page: FAR, plant: ['<div class="k-toolbar an-t an-r" data-n="12" role="toolbar">', '<div class="k-toolbar an-t an-r" data-n="12" role="toolbar"><span class="k-tool"><svg class="k-i k-i-lg"><use href="../kit/icons.svg#sticky-note"/></svg></span>'], expect: "a Note tool on the toolbar" },
    // a gate that checks nothing fails
    { name: "--tasks that checks 0 task screens fails", args: ["--tasks", "--task=no-such-task"], expect: "--tasks checked 0 task screens" },
    // the Esc rule: the undo page's steps list closes on Esc and the page stays in the participant view
    { name: "Esc rule: the undo page as drawn passes", page: UNDO, plant: null, pass: true },
    { name: "Esc rule: an Esc that closes the steps list without marking the key (kit.js's net off too) fails", page: UNDO, plants: [[UNDO, "{ e.preventDefault(); S.pop = false;", "{ S.pop = false;"], ["kit/kit.js", "if (!e.defaultPrevented && !used) leaveStudy();", "if (!e.defaultPrevented) leaveStudy();"]], expect: 'Esc rule: one Esc after opening "' },
    { name: "Esc rule: a handler that uses Esc with nothing open fails (the view can never be left)", page: UNDO, plant: ["else if (S.sel) { e.preventDefault(); run(\"clear\"); }", "else { e.preventDefault(); run(\"clear\"); }"], expect: "never leaves the participant view" },
    { name: "Esc: open the steps list, press Esc, the list closes and the page is still in the participant view; Esc with nothing open leaves", browser: escProof },
];

// The Esc proof, driven in a browser: the undo page in the participant view, its steps list opened
// from the filter chip, then Esc.
async function escProof() {
    process.env.FC_FONTATIONS = "1";
    const { createServer } = await import("node:http");
    const { readFile } = await import("node:fs/promises");
    const { join, extname, resolve, normalize } = await import("node:path");
    const proto = resolve(".");
    const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));
    const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png" };
    const srv = createServer(async (q, r) => {
        const f = join(proto, normalize(decodeURIComponent(new URL(q.url, "http://x").pathname)));
        try { r.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(await readFile(f)); } catch { r.writeHead(404).end(); }
    });
    await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
    const browser = await chromium.launch();
    const log = [];
    try {
        const page = await browser.newPage({ viewport: { width: 768, height: 1024 }, hasTouch: true });
        await page.goto(`http://127.0.0.1:${srv.address().port}/${UNDO}?study`, { waitUntil: "networkidle" });
        await page.waitForFunction(() => window.kitFx, null, { timeout: 10000 });
        const state = () => page.evaluate(() => ({
            study: document.documentElement.hasAttribute("data-study") && location.search.includes("study"),
            open: document.querySelector(".k-chip[aria-expanded]")?.getAttribute("aria-expanded") === "true",
        }));
        await page.locator(".k-chip[aria-expanded]").first().click();
        const opened = await state();
        log.push(`chip clicked: steps list ${opened.open ? "open" : "NOT open"}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        const after = await state();
        log.push(`Esc: steps list ${after.open ? "still open" : "closed"}, ${after.study ? "still in the participant view" : "LEFT the participant view"}`);
        let left = false;
        for (let i = 0; i < 4 && !left; i++) {
            await page.keyboard.press("Escape");
            await page.waitForTimeout(500);
            left = !(await state().catch(() => ({ study: false }))).study;
        }
        log.push(`Esc again with the list closed: ${left ? "left the participant view" : "did NOT leave"}`);
        return { ok: opened.open && !after.open && after.study && left, log };
    } finally {
        await browser.close();
        srv.close();
    }
}

let failed = 0;
for (const c of cases) {
    let ok;
    let out = "";
    if (c.browser) {
        const r = await c.browser().catch((e) => ({ ok: false, log: [String(e)] }));
        ok = r.ok;
        out = r.log.join("\n");
    } else {
        const args = ["kit/check.mjs", ...(c.args ?? [c.page])];
        for (const [pg, from, to, all] of c.plants ?? (c.plant ? [[c.page, ...c.plant]] : [])) args.push("--plant", `${pg}@${from}@${to}${all ? `@${all}` : ""}`);
        const r = spawnSync(process.execPath, args, { encoding: "utf8" });
        out = `${r.stdout}${r.stderr}`;
        const want = [c.expect ?? []].flat();
        ok = c.pass ? r.status === 0 : r.status === 1 && want.every((w) => out.includes(w)) && !(c.absent && out.includes(c.absent));
        if (!ok) out = `exit ${r.status}; expected ${c.pass ? "a pass" : want.map((w) => `"${w}"`).join(" and ")}\n${out}`;
    }
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${c.name}${ok ? (c.browser ? `\n${out.split("\n").map((l) => `     ${l}`).join("\n")}` : "") : `\n${out.split("\n").map((l) => `     | ${l}`).join("\n")}`}`);
}
console.log(failed ? `${failed} of ${cases.length} proofs failed` : `all ${cases.length} proofs hold`);
process.exitCode = failed ? 1 : 0;
