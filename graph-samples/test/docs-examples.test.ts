// Runs every documentation example in docs/examples/ and checks what it prints (tools/docs-examples.mjs). A dataset
// an example downloads is answered from the repository's copy of it (data/), so the test needs no network.
import { fileURLToPath } from "node:url";

import { fromEdgeArrays } from "@graphty/graph-format";
import { vi } from "vitest";

import { describeDocsExamples } from "../../tools/docs-examples.mjs";
import { buildDataset } from "../data/build.js";
import { SOURCE_DATA } from "./helpers/datasets.js";

describeDocsExamples(fileURLToPath(new URL("../docs/examples/", import.meta.url)), {
    beforeEach: () => {
        vi.stubGlobal("fetch", (url: URL) => {
            const name = /([a-z0-9-]+)\.gsnp\.gz$/.exec(url.href)?.[1] ?? "";
            if (!(name in SOURCE_DATA)) {
                return Promise.resolve(new Response("not found", { status: 404 }));
            }
            return Promise.resolve(new Response(fromEdgeArrays(buildDataset(SOURCE_DATA[name])).toBytes().slice()));
        });
    },
});
