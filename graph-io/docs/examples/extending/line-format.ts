import { defineLineFormat, importGraph, registry } from "@graphty/graph-io";

const pairs = defineLineFormat({
    format: "pairs",
    extensions: [".pairs"],
    parseLine(fields, graph) {
        if (fields[1] === "=") {
            graph.node(fields[0], { label: fields.slice(2).join(" ") }); // alice = Alice Liddell
        } else if (fields.length === 1) {
            graph.node(fields[0]); // alice
        } else if (fields.length <= 3) {
            graph.edge(fields[0], fields[1], { weight: fields[2] }); // alice bob 2.5
        } else {
            throw new Error("expected an id, an id = label, or two ids and a weight");
        }
    },
});
registry.registerImporter(pairs);

const text = "# friends\nalice = Alice Liddell\nalice bob 2.5\nbob carol\nerin frank gus hal\n";
const { snapshot, report } = await importGraph(text, { filename: "friends.pairs" });
console.log(
    `${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, label of alice: ${snapshot.nodes.byRole("label")?.value(0)}`,
);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
