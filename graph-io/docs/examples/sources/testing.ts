import { credentials, defineSource, loadFromSource, replayFetch } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    records: async (params: { team: string }, ctx) => ({
        nodes: await ctx.fetchJson<{ id: string }[]>(`/api/people?team=${params.team}`),
    }),
});

// a recording answers only a request that carries a credential; any other request fails the test
const fetch = replayFetch([
    { url: "https://example.com/api/people?team=core", credential: true, body: [{ id: "ana" }] },
]);
const { snapshot } = await loadFromSource(
    people,
    { team: "core" },
    { endpoint: "https://example.com", credential: credentials.basic("me", "secret"), fetch },
);
console.log(`${snapshot.nodeCount} node`, fetch.calls);
