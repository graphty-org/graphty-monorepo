#!/usr/bin/env node
// Numbers and drawing for the "Keep these 200 rows" step in screens/past-drawing-limit.html: the 200
// most cited patents in the table's order (citationsReceived, highest first), the citations between
// them, their statistics and the drawing of them.
// The full citation graph is never generated (kit/gen-canvas.mjs states it), so the 200 are modeled
// inside the same block that builds the 612 drug patents: the drug patents among the 200 are those
// 612's most cited, with the citations between them taken from that graph, so the two mocks agree;
// the other categories are drawn with the same citation curve in their share of the sample, and
// citations between them (and to and from the drug patents) are drawn at a low rate, newer citing
// older. Own seed (200), so no other fixture moves; the check at the bottom proves it.
// It re-runs kit/gen-canvas.mjs with one inserted block into a throwaway folder; only
// kit/fixtures.json scenarios.pastLimitTop200 and screens/img/pdl-top200-{light,dark}.svg are written.
// Run from design/ui/prototype/: node screens/past-drawing-limit-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "pdl200-"));
mkdirSync(join(scratch, "canvas"));
const FIX = JSON.stringify(join(kit, "fixtures.json"));

const block = String.raw`
        {
            const K = 200;
            const rr = mulberry32(200);
            const nodeOf = new Map(byIn.map((node) => [rowOf[node], node]));
            // Candidates: every drug patent the rule keeps, the table's top rows, and the other
            // categories at the same curve in proportion to their share of the sample.
            const catN = Object.fromEntries(cats);
            const drugRest = rows.filter((x) => !c.rows.includes(x));
            const others = cats.filter(([k]) => k !== "Drugs and medical");
            const otherTotal = others.reduce((t, [, v]) => t + v, 0);
            const M = Math.round((drugRest.length * otherTotal) / catN["Drugs and medical"]);
            const gen = [];
            for (let i = 0; i < M; i++) {
                let x = rr() * otherTotal, cat = others[0][0];
                for (const [k, v] of others) if ((x -= v) < 0) { cat = k; break; }
                gen.push({ id: null, grantYear: 1999 + Math.floor(rr() * 3), category: cat, citationsReceived: 25 + Math.floor(377 * rr() ** 3.5) });
            }
            const all = [...c.rows, ...drugRest, ...gen].sort((a, b) => b.citationsReceived - a.citationsReceived || (a.id ?? "z").localeCompare(b.id ?? "z"));
            const top = all.slice(0, K);
            const cutoff = top[K - 1].citationsReceived;
            const mine = new Set();
            for (const t of top) if (t.id === null) {
                for (;;) {
                    const id = idStr(5855000 + Math.floor(rr() * 479000));
                    if (!usedIds.has(id) && !mine.has(id)) { t.id = id; mine.add(id); break; }
                }
            }
            // Citations between the 200: drug to drug from the 612's graph; the rest at a low rate.
            const at = new Map(top.map((x, k) => [x, k]));
            const e = [];
            const seen = new Set();
            const add = (a, b) => { const k = a + ">" + b; if (a !== b && !seen.has(k)) { seen.add(k); e.push([a, b]); } };
            for (const [a, b] of edges) {
                const ra = at.get(rowOf[a]), rb = at.get(rowOf[b]);
                if (ra !== undefined && rb !== undefined) add(ra, rb);
            }
            for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) {
                const A = top[i], B = top[j];
                if (i === j || A.grantYear < B.grantYear || (A.category === "Drugs and medical" && B.category === "Drugs and medical")) continue;
                if (A.grantYear === B.grantYear && i > j) continue;
                const p = A.category === B.category ? 0.045 : 0.004;
                if (rr() < p) add(i, j);
            }
            const st = statsOf(K, e);
            const indeg = new Array(K).fill(0);
            for (const [, t] of e) indeg[t]++;
            const pos = layout(K, e, { strength: -60, distance: 34, ticks: 500 });
            const size = (i) => 2.5 + Math.sqrt(indeg[i]) * 0.8;
            const order = [...Array(K).keys()];
            let labeled = [];
            emit("citations-top200", (theme) => {
                const d = drawDirected({ theme, pos, edges: e, size, order, labelOf: (i) => top[i].id, budget: 10, title: "The 200 most cited patents in the sample and the citations between them" });
                labeled = d.drawn;
                return d.svg;
            });
            const byCat = {};
            for (const t of top) byCat[t.category] = (byCat[t.category] ?? 0) + 1;
            const years = top.map((x) => x.grantYear);
            const fix = JSON.parse(readFileSync(${FIX}, "utf8"));
            (fix.scenarios ??= {}).pastLimitTop200 = {
                generatedBy: "screens/past-drawing-limit-numbers.mjs -- regenerate instead of editing by hand",
                note: "modeled, not computed: the full graph is never generated. The drug patents among the 200 and the citations between them come from the 612 the rule keeps (datasets.citations.narrowed)",
                n: K,
                sortedBy: "citationsReceived",
                step: "Top 200 rows by citationsReceived",
                cutoff,
                tiedAtCutoff: all.filter((x) => x.citationsReceived === cutoff).length,
                keptAtCutoff: top.filter((x) => x.citationsReceived === cutoff).length,
                ...st,
                byCategory: byCat,
                degreeDistribution: inOut(K, e),
                rows: top.slice(0, 20),
                profiles: { grantYear: [Math.min(...years), Math.max(...years)], category: Object.keys(byCat).length, citationsReceived: [cutoff, top[0].citationsReceived] },
                labeled: labeled.map((i) => top[i].id),
                ids: [...mine],
                drawing: "screens/img/pdl-top200-{theme}.svg",
            };
            writeFileSync(${FIX}, JSON.stringify(fix, null, 1));
        }
`;

