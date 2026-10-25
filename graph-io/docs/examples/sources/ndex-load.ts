import { loadFromSource } from "@graphty/graph-io";

// WikiPathways WP5483, a small public network
const { snapshot, format, report } = await loadFromSource("ndex", { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(`last changed on NDEx: ${snapshot.meta.modified}`);
console.log(`${report.source?.requests} requests, ${report.source?.bytes} bytes`);
