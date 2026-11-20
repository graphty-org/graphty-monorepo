import { listFromSource, loadFromSource } from "@graphty/graph-io";
import { githubSource } from "@graphty/graph-io/sources/github";

// the sample files of this guide, kept in graphty's own repository
const repository = "graphty-org/graphty-monorepo";

// browse: the GraphML files in one folder of the default branch
const listing = await listFromSource(githubSource, {
    params: { repository, path: "graph-io/docs/samples" },
    search: ".graphml",
});
for (const item of listing.items) {
    console.log(item.name);
}

// load one: graph-io detects the format from the file name and its first bytes
const { snapshot, format } = await loadFromSource(githubSource, { repository, path: listing.items[0].name });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
