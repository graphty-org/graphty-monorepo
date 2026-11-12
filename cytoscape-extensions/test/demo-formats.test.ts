import { readFileSync } from "node:fs";

import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import graphtyCytoscape from "../src/index";
import { parseSummary } from "../stories/formats.js";

cytoscape.use(graphtyCytoscape);

// The Formats stories show, beside each graph, a summary of what the import read above the whole file.
describe("the Formats stories' parse summary", () => {
    it("names the file, its size, the counts, the attributes and their kinds", async () => {
        const text = readFileSync(new URL("../../graph-io/test/corpus/pajek/karate.net", import.meta.url), "utf8");
        const cy = cytoscape({ headless: true });
        const r = await cy.graphtyImport(text, "pajek");
        const lines = parseSummary("karate.net", Buffer.byteLength(text), r, cy).split("\n");
        expect(lines[0]).toBe(`karate.net, ${Buffer.byteLength(text).toLocaleString("en-US")} bytes`);
        expect(lines[1]).toBe("read as pajek: 34 nodes, 78 edges");
        expect(lines[2]).toMatch(/^node attributes: .*\blabel \(string\)/);
        expect(lines[3]).toMatch(/^edge attributes: /);
    });

    it("lists the importer's notes by code", async () => {
        const cy = cytoscape({ headless: true });
        // Cytoscape reserves the data field "parent", so the column arrives renamed, with a warning on each read
        const r = await cy.graphtyImport("source,target,parent\na,b,x\nb,c,y\n", "csv");
        const lines = parseSummary("parent.csv", 33, r, cy).split("\n");
        expect(lines[1]).toBe("read as csv: 3 nodes, 2 edges");
        expect(lines.at(-2)).toBe("import notes:");
        expect(lines.at(-1)).toMatch(/^ {2}W_COLUMN_RENAMED: edge attribute "parent" renamed/);
    });
});
