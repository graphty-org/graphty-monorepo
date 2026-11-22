// usage: node prof.mjs <cpuprofile> <frames> ; prints inclusive ms of selected functions and top self-time
import fs from "node:fs";
const p = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); const frames = +process.argv[3];
const byId = new Map(p.nodes.map((n) => [n.id, n])); const parent = new Map();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map(); const dt = p.timeDeltas; let total = 0;
for (let i = 0; i < p.samples.length; i++) { const d = (dt[i + 1] ?? 0) / 1000; self.set(p.samples[i], (self.get(p.samples[i]) ?? 0) + d); total += d; }
const want = ["measure", "envelopeFraming", "framingBounds", "framingBox", "publishColumn", "publishedBounds", "computeWorldMatrix"];
const incl = Object.fromEntries(want.map((w) => [w, 0]));
for (const [id, ms] of self) { const seen = new Set(); let cur = id;
  while (cur !== undefined) { const f = byId.get(cur).callFrame.functionName; if (want.includes(f) && !seen.has(f)) { incl[f] += ms; seen.add(f); } cur = parent.get(cur); } }
const idle = [...self].filter(([id]) => ["(idle)", "(program)"].includes(byId.get(id).callFrame.functionName)).reduce((a, [, m]) => a + m, 0);
console.log("total ms", total.toFixed(0), "busy ms", (total - idle).toFixed(0), "frames", frames);
for (const w of want) console.log(w.padEnd(20), (incl[w]).toFixed(1), "ms total,", (incl[w] / frames).toFixed(3), "ms/frame");
const agg = new Map(); for (const [id, ms] of self) { const f = byId.get(id).callFrame; const k = f.functionName + " " + f.url.split("/").pop() + ":" + f.lineNumber; agg.set(k, (agg.get(k) ?? 0) + ms); }
console.log("top self:"); [...agg].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, m]) => console.log("  ", m.toFixed(0), k.slice(0, 90)));
