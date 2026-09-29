// Generates the kit's canvas drawings (kit/canvas/*.svg) and kit/fixtures.json from realistic
// graph data, so every mock shows the same graphs with the same numbers.
// Run: node kit/gen-canvas.mjs
//
// Datasets: Zachary's karate club and Les Miserables (real, from graph-io's test corpus), a
// 300-protein interaction network, a 3,000-account transaction network (both generated here
// from a fixed seed, with real gene symbols and plausible account data), and a 124,318-node
// citation graph that is only counted (past the drawing limit, nothing is drawn).
//
// Canvas rules followed (design/ui/framework/canvas-drawing.md): light canvas #F5F5F5, dark
// #1E1E1E; unstyled node gray #808080, Other #505050; selection a two-tone ring (dark #1A1A1A and
// white, the band with more contrast against the canvas outside); hover a one-tone hairline
// after a 2 px gap; keyboard focus three bands after a 2 px gap; labels 12 px with a halo in the
// canvas color, culled by collision (a label whose box meets one already placed is dropped;
// marked nodes first, then the order given, which is by degree); a fill under 3:1 against the
// canvas puts a one-tone fill edge on every node of the drawing (canvas-drawing.md 4); past about 1,000 nodes the drawing is shown as neutral hexbin density with
// marked elements drawn over it.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const d3 = await import(join(root, "node_modules/.pnpm/d3-force-3d@3.0.6/node_modules/d3-force-3d/src/index.js"));

const W = 1200;
const H = 800;
const OKABE_ITO = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#000000", "#F0E442"];
const GRAY = "#808080";
const OTHER = "#505050";
const THEMES = {
    light: { canvas: "#F5F5F5", ink: "#1A1A1A", halo: "#F5F5F5", edge: "#808080", outer: "#1A1A1A", inner: "#FFFFFF", fillEdge: "#8A8A8A" },
    dark: { canvas: "#1E1E1E", ink: "#F0F0F0", halo: "#1E1E1E", edge: "#808080", outer: "#FFFFFF", inner: "#1A1A1A", fillEdge: "#6E6E6E" },
};

