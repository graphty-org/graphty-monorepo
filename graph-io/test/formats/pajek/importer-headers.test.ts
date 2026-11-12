import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { pajekImporter } from "../../../src/formats/pajek/importer.js";

async function load(text: string): Promise<{ codes: string[]; nodes: number; columns: string[] }> {
    const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const report = await pajekImporter.import(text, sink);
    const snapshot = sink.freeze();
    return {
        codes: report.issues.map((i) => i.code),
        nodes: snapshot.nodeCount,
        columns: [...snapshot.nodes.names()],
    };
}

describe("pajek importer: section headers", () => {
    it("skips the *Vertices line of a project object other than a partition or vector", async () => {
        const result = await load(
            ["*Vertices 2", '1 "a"', '2 "b"', "*Edges", "1 2", "*Permutation p", "*Vertices 2", "2", "1"].join("\n"),
        );
        expect(result).toMatchInlineSnapshot(`
          {
            "codes": [
              "W_PAJEK_UNSUPPORTED_SECTION",
            ],
            "columns": [
              "label",
            ],
            "nodes": 2,
          }
        `);
    });

    it("reads a *Partition header without a name", async () => {
        const result = await load(["*Vertices 2", '1 "a"', '2 "b"', "*Partition", "*Vertices 2", "1", "2"].join("\n"));
        expect(result).toMatchInlineSnapshot(`
          {
            "codes": [
              "W_PAJEK_NO_LINES",
            ],
            "columns": [
              "label",
              "partition",
            ],
            "nodes": 2,
          }
        `);
    });

    it("warns once per unsupported section and keeps reading", async () => {
        const result = await load(
            ["*Vertices 2", '1 "a"', '2 "b"', "*Foo", "x", "*Bar", "y", "*Edges", "1 2"].join("\n"),
        );
        expect(result).toMatchInlineSnapshot(`
          {
            "codes": [
              "W_PAJEK_UNSUPPORTED_SECTION",
              "W_PAJEK_UNSUPPORTED_SECTION",
            ],
            "columns": [
              "label",
            ],
            "nodes": 2,
          }
        `);
    });
});
