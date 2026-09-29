#!/usr/bin/env node
// Numbers for screens/export-dialog.html that kit/fixtures.json does not hold: the mule ring's
// PageRank rank on the full graph (an integer, and a separate tie column), in March and in April,
// and the transfers inside the ring (what an open filter step's export defaults to).
// Same method as screens/run-and-read-numbers.mjs: re-runs kit/gen-canvas.mjs with inserted blocks,
// writing the kit's canvas and fixtures to a scratch folder under tmp/. Output: kit/fixtures.json
// scenarios.exportDialog.
// Run from design/ui/prototype/: node screens/export-dialog-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = join(here, "../tmp/export-dialog-numbers");
rmSync(scratch, { recursive: true, force: true });
mkdirSync(join(scratch, "canvas"), { recursive: true });

let src = readFileSync(join(kit, "gen-canvas.mjs"), "utf8");
const swap = (a, b) => {
    if (!src.includes(a)) throw new Error("anchor not found in kit/gen-canvas.mjs: " + a);
    src = src.replace(a, b);
};
swap("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(kit)};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(scratch, "canvas"))};`);
swap('join(here, "fixtures.json"),', `${JSON.stringify(join(scratch, "fixtures.json"))},`);
const a1 = "    const rows = ids.map((id, i) => ({ id, kind: kinds[i], country: country[i], degree: deg[i], pagerank: round(pr[i], 6), riskScore: risk[i], flagged: ring.includes(i) }));";
swap(a1, a1 + "\n    globalThis.__mar = { ids: [...ids], pr: [...pr], ring: [...ring], edges: edges.map((e) => [...e]), amount: [...amount] };");
const a2 = "        // Shortest directed path from a payroll business to the ring: the route money takes in.";
swap(a2, "        globalThis.__apr = { ids: alive.map((o) => ids2[o]), pr: [...pr], deg: [...degA], ring: ring.map((i) => at.get(i)) };\n" + a2);
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);

const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
const round6 = (v) => Math.round(v * 1e6) / 1e6;
// Rank 1 is the highest. Ties are values equal as written (6 decimals), which is what a reader of
// the CSV can check; tied rows share the lowest rank of the block (competition ranking, "1224").
const ranks = ({ ids, pr, ring, deg }) => {
    const w = pr.map(round6);
    return ring.filter((i) => i !== undefined).map((i) => {
        const tiedWith = w.filter((v) => v === w[i]).length - 1;
        return { id: ids[i], ...(deg ? { degree: deg[i] } : {}), pagerank: w[i], rank: 1 + w.filter((v) => v > w[i]).length, tiedWith };
    }).sort((x, y) => x.rank - y.rank || (x.id < y.id ? -1 : 1));
};
const M = globalThis.__mar, A = globalThis.__apr;
const ringSet = new Set(M.ring);
const inside = M.edges.map(([s, t], k) => [s, t, k]).filter(([s, t]) => ringSet.has(s) && ringSet.has(t));

const fix = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8")); // read last: other scripts write this file too
if (JSON.stringify(fix.datasets.transactions) !== JSON.stringify(b.datasets.transactions)) throw new Error("the transactions fixture changed: the kit and this script disagree");
const march = ranks(M);
for (const r of march) {
    const f = fix.datasets.transactions.flaggedAccounts.find((a) => a.id === r.id);
    if (!f || f.pagerank !== r.pagerank) throw new Error("PageRank mismatch on " + r.id);
}
fix.scenarios.exportDialog = {
    generatedBy: "screens/export-dialog-numbers.mjs -- regenerate instead of editing by hand",
    note: "the 14 flagged accounts' PageRank rank on the full graph, 1 = highest, ties = equal to 6 decimals as written, tied rows share the block's lowest rank; ringTransfers = March transfers with both ends in the ring",
    marchAccounts: M.ids.length,
    aprilAccounts: A.ids.length,
    march,
    april: ranks(A),
    ringInApril: A.ring.filter((j) => j !== undefined).length,
    ringTransfers: inside.length,
    ringTransferRows: inside.slice(0, 6).map(([s, t, k]) => ({ from_account: M.ids[s], to_account: M.ids[t], amount: M.amount[k].toFixed(2) })),
};
writeFileSync(join(kit, "fixtures.json"), JSON.stringify(fix, null, 1));
rmSync(scratch, { recursive: true, force: true });
console.log(JSON.stringify(fix.scenarios.exportDialog, null, 1));