// ---------- deterministic random ----------
function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(20260928);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- graph metrics ----------
function adjacency(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    for (const [s, t] of edges) {
        adj[s].push(t);
        adj[t].push(s);
    }
    return adj;
}
function components(adj) {
    const seen = new Int32Array(adj.length).fill(-1);
    let c = 0;
    for (let i = 0; i < adj.length; i++) {
        if (seen[i] >= 0) continue;
        const stack = [i];
        seen[i] = c;
        while (stack.length) {
            const v = stack.pop();
            for (const w of adj[v]) if (seen[w] < 0) (seen[w] = c), stack.push(w);
        }
        c++;
    }
    return c;
}
function componentSizes(adj) {
    const seen = new Uint8Array(adj.length);
    const sizes = [];
    for (let i = 0; i < adj.length; i++) {
        if (seen[i]) continue;
        let size = 0;
        for (const stack = [i], _ = (seen[i] = 1); stack.length; size++) for (const w of adj[stack.pop()]) if (!seen[w]) (seen[w] = 1), stack.push(w);
        sizes.push(size);
    }
    return sizes;
}
// Brandes, unweighted, normalized to [0, 1] for an undirected graph.
function betweenness(adj) {
    const n = adj.length;
    const cb = new Float64Array(n);
    for (let s = 0; s < n; s++) {
        const S = [];
        const P = Array.from({ length: n }, () => []);
        const sigma = new Float64Array(n);
        const dist = new Int32Array(n).fill(-1);
        sigma[s] = 1;
        dist[s] = 0;
        const Q = [s];
        for (let qi = 0; qi < Q.length; qi++) {
            const v = Q[qi];
            S.push(v);
            for (const w of adj[v]) {
                if (dist[w] < 0) (dist[w] = dist[v] + 1), Q.push(w);
                if (dist[w] === dist[v] + 1) (sigma[w] += sigma[v]), P[w].push(v);
            }
        }
        const delta = new Float64Array(n);
        while (S.length) {
            const w = S.pop();
            for (const v of P[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
            if (w !== s) cb[w] += delta[w];
        }
    }
    const norm = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1; // undirected: cb/2 then / ((n-1)(n-2)/2)
    return Array.from(cb, (x) => x * norm);
}
function pagerank(adj, d = 0.85, iters = 60) {
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
// Newman modularity of a given partition.
function modularity(adj, group) {
    const m2 = adj.reduce((a, l) => a + l.length, 0);
    const tot = new Map();
    let inside = 0;
    adj.forEach((l, v) => {
        tot.set(group[v], (tot.get(group[v]) ?? 0) + l.length);
        for (const w of l) if (group[w] === group[v]) inside++;
    });
    let q = inside / m2;
    for (const k of tot.values()) q -= (k / m2) ** 2;
    return q;
}

// ---------- layout ----------
function layout(n, edges, { strength = -60, distance = 30, ticks = 400, group, pull = 0 } = {}) {
    // pull > 0 draws each group toward its own point on a circle: a stand-in for the lobes a
    // force layout finds in a large graph with regional structure.
    const groups = group ? [...new Set(group)] : [];
    const at = (i, axis) => (pull && group ? 400 * Math[axis](((2 * Math.PI) / groups.length) * groups.indexOf(group[i])) : 0);
    const nodes = Array.from({ length: n }, (_, i) => ({ i }));
    const links = edges.map(([s, t]) => ({ source: s, target: t }));
    const sim = d3
        .forceSimulation(nodes, 2)
        .randomSource(mulberry32(7))
        .force("charge", d3.forceManyBody().strength(strength))
        .force("link", d3.forceLink(links).distance(distance).strength(group ? (l) => (group[l.source.i] === group[l.target.i] ? 0.7 : 0.15) : 0.5))
        .force("x", d3.forceX((d) => at(d.i, "cos")).strength(pull || 0.04))
        .force("y", d3.forceY((d) => at(d.i, "sin")).strength(pull || 0.06))
        .stop();
    sim.tick(ticks);
    // Fit into the viewBox with a margin, keeping aspect.
    const xs = nodes.map((d) => d.x);
    const ys = nodes.map((d) => d.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const m = 70;
    const k = Math.min((W - 2 * m) / (x1 - x0 || 1), (H - 2 * m) / (y1 - y0 || 1));
    const ox = (W - k * (x1 - x0)) / 2;
    const oy = (H - k * (y1 - y0)) / 2;
    return nodes.map((d) => [ox + k * (d.x - x0), oy + k * (d.y - y0)]);
}

// ---------- drawing ----------
// WCAG relative luminance and contrast, for the fill-edge rule.
function lum(hex) {
    const c = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Label boxes for collision culling: 12 px Inter, about 6.8 px a character, plus the halo.
function cullLabels(labels, pos, size, text, first = []) {
    const order = [...new Set([...first.filter((i) => labels.includes(i)), ...labels])];
    const boxes = [];
    const kept = [];
    for (const i of order) {
        const x = pos[i][0] + size(i) + 4 - 2;
        const b = [x, pos[i][1] - 8, x + String(text(i)).length * 6.8 + 4, pos[i][1] + 7];
        if (boxes.some((o) => b[0] < o[2] && o[0] < b[2] && b[1] < o[3] && o[1] < b[3])) continue;
        boxes.push(b);
        kept.push(i);
    }
    return kept;
}
const f1 = (x) => Math.round(x * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function ring(x, y, r, theme, kind) {
    const T = THEMES[theme];
    const c = (rr, w, color, extra = "") =>
        `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="none" stroke="${color}" stroke-width="${w}"${extra}/>`;
    if (kind === "selected") return c(r + 1, 2, T.inner) + c(r + 3, 2, T.outer);
    if (kind === "member") return c(r + 0.5, 1, T.inner) + c(r + 1.5, 1, T.outer);
    if (kind === "hover") return c(r + 2.5, 1, T.outer);
    if (kind === "focus") return c(r + 2.5, 1, T.outer) + c(r + 4, 2, T.inner) + c(r + 5.5, 1, T.outer);
    return "";
}

function drawGraph({ theme, pos, edges, color, size, labels, marks = {}, edgeOpacity = 0.55, edgeWidth = 1, title, keep = null }) {
    const T = THEMES[theme];
    // keep: a Set of node indices left by filter steps; the rest are not drawn, positions unchanged.
    if (keep) {
        edges = edges.filter(([s, t]) => keep.has(s) && keep.has(t));
        labels = labels.filter((i) => keep.has(i));
    }
    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">`);
    out.push(`<rect width="${W}" height="${H}" fill="${T.canvas}"/>`);
    out.push(`<g stroke="${T.edge}" stroke-width="${edgeWidth}" stroke-opacity="${edgeOpacity}" stroke-linecap="round">`);
    for (const [s, t] of edges) out.push(`<line x1="${f1(pos[s][0])}" y1="${f1(pos[s][1])}" x2="${f1(pos[t][0])}" y2="${f1(pos[t][1])}"/>`);
    out.push(`</g>`);
    // Marked elements are drawn after unmarked ones (canvas-drawing.md 6).
    const markOf = new Map();
    for (const [kind, ids] of Object.entries(marks)) for (const id of [].concat(ids)) markOf.set(id, kind);
    const order = pos.map((_, i) => i).filter((i) => !keep || keep.has(i)).sort((a, b) => (markOf.has(a) ? 1 : 0) - (markOf.has(b) ? 1 : 0));
    // One fill under 3:1 on this canvas puts the fill edge on every node (canvas-drawing.md 4).
    const edged = order.some((i) => contrast(color(i), T.canvas) < 3);
    out.push(`<g>`);
    for (const i of order) {
        const [x, y] = pos[i];
        const r = size(i);
        out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${color(i)}"/>`);
        if (edged) out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + 0.65)}" fill="none" stroke="${T.fillEdge}" stroke-width="1.3"/>`);
        if (markOf.has(i)) out.push(ring(x, y, r, theme, markOf.get(i)));
    }
    out.push(`</g>`);
    out.push(
        `<g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`,
    );
    for (const i of cullLabels(labels, pos, size, drawGraph.labelOf, [...markOf.keys()])) {
        const [x, y] = pos[i];
        out.push(`<text x="${f1(x + size(i) + 4)}" y="${f1(y + 4)}">${esc(drawGraph.labelOf(i))}</text>`);
    }
    out.push(`</g></svg>`);
    return out.join("\n");
}

function hexDensity({ theme, pos, marked = [], size, color, title, markKind = "selected" }) {
    const T = THEMES[theme];
    const R = 9; // hex radius, CSS px at the viewBox scale
    const hw = Math.sqrt(3) * R;
    const bins = new Map();
    for (const [x, y] of pos) {
        const row = Math.round(y / (1.5 * R));
        const col = Math.round((x - (row % 2 ? hw / 2 : 0)) / hw);
        const key = `${col},${row}`;
        bins.set(key, (bins.get(key) ?? 0) + 1);
    }
    const max = Math.max(...bins.values());
    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">`);
    out.push(`<rect width="${W}" height="${H}" fill="${T.canvas}"/>`);
    out.push(`<g fill="${GRAY}">`);
    const hex = (cx, cy) =>
        Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            return `${f1(cx + R * Math.cos(a))},${f1(cy + R * Math.sin(a))}`;
        }).join(" ");
    for (const [key, n] of bins) {
        const [col, row] = key.split(",").map(Number);
        const cx = col * hw + (row % 2 ? hw / 2 : 0);
        const cy = row * 1.5 * R;
        // Neutral steps on a log scale: 5 steps of opacity.
        const step = Math.min(4, Math.floor((Math.log(n) / Math.log(max + 1)) * 5));
        out.push(`<polygon points="${hex(cx, cy)}" fill-opacity="${[0.22, 0.38, 0.55, 0.75, 0.95][step]}"/>`);
    }
    out.push(`</g><g>`);
    for (const i of marked) {
        const [x, y] = pos[i];
        const r = size(i);
        out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${color(i)}"/>` + ring(x, y, r, theme, markKind));
    }
    out.push(`</g></svg>`);
    return out.join("\n");
}

// ---------- datasets ----------
const corpus = join(root, "graph-io/test/corpus/json");
const datasets = {};
const arraysOf = {}; // arrays each dataset leaves for the frame and task fixtures at the end (not written out)
const svgs = [];
const outDir = join(here, "canvas");
mkdirSync(outDir, { recursive: true });
const pct = ([x, y]) => ({ x: Math.round((x / W) * 1000) / 10, y: Math.round((y / H) * 1000) / 10 });
function emit(name, render) {
    for (const theme of ["light", "dark"]) {
        writeFileSync(join(outDir, `${name}-${theme}.svg`), render(theme));
    }
    svgs.push(name);
}
const round = (x, d = 3) => Number(x.toFixed(d));
function summary(adj, edgesLen, directed = false) {
    const n = adj.length;
    const deg = adj.map((l) => l.length);
    return {
        components: components(adj),
        density: Number(((((directed ? 1 : 2) * edgesLen) / (n * (n - 1)))).toPrecision(3)), // directed: m / (n (n - 1)); 3 significant figures (content-design.md 5)
        averageDegree: round((2 * edgesLen) / n, 2),
        maxDegree: Math.max(...deg),
        isolated: deg.filter((d) => d === 0).length,
    };
}

// Louvain (Blondel et al. 2008), weighted, seeded: shared by the protein and transfer datasets.
const weighted = (N, E, A) => {
    const nb = Array.from({ length: N }, () => new Map());
    E.forEach(([a, b], e) => {
        nb[a].set(b, (nb[a].get(b) ?? 0) + A[e]);
        nb[b].set(a, (nb[b].get(a) ?? 0) + A[e]);
    });
    return nb;
};
const wQ = (nb0, group) => {
    let m2 = 0;
    let inside = 0;
    const tot = new Map();
    nb0.forEach((m, i) => {
        for (const [j, w] of m) {
            m2 += w;
            tot.set(group[i], (tot.get(group[i]) ?? 0) + w);
            if (group[j] === group[i]) inside += w;
        }
    });
    return inside / m2 - [...tot.values()].reduce((a, t) => a + (t / m2) ** 2, 0);
};
const louvain = (nb0, seed) => {
    const rl = mulberry32(seed);
    let nb = nb0;
    let member = nb0.map((_, i) => i);
    for (;;) {
        const N = nb.length;
        const k = nb.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
        const m2 = k.reduce((a, b) => a + b, 0);
        const comm = Array.from({ length: N }, (_, i) => i);
        const tot = [...k];
        let movedAny = false;
        for (let pass = 0; pass < 20; pass++) {
            let moved = false;
            const order = comm.map((_, i) => i);
            for (let i = N - 1; i > 0; i--) {
                const j = Math.floor(rl() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            for (const i of order) {
                const ci = comm[i];
                const w2c = new Map();
                for (const [j, w] of nb[i]) if (j !== i) w2c.set(comm[j], (w2c.get(comm[j]) ?? 0) + w);
                tot[ci] -= k[i];
                let best = ci;
                let bestGain = (w2c.get(ci) ?? 0) - (tot[ci] * k[i]) / m2;
                for (const [c, w] of w2c) {
                    const g = w - (tot[c] * k[i]) / m2;
                    if (g > bestGain + 1e-12) (bestGain = g), (best = c);
                }
                tot[best] += k[i];
                if (best !== ci) (comm[i] = best), (moved = true), (movedAny = true);
            }
            if (!moved) break;
        }
        if (!movedAny) break;
        const renum = new Map();
        for (const c of comm) if (!renum.has(c)) renum.set(c, renum.size);
        const nb2 = Array.from({ length: renum.size }, () => new Map());
        nb.forEach((m, i) => {
            const ci = renum.get(comm[i]);
            for (const [j, w] of m) {
                const cj = renum.get(comm[j]);
                nb2[ci].set(cj, (nb2[ci].get(cj) ?? 0) + w);
            }
        });
        member = member.map((c) => renum.get(comm[c]));
        nb = nb2;
    }
    // Number communities by size, largest first, as the Results panel lists them.
    const size = new Map();
    for (const c of member) size.set(c, (size.get(c) ?? 0) + 1);
    const rank = new Map([...size].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c], r) => [c, r + 1]));
    return member.map((c) => rank.get(c));
};

// 1. Zachary's karate club ------------------------------------------------------------------
{
    const raw = JSON.parse(readFileSync(join(corpus, "karate-d3.json"), "utf8"));
    const idx = new Map(raw.nodes.map((n, i) => [String(n.id), i]));
    const edges = raw.links.map((l) => [idx.get(String(l.source)), idx.get(String(l.target))]);
    const n = raw.nodes.length;
    const adj = adjacency(n, edges);
    // Zachary (1977): the members who joined Mr. Hi's club after the split.
    const hi = new Set([1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 17, 18, 20, 22]);
    const faction = raw.nodes.map((_, i) => (hi.has(i + 1) ? "Mr. Hi" : "Officer"));
    const label = (i) => (i === 0 ? "Mr. Hi" : i === 33 ? "Officer" : String(i + 1));
    const bc = betweenness(adj);
    const pos = layout(n, edges, { strength: -420, distance: 70 });
    const deg = adj.map((l) => l.length);
    const size = (i) => 6 + Math.sqrt(deg[i]) * 2.2;
    drawGraph.labelOf = label;
    const all = raw.nodes.map((_, i) => i);
    emit("karate-plain", (theme) => drawGraph({ theme, pos, edges, color: () => GRAY, size: () => 9, labels: all, title: "Karate club, 34 members, unstyled" }));
    emit("karate-faction", (theme) =>
        drawGraph({
            theme,
            pos,
            edges,
            color: (i) => (faction[i] === "Mr. Hi" ? OKABE_ITO[0] : OKABE_ITO[3]),
            size,
            labels: all,
            marks: { selected: 0, hover: 33, focus: 2 },
            title: "Karate club colored by faction, Mr. Hi selected",
        }),
    );
    const rows = raw.nodes.map((_, i) => ({ id: String(i + 1), label: label(i), faction: faction[i], degree: deg[i], betweenness: round(bc[i]) }));
    datasets.karate = {
        title: "Zachary's karate club",
        file: "karate.gml",
        source: "Zachary 1977, via graph-io's test corpus",
        nodes: n,
        edges: edges.length,
        directed: false,
        attributes: [
            { name: "label", kind: "text" },
            { name: "faction", kind: "category", values: { "Mr. Hi": 16, Officer: 18 } },
            { name: "degree", kind: "integer" },
            { name: "betweenness", kind: "number" },
        ],
        stats: { ...summary(adj, edges.length), modularityOfFactions: round(modularity(adj, faction)) },
        topByBetweenness: [...rows].sort((a, b) => b.betweenness - a.betweenness).slice(0, 8),
        rows,
        anchors: { selected: { id: "1", ...pct(pos[0]) }, hover: { id: "34", ...pct(pos[33]) }, focus: { id: "3", ...pct(pos[2]) } },
        drawings: { plain: "canvas/karate-plain-{theme}.svg", faction: "canvas/karate-faction-{theme}.svg" },
    };
}

// 2. Les Miserables -------------------------------------------------------------------------
{
    const raw = JSON.parse(readFileSync(join(corpus, "miserables.json"), "utf8"));
    // The published edge list (Knuth 1993; networkx les_miserables_graph), not graph-io's test
    // corpus as is: the corpus stores Old Man's one edge as a self-loop on Myriel and reads four
    // co-appearance values of 9 as 0 (test cases). Experts know the novel's graph is one component,
    // so every number here is the published graph's.
    {
        const at = (name) => raw.nodes.findIndex((d) => d.name === name);
        const [myriel, oldMan] = [at("Myriel"), at("OldMan")];
        const loop = raw.links.find((l) => l.source === myriel && l.target === myriel);
        // Lay out on the corpus edges so every other character keeps the position the mocks were
        // drawn on, then set Old Man beside Myriel (below).
        raw.layoutEdges = raw.links.map((l) => [l.source, l.target]);
        raw.oldMan = [oldMan, myriel];
        if (loop) loop.source = oldMan;
        const nine = [["Fantine", "Valjean"], ["Bossuet", "Combeferre"], ["Courfeyrac", "Marius"], ["Gillenormand", "Mlle.Gillenormand"]].map((p) => p.map(at).sort().join(","));
        for (const l of raw.links) if (l.value === 0 && nine.includes([l.source, l.target].sort().join(","))) l.value = 9;
    }
    const edges = raw.links.map((l) => [l.source, l.target]);
    const n = raw.nodes.length;
    const adj = adjacency(n, edges);
    const deg = adj.map((l) => l.length);
    const bc = betweenness(adj);
    const group = raw.nodes.map((d) => d.group);
    const names = raw.nodes.map((d) => d.name);
    const id = (name) => names.indexOf(name);
    const pos = layout(n, raw.layoutEdges, { strength: -320, distance: 55, group });
    {
        // Old Man sits one link length from Myriel, on the side away from Myriel's other neighbors.
        const [o, m] = raw.oldMan;
        const nb = adj[m].filter((x) => x !== o);
        const cx = nb.reduce((a, x) => a + pos[x][0], 0) / nb.length;
        const cy = nb.reduce((a, x) => a + pos[x][1], 0) / nb.length;
        const dx = pos[m][0] - cx, dy = pos[m][1] - cy, d = Math.hypot(dx, dy) || 1;
        pos[o] = [pos[m][0] + (dx / d) * 45, pos[m][1] + (dy / d) * 45];
    }
    drawGraph.labelOf = (i) => names[i];
    // Groups by size; the eight largest take Okabe-Ito order, the rest Other.
    const counts = new Map();
    group.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
    const colorOfGroup = (g) => (ranked.indexOf(g) < 7 ? OKABE_ITO[ranked.indexOf(g)] : OTHER);
    const size = (i) => 4 + Math.sqrt(deg[i]) * 2;
    const budget = [...deg.keys()].sort((a, b) => deg[b] - deg[a]).slice(0, 18);
    emit("lesmis-plain", (theme) =>
        drawGraph({ theme, pos, edges, color: () => GRAY, size: () => 6, labels: budget, title: "Les Miserables co-appearances, unstyled" }),
    );
    const marks = { selected: id("Valjean"), hover: id("Javert"), focus: id("Cosette") };
    emit("lesmis-groups", (theme) =>
        drawGraph({
            theme,
            pos,
            edges,
            color: (i) => colorOfGroup(group[i]),
            size,
            labels: [...new Set([...budget, ...Object.values(marks)])],
            marks,
            title: "Les Miserables colored by group, sized by degree, Valjean selected",
        }),
    );
    // The same picture at rest (nothing selected) and with only Valjean selected, for the
    // first-look storyboard (storyboards/first-look.html).
    for (const [name, m, title] of [
        ["lesmis-groups-rest", {}, "Les Miserables colored by group, sized by degree, nothing selected"],
        ["lesmis-groups-valjean", { selected: id("Valjean") }, "Les Miserables colored by group, sized by degree, Valjean selected"],
    ]) {
        emit(name, (theme) =>
            drawGraph({ theme, pos, edges, color: (i) => colorOfGroup(group[i]), size, labels: budget, marks: m, title }),
        );
    }
    // The sample's starting look (screens/frame-at-rest.html): group color only, every node one size.
    emit("lesmis-groups-onesize", (theme) =>
        drawGraph({ theme, pos, edges, color: (i) => colorOfGroup(group[i]), size: () => 6, labels: budget, title: "Les Miserables colored by group, nothing selected" }),
    );
    // The keyboard walk after its first step (flows/keyboard-walk.html): Valjean keeps his
    // selection ring and keyboard focus sits on Cosette, with no hover, so the figure shows only
    // the two marks it compares. Only the two nodes it is about are labeled.
    emit("lesmis-walk", (theme) =>
        drawGraph({
            theme,
            pos,
            edges,
            color: (i) => colorOfGroup(group[i]),
            size,
            labels: [id("Valjean"), id("Cosette")],
            marks: { selected: id("Valjean"), focus: id("Cosette") },
            title: "Les Miserables colored by group, sized by degree, Valjean selected, Cosette keyboard-focused",
        }),
    );
    const members = adj[id("Valjean")];
    emit("lesmis-neighbors", (theme) =>
        drawGraph({
            theme,
            pos,
            edges,
            color: (i) => colorOfGroup(group[i]),
            size,
            labels: [id("Valjean"), ...members.filter((m) => deg[m] > 6)],
            marks: { member: members, selected: id("Valjean") },
            title: "Les Miserables, Valjean selected with his 36 neighbors as members",
        }),
    );
    // Three filter steps for the undo flow (flows/undo-and-ways-back.html): Filter to degree >= 2,
    // Filter to degree >= 5, Filter out group 8; and the same with the middle step off. The
    // published graph is one component, so the first step drops the characters with one partner
    // (a "Largest component" step would keep all 77).
    const all = [...deg.keys()];
    // Two components, the second one isolated character (summary below), so the largest is every
    // node with a tie.
    const s1 = all.filter((i) => deg[i] >= 2);
    // Degree is live: a later step reads it on the graph the earlier steps left (screens/filter-chip.html).
    const s1set = new Set(s1);
    const s2 = s1.filter((i) => adj[i].filter((m) => s1set.has(m)).length >= 5);
    const s3 = s2.filter((i) => group[i] !== 8);
    const s2off = s1.filter((i) => group[i] !== 8);
    const v = id("Valjean");
    const vIn3 = adj[v].filter((m) => s3.includes(m));
    const stepMarks = { selected: v, member: vIn3 };
    for (const [name, keepList, title, m] of [
        ["lesmis-step1", s1, "Les Miserables filtered to degree 2 or more", {}],
        ["lesmis-step2", s2, "Les Miserables filtered to degree 5 or more", {}],
        ["lesmis-step3", s3, "Les Miserables after three filter steps", {}],
        ["lesmis-step3-selected", s3, "Les Miserables after three filter steps, Valjean and his neighbors selected", stepMarks],
        // All of them carry the selection ring (screens/undo.html): a hand-built selection, not a seed and its members.
        ["lesmis-step3-selset", s3, `Les Miserables after three filter steps, Valjean and ${vIn3.length} others selected`, { selected: [v, ...vIn3] }],
        ["lesmis-step2-selset", s2, `Les Miserables filtered to degree 5 or more, the same ${vIn3.length + 1} nodes selected`, { selected: [v, ...vIn3] }],
        ["lesmis-step1-selset", s1, `Les Miserables filtered to degree 2 or more, the same ${vIn3.length + 1} nodes selected`, { selected: [v, ...vIn3] }],
        ["lesmis-step2off", s2off, "Les Miserables with the degree step turned off", {}],
        ["lesmis-step2off-selset", s2off, `Les Miserables with the degree step turned off, the same ${vIn3.length + 1} nodes selected`, { selected: [v, ...vIn3] }],
    ]) {
        const keep = new Set(keepList);
        emit(name, (theme) =>
            drawGraph({ theme, pos, edges, color: (i) => colorOfGroup(group[i]), size, labels: budget, marks: m, keep, title }),
        );
    }
    // A committed Find hit brought into view (screens/find.html): zoomed about Thenardier, whose
    // label the 100% drawing culls. Marks, node sizes and labels keep their screen size, so the
    // zoom spreads the cluster and the labels it frees are drawn (the collision cull still runs).
    const th = id("Thenardier");
    const findZoom = 2;
    const posZ = pos.map(([x, y]) => [pos[th][0] + (x - pos[th][0]) * findZoom, pos[th][1] + (y - pos[th][1]) * findZoom]);
    const keep3 = new Set(s3);
    emit("lesmis-step3-find-zoom", (theme) =>
        drawGraph({ theme, pos: posZ, edges, color: (i) => colorOfGroup(group[i]), size, labels: s3, marks: { selected: th }, keep: keep3, title: "Les Miserables after three filter steps, zoomed to 200% about Thenardier, selected" }),
    );
    const rows = names.map((name, i) => ({ id: String(i), label: name, group: group[i], degree: deg[i], betweenness: round(bc[i]) }));
    // Per step: live degree read on the filtered graph beside the full-graph degree
    // (conceptual-model.md 3); betweenness stays the full-graph run's.
    const stepStats = (keepList) => {
        const keep = new Set(keepList);
        const fdeg = (i) => adj[i].filter((m) => keep.has(m)).length;
        const at = new Map(keepList.map((i, j) => [i, j]));
        const subAdj = keepList.map((i) => adj[i].filter((m) => keep.has(m)).map((m) => at.get(m)));
        const e = subAdj.reduce((a, l) => a + l.length, 0) / 2;
        const k = keepList.length;
        const row = (i) => ({ label: names[i], group: group[i], degree: fdeg(i), fullDegree: deg[i], betweenness: round(bc[i]) });
        const byDeg = (a, b) => b.degree - a.degree || b.fullDegree - a.fullDegree;
        return {
            nodes: k,
            edges: e,
            components: components(subAdj),
            density: Number(((2 * e) / (k * (k - 1))).toPrecision(3)),
            top: keepList.map(row).sort(byDeg).slice(0, 10),
            selection: [v, ...vIn3].map(row).sort(byDeg),
            // The table sorted by full-graph degree (screens/filter-steps-and-undo.html).
            topByFullDegree: keepList.map(row).sort((a, b) => b.fullDegree - a.fullDegree || b.betweenness - a.betweenness).slice(0, 7),
            // Group counts, largest first, for the legend of this step.
            groups: Object.fromEntries([...keepList.reduce((m, i) => m.set(group[i], (m.get(group[i]) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])),
        };
    };
    arraysOf.lesmis = { deg, edges };
    datasets.lesmis = {
        title: "Les Miserables",
        file: "miserables.json",
        source: "Knuth 1993, The Stanford GraphBase, via graph-io's test corpus",
        nodes: n,
        edges: edges.length,
        directed: false,
        attributes: [
            { name: "label", kind: "text" },
            { name: "group", kind: "category", values: Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])) },
            { name: "degree", kind: "integer" },
            { name: "betweenness", kind: "number" },
            { name: "value (edge)", kind: "integer", note: "co-appearance count" },
        ],
        stats: { ...summary(adj, edges.length), modularityOfGroups: round(modularity(adj, group)) },
        groupColors: Object.fromEntries(ranked.map((g) => [g, colorOfGroup(g)])),
        topByBetweenness: [...rows].sort((a, b) => b.betweenness - a.betweenness).slice(0, 10),
        topByDegree: [...rows].sort((a, b) => b.degree - a.degree).slice(0, 10),
        rows,
        anchors: {
            selected: { id: "Valjean", ...pct(pos[marks.selected]) },
            hover: { id: "Javert", ...pct(pos[marks.hover]) },
            focus: { id: "Cosette", ...pct(pos[marks.focus]) },
        },
        valjeanNeighbors: members.length,
        // What graph-io's test corpus changes on purpose; the numbers above are the published graph.
        corpusDiffersFromPublished: {
            note: "Every number and drawing here is the published Les Miserables graph (Knuth 1993; networkx les_miserables_graph): one component, nobody isolated, Old Man's one edge goes to Myriel. graph-io's test corpus differs on purpose (the self-loop and zero values below); the kit corrects it on load.",
            corpusSelfLoopInsteadOf: { source: "OldMan", target: "Myriel", value: 1 },
            corpusValueZeroPublishedNine: [["Fantine", "Valjean"], ["Bossuet", "Combeferre"], ["Courfeyrac", "Marius"], ["Gillenormand", "Mlle.Gillenormand"]],
            published: { components: 1, isolated: 0, oldManDegree: 1, myrielDegree: 10, napoleonNeighbors: ["Myriel"] },
        },
        filterSteps: {
            steps: ["Filter to degree >= 2", "Filter to degree >= 5", "Filter out group 8"],
            after: { step1: s1.length, step2: s2.length, step3: s3.length, step2Off: s2off.length },
            // What each step took out, and, with the degree step off, how many nodes the first step
            // kept that now have degree under 2 because group 8 went (the step row's "dropped below" line).
            took: { step1: n - s1.length, step2: s1.length - s2.length, step3: s2.length - s3.length, step3WithStep2Off: s1.length - s2off.length },
            // Betweenness run on the graph the first step leaves (screens/results-panel.html, "Results
            // after a filter"): exact, unweighted, normalized over that graph's own node pairs.
            betweennessOnStep1: (() => {
                const at = new Map(s1.map((i, j) => [i, j]));
                const sub = s1.map((i) => adj[i].filter((m) => at.has(m)).map((m) => at.get(m)));
                const bs = betweenness(sub);
                return s1.map((i, j) => ({ label: names[i], betweenness: round(bs[j]) })).sort((x, y) => y.betweenness - x.betweenness || x.label.localeCompare(y.label));
            })(),
            belowFirstStepWithStep2Off: (() => { const k = new Set(s2off); return s2off.filter((i) => adj[i].filter((m) => k.has(m)).length < 2).length; })(),
            // Statistics after each on/off combination of the three steps, in their order ("1-3" is
            // steps 1 and 3 on), as screens/filter-chip.html's Statistics shows them: degree is live,
            // so a later degree step reads the graph the earlier steps left. No rand() here.
            statsByState: Object.fromEntries(
                [[1, 2, 3], [1, 2], [1, 3], [2, 3], [1], [2], [3]].map((on) => {
                    let k = all;
                    for (const st of on) {
                        const ks = new Set(k);
                        k = st === 3 ? k.filter((i) => group[i] !== 8) : k.filter((i) => adj[i].filter((m) => ks.has(m)).length >= (st === 1 ? 2 : 5));
                    }
                    const at = new Map(k.map((i, j) => [i, j]));
                    const sub = k.map((i) => adj[i].filter((m) => at.has(m)).map((m) => at.get(m)));
                    const e = sub.reduce((x, l) => x + l.length, 0) / 2;
                    const sizes = componentSizes(sub);
                    return [on.join("-"), { nodes: k.length, edges: e, components: sizes.length, largestComponent: Math.max(0, ...sizes), isolated: sub.filter((l) => !l.length).length, averageDegree: k.length ? Number(((2 * e) / k.length).toPrecision(3)) : null, density: k.length > 1 ? Number(((2 * e) / (k.length * (k.length - 1))).toPrecision(3)) : null }];
                }),
            ),
            valjeanNeighborsAfterStep3: vIn3.length,
            valjeanNeighborsAfterStep3Labels: vIn3.map((i) => names[i]),
            // Per step: live degree read on the filtered graph beside the full-graph degree
            // (conceptual-model.md 3); betweenness stays the full-graph run's.
            byStep: [s1, s2, s3].map((keepList) => stepStats(keepList)),
            // The same with the middle step turned off (screens/undo.html), plus its group counts
            // for the legend.
            step2OffStats: {
                ...stepStats(s2off),
                groups: Object.fromEntries([...s2off.reduce((m, i) => m.set(group[i], (m.get(group[i]) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])),
            },
            findZoom: { zoom: findZoom, thenardier: pct(pos[th]), drawing: "canvas/lesmis-step3-find-zoom-{theme}.svg" },
            selectionGroups: Object.fromEntries(
                [...[v, ...vIn3].reduce((m, i) => m.set(group[i], (m.get(group[i]) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]),
            ),
            drawings: "canvas/lesmis-{step1,step2,step3,step3-selected,step1-selset,step2-selset,step3-selset,step2off,step2off-selset}-{theme}.svg",
        },
        drawings: { plain: "canvas/lesmis-plain-{theme}.svg", groups: "canvas/lesmis-groups-{theme}.svg", neighbors: "canvas/lesmis-neighbors-{theme}.svg" },
    };
}

// 3. Protein interaction network (300 proteins) ---------------------------------------------
{
    const fam = (p, a, b) => Array.from({ length: b - a + 1 }, (_, k) => `${p}${a + k}`);
    const modules = [
        ["Proteasome", [...fam("PSMA", 1, 7), ...fam("PSMB", 1, 10), ...fam("PSMC", 1, 6), ...fam("PSMD", 1, 14), "ADRM1", "UCHL5", "USP14"]],
        ["Ribosome", [...fam("RPL", 3, 32), ...fam("RPS", 2, 27)]],
        ["Complex I", [...fam("NDUFA", 1, 13), ...fam("NDUFB", 1, 11), ...fam("NDUFS", 1, 8), ...fam("NDUFV", 1, 3)]],
        ["Spliceosome", [...fam("SF3B", 1, 6), ...fam("SF3A", 1, 3), "SNRNP70", "SNRPA", "SNRPB", "SNRPC", "SNRPD1", "SNRPD2", "SNRPD3", "SNRPE", "SNRPF", "SNRPG", "PRPF8", "PRPF19", "PRPF31", "U2AF1", "U2AF2", "SRSF1", "SRSF2", "SRSF3", "HNRNPA1", "HNRNPC", "DHX15", "EFTUD2", "SNRNP200"]],
        ["DNA repair", ["TP53", "MDM2", "BRCA1", "BRCA2", "ATM", "ATR", "CHEK1", "CHEK2", "RAD51", "RAD50", "MRE11", "NBN", "XRCC1", "XRCC5", "XRCC6", "PARP1", "MLH1", "MSH2", "MSH6", "PALB2", "FANCD2", "BLM", "WRN", "H2AX", "MDC1", "53BP1", "RPA1", "RPA2", "PCNA", "LIG4"]],
        ["Cell cycle", [...fam("CDK", 1, 9), "CCNA2", "CCNB1", "CCND1", "CCNE1", "CDC20", "CDC25A", "CDC25C", "CDKN1A", "CDKN1B", "CDKN2A", "RB1", "E2F1", "PLK1", "AURKA", "AURKB", "BUB1", "MAD2L1", "WEE1", "SKP2", "FZR1"]],
        ["MAPK signaling", [...fam("MAPK", 1, 14), "EGFR", "ERBB2", "KRAS", "HRAS", "NRAS", "BRAF", "RAF1", "MAP2K1", "MAP2K2", "GRB2", "SOS1", "SHC1", "DUSP1", "DUSP6", "JUN", "FOS", "ELK1"]],
        ["TGF-beta", [...fam("SMAD", 1, 7), "TGFB1", "TGFB2", "TGFBR1", "TGFBR2", "BMP2", "BMP4", "BMPR1A", "BMPR2", "ACVR1", "SKI", "SMURF1", "SMURF2", "NOG", "LTBP1"]],
    ];
    const names = [];
    const mod = [];
    for (const [m, genes] of modules) for (const g of genes) if (!names.includes(g)) names.push(g), mod.push(m);
    names.length = mod.length = Math.min(names.length, 300);
    // Top up to exactly 300 with interactors of unknown module.
    const extra = ["UBC", "UBB", "HSP90AA1", "HSPA8", "YWHAZ", "YWHAB", "CUL1", "CUL3", "RBX1", "SKP1", "VCP", "EP300", "CREBBP", "HDAC1", "HDAC2", "SIRT1", "AKT1", "PIK3CA", "PTEN", "MTOR", "MYC", "MAX", "CTNNB1", "APC", "GSK3B", "NOTCH1", "STAT3", "JAK2", "SRC", "ABL1"];
    for (const g of extra) if (names.length < 300 && !names.includes(g)) names.push(g), mod.push("Unassigned");
    while (names.length < 300) names.push(`C${names.length}orf${Math.floor(rand() * 90) + 10}`), mod.push("Unassigned");
    const n = names.length;
    const byMod = new Map();
    mod.forEach((m, i) => byMod.set(m, [...(byMod.get(m) ?? []), i]));
    const key = new Set();
    const edges = [];
    const conf = [];
    const add = (a, b, c) => {
        if (a === b) return;
        const k = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (key.has(k)) return;
        key.add(k);
        edges.push([a, b]);
        conf.push(c);
    };
    // Dense within complexes, a few hubs across (TP53, UBC, HSP90AA1, MAPK1, CDK1, EP300).
    for (const [m, ids] of byMod) {
        const p = m === "Unassigned" ? 0 : Math.min(0.5, 7 / ids.length);
        for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) if (rand() < p) add(ids[a], ids[b], round(0.7 + rand() * 0.29, 2));
    }
    const hubs = ["TP53", "UBC", "HSP90AA1", "MAPK1", "CDK1", "EP300", "UBB", "YWHAZ", "AKT1", "MYC"].map((g) => names.indexOf(g));
    for (const h of hubs) for (let k = 0; k < 22; k++) add(h, Math.floor(rand() * n), round(0.4 + rand() * 0.5, 2));
    for (let k = 0; k < 90; k++) add(Math.floor(rand() * n), Math.floor(rand() * n), round(0.4 + rand() * 0.3, 2));
    const adj = adjacency(n, edges);
    const deg = adj.map((l) => l.length);
    const bc = betweenness(adj);
    const pr = pagerank(adj);
    const fc = names.map(() => round((rand() + rand() + rand() - 1.5) * 2.2, 2)); // log2 fold change
    const moduleNames = modules.map(([m]) => m);
    const color = (i) => (mod[i] === "Unassigned" ? OTHER : OKABE_ITO[moduleNames.indexOf(mod[i]) % 8]);
    const pos = layout(n, edges, { strength: -40, distance: 22, group: mod, ticks: 500 });
    drawGraph.labelOf = (i) => names[i];
    const size = (i) => 3 + Math.sqrt(deg[i]) * 1.4;
    const budget = [...deg.keys()].sort((a, b) => deg[b] - deg[a]).slice(0, 22);
    const tp53 = names.indexOf("TP53");
    emit("ppi-plain", (theme) => drawGraph({ theme, pos, edges, color: () => GRAY, size: () => 4, labels: budget.slice(0, 12), edgeOpacity: 0.35, title: "Protein interactions, 300 proteins, unstyled" }));
    // The evidence TSV loaded with Keep all (datasets.ppiEvidence): the 2 proteins with no
    // interaction sit on rows with an empty partner and load unconnected, so all 300 are drawn;
    // parallel edges draw as one line. First render: gray.
    {
        const keep = new Set(pos.map((_, i) => i));
        emit("ppi-evidence-plain", (theme) => drawGraph({ theme, pos, edges, color: () => GRAY, size: () => 4, labels: budget.slice(0, 12), edgeOpacity: 0.35, keep, title: `Protein interactions from the evidence file, ${keep.size} proteins, unstyled` }));
    }
    emit("ppi-modules", (theme) =>
        drawGraph({
            theme,
            pos,
            edges,
            color,
            size,
            labels: budget,
            marks: { selected: tp53 },
            edgeOpacity: 0.3,
            title: "Protein interactions colored by module, sized by degree, TP53 selected",
        }),
    );
    // The same picture with nothing selected, for a session that reaches a selection later (flows/run-and-read.html).
    emit("ppi-modules-rest", (theme) =>
        drawGraph({ theme, pos, edges, color, size, labels: budget, edgeOpacity: 0.3, title: "Protein interactions colored by module, sized by degree, nothing selected" }),
    );
    // The starting look of screens/frame-at-rest.html: module color only, every protein one size.
    emit("ppi-modules-onesize", (theme) =>
        drawGraph({ theme, pos, edges, color, size: () => 4, labels: budget, edgeOpacity: 0.3, title: "Protein interactions colored by module, nothing selected" }),
    );
    const rows = names.map((g, i) => ({ id: g, module: mod[i], degree: deg[i], betweenness: round(bc[i], 4), pagerank: round(pr[i], 5), log2FoldChange: fc[i] }));
    const counts = Object.fromEntries([...byMod].map(([m, ids]) => [m, ids.length]));
    // The TP53 slice: TP53 and its neighbors, the graph filtered to them, for the keyboard walk.
    // Neighbor order is the walk's stated key: edge confidence, highest first, then name.
    // No rand() here, so every dataset after this one is unchanged.
    const confOf = new Map(edges.map(([a, b], k) => [a < b ? `${a}-${b}` : `${b}-${a}`, conf[k]]));
    const cOf = (a, b) => confOf.get(a < b ? `${a}-${b}` : `${b}-${a}`);
    const degRank = (i) => 1 + deg.filter((d) => d > deg[i]).length;
    const sliceIds = [tp53, ...adj[tp53]];
    const inSlice = new Set(sliceIds);
    const sliceEdges = edges.filter(([a, b]) => inSlice.has(a) && inSlice.has(b)).map(([a, b]) => [sliceIds.indexOf(a), sliceIds.indexOf(b)]);
    const sliceAdj = adjacency(sliceIds.length, sliceEdges);
    const ordered = (i) =>
        sliceAdj[sliceIds.indexOf(i)]
            .map((j) => sliceIds[j])
            .sort((a, b) => cOf(i, b) - cOf(i, a) || names[a].localeCompare(names[b]))
            .map((j) => ({ id: names[j], module: mod[j], degree: deg[j], degreeRank: degRank(j), confidence: cOf(i, j) }));
    const slicePos = layout(sliceIds.length, sliceEdges, { strength: -260, distance: 90, ticks: 500 });
    const sliceLabelOf = (k) => names[sliceIds[k]];
    emit("ppi-tp53", (theme) => {
        drawGraph.labelOf = sliceLabelOf;
        return drawGraph({
            theme,
            pos: slicePos,
            edges: sliceEdges,
            color: (k) => color(sliceIds[k]),
            size: (k) => 5 + Math.sqrt(deg[sliceIds[k]]) * 1.8,
            labels: sliceIds.map((_, k) => k),
            marks: { selected: 0 },
            edgeOpacity: 0.4,
            title: "TP53 and its 32 neighbors, colored by module, sized by degree, TP53 selected",
        });
    });
    drawGraph.labelOf = (i) => names[i];
    const tp53Slice = {
        note: "the protein graph filtered to TP53 and its neighbors; degree and rank are over the full 300-protein graph; neighbor lists are within the slice, ordered by edge confidence then name",
        nodes: sliceIds.length,
        edges: sliceEdges.length,
        order: "confidence, then name",
        anchor: { id: "TP53", module: mod[tp53], degree: deg[tp53], degreeRank: degRank(tp53) },
        neighborsOf: Object.fromEntries(sliceIds.map((i) => [names[i], ordered(i)])),
        anchors: Object.fromEntries(sliceIds.map((i, k) => [names[i], pct(slicePos[k])])),
        drawing: "canvas/ppi-tp53-{theme}.svg",
    };
    arraysOf.ppi = { n, names, mod, edges, conf, deg, fc };
    datasets.ppi = {
        title: "Human protein interactions (300 proteins)",
        file: "ppi-core-300.graphml",
        source: "generated for the mocks: real gene symbols in eight real complexes and pathways; edges and scores are synthetic",
        nodes: n,
        edges: edges.length,
        directed: false,
        attributes: [
            { name: "id (gene symbol)", kind: "text" },
            { name: "module", kind: "category", values: counts },
            { name: "degree", kind: "integer" },
            { name: "betweenness", kind: "number" },
            { name: "pagerank", kind: "number" },
            { name: "log2FoldChange", kind: "number", range: [Math.min(...fc), Math.max(...fc)] },
            { name: "confidence (edge)", kind: "number", range: [Math.min(...conf), Math.max(...conf)] },
        ],
        stats: { ...summary(adj, edges.length), modularityOfModules: round(modularity(adj, mod)) },
        moduleColors: Object.fromEntries([...byMod.keys()].map((m) => [m, m === "Unassigned" ? OTHER : OKABE_ITO[moduleNames.indexOf(m) % 8]])),
        topByDegree: [...rows].sort((a, b) => b.degree - a.degree).slice(0, 10),
        topByBetweenness: [...rows].sort((a, b) => b.betweenness - a.betweenness).slice(0, 10),
        rows: rows.slice(0, 40),
        anchors: { selected: { id: "TP53", ...pct(pos[tp53]) } },
        drawings: { plain: "canvas/ppi-plain-{theme}.svg", modules: "canvas/ppi-modules-{theme}.svg", modulesRest: "canvas/ppi-modules-rest-{theme}.svg", tp53: "canvas/ppi-tp53-{theme}.svg" },
        tp53Slice,
    };

    // Color and size by a value (flows/color-by-value.html). No rand() here.
    // Fold change on the shipped red-blue diverging palette, linear, midpoint 0; degree as node size,
    // square root, five bins cut on log(1 + x) (zeros present); a shortest path as a highlight mark.
    const RED_BLUE = ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac"]; // graphty-element RED_BLUE_COLORS, as shipped
    const lerpHex = (a, b, t) => "#" + [0, 2, 4].map((k) => Math.round(parseInt(a.slice(1 + k, 3 + k), 16) * (1 - t) + parseInt(b.slice(1 + k, 3 + k), 16) * t).toString(16).padStart(2, "0")).join("");
    const fcLo = Math.min(...fc);
    const fcHi = Math.max(...fc);
    const fcColor = (i) => {
        const u = fc[i] < 0 ? 0.5 * (1 - fc[i] / fcLo) : 0.5 + 0.5 * (fc[i] / fcHi); // 0 at the low end, 0.5 at zero
        const x = u * (RED_BLUE.length - 1);
        const k = Math.min(RED_BLUE.length - 2, Math.floor(x));
        return lerpHex(RED_BLUE[k], RED_BLUE[k + 1], x - k);
    };
    const maxDeg = Math.max(...deg);
    const edgesAt = [0, 1, 2, 3, 4, 5].map((k) => Math.expm1((k / 5) * Math.log1p(maxDeg)));
    const binOf = (d) => Math.min(4, [1, 2, 3, 4].filter((k) => d > edgesAt[k]).length);
    const binLo = [0, 1, 2, 3, 4].map((k) => (k === 0 ? 0 : Math.floor(edgesAt[k]) + 1));
    const binHi = [0, 1, 2, 3, 4].map((k) => (k === 4 ? maxDeg : Math.floor(edgesAt[k + 1])));
    const BIN_R = [3, 4.5, 6.2, 8.2, 10.5];
    const sizeByDeg = (i) => BIN_R[binOf(deg[i])];
    // BFS shortest path TP53 to SMAD3.
    const smad3 = names.indexOf("SMAD3");
    const prev = new Int32Array(n).fill(-1);
    prev[tp53] = tp53;
    for (let q = [tp53]; q.length && prev[smad3] < 0; ) {
        const v = q.shift();
        for (const w of adj[v]) if (prev[w] < 0) (prev[w] = v), q.push(w);
    }
    const pathIds = [smad3];
    while (pathIds[0] !== tp53) pathIds.unshift(prev[pathIds[0]]);
    const pathEdges = pathIds.slice(1).map((b, k) => [pathIds[k], b]);
    const fcLabels = [...budget.slice(0, 12), ...pathIds.filter((i) => !budget.slice(0, 12).includes(i))];
    const fillEdgeOf = { light: "#767676", dark: "#9A9A9A" };
    const drawEncoded = (theme, { size, path, overpaint, title, color = fcColor, labels = null, marks = {} }) => {
        const T = THEMES[theme];
        const svg = drawGraph({
            theme,
            pos,
            edges,
            color: overpaint ? (i) => (pathIds.includes(i) ? "#0072B2" : "#CCCCCC") : color,
            size,
            labels: labels || (path || overpaint ? fcLabels : budget.slice(0, 12)),
            marks,
            edgeOpacity: 0.3,
            title,
        });
        // The fill edge (canvas-drawing.md 4): red-blue has fills under 3:1 on both canvases, so every node it fills carries one.
        let out = overpaint ? svg : svg.replace(/(<circle [^>]*fill="#[0-9a-f]{6}")\/>/g, `$1 stroke="${fillEdgeOf[theme]}" stroke-width="1"/>`);
        if (path) {
            // Highlight 1 (canvas-drawing.md 6, ring 2a): a long dash in a two-tone band, casing on edges, ring on nodes.
            const cas = pathEdges
                .map(([s, t]) => {
                    const l = (w, c, d = "") => `<line x1="${f1(pos[s][0])}" y1="${f1(pos[s][1])}" x2="${f1(pos[t][0])}" y2="${f1(pos[t][1])}" stroke="${c}" stroke-width="${w}"${d}/>`;
                    return l(7, T.inner) + l(7, T.outer, ' stroke-dasharray="10 5"') + l(1.5, T.edge);
                })
                .join("");
            const rings = pathIds
                .map((i) => {
                    const r = size(i);
                    const c = (rr, col, d = "") => `<circle cx="${f1(pos[i][0])}" cy="${f1(pos[i][1])}" r="${f1(rr)}" fill="none" stroke="${col}" stroke-width="1.5"${d}/>`;
                    return c(r + 1.25, T.inner) + c(r + 2.75, T.outer, ' stroke-dasharray="6 3"');
                })
                .join("");
            out = out.replace("</g>\n<g>", `</g>\n<g>${cas}</g>\n<g>`).replace(/<\/g>\n<g font-family/, `${rings}</g>\n<g font-family`);
        }
        return out;
    };
    emit("ppi-foldchange", (theme) => drawEncoded(theme, { size: () => 4, title: "Protein interactions colored by log2 fold change, red to blue, diverging at 0" }));
    emit("ppi-foldchange-degree", (theme) => drawEncoded(theme, { size: sizeByDeg, title: "Colored by log2 fold change, sized by degree" }));
    emit("ppi-foldchange-path", (theme) => drawEncoded(theme, { size: sizeByDeg, path: true, title: "Colored by fold change, sized by degree, shortest path TP53 to SMAD3 highlighted" }));
    // The inspector's numbers (screens/inspector.gen.mjs): TP53's neighborhood per hop, the count of
    // equal shortest paths to SMAD3, the DNA repair set, and the two small selections. No rand().
    {
        const rankOf = (vals, i) => ({ from: 1 + vals.filter((v) => v > vals[i]).length, to: vals.filter((v) => v >= vals[i]).length });
        const dist = new Int32Array(n).fill(-1);
        const ways = new Float64Array(n);
        dist[tp53] = 0;
        ways[tp53] = 1;
        for (let q = [tp53], h = 0; h < q.length; h++) {
            const v = q[h];
            for (const w of adj[v]) {
                if (dist[w] < 0) (dist[w] = dist[v] + 1), q.push(w);
                if (dist[w] === dist[v] + 1) ways[w] += ways[v];
            }
        }
        const within = (h) => [...dist].filter((d) => d >= 0 && d <= h).length; // the seed included
        const setIds = [...mod.keys()].filter((i) => mod[i] === "DNA repair");
        const inSet = new Set(setIds);
        const inside = edges.filter(([a, b]) => inSet.has(a) && inSet.has(b)).length;
        const out = edges.filter(([a, b]) => inSet.has(a) !== inSet.has(b)).length;
        const outN = new Set(setIds.flatMap((i) => adj[i].filter((j) => !inSet.has(j)))).size;
        const node = (id) => {
            const i = names.indexOf(id);
            return { id, module: mod[i], degree: deg[i], degreeRank: rankOf(deg, i), betweenness: round(bc[i], 4), betweennessRank: rankOf(bc, i), pagerank: round(pr[i], 5), pagerankRank: rankOf(pr, i), log2FoldChange: fc[i] };
        };
        const trio = ["TP53", "BRCA1", "WRN"].map((g) => names.indexOf(g));
        const brca1 = names.indexOf("BRCA1");
        datasets.ppi.inspector = {
            note: "for screens/inspector.html; ranks are over the 300 proteins, ties as a range",
            tp53: node("TP53"),
            neighborhood: { seed: "TP53", nodesWithin: [1, 2, 3].map(within), of: n, note: "nodes within h hops, the seed included" },
            path: { from: "TP53", to: "SMAD3", hops: dist[smad3], equalPaths: ways[smad3], confidences: pathEdges.map(([a, b]) => cOf(a, b)) },
            dnaRepair: {
                members: setIds.length,
                edgesInside: inside,
                edgesOut: out,
                neighborsOut: outN,
                averageDegree: round(setIds.reduce((s, i) => s + deg[i], 0) / setIds.length, 1),
                degreeRange: [Math.min(...setIds.map((i) => deg[i])), Math.max(...setIds.map((i) => deg[i]))],
                byDegree: setIds.sort((a, b) => deg[b] - deg[a] || names[a].localeCompare(names[b])).map((i) => ({ id: names[i], degree: deg[i], rank: rankOf(deg, i) })),
            },
            edge: { source: "TP53", target: "BRCA1", exists: adj[tp53].includes(brca1), confidence: cOf(tp53, brca1) ?? null },
            brca1: node("BRCA1"),
            trio: {
                ids: trio.map((i) => names[i]),
                degrees: trio.map((i) => deg[i]),
                edgesAmong: edges.filter(([a, b]) => trio.includes(a) && trio.includes(b)).length,
                sharedModule: new Set(trio.map((i) => mod[i])).size === 1 ? mod[trio[0]] : null,
                differ: ["degree", "betweenness", "pagerank", "log2FoldChange"].filter((k) => new Set(trio.map((i) => ({ degree: deg, betweenness: bc, pagerank: pr, log2FoldChange: fc })[k][i])).size > 1),
            },
        };
    }
    // The proposed default diverging palette (framework-changes.md, "Color by a value: the default
    // diverging palette is blue to orange"): no up/down meaning; the midpoint, a mid-tone sand, clears
    // 2:1 on both canvases (2.05 light, 7.48 dark) and sits 18 and 33 (OKLab x 100) from the two grays.
    // Same interpolation as red-blue.
    const BLUE_ORANGE_PROPOSED = ["#1f5b99", "#2f74c0", "#5a93dc", "#a7b4c4", "#bfae5a", "#d0973f", "#c77a22", "#ad5a0f", "#8f3f06"];
    const fcColorBO = (i) => {
        const u = fc[i] < 0 ? 0.5 * (1 - fc[i] / fcLo) : 0.5 + 0.5 * (fc[i] / fcHi);
        const x = u * (BLUE_ORANGE_PROPOSED.length - 1);
        const k = Math.min(BLUE_ORANGE_PROPOSED.length - 2, Math.floor(x));
        return lerpHex(BLUE_ORANGE_PROPOSED[k], BLUE_ORANGE_PROPOSED[k + 1], x - k);
    };
    emit("ppi-foldchange-bo-path", (theme) => drawEncoded(theme, { size: sizeByDeg, path: true, color: fcColorBO, title: "Colored by fold change, blue below 0 to orange above, sized by degree, shortest path TP53 to SMAD3 highlighted" }));
    emit("ppi-path-overpaint", (theme) => drawEncoded(theme, { size: sizeByDeg, overpaint: true, title: "What the rule prevents: a path's layer painting every other protein gray" }));
    // Styles list (screens/styles-list.html): Betweenness's automatic layer, the element's default
    // measurement ramp (YlOrBr, five steps, low value first), linear over 0 to the maximum; a
    // "Hub labels" layer labels the degree 17-34 step; the shortest path on top.
    const YLORBR = ["#ef7818", "#d85a09", "#b84203", "#8e3104", "#662506"]; // graphty-element YLORBR_COLORS, as shipped
    // Scale: log(1 + x / c), c the smallest nonzero value. Betweenness lives in [0, 1], where the
    // framework's log(1 + x) is linear to within 7% and paints 269 of 300 proteins the lowest
    // orange; dividing by c is the proposal in framework-changes.md.
    const bcHi = Math.max(...bc);
    const bcC = Math.min(...bc.filter((v) => v > 0));
    const bcT = (v) => Math.log1p(v / bcC) / Math.log1p(bcHi / bcC);
    const bcColor = (i) => {
        const x = bcT(bc[i]) * (YLORBR.length - 1);
        const k = Math.min(YLORBR.length - 2, Math.floor(x));
        return lerpHex(YLORBR[k], YLORBR[k + 1], x - k);
    };
    // Highest degree first, so collision culling drops the lower-degree label (README, "The drawings").
    const hubIds = [...deg.keys()].filter((i) => binOf(deg[i]) === 4).sort((a, b) => deg[b] - deg[a]);
    emit("ppi-betweenness", (theme) => drawEncoded(theme, { size: sizeByDeg, color: bcColor, labels: hubIds, title: "Colored by betweenness, orange to brown, sized by degree, hubs labeled" }));
    emit("ppi-stacked", (theme) => drawEncoded(theme, { size: sizeByDeg, color: bcColor, path: true, labels: [...new Set([...hubIds, ...pathIds])], title: "Betweenness color, degree size and hub labels, with the shortest path TP53 to SMAD3 highlighted on top" }));
    emit("ppi-stacked-tp53", (theme) => drawEncoded(theme, { size: sizeByDeg, color: bcColor, path: true, labels: [...new Set([...hubIds, ...pathIds])], marks: { selected: tp53 }, title: "The same four layers, TP53 selected" }));
    // Hovering the Hub labels row: the hover mark (ring 5) on the 12 proteins that layer paints.
    emit("ppi-stacked-hubhover", (theme) => drawEncoded(theme, { size: sizeByDeg, color: bcColor, path: true, labels: [...new Set([...hubIds, ...pathIds])], marks: { hover: hubIds }, title: "The four layers; the Hub labels row hovered, so its 12 proteins carry the hover mark" }));
    // The two run layers switched off: Base style's gray, degree size and hub labels; TP53 selected.
    emit("ppi-base-hubs-tp53", (theme) => drawEncoded(theme, { size: sizeByDeg, color: () => GRAY, labels: hubIds, marks: { selected: tp53 }, title: "The two run layers off: gray, sized by degree, hubs labeled, TP53 selected" }));
    // Module color dragged above Betweenness color: module colors win, the path and labels unchanged.
    const modColorOf = (i) => (mod[i] === "Unassigned" ? OTHER : OKABE_ITO[moduleNames.indexOf(mod[i]) % 8]);
    emit("ppi-stacked-modules", (theme) => drawEncoded(theme, { size: sizeByDeg, color: modColorOf, path: true, labels: [...new Set([...hubIds, ...pathIds])], title: "Module color above Betweenness color: colored by module, sized by degree, hubs labeled, shortest path TP53 to SMAD3 highlighted" }));
    // Stimulus for the style-stack placement study (study/style-stack-arm-*.html): a Hub color layer
    // (vermillion, on the 12 hubs) above Betweenness color, the path on top.
    const stimColor = (i) => (hubIds.includes(i) ? "#D55E00" : bcColor(i));
    emit("ppi-stimulus", (theme) => drawEncoded(theme, { size: sizeByDeg, color: stimColor, path: true, labels: [...new Set([...hubIds, ...pathIds])], title: "Hubs in vermillion over betweenness colors, sized by degree, shortest path TP53 to SMAD3" }));
    emit("ppi-stimulus-tp53", (theme) => drawEncoded(theme, { size: sizeByDeg, color: stimColor, path: true, labels: [...new Set([...hubIds, ...pathIds])], marks: { selected: tp53 }, title: "The same, TP53 selected" }));
    // Two more shortest paths, for the Sets and paths list of the placement study (BFS, first found).
    const bfsPath = (a, b) => {
        const pv = new Int32Array(n).fill(-1);
        pv[a] = a;
        for (let q = [a]; q.length && pv[b] < 0; ) { const v = q.shift(); for (const w of adj[v]) if (pv[w] < 0) (pv[w] = v), q.push(w); }
        const out = [b];
        while (out[0] !== a) out.unshift(pv[out[0]]);
        return out.map((i) => names[i]);
    };
    const morePaths = [["MAPK1", "SMAD3"], ["CDK1", "AKT1"]].map(([a, b]) => ({ from: a, to: b, nodes: bfsPath(names.indexOf(a), names.indexOf(b)) }));
    const bcHist = Array(12).fill(0);
    const bcHistT = Array(12).fill(0);
    for (const v of bc) bcHist[Math.min(11, Math.floor((v / bcHi) * 12))]++;
    for (const v of bc) bcHistT[Math.min(11, Math.floor(bcT(v) * 12))]++;
    const bcTicks = [0.001, 0.01, 0.1].map((v) => ({ value: v, at: round(bcT(v)) }));
    const hist = Array(12).fill(0);
    for (const v of fc) hist[Math.min(11, Math.floor(((v - fcLo) / (fcHi - fcLo)) * 12))]++;
    Object.assign(datasets.ppi.drawings, {
        foldChange: "canvas/ppi-foldchange-{theme}.svg",
        foldChangeDegree: "canvas/ppi-foldchange-degree-{theme}.svg",
        foldChangePath: "canvas/ppi-foldchange-path-{theme}.svg",
        pathOverpaint: "canvas/ppi-path-overpaint-{theme}.svg",
        betweenness: "canvas/ppi-betweenness-{theme}.svg",
        stacked: "canvas/ppi-stacked-{theme}.svg",
        stackedTp53: "canvas/ppi-stacked-tp53-{theme}.svg",
    });
    datasets.ppi.encodings = {
        note: "for flows/color-by-value.html: fold change on red-blue, linear, diverging at 0; size by degree, square root, 5 bins cut on log(1 + x); the path is a BFS shortest path",
        foldChange: {
            domain: [fcLo, fcHi],
            midpoint: 0,
            below0: fc.filter((v) => v < 0).length,
            above0: fc.filter((v) => v > 0).length,
            atZero: fc.filter((v) => v === 0).length,
            noValue: 0,
            histogram12: hist,
            palette: RED_BLUE,
            proposedPalette: { name: "Blue to orange", below0: "blue", above0: "orange", colors: BLUE_ORANGE_PROPOSED, drawing: "canvas/ppi-foldchange-bo-path-{theme}.svg" },
            extremes: { lowest: names[fc.indexOf(fcLo)], highest: names[fc.indexOf(fcHi)] },
        },
        sizeByDegree: { bins: binLo.map((lo, k) => ({ from: lo, to: binHi[k], radius: BIN_R[k], count: deg.filter((d) => binOf(d) === k).length })) },
        betweenness: {
            note: "for screens/styles-list.html: Betweenness's automatic layer on YlOrBr over log(1 + x / c), c the smallest nonzero value (the proposed scale for a heavy tail inside [0, 1])",
            domain: [0, round(bcHi)],
            zeros: bc.filter((v) => v === 0).length,
            median: round([...bc].sort((a, b) => a - b).slice(149, 151).reduce((a, b) => a + b) / 2, 4),
            histogram12: bcHist,
            linearFifths: [0, 1, 2, 3, 4].map((k) => bc.filter((v) => Math.min(4, Math.floor((v / bcHi) * 5)) === k).length),
            scale: "log(1 + x / c)",
            c: Number(bcC.toPrecision(2)),
            histogram12Transformed: bcHistT,
            ticks: bcTicks,
            top: [...bc.keys()].sort((a, b) => bc[b] - bc[a]).slice(0, 5).map((i) => ({ id: names[i], betweenness: round(bc[i]) })),
            palette: YLORBR,
            hubLabels: { rule: "degree 17 to 34", count: hubIds.length, ids: hubIds.map((i) => names[i]) },
            morePaths,
            contrast: Object.fromEntries(["light", "dark"].map((t) => [t, YLORBR.map((c) => round(contrast(c, THEMES[t].canvas), 2))])),
        },
        path: {
            from: "TP53",
            to: "SMAD3",
            hops: pathIds.length - 1,
            nodes: pathIds.map((i) => ({ id: names[i], module: mod[i], degree: deg[i], log2FoldChange: fc[i], ...pct(pos[i]) })),
        },
    };

    // Closeness (Wasserman-Faust corrected, the element's default on a disconnected graph) and
    // harmonic centrality, unweighted, for screens/results-panel.html. No rand(), so nothing moves.
    {
        const N = adj.length;
        const cl = [], raw = [], hc = [], reachOf = [];
        for (let s = 0; s < N; s++) {
            const d = new Int32Array(N).fill(-1);
            d[s] = 0;
            const q = [s];
            for (let h = 0; h < q.length; h++) for (const w of adj[q[h]]) if (d[w] < 0) (d[w] = d[q[h]] + 1), q.push(w);
            let sum = 0, inv = 0;
            for (let v = 0; v < N; v++) if (d[v] > 0) (sum += d[v]), (inv += 1 / d[v]);
            const r = q.length - 1;
            reachOf.push(r);
            raw.push(r ? r / sum : 0);
            cl.push(r ? (r / sum) * (r / (N - 1)) : 0);
            hc.push(inv / (N - 1));
        }
        const hi = Math.max(...cl);
        const h12 = new Array(12).fill(0);
        for (const v of cl) h12[Math.min(11, Math.floor((v / hi) * 12))]++;
        const sorted = [...cl].sort((a, b) => a - b);
        const top = (arr) => [...arr.keys()].sort((a, b) => arr[b] - arr[a]).slice(0, 5).map((i) => ({ id: names[i], value: round(arr[i], 4) }));
        const mainReach = Math.max(...reachOf);
        datasets.ppi.closeness = {
            note: "unweighted; WF = (r / sum of distances) * (r / (N - 1)), r the other nodes a node reaches. On this graph the correction scales the main component by r / (N - 1) and changes no ranking; isolated proteins score 0 either way",
            variant: "Wasserman-Faust corrected",
            mainComponentReach: mainReach,
            others: N - 1,
            factor: round(mainReach / (N - 1), 4),
            isolated: [...reachOf.keys()].filter((i) => reachOf[i] === 0).map((i) => names[i]),
            domain: [0, round(hi, 4)],
            median: round((sorted[149] + sorted[150]) / 2, 4),
            zeros: cl.filter((v) => v === 0).length,
            histogram12: h12,
            top: top(cl),
            topUncorrected: top(raw),
            harmonicTop: top(hc),
            tp53: { closeness: round(cl[names.indexOf("TP53")], 4), harmonic: round(hc[names.indexOf("TP53")], 4) },
            palette: YLORBR,
            scale: "linear, 0 to the highest",
        };
        // Closeness's automatic layer: the element's default measurement ramp, linear over 0 to the highest.
        const clColor = (i) => {
            const x = (cl[i] / hi) * (YLORBR.length - 1);
            const k = Math.min(YLORBR.length - 2, Math.floor(x));
            return lerpHex(YLORBR[k], YLORBR[k + 1], x - k);
        };
        emit("ppi-closeness", (theme) => drawEncoded(theme, { size: sizeByDeg, color: clColor, labels: hubIds, title: "Colored by closeness (Wasserman-Faust corrected), orange to brown, sized by degree, hubs labeled" }));
        datasets.ppi.drawings.closeness = "canvas/ppi-closeness-{theme}.svg";
    }

    // Tom's expression table, for storyboards/recipe-travels.html: a lab member's qPCR hits (96
    // rows, one plate) joined to this network by gene symbol. Its own seed, so no dataset moves.
    // The network file already carries a log2FoldChange from an earlier screen (the column the
    // color-by-value flow uses); Tom's table brings this week's values as log2FC, so the Apply
    // dialog meets two candidate columns. The 12 rows that do not match are realistic failures:
    // spreadsheet dates, a mouse-case symbol, an official symbol where the network holds an alias
    // (TP53BP1 / 53BP1), a former symbol (H2AFX / H2AX), reference genes and genes this
    // 300-protein network does not hold. The hint is only what the element can tell from the value;
    // `behind` is what a biologist would know and the element cannot, for the study's watch list.
    {
        const r2 = mulberry32(96);
        const avoid = new Set(["MDM2", "H2AX", "53BP1"]);
        const pool = names.map((_, i) => i).filter((i) => !/^C\d+orf/.test(names[i]) && !avoid.has(names[i]));
        for (let k = pool.length - 1; k > 0; k--) {
            const j = Math.floor(r2() * (k + 1));
            [pool[k], pool[j]] = [pool[j], pool[k]];
        }
        const matched = pool.slice(0, 84).sort((a, b) => names[a].localeCompare(names[b]));
        const DATE = "looks like a date; a spreadsheet may have converted an id";
        const NONE = "no node with this id";
        const unmatched = [
            ["7-Sep", DATE, "Excel's reading of SEPT7 (now SEPTIN7), which this network does not hold either"],
            ["2-Mar", DATE, "Excel's reading of MARCH2 (now MARCHF2), not in this network"],
            ["Mdm2", "differs only in letter case from MDM2", "mouse-style case; could be a typo or a mouse gene, which is the lab's call"],
            ["TP53BP1", NONE, "the official symbol; the network names the same protein by its alias 53BP1"],
            ["H2AFX", NONE, "the former symbol of H2AX, which the network holds"],
            ["GAPDH", NONE, "reference gene, not in this network"],
            ["ACTB", NONE, "reference gene, not in this network"],
            ["VEGFA", NONE, "not in this network"],
            ["HIF1A", NONE, "not in this network"],
            ["IL6", NONE, "not in this network"],
            ["CXCL8", NONE, "not in this network"],
            ["SERPINE1", NONE, "not in this network"],
        ].map(([symbol, hint, behind]) => ({ symbol, hint, behind, log2FC: /^(GAPDH|ACTB)$/.test(symbol) ? round((r2() - 0.5) * 0.2, 2) : round((r2() + r2() - 1) * 2.4, 2) }));
        // This week's fold changes for the matched genes: Tom's own numbers, not the network's.
        const tfc = new Map(matched.map((i) => [i, round((r2() + r2() + r2() - 1.5) * 2.2, 2)]));
        const isMatched = new Set(matched);
        const vals = matched.map((i) => tfc.get(i));
        const tLo = Math.min(...vals);
        const tHi = Math.max(...vals);
        // The recipe's ramp: the element's red-blue palette reversed, so up is red and down is blue
        // (the expression-figure convention), linear, midpoint 0.
        const tColor = (i) => {
            const v = tfc.get(i);
            const u = v < 0 ? 0.5 * (1 - v / tLo) : 0.5 + 0.5 * (v / tHi);
            const x = (1 - u) * (RED_BLUE.length - 1);
            const k = Math.min(RED_BLUE.length - 2, Math.floor(x));
            return lerpHex(RED_BLUE[k], RED_BLUE[k + 1], x - k);
        };
        // The module layer draws muted: its color half-way to the canvas, so a module hue never
        // competes with the fold-change hues on the same channel.
        const MUTE = 0.5;
        const muted = (theme, hex) => lerpHex(hex, THEMES[theme].canvas, MUTE);
        const hiEdges = edges.filter((_, k) => conf[k] >= 0.7);
        const strongest = [...matched].sort((a, b) => Math.abs(tfc.get(b)) - Math.abs(tfc.get(a))).slice(0, 12);
        const recipeLabels = isMatched.has(tp53) && !strongest.includes(tp53) ? [...strongest, tp53] : strongest;
        emit("ppi-recipe-applied", (theme) =>
            drawGraph({
                theme,
                pos,
                edges: hiEdges,
                color: (i) => (isMatched.has(i) ? tColor(i) : muted(theme, color(i))),
                size: (i) => (isMatched.has(i) ? 5.5 : 4),
                labels: recipeLabels,
                edgeOpacity: 0.3,
                title: "Protein interactions filtered to high-confidence edges; 84 matched genes colored by this week's log2 fold change, red up and blue down; the other 216 in muted module colors",
            }).replace(/(<circle [^>]*fill="#[0-9a-fA-F]{6}")\/>/g, `$1 stroke="${fillEdgeOf[theme]}" stroke-width="1"/>`),
        );
        datasets.ppi.drawings.recipeApplied = "canvas/ppi-recipe-applied-{theme}.svg";
        // screens/styles-list.html, the Style stack's "+" menu: the same qPCR colors over the full
        // module colors on every edge, nothing muted; then with the reader's added "Mute categories
        // under this scale" layer, which draws the 216 unnamed proteins' module colors as grays
        // half-way to the canvas (no hue, so none reads as up or down).
        const grayOf = (hex) => { const y = Math.round(0.299 * parseInt(hex.slice(1, 3), 16) + 0.587 * parseInt(hex.slice(3, 5), 16) + 0.114 * parseInt(hex.slice(5, 7), 16)); return "#" + y.toString(16).padStart(2, "0").repeat(3); };
        const qpcrOver = (theme, rest, title) => drawGraph({ theme, pos, edges, color: (i) => (isMatched.has(i) ? tColor(i) : rest(i)), size: (i) => (isMatched.has(i) ? 5.5 : 4), labels: recipeLabels, title })
            .replace(/(<circle [^>]*fill="#[0-9a-fA-F]{6}")\/>/g, `$1 stroke="${fillEdgeOf[theme]}" stroke-width="1"/>`);
        emit("ppi-qpcr-modules", (theme) => qpcrOver(theme, color, "84 proteins colored by this week's log2 fold change, red up and blue down, over module colors on the other 216"));
        emit("ppi-qpcr-grays", (theme) => qpcrOver(theme, (i) => lerpHex(grayOf(color(i)), THEMES[theme].canvas, MUTE), "84 proteins colored by this week's log2 fold change, red up and blue down; the other 216 in light grays"));
        // Maren's own project: the network's log2FoldChange on the recipe's red-up ramp, filtered.
        const labColor = (i) => {
            const u = fc[i] < 0 ? 0.5 * (1 - fc[i] / fcLo) : 0.5 + 0.5 * (fc[i] / fcHi);
            const x = (1 - u) * (RED_BLUE.length - 1);
            const k = Math.min(RED_BLUE.length - 2, Math.floor(x));
            return lerpHex(RED_BLUE[k], RED_BLUE[k + 1], x - k);
        };
        emit("ppi-lab-overlay", (theme) =>
            drawGraph({ theme, pos, edges: hiEdges, color: labColor, size: () => 4, labels: budget.slice(0, 12), edgeOpacity: 0.3, title: "The lab's project: 300 proteins colored by log2FoldChange, red up and blue down, high-confidence edges only" }).replace(/(<circle [^>]*fill="#[0-9a-fA-F]{6}")\/>/g, `$1 stroke="${fillEdgeOf[theme]}" stroke-width="1"/>`),
        );
        const hist = (v) => [v.filter((x) => x > 0).length, v.filter((x) => x < 0).length];
        const [up, down] = hist(vals);
        datasets.ppi.expression = {
            note: "for storyboards/recipe-travels.html: this week's qPCR hits joined to the network by gene symbol; log2FC is Tom's own numbers. The network's own log2FoldChange (300 values, an earlier screen) is the second candidate column the Apply dialog must ask about",
            file: "qpcr-hits-2026-09.csv",
            columns: ["symbol", "log2FC", "padj"],
            rows: matched.length + unmatched.length,
            matched: matched.length,
            unmatchedCount: unmatched.length,
            unmatched,
            matchedSymbols: matched.map((i) => names[i]),
            matchedByModule: matched.reduce((m, i) => ((m[mod[i]] = (m[mod[i]] ?? 0) + 1), m), {}),
            up,
            down,
            range: [tLo, tHi],
            allRows: { up: up + unmatched.filter((u) => u.log2FC > 0).length, down: down + unmatched.filter((u) => u.log2FC < 0).length, range: [Math.min(tLo, ...unmatched.map((u) => u.log2FC)), Math.max(tHi, ...unmatched.map((u) => u.log2FC))] },
            networkColumn: { name: "log2FoldChange", values: n, range: [fcLo, fcHi], up: fc.filter((v) => v > 0).length, down: fc.filter((v) => v < 0).length, onMatched: { up: matched.filter((i) => fc[i] > 0).length, down: matched.filter((i) => fc[i] < 0).length } },
            agreeInSign: matched.filter((i) => Math.sign(fc[i]) === Math.sign(tfc.get(i))).length,
            ramp: "graphty-element RED_BLUE reversed: red up, blue down; linear; midpoint 0",
            moduleMute: { mix: MUTE, note: "each module color mixed half-way to the canvas color", light: Object.fromEntries(Object.entries(datasets.ppi.moduleColors).map(([m, c]) => [m, muted("light", c)])), dark: Object.fromEntries(Object.entries(datasets.ppi.moduleColors).map(([m, c]) => [m, muted("dark", c)])) },
            strongest: recipeLabels.map((i) => ({ symbol: names[i], log2FC: tfc.get(i), networkLog2FoldChange: fc[i], module: mod[i], color: tColor(i), ...pct(pos[i]) })),
            top: [...matched].sort((a, b) => tfc.get(b) - tfc.get(a)).slice(0, 6).map((i) => ({ symbol: names[i], log2FC: tfc.get(i), module: mod[i], color: tColor(i) })),
            highConfidence: { threshold: 0.7, edgesKept: hiEdges.length, edgesHidden: edges.length - hiEdges.length, ...(({ components, isolated }) => ({ components, isolated }))(summary(adjacency(n, hiEdges), hiEdges.length)) },
            labOverlayDrawing: "canvas/ppi-lab-overlay-{theme}.svg",
            olderExport: { file: "ppi-core-300-2024.graphml", nodes: n, edges: edges.length, attributes: "protein names only: no module, no confidence, no fold change", matched: matched.length, note: "the branch where the recipe's module and confidence parts have nothing to read" },
            drawing: "canvas/ppi-recipe-applied-{theme}.svg",
        };
    }

    // The same network as a per-evidence export, for screens/load-step.html: one row per pair and
    // evidence source (STRING's channels), so a pair reported by several sources is a set of
    // parallel edges; the pair's confidence is its best source's, so merging by max gives back
    // this network exactly. Some coexpression scores are "NA", which makes the column text.
    // Its own seed, so no dataset moves.
    {
        const r3 = mulberry32(2003);
        const channels = ["experiments", "databases", "coexpression", "textmining"];
        const rows = [];
        edges.forEach(([a, b], k) => {
            const count = 1 + (r3() < 0.55 ? 1 : 0) + (r3() < 0.25 ? 1 : 0);
            (arraysOf.ppi.rowsPerEdge ??= []).push(count);
            const pool = [...channels];
            for (let j = pool.length - 1; j > 0; j--) {
                const t = Math.floor(r3() * (j + 1));
                [pool[j], pool[t]] = [pool[t], pool[j]];
            }
            pool.slice(0, count).forEach((source, s) => {
                let score = s === 0 ? conf[k].toFixed(3) : (conf[k] * (0.45 + 0.5 * r3())).toFixed(3);
                if (s > 0 && source === "coexpression" && r3() < 0.6) score = "NA";
                rows.push({ protein_a: names[a], protein_b: names[b], source, confidence: score });
            });
        });
        const na = rows.filter((r) => r.confidence === "NA");
        datasets.ppi.evidence = {
            note: "for screens/load-step.html: the protein network exported one row per pair and evidence source; merging parallel edges by the max of confidence gives the 1,262-edge network",
            file: "ppi-core-300-evidence.tsv",
            format: "TSV",
            columns: ["protein_a", "protein_b", "source", "confidence"],
            rows: rows.length,
            pairs: edges.length,
            extraParallelEdges: rows.length - edges.length,
            naCount: na.length,
            scored: rows.length - na.length, // rows left when the NA rows are dropped
            bySource: channels.reduce((m, c) => ((m[c] = rows.filter((r) => r.source === c).length), m), {}),
            firstRows: rows.slice(0, 8),
            naRows: na.slice(0, 6).map((r) => ({ ...r, line: rows.indexOf(r) + 2 })),
        };
    }
}

// 4. Transaction network (3,000 accounts) ---------------------------------------------------
{
    const n = 3000;
    const kinds = [];
    for (let i = 0; i < n; i++) kinds.push(i < 60 ? "merchant" : i < 390 ? "business" : "personal");
    const countries = ["US", "US", "US", "GB", "DE", "FR", "NL", "IN", "BR", "NG", "PH", "MX"];
    const country = kinds.map((_, i) => (i < 60 ? countries[i % countries.length] : pick(countries)));
    const ids = kinds.map((_, i) => `ACC-${String(100000 + Math.floor(rand() * 899999)).padStart(6, "0")}`);
    const ring = Array.from({ length: 14 }, (_, k) => 2980 - k * 37); // a mule ring among personal accounts
    const ACCOUNTS_FILE = "accounts-2026-03.csv"; // the node columns: kind, country, riskScore, flagged and the alert
    const key = new Set();
    const edges = [];
    const amount = [];
    const add = (a, b, amt) => {
        const k = `${a}-${b}`;
        if (a === b || key.has(k)) return;
        key.add(k);
        edges.push([a, b]);
        amount.push(amt);
    };
    const merchantWeight = Array.from({ length: 60 }, (_, m) => 1 / (m + 1) ** 0.9);
    const wsum = merchantWeight.reduce((a, b) => a + b, 0);
    const pickMerchant = () => {
        let r = rand() * wsum;
        for (let m = 0; m < 60; m++) if ((r -= merchantWeight[m]) <= 0) return m;
        return 59;
    };
    for (let i = 390; i < n; i++) {
        const k = 1 + Math.floor(rand() * 3);
        for (let j = 0; j < k; j++) {
            // Most card spend stays in the account's own country; a fifth goes to global merchants.
            let m = pickMerchant();
            for (let tries = 0; tries < 30 && rand() > 0.2 && country[m] !== country[i]; tries++) m = pickMerchant();
            add(i, m, round(5 + rand() ** 2 * 400, 2));
        }
        if (rand() < 0.35) {
            let p = 390 + Math.floor(rand() * (n - 390));
            for (let tries = 0; tries < 30 && country[p] !== country[i]; tries++) p = 390 + Math.floor(rand() * (n - 390));
            add(i, p, round(10 + rand() * 250, 2));
        }
    }
    for (let b = 60; b < 390; b++) {
        const staff = 3 + Math.floor(rand() * 12);
        for (let j = 0; j < staff; j++) add(b, 390 + Math.floor(rand() * (n - 390)), round(1800 + rand() * 4200, 2));
        add(b, pickMerchant(), round(200 + rand() * 9000, 2));
    }
    for (let a = 0; a < ring.length; a++) {
        add(ring[a], ring[(a + 1) % ring.length], round(9000 + rand() * 900, 2));
        add(ring[a], ring[(a + 5) % ring.length], round(9000 + rand() * 900, 2));
    }
    for (const r of ring) add(r, 57, round(9400 + rand() * 500, 2));
    const adj = adjacency(n, edges);
    const deg = adj.map((l) => l.length);
    const pr = pagerank(adj);
    const risk = kinds.map((_, i) => (ring.includes(i) ? 88 + Math.floor(rand() * 11) : Math.floor(rand() ** 3 * 80)));
    const pos = layout(n, edges, { strength: -14, distance: 14, ticks: 300, group: country, pull: 0.12 });
    const flagged = ring;
    emit("transactions-density", (theme) =>
        hexDensity({ theme, pos, marked: [], size: () => 4, color: () => GRAY, title: "3,000 accounts shown as density" }),
    );
    emit("transactions-flagged", (theme) =>
        hexDensity({ theme, pos, marked: flagged, size: () => 5, color: () => OKABE_ITO[4], title: "3,000 accounts as density, 14 flagged accounts selected" }),
    );
    const rows = ids.map((id, i) => ({ id, kind: kinds[i], country: country[i], degree: deg[i], pagerank: round(pr[i], 6), riskScore: risk[i], flagged: ring.includes(i) }));
    // The monitoring system's alert on each flagged account, as columns of the accounts file: every
    // ring member sent 3 transfers of 9,000 to 9,999 USD (two to the ring, one to merchant 57), which
    // is the structuring rule's trigger. The time is the overnight batch that raised it. No rand() here.
    const ALERT_RULE = "Structuring: 3 or more transfers of 9,000 to 9,999 USD out in 30 days";
    const alertOf = (k) => ({ alertRule: ALERT_RULE, alertTime: `2026-03-${String(9 + ((k * 3) % 19)).padStart(2, "0")}T02:${String(10 + k).padStart(2, "0")}:00Z` });
    const kindCounts = kinds.reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {});
    const total = amount.reduce((a, b) => a + b, 0);
    arraysOf.transactions = { deg };
    datasets.transactions = {
        title: "Card and transfer transactions, March 2026",
        graphName: "Transfers", // the graph's name in the Graphs list and in "About the graph {graph name}"
        file: "transfers-2026-03.csv",
        source: "generated for the mocks: 3,000 accounts, payments to merchants, payroll, person-to-person transfers and one 14-account mule ring",
        nodes: n,
        edges: edges.length,
        directed: true,
        attributes: [
            { name: "id (account)", kind: "text" },
            { name: "kind", kind: "category", values: kindCounts, source: ACCOUNTS_FILE },
            { name: "country", kind: "category", source: ACCOUNTS_FILE },
            { name: "riskScore", kind: "integer", range: [0, 98], source: ACCOUNTS_FILE, sourceNote: `from ${ACCOUNTS_FILE}, not computed by graphty: the bank's own score, 0 to 100` },
            { name: "flagged", kind: "boolean", values: { true: ring.length, false: n - ring.length }, source: ACCOUNTS_FILE },
            { name: "alertRule", kind: "text", values: { [ALERT_RULE]: ring.length }, source: ACCOUNTS_FILE, note: "empty on accounts with no alert" },
            { name: "alertTime", kind: "datetime", range: [ring.map((_, k) => alertOf(k).alertTime).sort()[0], ring.map((_, k) => alertOf(k).alertTime).sort().at(-1)], source: ACCOUNTS_FILE, note: "empty on accounts with no alert" },
            { name: "amount (edge)", kind: "currency USD", total: round(total, 2), source: "transfers-2026-03.csv" },
            { name: "timestamp (edge)", kind: "datetime", range: ["2026-03-01T00:00:00Z", "2026-03-31T23:59:59Z"], source: "transfers-2026-03.csv" },
        ],
        accountsFile: ACCOUNTS_FILE,
        stats: { ...summary(adj, edges.length, true), selfLoops: 0, parallelEdges: 0, reciprocity: round(edges.filter(([a, b]) => key.has(`${b}-${a}`)).length / edges.length, 3) }, // add() drops self-loops and repeated pairs
        flaggedAccounts: flagged.map((i, k) => ({ ...rows[i], ...alertOf(k) })),
        topByDegree: [...rows].sort((a, b) => b.degree - a.degree).slice(0, 10),
        rows: rows.slice(380, 420),
        anchors: {
            flaggedCenter: pct([flagged.reduce((a, i) => a + pos[i][0], 0) / flagged.length, flagged.reduce((a, i) => a + pos[i][1], 0) / flagged.length]),
            flagged: flagged.map((i) => ({ id: ids[i], ...pct(pos[i]) })),
        },
        drawings: { density: "canvas/transactions-density-{theme}.svg", flagged: "canvas/transactions-flagged-{theme}.svg" },
    };
    // Every account drawn as a gray dot with its transfers, and the two-hop neighborhood of the
    // busiest merchant, for screens/inspector.html (a selection past the cap). No rand() here.
    {
        const seed = deg.indexOf(Math.max(...deg));
        const hop = new Int32Array(n).fill(-1);
        hop[seed] = 0;
        for (let q = [seed], h = 0; h < q.length; h++) for (const w of adj[q[h]]) if (hop[w] < 0 && hop[q[h]] < 2) (hop[w] = hop[q[h]] + 1), q.push(w);
        const S = [...hop.keys()].filter((i) => hop[i] >= 0);
        const inS = new Set(S);
        const induced = edges.filter(([a, b]) => inS.has(a) && inS.has(b)).length;
        // Convex hull (monotone chain) of the selected accounts, in drawing pixels.
        const P = S.map((i) => pos[i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const half = (pts) => pts.reduce((h, p) => { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); return h; }, []);
        const lower = half(P);
        const upper = half([...P].reverse());
        const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)].map(([x, y]) => [f1(x), f1(y)]);
        drawGraph.labelOf = (i) => ids[i];
        emit("transactions-plain", (theme) =>
            drawGraph({ theme, pos, edges, color: () => GRAY, size: () => 2.5, labels: [seed], edgeOpacity: 0.12, edgeWidth: 0.6, title: "3,000 accounts and 9,113 transfers, unstyled" }),
        );
        datasets.transactions.drawings.plain = "canvas/transactions-plain-{theme}.svg";
        const byKind = S.reduce((m, i) => ((m[kinds[i]] = (m[kinds[i]] ?? 0) + 1), m), {});
        datasets.transactions.inspector = {
            note: "for screens/inspector.html: the busiest merchant's two-hop neighborhood, direction ignored, and the transfers among those accounts",
            seed: { id: ids[seed], kind: kinds[seed], country: country[seed], degree: deg[seed], in: edges.filter(([, b]) => b === seed).length, out: edges.filter(([a]) => a === seed).length, riskScore: risk[seed], pagerank: round(pr[seed], 6), pagerankRank: 1 + pr.filter((v) => v > pr[seed]).length, flagged: ring.includes(seed) },
            twoHop: {
                nodes: S.length,
                edges: induced,
                elements: S.length + induced,
                byKind: { merchant: byKind.merchant ?? 0, business: byKind.business ?? 0, personal: byKind.personal ?? 0 },
                ringInside: ring.filter((i) => inS.has(i)).length,
                ring: ring.length,
                hull,
                seedAnchor: pct(pos[seed]),
                topRows: [...S].sort((a, b) => deg[b] - deg[a] || ids[a].localeCompare(ids[b])).slice(0, 12).map((i) => rows[i]),
            },
        };
    }
    // The same graph with the merchants filtered out, and what hiding them stops drawing, for
    // flows/narrow-hide-paint.html. No rand() here, so nothing else moves.
    {
        const keep = kinds.map((k) => k !== "merchant");
        const idx = new Int32Array(n).fill(-1);
        let m = 0;
        for (let i = 0; i < n; i++) if (keep[i]) idx[i] = m++;
        const sub = edges.filter(([a, b]) => keep[a] && keep[b]).map(([a, b]) => [idx[a], idx[b]]);
        datasets.transactions.withoutMerchants = {
            merchants: n - m,
            transfersWithAMerchantEnd: edges.length - sub.length,
            nodes: m,
            edges: sub.length,
            stats: summary(adjacency(m, sub), sub.length, true),
        };
    }
    // The file's first rows, for the load step's sample (screens/load-step.html). Timestamps come
    // from their own seed, so no dataset moves.
    {
        const r3 = mulberry32(303);
        const iso = (t) => new Date(Date.UTC(2026, 2, 1) + Math.floor(t * 31 * 86400) * 1000).toISOString().replace(".000", "");
        datasets.transactions.columns = ["from_account", "to_account", "amount", "timestamp"];
        datasets.transactions.firstRows = edges.slice(0, 6).map(([a, b], k) => ({ from_account: ids[a], to_account: ids[b], amount: amount[k].toFixed(2), timestamp: iso(r3()) }));
    }

    // 4a. Sets and shortest path, for flows/sets-and-paths.html and screens/sets-and-paths.html.
    // Who paid the ring's merchant, the riskScore band, their intersection, and the shortest
    // directed chain of transfers from an ordinary business into the ring, read three ways. No
    // rand() here, so nothing else moves.
    {
        const amt = new Map(edges.map(([a, b], k) => [`${a}-${b}`, amount[k]]));
        const outN = Array.from({ length: n }, () => []);
        for (const [a, b] of edges) outN[a].push(b);
        const row = (i) => ({ id: ids[i], kind: kinds[i], country: country[i], riskScore: risk[i], flagged: ring.includes(i) });
        const merchant = 57;
        const payers = [...new Set(edges.filter(([, b]) => b === merchant).map(([a]) => a))].sort((a, b) => risk[b] - risk[a]);
        const band = [70, 98];
        const highRisk = kinds.map((_, i) => i).filter((i) => risk[i] >= band[0] && risk[i] <= band[1]);
        const hrSet = new Set(highRisk);
        const inter = payers.filter((i) => hrSet.has(i));
        const union = [...new Set([...payers, ...highRisk])];
        const newLeads = inter.filter((i) => !ring.includes(i));
        const filterMin = 20;
        const keptByFilter = risk.filter((r) => r >= filterMin).length;
        // The path: the ring's highest-risk account, reached from the ordinary business with the
        // most equally short directed routes of 3 hops.
        const to = [...ring].sort((a, b) => risk[b] - risk[a] || a - b)[0];
        const bfs = (s, nb) => {
            const dist = new Int32Array(n).fill(-1);
            const count = new Float64Array(n);
            dist[s] = 0;
            count[s] = 1;
            const q = [s];
            for (let qi = 0; qi < q.length; qi++)
                for (const w of nb[q[qi]]) {
                    if (dist[w] < 0) {
                        dist[w] = dist[q[qi]] + 1;
                        q.push(w);
                    }
                    if (dist[w] === dist[q[qi]] + 1) count[w] += count[q[qi]];
                }
            return { dist, count };
        };
        let from = -1;
        let best = null;
        for (let b = 60; b < 390; b++) {
            if (risk[b] >= filterMin) continue;
            const r = bfs(b, outN);
            if (r.dist[to] !== 3) continue;
            if (!best || r.count[to] > best.count[to]) (from = b), (best = r);
        }
        // Every shortest route, in id order of the second account (the order a stable tie-break would give).
        const routes = [];
        const walk = (p) => {
            const v = p[p.length - 1];
            if (v === to) return routes.push([...p]);
            for (const w of outN[v]) if (best.dist[w] === best.dist[v] + 1 && best.dist[w] <= 3) walk([...p, w]);
        };
        walk([from]);
        const bfsTo = bfs(to, outN);
        const inN = Array.from({ length: n }, () => []);
        for (const [a, b] of edges) inN[b].push(a);
        const undirected = bfs(to, adj);
        const dijkstra = (cost) => {
            const d = new Float64Array(n).fill(Infinity);
            const prev = new Int32Array(n).fill(-1);
            const done = new Uint8Array(n);
            d[from] = 0;
            for (;;) {
                let u = -1;
                for (let i = 0; i < n; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
                if (u < 0 || u === to) break;
                done[u] = 1;
                for (const w of outN[u]) {
                    const c = cost(amt.get(`${u}-${w}`));
                    if (d[u] + c < d[w]) (d[w] = d[u] + c), (prev[w] = u);
                }
            }
            const p = [to];
            while (p[0] !== from) p.unshift(prev[p[0]]);
            return { route: p.map((i) => ids[i]), length: d[to], p };
        };
        // Each hop's timestamp (the path's table rows show it), from its own seed so no dataset
        // moves: a route's transfers run forward in time, one to three days apart, as a mule
        // chain's do; a transfer shared by two routes keeps one timestamp.
        const hopTime = new Map();
        const rT = mulberry32(404);
        const hopIso = (s) => new Date(s * 1000).toISOString().replace(".000", "");
        const hopsOf = (p) => {
            let t = Date.UTC(2026, 2, 3) / 1000 + Math.floor(rT() * 5 * 86400);
            return p.slice(1).map((v, k) => {
                const key = `${p[k]}-${v}`;
                if (!hopTime.has(key)) hopTime.set(key, t);
                t = hopTime.get(key) + 86400 + Math.floor(rT() * 2 * 86400);
                return { source: ids[p[k]], target: ids[v], amount: amt.get(key), timestamp: hopIso(hopTime.get(key)) };
            });
        };
        const asSimilarity = dijkstra((w) => 1 / w);
        const asDistance = dijkstra((w) => w);
        const minAmount = Math.min(...amount);
        // Hull contours (canvas-drawing.md 6 and 12: no fill, the selected set in the ring-1 band,
        // a hovered set in the ring-5 hairline), by marching squares over the distance to the
        // nearest member.
        const contour = (pts, R, step = 2) => {
            const xs = pts.map((p) => p[0]);
            const ys = pts.map((p) => p[1]);
            const x0 = Math.min(...xs) - R - 2 * step, y0 = Math.min(...ys) - R - 2 * step;
            const nx = Math.ceil((Math.max(...xs) + R + 2 * step - x0) / step), ny = Math.ceil((Math.max(...ys) + R + 2 * step - y0) / step);
            const g = new Float64Array((nx + 1) * (ny + 1));
            for (let j = 0; j <= ny; j++)
                for (let i = 0; i <= nx; i++) {
                    const x = x0 + i * step, y = y0 + j * step;
                    let m = Infinity;
                    for (const [px, py] of pts) m = Math.min(m, Math.hypot(x - px, y - py));
                    g[j * (nx + 1) + i] = R - m;
                }
            const v = (i, j) => g[j * (nx + 1) + i];
            const lerpP = (ax, ay, av, bx, by, bv) => { const t = av / (av - bv); return [ax + (bx - ax) * t, ay + (by - ay) * t]; };
            const segs = [];
            for (let j = 0; j < ny; j++)
                for (let i = 0; i < nx; i++) {
                    const X = x0 + i * step, Y = y0 + j * step;
                    const c = [[X, Y, v(i, j)], [X + step, Y, v(i + 1, j)], [X + step, Y + step, v(i + 1, j + 1)], [X, Y + step, v(i, j + 1)]];
                    const cross = [];
                    for (let k = 0; k < 4; k++) {
                        const [ax, ay, av] = c[k], [bx, by, bv] = c[(k + 1) % 4];
                        if ((av > 0) !== (bv > 0)) cross.push(lerpP(ax, ay, av, bx, by, bv));
                    }
                    for (let k = 0; k + 1 < cross.length; k += 2) segs.push(`M${f1(cross[k][0])} ${f1(cross[k][1])}L${f1(cross[k + 1][0])} ${f1(cross[k + 1][1])}`);
                }
            return segs.join("");
        };
        const hullSvg = (theme, pts, kind, R) => {
            const T = THEMES[theme];
            const s = (d, w, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
            if (kind === "selected") return s(contour(pts, R), 2, T.inner) + s(contour(pts, R + 2), 2, T.outer);
            return s(contour(pts, R), 1, T.outer); // hover: one tone after a gap
        };
        const flaggedFill = (i) => (ring.includes(i) ? OKABE_ITO[4] : GRAY);
        const dots = (list, r = 4) => list.map((i) => `<circle cx="${f1(pos[i][0])}" cy="${f1(pos[i][1])}" r="${r}" fill="${flaggedFill(i)}"/>`).join("");
        const label = (theme, i, dx = 8, anchor = "start") => {
            const T = THEMES[theme];
            return `<text x="${f1(pos[i][0] + dx)}" y="${f1(pos[i][1] + 4)}" text-anchor="${anchor}" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${esc(ids[i])}</text>`;
        };
        const overDensity = (theme, title, extra) => hexDensity({ theme, pos, marked: [], size: () => 4, color: () => GRAY, title }).replace("</svg>", extra + "</svg>");
        const P = (list) => list.map((i) => pos[i]);
        // State 1: the frozen set Paid ACC-893168 selected (hull, ring-1 band); both focused rows
        // hover-marked (hull, ring-5 hairline, after a gap) over the union of their members.
        emit("transactions-sets-focus", (theme) =>
            overDensity(theme, "3,000 accounts as density; the 37 payers of ACC-893168 selected; the 164 members of the two focused sets hover-marked",
                dots(union) + hullSvg(theme, P(union), "hover", 16) + hullSvg(theme, P(payers), "selected", 9)),
        );
        // State 2: the intersection selected, its 16 members inside one hull; the two new leads labeled.
        emit("transactions-sets-intersect", (theme) =>
            overDensity(theme, "3,000 accounts as density; the 16 members of High risk and Paid ACC-893168 selected",
                dots(inter) + hullSvg(theme, P(inter), "selected", 9) + newLeads.map((i) => label(theme, i, 14)).join("")),
        );
        // States 4 and 5: the found path, zoomed to 300% around it.
        const route = routes[0];
        const cx = route.reduce((s, i) => s + pos[i][0], 0) / route.length;
        const cy = route.reduce((s, i) => s + pos[i][1], 0) / route.length;
        const zoom = 3;
        const cw = W / zoom, ch = H / zoom;
        const crop = [cx - cw / 2, cy - ch / 2, cw, ch];
        emit("transactions-path", (theme) => {
            const T = THEMES[theme];
            const k = 1 / zoom; // marks keep their screen size at 300%
            const pts = route.map((i) => pos[i]);
            const line = pts.map(([x, y], j) => `${j ? "L" : "M"}${f1(x)} ${f1(y)}`).join("");
            const st = (w, c) => `<path d="${line}" fill="none" stroke="${c}" stroke-width="${(w * k).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
            let out = st(10, T.outer) + st(6, T.inner) + st(2, GRAY);
            for (let j = 0; j + 1 < pts.length; j++) {
                const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
                const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
                const mx = (ax + bx) / 2, my = (ay + by) / 2, a = 4 * k;
                out += `<path d="M${f1(mx - ux * a - uy * a)} ${f1(my - uy * a + ux * a)}L${f1(mx + ux * a)} ${f1(my + uy * a)}L${f1(mx - ux * a + uy * a)} ${f1(my - uy * a - ux * a)}" fill="none" stroke="${T.ink}" stroke-width="${(1.5 * k).toFixed(2)}" stroke-linejoin="round"/>`;
            }
            for (const i of route) {
                const [x, y] = pos[i], r = 6 * k;
                out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r.toFixed(2)}" fill="${flaggedFill(i)}"/>`;
                out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${(r + 1 * k).toFixed(2)}" fill="none" stroke="${T.inner}" stroke-width="${(2 * k).toFixed(2)}"/>`;
                out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${(r + 3 * k).toFixed(2)}" fill="none" stroke="${T.outer}" stroke-width="${(2 * k).toFixed(2)}"/>`;
            }
            const badge = (i, text, dy) => {
                const [x, y] = pos[i];
                const w = 34 * k, h = 16 * k;
                return `<rect x="${(x - w / 2).toFixed(2)}" y="${(y + dy * k - h / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${(h / 2).toFixed(2)}" fill="${T.ink}"/><text x="${x.toFixed(2)}" y="${(y + dy * k + 3.5 * k).toFixed(2)}" text-anchor="middle" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="${(10 * k).toFixed(2)}" font-weight="600" fill="${T.canvas}">${text}</text>`;
            };
            out += badge(route[0], "start", 22) + badge(route[route.length - 1], "end", -22);
            const lab = (i, j) => {
                const [x, y] = pos[i];
                const left = j === 0 || x < (pos[route[j - 1]]?.[0] ?? x);
                return `<text x="${f1(x + (left ? -12 : 12) * k)}" y="${f1(y + 4 * k)}" text-anchor="${left ? "end" : "start"}" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="${(12 * k).toFixed(2)}" fill="${T.ink}" stroke="${T.halo}" stroke-width="${(3 * k).toFixed(2)}" stroke-linejoin="round" paint-order="stroke">${esc(ids[i])}</text>`;
            };
            out += route.map(lab).join("");
            const base = hexDensity({ theme, pos, marked: [], size: () => 4, color: () => GRAY, title: `The found path ${ids[from]} to ${ids[to]}, 3 hops, zoomed to 300%` });
            return base.replace(/viewBox="[^"]*"/, `viewBox="${crop.map(f1).join(" ")}"`).replace("</svg>", out + "</svg>");
        });
        const inCrop = (i) => ({ x: round(((pos[i][0] - crop[0]) / cw) * 100, 1), y: round(((pos[i][1] - crop[1]) / ch) * 100, 1) });
        datasets.transactions.setsAndPaths = {
            merchant: row(merchant),
            payers: { command: "Select neighbors, Follow: In", count: payers.length, flagged: payers.filter((i) => ring.includes(i)).length, kinds: payers.reduce((m, i) => ((m[kinds[i]] = (m[kinds[i]] ?? 0) + 1), m), {}), top: payers.slice(0, 3).map(row) },
            highRisk: { rule: `riskScore ${band[0]} to ${band[1]}`, count: highRisk.length },
            union: { count: union.length },
            intersection: {
                name: "High risk and Paid ACC-893168",
                count: inter.length,
                flagged: inter.filter((i) => ring.includes(i)).length,
                riskScore: [Math.min(...inter.map((i) => risk[i])), Math.max(...inter.map((i) => risk[i]))],
                members: inter.map((i) => ({ ...row(i), paid: amt.get(`${i}-${merchant}`) })),
                newLeads: newLeads.map((i) => ({ ...row(i), paid: amt.get(`${i}-${merchant}`) })),
            },
            filterStep: { rule: `riskScore ${filterMin} or more`, kept: keptByFilter, of: n },
            path: {
                from: { ...row(from), degree: deg[from], insideFilter: risk[from] >= filterMin },
                to: { ...row(to), degree: deg[to] },
                hops: best.dist[to],
                equallyShort: routes.length,
                routes: routes.map((p) => ({ accounts: p.map((i) => ids[i]), transfers: hopsOf(p), leavesFilterAt: p.filter((i) => risk[i] < filterMin).map((i) => ids[i]) })),
                reversed: { directedPath: bfsTo.dist[from] >= 0, undirectedHops: undirected.dist[from] },
                asSimilarityOneOverW: { route: asSimilarity.route, hops: asSimilarity.p.length - 1, distancePerDollar: Number(asSimilarity.length.toPrecision(3)) },
                asDistance: { route: asDistance.route, hops: asDistance.p.length - 1, dollars: round(asDistance.length, 2), transfers: hopsOf(asDistance.p) },
                amountRange: [minAmount, Math.max(...amount)],
                zeroAmountTransfers: amount.filter((a) => a === 0).length,
            },
            anchors: {
                merchant: pct(pos[merchant]),
                from: pct(pos[from]),
                to: pct(pos[to]),
                newLeads: newLeads.map((i) => ({ id: ids[i], ...pct(pos[i]) })),
                pathZoomed: { zoom, route: route.map((i) => ({ id: ids[i], ...inCrop(i) })) },
            },
            drawings: { focus: "canvas/transactions-sets-focus-{theme}.svg", intersect: "canvas/transactions-sets-intersect-{theme}.svg", path: "canvas/transactions-path-{theme}.svg" },
        };
    }

    // 4b. The same accounts in April: the next data version, for storyboards/weekly-return.html.
    // Replace data keeps ids, so most accounts carry over; some close, new ones open, the month's
    // transfers differ, and the mule ring recruits. Arranged positions carry over and new accounts
    // are placed beside their counterparties (principles.md 6). Its own seed, so no dataset moves.
    {
        const r2 = mulberry32(20260430);
        const pickM = () => {
            let r = r2() * wsum;
            for (let m = 0; m < 60; m++) if ((r -= merchantWeight[m]) <= 0) return m;
            return 59;
        };
        const ringSet = new Set(ring);
        const personal = [];
        for (let i = 390; i < n; i++) if (!ringSet.has(i)) personal.push(i);
        const closed = new Set();
        while (closed.size < 39) closed.add(personal[Math.floor(r2() * personal.length)]);
        const closedList = [...closed];
        // The Watchlist Alex kept in March: seven ring accounts and two personal accounts that close in April.
        const watch = [...ring.slice(0, 7), closedList[0], closedList[1]];
        const newOrdinary = 126;
        const recruits = 6;
        const N2 = n + newOrdinary + recruits;
        const kinds2 = [...kinds];
        const country2 = [...country];
        const ids2 = [...ids];
        const idSeen = new Set(ids);
        for (let k = 0; k < newOrdinary + recruits; k++) {
            kinds2.push("personal");
            country2.push(countries[Math.floor(r2() * countries.length)]);
            let id;
            do id = `ACC-${String(100000 + Math.floor(r2() * 899999)).padStart(6, "0")}`;
            while (idSeen.has(id));
            idSeen.add(id);
            ids2.push(id);
        }
        const key2 = new Set();
        const e2 = [];
        const amt2 = [];
        const add2 = (a, b, amt) => {
            const k = `${a}-${b}`;
            if (a === b || key2.has(k) || closed.has(a) || closed.has(b)) return;
            key2.add(k);
            e2.push([a, b]);
            amt2.push(round(amt, 2));
        };
        // The ring's own transfers recur every month; the rest of March recurs about five times in six.
        for (let a = 0; a < ring.length; a++) {
            add2(ring[a], ring[(a + 1) % ring.length], 9000 + r2() * 900);
            add2(ring[a], ring[(a + 5) % ring.length], 9000 + r2() * 900);
            add2(ring[a], 57, 9400 + r2() * 500);
        }
        edges.forEach(([a, b], e) => r2() < 0.84 && add2(a, b, amount[e] * (0.85 + 0.3 * r2())));
        const counterparty = (i) => {
            let p = 390 + Math.floor(r2() * (n - 390));
            for (let t = 0; t < 30 && (country[p] !== country2[i] || closed.has(p)); t++) p = 390 + Math.floor(r2() * (n - 390));
            return p;
        };
        const spend = (i, k) => {
            for (let j = 0; j < k; j++) {
                let m = pickM();
                for (let t = 0; t < 30 && r2() > 0.2 && country[m] !== country2[i]; t++) m = pickM();
                add2(i, m, 5 + r2() ** 2 * 400);
            }
        };
        for (let i = 390; i < n; i++) {
            if (closed.has(i)) continue;
            if (r2() < 0.16) spend(i, 1);
            if (r2() < 0.06) add2(i, counterparty(i), 10 + r2() * 250);
        }
        for (let i = n; i < n + newOrdinary; i++) {
            spend(i, 1 + Math.floor(r2() * 3));
            if (r2() < 0.35) add2(i, counterparty(i), 10 + r2() * 250);
        }
        // Recruits: paid by two ring members, pay a third, and cash out at the ring's merchant.
        for (let k = 0; k < recruits; k++) {
            const r = n + newOrdinary + k;
            add2(ring[(2 * k) % ring.length], r, 9000 + r2() * 900);
            add2(ring[(2 * k + 3) % ring.length], r, 9000 + r2() * 900);
            add2(r, ring[(2 * k + 7) % ring.length], 9000 + r2() * 900);
            add2(r, 57, 9400 + r2() * 500);
        }
        // Compact April: closed accounts are gone from this data version.
        const alive = [];
        for (let i = 0; i < N2; i++) if (!closed.has(i)) alive.push(i);
        const at = new Map(alive.map((old, j) => [old, j]));
        const n2 = alive.length;
        const edgesA = e2.map(([a, b]) => [at.get(a), at.get(b)]);
        const adjA = adjacency(n2, edgesA);
        const degA = adjA.map((l) => l.length);

        const nbM = weighted(n, edges, amount);
        // Adjusted mutual information (Vinh, Epps and Bailey 2010), arithmetic-mean normalization.
        const ami = (a, b) => {
            const N = a.length;
            const lf = new Float64Array(N + 1);
            for (let i = 1; i <= N; i++) lf[i] = lf[i - 1] + Math.log(i);
            const ca = new Map();
            const cb = new Map();
            const cab = new Map();
            for (let i = 0; i < N; i++) {
                ca.set(a[i], (ca.get(a[i]) ?? 0) + 1);
                cb.set(b[i], (cb.get(b[i]) ?? 0) + 1);
                const kk = `${a[i]}|${b[i]}`;
                cab.set(kk, (cab.get(kk) ?? 0) + 1);
            }
            let mi = 0;
            for (const [kk, nij] of cab) {
                const [x, y] = kk.split("|");
                mi += (nij / N) * Math.log((N * nij) / (ca.get(Number(x)) * cb.get(Number(y))));
            }
            const H = (c) => -[...c.values()].reduce((s, v) => s + (v / N) * Math.log(v / N), 0);
            let emi = 0;
            for (const ai of ca.values())
                for (const bj of cb.values())
                    for (let nij = Math.max(1, ai + bj - N); nij <= Math.min(ai, bj); nij++)
                        emi +=
                            (nij / N) *
                            Math.log((N * nij) / (ai * bj)) *
                            Math.exp(lf[ai] + lf[bj] + lf[N - ai] + lf[N - bj] - lf[N] - lf[nij] - lf[ai - nij] - lf[bj - nij] - lf[N - ai - bj + nij]);
            return (mi - emi) / ((H(ca) + H(cb)) / 2 - emi);
        };
        const nbA = weighted(n2, edgesA, amt2);
        const commM = louvain(nbM, 11);
        const commM2 = louvain(nbM, 12); // a re-run on the same March data, another seed
        const commA = louvain(nbA, 11);
        const kept = alive.filter((i) => i < n);
        const amiVersions = ami(
            kept.map((i) => commM[i]),
            kept.map((i) => commA[at.get(i)]),
        );
        const amiRerun = ami(commM, commM2);
        const sizes = (c) => c.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
        const sizeM = sizes(commM);
        const sizeA = sizes(commA);
        // Match each April community to the March community it overlaps most, and keep a pair
        // only when the match is mutual (conceptual-model.md 7.3: groups match by overlap).
        const overlapOf = (from, to, fromIdx, toIdx) => {
            const best = {};
            const ov = new Map();
            for (const i of kept) {
                const kk = `${from[fromIdx(i)]}|${to[toIdx(i)]}`;
                ov.set(kk, (ov.get(kk) ?? 0) + 1);
            }
            for (const [kk, v] of ov) {
                const [x, y] = kk.split("|").map(Number);
                if (!best[x] || v > best[x].overlap || (v === best[x].overlap && y < best[x].to)) best[x] = { to: y, overlap: v };
            }
            return best;
        };
        const a2m = overlapOf(commA, commM, (i) => at.get(i), (i) => i);
        const m2a = overlapOf(commM, commA, (i) => i, (i) => at.get(i));
        const matchOf = {};
        for (const c of Object.keys(sizeA).map(Number)) {
            const mt = a2m[c];
            matchOf[c] = mt && m2a[mt.to] && m2a[mt.to].to === c ? { march: mt.to, overlap: mt.overlap } : null;
        }
        // Replace data carries a partition's group names to the new run by this match (glossary.md 9,
        // Carry over to new run); an April community with no March match takes the next free number.
        const unmatchedSorted = Object.keys(sizeA).map(Number).filter((c) => !matchOf[c]).sort((x, y) => sizeA[y] - sizeA[x] || x - y);
        const nameA = (c) => (matchOf[c] ? `Community ${matchOf[c].march}` : `Community ${Object.keys(sizeM).length + 1 + unmatchedSorted.indexOf(c)}`);
        // How well each April community holds its members across five re-runs on the same April
        // data (best Jaccard match, averaged): a community that dissolves in a re-run is not news.
        const reruns = [12, 13, 14, 15, 16].map((sd) => louvain(nbA, sd));
        const holds = (c) => {
            const mem = new Set();
            commA.forEach((x, j) => x === c && mem.add(j));
            let sum = 0;
            for (const rr of reruns) {
                const ov = new Map();
                for (const j of mem) ov.set(rr[j], (ov.get(rr[j]) ?? 0) + 1);
                const sz = sizes(rr);
                sum += Math.max(...[...ov].map(([x, v]) => v / (mem.size + sz[x] - v)));
            }
            return round(sum / reruns.length, 2);
        };
        const top = (arr) => Object.entries(arr.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1])[0][0];
        const ringA = new Set([...ring, ...Array.from({ length: recruits }, (_, k) => n + newOrdinary + k)].map((i) => at.get(i)));
        const communityRow = (c) => {
            const mem = [];
            commA.forEach((x, j) => x === c && mem.push(j));
            const mt = matchOf[c];
            return {
                name: nameA(c),
                marchName: mt ? `Community ${mt.march}` : null,
                marchSize: mt ? sizeM[mt.march] : 0,
                aprilSize: sizeA[c],
                change: sizeA[c] - (mt ? sizeM[mt.march] : 0),
                pctChange: mt ? Math.round((100 * (sizeA[c] - sizeM[mt.march])) / sizeM[mt.march]) : null,
                newAccounts: mem.filter((j) => alive[j] >= n).length,
                mostlyCountry: top(mem.map((j) => country2[alive[j]])),
                ringAccounts: mem.filter((j) => ringA.has(j)).length,
                holdsInReruns: holds(c),
            };
        };
        const communities = Object.keys(sizeA).map(Number).filter((c) => matchOf[c]).map(communityRow);
        const grew = [...communities].filter((r) => r.change > 0).sort((x, y) => y.change - x.change);
        const shrank = [...communities].filter((r) => r.change < 0).sort((x, y) => x.change - y.change);
        const unmatchedApril = Object.keys(sizeA).map(Number).filter((c) => !matchOf[c]);
        // March communities with no mutual April match, and where most of their accounts went: the
        // weekly return lists them, so 35 March groups reconcile with 65 April groups by name.
        const matchedMarch = new Set(Object.values(matchOf).filter(Boolean).map((x) => x.march));
        const unmatchedMarch = Object.keys(sizeM).map(Number).filter((m) => !matchedMarch.has(m)).map((m) => {
            const mem = kept.filter((i) => commM[i] === m);
            const to = Object.entries(mem.reduce((o, i) => ((o[commA[at.get(i)]] = (o[commA[at.get(i)]] ?? 0) + 1), o), {})).sort((x, y) => y[1] - x[1] || x[0] - y[0])[0];
            return { name: `Community ${m}`, marchSize: sizeM[m], closed: sizeM[m] - mem.length, mostlyTo: to ? nameA(Number(to[0])) : null, mostlyToCount: to ? to[1] : 0 };
        });
        const unmatchedAprilSilent = unmatchedApril.filter((c) => sizeA[c] === 1 && degA[commA.indexOf(c)] === 0).length;
        const ringComm = commA[at.get(ring[0])];
        // Directed PageRank on April (transfers point from payer to payee), damping 0.85.
        const outA = Array.from({ length: n2 }, () => []);
        for (const [s, t] of edgesA) outA[s].push(t);
        let pr = new Float64Array(n2).fill(1 / n2);
        for (let it = 0; it < 100; it++) {
            const nx = new Float64Array(n2).fill(0.15 / n2);
            let dangling = 0;
            for (let v = 0; v < n2; v++) {
                if (!outA[v].length) dangling += pr[v];
                else for (const w of outA[v]) nx[w] += (0.85 * pr[v]) / outA[v].length;
            }
            for (let v = 0; v < n2; v++) nx[v] += (0.85 * dangling) / n2;
            pr = nx;
        }
        // Shortest directed path from a payroll business to the ring: the route money takes in.
        const toRing = (() => {
            let bestPath = null;
            for (let b = 60; b < 390; b++) {
                const s = at.get(b);
                const prev = new Int32Array(n2).fill(-1);
                prev[s] = s;
                const q = [s];
                let hit = -1;
                for (let qi = 0; qi < q.length && hit < 0; qi++)
                    for (const w of outA[q[qi]])
                        if (prev[w] < 0) {
                            prev[w] = q[qi];
                            if (ringA.has(w)) {
                                hit = w;
                                break;
                            }
                            q.push(w);
                        }
                if (hit < 0) continue;
                const p = [hit];
                while (p[0] !== s) p.unshift(prev[p[0]]);
                // Prefer a route with an intermediary (3 hops or more), shortest first.
                const score = (q) => (q.length >= 4 ? q.length : 100 - q.length);
                if (!bestPath || score(p) < score(bestPath)) bestPath = p;
            }
            return bestPath;
        })();
        // Positions: kept accounts keep theirs; new ones sit beside their placed counterparties.
        const posA = new Array(n2);
        alive.forEach((old, j) => old < n && (posA[j] = pos[old]));
        for (let j = 0; j < n2; j++) {
            if (posA[j]) continue;
            const placed = adjA[j].filter((w) => posA[w]);
            const [x, y] = placed.length
                ? placed.reduce(([sx, sy], w) => [sx + posA[w][0] / placed.length, sy + posA[w][1] / placed.length], [0, 0])
                : [100 + r2() * (W - 200), 100 + r2() * (H - 200)];
            posA[j] = [x + (r2() - 0.5) * 24, y + (r2() - 0.5) * 24];
        }
        // Colors: the seven largest March communities take Okabe-Ito (black skipped), the rest Other;
        // an April community keeps the color of the March community it matches.
        const SLOTS = [0, 1, 2, 3, 4, 5, 7].map((k) => OKABE_ITO[k]);
        const colorM = (c) => (c <= 7 ? SLOTS[c - 1] : OTHER);
        const colorA = (c) => (matchOf[c] && matchOf[c].march <= 7 ? SLOTS[matchOf[c].march - 1] : OTHER);
        const VIRIDIS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
        const lerp = (a, b, t) => "#" + [0, 2, 4].map((k) => Math.round(parseInt(a.slice(1 + k, 3 + k), 16) * (1 - t) + parseInt(b.slice(1 + k, 3 + k), 16) * t).toString(16).padStart(2, "0")).join("");
        const prLo = Math.min(...pr);
        const prHi = Math.max(...pr);
        const prColor = (j) => {
            const u = (Math.log(pr[j]) - Math.log(prLo)) / (Math.log(prHi) - Math.log(prLo)); // log scale
            const x = u * (VIRIDIS.length - 1);
            const k = Math.min(VIRIDIS.length - 2, Math.floor(x));
            return lerp(VIRIDIS[k], VIRIDIS[k + 1], x - k);
        };
        const rOf = (d) => Math.min(12, 1.8 + Math.sqrt(d) * 0.35); // the project's Size: degree layer
        const degM = deg;
        // A light drawing for 3,000 dots: edges as one path, nodes as circles, marks on top.
        // Optional marks, all off by default (the weekly-return extras use them): selected (ring 1,
        // full band), onlyA / onlyB (ring 3, comparison semicircle, left or right), edgeOpacity.
        const dots = ({ theme, P, E, D, color, title, members = null, path = null, labels = [], labelOf = () => "", selected = null, onlyA = null, onlyB = null, edgeOpacity = 0.16, ends = null, vb = 1 }) => {
            // vb > 1 draws marks vb times larger against positions given in a W/vb by H/vb box.
            const T = THEMES[theme];
            const o = [];
            o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(W / vb)} ${f1(H / vb)}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">`);
            o.push(`<rect width="${f1(W / vb)}" height="${f1(H / vb)}" fill="${T.canvas}"/>`);
            o.push(`<path fill="none" stroke="${T.edge}" stroke-opacity="${edgeOpacity}" stroke-width="0.6" d="${E.map(([s, t]) => `M${Math.round(P[s][0])} ${Math.round(P[s][1])}L${Math.round(P[t][0])} ${Math.round(P[t][1])}`).join("")}"/>`);
            if (path) {
                // Highlight 1 (canvas-drawing.md 6, ring 2a): a long dash in a two-tone band.
                for (let k = 1; k < path.length; k++) {
                    const [s, t] = [path[k - 1], path[k]];
                    const l = (w, c, d = "") => `<line x1="${f1(P[s][0])}" y1="${f1(P[s][1])}" x2="${f1(P[t][0])}" y2="${f1(P[t][1])}" stroke="${c}" stroke-width="${w}"${d}/>`;
                    o.push(l(7, T.inner) + l(7, T.outer, ' stroke-dasharray="10 5"') + l(1.5, T.edge));
                }
            }
            const order = P.map((_, i) => i).sort((a, b) => D[a] - D[b]);
            o.push("<g>");
            for (const i of order) o.push(`<circle cx="${f1(P[i][0])}" cy="${f1(P[i][1])}" r="${f1(rOf(D[i]))}" fill="${color(i)}"/>`);
            o.push("</g>");
            if (path)
                for (const i of path) {
                    const r = rOf(D[i]);
                    const c = (rr, col, d = "") => `<circle cx="${f1(P[i][0])}" cy="${f1(P[i][1])}" r="${f1(rr)}" fill="none" stroke="${col}" stroke-width="1.5"${d}/>`;
                    const off = selected && selected.includes(i) ? 4 : 0; // ring 2a sits outside ring 1
                    o.push(c(r + off + 1.25, T.inner) + c(r + off + 2.75, T.outer, ' stroke-dasharray="6 3"'));
                }
            if (members) {
                // The selected group's members: the thin two-tone member ring (canvas-drawing.md 6, ring 1), drawn last.
                for (const i of members) {
                    const r = rOf(D[i]);
                    const c = (rr, w, col) => `<circle cx="${f1(P[i][0])}" cy="${f1(P[i][1])}" r="${f1(rr)}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
                    o.push(`<circle cx="${f1(P[i][0])}" cy="${f1(P[i][1])}" r="${f1(r)}" fill="${color(i)}"/>` + c(r + 0.75, 1.5, T.inner) + c(r + 2.25, 1.5, T.outer));
                }
            }
            if (selected)
                // Selected: the full two-tone band (canvas-drawing.md 6, ring 1), 2 + 2.
                for (const i of selected) {
                    const r = rOf(D[i]);
                    const c = (rr, col) => `<circle cx="${f1(P[i][0])}" cy="${f1(P[i][1])}" r="${f1(rr)}" fill="none" stroke="${col}" stroke-width="2"/>`;
                    o.push(`<circle cx="${f1(P[i][0])}" cy="${f1(P[i][1])}" r="${f1(r)}" fill="${color(i)}"/>` + c(r + 1, T.inner) + c(r + 3, T.outer));
                }
            // Comparison membership (ring 3): a two-tone semicircle, left for A only, right for B only.
            const semi = (i, right) => {
                const r = rOf(D[i]) + (selected && selected.includes(i) ? 4 : 0);
                const [x, y] = P[i];
                const arc = (rr, col) => `<path d="M${f1(x)} ${f1(y + (right ? -rr : rr))}A${f1(rr)} ${f1(rr)} 0 0 1 ${f1(x)} ${f1(y + (right ? rr : -rr))}" fill="none" stroke="${col}" stroke-width="2"/>`;
                return arc(r + 1, T.inner) + arc(r + 3, T.outer);
            };
            if (onlyA) for (const i of onlyA) o.push(semi(i, false));
            if (onlyB) for (const i of onlyB) o.push(semi(i, true));
            if (ends)
                // A path's end badges (canvas-drawing.md 6): solid pills in ink, below the start, above the end.
                ends.forEach(([i, text], k) => {
                    const [x, y] = P[i];
                    const dy = k ? -22 : 22;
                    o.push(`<rect x="${f1(x - 17)}" y="${f1(y + dy - 8)}" width="34" height="16" rx="8" fill="${T.ink}"/><text x="${f1(x)}" y="${f1(y + dy + 3.5)}" text-anchor="middle" font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="10" font-weight="600" fill="${T.canvas}">${text}</text>`);
                });
            o.push(`<g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`);
            for (const i of labels) o.push(`<text x="${f1(P[i][0] + rOf(D[i]) + 5)}" y="${f1(P[i][1] + 4)}">${esc(labelOf(i))}</text>`);
            o.push("</g></svg>");
            return o.join("\n");
        };
        // The storyboard follows the ring's community: it grew, and it holds in every re-run.
        const grown = ringComm;
        const grownMarch = matchOf[grown].march;
        const hullA = [];
        commA.forEach((c, j) => c === grown && hullA.push(j));
        const hullM = [];
        commM.forEach((c, i) => c === grownMarch && hullM.push(i));
        const topPR = pr.indexOf(prHi);
        emit("transactions-march-communities", (theme) =>
            dots({ theme, P: pos, E: edges, D: degM, color: (i) => colorM(commM[i]), title: "March transfers, 3,000 accounts colored by Louvain community, sized by degree" }),
        );
        // The project as it closed in March: the 14 flagged accounts selected (the reopened project restores the selection).
        emit("transactions-march-communities-sel", (theme) =>
            dots({ theme, P: pos, E: edges, D: degM, color: (i) => colorM(commM[i]), selected: ring, title: `March transfers colored by Louvain community, sized by degree; the ${ring.length} flagged accounts selected` }),
        );
        emit("transactions-april-communities", (theme) =>
            dots({ theme, P: posA, E: edgesA, D: degA, color: (j) => colorA(commA[j]), title: "April transfers colored by Louvain community, matched to March colors, sized by degree" }),
        );
        emit("transactions-compare-march", (theme) =>
            dots({ theme, P: pos, E: edges, D: degM, color: (i) => colorM(commM[i]), members: hullM, title: `March side of the comparison, Community ${grownMarch} selected` }),
        );
        emit("transactions-compare-april", (theme) =>
            dots({ theme, P: posA, E: edgesA, D: degA, color: (j) => colorA(commA[j]), members: hullA, title: `April side of the comparison, ${nameA(grown)} selected` }),
        );
        emit("transactions-april-pagerank", (theme) =>
            dots({ theme, P: posA, E: edgesA, D: degA, color: prColor, labels: [topPR], labelOf: (j) => ids2[alive[j]], title: "April transfers colored by PageRank, log scale, sized by degree" }),
        );
        emit("transactions-april-pagerank-path", (theme) =>
            dots({ theme, P: posA, E: edgesA, D: degA, color: prColor, path: toRing, labels: [topPR, toRing[0], toRing[toRing.length - 1]], labelOf: (j) => ids2[alive[j]], title: "Colored by PageRank; the shortest path from a payroll account into the ring highlighted" }),
        );
        // The March mule ring in April's data, selected: a note about the ring read after Replace data.
        const ringJ = ring.filter((i) => at.has(i)).map((i) => at.get(i));
        emit("transactions-april-flagged", (theme) =>
            hexDensity({ theme, pos: posA, marked: ringJ, size: () => 5, color: () => OKABE_ITO[4], title: "3,093 April accounts as density, the 14 Mule ring accounts selected" }),
        );
        const rowA = (j) => ({ id: ids2[alive[j]], kind: kinds2[alive[j]], country: country2[alive[j]], degree: degA[j], pagerank: round(pr[j], 6), community: nameA(commA[j]), newInApril: alive[j] >= n });
        const byPR = alive.map((_, j) => j).sort((a, b) => pr[b] - pr[a]);
        datasets.transactionsApril = {
            title: "Card and transfer transactions, April 2026",
            graphName: "Transfers",
            file: "transfers-2026-04.csv",
            previous: { dataset: "transactions", file: "transfers-2026-03.csv" },
            source: "generated for the mocks from the March accounts: the same ids, 39 closed, 132 opened, about five in six of March's transfers repeated plus a new month's spend",
            nodes: n2,
            edges: edgesA.length,
            directed: true,
            columns: 7,
            columnsMatched: 7,
            stats: summary(adjA, edgesA.length, true),
            versionDiff: {
                accountsKept: kept.length,
                accountsAdded: newOrdinary + recruits,
                accountsRemoved: closed.size,
                transfersBoth: e2.filter(([a, b]) => key.has(`${a}-${b}`)).length,
                transfersAdded: e2.filter(([a, b]) => !key.has(`${a}-${b}`)).length,
                transfersRemoved: edges.length - e2.filter(([a, b]) => key.has(`${a}-${b}`)).length,
            },
            // What Add data would leave if April were stacked on March instead of replacing it (the
            // load step's warning): every account of either month, both months' transfers.
            stackedOnMarch: { accounts: n + newOrdinary + recruits, transfers: edges.length + edgesA.length },
            watchlist: {
                name: "Watchlist",
                members: watch.length,
                inCurrentData: watch.filter((i) => !closed.has(i)).length,
                notInCurrentData: watch.filter((i) => closed.has(i)).map((i) => ids[i]),
                memberIds: watch.map((i) => ids[i]),
            },
            louvain: {
                note: "Louvain weighted by amount, direction ignored, seed 11; March communities numbered by size, largest first; an April community keeps the name of the March community it matches by overlap, unmatched ones take the next numbers; modularity is weighted",
                march: { communities: Object.keys(sizeM).length, modularity: round(wQ(nbM, commM)), largest: Object.values(sizeM).sort((a, b) => b - a).slice(0, 8) },
                april: { communities: Object.keys(sizeA).length, modularity: round(wQ(nbA, commA)), largest: Object.values(sizeA).sort((a, b) => b - a).slice(0, 8) },
                amiMarchVsApril: round(amiVersions),
                amiMarchRerun: round(amiRerun),
                amiNote: "adjusted mutual information over the accounts in both versions; the re-run is the same March data with seed 12",
                matchedPairs: communities.length,
                unmatchedApril: unmatchedApril.length,
                unmatchedAprilAccounts: unmatchedApril.reduce((a, c) => a + sizeA[c], 0),
                unmatchedAprilSilent,
                unmatchedMarch,
                grew: grew.slice(0, 10),
                ringRankInGrew: grew.findIndex((r) => r.name === nameA(ringComm)) + 1,
                shrank: shrank.slice(0, 4),
                ringCommunity: communityRow(ringComm),
                selected: communityRow(grown),
                selectedMembers: hullA.map((j) => ids2[alive[j]]).slice(0, 12),
            },
            pagerank: {
                note: "directed, damping 0.85, 100 iterations, unweighted; colored on a log scale",
                domain: [prLo, prHi],
                top: byPR.slice(0, 10).map(rowA),
                // The March mule ring's accounts in April, for notes that quote a ring member's March value.
                ring: ring.filter((i) => at.has(i)).map((i) => rowA(at.get(i))),
            },
            path: {
                note: "shortest directed path from a payroll business to the nearest ring account, fewest hops",
                from: ids2[alive[toRing[0]]],
                to: ids2[alive[toRing[toRing.length - 1]]],
                hops: toRing.length - 1,
                nodes: toRing.map((j) => ({ ...rowA(j), ...pct(posA[j]) })),
            },
            anchors: {
                topPagerank: { id: ids2[alive[topPR]], ...pct(posA[topPR]) },
                ringCenter: pct([ringJ.reduce((a, j) => a + posA[j][0], 0) / ringJ.length, ringJ.reduce((a, j) => a + posA[j][1], 0) / ringJ.length]),
                selectedCommunityApril: pct([hullA.reduce((a, j) => a + posA[j][0], 0) / hullA.length, hullA.reduce((a, j) => a + posA[j][1], 0) / hullA.length]),
                selectedCommunityMarch: pct([hullM.reduce((a, i) => a + pos[i][0], 0) / hullM.length, hullM.reduce((a, i) => a + pos[i][1], 0) / hullM.length]),
            },
            communityColors: Object.fromEntries(Object.keys(sizeA).map(Number).filter((c) => colorA(c) !== OTHER).map((c) => [nameA(c), colorA(c)])),
            // The Mule ring selected over April's density (drawings.aprilFlagged): its legend's two rows.
            ringOverDensity: { ring: ringJ.length, density: alive.length - ringJ.length },
            legends: {
                note: "the canvas legend's rows for the Community color layer: colored communities with counts, then Other",
                march: (() => {
                    const rows = [1, 2, 3, 4, 5, 6, 7].map((c) => ({ name: `Community ${c}`, color: colorM(c), count: sizeM[c] }));
                    return { rows, other: { communities: Object.keys(sizeM).length - 7, count: n - rows.reduce((t, r) => t + r.count, 0) } };
                })(),
                april: (() => {
                    const rows = Object.keys(sizeA).map(Number).filter((c) => colorA(c) !== OTHER).map((c) => ({ name: nameA(c), color: colorA(c), count: sizeA[c] })).sort((x, y) => y.count - x.count);
                    return { rows, other: { communities: Object.keys(sizeA).length - rows.length, count: n2 - rows.reduce((t, r) => t + r.count, 0) } };
                })(),
            },
            rows: byPR.slice(0, 40).map(rowA),
            drawings: {
                marchCommunities: "canvas/transactions-march-communities-{theme}.svg",
                marchCommunitiesSelected: "canvas/transactions-march-communities-sel-{theme}.svg",
                aprilCommunities: "canvas/transactions-april-communities-{theme}.svg",
                aprilFlagged: "canvas/transactions-april-flagged-{theme}.svg",
                compareMarch: "canvas/transactions-compare-march-{theme}.svg",
                compareApril: "canvas/transactions-compare-april-{theme}.svg",
                pagerank: "canvas/transactions-april-pagerank-{theme}.svg",
                pagerankPath: "canvas/transactions-april-pagerank-path-{theme}.svg",
            },
        };
        // 4c. Extras for storyboards/weekly-return.html. Read-only over the April data above: no
        // random draws, so nothing else in this file moves.
        {
            const dormant = degA.map((d, j) => (d === 0 ? j : -1)).filter((j) => j >= 0);
            const singletonsA = Object.values(sizeA).filter((x) => x === 1).length;
            // Re-run agreement as a range: AMI of the seed-11 run against five seeded re-runs on the same data.
            const marchReruns = [12, 13, 14, 15, 16].map((sd) => ami(commM, sd === 12 ? commM2 : louvain(nbM, sd)));
            const aprilReruns = reruns.map((rr) => ami(commA, rr));
            const keptActive = kept.filter((i) => degA[at.get(i)] > 0);
            const amiActive = ami(keptActive.map((i) => commM[i]), keptActive.map((i) => commA[at.get(i)]));
            // The same agreement said as its meaning: of the pairs of accounts one run puts in the same
            // group, the share the other run also puts together ("7 in 10 stay grouped together").
            const together = (x, y) => {
                const c2 = (k) => (k * (k - 1)) / 2;
                const cell = new Map();
                const rowN = new Map();
                x.forEach((v, j) => {
                    cell.set(`${v}|${y[j]}`, (cell.get(`${v}|${y[j]}`) ?? 0) + 1);
                    rowN.set(v, (rowN.get(v) ?? 0) + 1);
                });
                return [...cell.values()].reduce((t, k) => t + c2(k), 0) / [...rowN.values()].reduce((t, k) => t + c2(k), 0);
            };
            const stayMonths = together(kept.map((i) => commM[i]), kept.map((i) => commA[at.get(i)]));
            const stayMarch = [12, 13, 14, 15, 16].map((sd) => together(commM, sd === 12 ? commM2 : louvain(nbM, sd)));
            const stayApril = reruns.map((rr) => together(commA, rr));
            const stayActive = together(keptActive.map((i) => commM[i]), keptActive.map((i) => commA[at.get(i)]));
            const range = (xs) => [round(Math.min(...xs)), round(Math.max(...xs))];
            // Both sides of the comparison at the kept layout, unzoomed: the ring's community is spread
            // across it, because the project's layout is unweighted and the ring's heavy transfers are not.
            const zM = pos;
            const zA = posA;
            // The comparison's shared camera, zoomed 300% onto the new accounts, as a 450 px side shows
            // it: marks at screen size (vb 2.5), so the selection ring and the half-ring can be read.
            const vz = 3, vb = 2.5;
            const newJ = hullA.filter((j) => alive[j] >= n);
            const vc = [newJ.reduce((a2, j) => a2 + posA[j][0], 0) / newJ.length, newJ.reduce((a2, j) => a2 + posA[j][1], 0) / newJ.length];
            const vp = (p) => [((p[0] - vc[0]) * vz + W / 2) / vb, ((p[1] - vc[1]) * vz + H / 2) / vb];
            const inView = (p) => Math.abs(p[0] - vc[0]) * vz < W / 2 && Math.abs(p[1] - vc[1]) * vz < H / 2;
            const vM = pos.map(vp);
            const vA = posA.map(vp);
            const onlyMarch = [...closed];
            const onlyApril = alive.map((old, j) => (old >= n ? j : -1)).filter((j) => j >= 0);
            const newInRing = hullA.filter((j) => alive[j] >= n);
            emit("transactions-compare-march-sel", (theme) =>
                dots({ theme, P: vM, E: edges, D: degM, vb, color: (i) => colorM(commM[i]), selected: hullM, onlyA: onlyMarch, title: `March side of the comparison, Community ${grownMarch} selected: its ${hullM.length} accounts selected` }),
            );
            emit("transactions-compare-april-sel", (theme) =>
                dots({ theme, P: vA, E: edgesA, D: degA, vb, color: (j) => colorA(commA[j]), selected: hullA, onlyB: onlyApril, title: `April side of the comparison, ${nameA(grown)} selected: its ${hullA.length} accounts selected, ${newInRing.length} new in April marked` }),
            );
            emit("transactions-april-ring-new", (theme) =>
                dots({ theme, P: zA, E: edgesA, D: degA, color: (j) => colorA(commA[j]), selected: newInRing, title: `April transfers colored by community: the ${newInRing.length} new accounts selected` }),
            );
            // Money through the new accounts: every April transfer touching them.
            const idxOf = new Map(edgesA.map(([s2, t2], e) => [`${s2}-${t2}`, e]));
            const touching = [];
            edgesA.forEach(([s2, t2], e) => (newInRing.includes(s2) || newInRing.includes(t2)) && touching.push(e));
            const side = (e, j) => (edgesA[e][1] === j ? "in" : "out");
            const flows = newInRing.map((j) => {
                const es = touching.filter((e) => edgesA[e][0] === j || edgesA[e][1] === j);
                const sum = (d) => round(es.filter((e) => side(e, j) === d).reduce((a2, e) => a2 + amt2[e], 0), 2);
                return { id: ids2[alive[j]], degree: degA[j], in: es.filter((e) => side(e, j) === "in").length, inSum: sum("in"), out: es.filter((e) => side(e, j) === "out").length, outSum: sum("out") };
            });
            const cashOut = at.get(57);
            const rows = touching
                .map((e) => ({ from: ids2[alive[edgesA[e][0]]], fromKind: kinds2[alive[edgesA[e][0]]], fromRing: hullA.includes(edgesA[e][0]), to: ids2[alive[edgesA[e][1]]], toKind: kinds2[alive[edgesA[e][1]]], toRing: hullA.includes(edgesA[e][1]), amount: amt2[e] }))
                .sort((x, y) => y.amount - x.amount);
            // Two steps upstream of the ring's community: who pays it, and who pays them.
            const ringSetA = new Set(hullA);
            const pay1 = new Set();
            for (const [s2, t2] of edgesA) if (ringSetA.has(t2) && !ringSetA.has(s2)) pay1.add(s2);
            const pay2 = new Set();
            for (const [s2, t2] of edgesA) if (pay1.has(t2) && !ringSetA.has(s2) && !pay1.has(s2)) pay2.add(s2);
            const up = [...hullA, ...pay1, ...pay2];
            const upAt = new Map(up.map((j, k) => [j, k]));
            const upE = edgesA.filter(([s2, t2]) => upAt.has(s2) && upAt.has(t2)).map(([s2, t2]) => [upAt.get(s2), upAt.get(t2)]);
            // Run layout on the filtered graph (the layout reads the filtered graph while a step is on).
            const upP = layout(up.length, upE, { strength: -90, distance: 34, ticks: 500 });
            const upD = up.map((j) => degA[j]);
            // Fit domain to current scope: PageRank's log ramp over the 157 accounts, not the full graph.
            const upLo = Math.min(...up.map((j) => pr[j]));
            const upHi = Math.max(...up.map((j) => pr[j]));
            const upColor = (k) => {
                const u = (Math.log(pr[up[k]]) - Math.log(upLo)) / (Math.log(upHi) - Math.log(upLo));
                const x = u * (VIRIDIS.length - 1);
                const kk = Math.min(VIRIDIS.length - 2, Math.floor(x));
                return lerp(VIRIDIS[kk], VIRIDIS[kk + 1], x - kk);
            };
            const upPath = toRing.map((j) => upAt.get(j));
            const upTop = [...up.keys()].sort((x, y) => pr[up[y]] - pr[up[x]]).slice(0, 3);
            const upLabel = (k) => ids2[alive[up[k]]];
            emit("transactions-april-upstream-pagerank", (theme) =>
                dots({ theme, P: upP, E: upE, D: upD, color: upColor, edgeOpacity: 0.35, labels: upTop, labelOf: upLabel, title: `The ring's community and two steps upstream, ${up.length} accounts, colored by PageRank on a log scale, sized by degree` }),
            );
            emit("transactions-april-upstream-path", (theme) =>
                dots({ theme, P: upP, E: upE, D: upD, color: upColor, edgeOpacity: 0.35, path: upPath, selected: upPath, ends: [[upPath[0], "start"], [upPath[upPath.length - 1], "end"]], labels: [...new Set([...upTop, upPath[0], upPath[upPath.length - 1]])], labelOf: upLabel, title: `The same, with the shortest path ${ids2[alive[toRing[0]]]} to ${ids2[alive[toRing[toRing.length - 1]]]} selected and highlighted` }),
            );
            // How many equally short directed routes join the path's two ends (the Path tool's stepper).
            const src = toRing[0], dst = toRing[toRing.length - 1];
            const dist = new Int32Array(n2).fill(-1), ways = new Float64Array(n2);
            dist[src] = 0; ways[src] = 1;
            for (const q = [src]; q.length; ) {
                const v = q.shift();
                for (const w of outA[v]) {
                    if (dist[w] < 0) (dist[w] = dist[v] + 1), q.push(w);
                    if (dist[w] === dist[v] + 1) ways[w] += ways[v];
                }
            }
            const inScope = (d) => up.filter((j) => degA[j] === d).length;
            Object.assign(datasets.transactionsApril, {
                files: {
                    note: "April arrives as the two files March did: the account table and the transfer list",
                    accounts: { file: "accounts-2026-04.csv", rows: n2, columns: ["id", "kind", "country", "riskScore", "flagged"] },
                    transfers: { file: "transfers-2026-04.csv", rows: edgesA.length, columns: ["from_account", "to_account", "amount", "timestamp"] },
                    marchAccounts: "accounts-2026-03.csv",
                },
                dormant: {
                    note: "accounts in the April account table with no April transfer: all kept from March, none new; each is its own weak component and its own Louvain community; they keep their March positions",
                    count: dormant.length,
                    new: dormant.filter((j) => alive[j] >= n).length,
                    ids: dormant.slice(0, 5).map((j) => ids2[alive[j]]),
                    largestComponent: n2 - dormant.length,
                    singletonCommunities: singletonsA,
                    communitiesWithTransfers: Object.keys(sizeA).length - singletonsA,
                    minDegree: Math.min(...degA),
                    marchDegreeRange: [Math.min(...degM), Math.max(...degM)],
                },
                agreement: {
                    note: "AMI; the months are compared on the accounts in both; each re-run range is the seed-11 run against seeds 12 to 16 on the same data, the five seeded runs that run with the result (graph-conventions.md 4)",
                    monthsOnAccountsInBoth: round(amiVersions),
                    accountsInBoth: kept.length,
                    monthsWithoutDormant: round(amiActive),
                    accountsInBothWithTransfers: keptActive.length,
                    marchReruns: marchReruns.map((x) => round(x)),
                    marchRerunRange: range(marchReruns),
                    aprilReruns: aprilReruns.map((x) => round(x)),
                    aprilRerunRange: range(aprilReruns),
                    seeds: [11, 12, 13, 14, 15, 16],
                    stayTogether: {
                        note: "of the pairs of accounts the first run puts in one group, the share the second run also puts in one group; months on the accounts in both, re-runs as above; inTen is the share rounded to whole tenths",
                        months: round(stayMonths),
                        monthsInTen: Math.round(stayMonths * 10),
                        monthsWithoutDormant: round(stayActive),
                        monthsWithoutDormantInTen: Math.round(stayActive * 10),
                        marchRerunRange: range(stayMarch),
                        marchRerunInTen: range(stayMarch).map((v) => Math.round(v * 10)),
                        aprilRerunRange: range(stayApril),
                        aprilRerunInTen: range(stayApril).map((v) => Math.round(v * 10)),
                    },
                },
                compareSelection: {
                    zoom: vz,
                    inViewMarch: hullM.filter((i) => inView(pos[i])).length,
                    inViewApril: hullA.filter((j) => inView(posA[j])).length,
                    newInView: newJ.filter((j) => inView(posA[j])).length,
                    onlyAprilInView: onlyApril.filter((j) => inView(posA[j])).length,
                    onlyMarchInView: onlyMarch.filter((i) => inView(pos[i])).length,
                    onlyMarchInCommunity: hullM.filter((i) => closed.has(i)).length,
                    marchMembersStillInIt: hullM.filter((i) => !closed.has(i) && commA[at.get(i)] === grown).length,
                    marchMembersLeftIt: hullM.filter((i) => !closed.has(i) && commA[at.get(i)] !== grown).length,
                    newInRing: newInRing.map((j) => ({ id: ids2[alive[j]], ...pct(zA[j]) })),
                },
                newAccountFlows: {
                    note: "every April transfer touching the new accounts in the ring's community",
                    accounts: flows,
                    transfers: touching.length,
                    inSum: round(flows.reduce((a2, f) => a2 + f.inSum, 0), 2),
                    outSum: round(flows.reduce((a2, f) => a2 + f.outSum, 0), 2),
                    cashOut: { id: ids2[alive[cashOut]], kind: kinds2[alive[cashOut]], degree: degA[cashOut], fromNew: rows.filter((r) => r.to === ids2[alive[cashOut]]).length },
                    rows,
                },
                upstream: {
                    note: "the ring's community (the kept set Ring community, April) and two steps upstream along transfers, after Filter to and Run layout on the filtered graph; colored by PageRank computed on the full graph, its log domain fitted to these accounts (fittedDomain); sized by degree on the full graph's domain",
                    accounts: up.length,
                    ring: hullA.length,
                    payers: pay1.size,
                    payersOfPayers: pay2.size,
                    businesses: up.filter((j) => kinds2[alive[j]] === "business").length,
                    transfers: upE.length,
                    degreeRange: [Math.min(...upD), Math.max(...upD)],
                    degreeZero: inScope(0),
                    top: upTop.map((k) => rowA(up[k])),
                    fittedDomain: [upLo, upHi],
                    newAccounts: up.filter((j) => alive[j] >= n).length,
                    anchors: Object.fromEntries(upTop.map((k) => [upLabel(k), pct(upP[k])])),
                    pathWays: ways[dst],
                    path: upPath.map((k) => ({ id: upLabel(k), ...pct(upP[k]) })),
                },
            });
            Object.assign(datasets.transactionsApril.drawings, {
                compareMarchSel: "canvas/transactions-compare-march-sel-{theme}.svg",
                compareAprilSel: "canvas/transactions-compare-april-sel-{theme}.svg",
                ringNew: "canvas/transactions-april-ring-new-{theme}.svg",
                upstreamPagerank: "canvas/transactions-april-upstream-pagerank-{theme}.svg",
                upstreamPath: "canvas/transactions-april-upstream-path-{theme}.svg",
            });
        }
    }
}

// 5. A graph past the drawing limit: counted, never drawn -----------------------------------
datasets.citations = {
    title: "Patent citations, 1999-2001 sample",
    file: "patent-citations-sample.csv",
    source: "a realistic size for the past-the-limit state; no drawing exists, by design",
    // The whole file the sample was cut from, for the load step's too-large state
    // (screens/load-step.html#too-large): SNAP's cit-Patents, its published counts.
    fullFile: { file: "cit-Patents.txt", source: "SNAP cit-Patents: US patents granted 1975 to 1999 and the citations among them", nodes: 3774768, edges: 16518948 },
    nodes: 124318,
    edges: 1480221,
    directed: true,
    attributes: [
        { name: "id (patent number)", kind: "text" },
        { name: "grantYear", kind: "integer", range: [1999, 2001] },
        { name: "category", kind: "category", values: { Chemical: 21480, "Computers and communications": 30112, "Drugs and medical": 14907, Electrical: 22671, Mechanical: 19210, Other: 15938 } },
        { name: "citationsReceived", kind: "integer" },
    ],
    notDrawnLine: "124,318 nodes not drawn",
    drawings: null,
    note: "Past the node drawing limit nothing is drawn: show an empty .k-canvas with the legend's not-drawn line (kit/README.md, Canvas).",
};
// The file's first rows, for the load step's sample (screens/load-step.html): US utility patents
// granted 1999-2001 citing older ones. Its own seed, so no dataset moves.
{
    const r3 = mulberry32(1999);
    const num = (lo, hi) => String(lo + Math.floor(r3() * (hi - lo)));
    datasets.citations.columns = ["citing", "cited"];
    datasets.citations.firstRows = [];
    for (let k = 0; k < 3; k++) {
        const citing = num(5855000, 6334000);
        for (let j = 0; j < 2; j++) datasets.citations.firstRows.push({ citing, cited: num(3200000, 5850000) });
    }
}
// Betweenness on the citation graph, for the costly-run option form (screens/option-form-cost.html).
// Seconds are graphty-element's own model (graphty-element/src/session/cost/estimate.ts): betweenness
// is the "heavy" class, work n * m, at DEFAULT_COST_RATES.heavyPairsPerSecond (5,000,000), a sampled
// run scaled by k / n; the exact budget is DEFAULT_EXACT_COMPUTATION_CAP_SECONDS (30). k is the real
// sampling parameter of @graphty/algorithms betweennessCentrality (how many sources to draw). The
// kept set is an invented but plausible slice of the sample, sized so it fits the budget.
{
    const RATE = 5000000;
    const CAP = 30;
    const band = (s) => (s < 10 ? null : s < 60 ? "under a minute" : s < 300 ? "a few minutes" : s < 3600 ? "under an hour" : s < 86400 ? "hours" : "over a day");
    const est = (n, m, k) => {
        const seconds = (n * m * (k === undefined ? 1 : Math.min(1, k / n))) / RATE;
        return { seconds: Math.round(seconds * 10) / 10, band: band(seconds), withinBudget: seconds <= CAP };
    };
    const c = datasets.citations;
    const keptSet = { name: "Drug patents granted in 2001", nodes: 5318, edges: 21760 };
    c.betweennessCost = {
        model: "heavy class, n * m at 5,000,000 per second (graphty-element DEFAULT_COST_RATES), confidence modeled",
        budgetSeconds: CAP,
        exact: est(c.nodes, c.edges),
        sampled: [50, 100, 101, 102, 500].map((k) => ({ k, ...est(c.nodes, c.edges, k) })),
        largestKWithinBudget: Math.floor((CAP * RATE) / c.edges),
        keptSets: [{ ...keptSet, exact: est(keptSet.nodes, keptSet.edges) }],
    };
}
// Betweenness (sampled) on the citation graph, 50 sources (the proposed default sample size), seed 7: the finished estimate in
// flows/run-and-read.html. MODELED, not computed: the sample has no edge list. Normalized
// directed betweenness is 0 for most patents in a three-year window (never cited inside it, or
// citing nothing inside it) and log-normal with a heavy tail for the rest; a 100-source estimate
// leaves more at 0. Its own seed, so no other dataset moves. Values carry 2 significant figures,
// because an estimate from 50 sources supports no more.
{
    const r = mulberry32(7100);
    const c = datasets.citations;
    const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const vals = new Float64Array(c.nodes);
    for (let i = 0; i < c.nodes; i++) vals[i] = r() < 0.64 ? 0 : Math.exp(Math.log(2e-6) + 1.9 * gauss());
    const sig = (x) => Number(x.toPrecision(2));
    const sorted = [...vals].sort((a, b) => a - b);
    const hi = sorted[sorted.length - 1];
    const hist = Array(12).fill(0);
    for (const v of vals) hist[Math.min(11, Math.floor((v / hi) * 12))]++;
    const nonzero = sorted.filter((v) => v > 0);
    const cats = Object.entries(c.attributes.find((a) => a.name === "category").values);
    const catTotal = cats.reduce((s, [, n]) => s + n, 0);
    const pickCat = () => {
        let x = r() * catTotal;
        for (const [name, n] of cats) if ((x -= n) < 0) return name;
        return cats[0][0];
    };
    const top = sorted
        .slice(-10)
        .reverse()
        .map((v) => ({
            id: String(5855000 + Math.floor(r() * 150000)),
            category: pickCat(),
            grantYear: 1999,
            citationsReceived: Math.round(40 + (v / hi) * 120 + r() * 30),
            betweenness: sig(v),
        }));
    c.sampledBetweenness = {
        note: "modeled for the finished-estimate screen; every value is an estimate and is shown with ~",
        name: "Betweenness (sampled)",
        // The run the options form offers by default (the largest sample within the time limit), read
        // directed as the graph is: the offered run and the finished one are the same run.
        k: c.betweennessCost.largestKWithinBudget,
        seed: 7,
        directed: true,
        band: c.betweennessCost.sampled.find((x) => x.k === c.betweennessCost.largestKWithinBudget).band,
        estimatedZero: c.nodes - nonzero.length,
        middle: sig(sorted[Math.floor(c.nodes / 2)]),
        middleOfNonzero: sig(nonzero[Math.floor(nonzero.length / 2)]),
        highest: sig(hi),
        histogram12: hist,
        top,
    };
}

// The citation graph's readings, its table, and the two parts of it that draw, for
// screens/past-drawing-limit.html and every other mock of this graph. The full graph is never
// generated, so its overview readings and component sizes are stated here once (and checked to add
// up); the two parts that draw -- the 612 patents a rule keeps, and the degree sample -- are
// generated from their own seed, so no other dataset moves. citationsReceived counts citations from
// every later US patent, so it runs far above a patent's degree inside this 1999-2001 sample.
{
    const c = datasets.citations;
    const r = mulberry32(124318);
    const idStr = (n) => String(n); // patent ids are text, shown and written exactly as loaded: plain digits, no separators
    const cats = Object.entries(c.attributes.find((a) => a.name === "category").values);
    const catPick = () => {
        let x = r() * c.nodes;
        for (const [k, v] of cats) if ((x -= v) < 0) return k;
        return cats[0][0];
    };
    c.attributes.find((a) => a.name === "citationsReceived").range = [0, 779];
    // A degree distribution as the Statistics chart reads it: the count at 0 beside the chart, and
    // the complementary cumulative points [k, nodes with degree >= k] where the count changes.
    const distOf = (deg) => {
        const max = Math.max(...deg);
        const hist = new Array(max + 1).fill(0);
        for (const d of deg) hist[d]++;
        const ccdf = [];
        let above = deg.length - hist[0];
        for (let k = 1; k <= max; k++) {
            if (hist[k] || k === 1) ccdf.push([k, above]);
            above -= hist[k];
        }
        return { zero: hist[0], max, ccdf };
    };
    const inOut = (n, edges) => {
        const i = new Array(n).fill(0), o = new Array(n).fill(0);
        for (const [a, b] of edges) (o[a]++, i[b]++);
        return { in: distOf(i), out: distOf(o), total: distOf(i.map((x, k) => x + o[k])) };
    };

    // Full graph: the General overview's readings and the component-size list.
    const sizes = [116905, 41, 23, 19];
    const comps = 3912;
    const isolates = 2406;
    const restComps = comps - sizes.length - isolates;
    const restNodes = c.nodes - sizes.reduce((a, b) => a + b, 0) - isolates;
    if (restNodes < 2 * restComps || restNodes > sizes[sizes.length - 1] * restComps) throw new Error("citations: component sizes do not add up");
    const hubs = [
        { id: "6117075", degree: 241, grantYear: 2000, category: "Drugs and medical", citationsReceived: 779 },
        { id: "6031111", degree: 198, grantYear: 2000, category: "Computers and communications", citationsReceived: 702 },
        { id: "5960121", degree: 176, grantYear: 1999, category: "Computers and communications", citationsReceived: 655 },
        { id: "6231106", degree: 158, grantYear: 2001, category: "Drugs and medical", citationsReceived: 611 },
        { id: "5987440", degree: 149, grantYear: 1999, category: "Electrical", citationsReceived: 548 },
    ];
    c.stats = {
        density: Number((c.edges / (c.nodes * (c.nodes - 1))).toPrecision(3)),
        averageDegree: round((2 * c.edges) / c.nodes, 1),
        maxDegree: hubs[0].degree,
        components: comps,
        isolates,
        componentSizes: sizes,
        largestShare: round((sizes[0] / c.nodes) * 100, 1),
        componentsMore: comps - sizes.length,
        note: "density is directed, edges / (n (n - 1)); componentsMore counts the isolates too, each a component of one node",
    };
    // The table's first rows, most cited first.
    c.rows = [
        ...hubs.slice(0, 5),
        { id: "6085164", grantYear: 2000, category: "Computers and communications", citationsReceived: 531 },
        { id: "6287586", grantYear: 2001, category: "Drugs and medical", citationsReceived: 517 },
        { id: "5892900", grantYear: 1999, category: "Electrical", citationsReceived: 498 },
        { id: "6116719", grantYear: 2000, category: "Drugs and medical", citationsReceived: 476 },
        { id: "6012088", grantYear: 2000, category: "Computers and communications", citationsReceived: 469 },
        { id: "6242410", grantYear: 2001, category: "Drugs and medical", citationsReceived: 451 },
        { id: "5905233", grantYear: 1999, category: "Mechanical", citationsReceived: 440 },
        { id: "6207936", grantYear: 2001, category: "Drugs and medical", citationsReceived: 433 },
        { id: "5871641", grantYear: 1999, category: "Chemical", citationsReceived: 421 },
        { id: "6288780", grantYear: 2001, category: "Drugs and medical", citationsReceived: 402 },
    ].map(({ degree, ...row }) => row);
    c.profiles = { grantYear: [1999, 2001], category: cats.length, citationsReceived: [0, 779] };

    const usedIds = new Set(c.rows.map((x) => x.id));
    const newId = () => {
        for (;;) {
            const id = idStr(5855000 + Math.floor(r() * 479000));
            if (!usedIds.has(id)) return usedIds.add(id), id;
        }
    };
    const statsOf = (n, edges) => {
        const adj = adjacency(n, edges);
        const seen = new Int32Array(n).fill(-1);
        const compSizes = [];
        for (let i = 0; i < n; i++) {
            if (seen[i] >= 0) continue;
            let size = 0;
            const stack = [i];
            seen[i] = compSizes.length;
            while (stack.length) {
                const v = stack.pop();
                size++;
                for (const w of adj[v]) if (seen[w] < 0) (seen[w] = compSizes.length), stack.push(w);
            }
            compSizes.push(size);
        }
        compSizes.sort((a, b) => b - a);
        const deg = adj.map((l) => l.length);
        return {
            nodes: n,
            edges: edges.length,
            density: Number((edges.length / (n * (n - 1))).toPrecision(3)),
            averageDegree: round((2 * edges.length) / n, 1),
            maxDegree: Math.max(...deg),
            components: compSizes.length,
            isolates: deg.filter((d) => d === 0).length,
            componentSizes: compSizes.filter((s) => s > 1).slice(0, 4),
            largestShare: round((compSizes[0] / n) * 100, 1),
        };
    };
    // A directed drawing: arrows at edge detail, labels culled where they would collide.
    const drawDirected = ({ theme, pos, edges, size, order, labelOf, budget, title }) => {
        const T = THEMES[theme];
        const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">`];
        o.push(`<defs><marker id="arrow" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0L8,4L0,8z" fill="${T.edge}" fill-opacity="0.8"/></marker></defs>`);
        o.push(`<rect width="${W}" height="${H}" fill="${T.canvas}"/>`);
        o.push(`<g stroke="${T.edge}" stroke-width="0.8" stroke-opacity="0.4" marker-end="url(#arrow)">`);
        for (const [s, t] of edges) {
            const [x1, y1] = pos[s];
            const [x2, y2] = pos[t];
            const len = Math.hypot(x2 - x1, y2 - y1) || 1;
            const k = (len - size(t) - 1.5) / len;
            if (k <= 0) continue;
            o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x1 + (x2 - x1) * k)}" y2="${f1(y1 + (y2 - y1) * k)}"/>`);
        }
        o.push(`</g><g fill="${GRAY}">`);
        for (let i = 0; i < pos.length; i++) o.push(`<circle cx="${f1(pos[i][0])}" cy="${f1(pos[i][1])}" r="${f1(size(i))}"/>`);
        o.push(`</g><g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`);
        const placed = [];
        const drawn = [];
        for (const i of order) {
            if (drawn.length >= budget) break;
            const text = labelOf(i);
            const x = pos[i][0] + size(i) + 4;
            const box = [x - 3, pos[i][1] - 11, x + text.length * 7.5 + 3, pos[i][1] + 6];
            if (box[2] > W || placed.some((b) => box[0] < b[2] && b[0] < box[2] && box[1] < b[3] && b[1] < box[3])) continue;
            placed.push(box);
            drawn.push(i);
            o.push(`<text x="${f1(x)}" y="${f1(pos[i][1] + 4)}">${esc(text)}</text>`);
        }
        o.push(`</g></svg>`);
        return { svg: o.join("\n"), drawn };
    };

    // Part 1: the rule "category is Drugs and medical AND citationsReceived >= 25" keeps 612
    // patents: a giant component, a dozen small ones, and patents cited only from outside the rule.
    {
        const N = 612;
        const smallSizes = [2, 2, 2, 3, 2, 4, 2, 3, 5, 2, 3, 6];
        const nIso = 31;
        const nGiant = N - nIso - smallSizes.reduce((a, b) => a + b, 0);
        const edges = [];
        const key = new Set();
        const add = (a, b) => {
            const k = a + ">" + b;
            if (a === b || key.has(k)) return;
            key.add(k);
            edges.push([a, b]);
        };
        // Giant: each newer patent cites older ones, preferring the already cited.
        const pool = [0];
        for (let v = 1; v < nGiant; v++) {
            const k = Math.min(v, 1 + Math.floor(r() * 6));
            for (let j = 0; j < k; j++) {
                const t = pool[Math.floor(r() * pool.length)];
                add(v, t);
                pool.push(t, t, v);
            }
        }
        let next = nGiant;
        for (const s of smallSizes) {
            for (let j = 1; j < s; j++) add(next + j, next + Math.floor(r() * j));
            if (s > 3) add(next + s - 1, next + 1);
            next += s;
        }
        const st = statsOf(N, edges);
        const indeg = new Array(N).fill(0);
        for (const [, t] of edges) indeg[t]++;
        // Ids by citations: the most cited in the sample carry the most citations received.
        const top = c.rows.filter((x) => x.category === "Drugs and medical");
        const rest = [];
        for (let i = top.length; i < N; i++) rest.push({ id: newId(), grantYear: 1999 + Math.floor(r() * 3), category: "Drugs and medical", citationsReceived: 25 + Math.floor(377 * r() ** 3.5) });
        rest.sort((a, b) => b.citationsReceived - a.citationsReceived);
        rest[rest.length - 1].citationsReceived = 25;
        const rows = [...top, ...rest];
        const byIn = [...Array(N).keys()].sort((a, b) => indeg[b] - indeg[a] || a - b);
        const rowOf = new Array(N);
        byIn.forEach((node, k) => (rowOf[node] = rows[k]));
        // The giant laid out on its own at the left; the small components and the isolates packed
        // in a grid at the right, as a force layout's component packing would place them.
        const gpos = layout(nGiant, edges.filter(([a, b]) => a < nGiant && b < nGiant), { strength: -70, distance: 30, ticks: 500 });
        const pos = gpos.map(([x, y]) => [10 + x * 0.78, 88 + y * 0.78]);
        let cell = 0;
        const cellAt = (k) => [985 + (k % 3) * 72, 90 + Math.floor(k / 3) * 44];
        let at = nGiant;
        for (const sz of smallSizes) {
            const [cx, cy] = cellAt(cell++);
            for (let j = 0; j < sz; j++) pos.push(sz === 2 ? [cx + (j ? 9 : -9), cy] : [cx + 13 * Math.cos((2 * Math.PI * j) / sz), cy + 13 * Math.sin((2 * Math.PI * j) / sz)]);
            at += sz;
        }
        for (let j = 0; j < nIso; j++) pos.push(cellAt(cell++));
        const size = (i) => 2.5 + Math.sqrt(indeg[i]) * 0.8;
        let drawnLabels = [];
        emit("citations-narrowed", (theme) => {
            const d = drawDirected({ theme, pos, edges, size, order: byIn, labelOf: (i) => rowOf[i].id, budget: 10, title: "612 patents in Drugs and medical with 25 or more citations received, and the citations between them" });
            drawnLabels = d.drawn;
            return d.svg;
        });
        const years = rows.map((x) => x.grantYear);
        c.narrowed = {
            rule: "category is Drugs and medical AND citationsReceived >= 25",
            ...st,
            rows: rows.slice(0, 20),
            profiles: { grantYear: [Math.min(...years), Math.max(...years)], category: 1, citationsReceived: [25, 779] },
            labeled: drawnLabels.map((i) => rowOf[i].id),
            degreeDistribution: inOut(N, edges),
            drawing: "canvas/citations-narrowed-{theme}.svg",
        };
    }

    // Part 2: the offered step "Top N by degree, with neighbors". Degree is the patent's degree in
    // this sample. N is the largest whose result stays under readableNodes, a stand-in for the
    // element's legibility level, which is proposed and has no value yet.
    {
        const readableNodes = 650;
        const nodes = hubs.map((h) => ({ ...h }));
        const edges = [];
        const key = new Set();
        const add = (a, b) => {
            const k = a + ">" + b;
            if (a === b || key.has(k) || key.has(b + ">" + a)) return;
            key.add(k);
            edges.push([a, b]);
        };
        const nbrs = hubs.map(() => []);
        const hubOf = [];
        hubs.forEach((h, hi) => {
            for (let j = 0; j < h.degree; j++) {
                let v;
                const earlier = nbrs.slice(0, hi).flat();
                if (earlier.length && r() < 0.1) v = earlier[Math.floor(r() * earlier.length)];
                else {
                    v = nodes.length;
                    nodes.push({ id: newId(), grantYear: 1999 + Math.floor(r() * 3), category: catPick(), citationsReceived: Math.floor(180 * r() ** 3) });
                    hubOf[v] = hi;
                }
                if (nbrs[hi].includes(v)) continue;
                nbrs[hi].push(v);
                if (r() < 0.9) add(v, hi);
                else add(hi, v);
            }
            // co-citation: some neighbors of one hub cite each other
            const own = nbrs[hi];
            for (let j = 0; j < own.length * 0.45; j++) add(own[Math.floor(r() * own.length)], own[Math.floor(r() * own.length)]);
        });
        add(2, 1);
        const keepFor = (n) => new Set([...Array(n).keys(), ...nbrs.slice(0, n).flat()]);
        const byN = [1, 2, 3, 4, 5].map((n) => {
            const keep = keepFor(n);
            return { n, nodes: keep.size, edges: edges.filter(([a, b]) => keep.has(a) && keep.has(b)).length };
        });
        const chosen = byN.filter((x) => x.nodes <= readableNodes).pop();
        const keep = [...keepFor(chosen.n)].sort((a, b) => a - b);
        const idx = new Map(keep.map((v, k) => [v, k]));
        const se = edges.filter(([a, b]) => idx.has(a) && idx.has(b)).map(([a, b]) => [idx.get(a), idx.get(b)]);
        const st = statsOf(keep.length, se);
        const deg = adjacency(keep.length, se).map((l) => l.length);
        const pos = layout(keep.length, se, { strength: -34, distance: 22, ticks: 400 });
        const size = (i) => 2.5 + Math.sqrt(deg[i]) * 0.8;
        const order = [...keep.keys()].sort((a, b) => deg[b] - deg[a] || a - b);
        emit("citations-sample", (theme) =>
            drawDirected({ theme, pos, edges: se, size, order, labelOf: (i) => nodes[keep[i]].id, budget: 8, title: `A sample: the top ${chosen.n} patents by total degree and their neighbors` }).svg,
        );
        const rows = keep.map((v) => nodes[v]).sort((a, b) => b.citationsReceived - a.citationsReceived);
        const years = rows.map((x) => x.grantYear);
        const cit = rows.map((x) => x.citationsReceived);
        c.degreeSample = {
            name: `Top ${chosen.n} by total degree, with neighbors`,
            caution: "a sample: favors hubs, so density and clustering read high",
            readableNodes,
            n: chosen.n,
            byN,
            ...st,
            hubs: hubs.slice(0, chosen.n).map(({ id, degree }) => ({ id, degree })),
            degreeDistribution: inOut(keep.length, se),
            hubAnchors: Object.fromEntries(hubs.slice(0, chosen.n).map((h, k) => [h.id, pct(pos[idx.get(k)])])),
            rows: rows.slice(0, 20).map(({ degree, ...row }) => row),
            profiles: { grantYear: [Math.min(...years), Math.max(...years)], category: new Set(rows.map((x) => x.category)).size, citationsReceived: [Math.min(...cit), Math.max(...cit)] },
            drawing: "canvas/citations-sample-{theme}.svg",
        };
    }

    // What the rule editor's count line says for the rules the mocks show. Stated, not computed.
    c.ruleCounts = [
        { rule: "category is Drugs and medical AND citationsReceived >= 25", nodes: c.narrowed.nodes, edges: c.narrowed.edges, draws: true },
        { rule: "citationsReceived >= 5", nodes: 58316, edges: 702440, draws: false },
        { rule: "category is Drugs and medical AND citationsReceived >= 800", nodes: 0, edges: 0, draws: false, highest: 779 },
    ];

    // The full graph's in- and out-degree distributions, for the Statistics chart (log-log
    // complementary cumulative, zero-degree nodes counted beside it). The full graph is never
    // generated, so each is modeled: a power law with an exponential cutoff over 1..max (the cutoff
    // found so the mean is edges / nodes with degree above 0, which thins the tail to single nodes),
    // scaled to those nodes and corrected so the degrees add up to the edge count exactly. The top hub
    // 6,117,075 (total degree 241) is cited 236 times and cites 5. Own seed-free arithmetic, so
    // nothing above moves.
    {
        const model = (zero, kmax, a) => {
            const nz = c.nodes - zero;
            const mean = c.edges / nz;
            const w = (kc) => Array.from({ length: kmax }, (_, i) => (i + 1) ** -a * Math.exp(-(i + 1) / kc));
            const meanOf = (ws) => ws.reduce((t, x, i) => t + x * (i + 1), 0) / ws.reduce((t, x) => t + x, 0);
            let lo = 0.5, hi = 5000;
            for (let it = 0; it < 100; it++) {
                const mid = (lo + hi) / 2;
                if (meanOf(w(mid)) < mean) lo = mid;
                else hi = mid;
            }
            const ws = w(lo);
            const tw = ws.reduce((t, x) => t + x, 0);
            const cnt = ws.map((x) => Math.round((nz * x) / tw));
            cnt[kmax - 1] = Math.max(1, cnt[kmax - 1]);
            cnt[0] += nz - cnt.reduce((t, x) => t + x, 0);
            const d = c.edges - cnt.reduce((t, x, i) => t + x * (i + 1), 0);
            cnt[0] -= d;
            cnt[1] += d;
            if (cnt.reduce((t, x) => t + x, 0) !== nz || cnt.reduce((t, x, i) => t + x * (i + 1), 0) !== c.edges || cnt[0] < 0 || cnt[1] < 0) throw new Error("citations: degree distribution does not add up");
            // CCDF points where the count changes: nodes with degree >= k.
            const ccdf = [];
            let above = nz;
            for (let k = 1; k <= kmax; k++) {
                if (cnt[k - 1] || k === 1) ccdf.push([k, above]);
                above -= cnt[k - 1];
            }
            return { zero, max: kmax, mean: round(c.edges / c.nodes, 1), ccdf };
        };
        c.degreeDistribution = {
            note: "modeled, not computed: the full graph is never generated. in and out each add up to the edge count; zero counts include the 2,406 isolates. total degree has zero 2,406 (the isolates) and max 241",
            in: { ...model(41873, 236, 0.45), maxId: "6117075", zeroMeans: "never cited by a patent in this sample" },
            out: { ...model(29114, 164, 0.3), maxId: "6052618", zeroMeans: "cite no patent in this sample" },
            total: { zero: isolates, max: hubs[0].degree, mean: c.stats.averageDegree, maxId: hubs[0].id },
        };
    }
    // The 2,406 isolates, as the table lists them when the isolates count is opened: the most
    // cited first. citationsReceived counts citations from every later US patent, so an isolate
    // in this sample can still be cited. Own seed, so nothing above moves.
    {
        const ri = mulberry32(2406);
        const rows = [];
        while (rows.length < 15) {
            const id = idStr(5855000 + Math.floor(ri() * 479000));
            if (usedIds.has(id)) continue;
            usedIds.add(id);
            let x = ri() * c.nodes, cat = cats[0][0];
            for (const [k, v] of cats) if ((x -= v) < 0) { cat = k; break; }
            rows.push({ id, grantYear: 1999 + Math.floor(ri() * 3), category: cat, citationsReceived: Math.floor(64 * ri() ** 2.2) });
        }
        rows.sort((a, b) => b.citationsReceived - a.citationsReceived);
        c.isolates = {
            nodes: isolates,
            rows,
            profiles: { grantYear: [1999, 2001], category: cats.length, citationsReceived: [0, rows[0].citationsReceived] },
        };
    }
    c.drawingLimit = 50000;
    c.drawings = { narrowed: c.narrowed.drawing, sample: c.degreeSample.drawing };
    c.note = "Past the node drawing limit nothing is drawn: an empty .k-canvas with the legend's not-drawn line (kit/README.md, Canvas). The two drawings are parts of the graph after a filter step.";
}

