import { type GraphSink } from "@graphty/graph-format";
import { csvImporter as rootCsvImporter, importGraph, type ImportReport, type SniffResult } from "@graphty/graph-io";
import { CSV_ISSUE, csvExporter, csvImporter, type CsvImportOptions } from "@graphty/graph-io/csv";
import { CYS_ISSUE, cysImporter, type CysImportOptions } from "@graphty/graph-io/cys";
import { dotExporter, dotImporter } from "@graphty/graph-io/dot";
import { GEXF_ISSUE, gexfExporter, gexfImporter, type GexfVersion } from "@graphty/graph-io/gexf";
import { GML_ISSUE, GML_LOSS, gmlExporter, gmlImporter } from "@graphty/graph-io/gml";
import { GRAPHML_ISSUE, graphmlExporter, graphmlImporter } from "@graphty/graph-io/graphml";
import { type JsonDialect, jsonExporter, jsonImporter, type JsonImportOptions } from "@graphty/graph-io/json";
import { NEO4J_ISSUE, neo4jExporter, neo4jImporter } from "@graphty/graph-io/neo4j";
import { OBO_ISSUE, oboImporter, type OboImportOptions } from "@graphty/graph-io/obo";
import { pajekExporter, pajekImporter } from "@graphty/graph-io/pajek";
import {
    XGMML_ISSUE,
    XGMML_LOSS,
    xgmmlExporter,
    xgmmlImporter,
    type XgmmlImportOptions,
} from "@graphty/graph-io/xgmml";
import { expectTypeOf } from "vitest";

// Every subpath exposes an importer / exporter pair typed by the 12.4 contract, and the root
// re-exports the same objects (the same type, the strict-consumer compile proves the shims agree).
expectTypeOf(csvImporter).toEqualTypeOf(rootCsvImporter);
expectTypeOf(csvImporter.format).toBeString();
expectTypeOf(csvExporter.capabilities.idCharset).toEqualTypeOf<"any" | "nmtoken" | "integer" | "dense-1-based">();
expectTypeOf(dotImporter.import).parameter(1).toEqualTypeOf<GraphSink>();
expectTypeOf(dotExporter.exportToString).returns.resolves.toBeString();
expectTypeOf(gexfImporter.import).returns.resolves.toEqualTypeOf<ImportReport>();
expectTypeOf(gexfExporter.format).toBeString();
expectTypeOf<GexfVersion>().toEqualTypeOf<"1.2" | "1.3">();
expectTypeOf(gmlImporter.format).toBeString();
expectTypeOf(gmlExporter.format).toBeString();
expectTypeOf(graphmlImporter.format).toBeString();
expectTypeOf(graphmlExporter.format).toBeString();
expectTypeOf(jsonImporter.format).toBeString();
expectTypeOf(jsonExporter.format).toBeString();
expectTypeOf<JsonDialect>().toEqualTypeOf<
    "node-link" | "d3" | "jgf" | "cytoscape" | "graphology" | "vis" | "obographs"
>();
expectTypeOf(neo4jImporter.format).toBeString();
expectTypeOf(neo4jExporter.format).toBeString();
expectTypeOf(oboImporter.format).toBeString();
expectTypeOf<OboImportOptions["obsolete"]>().toEqualTypeOf<"keep" | "drop" | undefined>();
expectTypeOf<OboImportOptions["typedefs"]>().toEqualTypeOf<"metadata" | "nodes" | undefined>();
expectTypeOf<JsonImportOptions["oboIds"]>().toEqualTypeOf<"curie" | "iri" | undefined>();
expectTypeOf<JsonImportOptions["graphName"]>().toEqualTypeOf<string | undefined>();
expectTypeOf(pajekImporter.format).toBeString();
expectTypeOf(pajekExporter.format).toBeString();
expectTypeOf(xgmmlImporter.format).toBeString();
expectTypeOf(xgmmlExporter.format).toBeString();
expectTypeOf<XgmmlImportOptions["zAs"]>().toEqualTypeOf<"column" | "position" | undefined>();
expectTypeOf(cysImporter.format).toBeString();
expectTypeOf<CysImportOptions["maxUncompressedBytes"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<CysImportOptions["graphName"]>().toEqualTypeOf<string | undefined>();

// The grouped code tables are frozen string tables.
expectTypeOf(CSV_ISSUE.EMPTY_INPUT).toBeString();
expectTypeOf(GEXF_ISSUE.NOT_GEXF).toBeString();
expectTypeOf(GML_ISSUE.NO_GRAPH).toBeString();
expectTypeOf(GML_LOSS.RECORD_NUMBER_TYPE).toBeString();
expectTypeOf(GRAPHML_ISSUE.XML_SYNTAX).toBeString();
expectTypeOf(NEO4J_ISSUE.HEADER).toBeString();
expectTypeOf(OBO_ISSUE.SYNTAX).toBeString();
expectTypeOf(XGMML_ISSUE.BAD_ATT).toBeString();
expectTypeOf(XGMML_LOSS.JSON_AS_STRING).toBeString();
expectTypeOf(CYS_ISSUE.NOT_ZIP).toBeString();

// Format-specific options intersect with the common options under exactOptionalPropertyTypes.
const csvOptions: CsvImportOptions & { ids?: "canonical" | undefined } = { delimiter: ";", ids: "canonical" };
expectTypeOf(csvOptions.delimiter).toEqualTypeOf<string | undefined>();

// importGraph() accepts format-specific options next to the common ones and resolves to the result shape.
expectTypeOf(importGraph).parameter(1).toMatchTypeOf<{ errorLimit?: number | undefined } | undefined>();
// A variable annotated with a format's options type is accepted as it is, on import and on export.
const annotatedCsv: CsvImportOptions = { delimiter: ";" };
expectTypeOf(importGraph("", annotatedCsv)).resolves.toHaveProperty("snapshot");
expectTypeOf(importGraph("", { format: "csv", delimiter: ";", ids: "canonical" })).resolves.toHaveProperty("snapshot");
expectTypeOf(importGraph("")).resolves.toHaveProperty("sniff").toEqualTypeOf<SniffResult | null>();
