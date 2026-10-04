import { loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl("https://graphty.app/docs/graph-io/samples/got-network.graphml");

// the attribute the file marks as each node's label (null when there is none)
const label = snapshot.nodes.byRole("label");
// edge weights, one per edge (null for an unweighted graph)
const weights = snapshot.edgeList().weights;

const nodes = Array.from({ length: snapshot.nodeCount }, (_, i) => ({
    id: snapshot.ids.idOf(i),
    label: label ? snapshot.nodes.value(label.meta.name, i) : undefined,
}));
const links = Array.from({ length: snapshot.edgeCount }, (_, e) => ({
    source: snapshot.ids.idOf(snapshot.edgeSource(e)),
    target: snapshot.ids.idOf(snapshot.edgeTarget(e)),
    weight: weights ? weights[e] : 1,
}));

console.log(nodes[0], links[0]);