// 6. What the tasks and the resting frame read ----------------------------------------------
// No rand() below, so nothing above moves.

// Les Miserables as drawn here has one self-loop (Old Man's edge, on Myriel in the corpus). The
// density over the 253 edges between two different characters is a second number with its own name.
{
    const { deg, edges } = arraysOf.lesmis;
    const loops = edges.filter(([a, b]) => a === b).length;
    const n = deg.length;
    Object.assign(datasets.lesmis.stats, {
        selfLoops: loops,
        densityWithoutSelfLoops: Number(((2 * (edges.length - loops)) / (n * (n - 1))).toPrecision(3)),
    });
}

// The protein file names 300 proteins. The GraphML lists every one; the evidence TSV names the 2
// with no interaction on rows with an empty partner, and the load step loads them unconnected
// (framework-changes.md, "Load step: ... unconnected nodes"). Both load 300.
{
    const { names, deg } = arraysOf.ppi;
    const without = names.filter((_, i) => deg[i] === 0);
    datasets.ppi.load = {
        note: "the GraphML (ppi-core-300.graphml) lists every protein and loads 300 nodes; the evidence TSV names the 2 proteins with no interaction on rows with an empty partner, and they load unconnected, so it loads 300 too. Say it in words: '2 proteins have no partner in the file: GSK3B, NOTCH1. They are loaded unconnected.'",
        proteinsInFile: names.length,
        withInteraction: names.length - without.length,
        withoutInteraction: without,
        graphmlNodes: names.length,
        edgeListNodes: names.length,
    };
}

