import { toElementData } from "@graphty/graph-samples";
import { football } from "@graphty/graph-samples/datasets/football";

// graphty-element takes plain node and edge records
const { nodes, edges } = toElementData(await football());
console.log(nodes.length, edges.length); // 115 613
console.log(Object.keys(nodes[0]).sort()); // [ 'conference', 'id', 'label' ]
console.log(Object.keys(edges[0]).sort()); // [ 'source', 'target' ]

// in a page: element.nodeData = nodes; element.edgeData = edges;
