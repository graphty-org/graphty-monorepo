// Generates the alert-triage fixture: kit/alerts.json and the kit/canvas/alerts-*.svg drawings.
// Run: node kit/gen-alerts.mjs (from design/ui/prototype/; about ten seconds).
//
// Two graphs from one fixed seed, so every number a mock quotes is computed, never stated:
// - "August transfers": 3,000 accounts, 50 of them alerted by the bank's transaction monitoring.
//   Like real monitoring output, most alerts are benign (tuition just under 10,000 USD, payroll
//   runs, one big supplier, salary in and rent out the same day, new accounts). One 12-account
//   mule ring passes transfers of 9,000 to 9,999 USD around and cashes out through a money
//   transfer service; 8 of its members are alerted, 4 are not (they cash out just under 9,000,
//   below the structuring rule). Riskscore alone does not separate the ring either.
// - "The whole bank's August": 1,000,000 accounts that contain the 3,000 above unchanged, past
//   the drawing limit. Only counted.
//
// It reuses gen-canvas.mjs's helpers (seeded random, layout, marks, label culling) by loading
// the part of that file above its datasets, so both generators draw alike. It does not touch
// kit/fixtures.json.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "gen-canvas.mjs"), "utf8");
const helpers = src
    .slice(0, src.indexOf("// ---------- datasets ----------"))
    .replace("const here = dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(here)};`);
const tmp = join(tmpdir(), `gen-canvas-helpers-${process.pid}.mjs`);
writeFileSync(tmp, helpers + "\nexport { mulberry32, adjacency, components, layout, ring, cullLabels, contrast, THEMES, OKABE_ITO, GRAY, W, H, f1, esc };\n");
const { mulberry32, adjacency, components, layout, ring: markRing, cullLabels, contrast, THEMES, OKABE_ITO, GRAY, W, H, f1, esc } = await import(pathToFileURL(tmp).href);
unlinkSync(tmp);

const VERM = OKABE_ITO[4];
const r = mulberry32(20260801);
const round2 = (x) => Math.round(x * 100) / 100;
const pct = ([x, y]) => ({ x: Math.round((x / W) * 1000) / 10, y: Math.round((y / H) * 1000) / 10 });
const shuffle = (a) => {
    for (let j = a.length - 1; j > 0; j--) {
        const t = Math.floor(r() * (j + 1));
        [a[j], a[t]] = [a[t], a[j]];
    }
    return a;
};

// ---------- the August graph ----------
const n = 3000;
const kinds = Array.from({ length: n }, (_, i) => (i < 60 ? "merchant" : i < 390 ? "business" : "personal"));
const COUNTRIES = ["US", "US", "US", "GB", "DE", "FR", "NL", "IN", "BR", "NG", "PH", "MX"];
const country = kinds.map((_, i) => (i < 60 ? COUNTRIES[i % COUNTRIES.length] : COUNTRIES[Math.floor(r() * COUNTRIES.length)]));
const MCATS = ["Groceries", "Online marketplace", "Groceries", "Fuel", "Telecom", "Restaurants", "Pharmacy", "Utilities", "Clothing", "Electronics", "Streaming", "Travel", "Furniture", "Sporting goods", "Books"];
const BCATS = ["Construction", "Retail", "Logistics", "Consulting", "Hospitality", "Wholesale", "Healthcare", "IT services"];
const CASHOUT = 57;
const UNIS = [58, 59];
const category = kinds.map((k, i) => (k === "merchant" ? (i === CASHOUT ? "Money transfer" : UNIS.includes(i) ? "Education" : MCATS[i % MCATS.length]) : k === "business" ? BCATS[i % BCATS.length] : ""));
const used = new Set(["ACC-365386"]);
const newId = () => {
    for (;;) {
        const id = `ACC-${100000 + Math.floor(r() * 899999)}`;
        if (!used.has(id)) return used.add(id), id;
    }
};
const ids = kinds.map(() => newId());

const ringIdx = Array.from({ length: 12 }, (_, k) => 2990 - k * 41);
ids[ringIdx[0]] = "ACC-365386";
const seed = ringIdx[0];
const inRing = new Set(ringIdx);
const special = new Set(ringIdx);
const personalPool = () => {
    for (;;) {
        const p = 390 + Math.floor(r() * (n - 390));
        if (!special.has(p)) return p;
    }
};
const pickSpecial = () => {
    const p = personalPool();
    special.add(p);
    return p;
};

const key = new Set();
const edges = [];
const amount = [];
const add = (a, b, amt) => {
    const k = `${a}-${b}`;
    if (a === b || key.has(k) || key.has(`${b}-${a}`)) return false;
    key.add(k);
    edges.push([a, b]);
    amount.push(round2(amt));
    return true;
};
const merchantWeight = Array.from({ length: 57 }, (_, m) => 1 / (m + 1) ** 0.9);
const wsum = merchantWeight.reduce((a, b) => a + b, 0);
const pickMerchant = () => {
    let x = r() * wsum;
    for (let m = 0; m < 57; m++) if ((x -= merchantWeight[m]) <= 0) return m;
    return 56;
};

// The special accounts are chosen first so ordinary traffic never lands on the ring.
const tuition = Array.from({ length: 9 }, pickSpecial);
const distractor = pickSpecial();
const rapid = Array.from({ length: 10 }, pickSpecial);
const newAcct = Array.from({ length: 6 }, pickSpecial);
const businesses = shuffle(Array.from({ length: 330 }, (_, k) => 60 + k));
const payroll = businesses.slice(0, 8);
const supplier = businesses.slice(8, 16);
const noisyHigh = Array.from({ length: 12 }, pickSpecial);

for (let i = 390; i < n; i++) {
    if (inRing.has(i)) continue;
    const k = 1 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
        let m = pickMerchant();
        for (let t = 0; t < 30 && r() > 0.2 && country[m] !== country[i]; t++) m = pickMerchant();
        add(i, m, 5 + r() ** 2 * 400);
    }
    if (r() < 0.35) {
        let p = personalPool();
        for (let t = 0; t < 30 && country[p] !== country[i]; t++) p = personalPool();
        add(i, p, 10 + r() * 250);
    }
}
for (let b = 60; b < 390; b++) {
    const staff = 3 + Math.floor(r() * 12);
    for (let j = 0; j < staff; j++) add(b, personalPool(), 1800 + r() * 4200);
    add(b, pickMerchant(), 200 + r() * 7500);
}
// the ring: each member pays the next and the fifth one on, 9,000 to 9,999 USD, then cashes out
const quiet = [3, 6, 8, 10]; // cash out just under 9,000, so only 2 of their transfers are in the rule's band
ringIdx.forEach((v, a) => {
    add(v, ringIdx[(a + 1) % 12], 9000 + r() * 900);
    add(v, ringIdx[(a + 5) % 12], 9000 + r() * 900);
    add(v, CASHOUT, quiet.includes(a) ? 8200 + r() * 750 : 9100 + r() * 800);
});
ringIdx.forEach((v, a) => {
    const spends = a === 0 ? 2 : 1 + Math.floor(r() * 2);
    for (let j = 0; j < spends; j++) add(v, a === 0 ? [6, 10][j] : pickMerchant(), 12 + r() * 180);
    const ins = a === 0 ? 1 : 1 + Math.floor(r() * 2);
    for (let j = 0; j < ins; j++) add(personalPool(), v, 2400 + r() * 5400); // money in from the people it was taken from
});
for (const p of tuition) {
    add(p, UNIS[Math.floor(r() * 2)], 9050 + r() * 900);
    add(60 + Math.floor(r() * 330), p, 2500 + r() * 3000);
}
add(distractor, CASHOUT, 9200 + r() * 300);
add(60 + Math.floor(r() * 330), distractor, 2600 + r() * 2000);
for (const b of supplier) {
    let s = 60 + Math.floor(r() * 330);
    while (s === b) s = 60 + Math.floor(r() * 330);
    add(b, s, 20000 + r() * 40000);
}
const landlord = {};
for (const p of rapid) {
    add(60 + Math.floor(r() * 330), p, 2000 + r() * 2000);
    landlord[p] = personalPool();
    add(p, landlord[p], 1200 + r() * 1200);
}
for (const p of newAcct) add(personalPool(), p, 5000 + r() * 3000);