// A finished Louvain run on the proteins, for the task about groups: confidence read as a
// similarity (a stronger tie pulls harder), resolution 1, seed 7. Communities numbered by size,
// largest first. Each group is compared with the rest of the graph on log2FoldChange, and says which
// module from the file most of its members carry, so a detected group is never mistaken for an
// imported one.
{
    const { n, names, mod, edges, conf, deg, fc } = arraysOf.ppi;
    const seed = 7;
    const nb = weighted(n, edges, conf);
    const comm = louvain(nb, seed);
    const k = Math.max(...comm);
    const mean = (ids) => round(ids.reduce((s, i) => s + fc[i], 0) / ids.length, 2);
    const groups = [];
    for (let c = 1; c <= k; c++) {
        const ids = [...comm.keys()].filter((i) => comm[i] === c);
        const inG = new Set(ids);
        let inside = 0;
        let out = 0;
        for (const [a, b] of edges) {
            if (inG.has(a) && inG.has(b)) inside++;
            else if (inG.has(a) || inG.has(b)) out++;
        }
        const byModule = new Map();
        for (const i of ids) byModule.set(mod[i], (byModule.get(mod[i]) ?? 0) + 1);
        const [mostFromModule, fromThatModule] = [...byModule].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
        const hub = ids.reduce((h, i) => (deg[i] > deg[h] || (deg[i] === deg[h] && names[i] < names[h]) ? i : h), ids[0]);
        groups.push({
            community: c,
            size: ids.length,
            edgesInside: inside,
            edgesOut: out,
            density: ids.length > 1 ? Number(((2 * inside) / (ids.length * (ids.length - 1))).toPrecision(3)) : null,
            meanLog2FoldChange: mean(ids),
            meanLog2FoldChangeRest: mean([...comm.keys()].filter((i) => !inG.has(i))),
            mostFromModule,
            fromThatModule,
            hub: names[hub],
            hubDegree: deg[hub],
            members: ids.map((i) => names[i]),
        });
    }
    datasets.ppi.louvain = {
        note: "a finished Louvain run on the 300 proteins (the task about groups); weighted modularity; a protein with no interaction is a community of its own; mostFromModule is the file's module most members carry, so a detected group is never read as an imported one; meanLog2FoldChange is over the network's own log2FoldChange column",
        algorithm: "Louvain",
        weight: "confidence",
        weightRead: "similarity",
        resolution: 1,
        seed,
        modularity: round(wQ(nb, comm)),
        modularityOfFileModules: datasets.ppi.stats.modularityOfModules,
        communities: k,
        singletons: groups.filter((g) => g.size === 1).length,
        largest: groups[0].size,
        groups,
        community: Object.fromEntries(names.map((g, i) => [g, comm[i]])),
    };
}

