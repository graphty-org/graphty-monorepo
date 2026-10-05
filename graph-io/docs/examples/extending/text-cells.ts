import { GraphBuilder, ImportReportBuilder, TextCellWriter } from "@graphty/graph-io";

// In an importer, `sink` and `report` are the ones import() works with
const sink = new GraphBuilder({ directed: false });
const report = new ImportReportBuilder("pairs", 100);

// one writer per attribute; it chooses the attribute's type from all of its cells
const size = new TextCellWriter("size", "node", sink, report);
size.write(sink.addNode("a"), "2");
size.write(sink.addNode("b"), "2.5");
sink.addNode("c"); // an empty cell: write nothing, and the node has no value

const snapshot = sink.freeze();
console.log(
    snapshot.nodes.get("size")?.meta.dtype,
    [0, 1, 2].map((i) => snapshot.nodes.value("size", i)),
);
