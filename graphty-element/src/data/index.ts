import type { GraphSnapshot } from "@graphty/graph-format";
import { cx2Importer, cxImporter, cysImporter, oboImporter, xgmmlImporter } from "@graphty/graph-io";

import { formatDescriptor } from "../catalog/formats";
import type { FormatDescriptor } from "../catalog/types";
import { CSVDataSource } from "./CSVDataSource";
import { DataSource } from "./DataSource";
import { DOTDataSource } from "./DOTDataSource";
import { ErrorAggregator } from "./ErrorAggregator";
import { GEXFDataSource } from "./GEXFDataSource";
import { GMLDataSource } from "./GMLDataSource";
import { GraphMLDataSource } from "./GraphMLDataSource";
import { JsonDataSource } from "./JsonDataSource";
import { PajekDataSource } from "./PajekDataSource";

DataSource.register(JsonDataSource);
DataSource.register(GraphMLDataSource);
DataSource.register(CSVDataSource);
DataSource.register(GMLDataSource);
DataSource.register(GEXFDataSource);
DataSource.register(DOTDataSource);
DataSource.register(PajekDataSource);

/**
 * The element's own descriptor of a format it reads through a graph-io importer.
 * @param id - The format id.
 * @returns The descriptor from the built-in table.
 */
function builtIn(id: string): FormatDescriptor {
    return formatDescriptor(id) as FormatDescriptor;
}

/**
 * The words that set an XGMML graph's direction: the root's `directed` attribute, else Cytoscape's
 * `cy:directed` on every edge, else the DTD's default for an absent attribute.
 * @param snapshot - The imported graph.
 * @returns The statement.
 */
function xgmmlDirection(snapshot: GraphSnapshot): string {
    const written = (snapshot.meta.extra.xgmml as { directed?: unknown } | undefined)?.directed;
    if (typeof written === "string") {
        return `directed="${written}"`;
    }

    return snapshot.directed
        ? "cy:directed on the edges"
        : "the XGMML default for an absent directed attribute (undirected)";
}

// Read by graph-io with no reader of their own: each is the importer and its catalogue entry.
DataSource.register(DataSource.fromImporter(xgmmlImporter, builtIn("xgmml"), { statedBy: xgmmlDirection }));
DataSource.register(
    DataSource.fromImporter(cx2Importer, builtIn("cx2"), { statedBy: () => "CX2 edges, which point from s to t" }),
);
DataSource.register(
    DataSource.fromImporter(cxImporter, builtIn("cx"), { statedBy: () => "CX edges, which point from s to t" }),
);
DataSource.register(
    DataSource.fromImporter(cysImporter, builtIn("cys"), {
        statedBy: (snapshot) =>
            snapshot.directed ? "cy:directed on the session's edges" : "the session's undirected edges",
    }),
);
DataSource.register(
    DataSource.fromImporter(oboImporter, builtIn("obo"), {
        statedBy: () => "OBO relations, which point from a term to its parent",
    }),
);

export { ErrorAggregator };
export type { DataLoadingError, ErrorSummary } from "./ErrorAggregator";
