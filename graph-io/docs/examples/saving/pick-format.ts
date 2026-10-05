import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, extensionOf, importGraph, listFormats } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got.gml"), { filename: "got.gml" });

for (const path of ["network.gexf", "network.dot", "network.tsv", "network.xyz"]) {
    const extension = extensionOf(path) ?? "";
    const target = listFormats().find((f) => f.canExport && f.extensions.includes(extension));
    if (target === undefined) {
        console.error(`${path}: no format writes ${extension} files`);
        continue;
    }
    // .tsv is the csv format: the extension does not set the delimiter, so pass a tab
    const options = extension === ".tsv" ? { delimiter: "\t" } : {};
    await writeFile(path, await exportGraphToBytes(snapshot, target.format, options));
    console.log(`${path}: ${target.format}`);
}
