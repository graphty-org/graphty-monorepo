import { readFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";
import { type GmlExportOptions } from "@graphty/graph-io/gml";

const { snapshot } = await importGraph(await readFile("got.gml"), { filename: "got.gml" });

// `satisfies` checks the GML options and the ones every exporter takes
const options = { sanitizeIds: "mangle", weightKey: "weight" } satisfies GmlExportOptions;
const gml = await exportGraphToString(snapshot, "gml", options);
console.log(gml.split("\n").slice(0, 7).join("\n"));