// ---------- attributes ----------
const SC = {
    structuring: "Structuring: 3 or more transfers of 9,000 to 9,999 USD out in 30 days",
    near: "One transfer of 9,000 to 9,999 USD",
    payroll: "Outflow over 3 times its 3-month average",
    supplier: "One counterparty took over 80% of outflow",
    rapid: "Money out within 24 hours of money in",
    newAcct: "New account, over 5,000 USD in during its first month",
};
const scenario = new Array(n).fill("");
ringIdx.forEach((v, a) => { if (!quiet.includes(a)) scenario[v] = SC.structuring; });
for (const p of [...tuition, distractor]) scenario[p] = SC.near;
for (const b of payroll) scenario[b] = SC.payroll;
for (const b of supplier) scenario[b] = SC.supplier;
for (const p of rapid) scenario[p] = SC.rapid;
for (const p of newAcct) scenario[p] = SC.newAcct;
const alerted = scenario.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);

const risk = kinds.map(() => Math.floor(r() ** 3 * 80));
ringIdx.forEach((v, a) => (risk[v] = a === 0 ? 92 : 58 + Math.floor(r() * 36)));
for (const i of alerted) if (!inRing.has(i)) risk[i] = 35 + Math.floor(r() * 55);
for (const i of noisyHigh) risk[i] = 81 + Math.floor(r() * 15);

// the queue: alert ids in the order the monitoring system raised them. The reviewer's morning
// runs through it; the three the storyboard follows sit together at positions 7, 8 and 9.
const tuitionCase = tuition[0];
const nextCase = payroll[0];
// (no ring member comes before them, so the morning's first six are all benign)
const rest = shuffle(alerted.filter((i) => ![tuitionCase, seed, nextCase].includes(i) && !inRing.has(i)));
const queue = [...rest.slice(0, 6), tuitionCase, seed, nextCase, ...shuffle([...rest.slice(6), ...alerted.filter((i) => inRing.has(i) && i !== seed)])];
const alertId = new Array(n).fill("");
queue.forEach((i, k) => (alertId[i] = `AL-${40115 + k}`));

