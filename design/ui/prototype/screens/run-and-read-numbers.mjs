#!/usr/bin/env node
// Numbers for screens/run-and-read.html that kit/fixtures.json does not hold: the March transfers
// ranked by money in (weighted in-degree over the amount column, proposed to graphty-element) beside
// the same accounts ranked by links in (count), so the page can show that the two rankings differ.
// Same method as screens/inspector-numbers.mjs: re-runs kit/gen-canvas.mjs with one inserted block,
// writing the kit's canvas and fixtures to a throwaway folder. Output: kit/fixtures.json
// scenarios.runAndReadMoney, with the count of March transfers that have no amount.
// Run from design/ui/prototype/: node screens/run-and-read-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "rr-"));
mkdirSync(join(scratch, "canvas"));

const block = String.raw`
    globalThis.__all = () => ids.map((id, i) => {
        const o = { id, kind: kinds[i], linksIn: 0, linksOut: 0, moneyIn: 0, moneyOut: 0 };
        edges.forEach(([a, b], e) => {
            if (b === i) { o.linksIn++; o.moneyIn += amount[e]; }
            if (a === i) { o.linksOut++; o.moneyOut += amount[e]; }
        });
        return o;
    });
    globalThis.__noAmount = amount.filter((a) => !Number.isFinite(a)).length;
`;

let src = readFileSync(join(kit, "gen-canvas.mjs"), "utf8");
const swap = (a, b) => {
    if (!src.includes(a)) throw new Error("anchor not found in kit/gen-canvas.mjs: " + a);
    src = src.replace(a, b);
};
swap("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(kit)};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(scratch, "canvas"))};`);
swap('join(here, "fixtures.json"),', `${JSON.stringify(join(scratch, "fixtures.json"))},`);
const a2 = "    const rows = ids.map((id, i) => ({ id, kind: kinds[i], country: country[i], degree: deg[i], pagerank: round(pr[i], 6), riskScore: risk[i], flagged: ring.includes(i) }));";
swap(a2, a2 + "\n" + block);
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);

const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
const all = globalThis.__all().map((o) => ({ ...o, moneyIn: Math.round(o.moneyIn), moneyOut: Math.round(o.moneyOut) }));
const rank = (key) => {
    const s = [...all].sort((x, y) => y[key] - x[key] || (x.id < y.id ? -1 : 1));
    return new Map(s.map((o, k) => [o.id, k + 1]));
};
const byMoney = rank("moneyIn");
const byLinks = rank("linksIn");
const row = (o) => ({ id: o.id, kind: o.kind, moneyIn: o.moneyIn, linksIn: o.linksIn, moneyRank: byMoney.get(o.id), linksRank: byLinks.get(o.id) });
const topMoneyIn = [...all].sort((x, y) => byMoney.get(x.id) - byMoney.get(y.id)).slice(0, 8).map(row);
const topLinksIn = [...all].sort((x, y) => byLinks.get(x.id) - byLinks.get(y.id)).slice(0, 8).map(row);
const inBoth = topMoneyIn.slice(0, 5).filter((r) => r.linksRank <= 5).length;

const fix = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8")); // read last: other scripts write this file too
if (JSON.stringify(fix.datasets.transactions) !== JSON.stringify(b.datasets.transactions)) throw new Error("the transactions fixture changed: the kit and this script disagree");
// Check: link counts are the kit's own degrees, and the merchant's money in is the inspector's.
const deg = new Map(fix.datasets.transactions.rows.map((r) => [r.id, r.degree]));
for (const o of all) if (deg.has(o.id) && deg.get(o.id) !== o.linksIn + o.linksOut) throw new Error("degree mismatch on " + o.id);
const m = fix.scenarios?.inspector?.merchant;
if (m && Math.round(m.inAmount) !== all.find((o) => o.id === m.id).moneyIn) throw new Error("merchant money in mismatch");

(fix.scenarios ??= {}).runAndReadMoney = {
    generatedBy: "screens/run-and-read-numbers.mjs -- regenerate instead of editing by hand",
    note: "March transfers: money in (sum of amount on transfers in, whole dollars; weighted in-degree, proposed to graphty-element) against links in (count of transfers in). Ranks over all 3,000 accounts.",
    accounts: all.length,
    transfersWithNoAmount: globalThis.__noAmount,
    topMoneyIn,
    topLinksIn,
    topFiveInBoth: inBoth,
};
writeFileSync(join(kit, "fixtures.json"), JSON.stringify(fix, null, 1));
console.log(JSON.stringify(fix.scenarios.runAndReadMoney, null, 1));