// The resting app frame for three datasets (screens/frame-at-rest.html?dataset=<id>): the header,
// the drawing, the legend and the Statistics rows, so the frame never shows a different graph from
// the one the task loads.
function frameOf({ ds, project, graphRow, drawing, alt, drawingSized = drawing, altSized = alt, deg, weight, sizeOf, legend, attributes }) {
    const d = datasets[ds];
    const s = d.stats;
    const max = Math.max(...deg);
    // 19 bars, as the Statistics row draws; a heavy tail (maximum past 100) gets log-spaced bars,
    // or every account lands in the first one.
    const logBars = max > 100;
    const w = Math.ceil((max + 1) / 19);
    const bins = Array(logBars ? 19 : Math.ceil((max + 1) / w)).fill(0);
    for (const x of deg) bins[logBars ? Math.min(18, Math.floor((Math.log1p(x) / Math.log1p(max)) * 19)) : Math.floor(x / w)]++;
    const top = Math.max(...bins);
    const minPos = Math.min(...deg.filter((x) => x > 0));
    const marks = [...new Set([minPos, 10, max])].filter((x) => x <= max).map((x) => ({ degree: x, px: Math.floor(1.5 * sizeOf(x)) }));
    return {
        note: "what screens/frame-at-rest.html shows for this dataset; the degree bars are percent of the tallest bar, 0 draws an empty bar",
        project,
        file: d.file,
        graphRow,
        drawing,
        alt,
        // The same view once the reader adds size by degree (the frame's "Size added" state).
        drawingSized,
        altSized,
        nodes: d.nodes,
        edges: d.edges,
        edgesLine: `${d.directed ? "directed" : "undirected"}; ${weight ? `${weight}, not used yet` : "no numeric edge column"}`,
        density: s.density,
        componentsName: d.directed ? "Weak components" : "Connected components",
        components: `${s.components.toLocaleString("en-US")}${s.isolated ? ` (${s.isolated} isolate${s.isolated === 1 ? "" : "s"})` : ""}`,
        degreeName: d.directed ? "Total degree distribution" : "Degree distribution",
        degreeBars: bins.map((c) => Math.round((c / top) * 100)),
        degreeLabel: `${d.directed ? "Total degree" : "Degree"} ${Math.min(...deg)} to ${max}, ${logBars ? "in log-spaced bars" : `in bars of ${w}`}`,
        attributes,
        legend,
        sizeMarks: legend ? marks : null,
    };
}
{
    const L = datasets.lesmis;
    const groups = L.attributes.find((a) => a.name === "group").values;
    const shown = Object.entries(L.groupColors).filter(([, c]) => c !== OTHER).sort((a, b) => OKABE_ITO.indexOf(a[1]) - OKABE_ITO.indexOf(b[1]));
    const other = Object.keys(L.groupColors).filter((g) => L.groupColors[g] === OTHER);
    L.frame = frameOf({
        ds: "lesmis",
        project: "Les Miserables",
        graphRow: "Co-appearances",
        drawing: "canvas/lesmis-groups-onesize-{theme}.svg",
        alt: "Les Miserables colored by group, nothing selected",
        drawingSized: "canvas/lesmis-groups-rest-{theme}.svg",
        altSized: "Les Miserables colored by group, sized by number of connections, nothing selected",
        deg: arraysOf.lesmis.deg,
        weight: "value",
        sizeOf: (x) => 4 + Math.sqrt(x) * 2,
        attributes: 3,
        legend: {
            title: "Group color",
            sizeTitle: "Size: degree",
            rows: shown.map(([g, color]) => ({ label: g, color, count: groups[g] })),
            other: { label: "Other", color: OTHER, count: other.reduce((a, g) => a + groups[g], 0), title: `Groups ${other.slice(0, -1).join(", ")} and ${other.at(-1)}` },
        },
    });
    const P = datasets.ppi;
    const mods = P.attributes.find((a) => a.name === "module").values;
    const order = Object.keys(P.moduleColors).filter((m) => m !== "Unassigned").sort((a, b) => mods[b] - mods[a] || a.localeCompare(b));
    P.frame = frameOf({
        ds: "ppi",
        project: "Human protein interactions",
        graphRow: "Interactions",
        drawing: "canvas/ppi-modules-onesize-{theme}.svg",
        alt: "Protein interactions colored by module, nothing selected",
        drawingSized: "canvas/ppi-modules-rest-{theme}.svg",
        altSized: "Protein interactions colored by module, sized by number of connections, nothing selected",
        deg: arraysOf.ppi.deg,
        weight: "confidence",
        sizeOf: (x) => 3 + Math.sqrt(x) * 1.4,
        attributes: 4,
        legend: {
            title: "Module color",
            sizeTitle: "Size: degree",
            rows: order.map((m) => ({ label: m, color: P.moduleColors[m], count: mods[m] })),
            other: { label: "Other", color: OTHER, count: mods.Unassigned, title: "Unassigned: no module in the file" },
        },
    });
    const T = datasets.transactions;
    T.frame = frameOf({
        ds: "transactions",
        project: "Transfers, March 2026",
        graphRow: T.graphName,
        drawing: "canvas/transactions-density-{theme}.svg",
        alt: "3,000 accounts shown as density",
        deg: arraysOf.transactions.deg,
        weight: "amount",
        sizeOf: () => 4,
        attributes: T.attributes.length,
        legend: null, // no style layer yet: density is how a graph this size draws, not a layer
    });
}

