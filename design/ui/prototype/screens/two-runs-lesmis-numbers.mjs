#!/usr/bin/env node
// Writes fixtures.scenarios.twoRunsLesmis: the comparison of the two Betweenness runs on Les
// Miserables (screens/comparison.html#runs-lesmis): Run 2 on the full graph (77 characters) and
// Run 1 on the 60 left by "Filter to degree >= 2". Computed from kit/fixtures.json only: the full
// run's unrounded values (scenarios.tableDock.lesmisBetweennessRaw) and the filtered run's values
// (datasets.lesmis.filterSteps.betweennessOnStep1). Nothing is typed.
// Run from design/ui/prototype/ after kit/gen-canvas.mjs: node screens/two-runs-lesmis-numbers.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "../kit/fixtures.json");
const fx = JSON.parse(readFileSync(FIX, "utf8"));
const L = fx.datasets.lesmis;
const raw = fx.scenarios.tableDock.lesmisBetweennessRaw;
const full = new Map(L.rows.map((r) => [r.label, raw[Number(r.id)]]));
const step1 = new Map(L.filterSteps.betweennessOnStep1.map((r) => [r.label, r.betweenness]));
if (full.size !== L.nodes) throw new Error(`full run: ${full.size} values, ${L.nodes} nodes`);
if (step1.size !== L.filterSteps.statsByState["1"].nodes) throw new Error("filtered run: count differs from statsByState.1");

// "#k" ranks, rank 1 the top; tied values share the top place of the tie, marked "=" when shown.
const places = (m) => {
    const vs = [...m.values()].sort((a, b) => b - a);
    const out = new Map();
    for (const [k, v] of m) out.set(k, { rank: vs.indexOf(v) + 1, tied: vs.filter((x) => x === v).length > 1 });
    return out;
};
// Average ranks for Spearman (ties take the middle of the places they fill).
const avgRanks = (keys, m) => {
    const vs = keys.map((k) => m.get(k));
    const sorted = [...vs].sort((a, b) => b - a);
    return vs.map((v) => { const first = sorted.indexOf(v); const n = sorted.filter((x) => x === v).length; return first + (n + 1) / 2; });
};
const spearman = (keys) => {
    const a = avgRanks(keys, full), b = avgRanks(keys, step1);
    const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < keys.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return Math.round((num / Math.sqrt(da * db)) * 1000) / 1000;
};
const pf = places(full), p1 = places(step1);
const both = [...step1.keys()];
const zeroBoth = both.filter((k) => full.get(k) === 0 && step1.get(k) === 0);
const top = (p, n) => new Set([...p].filter(([, x]) => x.rank <= n).map(([k]) => k));
const topBoth = (n) => [...top(pf, n)].filter((k) => top(p1, n).has(k)).length;
const show = (x) => `#${x.rank}${x.tied ? "=" : ""}`;
// The difference list: characters in the top 20 of either run, by places moved (full minus filtered).
const moved = both
    .filter((k) => pf.get(k).rank <= 20 || p1.get(k).rank <= 20)
    .map((k) => ({ label: k, full: show(pf.get(k)), filtered: show(p1.get(k)), moved: pf.get(k).rank - p1.get(k).rank }))
    .sort((a, b) => Math.abs(b.moved) - Math.abs(a.moved) || a.label.localeCompare(b.label));
const notInRun1 = [...full.keys()].filter((k) => !step1.has(k));

fx.scenarios.twoRunsLesmis = {
    generatedBy: "screens/two-runs-lesmis-numbers.mjs -- regenerate instead of editing by hand",
    fullNodes: full.size,
    filteredNodes: step1.size,
    notInRun1: notInRun1.length,
    notInRun1Labels: notInRun1,
    top10Both: topBoth(10),
    top5Both: topBoth(5),
    spearman: spearman(both),
    zeroBoth: zeroBoth.length,
    spearmanOffBottom: { rho: spearman(both.filter((k) => !zeroBoth.includes(k))), left: zeroBoth.length },
    higherOnFiltered: moved.filter((d) => d.moved > 0).slice(0, 6),
    higherOnFull: moved.filter((d) => d.moved < 0).slice(0, 6),
};
writeFileSync(FIX, JSON.stringify(fx, null, 1));
console.log(JSON.stringify(fx.scenarios.twoRunsLesmis, null, 1));
