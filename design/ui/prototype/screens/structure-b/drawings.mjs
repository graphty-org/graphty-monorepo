// Drawings and derived numbers for the structure B wireframes (screens/structure-b/*.html).
// Run from design/ui/prototype: node screens/structure-b/drawings.mjs
//
// The protein graph's positions and edges are read back from kit/canvas/ppi-plain-light.svg
// (one circle per protein, in node order; one line per interaction), so every drawing here sits
// on exactly the layout the other mocks use. Node order is the order of
// fixtures.datasets.ppi.louvain.community. PageRank is recomputed with gen-canvas.mjs's own
// function and checked against the 40 rows the fixtures hold.
// Writes img/<name>-{light,dark}.svg and numbers.json (the counts these pages type that the
// fixtures do not hold: overlaps, PageRank's range).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = join(here, "..", "..");
const fx = JSON.parse(readFileSync(join(proto, "kit/fixtures.json"), "utf8"));
const ppi = fx.datasets.ppi;
const L = ppi.louvain;

const svg = readFileSync(join(proto, "kit/canvas/ppi-plain-light.svg"), "utf8");
const pos = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="4" fill="#808080"\/>/g)].map((m) => [+m[1], +m[2]]);
const names = Object.keys(L.community);
if (pos.length !== 300 || names.length !== 300) throw new Error(`expected 300 nodes, read ${pos.length} positions and ${names.length} names`);
const at = new Map(pos.map(([x, y], i) => [`${x},${y}`, i]));
const edges = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"\/>/g)].map((m) => [at.get(`${m[1]},${m[2]}`), at.get(`${m[3]},${m[4]}`)]);
if (edges.length !== ppi.edges || edges.some(([a, b]) => a === undefined || b === undefined)) throw new Error("edges do not match the fixture");
const idx = (id) => names.indexOf(id);
// TP53's anchor in the fixtures must land on TP53's circle, or the node order is wrong.
const tp = pos[idx("TP53")];
if (Math.abs((tp[0] / 1200) * 100 - ppi.anchors.selected.x) > 0.1 || Math.abs((tp[1] / 800) * 100 - ppi.anchors.selected.y) > 0.1) throw new Error("node order does not match the drawing");

// gen-canvas.mjs's pagerank, unchanged.
const adj = Array.from({ length: 300 }, () => []);
for (const [a, b] of edges) adj[a].push(b), adj[b].push(a);
function pagerank(d = 0.85, iters = 60) {
    const n = adj.length;
    let pr = new Float64Array(n).fill(1 / n);
    for (let k = 0; k < iters; k++) {
        const next = new Float64Array(n).fill((1 - d) / n);
        let dangling = 0;
        for (let v = 0; v < n; v++) {
            if (adj[v].length === 0) dangling += pr[v];
            else for (const w of adj[v]) next[w] += (d * pr[v]) / adj[v].length;
        }
        for (let v = 0; v < n; v++) next[v] += (d * dangling) / n;
        pr = next;
    }
    return Array.from(pr);
}
const pr = pagerank();
for (const r of ppi.rows) if (Math.abs(pr[idx(r.id)] - r.pagerank) > 1e-5) throw new Error(`PageRank of ${r.id} differs from the fixture`);

// Louvain's layer: the element's categorical palette in community order (Okabe-Ito), then Other for
// the groups past the eighth (the two proteins with no interaction, one community each).
const OKABE_ITO = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#000000", "#F0E442"];
const OTHER = "#BDBDBD";
const comm = names.map((n) => L.community[n]);
const colorOf = (i) => (comm[i] <= 8 ? OKABE_ITO[comm[i] - 1] : OTHER);
// PageRank: size, square root, 3 to 11 px.
const [pmin, pmax] = [Math.min(...pr), Math.max(...pr)];
const prSize = (i) => 3 + ((Math.sqrt(pr[i]) - Math.sqrt(pmin)) / (Math.sqrt(pmax) - Math.sqrt(pmin))) * 8;
const hubs = ppi.encodings.betweenness.hubLabels.ids.map(idx);
const isHub = new Set(hubs);
const HUB_R = 9;