// The protein graph filtered to its largest module, "Filter to module = Ribosome": what the filter
// chip, Statistics and the table show after that one step (the read-the-numbers task). Degree is
// read on the filtered graph; degreeFull is the same protein's degree on the full graph. No rand().
{
    const P = datasets.ppi;
    const { n, names, mod, edges, deg } = arraysOf.ppi;
    const [module] = Object.entries(P.attributes.find((a) => a.name === "module").values).filter(([m]) => m !== "Unassigned").sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
    const keep = [...Array(n).keys()].filter((i) => mod[i] === module);
    const at = new Map(keep.map((i, j) => [i, j]));
    const sub = edges.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b]) => [at.get(a), at.get(b)]);
    const adj = adjacency(keep.length, sub);
    const fdeg = adj.map((l) => l.length);
    const top = keep.map((i, j) => ({ id: names[i], degree: fdeg[j], degreeFull: deg[i] })).sort((a, b) => b.degree - a.degree || b.degreeFull - a.degreeFull || a.id.localeCompare(b.id));
    P.filtered = {
        note: "the protein graph after one filter step, Filter to module = <module>; counts are on the filtered graph unless named Full",
        step: `Filter to module = ${module}`,
        module,
        steps: 1,
        of: n,
        nodes: keep.length,
        tookOut: n - keep.length,
        edges: sub.length,
        edgesOf: edges.length,
        edgesLeavingModule: edges.filter(([a, b]) => at.has(a) !== at.has(b)).length,
        stats: summary(adj, sub.length),
        degreeRange: [Math.min(...fdeg), Math.max(...fdeg)],
        topByDegree: top.slice(0, 10),
    };
}

