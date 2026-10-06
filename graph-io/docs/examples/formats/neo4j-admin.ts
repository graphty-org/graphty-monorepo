import { readFile, writeFile } from "node:fs/promises";

import { exportNeo4jFiles, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("movies-nodes.csv"), {
    format: "neo4j",
    relationships: await readFile("movies-rels.csv"),
});

// One file per id space and per pair of endpoint id spaces, each with one header row
const files = await exportNeo4jFiles(snapshot);
for (const file of files) {
    await writeFile(file.name, file.text);
}

// The neo4j-admin command that loads them
const args = files.map((f) => `--${f.kind}=${f.name}`);
console.log(`neo4j-admin database import full ${args.join(" ")} neo4j`);
