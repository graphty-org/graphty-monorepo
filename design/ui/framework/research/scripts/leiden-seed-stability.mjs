import { Graph, leiden } from "../../../../../algorithms/dist/algorithms.js";
// Planted-partition graph: n nodes, mean degree ~5 (m = 2.5n, matching the 200k-node / 500k-edge drawing ceiling),
// 80% of each node's edges inside its block of ~100 nodes. Deterministic PRNG.
let s = 1; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function build(n) {
  const g = new Graph({ directed: false }); const B = 100;
  for (let i = 0; i < n; i++) g.addNode(String(i));
  const m = Math.round(2.5 * n); let added = 0;
  while (added < m) {
    const a = Math.floor(rnd() * n);
    const b = rnd() < 0.8 ? Math.min(n - 1, Math.floor(a / B) * B + Math.floor(rnd() * B)) : Math.floor(rnd() * n);
    if (a === b || g.hasEdge(String(a), String(b))) continue;
    g.addEdge(String(a), String(b)); added++;
  }
  return g;
}
function ari(a, b) { // adjusted Rand index over two Map<node,group>
  const ct = new Map(), ra = new Map(), rb = new Map(); let n = 0;
  for (const [k, x] of a) { const y = b.get(k); const key = x + "|" + y; ct.set(key, (ct.get(key) ?? 0) + 1); ra.set(x, (ra.get(x) ?? 0) + 1); rb.set(y, (rb.get(y) ?? 0) + 1); n++; }
  const c2 = (v) => v * (v - 1) / 2; let sij = 0, sa = 0, sb = 0;
  for (const v of ct.values()) sij += c2(v); for (const v of ra.values()) sa += c2(v); for (const v of rb.values()) sb += c2(v);
  const exp = sa * sb / c2(n), max = (sa + sb) / 2; return (sij - exp) / (max - exp);
}
const sizes = process.argv.slice(2).map(Number);
for (const n of sizes) {
  const t0 = performance.now(); const g = build(n); const tb = performance.now() - t0;
  const runs = [];
  for (const seed of (process.env.SEEDS ?? "1,2,3,4,5").split(",").map(Number)) {
    const t = performance.now(); const r = leiden(g, { randomSeed: seed }); runs.push({ ms: performance.now() - t, r });
  }
  const pair = []; for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) pair.push(ari(runs[i].r.communities, runs[j].r.communities));
  const ms = runs.map((x) => x.ms).sort((a, b) => a - b);
  console.log(JSON.stringify({ n, m: Math.round(2.5 * n), buildMs: Math.round(tb), perSeedMs: ms.map(Math.round), medianMs: Math.round(ms[Math.floor(ms.length/2)]),
    groups: runs.map((x) => new Set(x.r.communities.values()).size), modularity: runs.map((x) => +x.r.modularity.toFixed(4)),
    ariMin: +Math.min(...pair).toFixed(4), ariMean: +(pair.reduce((a, b) => a + b, 0) / pair.length).toFixed(4) }));
}
