#!/usr/bin/env node
// The table's Scatter view on screens/table-dock.html: the 300 proteins' rank on betweenness against
// their rank on pagerank, as Compare rankings... opens it from the ranked protein table.
// Reads kit/fixtures.json scenarios.tableDock.ppi (every protein's raw scores), ranks each side as the
// table does (3 significant figures; values equal as shown share a rank), and writes:
//   - kit/fixtures.json scenarios.tableDockScatter (the overlap at each top length, Spearman, the selection)
//   - the inline SVG into screens/table-dock.html between <!-- scatter:ppi --> and <!-- /scatter:ppi -->
// Drawn like screens/comparison-scatter.mjs, so the two pages show one Scatter view.
// Run from design/ui/prototype/: node screens/table-dock-scatter.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesFile = join(here, "../kit/fixtures.json");
const fixtures = JSON.parse(readFileSync(fixturesFile, "utf8"));
const rows = fixtures.scenarios.tableDock.ppi.rows; // [id, module, degree, betweenness, pagerank]
const n = rows.length;
const fmt = (x) => x.toLocaleString("en-US");
const f1 = (x) => Math.round(x * 10) / 10;

// The value as the table shows it (kit.js sig3), and the rank on it: 1 + how many show higher.
const shown = (v) => (v === 0 ? 0 : Number(v.toPrecision(3)));
const rankOf = (vals) => { const s = vals.map(shown); return s.map((x) => 1 + s.filter((y) => y > x).length); };
// Average ranks for Spearman (ties share the mean of their places).
const avgRank = (vals) => {
    const s = vals.map(shown), idx = s.map((_, i) => i).sort((a, b) => s[b] - s[a]), out = new Array(s.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && s[idx[j + 1]] === s[idx[i]]) j++; for (let k = i; k <= j; k++) out[idx[k]] = (i + j) / 2 + 1; i = j + 1; }
    return out;
};
const pearson = (a, b) => { const m = (x) => x.reduce((p, q) => p + q, 0) / x.length; const ma = m(a), mb = m(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };

const bc = rows.map((r) => r[3]), pr = rows.map((r) => r[4]);
const rB = rankOf(bc), rP = rankOf(pr);
const topBoth = Object.fromEntries([5, 10, 20, 50, 100].map((k) => [k, rows.filter((_, i) => rB[i] <= k && rP[i] <= k).length]));
// The tie both sides share at the bottom: proteins at the lowest value on both.
const minB = Math.min(...bc.map(shown)), minP = Math.min(...pr.map(shown));
const bottom = rows.map((_, i) => shown(bc[i]) === minB && shown(pr[i]) === minP);
const spearman = pearson(avgRank(bc), avgRank(pr));
const keep = rows.map((_, i) => i).filter((i) => !bottom[i]);
const spearmanOff = pearson(avgRank(keep.map((i) => bc[i])), avgRank(keep.map((i) => pr[i])));
const sel = rows.findIndex((r) => r[0] === "TP53");
const K = 20; // the Top control's setting in the drawn state

const result = {
    generatedBy: "screens/table-dock-scatter.mjs -- regenerate instead of editing by hand",
    n,
    topBoth,
    spearman: Number(spearman.toFixed(2)),
    spearmanOffBottom: { rho: Number(spearmanOff.toFixed(2)), left: bottom.filter(Boolean).length },
    selected: { id: rows[sel][0], rankBetweenness: rB[sel], rankPagerank: rP[sel] },
    top: K,
};

// Log rank axes, rank 1 at the top left, as the comparison page draws them.
const L = 300, ML = 58, MT = 46, W = ML + L + 24, H = MT + L + 24;
const A = (r) => (L * (Math.log(r) - Math.log(0.6))) / (Math.log(n + 0.5) - Math.log(0.6));
const o = [];
o.push(`<svg class="sc" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Rank on betweenness against rank on pagerank, one dot per protein, rank 1 at top left, log scales">`);
o.push(`<g transform="translate(${ML} ${MT})"><rect class="sc-frame" x="0" y="0" width="${L}" height="${L}"/>`);
const k = f1(A(K + 0.5));
o.push(`<rect class="sc-top" x="0" y="0" width="${k}" height="${L}"/><rect class="sc-top" x="0" y="0" width="${L}" height="${k}"/>`);
for (const t of [1, 10, 100]) {
    const p = f1(A(t));
    o.push(`<line class="sc-grid" x1="${p}" y1="0" x2="${p}" y2="${L}"/><line class="sc-grid" x1="0" y1="${p}" x2="${L}" y2="${p}"/>`);
    o.push(`<text class="sc-tick" x="${p}" y="-6" text-anchor="middle">${fmt(t)}</text><text class="sc-tick" x="-6" y="${f1(A(t) + 3.5)}" text-anchor="end">${fmt(t)}</text>`);
}
o.push(`<line class="sc-diag" x1="${f1(A(1))}" y1="${f1(A(1))}" x2="${f1(A(n))}" y2="${f1(A(n))}"/>`);
o.push(`<path class="sc-dot" d="${rows.map((_, i) => (bottom[i] ? "" : `M${f1(A(rB[i]))} ${f1(A(rP[i]))}h0`)).join("")}"/>`);
o.push(`<text class="sc-top-label" x="6" y="14">top ${K}</text>`);
const sx = f1(A(rB[sel])), sy = f1(A(rP[sel]));
o.push(`<circle class="sc-sel-out" cx="${sx}" cy="${sy}" r="6"/><circle class="sc-sel-in" cx="${sx}" cy="${sy}" r="4"/>`);
o.push(`<text class="sc-sel-label" x="${f1(sx + 10)}" y="${f1(sy + 4)}">${rows[sel][0]}</text></g>`);
o.push(`<text class="sc-title" x="${ML}" y="14">Rank on betweenness, 1 (top) to ${fmt(n)}</text>`);
o.push(`<text class="sc-title" transform="translate(14 ${MT}) rotate(-90)" text-anchor="end">Rank on pagerank, 1 (top) to ${fmt(n)}</text></svg>`);

const page = join(here, "table-dock.html");
const html = readFileSync(page, "utf8");
const re = /(<!-- scatter:ppi -->)[\s\S]*?(<!-- \/scatter:ppi -->)/;
if (!re.test(html)) throw new Error("marker not found in table-dock.html: scatter:ppi");
writeFileSync(page, html.replace(re, `$1${o.join("")}$2`));
fixtures.scenarios.tableDockScatter = result;
writeFileSync(fixturesFile, JSON.stringify(fixtures, null, 1));
console.log(JSON.stringify(result));
