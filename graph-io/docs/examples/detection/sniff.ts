import { readFile } from "node:fs/promises";

import { sniff, SNIFF_HEAD_BYTES } from "@graphty/graph-io";

const bytes = await readFile("karate-neo4j.csv");

// The content outranks the name: this .csv file has a neo4j-admin header
console.log(sniff({ filename: "karate-neo4j.csv", head: bytes.subarray(0, SNIFF_HEAD_BYTES) }));

// A name alone is a weak hint, but it is enough when nothing contradicts it
console.log(sniff({ filename: "graph.gexf" }));

// For JSON, the result also names the dialect the document looks like
console.log(sniff({ head: '{ "elements": { "nodes": [ { "data": { "id": "a" } } ] } }' })?.dialect);
