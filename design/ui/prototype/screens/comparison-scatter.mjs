#!/usr/bin/env node
// Draws the rank-against-rank scatters of screens/comparison.html from kit/fixtures.json scenarios.comparison
// and writes each one into the page between its markers (<!-- scatter:NAME --> ... <!-- /scatter:NAME -->).
// Inline SVG, so the page's light and dark tokens color it. Run from design/ui/prototype/:
//   node screens/comparison-numbers.mjs && node screens/comparison-scatter.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const num = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).scenarios.comparison;
const fmt = (x) => x.toLocaleString("en-US");
const f1 = (x) => Math.round(x * 10) / 10;
const TIE_BAND = 0.1; // a tie block over 10% of a side is drawn as one band
const K = 50; // the comparison's top-k control, at its default: the shaded corner follows it

// Log rank axis: rank 1 at the start. 0.6 keeps rank 1 off the frame.
const L = 340, ML = 58, MT = 46, W = ML + L + 24, H = MT + L + 24;
const axis = (n) => (r) => (L * (Math.log(r) - Math.log(0.6))) / (Math.log(n + 0.5) - Math.log(0.6));

function scatter({ s, nA, nB, nameA, nameB, sel, selId, bandWord }) {
    const X = axis(nA), Y = axis(nB);
    const bandA = s.tiesA.find((t) => t.share > TIE_BAND), bandB = s.tiesB.find((t) => t.share > TIE_BAND);
    const inA = (p) => bandA && p[0] >= bandA.from, inB = (p) => bandB && p[1] >= bandB.from;
    const o = [];
    o.push(`<svg class="sc" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Rank on ${nameA} against rank on ${nameB}, one dot per account, rank 1 at top left, log scales">`);
    o.push(`<g transform="translate(${ML} ${MT})">`);
    o.push(`<rect class="sc-frame" x="0" y="0" width="${L}" height="${L}"/>`);
    // The top corner: the top K of each side, as set by the Agreement section's top-k control.
    const k = X(K + 0.5), kY = Y(K + 0.5);
    o.push(`<rect class="sc-top" x="0" y="0" width="${f1(k)}" height="${L}"/><rect class="sc-top" x="0" y="0" width="${L}" height="${f1(kY)}"/>`);
    // Grid at the ticks.
    const ticks = [1, 10, 100, 1000];
    for (const t of ticks) {
        o.push(`<line class="sc-grid" x1="${f1(X(t))}" y1="0" x2="${f1(X(t))}" y2="${L}"/><line class="sc-grid" x1="0" y1="${f1(Y(t))}" x2="${L}" y2="${f1(Y(t))}"/>`);
        o.push(`<text class="sc-tick" x="${f1(X(t))}" y="-6" text-anchor="middle">${fmt(t)}</text><text class="sc-tick" x="-6" y="${f1(Y(t) + 3.5)}" text-anchor="end">${fmt(t)}</text>`);
    }
    // Tie bands, each one labeled block.
    let both = 0;
    const bx = bandA && [X(bandA.from - 0.5), X(nA + 0.5)], by = bandB && [Y(bandB.from - 0.5), Y(nB + 0.5)];
    if (bandA) o.push(`<rect class="sc-band" x="${f1(bx[0])}" y="0" width="${f1(bx[1] - bx[0])}" height="${L}"/>`);
    if (bandB) o.push(`<rect class="sc-band" x="0" y="${f1(by[0])}" width="${L}" height="${f1(by[1] - by[0])}"/>`);
    // Same rank on both: the diagonal.
    const m = Math.min(nA, nB);
    o.push(`<line class="sc-diag" x1="${f1(X(1))}" y1="${f1(Y(1))}" x2="${f1(X(m))}" y2="${f1(Y(m))}"/>`);
    // Points: an account in a band sits on the band's middle line; one in both bands is only counted.
    const dots = [];
    for (const p of s.points) {
        const a = inA(p), b = inB(p);
        if (a && b) { both++; continue; }
        const x = a ? (bx[0] + bx[1]) / 2 : X(p[0]), y = b ? (by[0] + by[1]) / 2 : Y(p[1]);
        dots.push(`M${f1(x)} ${f1(y)}h0`);
    }
    o.push(`<path class="sc-dot" d="${dots.join("")}"/>`);
    const cA = bandA && s.points.filter(inA).length, cB = bandB && s.points.filter(inB).length;
    console.log(nameA, "band", cA, bandA && (cA / s.points.length).toFixed(3), "|", nameB, "band", cB, bandB && (cB / s.points.length).toFixed(3));
    if (bandA) o.push(`<text class="sc-band-label" transform="translate(${L + 16} ${L}) rotate(-90)">${fmt(cA)} ${bandWord} tied at ${bandA.label}</text>`);
    if (bandB) o.push(`<text class="sc-band-label" x="0" y="${L + 17}">${fmt(cB)} ${bandWord} tied at ${bandB.label}</text>`);
    o.push(`<text class="sc-top-label" x="6" y="14">top ${K}</text>`);
    // The selection: the canvas's two-tone ring, labeled.
    const [sx, sy] = [X(sel[0]), Y(sel[1])];
    o.push(`<circle class="sc-sel-out" cx="${f1(sx)}" cy="${f1(sy)}" r="6"/><circle class="sc-sel-in" cx="${f1(sx)}" cy="${f1(sy)}" r="4"/>`);
    // Labeled on the side with room: left of the ring when it sits in the right third.
    const left = sx > L * 0.66;
    o.push(`<text class="sc-sel-label" x="${f1(left ? sx - 10 : sx + 10)}" y="${f1(sy + 4)}"${left ? ' text-anchor="end"' : ""}>${selId}</text>`);
    o.push(`</g>`);
    o.push(`<text class="sc-title" x="${ML}" y="14">Rank on ${nameA}, 1 (top) to ${fmt(nA)}</text>`);
    o.push(`<text class="sc-title" transform="translate(14 ${MT}) rotate(-90)" text-anchor="end">Rank on ${nameB}, 1 (top) to ${fmt(nB)}</text>`);
    o.push(`</svg>`);
    return { svg: o.join(""), both, bands: { a: cA || null, b: cB || null, both } };
}

