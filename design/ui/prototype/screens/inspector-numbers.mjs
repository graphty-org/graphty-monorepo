#!/usr/bin/env node
// Numbers for screens/inspector.html that kit/fixtures.json does not hold: the money in and out of
// the flagged account ACC-365386 and of the busiest merchant (weighted in-strength and out-strength
// over the amount column, proposed to graphty-element), with each account's transfer counts.
// It re-runs kit/gen-canvas.mjs unchanged except for one inserted block, so every account and
// transfer is the kit's own; the kit's canvas and fixtures are written to a throwaway folder, never
// over the real ones. Output: kit/fixtures.json scenarios.inspector.
// Run from design/ui/prototype/: node screens/inspector-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "insp-"));
mkdirSync(join(scratch, "canvas"));

const block = String.raw`
    globalThis.__strength = (want) => want.map((id) => {
        const i = ids.indexOf(id);
        const o = { id, inTransfers: 0, outTransfers: 0, inAmount: 0, outAmount: 0, inFrom: new Set(), outTo: new Set() };
        edges.forEach(([a, b], e) => {
            if (b === i) { o.inTransfers++; o.inAmount += amount[e]; o.inFrom.add(a); }
            if (a === i) { o.outTransfers++; o.outAmount += amount[e]; o.outTo.add(b); }
        });
        return { id, inTransfers: o.inTransfers, outTransfers: o.outTransfers, inAmount: Math.round(o.inAmount * 100) / 100, outAmount: Math.round(o.outAmount * 100) / 100, inAccounts: o.inFrom.size, outAccounts: o.outTo.size };
    });
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

const fix = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
if (JSON.stringify(fix.datasets.transactions) !== JSON.stringify(b.datasets.transactions)) throw new Error("the transactions fixture changed: the kit and this script disagree");
const [flagged, merchant] = globalThis.__strength([fix.datasets.transactions.flaggedAccounts[0].id, fix.datasets.transactions.inspector.seed.id]);
// Check: the transfer counts are the degrees the fixtures already hold.
if (flagged.inTransfers + flagged.outTransfers !== fix.datasets.transactions.flaggedAccounts[0].degree) throw new Error("flagged account degree mismatch");
if (merchant.inTransfers !== fix.datasets.transactions.inspector.seed.in) throw new Error("merchant in-degree mismatch");
(fix.scenarios ??= {}).inspector = {
    generatedBy: "screens/inspector-numbers.mjs -- regenerate instead of editing by hand",
    note: "money in and out per account over the amount column (weighted in- and out-strength, proposed to graphty-element), March transfers",
    flagged,
    merchant,
};
writeFileSync(join(kit, "fixtures.json"), JSON.stringify(fix, null, 1));
console.log("wrote kit/fixtures.json scenarios.inspector", JSON.stringify({ flagged, merchant }));