let src = readFileSync(join(kit, "gen-canvas.mjs"), "utf8");
const swap = (a, b) => {
    if (!src.includes(a)) throw new Error("anchor not found in kit/gen-canvas.mjs: " + a);
    src = src.replace(a, b);
};
swap("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(kit)};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(scratch, "canvas"))};`);
swap('join(here, "fixtures.json"),', `${JSON.stringify(join(scratch, "fixtures.json"))},`);
const anchor = "        let drawnLabels = [];";
swap(anchor, block + "\n" + anchor);
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);

// Check: the kit's datasets are reproduced, so the inserted block moved nothing, and no modeled id
// is used by another patent in the fixtures.
const a = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
for (const k of Object.keys(b.datasets))
    if (JSON.stringify(a.datasets[k]) !== JSON.stringify(b.datasets[k])) throw new Error(`the ${k} fixture changed: the kit and this script disagree`);
const s = a.scenarios.pastLimitTop200;
const text = JSON.stringify(a.datasets.citations);
for (const id of s.ids) if (text.includes(`"${id}"`)) throw new Error("modeled id collides with a fixture id: " + id);
if (s.nodes !== s.n) throw new Error("the step keeps " + s.nodes + " nodes, not " + s.n);
for (const t of ["light", "dark"]) copyFileSync(join(scratch, "canvas", `citations-top200-${t}.svg`), join(here, "img", `pdl-top200-${t}.svg`));
console.log("wrote kit/fixtures.json scenarios.pastLimitTop200", JSON.stringify({ ...s, rows: s.rows.slice(0, 3), ids: s.ids.length }));

// The same Keep top rows cut on a sampled column: the table sorted by Betweenness (sampled), Run 1
// (datasets.citations.sampledBetweenness, whose run record states an error bound of +/- 0.00035,
// 95 runs in 100). Modeled: the ten listed values, then a power law from row 10 to the middle of the
// nonzero values, then the estimated zeros. Two rows are "within the error bound" of each other when
// their values differ by no more than twice the bound, the rule the Results panel's rank ranges use
// (#3-#7). The count excludes row 200 itself.
{
    const fix = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
    const C = fix.datasets.citations, sb = C.sampledBetweenness, K = fix.scenarios.pastLimitTop200.n;
    const bound = 0.00035;
    const nonzero = C.nodes - sb.estimatedZero;
    const v10 = sb.top[9].betweenness;
    const b = Math.log(v10 / sb.middleOfNonzero) / Math.log(nonzero / 2 / 10);
    const v = (r) => (r <= 10 ? sb.top[r - 1].betweenness : r <= nonzero ? v10 * (r / 10) ** -b : 0);
    const at = Number(v(K).toPrecision(2));
    let first = 0, within = 0;
    for (let r = 1; r <= C.nodes; r++) if (r !== K && Math.abs(v(r) - at) <= 2 * bound) { within++; if (!first) first = r; }
    fix.scenarios.pastLimitTop200.sampledCut = {
        note: "modeled: the Keep top rows cut when the table is sorted by Betweenness (sampled), Run 1; within = rows other than row n whose value is within twice the error bound of row n's",
        column: "Betweenness (sampled)", run: "Run 1", seed: sb.seed, errorBound: bound,
        valueAtCut: at, within, firstWithin: first, lastWithin: C.nodes,
    };
    writeFileSync(join(kit, "fixtures.json"), JSON.stringify(fix, null, 1));
    console.log("wrote scenarios.pastLimitTop200.sampledCut", JSON.stringify(fix.scenarios.pastLimitTop200.sampledCut));
}
