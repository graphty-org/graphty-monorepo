import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// Two interactions, one with two targets, and a protein with no interactions
const text = "YAL001C\tpp\tYBR236C\nYBR236C\tpd\tYCR010W\tYDL159W\nYGL200C\n";
const { snapshot } = await importGraph(text, { filename: "network.sif" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
for (let e = 0; e < snapshot.edgeCount; e++) {
    const from = snapshot.ids.idOf(snapshot.edgeSource(e));
    const to = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(from)} ${String(snapshot.edges.value("interaction", e))} ${String(to)}`);
}

// Save it again: SIF keeps the nodes, the edges and their interactions, nothing else
console.log(checkExport(snapshot, "sif").length === 0 ? "nothing lost" : "something lost");
console.log(await exportGraphToString(snapshot, "sif"));
