import { createReadStream, openAsBlob } from "node:fs";
import { readFile } from "node:fs/promises";

import { importGraph, loadFromFile } from "@graphty/graph-io";

// A string
const fromText = await importGraph("graph G { a -- b; b -- c }");
console.log(`text: ${fromText.format}, ${fromText.snapshot.edgeCount} edges`);

// Bytes: a Uint8Array or a Node Buffer
const fromBytes = await importGraph(await readFile("karate.gml"), { filename: "karate.gml" });
console.log(`bytes: ${fromBytes.format}, ${fromBytes.snapshot.nodeCount} nodes`);

// A Node stream, or any async iterable of strings or bytes
const fromStream = await importGraph(createReadStream("dolphins.net"), { filename: "dolphins.net" });
console.log(`stream: ${fromStream.format}, ${fromStream.snapshot.nodeCount} nodes`);

// A Blob or File
const fromBlob = await loadFromFile(await openAsBlob("miserables.json"), { filename: "miserables.json" });
console.log(`blob: ${fromBlob.format}, ${fromBlob.snapshot.nodeCount} nodes`);
