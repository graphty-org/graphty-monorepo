import { expandFromSource, listFromSource, probeSource } from "@graphty/graph-io";

// search NDEx, then look at the first hit before loading it
const listing = await listFromSource("ndex", { params: {}, search: "WP5483", size: 5 });
const [first] = listing.items;
console.log(`${listing.total} found: ${first.name}`);

const probe = await probeSource("ndex", first.params);
console.log(probe.counts);

// the neighborhood of one node, by its node id: only the seed, its neighbors and their edges
const part = await expandFromSource("ndex", { params: first.params, ids: [1245568], depth: 1 });
console.log(`${part.snapshot.nodeCount} nodes, ${part.snapshot.edgeCount} edge`);
