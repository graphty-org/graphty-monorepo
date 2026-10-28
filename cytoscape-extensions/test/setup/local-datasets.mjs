/**
 * The tests never download a dataset: the global fetch answers graphty.app's dataset URLs from graph-samples' build
 * output (graph-samples/dist/data/v1/, the files graphty.app publishes), so build graph-samples first (nx does).
 * Every other URL goes to the real fetch. A vitest setup file, and `node --import` for the pages test/bundle.test.ts
 * runs in a child Node.
 */

import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const { Request, Response } = globalThis;

const BASE = "https://graphty.app/data/graph-samples/v1/";
const local = new URL("../../../graph-samples/dist/data/v1/", import.meta.url);
const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith(BASE)) {
        return realFetch(input, init);
    }
    init?.signal?.throwIfAborted();
    try {
        return new Response(await readFile(new URL(url.slice(BASE.length), local)));
    } catch {
        return new Response("not in graph-samples/dist/data/v1/: build graph-samples", { status: 404 });
    }
};
