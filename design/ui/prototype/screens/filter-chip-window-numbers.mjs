#!/usr/bin/env node
// Numbers for the time-window step in screens/filter-chip.html: every March transfer's timestamp,
// the transfers per day (the date column's histogram), and what the step "Filter to timestamp
// Mar 8 to Mar 14" keeps. Timestamps continue the seed kit/gen-canvas.mjs uses for the file's
// first rows (mulberry32(303), edge order), so the load step's six sample rows are the first six here.
// It re-runs kit/gen-canvas.mjs with one inserted block, writing the kit's canvas and fixtures to a
// throwaway folder; only kit/fixtures.json scenarios.filterChipWindow is written for real.
// Run from design/ui/prototype/: node screens/filter-chip-window-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "fcwin-"));
mkdirSync(join(scratch, "canvas"));
const FIX = JSON.stringify(join(kit, "fixtures.json"));

const block = String.raw`
    {
        const rW = mulberry32(303);
        const day = edges.map(() => 1 + Math.floor(Math.floor(rW() * 31 * 86400) / 86400));
        const perDay = Array.from({ length: 31 }, (_, d) => day.filter((x) => x === d + 1).length);
        const from = 8, to = 14;
        const inWin = edges.filter((_, k) => day[k] >= from && day[k] <= to);
        const accts = new Set(inWin.flat());
        const fix = JSON.parse(readFileSync(${FIX}, "utf8"));
        (fix.scenarios ??= {}).filterChipWindow = {
            generatedBy: "screens/filter-chip-window-numbers.mjs -- regenerate instead of editing by hand",
            window: { from: "2026-03-08", to: "2026-03-14", label: "Mar 8 to Mar 14" },
            transfersPerDay: perDay,
            transfers: edges.length,
            accounts: ids.length,
            transfersIn: inWin.length,
            accountsIn: accts.size,
            accountsOut: ids.length - accts.size,
            transfersOut: edges.length - inWin.length,
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
const anchor = "    // 4a. Sets and shortest path,";
swap(anchor, block + "\n" + anchor);
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);
// Check: the kit's own fixtures are reproduced, so the inserted block moved nothing, and the six
// sample rows' days agree with the timestamps written here.
const a = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
for (const k of ["lesmis", "transactions", "ppi"])
    if (JSON.stringify(a.datasets[k]) !== JSON.stringify(b.datasets[k])) throw new Error(`the ${k} fixture changed: the kit and this script disagree`);
const w = a.scenarios.filterChipWindow;
if (w.transfersPerDay.reduce((x, y) => x + y, 0) !== w.transfers) throw new Error("days do not add up to the transfers");
console.log("wrote kit/fixtures.json scenarios.filterChipWindow", JSON.stringify({ ...w, transfersPerDay: undefined }));
