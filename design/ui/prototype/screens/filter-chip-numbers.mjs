#!/usr/bin/env node
// Numbers for screens/filter-chip.html: for each state the page draws (its #states), what its filter
// steps leave and what Statistics reads, written to kit/fixtures.json scenarios.filterChip, so every
// count the page shows is bound to the fixtures through the scope formatter (kit/README.md, "The scope
// formatter"). The page's own model (its copy of the graph, its steps) computes them; where the kit
// already holds a state's numbers (Les Miserables' three steps, datasets.lesmis.filterSteps.statsByState;
// the protein module step, datasets.ppi.filtered; the wrong-middle-step scenario, scenarios.failureAndRecovery)
// this script fails unless the two agree, so the page's model is checked against the kit.
// Run from design/ui/prototype/: node screens/filter-chip-numbers.mjs
process.env.FC_FONTATIONS = "1";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = resolve(here, "..");
const FIX = join(proto, "kit/fixtures.json");
const { chromium } = await import(resolve(proto, "../../../node_modules/playwright/index.mjs"));
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" };
const srv = createServer(async (q, r) => {
    const f = join(proto, normalize(decodeURIComponent(new URL(q.url, "http://x").pathname)));
    try { r.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(await readFile(f)); } catch { r.writeHead(404).end(); }
});
await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
const browser = await chromium.launch();
const fx = JSON.parse(await readFile(FIX, "utf8"));
const out = {};
try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${srv.address().port}/screens/filter-chip.html`, { waitUntil: "networkidle" });
    const ids = await page.evaluate(() => STATES.filter((s) => !s.static).map((s) => s.id)); // a static state reads its own fixtures
    for (const id of ids) {
        out[id] = await page.evaluate((id) => {
            load(id);
            const { keep, per } = evaluate();
            const m = measure(keep), kn = keep.size;
            return {
                dataset: D.key,
                signature: stateSignature(),
                nodes: kn,
                of: TOTAL,
                edges: m.edges,
                edgesOf: TOTAL_E,
                components: m.components,
                largestComponent: m.largest,
                isolated: m.isolated,
                // measures at 3 significant figures, as the kit stores them (content-design.md 5)
                averageDegree: kn ? Number((2 * m.edges / kn).toPrecision(3)) : null,
                density: kn > 1 ? Number((2 * m.edges / (kn * (kn - 1))).toPrecision(3)) : null,
                steps: per.map((r, i) => (r ? { took: r.took, left: r.left, ...(fullLeft(steps[i]) == null ? {} : { full: fullLeft(steps[i]) }) } : null)),
                runs: RUNS.map((run) => run.scope().size),
            };
        }, id);
    }
} finally {
    await browser.close();
    srv.close();
}
// Agreement with the kit's own numbers.
const L = fx.datasets.lesmis, P = fx.datasets.ppi, FR = fx.scenarios.failureAndRecovery;
const agree = (id, got, want) => {
    for (const [k, v] of Object.entries(want)) if (v != null && got[k] !== v && Math.abs(got[k] - v) > 1e-9) throw new Error(`filter-chip ${id}: ${k} is ${got[k]}, the kit holds ${v}`);
};
const byOn = { three: "1-2-3", edit: "1-2-3", off: "1-3" };
for (const [id, key] of Object.entries(byOn)) {
    const s = L.filterSteps.statsByState[key];
    agree(id, out[id], { nodes: s.nodes, edges: s.edges, components: s.components, largestComponent: s.largestComponent, isolated: s.isolated, averageDegree: s.averageDegree, density: s.density });
}
for (const id of ["none", "alloff", "keeps-all"]) agree(id, out[id], { nodes: L.nodes, edges: L.edges, components: L.stats.components, isolated: L.stats.isolated, averageDegree: L.stats.averageDegree, density: L.stats.density });
agree("proteins", out.proteins, { nodes: P.filtered.nodes, of: P.nodes, edges: P.filtered.edges, edgesOf: P.filtered.edgesOf, components: P.filtered.stats.components, isolated: P.filtered.stats.isolated, averageDegree: P.filtered.stats.averageDegree, density: P.filtered.stats.density });
agree("after-removal", out["after-removal"], { nodes: FR.allThreeSteps.nodes, edges: FR.allThreeSteps.edges, components: FR.allThreeSteps.components, isolated: FR.allThreeSteps.isolated });
fx.scenarios.filterChip = {
    generatedBy: "screens/filter-chip-numbers.mjs -- regenerate instead of editing by hand",
    note: "what each drawn state of screens/filter-chip.html leaves: the page's own model, checked against datasets.lesmis.filterSteps, datasets.ppi.filtered and scenarios.failureAndRecovery where the kit holds the state",
    states: out,
};
await writeFile(FIX, JSON.stringify(fx, null, 1));
for (const [id, s] of Object.entries(out)) console.log(`${id}: ${s.nodes} of ${s.of}, ${s.edges} of ${s.edgesOf} edges, density ${s.density}`);
