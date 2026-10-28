import { defineSource, loadFromSource, replayFetch } from "@graphty/graph-io";

type LinkPage = { links: { from: number; to: number }[]; next: string | null };

const links = defineSource({
    id: "issue-links",
    async *records(params: { repo: string }, ctx) {
        let url: string | null = `/repos/${encodeURIComponent(params.repo)}/links`;
        while (url !== null) {
            const page: LinkPage = await ctx.fetchJson<LinkPage>(url);
            yield { edges: page.links.map((l) => ({ source: l.from, target: l.to })) };
            url = page.next;
        }
    },
});

// recorded answers stand in for the service
const fetch = replayFetch([
    {
        url: "https://tracker.example.com/repos/core/links",
        body: { links: [{ from: 1, to: 2 }], next: "/repos/core/links?page=2" },
    },
    { url: "https://tracker.example.com/repos/core/links?page=2", body: { links: [{ from: 2, to: 3 }], next: null } },
]);
const { snapshot } = await loadFromSource(links, { repo: "core" }, { endpoint: "https://tracker.example.com", fetch });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges from ${fetch.calls.length} pages`);
