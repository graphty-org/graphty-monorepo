import { importGraph } from "@graphty/graph-io";
import { CSV_ISSUE } from "@graphty/graph-io/csv";

const csv = ["source,target,weight", "a,b,1", "b,c", "c,d,heavy", "d,a,2"].join("\n");

const { snapshot, report } = await importGraph(csv, { format: "csv" });

console.log(
    `${report.counts.nodes} nodes and ${report.counts.edges} edges read, ${report.counts.skippedEdges} skipped`,
);
for (const issue of report.issues) {
    console.log(`${issue.severity} ${issue.code} line ${issue.line ?? "-"}: ${issue.message}`);
}
console.log(`the snapshot holds ${snapshot.edgeCount} edges`);

// The code tables name every code a format can record
const short = report.issues.filter((i) => i.code === CSV_ISSUE.FIELD_COUNT);
console.log(`rows with a missing cell: ${short.map((i) => i.line).join(", ")}`);
