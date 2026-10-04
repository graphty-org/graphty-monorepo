import { loadFromUrl } from "@graphty/graph-io";

const { snapshot, format } = await loadFromUrl("https://example.com/api/graphs/42/export", {
    request: { headers: { Authorization: "Bearer my-token" } }, // passed to fetch()
    format: "graphml", // the URL has no file extension, so say what the file is
    signal: AbortSignal.timeout(30_000), // also cancels the download
});
console.log(`${format}: ${snapshot.nodeCount} nodes`);
