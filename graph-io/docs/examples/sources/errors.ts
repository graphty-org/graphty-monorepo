import { defineSource, ImportError, loadFromSource, replayFetch } from "@graphty/graph-io";

const people = defineSource({
    id: "people",
    records: (params: { team: string }, ctx) => ctx.fetchJson(`/api/people?team=${params.team}`),
});

const fetch = replayFetch([{ url: "https://example.com/api/people?team=core", status: 401 }]);
try {
    await loadFromSource(people, { team: "core" }, { endpoint: "https://example.com", fetch });
} catch (err) {
    if (err instanceof ImportError) {
        // a code and its values, never a sentence: the application writes its own words
        console.log(err.issue?.code, err.issue?.params);
    }
}