// ---------- reading it ----------
const adj = adjacency(n, edges);
const outN = Array.from({ length: n }, () => []);
const inN = Array.from({ length: n }, () => []);
const amt = new Map();
edges.forEach(([a, b], k) => {
    outN[a].push(b);
    inN[b].push(a);
    amt.set(`${a}-${b}`, amount[k]);
});
const deg = adj.map((l) => l.length);
// time[k] (each transfer) and alertTime[i] are filled in "times", below, before anything calls these.
const time = [];
const alertTime = new Array(n).fill("");
const row = (i) => ({ id: ids[i], kind: kinds[i], category: category[i], country: country[i], riskScore: risk[i], alert: !!scenario[i], alertId: alertId[i], alertScenario: scenario[i], alertTime: alertTime[i], degree: deg[i], in: inN[i].length, out: outN[i].length });
const hops = (s, k, nb = adj) => {
    const d = new Map([[s, 0]]);
    let fr = [s];
    for (let h = 1; h <= k; h++) {
        const nx = [];
        for (const u of fr) for (const v of nb[u]) if (!d.has(v)) d.set(v, h), nx.push(v);
        fr = nx;
    }
    return d;
};
const inside = (set) => edges.map((e, k) => [e, k]).filter(([[a, b]]) => set.has(a) && set.has(b));
const sizeOf = (d) => ({ nodes: d.size, edges: inside(new Set(d.keys())).length });
const edgeRow = ([a, b], k) => ({ source: ids[a], target: ids[b], amount: amount[k], time: time[k], sourceKind: kinds[a], targetKind: kinds[b], targetCategory: category[b], sourceCategory: category[a] });

const seedHops = [1, 2, 3].map((k) => ({ hops: k, ...sizeOf(hops(seed, k)) }));
const outHops = [1, 2, 3].map((k) => ({ hops: k, ...sizeOf(hops(seed, k, outN)) }));
const inHops = [1, 2, 3].map((k) => ({ hops: k, ...sizeOf(hops(seed, k, inN)) }));
const h1 = hops(seed, 1);
const h2 = hops(seed, 2);
const h2set = new Set(h2.keys());
// what makes the second hop large: each first-hop neighbor's count of new second-hop nodes
const contributors = [...h1.keys()].filter((v) => v !== seed).map((u) => ({ id: ids[u], kind: kinds[u], category: category[u], degree: deg[u], adds: adj[u].filter((v) => h2.get(v) === 2).length })).sort((a, b) => b.adds - a.adds);
const band = (k) => amount[k] >= 9000 && amount[k] < 10000;
const bandIn2 = inside(h2set).filter(([, k]) => band(k));
const bandEnds = [...new Set(bandIn2.flatMap(([[a, b]]) => [a, b]))];
const ringSet = bandEnds.filter((v) => kinds[v] === "personal" && bandIn2.filter(([[a, b]]) => a === v || b === v).length >= 2);
const ringSetEdges = inside(new Set(ringSet));
const ringSetAll = edges.map((e, k) => [e, k]).filter(([[a, b]]) => ringSet.includes(a) || ringSet.includes(b));

// the path to another member: the alerted ring member farthest along transfer direction
const bfsPath = (s, t, nb) => {
    const prev = new Map([[s, -1]]);
    const q = [s];
    while (q.length) {
        const u = q.shift();
        if (u === t) break;
        for (const v of nb[u]) if (!prev.has(v)) prev.set(v, u), q.push(v);
    }
    const p = [];
    for (let v = t; v !== -1; v = prev.get(v)) p.unshift(v);
    return p;
};
const dirDist = hops(seed, 12, outN);
const pathTarget = ringIdx.filter((v) => scenario[v] && v !== seed).sort((a, b) => dirDist.get(b) - dirDist.get(a) || risk[b] - risk[a])[0];
const pathDir = bfsPath(seed, pathTarget, outN);
const pathUnd = bfsPath(seed, pathTarget, adj);

const hop1Of = (s) => {
    const d = hops(s, 1);
    const set = new Set(d.keys());
    return { nodes: [...set].map(row), edges: inside(set).map(([e, k]) => edgeRow(e, k)).sort((a, b) => b.amount - a.amount) };
};
const ruleEdges = edges.map((e, k) => [e, k]).filter(([, k]) => band(k));
const ruleNodes = [...new Set(ruleEdges.flatMap(([[a, b]]) => [a, b]))];

