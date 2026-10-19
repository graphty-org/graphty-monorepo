import { exportGraphToString, type GraphExporter, importGraph, registry } from "@graphty/graph-io";
import { csvExporter, type CsvExportOptions } from "@graphty/graph-io/csv";

// Every CSV file this application writes starts with a comment line naming it.
// graph-io's CSV importer skips leading # lines, so the files read back unchanged.
const STAMP = "# written by Acme Graph Studio\n";

const stampedCsv: GraphExporter<CsvExportOptions> = {
    ...csvExporter,
    async *export(snapshot, options) {
        yield new TextEncoder().encode(STAMP);
        yield* csvExporter.export(snapshot, options);
    },
    async exportToString(snapshot, options) {
        return STAMP + (await csvExporter.exportToString(snapshot, options));
    },
};
registry.registerExporter(stampedCsv); // replaces the built-in CSV exporter

const { snapshot } = await importGraph("digraph { a -> b; b -> c }");
const csv = await exportGraphToString(snapshot, "csv");
console.log(csv);
console.log((await importGraph(csv, { format: "csv" })).snapshot.edgeCount);
