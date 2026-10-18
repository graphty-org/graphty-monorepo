import {
    exportGraph,
    type GraphExporter,
    type GraphImporter,
    importGraph,
    type ImportGraphResult,
    jsonExporter,
    jsonImporter,
} from "@graphty/graph-io";
import { type ExporterStyleOptions, type ExtractedStyles, type StyleReadContext } from "@graphty/graph-io/styles";
import { expectTypeOf } from "vitest";

// A third-party importer's whole style support is one line on the simple path.
const groups: GraphImporter = {
    format: "groups",
    extensions: [".groups"],
    mimeTypes: [],
    import: (input, sink, options) => jsonImporter.import(input, sink, options),
    styles: () => ({ dialect: "css", node: { fill: { data: "color" } } }),
};
expectTypeOf(groups.styles).parameter(1).toEqualTypeOf<StyleReadContext>();

// A third-party exporter keeps every style for graphty with one member.
const attributes: GraphExporter<ExporterStyleOptions> = {
    format: "mine",
    capabilities: jsonExporter.capabilities,
    check: (s, o) => jsonExporter.check(s, o),
    export: (s, o) => jsonExporter.export(s, o),
    exportToString: (s, o) => jsonExporter.exportToString(s, o),
    styles: { capabilities: { node: [], edge: [], block: "attributes" } },
};
expectTypeOf(attributes.styles?.capabilities.block).toEqualTypeOf<"native" | "attributes" | "none" | undefined>();

// Styles in, styles out.
async function roundTrip(text: string): Promise<void> {
    const result = await importGraph(text, { styles: { toolDefaults: false } });
    expectTypeOf(result.styles).toEqualTypeOf<ExtractedStyles | null | undefined>();
    expectTypeOf<ImportGraphResult["styles"]>().toEqualTypeOf<ExtractedStyles | null | undefined>();
    exportGraph(result.snapshot, "graphml", { styles: result.styles });
}
expectTypeOf(roundTrip).returns.resolves.toBeVoid();