// ---------- drawings ----------
const outDir = join(here, "canvas");
const drawings = {};
function emit(name, render) {
    for (const theme of ["light", "dark"]) writeFileSync(join(outDir, `alerts-${name}-${theme}.svg`), render(theme));
    drawings[name] = `canvas/alerts-${name}-{theme}.svg`;
}
const diamond = (x, y, s) => `${f1(x)},${f1(y - s)} ${f1(x + s)},${f1(y)} ${f1(x)},${f1(y + s)} ${f1(x - s)},${f1(y)}`;
// Alerted accounts carry the Alerts layer's two channels: vermillion and a diamond, so the
// distinction survives grayscale print (the fraud persona's case files).
function mark(i, x, y, rr, fill, T, edged, isAlert) {
    const s = rr * 1.45;
    let o = isAlert ? `<polygon points="${diamond(x, y, s)}" fill="${fill}"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="${fill}"/>`;
    if (edged) o += isAlert ? `<polygon points="${diamond(x, y, s + 0.9)}" fill="none" stroke="${T.fillEdge}" stroke-width="1.3"/>` : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr + 0.65)}" fill="none" stroke="${T.fillEdge}" stroke-width="1.3"/>`;
    return o;
}
function draw({ theme, nodes, pos, es, size, labels = [], marks = {}, edgeOpacity = 0.5, title, overlay = "" }) {
    const T = THEMES[theme];
    const at = new Map(nodes.map((v, k) => [v, k]));
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">`, `<rect width="${W}" height="${H}" fill="${T.canvas}"/>`];
    out.push(`<g stroke="${T.edge}" stroke-width="1" stroke-opacity="${edgeOpacity}" stroke-linecap="round">`);
    for (const [a, b] of es) if (at.has(a) && at.has(b)) out.push(`<line x1="${f1(pos[at.get(a)][0])}" y1="${f1(pos[at.get(a)][1])}" x2="${f1(pos[at.get(b)][0])}" y2="${f1(pos[at.get(b)][1])}"/>`);
    out.push(`</g>`, overlay);
    const markOf = new Map();
    for (const [kind, list] of Object.entries(marks)) for (const v of list) markOf.set(v, kind);
    const fill = (v) => (scenario[v] ? VERM : GRAY);
    const edged = nodes.some((v) => contrast(fill(v), T.canvas) < 3);
    const order = [...nodes].sort((a, b) => (scenario[a] ? 1 : 0) - (scenario[b] ? 1 : 0) || (markOf.has(a) ? 1 : 0) - (markOf.has(b) ? 1 : 0));
    out.push("<g>");
    for (const v of order) {
        const [x, y] = pos[at.get(v)];
        const rr = size(v);
        out.push(mark(v, x, y, rr, fill(v), T, edged, !!scenario[v]));
        if (markOf.has(v)) out.push(markRing(x, y, scenario[v] ? rr * 1.45 : rr, theme, markOf.get(v)));
    }
    out.push("</g>");
    out.push(`<g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`);
    const li = labels.map((v) => at.get(v)).filter((k) => k !== undefined);
    const P = nodes.map((v) => pos[at.get(v)]);
    for (const k of cullLabels(li, P, (k) => size(nodes[k]) * 1.45, (k) => ids[nodes[k]], [...markOf.keys()].map((v) => at.get(v)).filter((k) => k !== undefined))) {
        const [x, y] = P[k];
        out.push(`<text x="${f1(x + size(nodes[k]) * 1.45 + 4)}" y="${f1(y + 4)}">${esc(ids[nodes[k]])}</text>`);
    }
    out.push("</g></svg>");
    return out.join("\n");
}
function density({ theme, pos, title }) {
    const T = THEMES[theme];
    const R = 9;
    const hw = Math.sqrt(3) * R;
    const bins = new Map();
    for (let i = 0; i < n; i++) {
        if (scenario[i]) continue; // marked nodes are points, never in a bin
        const [x, y] = pos[i];
        const rowi = Math.round(y / (1.5 * R));
        const col = Math.round((x - (rowi % 2 ? hw / 2 : 0)) / hw);
        const k = `${col},${rowi}`;
        bins.set(k, (bins.get(k) ?? 0) + 1);
    }
    const max = Math.max(...bins.values());
    const hex = (cx, cy) => Array.from({ length: 6 }, (_, k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${f1(cx + R * Math.cos(a))},${f1(cy + R * Math.sin(a))}`; }).join(" ");
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">`, `<rect width="${W}" height="${H}" fill="${T.canvas}"/>`, `<g fill="${GRAY}">`];
    for (const [k, c] of bins) {
        const [col, rowi] = k.split(",").map(Number);
        const step = Math.min(4, Math.floor((Math.log(c) / Math.log(max + 1)) * 5));
        out.push(`<polygon points="${hex(col * hw + (rowi % 2 ? hw / 2 : 0), rowi * 1.5 * R)}" fill-opacity="${[0.22, 0.38, 0.55, 0.75, 0.95][step]}"/>`);
    }
    out.push("</g><g>");
    const edged = contrast(VERM, T.canvas) < 3;
    for (const i of alerted) out.push(mark(i, pos[i][0], pos[i][1], 4.5, VERM, T, edged, true));
    out.push("</g></svg>");
    return out.join("\n");
}

const pos = layout(n, edges, { strength: -14, distance: 14, ticks: 300, group: country, pull: 0.12 });
const all = Array.from({ length: n }, (_, i) => i);
emit("density", (theme) => density({ theme, pos, title: "3,000 accounts: 2,950 as density, the 50 alerted accounts as points" }));
emit("points", (theme) => draw({ theme, nodes: all, pos, es: edges, size: (v) => (scenario[v] ? 4.5 : 2.2), edgeOpacity: 0.12, title: "3,000 accounts, every one a point, the 50 alerted on top" }));

const sub = (set, opts) => {
    const nodes = [...set];
    const at = new Map(nodes.map((v, k) => [v, k]));
    const se = edges.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b]) => [at.get(a), at.get(b)]);
    // Fit into the upper part of the drawing, clear of the legend and the toolbar that sit over
    // the canvas's lower corners.
    const q = layout(nodes.length, se, opts);
    const xs = q.map((v) => v[0]), ys = q.map((v) => v[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min((W * 0.7) / (x1 - x0 || 1), (H * 0.62) / (y1 - y0 || 1));
    const ox = W / 2 - (k * (x1 + x0)) / 2, oy = H * 0.07 - k * y0;
    return { nodes, p: q.map(([x, y]) => [ox + k * x, oy + k * y]) };
};
const anchors = {};
const keep = (name, nodes, p, list) => (anchors[name] = Object.fromEntries(list.map((v) => [ids[v], pct(p[nodes.indexOf(v)])])));
{
    const s = new Set(hops(tuitionCase, 1).keys());
    const { nodes, p } = sub(s, { strength: -900, distance: 170 });
    emit("tuition-hop1", (theme) => draw({ theme, nodes, pos: p, es: edges, size: () => 9, labels: nodes, marks: { selected: [tuitionCase] }, title: `${ids[tuitionCase]} and its counterparties` }));
    keep("tuitionHop1", nodes, p, nodes);
}
{
    const { nodes, p } = sub(new Set(h1.keys()), { strength: -900, distance: 170 });
    emit("seed-hop1", (theme) => draw({ theme, nodes, pos: p, es: edges, size: () => 9, labels: nodes, marks: { selected: [seed] }, title: "ACC-365386 and its 8 counterparties" }));
    keep("seedHop1", nodes, p, nodes);
}
{
    const { nodes, p } = sub(h2set, { strength: -40, distance: 26, ticks: 400 });
    const bigM = nodes.filter((v) => kinds[v] === "merchant" && deg[v] > 150);
    const size2 = (v) => (kinds[v] === "merchant" ? 7 : scenario[v] || inRing.has(v) ? 5 : 3.5);
    emit("seed-hop2", (theme) => draw({ theme, nodes, pos: p, es: edges, size: size2, labels: [seed, CASHOUT, ...bigM], marks: { selected: [seed] }, edgeOpacity: 0.3, title: `Two hops from ACC-365386: ${h2set.size} accounts` }));
    keep("seedHop2", nodes, p, [...ringIdx, CASHOUT, distractor, ...bigM, ...nodes.filter((v) => scenario[v])]);
}
// The two-hop step narrowed by a second step, transfers of 9,000 to 9,999 USD with their nodes:
// the 14 accounts Sarah reads the ring from. Three drawings on one layout: the lookalike
// selected, the set of 12 selected, and the path along transfers.
{
    const set = new Set(bandEnds);
    const { nodes, p } = sub(set, { strength: -700, distance: 120 });
    const bes = bandIn2.map(([e]) => e);
    const sz = (v) => (kinds[v] === "merchant" ? 9 : 7);
    emit("band", (theme) => draw({ theme, nodes, pos: p, es: bes, size: sz, labels: nodes, marks: { selected: [distractor] }, title: `${nodes.length} accounts in transfers of 9,000 to 9,999 USD within two hops of ACC-365386` }));
    emit("band-set", (theme) => draw({ theme, nodes, pos: p, es: bes, size: sz, labels: nodes, marks: { selected: ringSet }, title: `The ${ringSet.length} accounts of the set Ring around ACC-365386 selected` }));
    const at = (v) => p[nodes.indexOf(v)];
    const line = (theme) => `<g stroke="${THEMES[theme].ink}" stroke-width="3" stroke-linecap="round">` + pathDir.slice(1).map((b2, k) => { const A2 = at(pathDir[k]), B2 = at(b2); return `<line x1="${f1(A2[0])}" y1="${f1(A2[1])}" x2="${f1(B2[0])}" y2="${f1(B2[1])}"/>`; }).join("") + "</g>";
    emit("band-path", (theme) => draw({ theme, nodes, pos: p, es: bes, size: sz, labels: nodes, marks: { selected: pathDir }, overlay: line(theme), title: `Shortest path along transfers, ACC-365386 to ${ids[pathTarget]}, ${pathDir.length - 1} hops` }));
    keep("band", nodes, p, nodes);
}
{
    const set = new Set(ruleNodes);
    const { nodes, p } = sub(set, { strength: -260, distance: 55 });
    emit("rule", (theme) => draw({ theme, nodes, pos: p, es: ruleEdges.map(([e]) => e), size: (v) => (kinds[v] === "merchant" ? 8 : 6), labels: nodes.filter((v) => kinds[v] === "merchant" || v === seed), title: "Accounts in transfers of 9,000 to 9,999 USD" }));
    keep("rule", nodes, p, nodes);
}
{
    const nodes = [nextCase];
    const p = [[W / 2, H / 2]];
    emit("next", (theme) => draw({ theme, nodes, pos: p, es: [], size: () => 9, labels: nodes, marks: { selected: nodes }, title: `${ids[nextCase]} alone: the new step's one node` }));
}
anchors.full = Object.fromEntries([...new Set([...alerted, ...ringIdx, ...h1.keys(), ...hops(tuitionCase, 1).keys(), nextCase])].map((v) => [ids[v], pct(pos[v])]));

// ---------- the whole bank's August: 1,000,000 accounts, counted only ----------
const bank = (() => {
    const N = 1000000;
    const MER = 2000; // the 60 above plus 1,940 more, all sharing one popularity curve
    const rb = mulberry32(8012026);
    const src = [];
    const dst = [];
    for (const [a, b] of edges) src.push(a), dst.push(b);
    const merchants = (m) => (m < 60 ? m : n + (m - 60)); // merchant m's node index
    const w = Array.from({ length: MER }, (_, m) => 1 / (m + 1) ** 0.9);
    const cum = [];
    w.reduce((a, x, k) => (cum[k] = a + x), 0);
    const tot = cum[MER - 1];
    const pickM = () => {
        const x = rb() * tot;
        let lo = 0, hi = MER - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < x) lo = mid + 1; else hi = mid; }
        return lo === CASHOUT || UNIS.includes(lo) ? 0 : lo;
    };
    const firstPerson = n + MER - 60;
    const firstBiz = N - 12000;
    for (let i = firstPerson; i < firstBiz; i++) {
        const k = 1 + Math.floor(rb() * 3);
        for (let j = 0; j < k; j++) src.push(i), dst.push(merchants(pickM()));
        if (rb() < 0.35) src.push(i), dst.push(firstPerson + Math.floor(rb() * (firstBiz - firstPerson)));
    }
    for (let b = firstBiz; b < N; b++) {
        const staff = 3 + Math.floor(rb() * 40);
        for (let j = 0; j < staff; j++) src.push(b), dst.push(firstPerson + Math.floor(rb() * (firstBiz - firstPerson)));
    }
    // dedupe (a, b) pairs as the small graph does
    const E0 = src.length;
    const pairs = new Float64Array(E0);
    for (let e = 0; e < E0; e++) { const a = Math.min(src[e], dst[e]), b = Math.max(src[e], dst[e]); pairs[e] = a * N + b; }
    const order = Array.from(pairs.keys()).sort((x, y) => pairs[x] - pairs[y]);
    const S = [], D = [];
    for (let k = 0; k < order.length; k++) {
        const e = order[k];
        if (src[e] === dst[e]) continue;
        if (k && pairs[order[k - 1]] === pairs[e]) continue;
        S.push(src[e]), D.push(dst[e]);
    }
    const E = S.length;
    const degB = new Int32Array(N);
    for (let e = 0; e < E; e++) degB[S[e]]++, degB[D[e]]++;
    const off = new Int32Array(N + 1);
    for (let i = 0; i < N; i++) off[i + 1] = off[i] + degB[i];
    const nb = new Int32Array(2 * E);
    const fill = off.slice(0, N);
    for (let e = 0; e < E; e++) nb[fill[S[e]]++] = D[e], nb[fill[D[e]]++] = S[e];
    const oOff = new Int32Array(N + 1);
    const oDeg = new Int32Array(N);
    for (let e = 0; e < E; e++) oDeg[S[e]]++;
    for (let i = 0; i < N; i++) oOff[i + 1] = oOff[i] + oDeg[i];
    const oNb = new Int32Array(E);
    const oFill = oOff.slice(0, N);
    for (let e = 0; e < E; e++) oNb[oFill[S[e]]++] = D[e];
    const hopCount = (s, k, O = off, B = nb) => {
        const dist = new Int8Array(N).fill(-1);
        dist[s] = 0;
        let fr = [s], count = 1, es = 0;
        for (let h = 1; h <= k; h++) {
            const nx = [];
            for (const u of fr) for (let j = O[u]; j < O[u + 1]; j++) { const v = B[j]; if (dist[v] < 0) dist[v] = h, nx.push(v); }
            fr = nx;
            count += nx.length;
        }
        for (let e = 0; e < E; e++) if (dist[S[e]] >= 0 && dist[D[e]] >= 0) es++;
        return { hops: k, nodes: count, edges: es };
    };
    // components by union-find
    const parent = new Int32Array(N).map((_, i) => i);
    const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
    for (let e = 0; e < E; e++) { const a = find(S[e]), b = find(D[e]); if (a !== b) parent[a] = b; }
    const compSize = new Map();
    for (let i = 0; i < N; i++) { const c = find(i); compSize.set(c, (compSize.get(c) ?? 0) + 1); }
    const sizes = [...compSize.values()].sort((a, b) => b - a);
    const iso = degB.reduce((a, d) => a + (d === 0 ? 1 : 0), 0);
    let maxDeg = 0, maxAt = 0;
    for (let i = 0; i < N; i++) if (degB[i] > maxDeg) maxDeg = degB[i], maxAt = i;
    // what makes the seed's second hop large here, and the offered step "Top N by degree, with neighbors"
    const d1 = new Set([seed, ...adj[seed]]);
    const contrib = adj[seed].map((u) => { let a = 0; for (let j = off[u]; j < off[u + 1]; j++) if (!d1.has(nb[j])) a++; return { id: ids[u], kind: kinds[u], category: category[u], degree: degB[u], adds: a }; }).sort((a, b) => b.adds - a.adds);
    // alerts at the small graph's benign rate, plus the 50 above
    const ra = mulberry32(4471);
    let alertsB = alerted.length;
    for (let i = n; i < N; i++) if (ra() < (alerted.length - 8) / n) alertsB++;
    return {
        title: "Card and transfer transactions, August 2026, the whole bank",
        file: "transfers-2026-08-all.csv",
        nodes: N,
        edges: E,
        directed: true,
        drawingLimit: 50000,
        contains: "the 3,000 accounts of alerts.august unchanged, with the same transfers; merchants gain the rest of the bank's customers",
        stats: {
            components: compSize.size,
            isolated: iso,
            averageDegree: Math.round((2 * E / N) * 100) / 100,
            maxDegree: maxDeg,
            maxDegreeAccount: maxAt < 60 ? ids[maxAt] : "ACC-" + (100000 + (maxAt % 899999)),
            componentSizes: sizes.slice(0, 5),
            componentsOfOne: sizes.filter((s) => s === 1).length,
        },
        alerts: alertsB,
        seedHops: [1, 2, 3].map((k) => hopCount(seed, k)),
        secondHopContributors: contrib.slice(0, 3),
        topByDegreeWithNeighbors: { n: 1, nodes: maxDeg + 1, fitsUnderLimit: maxDeg + 1 <= 50000 },
        seedHopsOut: [1, 2, 3].map((k) => hopCount(seed, k, oOff, oNb)),
    };
})();

