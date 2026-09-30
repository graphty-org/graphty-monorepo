import { generateGraph } from "../../../../../layout/stories/utils/graph-generators.ts";
const g = generateGraph("random", 10, 42);
const adj = new Map<string, string[]>();
for (const e of g.edges) {
    for (const [a, b] of [
        [e.source, e.target],
        [e.target, e.source],
    ])
        adj.set(String(a), [...(adj.get(String(a)) ?? []), String(b)]);
}
const seen = new Set([String(g.nodes[0].id)]);
const q = [...seen];
while (q.length)
    for (const m of adj.get(q.pop()!) ?? [])
        if (!seen.has(m)) {
            seen.add(m);
            q.push(m);
        }
console.log(
    "reachable",
    seen.size,
    "of",
    g.nodes.length,
    "weights?",
    g.edges.some((e) => "weight" in e),
);
