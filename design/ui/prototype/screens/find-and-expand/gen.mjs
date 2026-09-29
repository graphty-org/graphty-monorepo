#!/usr/bin/env node
// Canvas drawings and numbers for screens/find-and-expand.html and flows/find-and-expand.html.
//
//   node screens/find-and-expand/gen.mjs        (from design/ui/prototype/)
//
// It runs kit/gen-canvas.mjs in memory, so the transaction network is the same seeded graph the
// kit draws, with two blocks added: the fraud investigation around ACC-233575 (the highest risk
// score), and a synthetic neighborhood for the patent-citation graph, which the kit has no edges
// for. The kit's own SVGs and fixtures.json are written to a temporary folder and discarded.
// Output, next to this file: <name>-light.svg and <name>-dark.svg per drawing, and numbers.json
// (every count the mock quotes, and the percent anchors of the marked nodes).
//
// ponytail: patches gen-canvas.mjs by string replacement; if its anchors move, this throws. When the
// kit is quiet, fold these two blocks into gen-canvas.mjs and point the mock at kit/canvas/.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../../kit");
const tmp = mkdtempSync(join(tmpdir(), "find-and-expand-"));
let src = readFileSync(join(kit, "gen-canvas.mjs"), "utf8");
const swap = (from, to) => {
    if (!src.includes(from)) throw new Error(`gen-canvas.mjs changed: anchor not found: ${from}`);
    src = src.replace(from, to);
};
swap("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(kit)};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(tmp, "canvas"))};`);
swap('join(here, "fixtures.json"),', `${JSON.stringify(join(tmp, "fixtures.json"))},`);

const OUT = JSON.stringify(here);

// ---- block 1: inside the transaction section, where n, ids, kinds, edges, adj, deg, risk, ring exist
const investigation = `
    {
        const OUT = ${OUT};
        const out = Array.from({ length: n }, () => []), inn = Array.from({ length: n }, () => []);
        for (const [s, t] of edges) { out[s].push(t); inn[t].push(s); }
        const L = (v, dir) => (dir === "out" ? out[v] : dir === "in" ? inn[v] : adj[v]);
        const grow = (set, dir) => { const s = new Set(set); for (const v of set) for (const w of L(v, dir)) s.add(w); return s; };
        const hood = (seeds, hops, dir) => { let s = new Set(seeds); for (let h = 0; h < hops; h++) s = grow(s, dir); return s.size; };
        const at = new Map(ids.map((x, i) => [x, i]));
        const seed = at.get("ACC-233575");
        const hit = at.get("ACC-782213");
        const merchant = 57; // the merchant every ring account pays
        const B0 = grow([seed], "all");
        const B1 = new Set([...B0, hit]);
        const B2 = grow(B1, "out");
        const byRisk = [...ring].sort((a, b) => risk[b] - risk[a] || ids[a].localeCompare(ids[b]));
        const row = (i) => ({ id: ids[i], kind: kinds[i], country: country[i], degree: deg[i], out: out[i].length, in: inn[i].length, riskScore: risk[i], flagged: ring.includes(i), rankByRisk: 1 + [...Array(n).keys()].filter((j) => risk[j] > risk[i]).length });
        // One layout for the largest boundary; each smaller one reuses its positions and is fitted
        // to the frame, as the view fits the filtered graph (a uniform scale keeps the arrangement).
        const list = [...B2];
        const local = new Map(list.map((g, k) => [g, k]));
        const sub = edges.filter(([s, t]) => local.has(s) && local.has(t)).map(([s, t]) => [local.get(s), local.get(t)]);
        const p2 = layout(list.length, sub, { strength: -420, distance: 70 });
        const fit = (keep) => {
            const ks = [...keep].map((g) => local.get(g));
            const xs = ks.map((k) => p2[k][0]), ys = ks.map((k) => p2[k][1]);
            const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
            const m = 120, k = Math.min((W - 2 * m) / (x1 - x0 || 1), (H - 2 * m) / (y1 - y0 || 1), 3);
            const ox = (W - k * (x1 - x0)) / 2, oy = (H - k * (y1 - y0)) / 2;
            return p2.map(([x, y]) => [ox + k * (x - x0), oy + k * (y - y0)]);
        };
        drawGraph.labelOf = (k) => ids[list[k]];
        const flaggedColor = (k) => (ring.includes(list[k]) ? OKABE_ITO[4] : GRAY);
        const L2 = (set) => new Set([...set].map((g) => local.get(g)));
        const anchors = {};
        const draw = (name, keep, marks, labels, title) => {
            const pos = fit(keep);
            const K = L2(keep);
            for (const theme of ["light", "dark"])
                writeFileSync(OUT + "/" + name + "-" + theme + ".svg", drawGraph({ theme, pos, edges: sub, color: flaggedColor, size: () => 8, labels: [...labels].map((g) => local.get(g)).filter((k) => K.has(k)), marks, keep: K, title }));
            anchors[name] = Object.fromEntries([...keep].map((g) => [ids[g], pct(pos[local.get(g)])]));
        };
        const flaggedOrMerchant = (set) => [...set].filter((g) => ring.includes(g) || deg[g] >= 100 || g === merchant || g === seed);
        draw("boundary", B0, { selected: local.get(seed) }, B0, "ACC-233575 and its 8 counterparties, filtered to");
        draw("boundary-hit", B1, { selected: local.get(hit) }, B1, "The boundary with ACC-782213 added, selected");
        draw("grown", B2, { selected: local.get(seed) }, flaggedOrMerchant(B2), "The boundary grown one hop along outgoing transfers: " + B2.size + " accounts");
        draw("boundary-hit-all", B1, { selected: [...B1].map((g) => local.get(g)) }, B1, "The 10 accounts of the boundary, all selected");
        draw("grown-577269", B2, { selected: local.get(at.get("ACC-577269")) }, flaggedOrMerchant(B2), "The grown boundary, ACC-577269 selected");
        const merchantIn = at.get("ACC-893168"); // a merchant inside the first step: it receives, never sends
        draw("boundary-merchant", B0, { selected: local.get(merchantIn) }, B0, "The 9 accounts of the first step, ACC-893168 selected");
        // The whole graph as density with the seed selected (the drawn graph before any filter),
        // and with the seed hovered (Find's highlighted hit, before Enter).
        for (const theme of ["light", "dark"]) {
            writeFileSync(OUT + "/seed-selected-" + theme + ".svg", hexDensity({ theme, pos, marked: [seed], size: () => 6, color: () => OKABE_ITO[4], title: "3,000 accounts as density, ACC-233575 selected" }));
            writeFileSync(OUT + "/seed-hover-" + theme + ".svg", hexDensity({ theme, pos, marked: [seed], size: () => 6, color: () => OKABE_ITO[4], markKind: "hover", title: "3,000 accounts as density, ACC-233575 hovered" }));
        }
        anchors["seed-selected"] = { "ACC-233575": pct(pos[seed]) };
        // Connections (interface-specification 4.2): distinct neighbors and edges, In, Out and All,
        // over the full graph or inside a filtered scope.
        const conn = (i, scope = null) => {
            const ok = (w) => !scope || scope.has(w);
            const eo = out[i].filter(ok), ei = inn[i].filter(ok);
            return { nIn: new Set(ei).size, nOut: new Set(eo).size, nAll: new Set([...eo, ...ei]).size, eIn: ei.length, eOut: eo.length, eAll: ei.length + eo.length };
        };
        // The next seed: the riskiest account whose neighbors are all outside the kept 34: a new, unrelated alert.
        const nextI = [...Array(n).keys()].filter((g) => ![...grow([g], "all")].some((w) => B2.has(w))).sort((a, b) => risk[b] - risk[a] || ids[a].localeCompare(ids[b]))[0];
        const NB = grow([nextI], "all");
        {
            // Its first step gets its own layout (a different part of the graph).
            const nl = [...NB], nloc = new Map(nl.map((g, k) => [g, k]));
            const ne = edges.filter(([s, t]) => nloc.has(s) && nloc.has(t)).map(([s, t]) => [nloc.get(s), nloc.get(t)]);
            const np = layout(nl.length, ne, { strength: -420, distance: 70 });
            const xs = np.map((p) => p[0]), ys = np.map((p) => p[1]);
            const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
            const m = 160, k = Math.min((W - 2 * m) / (x1 - x0 || 1), (H - 2 * m) / (y1 - y0 || 1), 3);
            const ox = (W - k * (x1 - x0)) / 2, oy = (H - k * (y1 - y0)) / 2;
            const npos = np.map(([x, y]) => [ox + k * (x - x0), oy + k * (y - y0)]);
            const lab = drawGraph.labelOf;
            drawGraph.labelOf = (q) => ids[nl[q]];
            for (const theme of ["light", "dark"])
                writeFileSync(OUT + "/next-boundary-" + theme + ".svg", drawGraph({ theme, pos: npos, edges: ne, color: (q) => (ring.includes(nl[q]) ? OKABE_ITO[4] : GRAY), size: () => 8, labels: nl.map((g, q) => q), marks: { selected: nloc.get(nextI) }, title: ids[nextI] + " and its neighbors, the next case" }));
            drawGraph.labelOf = lab;
            anchors["next-boundary"] = Object.fromEntries(nl.map((g, q) => [ids[g], pct(npos[q])]));
        }
        const nums = {
            total: n,
            seed: row(seed),
            hit: row(hit),
            merchant: row(merchant),
            seedHood: { all1: hood([seed], 1, "all"), all2: hood([seed], 2, "all"), all3: hood([seed], 3, "all"), out1: hood([seed], 1, "out"), out2: hood([seed], 2, "out"), out3: hood([seed], 3, "out"), in1: hood([seed], 1, "in"), in2: hood([seed], 2, "in"), in3: hood([seed], 3, "in") },
            conn: { seed: conn(seed), seedInGrown: conn(seed, B2), hit: conn(hit), t577InGrown: conn(at.get("ACC-577269"), B2), t577: conn(at.get("ACC-577269")), merchantInB0: conn(merchantIn, B0), merchant: conn(merchantIn), next: conn(nextI) },
            merchantIn: { ...row(merchantIn), hoodOut: { 1: hood([merchantIn], 1, "out"), 2: hood([merchantIn], 2, "out"), 3: hood([merchantIn], 3, "out") }, hoodIn1: hood([merchantIn], 1, "in"), hoodAll1: hood([merchantIn], 1, "all"), hoodIn1InB0: [...grow([merchantIn], "in")].filter((g) => B0.has(g)).length, hoodAll1InB0: [...grow([merchantIn], "all")].filter((g) => B0.has(g)).length },
            next: { ...row(nextI), hood: { all1: hood([nextI], 1, "all"), all2: hood([nextI], 2, "all"), all3: hood([nextI], 3, "all"), in1: hood([nextI], 1, "in"), out1: hood([nextI], 1, "out") }, rows: [...NB].sort((a, b) => risk[b] - risk[a] || ids[a].localeCompare(ids[b])).map(row), edges: edges.filter(([a, b]) => NB.has(a) && NB.has(b)).length, flaggedInHood: [...NB].filter((g) => ring.includes(g)).length, inKept: [...NB].filter((g) => B2.has(g)).length },
            hitHood: { all1: hood([hit], 1, "all"), out1: hood([hit], 1, "out"), all2: hood([hit], 2, "all") },
            boundary: [...B0].map(row),
            boundaryHitInside: B0.has(hit),
            edgesB1: edges.filter(([a, b]) => B1.has(a) && B1.has(b)).length,
            grow: { fromNodes: B1.size, out: grow(B1, "out").size, all: grow(B1, "all").size, in: grow(B1, "in").size, out2: hood(B1, 2, "out"), out3: hood(B1, 3, "out"),
                // Select neighbors reads the filtered graph: from the 10, one hop out inside the 10.
                selectOutInside: [...grow(B1, "out")].filter((g) => B1.has(g)).length },
            grownFlagged: [...B2].filter((g) => ring.includes(g)).length,
            grownRows: [...B2].sort((a, b) => risk[b] - risk[a] || ids[a].localeCompare(ids[b])).map(row),
            ranked: byRisk.map((i) => ({ ...row(i), inBoundary: B0.has(i) })),
            anchors,
        };
        writeFileSync(OUT + "/numbers.json", JSON.stringify({ generatedBy: "screens/find-and-expand/gen.mjs -- rerun instead of editing", transactions: nums }, null, 1));
    }
`;
swap("    const kindCounts = kinds.reduce", investigation + "    const kindCounts = kinds.reduce");

// ---- block 2: after everything, a synthetic neighborhood for the citation graph (no edges exist).
// Seed patent 6061722 (granted 2000) cites 11 older patents and is cited by 1,386 newer ones. Its
// prior art two hops back (Out, 2 hops) is 148 patents, drawn. The All-direction counts are set here,
// not derived, because the sample has no edges: 2 hops All is 41,207 patents (under renderCeiling,
// 50,000) with 612,944 citations among them (over edgesDrawn, 100,000), so its edges would not draw.
const citations = `
{
    const OUT = ${OUT};
    const r = mulberry32(6061722);
    const CATS = ["Computers and communications", "Electrical", "Chemical", "Mechanical", "Drugs and medical", "Other"];
    const pid = () => String(5855000 + Math.floor(r() * 479000));
    const L1 = 11, L2 = 136, n = 1 + L1 + L2;
    const e = [];
    for (let i = 1; i <= L1; i++) e.push([0, i]);
    for (let j = 1 + L1; j < n; j++) {
        e.push([1 + Math.floor(r() ** 1.6 * L1), j]);
        if (r() < 0.25) e.push([1 + Math.floor(r() * L1), j]);
        if (r() < 0.08) e.push([j, 1 + L1 + Math.floor(r() * L2)]);
    }
    const E = e.filter(([a, b]) => a !== b);
    const pos = layout(n, E, { strength: -55, distance: 36 });
    const ids = [ "6061722", ...Array.from({ length: n - 1 }, pid) ];
    const recv = [1386, ...Array.from({ length: L1 }, () => Math.round(120 + r() ** 2 * 1100)), ...Array.from({ length: L2 }, () => Math.round(r() ** 3 * 260))];
    const year = [2000, ...Array.from({ length: n - 1 }, () => 1999)];
    const cat = [CATS[0], ...Array.from({ length: n - 1 }, () => (r() < 0.72 ? CATS[0] : CATS[1 + Math.floor(r() * 5)]))];
    const top = [...recv.keys()].sort((a, b) => recv[b] - recv[a]).slice(0, 7);
    drawGraph.labelOf = (i) => ids[i];
    for (const theme of ["light", "dark"])
        writeFileSync(OUT + "/citations-seed-" + theme + ".svg", drawGraph({ theme, pos, edges: E, color: () => GRAY, size: (i) => (i === 0 ? 8 : i <= L1 ? 6 : 4), labels: top, marks: { selected: 0 }, edgeOpacity: 0.35, title: "Patent 6061722 and the 147 patents of its prior art, two citations back" }));
    const row = (i) => ({ id: ids[i], grantYear: year[i], category: cat[i], citationsReceived: recv[i] });
    // The full graph's top rows by citationsReceived: two synthetic patents above the seed, then
    // the seed at #3, then others; none of these others is in the seed's prior art.
    const fullTop = [ { id: "5991399", grantYear: 1999, category: CATS[0], citationsReceived: 2214 }, { id: "6006242", grantYear: 1999, category: CATS[0], citationsReceived: 1702 }, row(0),
        { id: "5933811", grantYear: 1999, category: CATS[4], citationsReceived: 1291 }, { id: "6128651", grantYear: 2000, category: CATS[0], citationsReceived: 1204 }, { id: "5960411", grantYear: 1999, category: CATS[2], citationsReceived: 1188 },
        { id: "6269361", grantYear: 2001, category: CATS[0], citationsReceived: 1102 }, { id: "6023684", grantYear: 2000, category: CATS[1], citationsReceived: 1057 } ];
    const f = JSON.parse(readFileSync(OUT + "/numbers.json", "utf8"));
    f.citations = {
        seed: { ...row(0), citesMade: L1, rank: 3 },
        // all3 is set, like all2: three citations either way reach most of the sample.
        hood: { all1: 1 + L1 + 1386, all2: 41207, all2Edges: 612944, all3: 108733, out1: 1 + L1, out2: n, out3: 403, in1: 1 + 1386, in2: 9832 },
        edgesOut2: E.length,
        // Connections of the seed: over the full sample (11 cited, cited by 1,386), and inside its
        // prior art, where nothing cites it (every citing patent is newer, so outside the step).
        conn: { full: { nIn: 1386, nOut: L1, nAll: 1386 + L1, eIn: 1386, eOut: L1, eAll: 1386 + L1 },
            inPriorArt: { nIn: E.filter(([a, b]) => b === 0).length, nOut: E.filter(([a]) => a === 0).length, nAll: E.filter(([a, b]) => a === 0 || b === 0).length, eIn: E.filter(([a, b]) => b === 0).length, eOut: E.filter(([a]) => a === 0).length, eAll: E.filter(([a, b]) => a === 0 || b === 0).length } },
        limits: { renderCeiling: 50000, edgesDrawn: 100000 },
        fullTop,
        hoodRows: [...recv.keys()].sort((a, b) => recv[b] - recv[a]).map(row),
        anchors: { seed: pct(pos[0]) },
    };
    writeFileSync(OUT + "/numbers.json", JSON.stringify(f, null, 1));
}
`;
src += citations;

const file = join(tmp, "gen-canvas.mjs");
writeFileSync(file, src);
await import(pathToFileURL(file).href);
console.log("wrote drawings and numbers.json to " + here);

// Every count the mock quotes also goes into kit/fixtures.json (scenarios.findAndExpand), where the
// kit check reads every shared number: flows/find-and-expand.html quotes the same hop sizes.
const fixturesFile = join(kit, "fixtures.json");
const fixtures = JSON.parse(readFileSync(fixturesFile, "utf8"));
fixtures.scenarios ??= {};
fixtures.scenarios.findAndExpand = JSON.parse(readFileSync(join(here, "numbers.json"), "utf8"));
writeFileSync(fixturesFile, JSON.stringify(fixtures, null, 1));