const m = num.metrics, v = num.versions;
m.scatter.tiesA.forEach((t) => (t.label = "the lowest PageRank"));
m.scatter.tiesB.forEach((t) => (t.label = "0"));
v.scatter.tiesA.forEach((t) => (t.label = "the lowest PageRank"));
v.scatter.tiesB.forEach((t) => (t.label = "the lowest PageRank"));
const out = {
    metrics: scatter({ s: m.scatter, nA: m.n, nB: m.n, nameA: "PageRank", nameB: "betweenness", sel: [m.selected.rankPR, m.selected.rankBC], selId: m.selected.id, bandWord: "accounts" }),
    versions: scatter({ s: v.scatter, nA: v.shared + v.marchOnly, nB: v.shared + v.aprilOnly, nameA: "PageRank, March", nameB: "PageRank, April", sel: [v.rows[0].rankMarch, v.rows[0].rankApril], selId: v.rows[0].id, bandWord: "accounts" }),
};
const page = join(here, "comparison.html");
let html = readFileSync(page, "utf8");
for (const [name, { svg, both }] of Object.entries(out)) {
    const re = new RegExp(`(<!-- scatter:${name} -->)[\\s\\S]*?(<!-- /scatter:${name} -->)`);
    if (!re.test(html)) throw new Error("marker not found in comparison.html: scatter:" + name);
    html = html.replace(re, `$1${svg}$2`);
    console.log(name, "accounts in both tie bands:", both);
}
writeFileSync(page, html);
// The band counts the page prints go back into the fixtures, where the kit check reads every shared number.
const fixturesFile = join(here, "../kit/fixtures.json");
const fixtures = JSON.parse(readFileSync(fixturesFile, "utf8"));
for (const [name, { bands }] of Object.entries(out)) fixtures.scenarios.comparison[name].scatter.bands = bands;
writeFileSync(fixturesFile, JSON.stringify(fixtures, null, 1));
