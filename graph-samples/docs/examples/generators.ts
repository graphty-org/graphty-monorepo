import { fromEdgeArrays } from "@graphty/graph-format";
import { GENERATOR_CATALOG } from "@graphty/graph-samples";
import { generateGraph, plantedPartitionGraph } from "@graphty/graph-samples/generators";

// The same options and seed always give the same graph, node for node and edge for edge.
const a = plantedPartitionGraph({ groups: 4, groupSize: 25, pIn: 0.3, pOut: 0.01, seed: 7 });
const b = plantedPartitionGraph({ groups: 4, groupSize: 25, pIn: 0.3, pOut: 0.01, seed: 7 });
console.log(a.src.length === b.src.length && a.src.every((v, i) => v === b.src[i])); // true

// A generator with a known answer returns it as a node column: here, each node's planted group.
const graph = fromEdgeArrays(a);
console.log(graph.nodes.value("community", 0), graph.nodes.value("community", 99)); // 0 3

// Every generator by name, with defaults that make a small, readable graph.
console.log(GENERATOR_CATALOG.length > 40); // true
const smallWorld = generateGraph("watts-strogatz", { n: 200, seed: 3 });
console.log(fromEdgeArrays(smallWorld).nodeCount); // 200
