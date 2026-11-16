import { fromBytes, GraphBuilder } from "@graphty/graph-format";

// 1. Build. Ids are strings or numbers; indices are given in order of first appearance.
const builder = new GraphBuilder({ directed: false });
builder.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
builder.addNodeRecord("alice", { label: "Alice" });
builder.addNodeRecord("bob", { label: "Bob" });
builder.addEdge("alice", "bob", 2.5);
builder.addEdge("bob", "carol", 1); // "carol" is added on first mention

// 2. Freeze: a read-only snapshot. The builder stays usable and can be frozen again.
const snapshot = builder.freeze();
console.log(snapshot.nodeCount, snapshot.edgeCount, snapshot.arcCount); // 3 2 4

// 3. Walk the neighbours of every node: node u's arcs are rowPtr[u] up to rowPtr[u + 1].
const { rowPtr, colIdx, weights } = snapshot;
const strength = new Float64Array(snapshot.nodeCount);
for (let u = 0; u < snapshot.nodeCount; u++) {
    for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
        strength[u] += weights === null ? 1 : weights[a];
    }
}

// 4. Turn indices back into ids only when you hand a result on.
const byId = snapshot.ids.toMap(strength);
console.log(byId.get("alice"), byId.get("bob"), byId.get("carol")); // 2.5 3.5 1
console.log(snapshot.nodes.value("label", snapshot.ids.requireIndex("bob"))); // Bob

// 5. Save it as bytes and read it back.
const back = fromBytes(snapshot.toBytes());
console.log(back.ids.idOf(colIdx[rowPtr[0]])); // bob