// The protein evidence file (ppi-core-300-evidence.tsv) as it loads with Keep all: its own
// dataset, so the screens after its load step show this file and never the GraphML. One row per
// pair and evidence source, so 2,298 edges among 300 proteins, 2 of them unconnected (1,036 of the edges parallel to another
// row); no module or fold-change column; confidence is text because 150 scores are NA, so there
// is no weight until the reader says how to read it.
{
    const P = datasets.ppi;
    const { names, edges, deg: pdeg } = arraysOf.ppi;
    const ev = P.evidence;
    const inFile = names.map((_, i) => i); // every protein: the 2 with no partner load unconnected
    const at = new Map(inFile.map((i, j) => [i, j]));
    // One edge per row: each pair once per evidence source that reports it.
    const adjM = inFile.map(() => []);
    edges.forEach(([a, b], k) => {
        for (let r = 0; r < arraysOf.ppi.rowsPerEdge[k]; r++) adjM[at.get(a)].push(at.get(b)), adjM[at.get(b)].push(at.get(a));
    });
    const n = inFile.length;
    const m = adjM.reduce((x, l) => x + l.length, 0) / 2;
    const deg = adjM.map((l) => l.length);
    const pairs = new Set();
    adjM.forEach((l, i) => l.forEach((j) => pairs.add(i < j ? `${i},${j}` : `${j},${i}`)));
    const simple = inFile.map((_, i) => [...new Set(adjM[i])]);
    datasets.ppiEvidence = {
        title: "Human protein interactions, per evidence source",
        file: ev.file,
        source: "the protein network exported one row per pair and evidence source (STRING's channels), loaded with Keep all",
        loadedWith: { parallelEdges: "keep all", na: "read as missing", weight: "none: confidence is text (NA scores)", nodesFrom: "the two protein columns" },
        nodes: n,
        edges: m,
        pairs: pairs.size,
        parallelEdges: m - pairs.size,
        naScores: ev.naCount,
        directed: false,
        notInFile: P.load.withoutInteraction,
        attributes: [
            { name: "id (protein)", kind: "text" },
            { name: "source (edge)", kind: "category", values: ev.bySource },
            { name: "confidence (edge)", kind: "text", note: `${ev.naCount} rows read NA` },
        ],
        stats: { ...summary(simple, pairs.size), note: "components, density and isolated count the 1,262 distinct pairs; degree counts every row (parallel edges included)", averageDegree: round((2 * m) / n, 2), maxDegree: Math.max(...deg) },
        drawings: { plain: "canvas/ppi-evidence-plain-{theme}.svg" },
    };
    arraysOf.ppiEvidence = { deg };
    datasets.ppiEvidence.frame = frameOf({
        ds: "ppiEvidence",
        project: "Human protein interactions",
        graphRow: "Evidence rows",
        drawing: "canvas/ppi-evidence-plain-{theme}.svg",
        alt: `Protein interactions from the evidence file, ${n} proteins, unstyled`,
        deg,
        weight: null,
        sizeOf: () => 4,
        attributes: 2,
        legend: null,
    });
    datasets.ppiEvidence.frame.edgesLine = `undirected, ${(m - pairs.size).toLocaleString("en-US")} parallel; no numeric edge column`;
    if (pairs.size !== P.edges || n !== P.load.edgeListNodes || m !== ev.rows) throw new Error(`ppiEvidence: ${n} nodes, ${m} rows, ${pairs.size} pairs disagree with the load step`);
}

