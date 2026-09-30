#!/usr/bin/env node
// Numbers for screens/sets-and-paths.html, state 11: the shortest directed path from ACC-242954 to
// ACC-593226 on the March transfers, with every hop's time, and the first hop that is earlier than
// the hop before it. Transfer times as flows/sets-and-paths-numbers.mjs gives them.
// It re-runs kit/gen-canvas.mjs unchanged except for one inserted block (the table-dock-numbers.mjs
// way), so every account, transfer and amount is the kit's own; the kit's canvas and fixtures go
// to a throwaway folder. Output: kit/fixtures.json scenarios.setsAndPathsInversion.
// Run from design/ui/prototype/: node screens/sets-and-paths-numbers.mjs
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
    const idx = new Map(ids.map((s, i) => [s, i]));
    const outK = Array.from({ length: n }, () => []);
    edges.forEach(([a], k) => outK[a].push(k));
    const src = idx.get("ACC-242954"), dst = idx.get("ACC-593226");
    // Breadth-first over directed transfers, keeping every predecessor edge on a shortest route.
    const d = new Array(n).fill(-1), pred = Array.from({ length: n }, () => []);
    d[src] = 0;
    const q = [src];
    for (let i = 0; i < q.length; i++) for (const k of outK[q[i]]) {
        const b = edges[k][1];
        if (d[b] < 0) (d[b] = d[q[i]] + 1, q.push(b));
        if (d[b] === d[q[i]] + 1) pred[b].push(k);
    }
    const routes = [];
    const walk = (v, tail) => (v === src ? routes.push(tail) : pred[v].forEach((k) => walk(edges[k][0], [k, ...tail])));
    walk(dst, []);
    if (routes.length !== 1) throw new Error("expected one route, got " + routes.length);
    const r = routes[0];
    const inv = r.findIndex((k, i) => i > 0 && ts[k] < ts[r[i - 1]]);
    const fix = JSON.parse(readFileSync(${FIX}, "utf8"));
    (fix.scenarios ??= {}).setsAndPathsInversion = {
        generatedBy: "screens/sets-and-paths-numbers.mjs -- regenerate instead of editing by hand",
        note: "Shortest directed path ACC-242954 to ACC-593226 on the March transfers, counting transfers; direction follows the data",
        from: ids[src],
        to: ids[dst],
        hops: r.length,
        routes: routes.length,
        accounts: [ids[src], ...r.map((k) => ids[edges[k][1]])],
        transfers: r.map((k) => ({ step: r.indexOf(k) + 1, source: ids[edges[k][0]], target: ids[edges[k][1]], timestamp: hopIso(ts[k]), amount: amount[k], earlierThanHopBefore: r.indexOf(k) > 0 && ts[k] < ts[r[r.indexOf(k) - 1]] })),
        total: Math.round(r.reduce((s, k) => s + amount[k], 0) * 100) / 100,
        firstInversion: inv < 0 ? null : { hop: inv + 1, timestamp: hopIso(ts[r[inv]]), hopBefore: inv, hopBeforeTimestamp: hopIso(ts[r[inv - 1]]) },
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
console.log("wrote scenarios.setsAndPathsInversion into kit/fixtures.json");
