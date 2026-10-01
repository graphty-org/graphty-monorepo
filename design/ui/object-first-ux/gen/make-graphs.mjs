// Writes the two graph modules beside karate.mjs that the screens on College
// football (4, 5, 7, 9) and the Email network (10) draw: football.mjs from
// design/ui/object-first-ux/gen/football.json (the sample's 115 teams laid out once, with
// degree and betweenness) and email.mjs, an invented temporal network's
// in-window slice (412 nodes, 1,910 edges in nine communities) from a seeded
// generator, so every build draws the same picture.
// Usage: node design/ui/object-first-ux/gen/make-graphs.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BOX = { w: 1000, h: 760 };
const fmt = (o) => JSON.stringify(o);

// ------------------------------------------------------------ football
{
  const j = JSON.parse(readFileSync(path.join(here, "football.json"), "utf8"));
  const xs = j.nodes.map((n) => n.x), ys = j.nodes.map((n) => n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min(BOX.w / (x1 - x0), BOX.h / (y1 - y0));
  const ox = (BOX.w - (x1 - x0) * s) / 2, oy = (BOX.h - (y1 - y0) * s) / 2;
  const nodes = j.nodes.map((n) => ({ id: n.id, label: n.label, x: Math.round(ox + (n.x - x0) * s), y: Math.round(oy + (n.y - y0) * s) }));
  const groups = {};
  for (const n of j.nodes) (groups[n.value] ??= []).push(n.id);
  const bw = {};
  for (const n of j.nodes) bw[n.id] = Number(n.bw.toFixed(4));
  const CONF = ["Atlantic Coast", "Big East", "Big Ten", "Big Twelve", "Conference USA", "Independents", "Mid-American", "Mountain West", "Pacific Ten", "Southeastern", "Sun Belt", "Western Athletic"];
  const out = `// The College football drawing (football.gml: 115 teams, 613 games), laid out
// once and baked by make-graphs.mjs so no two screens differ. A node's label
// is the team; COMMUNITIES is the \`value\` attribute (the conference, 0 to
// 11), GROUP_NAMES the conference names, BETWEENNESS the normalised
// betweenness centrality of every team. Do not edit by hand: change
// make-graphs.mjs and run it.
export const BOX = ${fmt(BOX)};
export const NODES = [
${nodes.map((n) => "  " + fmt(n) + ",").join("\n")}
];
export const EDGES = ${fmt(j.edges)};
export const DEGREE = {};
for (const n of NODES) DEGREE[n.id] = 0;
for (const [a, b] of EDGES) { DEGREE[a]++; DEGREE[b]++; }
export const COMMUNITIES = ${fmt(groups)};
export const GROUP_NAMES = ${fmt(Object.fromEntries(CONF.map((c, i) => [i, c])))};
export const BETWEENNESS = ${fmt(bw)};
`;
  writeFileSync(path.join(here, "football.mjs"), out);
  console.log("football.mjs", nodes.length, "nodes", j.edges.length, "edges");
}

// ------------------------------------------------------------ email
{
  // Mulberry32, seeded: the same network every run.
  let seed = 20190301;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const SIZES = [71, 66, 60, 54, 49, 41, 35, 22, 14]; // 412 nodes in nine communities
  const centres = [[500, 380], [190, 250], [780, 220], [300, 600], [760, 590], [520, 130], [140, 470], [880, 420], [560, 690]];
  const nodes = [], groups = {};
  let id = 1;
  SIZES.forEach((size, g) => {
    const [cx, cy] = centres[g], spread = 34 + Math.sqrt(size) * 8;
    groups[g + 1] = [];
    for (let i = 0; i < size; i++) {
      nodes.push({ id, x: cx + gauss() * spread, y: cy + gauss() * spread * 0.85, g: g + 1 });
      groups[g + 1].push(id);
      id++;
    }
  });
  // Edges: a hub-weighted community structure. Each node draws a weight so
  // a few nodes become the busy senders (degree above 20) and most stay
  // light; about 1,700 inside edges, the rest across, 1,910 in all.
  const weight = nodes.map(() => Math.pow(rnd(), 2.2) * 3 + 0.15);
  const pick = (ids) => { const tot = ids.reduce((s, i) => s + weight[i - 1], 0); let r = rnd() * tot; for (const i of ids) { r -= weight[i - 1]; if (r <= 0) return i; } return ids[ids.length - 1]; };
  const seen = new Set(), edges = [];
  const add = (a, b) => { if (a === b) return false; const k = a < b ? `${a}-${b}` : `${b}-${a}`; if (seen.has(k)) return false; seen.add(k); edges.push([a, b]); return true; };
  const inside = SIZES.map((s) => Math.round(1700 * s * s / SIZES.reduce((t, x) => t + x * x, 0)));
  inside.forEach((n, g) => { const ids = groups[g + 1]; let made = 0; while (made < n) if (add(pick(ids), pick(ids))) made++; });
  const all = nodes.map((n) => n.id);
  while (edges.length < 1910) { const a = pick(all), b = pick(all); if (nodes[a - 1].g !== nodes[b - 1].g) add(a, b); }
  // A short relaxation so nodes do not sit on top of each other.
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < nodes.length; i++) for (let k = i + 1; k < nodes.length; k++) {
      const a = nodes[i], b = nodes[k];
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 < 22 * 22 && d2 > 0) { const d = Math.sqrt(d2), f = (22 - d) / d * 0.5; a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f; }
    }
  }
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min(BOX.w / (x1 - x0), BOX.h / (y1 - y0));
  const ox = (BOX.w - (x1 - x0) * s) / 2, oy = (BOX.h - (y1 - y0) * s) / 2;
  const out = `// The Email network's in-window drawing (an invented temporal dataset:
// 1,204 people and 5,830 emails over 2019; the window 2019-03 to 2019-05
// keeps 412 nodes and ${edges.length} edges), generated once by make-graphs.mjs
// from a seeded generator so no two screens differ. COMMUNITIES is the nine
// Louvain groups the whole year gives. Do not edit by hand: change
// make-graphs.mjs and run it.
export const BOX = ${fmt(BOX)};
export const NODES = [
${nodes.map((n) => "  " + fmt({ id: n.id, x: Math.round(ox + (n.x - x0) * s), y: Math.round(oy + (n.y - y0) * s) }) + ",").join("\n")}
];
export const EDGES = ${fmt(edges)};
export const DEGREE = {};
for (const n of NODES) DEGREE[n.id] = 0;
for (const [a, b] of EDGES) { DEGREE[a]++; DEGREE[b]++; }
export const COMMUNITIES = ${fmt(groups)};
`;
  writeFileSync(path.join(here, "email.mjs"), out);
  const deg = {}; for (const [a, b] of edges) { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }
  const above20 = Object.values(deg).filter((d) => d > 20).length;
  console.log("email.mjs", nodes.length, "nodes", edges.length, "edges; degree > 20:", above20, "max", Math.max(...Object.values(deg)));

  // The whole year (email-all.mjs): the 412 in-window people plus 792 more
  // in the same nine communities, 1,204 nodes and 5,830 edges, for screens
  // that show Email network with time mode off. Drawn after email.mjs from
  // the same seeded stream, so email.mjs does not change.
  const TOTAL_N = 1204, TOTAL_E = 5830;
  const all2 = nodes.map((n) => ({ ...n })), groups2 = Object.fromEntries(Object.entries(groups).map(([g, ids]) => [g, [...ids]]));
  const extra = SIZES.map((sz) => Math.round(sz * TOTAL_N / 412) - sz);
  extra[0] += TOTAL_N - 412 - extra.reduce((t, x) => t + x, 0);
  extra.forEach((k, g) => {
    const [cx, cy] = centres[g], spread = 44 + Math.sqrt(SIZES[g] + k) * 8;
    for (let i = 0; i < k; i++) { all2.push({ id, x: cx + gauss() * spread, y: cy + gauss() * spread * 0.85, g: g + 1 }); groups2[g + 1].push(id); id++; }
  });
  const weight2 = all2.map((_, i) => weight[i] ?? Math.pow(rnd(), 2.2) * 3 + 0.15);
  const pick2 = (ids) => { const tot = ids.reduce((t, i) => t + weight2[i - 1], 0); let r = rnd() * tot; for (const i of ids) { r -= weight2[i - 1]; if (r <= 0) return i; } return ids[ids.length - 1]; };
  const seen2 = new Set(seen), edges2 = edges.map((e) => [...e]);
  const add2 = (a, b) => { if (a === b) return false; const k = a < b ? `${a}-${b}` : `${b}-${a}`; if (seen2.has(k)) return false; seen2.add(k); edges2.push([a, b]); return true; };
  const insideAdd = SIZES.map((_, g) => Math.round((TOTAL_E - 1910) * 0.88 * groups2[g + 1].length ** 2 / Object.values(groups2).reduce((t, x) => t + x.length ** 2, 0)));
  insideAdd.forEach((k, g) => { let made = 0; while (made < k) if (add2(pick2(groups2[g + 1]), pick2(groups2[g + 1]))) made++; });
  const ids2 = all2.map((x) => x.id);
  while (edges2.length < TOTAL_E) { const a = pick2(ids2), b = pick2(ids2); if (all2[a - 1].g !== all2[b - 1].g) add2(a, b); }
  for (let it = 0; it < 60; it++) {
    for (let i = 412; i < all2.length; i++) for (let k = 0; k < all2.length; k++) {
      if (k === i) continue;
      const a = all2[i], b = all2[k];
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 < 16 * 16 && d2 > 0) { const d = Math.sqrt(d2), f = (16 - d) / d; a.x -= dx * f; a.y -= dy * f; }
    }
  }
  const xs2 = all2.map((x) => x.x), ys2 = all2.map((x) => x.y);
  const X0 = Math.min(...xs2), X1 = Math.max(...xs2), Y0 = Math.min(...ys2), Y1 = Math.max(...ys2);
  const s2 = Math.min(BOX.w / (X1 - X0), BOX.h / (Y1 - Y0));
  const ox2 = (BOX.w - (X1 - X0) * s2) / 2, oy2 = (BOX.h - (Y1 - Y0) * s2) / 2;
  writeFileSync(path.join(here, "email-all.mjs"), `// The Email network's whole-year drawing (an invented temporal dataset:
// 1,204 people and 5,830 emails over 2019), for screens with time mode off.
// Ids 1 to 412 are the people of email.mjs's in-window slice. Generated once
// by make-graphs.mjs from a seeded generator. COMMUNITIES is the nine
// Louvain groups. Do not edit by hand: change make-graphs.mjs and run it.
export const BOX = ${fmt(BOX)};
export const NODES = [
${all2.map((n) => "  " + fmt({ id: n.id, x: Math.round(ox2 + (n.x - X0) * s2), y: Math.round(oy2 + (n.y - Y0) * s2) }) + ",").join("\n")}
];
export const EDGES = ${fmt(edges2)};
export const DEGREE = {};
for (const n of NODES) DEGREE[n.id] = 0;
for (const [a, b] of EDGES) { DEGREE[a]++; DEGREE[b]++; }
export const COMMUNITIES = ${fmt(groups2)};
`);
  console.log("email-all.mjs", all2.length, "nodes", edges2.length, "edges");
}
