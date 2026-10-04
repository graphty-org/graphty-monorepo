import { GraphFormatError, loadFromUrl } from "@graphty/graph-io";

try {
    const { snapshot, format, report } = await loadFromUrl("https://example.com/data/karate.gml");
    console.log(`Read ${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
    for (const issue of report.issues) {
        console.warn(`${issue.severity} ${issue.code} (line ${issue.line ?? "-"}): ${issue.message}`);
    }
} catch (err) {
    if (err instanceof GraphFormatError) {
        console.error(`Could not load the graph: ${err.message}`);
    } else {
        throw err;
    }
}
