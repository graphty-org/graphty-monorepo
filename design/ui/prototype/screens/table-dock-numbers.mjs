#!/usr/bin/env node
// Numbers and drawings for screens/table-dock.html that kit/fixtures.json does not hold:
//   - Les Miserables with Valjean selected and Javert hovered, nothing keyboard-focused on the
//     canvas (the table holds keyboard focus), for the linked-hover row
//   - the March transfers drawn by community with the 14 flagged accounts carrying the selection
//     ring, and every account's row, so the page can sort all 3,000 by PageRank and profile each column,
//     with each account's links and money in and out (weighted degree by amount)
// It re-runs kit/gen-canvas.mjs unchanged except for two inserted blocks, so every account, edge and
// position is the kit's own; the kit's canvas and fixtures are written to a throwaway folder, never
// over the real ones. Output: kit/fixtures.json scenarios.tableDock, screens/img/table-dock-*.svg.
// Run from design/ui/prototype/: node screens/table-dock-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "tdock-"));
mkdirSync(join(scratch, "canvas"));
mkdirSync(join(here, "img"), { recursive: true });
const IMG = JSON.stringify(join(here, "img"));
const FIX = JSON.stringify(join(kit, "fixtures.json"));

const lesmisBlock = String.raw`
    for (const theme of ["light", "dark"])
        writeFileSync(${IMG} + "/table-dock-lesmis-hover-" + theme + ".svg", drawGraph({
            theme, pos, edges, color: (i) => colorOfGroup(group[i]), size,
            labels: [...new Set([...budget, id("Valjean"), id("Javert")])],
            marks: { selected: id("Valjean"), hover: id("Javert") },
            title: "Les Miserables colored by group, sized by degree, Valjean selected, Javert hovered",
        }));
    globalThis.__lmBetweenness = Array.from(bc);
`;

const transferBlock = String.raw`
{
    for (const theme of ["light", "dark"])
        writeFileSync(${IMG} + "/table-dock-transfers-ring-" + theme + ".svg", dots({
            theme, P: pos, E: edges, D: degM, color: (i) => colorM(commM[i]), selected: ring,
            title: "March transfers, 3,000 accounts colored by Louvain community, sized by degree, the 14 flagged accounts selected",
        }));
    // Weighted degree on the transfers: links (transfers) in and out, and money (sum of amount) in and out.
    const linksIn = new Array(rows.length).fill(0), linksOut = new Array(rows.length).fill(0);
    const moneyIn = new Array(rows.length).fill(0), moneyOut = new Array(rows.length).fill(0);
    edges.forEach(([a, b], e) => { linksOut[a]++; linksIn[b]++; moneyOut[a] += amount[e]; moneyIn[b] += amount[e]; });
    // One row per account: id, kind, country, degree, pagerank, riskScore, community, flagged,
    // linksIn, linksOut, moneyIn, moneyOut (USD, to the cent).
    // Into the real kit/fixtures.json, scenarios.tableDock (read, set, write back).
    const fix = JSON.parse(readFileSync(${FIX}, "utf8"));
    (fix.scenarios ??= {}).tableDock = {
        generatedBy: "screens/table-dock-numbers.mjs -- regenerate instead of editing by hand",
        columns: ["id", "kind", "country", "degree", "pagerank", "riskScore", "community", "flagged", "linksIn", "linksOut", "moneyIn", "moneyOut"],
        communityColors: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((c) => ["Community " + c, colorM(c)])),
        otherColor: colorM(99),
        rows: rows.map((r, i) => [r.id, r.kind, r.country, r.degree, r.pagerank, r.riskScore, commM[i], r.flagged ? 1 : 0,
            linksIn[i], linksOut[i], Math.round(moneyIn[i] * 100) / 100, Math.round(moneyOut[i] * 100) / 100]),
        // Unrounded values, so a rank column ranks what the element ranks (ties only where values are equal).
        pagerankRaw: globalThis.__txPagerank,
        lesmisBetweennessRaw: globalThis.__lmBetweenness,
        ppi: globalThis.__ppi,
    };
    writeFileSync(${FIX}, JSON.stringify(fix, null, 1));
}
`;

// The protein network's 300 rows with unrounded betweenness and PageRank, for the ranked-measures state.
const ppiBlock = String.raw`
    globalThis.__ppi = { columns: ["id", "module", "degree", "betweenness", "pagerank"], rows: names.map((g, i) => [g, mod[i], deg[i], bc[i], pr[i]]) };
`;
const txPrBlock = String.raw`
    globalThis.__txPagerank = Array.from(pr);
`;

let src = readFileSync(join(kit, "gen-canvas.mjs"), "utf8");
const swap = (a, b) => {
    if (!src.includes(a)) throw new Error("anchor not found in kit/gen-canvas.mjs: " + a);
    src = src.replace(a, b);
};
swap("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(kit)};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(scratch, "canvas"))};`);
swap('join(here, "fixtures.json"),', `${JSON.stringify(join(scratch, "fixtures.json"))},`);
swap("    // The keyboard walk after its first step", lesmisBlock + "\n    // The keyboard walk after its first step");
swap("        const rowA = (j) =>", transferBlock + "\n        const rowA = (j) =>");
{
    const a1 = "    const rows = names.map((g, i) => ({ id: g, module: mod[i], degree: deg[i], betweenness: round(bc[i], 4), pagerank: round(pr[i], 5), log2FoldChange: fc[i] }));";
    swap(a1, a1 + "\n" + ppiBlock);
    const a2 = "    const rows = ids.map((id, i) => ({ id, kind: kinds[i], country: country[i], degree: deg[i], pagerank: round(pr[i], 6), riskScore: risk[i], flagged: ring.includes(i) }));";
    swap(a2, a2 + "\n" + txPrBlock);
}
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);
// Check: the kit's own fixtures are reproduced, so the inserted blocks moved nothing.
const a = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
for (const k of ["lesmis", "transactions", "ppi"])
    if (JSON.stringify(a.datasets[k]) !== JSON.stringify(b.datasets[k])) throw new Error(`the ${k} fixture changed: the kit and this script disagree`);
console.log("wrote kit/fixtures.json scenarios.tableDock and screens/img/table-dock-*.svg");
