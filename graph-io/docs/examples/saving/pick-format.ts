import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, extensionOf, importGraph, listFormats } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("karate.gml"), { filename: "karate.gml" });

for (const path of ["karate.gexf", "karate.dot", "karate.xyz"]) {
    const extension = extensionOf(path) ?? "";
    const target = listFormats().find((f) => f.canExport && f.extensions.includes(extension));
    if (target === undefined) {
        console.error(`${path}: no format writes ${extension} files`);
        continue;
    }
    await writeFile(path, await exportGraphToBytes(snapshot, target.format));
}