// ---------- times ----------
// Own seed, so adding times changed no other number. The monitoring system runs nightly at 02:00
// and raised the queue in alertId order over August; every transfer that triggered an alert comes
// before it. A ring member moves the money on the day after its victims pay in; a rapid account
// pays out within hours of being paid.
{
    const rt = mulberry32(20260803);
    const DAY = 86400000, T0 = Date.UTC(2026, 7, 1);
    const at = (day, h0, h1) => T0 + (day - 1) * DAY + Math.floor((h0 + rt() * (h1 - h0)) * 60) * 60000;
    const alertAt = new Array(n).fill(0);
    queue.forEach((i, k) => {
        alertAt[i] = T0 + (2 + Math.floor((k * 29) / 50)) * DAY + (2 * 60 + 10 + k) * 60000;
        alertTime[i] = new Date(alertAt[i]).toISOString().replace(".000Z", "Z");
    });
    const t = edges.map(() => at(1 + Math.floor(rt() * 31), 7, 23));
    const before = (limit) => at(1 + Math.floor(rt() * Math.max(1, Math.floor((limit - T0) / DAY) - 1)), 7, 23);
    edges.forEach(([a, b], k) => {
        const lim = Math.min(...[a, b].filter((v) => scenario[v] && !inRing.has(v)).map((v) => alertAt[v]), Infinity);
        if (lim < Infinity) t[k] = before(lim);
    });
    for (const p of rapid) {
        const kin = edges.findIndex(([a, b]) => b === p), kout = edges.findIndex(([a, b]) => a === p && b === landlord[p]);
        t[kout] = t[kin] + Math.floor((3 + rt() * 17) * 60) * 60000;
        if (t[kout] >= alertAt[p]) (t[kin] -= DAY), (t[kout] -= DAY);
    }
    ringIdx.forEach((v) => {
        const outDay = scenario[v] ? Math.floor((alertAt[v] - T0) / DAY) : 3 + Math.floor(rt() * 25);
        edges.forEach(([a, b], k) => {
            if (a === v && (inRing.has(b) || b === CASHOUT)) t[k] = at(outDay, 10, 18);
            else if (b === v && !inRing.has(a)) t[k] = at(outDay - 1, 9, 12);
        });
    });
    t.forEach((x, k) => (time[k] = new Date(x).toISOString().replace(".000Z", "Z")));
}

