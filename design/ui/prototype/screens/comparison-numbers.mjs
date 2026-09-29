#!/usr/bin/env node
// Numbers and drawings for screens/comparison.html that kit/fixtures.json does not hold:
//   - PageRank against betweenness on the April transfers (two measures, one graph)
//   - PageRank on March against PageRank on April (one measure, two data versions)
// It re-runs kit/gen-canvas.mjs unchanged except for one inserted block, so every account, edge and
// position is the kit's own; the kit's canvas and fixtures are written to a throwaway folder, never
// over the real ones. Output: kit/fixtures.json scenarios.comparison, screens/img/comparison-*.svg.
// Run from design/ui/prototype/: node screens/comparison-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = join(here, "../kit");
const scratch = mkdtempSync(join(tmpdir(), "cmp-"));
mkdirSync(join(scratch, "canvas"));
mkdirSync(join(here, "img"), { recursive: true });

// The inserted block runs inside the April section, after its PageRank and drawings.
const block = String.raw`
{
    const IMG = ${JSON.stringify(join(here, "img"))};
    // Directed PageRank, the same method as April's (damping 0.85, 100 iterations, unweighted).
    const dpr = (out, N, d = 0.85) => {
        let p = new Float64Array(N).fill(1 / N);
        for (let it = 0; it < 100; it++) {
            const nx = new Float64Array(N).fill(Math.round((1 - d) * 1e9) / 1e9 / N); // rounded so 0.85 teleports exactly 0.15
            let dangling = 0;
            for (let v = 0; v < N; v++) {
                if (!out[v].length) dangling += p[v];
                else for (const w of out[v]) nx[w] += (d * p[v]) / out[v].length;
            }
            for (let v = 0; v < N; v++) nx[v] += (d * dangling) / N;
            p = nx;
        }
        return Array.from(p);
    };
    const outM = Array.from({ length: n }, () => []);
    for (const [s, t] of edges) outM[s].push(t);
    const prM = dpr(outM, n);
    const prA = Array.from(pr);
    // Directed betweenness (Brandes 2001), unweighted, normalized by (n-1)(n-2).
    const bcA = new Float64Array(n2);
    for (let s = 0; s < n2; s++) {
        const S = [], P = Array.from({ length: n2 }, () => []);
        const sigma = new Float64Array(n2); sigma[s] = 1;
        const dist = new Int32Array(n2).fill(-1); dist[s] = 0;
        const q = [s];
        for (let qi = 0; qi < q.length; qi++) {
            const v = q[qi]; S.push(v);
            for (const w of outA[v]) {
                if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); }
                if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); }
            }
        }
        const delta = new Float64Array(n2);
        while (S.length) {
            const w = S.pop();
            for (const v of P[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
            if (w !== s) bcA[w] += delta[w];
        }
    }
    const bc = Array.from(bcA, (x) => x / ((n2 - 1) * (n2 - 2)));
    // Ranks: 1 is the highest value; ties take their average for the statistic, their best rank for display.
    const avgRank = (v) => {
        const o = v.map((_, i) => i).sort((a, b) => v[b] - v[a]);
        const r = new Array(v.length);
        for (let i = 0; i < o.length; ) {
            let j = i;
            while (j + 1 < o.length && v[o[j + 1]] === v[o[i]]) j++;
            for (let k = i; k <= j; k++) r[o[k]] = (i + j) / 2 + 1;
            i = j + 1;
        }
        return r;
    };
    const bestRank = (v) => {
        const o = v.map((_, i) => i).sort((a, b) => v[b] - v[a]);
        const r = new Array(v.length);
        o.forEach((i, k) => (r[i] = k > 0 && v[o[k - 1]] === v[i] ? r[o[k - 1]] : k + 1));
        return r;
    };
    const pearson = (x, y) => {
        const mx = x.reduce((a, b) => a + b, 0) / x.length, my = y.reduce((a, b) => a + b, 0) / y.length;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
        return sxy / Math.sqrt(sxx * syy);
    };
    const spearman = (x, y) => pearson(avgRank(x), avgRank(y));
    const topK = (v, k) => new Set(v.map((_, i) => i).sort((a, b) => v[b] - v[a]).slice(0, k));
    const overlap = (a, b) => [...a].filter((i) => b.has(i)).length;
    const idA = (j) => ids2[alive[j]];
    const who = (j) => (ringA.has(j) ? "ring" : kinds2[alive[j]]);

    // Two measures on April.
    const rPR = bestRank(prA), rBC = bestRank(bc);
    const zeroBC = bc.filter((x) => x === 0).length;
    const metricRows = alive.map((_, j) => j)
        .filter((j) => rPR[j] <= 100 || rBC[j] <= 100)
        .map((j) => ({ id: idA(j), kind: who(j), country: country2[alive[j]], degree: degA[j], pagerank: prA[j], betweenness: bc[j], rankPR: rPR[j], rankBC: rBC[j], change: rPR[j] - rBC[j], j }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const metrics = {
        scope: "April transfers, all " + n2 + " accounts",
        n: n2, leftOut: 0, zeroBetweenness: zeroBC,
        spearman: spearman(prA, bc),
        top50Both: overlap(topK(prA, 50), topK(bc, 50)),
        ringRanks: [...ringA].map((j) => ({ id: idA(j), rankPR: rPR[j], rankBC: rBC[j] })).sort((a, b) => a.rankBC - b.rankBC),
        rows: metricRows.slice(0, 40),
        prDomain: [Math.min(...prA), Math.max(...prA)],
        bcDomain: [Math.min(...bc.filter((x) => x > 0)), Math.max(...bc)],
    };

    // One measure on two versions: accounts in both, matched by id.
    const shared = alive.map((old, j) => [old, j]).filter(([old]) => old < n);
    const xs = shared.map(([old]) => prM[old]), ys = shared.map(([, j]) => prA[j]);
    const rM = bestRank(prM), rA = rPR;
    const topM = topK(prM, 50), topAIds = new Set([...topK(prA, 50)].map((j) => alive[j]));
    const versionRows = shared
        .filter(([old, j]) => rM[old] <= 100 || rA[j] <= 100)
        .map(([old, j]) => ({ id: ids[old], kind: who(j), country: country[old], march: prM[old], april: prA[j], rankMarch: rM[old], rankApril: rA[j], change: rM[old] - rA[j], j, old }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const newIn = alive.map((old, j) => [old, j]).filter(([old]) => old >= n);
    const allPR = [...prM, ...prA];
    const versions = {
        shared: shared.length, marchOnly: n - shared.length, aprilOnly: newIn.length,
        spearman: spearman(xs, ys),
        top50Both: [...topM].filter((i) => topAIds.has(i)).length,
        rows: versionRows.slice(0, 40),
        aprilOnlyTop: newIn.map(([old, j]) => ({ id: idA(j), kind: who(j), april: prA[j], rankApril: rA[j], j })).sort((a, b) => a.rankApril - b.rankApril).slice(0, 8),
        marchOnlyTop: [...closed].map((old) => ({ id: ids[old], kind: kinds[old], march: prM[old], rankMarch: rM[old], old })).sort((a, b) => a.rankMarch - b.rankMarch).slice(0, 8),
        domain: [Math.min(...allPR), Math.max(...allPR)],
        ringRows: shared.filter(([, j]) => ringA.has(j)).map(([old, j]) => ({ id: ids[old], rankMarch: rM[old], rankApril: rA[j], change: rM[old] - rA[j] })).sort((a, b) => a.rankApril - b.rankApril),
    };

    // Drawings. Nodes at one size (no size channel on the comparison), only the selection labeled.
    // Ramp: viridis; on the dark canvas it starts at 0.4 of the way along, the first point with 3:1
    // against #1E1E1E, so the low end does not vanish (framework-changes.md, dark sequential ramps).
    const DARK_LO = 0.4;
    const rampAt = (u, theme) => {
        const v = theme === "dark" ? DARK_LO + (1 - DARK_LO) * u : u;
        const t = v * (VIRIDIS.length - 1), k = Math.min(VIRIDIS.length - 2, Math.floor(t));
        return lerp(VIRIDIS[k], VIRIDIS[k + 1], t - k);
    };
    const logU = (lo, hi) => (x) => Math.max(0, Math.min(1, (Math.log(x) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))));
    // Ring 1 selection (two-tone 2 + 2) and ring 3 comparison semicircle (screen left = A only, right = B only).
    const marks = (theme, P, D, sel, halves) => {
        const T = THEMES[theme], o = [];
        for (const [i, side] of halves) {
            const [x, y] = P[i], r = rOf(D[i]);
            const arc = (R, col) => '<path d="M' + f1(x) + ' ' + f1(y - R) + 'A' + f1(R) + ' ' + f1(R) + ' 0 0 ' + (side === "B" ? 1 : 0) + ' ' + f1(x) + ' ' + f1(y + R) + '" fill="none" stroke="' + col + '" stroke-width="2"/>';
            o.push(arc(r + 1, T.inner) + arc(r + 3, T.outer));
        }
        for (const i of sel) {
            const [x, y] = P[i], r = rOf(D[i]);
            const c = (R, col) => '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(R) + '" fill="none" stroke="' + col + '" stroke-width="2"/>';
            o.push(c(r + 1, T.inner) + c(r + 3, T.outer));
        }
        return o.join("");
    };
    // u(i) in [0, 1] or null (drawn gray, off the ramp); higher u is drawn on top. One node size:
    // D only orders the drawing, rOf(16 + u / 1000) rounds to the same radius.
    const draw = (file, { P, E, u, title, sel = [], halves = [], labelOf }) => {
        const D = P.map((_, i) => 16 + (u(i) ?? -1) / 1000);
        for (const theme of ["light", "dark"]) {
            const color = (i) => (u(i) === null ? GRAY : rampAt(u(i), theme));
            const svg = dots({ theme, P, E, D, color, title, labels: sel, labelOf }).replace('<g font-family', marks(theme, P, D, sel, halves) + '<g font-family');
            writeFileSync(IMG + "/comparison-" + file + "-" + theme + ".svg", svg);
        }
    };
    const m0 = rBC.indexOf(1); // the top of betweenness: where the two measures disagree most usefully
    // Two measures: both sides colored by rank on their own measure, one shared domain (#1 to #N).
    // Ties take their average rank, as in the statistic; 0 betweenness is off the ramp (gray).
    const arPR = avgRank(prA), arBC = avgRank(bc);
    const byRank = (r) => (j) => 1 - (r[j] - 1) / (n2 - 1);
    const tieAtBottom = (v) => { const lo = Math.min(...v); const k = v.filter((x) => x === lo).length; return { value: lo, count: k, from: n2 - k + 1, to: n2 }; };
    metrics.bottomTiePR = tieAtBottom(prA);
    metrics.bottomTieBC = tieAtBottom(bc);
    draw("metric-pagerank", { P: posA, E: edgesA, u: byRank(arPR), title: "April transfers colored by rank on PageRank, " + idA(m0) + " selected", sel: [m0], labelOf: idA });
    draw("metric-betweenness", { P: posA, E: edgesA, u: (j) => (bc[j] === 0 ? null : byRank(arBC)(j)), title: "April transfers colored by rank on betweenness, accounts with 0 betweenness gray, " + idA(m0) + " selected", sel: [m0], labelOf: idA });
    // One measure on two versions: raw PageRank on a log scale over one domain for both months.
    const v0 = versionRows[0];
    const vU = logU(...versions.domain);
    const opened = versions.aprilOnlyTop[0].j;
    const closedHalves = [...closed].map((i) => [i, "A"]), openedHalves = newIn.map(([, j]) => [j, "B"]);
    draw("version-march", { P: pos, E: edges, u: (i) => vU(prM[i]), title: "March transfers colored by PageRank on the shared scale; 39 accounts closed in April marked A only; " + v0.id + " selected", sel: [v0.old], halves: closedHalves, labelOf: (i) => ids[i] });
    draw("version-april", { P: posA, E: edgesA, u: (j) => vU(prA[j]), title: "April transfers colored by PageRank on the shared scale; 132 accounts opened in April marked B only; " + v0.id + " selected", sel: [v0.j], halves: openedHalves, labelOf: idA });
    draw("version-march-none", { P: pos, E: edges, u: (i) => vU(prM[i]), title: "March transfers colored by PageRank on the shared scale; 39 accounts closed in April marked A only; the selected account is not in March", halves: closedHalves, labelOf: (i) => ids[i] });
    draw("version-april-opened", { P: posA, E: edgesA, u: (j) => vU(prA[j]), title: "April transfers colored by PageRank on the shared scale; 132 accounts opened in April marked B only; " + idA(opened) + ", opened in April, selected", sel: [opened], halves: openedHalves, labelOf: idA });
    versions.darkRamp = [0, 0.25, 0.5, 0.75, 1].map((u) => rampAt(u, "dark"));

    // The rank-against-rank scatter (the table's Scatter view): Kendall tau-b, tie blocks, top-5 overlap
    // (5 = the length of a result's own Top nodes list), and one point per matched account.
    // tau-b = (C - D) / sqrt((n0 - n1)(n0 - n2)); O(n^2) pairs is fine at 3,000.
    const tauB = (x, y) => {
        let c = 0, d = 0, tx = 0, ty = 0;
        for (let i = 0; i < x.length; i++) for (let k = i + 1; k < x.length; k++) {
            const a = Math.sign(x[i] - x[k]), b = Math.sign(y[i] - y[k]);
            if (a === 0 && b === 0) continue;
            if (a === 0) tx++; else if (b === 0) ty++; else if (a === b) c++; else d++;
        }
        return (c - d) / Math.sqrt((c + d + tx) * (c + d + ty));
    };
    // Tie blocks of at least 1% of a side: value, size, best and worst rank.
    const tieBlocks = (v) => {
        const m = new Map();
        v.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
        const r = bestRank(v);
        return [...m].filter(([, k]) => k >= v.length / 100).map(([value, count]) => {
            const from = r[v.indexOf(value)];
            return { value, count, from, to: from + count - 1, share: count / v.length };
        });
    };
    // The k choices of the comparison's own top-k control, and the overlap at each.
    const TOP_KS = [5, 10, 20, 50, 100];
    const spearmanNoTies = (x, y, bx, by) => {
        const keep = x.map((_, i) => i).filter((i) => !bx.has(x[i]) && !by.has(y[i]));
        return { n: keep.length, rho: spearman(keep.map((i) => x[i]), keep.map((i) => y[i])) };
    };
    {
        const tA = tieBlocks(prA), tB = tieBlocks(bc);
        metrics.scatter = {
            tauB: tauB(prA, bc), tiesA: tA, tiesB: tB,
            bothTied: alive.map((_, j) => j).filter((j) => tA.some((t) => t.value === prA[j]) && tB.some((t) => t.value === bc[j])).length,
            top5: [...topK(prA, 5)].map((j) => ({ id: idA(j), rankBC: rBC[j] })),
            top5B: [...topK(bc, 5)].map((j) => ({ id: idA(j), rankPR: rPR[j] })),
            top5Both: overlap(topK(prA, 5), topK(bc, 5)),
            topBoth: Object.fromEntries(TOP_KS.map((k) => [k, overlap(topK(prA, k), topK(bc, k))])),
            spearmanWithoutTies: spearmanNoTies(prA, bc, new Set(tA.map((t) => t.value)), new Set(tB.map((t) => t.value))),
            points: alive.map((_, j) => [rPR[j], rBC[j]]),
        };
    }
    {
        const tA = tieBlocks(prM), tB = tieBlocks(prA);
        const sm = new Set(tA.map((t) => t.value)), sa = new Set(tB.map((t) => t.value));
        versions.scatter = {
            tauB: tauB(xs, ys), tiesA: tA, tiesB: tB,
            bothTied: shared.filter(([o, j]) => sm.has(prM[o]) && sa.has(prA[j])).length,
            top5Both: [...topK(prM, 5)].filter((i) => new Set([...topK(prA, 5)].map((j) => alive[j])).has(i)).length,
            topBoth: Object.fromEntries(TOP_KS.map((k) => [k, [...topK(prM, k)].filter((i) => new Set([...topK(prA, k)].map((j) => alive[j])).has(i)).length])),
            spearmanWithoutTies: spearmanNoTies(xs, ys, sm, sa),
            points: shared.map(([o, j]) => [rM[o], rA[j]]),
        };
    }
    // Spearman without the one tie block the two sides share at their lowest value (the accounts at the
    // bottom of both), beside Spearman over everyone: the shared tail agrees with itself and lifts the number.
    const offBottom = (x, y) => {
        const lx = Math.min(...x), ly = Math.min(...y);
        const keep = x.map((_, i) => i).filter((i) => !(x[i] === lx && y[i] === ly));
        return { left: x.length - keep.length, n: keep.length, rho: spearman(keep.map((i) => x[i]), keep.map((i) => y[i])) };
    };
    metrics.spearmanOffBottom = offBottom(prA, bc);
    versions.spearmanOffBottom = offBottom(xs, ys);
    // A group against the rest on one column (the entry "Compare Community 1 with the rest" from the
    // communities table): median and quartiles of April PageRank, the same statistic the table's row shows.
    {
        const q = (s, p) => { const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
        const stats = (v) => { const s = [...v].sort((a, b) => a - b); return { n: s.length, q1: q(s, 0.25), median: q(s, 0.5), q3: q(s, 0.75) }; };
        const byName = new Map();
        alive.forEach((_, j) => { const k = nameA(commA[j]); (byName.get(k) ?? byName.set(k, []).get(k)).push(j); });
        const rows = [...byName].sort((a, b) => b[1].length - a[1].length).slice(0, 5).map(([name, mem]) => ({ name, accounts: mem.length, medianPageRank: stats(mem.map((j) => prA[j])).median }));
        const inG = new Set(byName.get("Community 1"));
        const g = [], rest = [];
        alive.forEach((_, j) => (inG.has(j) ? g : rest).push(prA[j]));
        // Structure first: size, transfers inside each side, transfers between the two (the same edges
        // counted from either side), and directed density m / (n (n - 1)), 3 significant figures.
        let inG2 = 0, inR = 0, between = 0;
        for (const [s, t] of edgesA) { const a = inG.has(s), b = inG.has(t); if (a && b) inG2++; else if (!a && !b) inR++; else between++; }
        const dens = (m, k) => m / (k * (k - 1));
        const structure = {
            group: { accounts: g.length, edgesInside: inG2, edgesOut: between, density: Number(dens(inG2, g.length).toPrecision(3)), densityShown: dens(inG2, g.length).toExponential(2) },
            rest: { accounts: rest.length, edgesInside: inR, edgesOut: between, density: Number(dens(inR, rest.length).toPrecision(3)), densityShown: dens(inR, rest.length).toExponential(2) },
        };
        // Ratios to 2 significant figures, as the page says them ("density 3.8 times the rest").
        const r2 = (x) => Number(x.toPrecision(2));
        structure.ratio = { accounts: r2(g.length / rest.length), edgesInside: r2(inG2 / inR), density: r2(dens(inG2, g.length) / dens(inR, rest.length)) };
        metrics.groupCompare = { column: "pagerank", statistic: "median, quartiles by linear interpolation", rows, group: { name: "Community 1", ...stats(g) }, rest: stats(rest), structure, medianRatio: r2(stats(g).median / stats(rest).median) };
    }
    // Two runs of one measure that differ in one option: PageRank on April at damping 0.85 and at 0.5.
    {
        const pr50 = dpr(outA, n2, 0.5), r85 = rPR, r50 = bestRank(pr50);
        const rows = alive.map((_, j) => j).filter((j) => r85[j] <= 100 || r50[j] <= 100)
            .map((j) => ({ id: idA(j), rank85: r85[j], rank50: r50[j], change: r85[j] - r50[j] }))
            .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
        metrics.dampingRuns = {
            options: ["damping 0.85", "damping 0.5"],
            top50Both: overlap(topK(prA, 50), topK(pr50, 50)),
            spearman: spearman(prA, pr50),
            spearmanOffBottom: offBottom(prA, pr50),
            higherAt85: rows.filter((r) => r.change < 0).slice(0, 6),
            higherAt50: rows.filter((r) => r.change > 0).slice(0, 6),
        };
    }
    // The one canvas under the Scatter view: April as the reader styled it (PageRank, log scale, sized
    // by degree; the dark ramp starts at its first 3:1 point), with the comparison's selection ringed and labeled.
    const prU = logU(Math.min(...prA), Math.max(...prA));
    for (const theme of ["light", "dark"]) writeFileSync(IMG + "/comparison-canvas-metric-" + theme + ".svg",
        dots({ theme, P: posA, E: edgesA, D: degA, color: (j) => rampAt(prU(prA[j]), theme), selected: [m0], labels: [m0], labelOf: idA, title: "April transfers colored by PageRank, log scale, sized by degree; " + idA(m0) + " selected" }));
    for (const theme of ["light", "dark"]) writeFileSync(IMG + "/comparison-canvas-version-" + theme + ".svg",
        dots({ theme, P: posA, E: edgesA, D: degA, color: (j) => rampAt(prU(prA[j]), theme), selected: [v0.j], labels: [v0.j], labelOf: idA, title: "April transfers colored by PageRank, log scale, sized by degree; " + v0.id + " selected" }));
    const pctOf = ([x, y]) => ({ x: Math.round((x / W) * 1000) / 10, y: Math.round((y / H) * 1000) / 10 });
    const strip = (r) => { const { j, old, ...rest } = r; return rest; };
    metrics.selected = strip(metricRows.find((r) => r.j === m0));
    metrics.rows = metrics.rows.map(strip);
    metrics.highBC = alive.map((_, j) => j).sort((a, b) => rBC[a] - rBC[b]).slice(0, 12).map((j) => ({ id: idA(j), kind: who(j), betweenness: bc[j], pagerank: prA[j], rankBC: rBC[j], rankPR: rPR[j] }));
    versions.rows = versions.rows.map(strip);
    versions.aprilOnlyTop = versions.aprilOnlyTop.map(strip);
    versions.marchOnlyTop = versions.marchOnlyTop.map(strip);
    // Into the real kit/fixtures.json, scenarios.comparison (read, set, write back).
    const fixPath = ${JSON.stringify(join(here, "../kit/fixtures.json"))};
    const fix = JSON.parse(readFileSync(fixPath, "utf8"));
    (fix.scenarios ??= {}).comparison = {
        generatedBy: "screens/comparison-numbers.mjs -- regenerate instead of editing by hand",
        method: "PageRank directed, damping 0.85, 100 iterations, unweighted (March recomputed the same way as April); betweenness directed, unweighted, normalized; Spearman over average ranks; ranks shown are best rank, 1 highest",
        metrics, versions,
        anchors: { metricSelected: pctOf(posA[m0]), versionSelectedMarch: pctOf(pos[v0.old]), versionSelectedApril: pctOf(posA[v0.j]), versionOpenedApril: pctOf(posA[opened]) },
    };
    writeFileSync(fixPath, JSON.stringify(fix, null, 1));
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
swap("        const rowA = (j) =>", block + "\n        const rowA = (j) =>");
writeFileSync(join(scratch, "gen.mjs"), src);
await import(pathToFileURL(join(scratch, "gen.mjs")).href);
// Check: the kit's own fixtures are reproduced exactly, so the inserted block moved nothing.
const a = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));
const b = JSON.parse(readFileSync(join(scratch, "fixtures.json"), "utf8"));
if (JSON.stringify(a.datasets.transactionsApril) !== JSON.stringify(b.datasets.transactionsApril)) throw new Error("the April fixture changed: the kit and this script disagree");
console.log("wrote kit/fixtures.json scenarios.comparison and screens/img/comparison-*.svg");
