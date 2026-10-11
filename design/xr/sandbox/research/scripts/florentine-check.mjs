// Checks that graphty's own packages give the hover tag and the pull-to-grow readout for Florentine families.
const W = "/home/apowers/Projects/graphty-monorepo/.worktrees/feat-xr-technique-sandbox";
const { florentineFamilies } = await import(`${W}/graph-samples/dist/datasets/florentine-families.js`);
const { fromEdgeArrays } = await import(`${W}/graph-format/dist/graph-format.js`);
const alg = await import(`${W}/algorithms/dist/algorithms.js`);
const lay = await import(`${W}/layout/dist/layout.js`);
const g = florentineFamilies();
const s = fromEdgeArrays(g);
const pr = alg.pageRank(s);
const scores = pr.scores ?? pr.rank ?? pr;
const order = [...scores].map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]);
const rankOf = new Map(order.map(([i], r) => [i, r + 1]));
for (const name of ["Strozzi", "Medici"]) {
    const i = s.ids.requireIndex(name);
    const b = alg.breadthFirstSearch(s, i, { maxDepth: 1 });
    const hop1 = [...b.depth].filter((d) => d === 1).length;
    const b2 = alg.breadthFirstSearch(s, i, { maxDepth: 2 });
    const hop2 = [...b2.depth].filter((d) => d === 2).length;
    console.log(`${name} ${scores[i].toFixed(3)}, #${rankOf.get(i)}  1 hop: ${hop1}  2 hops: +${hop2}`);
}
console.log("pageRank result keys:", Object.keys(pr));
const kk = lay.kamadaKawai(s, { dim: 3, scale: 0.3 });
console.log(
    "kamadaKawai 3D:",
    kk.dim,
    kk.n,
    Array.from(kk.positions.slice(0, 3)).map((v) => v.toFixed(3)),
);
const fa = lay.forceAtlas2(s, { dim: 3, seed: 7 });
console.log("forceAtlas2 3D seeded:", fa.dim, fa.n);