const out = {
    generatedBy: "kit/gen-alerts.mjs -- regenerate instead of editing by hand",
    note: "Alert triage fixture. The 50 alerted accounts are what the monitoring system raised; 42 are benign. The ring (12 accounts) is found by following transfers of 9,000 to 9,999 USD, not by the alert flag: 8 of its members are alerted, 4 are not.",
    august: {
        title: "Card and transfer transactions, August 2026",
        graphName: "Transfers",
        file: "transfers-2026-08.csv",
        alertsFile: "tm-alerts-2026-08.csv",
        accountsFile: "accounts-2026-08.csv",
        nodes: n,
        edges: edges.length,
        directed: true,
        attributes: [
            { name: "id (account)", kind: "text", source: "accounts-2026-08.csv" },
            { name: "kind", kind: "category", values: kinds.reduce((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {}), source: "accounts-2026-08.csv" },
            { name: "category", kind: "category", note: "merchant category or business sector; empty for personal accounts", source: "accounts-2026-08.csv" },
            { name: "country", kind: "category", values: 9, source: "accounts-2026-08.csv" },
            { name: "riskScore", kind: "integer", range: [Math.min(...risk), Math.max(...risk)], source: "accounts-2026-08.csv", note: "the bank's customer risk rating, as delivered; not computed by graphty" },
            { name: "alert", kind: "boolean", values: { true: alerted.length, false: n - alerted.length }, source: "tm-alerts-2026-08.csv", note: "true where the alerts file has a row for the account" },
            { name: "alertId", kind: "text", source: "tm-alerts-2026-08.csv" },
            { name: "alertScenario", kind: "category", values: Object.fromEntries(Object.values(SC).map((s) => [s, scenario.filter((x) => x === s).length])), source: "tm-alerts-2026-08.csv", note: "the monitoring rule that fired" },
            { name: "alertTime", kind: "datetime", range: [alertTime[queue[0]], alertTime[queue[queue.length - 1]]], source: "tm-alerts-2026-08.csv", note: "when the nightly monitoring run raised the alert; empty on accounts with no alert" },
            { name: "amount (edge)", kind: "currency USD", range: [Math.min(...amount), Math.max(...amount)], source: "transfers-2026-08.csv" },
            { name: "time (edge)", kind: "datetime", range: [time.reduce((a, b) => (a < b ? a : b)), time.reduce((a, b) => (a > b ? a : b))], source: "transfers-2026-08.csv" },
        ],
        stats: { components: components(adj), maxDegree: Math.max(...deg), averageDegree: Math.round((2 * edges.length / n) * 100) / 100 },
        drawnAsDensity: n - alerted.length,
        drawnAsPoints: alerted.length,
        alerts: queue.map(row),
        riskTop: [...all].sort((a, b) => risk[b] - risk[a]).slice(0, 16).map(row),
        ring: { members: ringIdx.map(row), alerted: ringIdx.filter((v) => scenario[v]).length, notAlerted: ringIdx.filter((v) => !scenario[v]).map((v) => ids[v]) },
        cashout: row(CASHOUT),
        distractor: { ...row(distractor), transfers: hop1Of(distractor).edges },
        universities: UNIS.map(row),
        merchantsTop: [...Array(60).keys()].sort((a, b) => deg[b] - deg[a]).slice(0, 5).map(row),
        tuitionCase: { ...row(tuitionCase), hop1: hop1Of(tuitionCase), hops: [1, 2].map((k) => ({ hops: k, ...sizeOf(hops(tuitionCase, k)) })) },
        nextCase: { ...row(nextCase), hops: [1, 2].map((k) => ({ hops: k, ...sizeOf(hops(nextCase, k)) })) },
        seed: {
            ...row(seed),
            hop1: hop1Of(seed),
            // Select neighbors (1 hop) from the density view: every selected account is drawn as a
            // point, so the density line counts the rest (screens/alert-triage.html, state 7).
            selectHop1: (() => {
                const sel = [...hops(seed, 1).keys()];
                const points = new Set([...sel, ...[...Array(n).keys()].filter((v) => scenario[v])]);
                return { selected: sel.length, notAlerted: sel.filter((v) => !scenario[v]).length, points: points.size, density: n - points.size };
            })(),
            hops: { both: seedHops, out: outHops, in: inHops },
            secondHopContributors: contributors.slice(0, 4),
            hop2: {
                nodes: h2set.size,
                alerted: [...h2set].filter((v) => scenario[v]).map(row),
                kinds: [...h2set].reduce((m, v) => ((m[kinds[v]] = (m[kinds[v]] ?? 0) + 1), m), {}),
                bandTransfers: bandIn2.map(([e, k]) => edgeRow(e, k)).sort((a, b) => b.amount - a.amount),
                bandEnds: bandEnds.map(row),
            },
        },
        ringSet: { name: "Ring around ACC-365386", members: ringSet.map(row), transfersAmong: ringSetEdges.length, transfersTouching: ringSetAll.length, totalAmongUSD: round2(ringSetEdges.reduce((a, [, k]) => a + amount[k], 0)), cashoutUSD: round2(ringSet.reduce((a, v) => a + (amt.get(`${v}-${CASHOUT}`) ?? 0), 0)), counterparties: (() => { const c = [...new Set(ringSetAll.flatMap(([[a, b]]) => [a, b]))].filter((v) => !ringSet.includes(v)); return { count: c.length, kinds: c.reduce((m, v) => ((m[kinds[v]] = (m[kinds[v]] ?? 0) + 1), m), {}) }; })(), inflowFromOutsideUSD: round2(ringSetAll.filter(([[a, b]]) => !ringSet.includes(a) && ringSet.includes(b)).reduce((x, [, k]) => x + amount[k], 0)), countries: [...new Set(ringSet.map((v) => country[v]))].length },
        path: { to: row(pathTarget), directed: pathDir.map((v) => ids[v]), directedAmounts: pathDir.slice(1).map((b, k) => amt.get(`${pathDir[k]}-${b}`)), directedTimes: pathDir.slice(1).map((b, k) => time[edges.findIndex(([x, y]) => x === pathDir[k] && y === b)]), undirected: pathUnd.map((v) => ids[v]) },
        rule: { text: "amount is 9,000 to 9,999 USD", edges: ruleEdges.length, nodes: ruleNodes.length, alerted: ruleNodes.filter((v) => scenario[v]).length, ring: ruleNodes.filter((v) => inRing.has(v)).length, kinds: ruleNodes.reduce((m, v) => ((m[kinds[v]] = (m[kinds[v]] ?? 0) + 1), m), {}), members: ruleNodes.map(row) },
        anchors,
        drawings,
    },
    bank,
};
writeFileSync(join(here, "alerts.json"), JSON.stringify(out, null, 1));
console.log(`alerts.json: ${n} nodes, ${edges.length} edges, ${alerted.length} alerts; ring set ${ringSet.length}; hops ${JSON.stringify(seedHops)}; bank ${bank.nodes} nodes ${bank.edges} edges ${JSON.stringify(bank.seedHops)}`);
