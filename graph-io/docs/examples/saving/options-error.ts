import { readFile } from "node:fs/promises";

import { checkExport, GraphFormatError, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });

// An option value the format does not allow throws, from checkExport() as from the save
try {
    checkExport(snapshot, "obo", { ontology: "game of thrones" });
} catch (err) {
    if (err instanceof GraphFormatError) {
        console.log(`${err.code} (${String(err.details.option)}): ${err.message}`);
    } else {
        throw err;
    }
}
