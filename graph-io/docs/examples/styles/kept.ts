import {
    createRegistry,
    forDecodedText,
    type GraphImporter,
    ImportReportBuilder,
    readText,
    resolveImportOptions,
} from "@graphty/graph-io";
import { csvImporter } from "@graphty/graph-io/csv";
import { resolveStyles } from "@graphty/graph-io/styles";

// A roster whose first line is a legend: "# legend red=tomato blue=skyblue", then a CSV node table
const legendImporter: GraphImporter = {
    ...csvImporter,
    format: "legend",
    extensions: [".legend"],
    async import(input, sink, options) {
        const opts = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: null });
        const report = new ImportReportBuilder("legend", opts.errorLimit);
        const text = await readText(input, report, opts);
        const legend = new Map(
            /^# legend (.*)$/m
                .exec(text)?.[1]
                .split(" ")
                .map((p) => p.split("=") as [string, string]),
        );
        report.keepForStyles(legend); // handed back to styles() as context.kept, for this import only
        report.include(await csvImporter.import(text, sink, forDecodedText(options)));
        return report.finish();
    },
    styles(snapshot, context) {
        const legend = context.kept as Map<string, string>;
        const fill = Array.from({ length: snapshot.nodeCount }, (_, i) =>
            legend.get(String(snapshot.nodes.value("team", i))),
        );
        return { dialect: "css", node: { fill } };
    },
};

const text = "# legend red=tomato blue=skyblue\nid,team\na,red\nb,blue\nc,red\n";
const { snapshot, styles } = await createRegistry()
    .registerImporter(legendImporter)
    .importGraph(text, { format: "legend", styles: true });
if (styles) {
    console.log(resolveStyles(styles, "node", "fill", snapshot).join(" "));
}
