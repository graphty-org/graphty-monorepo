import { defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    async records(params: { team: string }, ctx) {
        const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
            `/api/people.json?team=${encodeURIComponent(params.team)}`,
        );
        return {
            nodes: rows.map((r) => ({ id: r.id, name: r.name })),
            edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))),
        };
    },
});

registerSource(people);
const { snapshot, format } = await loadFromSource("people", { team: "core" }, { endpoint: "https://example.com" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