// One fixture per study task: the dataset the task's screens show from the first screen to the
// last, the file the participant opens, and the numbers the task turns on. "refs" point into this
// file; kit/check.mjs fails when one does not resolve. Pages bind these with data-fx
// (kit/README.md, "Numbers on a page").
// The alert queue's month lives in kit/alerts.json (gen-alerts.mjs); this entry names it, so a task
// can say which dataset its screens show. Read only when alerts.json exists.
try {
    const al = JSON.parse(readFileSync(join(here, "alerts.json"), "utf8")).august;
    datasets.alertsAugust = { title: al.title, file: al.file, alertsFile: al.alertsFile, accountsFile: al.accountsFile, nodes: al.nodes, edges: al.edges, directed: al.directed, alerts: al.alerts.length, seed: al.seed.id, numbers: "kit/alerts.json, august",
        seedFacts: { degree: al.seed.degree, riskScore: al.seed.riskScore, riskScoreFrom: al.accountsFile, alertId: al.seed.alertId, alertRule: al.seed.alertScenario, alertTime: al.seed.alertTime, alertFrom: al.alertsFile } };
} catch {
    /* no alerts.json yet: run gen-alerts.mjs, then this again */
}
const tasks = {};
{
    const P = datasets.ppi;
    const L = datasets.lesmis;
    const T = datasets.transactions;
    const A = datasets.transactionsApril;
    const C = datasets.citations;
    const flagged = T.flaggedAccounts.find((a) => a.id === "ACC-365386");
    const add = (id, t) => (tasks[id] = t);
    add("worth-an-afternoon", {
        question: "A colleague sent this file. Is it worth an afternoon?",
        dataset: "ppiEvidence",
        file: P.evidence.file,
        facts: { proteinsInFile: P.load.proteinsInFile, nodes: P.load.edgeListNodes, withoutInteraction: P.load.withoutInteraction, rows: P.evidence.rows, pairs: P.evidence.pairs, extraParallelEdges: P.evidence.extraParallelEdges, naScores: P.evidence.naCount },
        refs: ["datasets.ppi.load", "datasets.ppi.evidence", "datasets.ppiEvidence.frame"],
    });
    add("data-stays-here", {
        question: "Is it OK to use on real data, and did anything just leave this computer?",
        dataset: "ppi",
        file: P.file,
        facts: { nodes: P.nodes, edges: P.edges },
        refs: ["datasets.ppi.frame"],
    });
    add("who-matters", {
        question: "Who matters most in this network, and how sure are you?",
        dataset: "ppi",
        file: P.file,
        facts: { measure: "betweenness", exact: true, weighted: false, top: P.topByBetweenness.slice(0, 5).map((r) => ({ id: r.id, betweenness: r.betweenness })) },
        refs: ["datasets.ppi.topByBetweenness", "datasets.ppi.inspector"],
    });
    add("groups-differ", {
        question: "What groups are there, and how does the biggest one differ from the rest?",
        dataset: "ppi",
        file: P.file,
        facts: (({ algorithm, seed, resolution, modularity, communities, singletons, weight, weightRead }) => ({ algorithm, seed, resolution, modularity, communities, singletons, weight, weightRead, biggest: (({ community, size, edgesInside, edgesOut, meanLog2FoldChange, meanLog2FoldChangeRest, mostFromModule, fromThatModule }) => ({ community, size, edgesInside, edgesOut, meanLog2FoldChange, meanLog2FoldChangeRest, mostFromModule, fromThatModule }))(P.louvain.groups[0]) }))(P.louvain),
        refs: ["datasets.ppi.louvain"],
    });
    add("quiet-weight-trap", {
        question: "Something about these rankings bothers a reviewer. Can the numbers be trusted?",
        dataset: "lesmis",
        file: L.file,
        facts: { weight: "value", weightMeans: "co-appearance count: a bigger number is a stronger tie", top: L.topByBetweenness.slice(0, 3).map((r) => ({ label: r.label, betweenness: r.betweenness })) },
        refs: ["datasets.lesmis.topByBetweenness", "datasets.lesmis.frame"],
    });
    // Shown on the transfers pages of the alert-triage storyboard (the August month, where the
    // account's own transfers, their times and the alert's columns are on screen). The March
    // transactions stand-ins showed none of that.
    const AA = datasets.alertsAugust;
    add("flagged-account", AA ? {
        question: `Account ${AA.seed} was flagged. Clear it, or refer it?`,
        dataset: "alertsAugust",
        file: AA.file,
        facts: { account: AA.seed, ...AA.seedFacts, accountsFile: AA.accountsFile, alertsFile: AA.alertsFile, alerts: AA.alerts, evidence: "Export the selection's edges: the account's own transfers" },
        refs: ["datasets.alertsAugust.seedFacts"],
    } : {
        question: `Account ${flagged.id} was flagged. Clear it, or refer it?`,
        dataset: "transactions",
        file: T.file,
        facts: { account: flagged.id, degree: flagged.degree, riskScore: flagged.riskScore, riskScoreFrom: T.accountsFile, alertRule: flagged.alertRule, alertTime: flagged.alertTime, flaggedAccounts: T.flaggedAccounts.length, alertQueue: "kit/alerts.json, august: the same account opens the queue there" },
        refs: ["datasets.transactions.flaggedAccounts", "datasets.transactions.anchors.flagged"],
    });
    add("too-big-to-draw", {
        question: "This citation data is too big to draw. Is anything here worth a look?",
        dataset: "citations",
        file: C.file,
        facts: { nodes: C.nodes, edges: C.edges, drawingLimit: C.drawingLimit, narrowedNodes: C.narrowed.nodes, narrowedEdges: C.narrowed.edges },
        refs: ["datasets.citations.stats", "datasets.citations.narrowed", "datasets.citations.ruleCounts"],
    });
    add("narrow-or-paint", {
        question: "Look only at the characters with 5 or more co-appearance partners. How many are there, and who matters most among them?",
        dataset: "lesmis",
        file: L.file,
        facts: { nodes: L.nodes, components: L.stats.components, degreeAtLeast5: L.rows.filter((r) => r.degree >= 5).length },
        refs: ["datasets.lesmis.filterSteps"],
    });
    add("figure-for-reviewer", {
        question: "Make a figure a reviewer can read, even printed in gray.",
        dataset: "ppi",
        file: P.file,
        facts: { column: "log2FoldChange", range: P.attributes.find((a) => a.name === "log2FoldChange").range, otherColumn: "log2FC (this week's qPCR file)", otherRange: P.expression.allRows.range },
        refs: ["datasets.ppi.encodings", "datasets.ppi.expression"],
    });
    add("get-back", {
        question: "After your last few actions the numbers changed in a way you did not expect. Get back to where you were.",
        dataset: "lesmis",
        file: L.file,
        facts: { nodes: L.nodes, edges: L.edges },
        refs: ["datasets.lesmis.filterSteps"],
    });
    add("rankings-agree", {
        question: "Do these two ways of scoring agree on who matters?",
        dataset: "transactionsApril",
        file: A.files.transfers.file,
        facts: { measures: ["pagerank", "betweenness"], accounts: A.nodes },
        refs: ["datasets.transactionsApril.pagerank"],
    });
    add("this-weeks-export", {
        question: "Redo last week's export on this week's data, and show what changed.",
        dataset: "transactionsApril",
        file: A.files.transfers.file,
        facts: { accountsFile: A.files.accounts.file, accounts: A.nodes, transfers: A.edges },
        refs: ["datasets.transactionsApril.versionDiff", "datasets.transactionsApril.louvain"],
    });
    add("use-colleagues-file", {
        question: "Use your lab lead's recipe on your gene list.",
        dataset: "ppi",
        file: P.expression.file,
        facts: { rows: P.expression.rows, matched: P.expression.matched, unmatched: P.expression.unmatchedCount },
        refs: ["datasets.ppi.expression"],
    });
    add("share-without-data", {
        question: "Share your setup with a partner, without your data.",
        dataset: "ppi",
        file: P.file,
        facts: { nodes: P.nodes },
        refs: ["datasets.ppi.frame"],
    });
    // The keyboard walk runs on the protein graph the walk mock loads (TP53 and its neighbors), so
    // the task never asks for a node the screen does not hold.
    const tp53 = P.topByDegree.find((r) => r.id === "TP53");
    add("keyboard-walk", {
        question: "Keyboard only: walk from TP53 and select two of its neighbors.",
        dataset: "ppi",
        file: P.file,
        facts: { start: "TP53", degree: tp53.degree, neighbors: P.tp53Slice.nodes - 1 },
        refs: ["datasets.ppi.tp53Slice"],
    });
    add("how-connected", {
        question: `How is ${T.setsAndPaths.path.from.id} connected to ${T.setsAndPaths.path.to.id}?`,
        dataset: "transactions",
        file: T.file,
        facts: { from: T.setsAndPaths.path.from.id, to: T.setsAndPaths.path.to.id, hops: T.setsAndPaths.path.hops, equallyShort: T.setsAndPaths.path.equallyShort },
        refs: ["datasets.transactions.setsAndPaths.path"],
    });
    add("costly-measure", {
        question: "Measure who bridges groups on the whole citation graph.",
        dataset: "citations",
        file: C.file,
        facts: { nodes: C.nodes, edges: C.edges },
        refs: ["datasets.citations.betweennessCost", "datasets.citations.sampledBetweenness"],
    });
    add("remember-why", {
        question: "Leave yourself a note on why you kept these accounts.",
        dataset: "transactions",
        file: T.file,
        facts: { kept: T.flaggedAccounts.length },
        refs: ["datasets.transactions.flaggedAccounts"],
    });
    // Round 2's new tasks: every scenario the study runs has its own numbers here.
    const mods = P.attributes.find((a) => a.name === "module").values;
    const bigModule = Object.entries(mods).filter(([m]) => m !== "Unassigned").sort((x, y) => y[1] - x[1])[0];
    add("did-anything-leave", {
        question: "Your IT reviewer asks whether this tool sends data anywhere. Answer from the app, then again after running a data-source query, and forward something they can read.",
        dataset: "transactions",
        file: T.file,
        facts: { nodes: T.nodes, edges: T.edges },
        refs: ["datasets.transactions.frame"],
    });
    add("fix-wrong-middle-step", {
        question: "Of three filter steps, the second removed the wrong group. Fix it without losing the third.",
        dataset: "lesmis",
        file: L.file,
        facts: { steps: L.filterSteps.steps, after: L.filterSteps.after },
        refs: ["datasets.lesmis.filterSteps"],
    });
    if (datasets.alertsAugust) {
        add("flagged-account-from-alert", {
            question: `An alert names account ${datasets.alertsAugust.seed}. Start from the alert and decide whether its neighborhood is suspicious.`,
            dataset: "alertsAugust",
            file: datasets.alertsAugust.file,
            facts: { account: datasets.alertsAugust.seed, alerts: datasets.alertsAugust.alerts, numbers: "kit/alerts.json, august" },
            refs: ["datasets.alertsAugust"],
        });
    }
    add("groups-differ-finished", {
        question: "Community detection has finished. Say what groups it found, how good the split is, and whether you could reproduce it.",
        dataset: "ppi",
        file: P.file,
        facts: tasks["groups-differ"].facts,
        refs: ["datasets.ppi.louvain"],
    });
    add("how-connected-by-amount", {
        question: "Starting from two selected accounts, find how they are connected, weighted by amount, and get the transfers with amounts and dates out.",
        dataset: "transactions",
        file: T.file,
        facts: { from: T.setsAndPaths.path.from.id, to: T.setsAndPaths.path.to.id, weight: "amount" },
        refs: ["datasets.transactions.setsAndPaths.path"],
    });
    add("keyboard-walk-shift-arrow", {
        question: "Using only the keyboard, find TP53, walk to its most connected neighbor and back, and select two of its neighbors.",
        dataset: "ppi",
        file: P.file,
        facts: { start: "TP53", degree: tp53.degree, keys: "Shift+Arrow walks, Shift+Enter goes back, Esc leaves; plain arrows move the camera" },
        refs: ["datasets.ppi.tp53Slice"],
    });
    add("print-ready-grey", {
        question: "A reviewer wants the fold-change figure in grayscale, readable by a color-blind reader, with the top 10 labeled.",
        dataset: "ppi",
        file: P.file,
        facts: tasks["figure-for-reviewer"].facts,
        refs: ["datasets.ppi.encodings", "datasets.ppi.expression"],
    });
    add("rankings-agree-scatter", {
        question: "Do these two ways of scoring agree on who matters? Show it in a way you could put in a report.",
        dataset: "transactionsApril",
        file: A.files.transfers.file,
        facts: { measures: ["pagerank", "betweenness"], accounts: A.nodes },
        refs: ["datasets.transactionsApril.pagerank"],
    });
    add("read-the-numbers", {
        question: `You loaded ${P.nodes} proteins and filtered to one module. Explain every count on screen, and why the node count is not ${P.nodes}.`,
        dataset: "ppi",
        file: P.file,
        facts: { nodes: P.nodes, edges: P.edges, module: bigModule[0], moduleSize: bigModule[1], filteredEdges: P.filtered.edges },
        refs: ["datasets.ppi.frame", "datasets.ppi.attributes", "datasets.ppi.filtered"],
    });
    add("top-50-to-excel", {
        question: "Get the top 50 nodes by betweenness into Excel or pandas with their original ids, and say how sure you are of the order.",
        dataset: "ppi",
        file: P.file,
        facts: { measure: "betweenness", n: 50, nodes: P.nodes },
        refs: ["datasets.ppi.topByBetweenness"],
    });
    add("weekly-refresh-replace", {
        question: "This week's export arrived. Bring it in so last week's findings carry over, and export the updated table.",
        dataset: "transactionsApril",
        file: A.files.transfers.file,
        facts: tasks["this-weeks-export"].facts,
        refs: ["datasets.transactionsApril.versionDiff"],
    });
    add("weight-at-first-run", {
        question: "Run PageRank on a network whose edges have a confidence column you have never thought about.",
        dataset: "ppi",
        file: P.file,
        facts: { measure: "pagerank", weight: "confidence" },
        refs: ["datasets.ppi.frame"],
    });
    // The screens each task shows, first to last. kit/check.mjs --tasks opens each with ?task=<id>
    // and fails when one draws or names another dataset: the screen after Load is always the file
    // just loaded, and no task borrows another project's screen.
    const PAGES = {
        "worth-an-afternoon": ["screens/start-screen.html", "screens/load-step.html#blocked", "screens/load-step.html#policy", "screens/frame-at-rest.html"],
        "data-stays-here": ["screens/start-screen.html", "screens/frame-at-rest.html", "screens/data-location.html"],
        "did-anything-leave": ["screens/frame-at-rest.html", "screens/start-screen.html", "screens/data-location.html"],
        "who-matters": ["screens/frame-at-rest.html", "screens/results-panel.html#new-project", "screens/results-panel.html#finished", "screens/results-panel.html#in-the-table", "screens/inspector.html#one-node"],
        "groups-differ": ["screens/results-panel.html#louvain", "screens/results-panel.html#louvain-table", "screens/styles-list.html", "screens/inspector.html#set", "screens/table-dock.html#ranked"],
        "groups-differ-finished": ["screens/results-panel.html#louvain", "screens/results-panel.html#louvain-table", "screens/table-dock.html#ranked"],
        "quiet-weight-trap": ["screens/weight-role-trap.html"],
        "flagged-account": datasets.alertsAugust
            ? ["open", "seed-find", "seed-menu", "seed-hop1", "seed-own", "seed-refer", "seed-evidence", "next-delete", "file"].map((s) => `screens/alert-triage.html#${s}`)
            : ["screens/find-and-expand.html#t-find", "screens/find-and-expand.html#t-grow", "screens/inspector.html#cap", "screens/take-a-note.html", "screens/export-dialog.html#table"],
        "flagged-account-from-alert": ["screens/alert-triage.html"],
        "too-big-to-draw": ["screens/past-drawing-limit.html", "screens/find.html#s7", "screens/table-dock.html#limit"],
        "costly-measure": ["screens/option-form-cost.html#within-budget", "screens/option-form-cost.html#sample-over-budget", "screens/results-panel.html#refused", "screens/results-panel.html#finished-sampled", "screens/past-drawing-limit.html"],
        "narrow-or-paint": ["screens/frame-at-rest.html", "screens/filter-chip.html", "screens/results-panel.html#filtered"],
        "figure-for-reviewer": ["screens/styles-list.html", "screens/colour-by-value.html", "screens/export-dialog.html#figure", "screens/export-dialog.html#figure-grey"],
        "print-ready-grey": ["screens/styles-list.html", "screens/colour-by-value.html", "screens/export-dialog.html#figure-grey", "screens/export-dialog.html#first-release"],
        "get-back": ["screens/undo.html", "screens/filter-chip.html"],
        "fix-wrong-middle-step": ["screens/undo.html", "screens/filter-chip.html"],
        "rankings-agree": ["screens/comparison.html", "screens/table-dock.html#large"],
        "rankings-agree-scatter": ["screens/comparison.html", "screens/table-dock.html#large"],
        "this-weeks-export": ["screens/version-history.html", "screens/load-step.html#add-data", "screens/comparison.html", "screens/export-dialog.html#table"],
        "weekly-refresh-replace": ["screens/weekly-return.html", "screens/version-history.html", "screens/table-dock.html#large"],
        "use-colleagues-file": ["screens/start-screen.html", "screens/recipe-apply.html#start", "screens/recipe-apply.html#applied"],
        "share-without-data": ["screens/export-dialog.html#recipe"],
        "keyboard-walk": ["screens/keyboard-walk.html", "screens/inspector.html#one-node"],
        "keyboard-walk-shift-arrow": ["screens/keyboard-walk.html", "screens/inspector.html#one-node"],
        "how-connected": ["screens/find-and-expand.html#t-find", "screens/inspector.html#cap", "screens/sets-and-paths.html"],
        "how-connected-by-amount": ["screens/inspector.html#cap", "screens/sets-and-paths.html", "screens/table-dock.html#selected"],
        "remember-why": ["screens/take-a-note.html"],
        "read-the-numbers": ["screens/load-step.html#graphml", "screens/frame-at-rest.html", "screens/filter-chip.html#proteins", "screens/results-panel.html#finished"],
        "top-50-to-excel": ["screens/results-panel.html#finished", "screens/results-panel.html#in-the-table", "screens/table-dock.html#ranked"],
        "weight-at-first-run": ["screens/option-form-cost.html#weight-refused", "screens/option-form-cost.html#weight-meaning", "screens/results-panel.html#finished"],
    };
    for (const [id, pages] of Object.entries(PAGES)) if (tasks[id]) tasks[id].pages = pages;
    const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), { datasets });
    for (const [id, t] of Object.entries(tasks)) {
        if (!t.pages) throw new Error(`task ${id}: no pages`);
        if (!datasets[t.dataset]) throw new Error(`task ${id}: no dataset ${t.dataset}`);
        for (const r of t.refs) if (get(r) === undefined) throw new Error(`task ${id}: ${r} does not resolve`);
    }
}

// scenarios: the numbers one scenario needs beyond the datasets (a comparison's ranks, a table's
// 3,000 rows, NetworkX runs), each written here by its own script (screens/*-numbers.*), so every
// number a page shows lives in this one file. Kept as they are when this file is regenerated.
// (The scenario scripts copy this file and point its write at a scratch folder by the text of the
// write call below, so the read here must not repeat that text.)
const fixturesFile = join(here, "fixtures.json");
let scenarios = {};
try {
    scenarios = JSON.parse(readFileSync(fixturesFile, "utf8")).scenarios ?? {};
} catch {
    /* first run */
}
writeFileSync(
    join(here, "fixtures.json"),
    JSON.stringify(
        {
            generatedBy: "kit/gen-canvas.mjs -- regenerate instead of editing by hand",
            canvas: { light: THEMES.light.canvas, dark: THEMES.dark.canvas, nodeGray: GRAY, otherGray: OTHER, categorical: OKABE_ITO, viewBox: [W, H] },
            datasets,
            tasks,
            scenarios,
        },
        null,
        1,
    ),
);
console.log(`wrote ${svgs.length * 2} SVGs (${svgs.join(", ")}) and fixtures.json`);
for (const [k, d] of Object.entries(datasets)) console.log(`${k}: ${d.nodes} nodes, ${d.edges} edges`);
