import { fromEdgeArrays } from "@graphty/graph-format";
import { fetchDataset } from "@graphty/graph-samples";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";

// A generated graph: 1,000 nodes, each new node linking to 2 existing ones, seeded so it is the
// same graph on every machine.
const generated = barabasiAlbertGraph({ n: 1000, m: 2, seed: 42 });
const snapshot = fromEdgeArrays(generated);
console.log(snapshot.nodeCount, snapshot.edgeCount); // 1000 1996

// A real network, downloaded from graphty.app the first time you ask for it.
const club = await fetchDataset("karate");
console.log(club.nodeCount, club.edgeCount, club.nodes.value("club", 0)); // 34 78 Mr. Hi
