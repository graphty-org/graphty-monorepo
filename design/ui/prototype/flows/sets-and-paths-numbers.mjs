#!/usr/bin/env node
// Numbers for flows/sets-and-paths.html that kit/fixtures.json does not hold yet: every March
// transfer's timestamp (the path hops keep the times the kit already gave them), and Neighbors
// of the flagged account ACC-233575 with direction Out, 2 steps, and a window on timestamp.
// It re-runs kit/gen-canvas.mjs unchanged except for one inserted block (the table-dock-numbers.mjs
// way), so every account, transfer and amount is the kit's own; the kit's canvas and fixtures go
// to a throwaway folder. Output: kit/fixtures.json scenarios.setsAndPathsTrace.
// Run from design/ui/prototype/: node flows/sets-and-paths-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "sp-trace-"));
mkdirSync(join(scratch, "canvas"));
const FIX = JSON.stringify(join(kit, "fixtures.json"));

const block = String.raw`
{
    // Every transfer's time: the path hops keep theirs; the rest spread over March from their own seed.
    const rTs = mulberry32(606);
    const t0 = Date.UTC(2026, 2, 1) / 1000, t1 = Date.UTC(2026, 3, 1) / 1000;
    const seed = to; // ACC-233575, the ring's highest-risk account
    const ts = edges.map(([a, b]) => hopTime.get(a + "-" + b) ?? t0 + Math.floor(rTs() * (t1 - t0)));
    // A mule ring passes money on: from the seed's arrival on the path (Mar 8, 20:29), each ring
    // account's 9,000 to 9,999 transfers out go 6 to 40 hours after the first ring money reached it. A transfer to
    // an account already reached keeps its time, so a cycle shows transfers out of order, as a real one does.
    {
        const ringSet = new Set(ring);
        const outR = Array.from({ length: n }, () => []);
        edges.forEach(([a], k) => ringSet.has(a) && amount[k] >= 9000 && outR[a].push(k)); // the ring's own 9,000 to 9,999 transfers; its everyday spending keeps a March time
        const arrive = new Map([[seed, Date.parse("2026-03-08T20:29:16Z") / 1000]]);
        const q = [seed];
        const done = new Set();
        for (let qi = 0; qi < q.length; qi++) {
            const a = q[qi];
            for (const k of outR[a]) {
                if (done.has(k)) continue;
                done.add(k);
                const b = edges[k][1];
                if (!hopTime.has(a + "-" + b)) ts[k] = arrive.get(a) + 6 * 3600 + Math.floor(rTs() * 34 * 3600);
                if (ringSet.has(b) && !arrive.has(b)) (arrive.set(b, ts[k]), q.push(b));
            }
        }
    }
    const win = [Date.UTC(2026, 2, 4) / 1000, Date.UTC(2026, 2, 18) / 1000 - 1]; // Mar 4 to 17: two weeks from the path's first transfer
    const inWin = (k) => ts[k] >= win[0] && ts[k] <= win[1];
    const outK = Array.from({ length: n }, () => []);
    edges.forEach(([a], k) => outK[a].push(k));
    const fmt = (k) => ({ from_account: ids[edges[k][0]], to_account: ids[edges[k][1]], timestamp: hopIso(ts[k]), amount: amount[k] });
    // Step 1: the seed's transfers out inside the window.
    const s1 = outK[seed].filter(inWin).sort((x, y) => ts[x] - ts[y]);
    const reached1 = new Map(); // account -> earliest step-1 arrival
    for (const k of s1) { const b = edges[k][1]; if (!reached1.has(b) || ts[k] < reached1.get(b)) reached1.set(b, ts[k]); }
    // Step 2: their transfers out inside the window; one earlier than the transfer that reached the account is marked.
    const s2 = [];
    for (const [v, arr] of reached1) for (const k of outK[v]) if (inWin(k) && edges[k][1] !== seed) s2.push({ k, earlier: ts[k] < arr, arrived: arr });
    s2.sort((x, y) => ts[x.k] - ts[y.k]);
    const reached2 = new Set(s2.map((e) => edges[e.k][1]).filter((b) => b !== seed && !reached1.has(b)));
    const sum = (ks) => Math.round(ks.reduce((s, k) => s + amount[k], 0) * 100) / 100;
    const s2k = s2.map((e) => e.k);
    const all = [...s1, ...s2k];
    const span = all.length ? [hopIso(Math.min(...all.map((k) => ts[k]))), hopIso(Math.max(...all.map((k) => ts[k])))] : null;
    const fix = JSON.parse(readFileSync(${FIX}, "utf8"));
    (fix.scenarios ??= {}).setsAndPathsTrace = {
        generatedBy: "flows/sets-and-paths-numbers.mjs -- regenerate instead of editing by hand",
        note: "Neighbors of ACC-233575, direction Out, 2 steps, window on timestamp Mar 4 to 17; every March transfer's time, the path hops keeping the kit's own",
        seed: ids[seed],
        window: [hopIso(win[0]), hopIso(win[1])],
        seedOutAllMarch: outK[seed].length,
        seedOutOutsideWindow: outK[seed].length - s1.length,
        step1: { transfers: s1.length, accounts: reached1.size, total: sum(s1), rows: s1.map(fmt) },
        step2: {
            transfers: s2.length,
            accounts: reached2.size,
            total: sum(s2k),
            earlierThanHopBefore: s2.filter((e) => e.earlier).length,
            totalInOrder: sum(s2.filter((e) => !e.earlier).map((e) => e.k)),
            inOrderTransfers: s2.filter((e) => !e.earlier).length,
            inOrderAccounts: new Set(s2.filter((e) => !e.earlier).map((e) => edges[e.k][1]).filter((b) => !reached1.has(b))).size,
            lastInOrder: hopIso(Math.max(...s2.filter((e) => !e.earlier).map((e) => ts[e.k]))),
            rows: s2.map((e) => ({ ...fmt(e.k), earlierThanHopBefore: e.earlier, reachedAt: hopIso(e.arrived) })),
        },
        accounts: 1 + reached1.size + reached2.size,
        span,
        inOrderHours: Math.round((Math.max(...s2.filter((e) => !e.earlier).map((e) => ts[e.k])) - ts[s1[0]]) / 3600),
        hoursSpan: span ? Math.round((Date.parse(span[1]) - Date.parse(span[0])) / 36e5) : 0,
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
const anchor = 'path: "canvas/transactions-path-{theme}.svg" },\n        };';
swap(anchor, anchor + "\n" + block);
const tmp = join(scratch, "gen.mjs");
writeFileSync(tmp, src);
await import(pathToFileURL(tmp).href);
console.log("wrote scenarios.setsAndPathsTrace into kit/fixtures.json");
