#!/usr/bin/env node
// The size key of screens/colour-by-value.html ("Size: degree"): five circles at the minimum, the
// quartiles and the maximum of degree over all 300 proteins, repeated values counted (every protein
// is one value, ties included), each drawn at the radius the canvas gives that value (the bin it
// falls in, datasets.ppi.encodings.sizeByDegree). Also the hovered protein (the highest degree) and
// where it sits in the drawing, so its tooltip lands on it.
// Reads the per-protein degrees from scenarios.groupCompare (screens/group-compare-numbers.mjs) and
// checks them against the fixture's bins, so a drift fails here.
// Output: kit/fixtures.json scenarios.sizeKey.
// Run from design/ui/prototype/ after screens/group-compare-numbers.mjs: node screens/colour-by-value-numbers.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "../kit/fixtures.json");
const fx = JSON.parse(readFileSync(FIX, "utf8"));
const P = fx.datasets.ppi;
const bins = P.encodings.sizeByDegree.bins;

const c = fx.scenarios.groupCompare.columns.degree;
const deg = [...c.groupValues, ...c.restValues].sort((a, b) => a - b);
assert.equal(deg.length, P.nodes, "one degree per protein");
assert.equal(deg.at(-1), P.stats.maxDegree);
bins.forEach((b) => assert.equal(deg.filter((d) => d >= b.from && d <= b.to).length, b.count, `bin ${b.from} to ${b.to}`));

// Quantiles by linear interpolation (type 7, as group-compare-numbers.mjs), rounded to whole degrees.
const q = (p) => { const h = (deg.length - 1) * p, lo = Math.floor(h); return deg[lo] + (deg[Math.min(lo + 1, deg.length - 1)] - deg[lo]) * (h - lo); };
const radiusOf = (v) => bins.find((b) => v >= b.from && v <= b.to).radius;
const marks = [0, 0.25, 0.5, 0.75, 1].map((p) => { const value = Math.round(q(p)); return { quantile: p, value, radius: radiusOf(value), diameter: 2 * radiusOf(value) }; });

// The hovered protein: the top of topByDegree, located in the drawing by its label.
const top = P.topByDegree[0];
const svg = readFileSync(join(here, "../kit/canvas/ppi-foldchange-degree-light.svg"), "utf8");
const [W, H] = fx.canvas.viewBox;
const label = svg.match(new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)"[^>]*>${top.id}</text>`));
assert.ok(label, `${top.id} is labeled in the drawing`);
const near = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#/g)]
  .map((m) => ({ x: +m[1], y: +m[2], r: +m[3] }))
  .filter((p) => p.r === radiusOf(top.degree))
  .sort((a, b) => Math.hypot(a.x - +label[1], a.y - +label[2]) - Math.hypot(b.x - +label[1], b.y - +label[2]))[0];
const pct = (v, of) => Math.round((v / of) * 1000) / 10;

fx.scenarios.sizeKey = {
  generatedBy: "screens/colour-by-value-numbers.mjs -- regenerate instead of editing by hand",
  note: "Size: degree key: minimum, quartiles and maximum of degree over every protein, repeated values counted; each circle at the radius its bin draws (CSS px at zoom 1). hover: the highest-degree protein and its place in ppi-foldchange-degree.",
  over: deg.length,
  marks,
  hover: { id: top.id, degree: top.degree, x: pct(near.x, W), y: pct(near.y, H) },
};
writeFileSync(FIX, JSON.stringify(fx, null, 1));
console.log(marks.map((m) => `${m.value} r${m.radius}`).join(", "), "hover", fx.scenarios.sizeKey.hover);
