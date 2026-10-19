import { edgeWeights, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

// the column the file marks as the node labels, whatever it is named; some JSON files only have a "name"
const label = snapshot.nodes.byRole("label") ?? snapshot.nodes.get("name");
// edge weights, one per edge, exactly as the file wrote them (null for an unweighted graph)
const weights = edgeWeights(snapshot);

const nodes = Array.from({ length: snapshot.nodeCount }, (_, i) => ({
    id: snapshot.ids.idOf(i),
    label: label?.value(i),
}));
const links = Array.from({ length: snapshot.edgeCount }, (_, e) => ({
    source: snapshot.ids.idOf(snapshot.edgeSource(e)),
    target: snapshot.ids.idOf(snapshot.edgeTarget(e)),
    weight: weights ? weights[e] : 1,
}));

console.log(`labels from the "${label?.meta.name}" column`);
console.log(nodes[0], links[0]);
