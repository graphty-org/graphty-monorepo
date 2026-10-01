// The one shared Karate Club drawing every mock uses: 34 nodes with fixed
// positions (a seeded force layout, baked once so no two screens differ) in a
// 1000 x 760 box, and the 78 edges. Node ids are the names (karate.gml has no
// labels). The canvas renderer scales the box to the canvas it draws on.

export const NODES = [
  { id: 1, x: 590, y: 495 },
  { id: 2, x: 572, y: 376 },
  { id: 3, x: 405, y: 368 },
  { id: 4, x: 488, y: 507 },
  { id: 5, x: 712, y: 642 },
  { id: 6, x: 817, y: 636 },
  { id: 7, x: 774, y: 689 },
  { id: 8, x: 525, y: 462 },
  { id: 9, x: 442, y: 281 },
  { id: 10, x: 340, y: 259 },
  { id: 11, x: 773, y: 572 },
  { id: 12, x: 605, y: 719 },
  { id: 13, x: 514, y: 646 },
  { id: 14, x: 466, y: 380 },
  { id: 15, x: 342, y: 0 },
  { id: 16, x: 396, y: 37 },
  { id: 17, x: 914, y: 760 },
  { id: 18, x: 723, y: 444 },
  { id: 19, x: 223, y: 9 },
  { id: 20, x: 525, y: 294 },
  { id: 21, x: 283, y: 4 },
  { id: 22, x: 724, y: 374 },
  { id: 23, x: 191, y: 61 },
  { id: 24, x: 147, y: 234 },
  { id: 25, x: 123, y: 457 },
  { id: 26, x: 87, y: 377 },
  { id: 27, x: 86, y: 73 },
  { id: 28, x: 198, y: 339 },
  { id: 29, x: 265, y: 315 },
  { id: 30, x: 147, y: 134 },
  { id: 31, x: 461, y: 193 },
  { id: 32, x: 295, y: 376 },
  { id: 33, x: 305, y: 151 },
  { id: 34, x: 300, y: 185 },
];

const ADJ = {
  1: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 18, 20, 22, 32],
  2: [3, 4, 8, 14, 18, 20, 22, 31],
  3: [4, 8, 9, 10, 14, 28, 29, 33],
  4: [8, 13, 14], 5: [7, 11], 6: [7, 11, 17], 7: [17],
  9: [31, 33, 34], 10: [34], 14: [34], 15: [33, 34], 16: [33, 34], 19: [33, 34],
  20: [34], 21: [33, 34], 23: [33, 34], 24: [26, 28, 30, 33, 34], 25: [26, 28, 32],
  26: [32], 27: [30, 34], 28: [34], 29: [32, 34], 30: [33, 34], 31: [33, 34],
  32: [33, 34], 33: [34],
};

export const EDGES = [];
for (const [a, bs] of Object.entries(ADJ)) for (const b of bs) EDGES.push([Number(a), b]);
if (EDGES.length !== 78) throw new Error("karate.mjs: expected 78 edges, got " + EDGES.length);

export const DEGREE = {};
for (const n of NODES) DEGREE[n.id] = 0;
for (const [a, b] of EDGES) { DEGREE[a]++; DEGREE[b]++; }

// The Louvain partition the screens assume (12, 11, 6, 5 members).
export const COMMUNITIES = {
  1: [9, 10, 15, 16, 19, 21, 23, 27, 30, 31, 33, 34],
  2: [1, 2, 3, 4, 8, 12, 13, 14, 18, 20, 22],
  3: [24, 25, 26, 28, 29, 32],
  4: [5, 6, 7, 11, 17],
};

export const BOX = { w: 1000, h: 760 };

// Betweenness centrality (NetworkX, normalised), rounded to three places:
// the values screen 9's table and screen 5's run show.
export const BETWEENNESS = {
  1: 0.438, 2: 0.054, 3: 0.144, 4: 0.012, 5: 0.001, 6: 0.030, 7: 0.030, 8: 0, 9: 0.056,
  10: 0.001, 11: 0.001, 12: 0, 13: 0, 14: 0.046, 15: 0, 16: 0, 17: 0, 18: 0, 19: 0,
  20: 0.032, 21: 0, 22: 0, 23: 0, 24: 0.018, 25: 0.002, 26: 0.004, 27: 0, 28: 0.022,
  29: 0.002, 30: 0.003, 31: 0.015, 32: 0.138, 33: 0.145, 34: 0.304,
};

// PageRank (damping 0.85) by power iteration over the 78 edges, so the
// canvas paint of screen 6 is the real value: node 12 at 0.010, node 34 at
// 0.101.
export const PAGERANK = (() => {
  const N = NODES.length, adj = {};
  for (const nd of NODES) adj[nd.id] = [];
  for (const [a, b] of EDGES) { adj[a].push(b); adj[b].push(a); }
  let pr = {};
  for (const nd of NODES) pr[nd.id] = 1 / N;
  for (let it = 0; it < 100; it++) {
    const next = {};
    for (const nd of NODES) next[nd.id] = 0.15 / N;
    for (const nd of NODES) for (const m of adj[nd.id]) next[m] += 0.85 * pr[nd.id] / DEGREE[nd.id];
    pr = next;
  }
  return pr;
})();
