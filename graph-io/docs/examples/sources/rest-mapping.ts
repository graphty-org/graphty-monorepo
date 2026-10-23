import { loadFromSource, registerSource, replayFetch } from "@graphty/graph-io";
import { type RestMapping, restSource } from "@graphty/graph-io/sources/rest";

// GET /teams/{team}/people?offset=0&limit=2 answers { "items": [{ "id", "name", "knows": [...] }] }
const mapping: RestMapping = {
    version: 1,
    endpoint: "https://people.example.com",
    load: "people",
    requests: {
        people: {
            path: "/teams/{team}/people",
            records: "items",
            entity: "person",
            paging: { style: "offset", param: "offset", size: { param: "limit", value: 2 } },
        },
    },
    entities: {
        person: { id: "id", fields: { name: "name" }, edges: [{ to: "knows[]", type: "knows", entity: "person" }] },
    },
};
registerSource(restSource(mapping, { id: "people", plainName: "People" }));

// recorded answers stand in for the service
const fetch = replayFetch([
    {
        url: "https://people.example.com/teams/core/people?offset=0&limit=2",
        body: {
            items: [
                { id: "ana", name: "Ana", knows: ["bo"] },
                { id: "bo", name: "Bo", knows: ["cy"] },
            ],
        },
    },
    { url: "https://people.example.com/teams/core/people?offset=2&limit=2", body: { items: [] } },
]);
const { snapshot } = await loadFromSource("people", { team: "core" }, { fetch });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges from ${fetch.calls.length} pages`);
// cy is known only as the end of an edge: a stub, until it is fetched
console.log(snapshot.nodes.value("_source.stub", snapshot.ids.requireIndex("cy")));
