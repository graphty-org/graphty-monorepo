import fs from "node:fs";
const dir = "/home/apowers/Projects/graphty-monorepo/tmp/githerd-v2/incidents/";
function stats(file, filt) {
  const out = {};
  for (const l of fs.readFileSync(dir + file, "utf8").split("\n")) {
    if (!l) continue; const r = JSON.parse(l);
    if (!filt(r)) continue;
    const m = (Date.parse(r.updated_at) - Date.parse(r.created_at)) / 60000;
    (out[r.name] ??= []).push(m);
  }
  for (const [k, v] of Object.entries(out)) {
    v.sort((a, b) => a - b);
    const q = (p) => v[Math.floor(p * (v.length - 1))].toFixed(0);
    console.log(file, k, "n=" + v.length, "p50=" + q(0.5), "p90=" + q(0.9), "max=" + q(1));
  }
}
const recent = (r) => r.created_at >= "2026-09-28" && r.conclusion === "success";
stats("runs-pr.jsonl", recent);
stats("runs-master.jsonl", recent);
// master merges per day
const days = {};
for (const l of fs.readFileSync(dir + "runs-master.jsonl", "utf8").split("\n")) {
  if (!l) continue; const r = JSON.parse(l);
  if (r.name !== "CI") continue; const d = r.created_at.slice(0, 10);
  (days[d] ??= new Set()).add(r.head_sha);
}
console.log(Object.entries(days).slice(-8).map(([d, s]) => d + ":" + s.size).join(" "));