const THEMES = {
    light: { canvas: "#F5F5F5", ink: "#1A1A1A", halo: "#F5F5F5", edge: "#808080", outer: "#1A1A1A", inner: "#FFFFFF", fillEdge: "#8A8A8A" },
    dark: { canvas: "#1E1E1E", ink: "#F0F0F0", halo: "#1E1E1E", edge: "#808080", outer: "#FFFFFF", inner: "#1A1A1A", fillEdge: "#6E6E6E" },
};
const f1 = (x) => Math.round(x * 10) / 10;
function lum(hex) {
    const c = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
function ring(x, y, r, T, kind) {
    const c = (rr, w, color) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
    if (kind === "selected") return c(r + 1, 2, T.inner) + c(r + 3, 2, T.outer);
    if (kind === "member") return c(r + 0.5, 1, T.inner) + c(r + 1.5, 1, T.outer);
    return "";
}
const diamond = (x, y, r) => `${f1(x)},${f1(y - r)} ${f1(x + r)},${f1(y)} ${f1(x)},${f1(y + r)} ${f1(x - r)},${f1(y)}`;

// The same drawing rules as gen-canvas.mjs's drawGraph (marks drawn last, fill edge when any fill is
// under 3:1, labels culled by collision with marked nodes first), plus a diamond shape.
function draw({ theme, size, shape = () => "circle", labels, marks = {}, hidden = new Set(), title }) {
    const T = THEMES[theme];
    const keep = (i) => !hidden.has(i);
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-label="${title}">`, `<rect width="1200" height="800" fill="${T.canvas}"/>`];
    out.push(`<g stroke="${T.edge}" stroke-width="1" stroke-opacity="0.3" stroke-linecap="round">`);
    for (const [s, t] of edges) if (keep(s) && keep(t)) out.push(`<line x1="${pos[s][0]}" y1="${pos[s][1]}" x2="${pos[t][0]}" y2="${pos[t][1]}"/>`);
    out.push("</g>");
    const markOf = new Map();
    for (const [kind, ids] of Object.entries(marks)) for (const id of [].concat(ids)) markOf.set(id, kind);
    const order = pos.map((_, i) => i).filter(keep).sort((a, b) => (markOf.has(a) ? 1 : 0) - (markOf.has(b) ? 1 : 0));
    const edged = order.some((i) => contrast(colorOf(i), T.canvas) < 3);
    out.push("<g>");
    for (const i of order) {
        const [x, y] = pos[i];
        const r = size(i);
        if (shape(i) === "diamond") {
            out.push(`<polygon points="${diamond(x, y, r * 1.25)}" fill="${colorOf(i)}"${edged ? ` stroke="${T.fillEdge}" stroke-width="1.3"` : ""}/>`);
            if (markOf.has(i)) out.push(ring(x, y, r * 1.25, T, markOf.get(i)));
        } else {
            out.push(`<circle cx="${x}" cy="${y}" r="${f1(r)}" fill="${colorOf(i)}"/>`);
            if (edged) out.push(`<circle cx="${x}" cy="${y}" r="${f1(r + 0.65)}" fill="none" stroke="${T.fillEdge}" stroke-width="1.3"/>`);
            if (markOf.has(i)) out.push(ring(x, y, r, T, markOf.get(i)));
        }
    }
    out.push("</g>");
    out.push(`<g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`);
    const boxes = [];
    for (const i of [...new Set([...[...markOf.keys()].filter((i) => labels.includes(i)), ...labels])].filter(keep)) {
        const x = pos[i][0] + size(i) + 4;
        const b = [x - 2, pos[i][1] - 8, x + names[i].length * 6.8 + 2, pos[i][1] + 7];
        if (boxes.some((o) => b[0] < o[2] && o[0] < b[2] && b[1] < o[3] && o[1] < b[3])) continue;
        boxes.push(b);
        out.push(`<text x="${f1(x)}" y="${f1(pos[i][1] + 4)}">${names[i]}</text>`);
    }
    out.push("</g></svg>");
    return out.join("\n");
}
function emit(name, opts) {
    for (const theme of ["light", "dark"]) writeFileSync(join(here, "img", `${name}-${theme}.svg`), draw({ theme, ...opts }));
}

const deg = adj.map((a) => a.length);
const budget = pos.map((_, i) => i).sort((a, b) => deg[b] - deg[a]).slice(0, 22);
const c8 = pos.map((_, i) => i).filter((i) => comm[i] === 8);
const hubSize = (i) => (isHub.has(i) ? HUB_R : prSize(i));
const hubShape = (i) => (isHub.has(i) ? "diamond" : "circle");
const singletons = pos.map((_, i) => i).filter((i) => comm[i] > 8);

emit("louvain-pagerank", { size: prSize, labels: budget, title: "Protein interactions colored by Louvain community, sized by PageRank, nothing selected" });
emit("community-8", {
    size: prSize,
    labels: [...c8].sort((a, b) => deg[b] - deg[a]).slice(0, 8).concat(budget),
    marks: { member: c8 },
    title: "Protein interactions colored by Louvain community, sized by PageRank; the 29 members of community 8 marked",
});
emit("hubs-below", {
    size: prSize,
    shape: hubShape,
    labels: hubs,
    marks: { member: hubs },
    title: "Hubs drawn as diamonds at their PageRank size, colored by their Louvain community; the 12 hubs marked",
});
emit("hubs-above-tp53", {
    size: hubSize,
    shape: hubShape,
    labels: hubs,
    marks: { selected: idx("TP53") },
    hidden: new Set(singletons),
    title: "Hubs drawn as large diamonds, the two proteins with no interaction hidden, TP53 selected",
});

// Numbers the pages type that the fixtures do not hold.
const hubsByCommunity = {};
for (const h of hubs) hubsByCommunity[comm[h]] = [...(hubsByCommunity[comm[h]] ?? []), names[h]];
const numbers = {
    note: "written by screens/structure-b/drawings.mjs from kit/fixtures.json and the protein drawing; not in fixtures.json",
    pagerank: { min: +pmin.toPrecision(3), max: +pmax.toPrecision(3), sizePx: [3, 11], minId: names[pr.indexOf(pmin)] },
    hubs: { count: hubs.length, ids: hubs.map((i) => names[i]), byCommunity: hubsByCommunity, communitiesTouched: Object.keys(hubsByCommunity).length },
    community8: { members: c8.length, byDegree: [...c8].sort((a, b) => deg[b] - deg[a]).map((i) => ({ id: names[i], degree: deg[i], pagerank: +pr[i].toPrecision(3) })) },
    singletons: singletons.map((i) => names[i]),
};
writeFileSync(join(here, "numbers.json"), JSON.stringify(numbers, null, 1) + "\n");
console.log(JSON.stringify(numbers, null, 1).slice(0, 2500));
