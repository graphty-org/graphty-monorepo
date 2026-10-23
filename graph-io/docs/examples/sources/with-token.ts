import { credentials, defineSource, loadFromSource, registerSource } from "@graphty/graph-io";

registerSource(
    defineSource({
        id: "people",
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string; knows: string[] }[]>(`/api/people.json?team=${params.team}`);
            return { edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))) };
        },
    }),
);

// the token goes only to https://example.com, never to another host, a redirect or plain http
const { snapshot, report } = await loadFromSource(
    "people",
    { team: "core" },
    { endpoint: "https://example.com", credential: credentials.bearer("my-token") },
);
console.log(`${snapshot.edgeCount} edges in ${report.source?.requests} request`);
console.log(JSON.stringify(credentials.bearer("my-token"))); // the secret is never shown
