#!/usr/bin/env node
// Numbers for the group comparison in screens/styles-list.html: the biggest Louvain community
// (Community 1) against the rest of the 300 proteins, on each numeric column, with median,
// quartiles, whiskers and the rank-biserial r. Descriptive only: no test, no p-value.
// It re-runs kit/gen-canvas.mjs unchanged except for one inserted line that exposes the per-protein
// arrays (log2FoldChange is drawn from the generator's random stream, so it cannot be read back from
// fixtures.json); the kit's canvas and fixtures are written to a throwaway folder, never over the real
// ones. Output: kit/fixtures.json scenarios.groupCompare.
// Run from design/ui/prototype/: node screens/group-compare-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "gcmp-"));
mkdirSync(join(scratch, "canvas"));

let src = readFileSync(join(kit, "gen-canvas.mjs"), "utf8");
const swap = (a, b) => {
    if (!src.includes(a)) throw new Error("anchor not found in kit/gen-canvas.mjs: " + a);
    src = src.replace(a, b);
};
swap("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(kit)};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(scratch, "canvas"))};`);
swap('join(here, "fixtures.json"),', `${JSON.stringify(join(scratch, "fixtures.json"))},`);
const a1 = "    const rows = names.map((g, i) => ({ id: g, module: mod[i], degree: deg[i], betweenness: round(bc[i], 4), pagerank: round(pr[i], 5), log2FoldChange: fc[i] }));";
swap(a1, a1 + "\n    globalThis.__ppiAll = { names, mod: Array.from(mod), deg: Array.from(deg), bc: Array.from(bc), pr: Array.from(pr), fc: Array.from(fc) };\n");
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);

const fix = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
if (JSON.stringify(fix.datasets.ppi) !== JSON.stringify(b.datasets.ppi)) throw new Error("the ppi fixture changed: the kit and this script disagree");

const { names, deg, bc, pr, fc } = globalThis.__ppiAll;
const lv = fix.datasets.ppi.louvain;
const g = lv.groups[0];
const inG = new Set(g.members);

// Quartiles by linear interpolation (numpy's default, type 7).
const q = (s, p) => { const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
const box = (vals) => {
    const s = [...vals].sort((x, y) => x - y);
    const [q1, med, q3] = [q(s, 0.25), q(s, 0.5), q(s, 0.75)];
    const iqr = q3 - q1;
    const lo = s.find((v) => v >= q1 - 1.5 * iqr), hi = [...s].reverse().find((v) => v <= q3 + 1.5 * iqr);
    return { n: s.length, min: s[0], max: s[s.length - 1], q1, median: med, q3, whiskerLow: lo, whiskerHigh: hi, outliers: s.filter((v) => v < lo || v > hi).length };
};
// Rank-biserial r = P(group > rest) - P(group < rest), over every group-rest pair.
const rbr = (a, c) => { let gt = 0, lt = 0; for (const x of a) for (const y of c) { if (x > y) gt++; else if (x < y) lt++; } return (gt - lt) / (a.length * c.length); };

const cols = { log2FoldChange: fc, degree: deg, betweenness: bc, pagerank: pr };
const r6 = (x) => Number(x.toPrecision(6));
const columns = {};
for (const [k, arr] of Object.entries(cols)) {
    const gv = [], rv = [];
    names.forEach((n, i) => (inG.has(n) ? gv : rv).push(arr[i]));
    const round = (o) => Object.fromEntries(Object.entries(o).map(([kk, v]) => [kk, Number.isInteger(v) ? v : r6(v)]));
    columns[k] = { group: round(box(gv)), rest: round(box(rv)), rankBiserial: Number(rbr(gv, rv).toFixed(2)), groupValues: gv.map(r6), restValues: rv.map(r6) };
}
// Every community against the rest, on log2FoldChange: median, the one statistic of that column.
const modOf = Object.fromEntries(fix.datasets.ppi.rows.map((r) => [r.id, r.module]));
const colors = fix.datasets.ppi.moduleColors;
const fcOf = Object.fromEntries(names.map((n, i) => [n, fc[i]]));
const med = (v) => { const s = [...v].sort((x, y) => x - y); return q(s, 0.5); };
// The file's modules as member sets, read back from the generator's names (rows holds only 40).
const modules = {};
for (const gr of lv.groups) for (const m of gr.members) modules[m] ??= null;
const modName = globalThis.__ppiAll.mod;
names.forEach((n, i) => { modules[n] = modName[i]; });
const modSets = {};
for (const [n, m] of Object.entries(modules)) if (m !== "Unassigned") (modSets[m] ??= new Set()).add(n);
const shared = (a, b) => { let k = 0; for (const x of a) if (b.has(x)) k++; return k; };
const best = (x, cands) => { let top = null, k = -1; for (const [id, set] of cands) { const o = shared(x, set); if (o > k) { k = o; top = id; } } return [top, k]; };
const comSets = lv.groups.map((gr) => [gr.community, new Set(gr.members)]);
const modEntries = Object.entries(modSets);
const used = new Set();
const communities = lv.groups.map((gr) => {
    const set = new Set(gr.members);
    const [m, k] = best(set, modEntries);
    const [back] = best(modSets[m], comSets);
    const matched = k > 0 && back === gr.community ? m : null;
    if (matched) used.add(colors[matched]);
    const gv = gr.members.map((n) => fcOf[n]), rv = names.filter((n) => !set.has(n)).map((n) => fcOf[n]);
    return { community: gr.community, size: gr.size, matchedModule: matched, shared: k, moduleSize: modSets[m].size, color: matched ? colors[matched] : null,
        medianLog2FoldChange: Number(med(gv).toFixed(2)), medianLog2FoldChangeRest: Number(med(rv).toFixed(2)) };
});
const free = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#F0E442", "#000000"].filter((c) => !used.has(c));
for (const c of communities) if (!c.color) c.color = free.shift() ?? "#BDBDBD";
const louvainDefault = Object.fromEntries(lv.groups.map((gr, i) => [gr.community, i < 8 ? ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#F0E442", "#000000"][i] : "#BDBDBD"]));

fix.scenarios ??= {};
fix.scenarios.groupCompare = {
    generatedBy: "screens/group-compare-numbers.mjs -- regenerate instead of editing by hand",
    note: "Community 1 of the Louvain run (datasets.ppi.louvain) against the other proteins, per numeric column: median, quartiles (linear interpolation), whiskers at 1.5 IQR, rank-biserial r = P(member above non-member) - P(below). No test is run.",
    community: g.community,
    size: g.size,
    restSize: names.length - g.size,
    columns,
    communities,
    matchedTo: "Module (the file's modules)",
    matchedCount: communities.filter((c) => c.matchedModule).length,
    unmatchedCount: communities.filter((c) => !c.matchedModule).length,
    colorsWithoutMatching: louvainDefault,
};
writeFileSync(join(kit, "fixtures.json"), JSON.stringify(fix, null, 1));
for (const c of communities) console.log("Community", c.community, c.size, c.matchedModule, c.shared, c.color, "median", c.medianLog2FoldChange, "vs", c.medianLog2FoldChangeRest);
for (const [k, c] of Object.entries(columns)) console.log(k, "median", c.group.median, "vs", c.rest.median, "r", c.rankBiserial);
