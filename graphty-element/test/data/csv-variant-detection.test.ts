/**
 * @file What a CSV's header row is allowed to decide about how the file is read.
 *
 * The detector used to answer "adjacency list, and there is no header row" for every header row
 * that did not contain a `source`/`target` or `Source`/`Target` column. Three things followed,
 * all silent. A node table spelled `id,label` was read as an adjacency list, so its header row
 * became a node called "id" joined to a node called "label". A file spelled `from,to` -- one of
 * the three endpoint spellings the element itself accepts -- was read the same way. And a file
 * whose columns nothing recognises never reached the element as edge records at all, so the
 * element could not tell its reader which columns it had failed to read.
 *
 * An adjacency list carries no marker of any kind, so it cannot be detected; it is asked for, by
 * name. Everything below is the consequence of that one decision.
 */
import { assert, describe, it } from "vitest";

import { detectCSVVariant, sniffDelimiter } from "../../src/data/csv-variant-detection";

describe("the three endpoint spellings an edge list may use", () => {
    it("reads source/target", () => {
        const info = detectCSVVariant(["source", "target", "weight"]);
        assert.strictEqual(info.variant, "edge-list");
        assert.strictEqual(info.sourceColumn, "source");
        assert.strictEqual(info.targetColumn, "target");
        assert.isTrue(info.hasHeaders);
    });

    it("reads src/dst", () => {
        const info = detectCSVVariant(["src", "dst"]);
        assert.strictEqual(info.variant, "edge-list");
        assert.strictEqual(info.sourceColumn, "src");
        assert.strictEqual(info.targetColumn, "dst");
    });

    it("reads from/to, which it used to call an adjacency list", () => {
        const info = detectCSVVariant(["from", "to", "weight"]);
        assert.strictEqual(info.variant, "edge-list");
        assert.strictEqual(info.sourceColumn, "from");
        assert.strictEqual(info.targetColumn, "to");
    });

    it("prefers source/target when a file carries two spellings, as the element's own probe does", () => {
        const info = detectCSVVariant(["src", "dst", "source", "target"]);
        assert.strictEqual(info.sourceColumn, "source");
        assert.strictEqual(info.targetColumn, "target");
    });

    it("needs both halves of a pair, so one endpoint column alone is not an edge list", () => {
        const info = detectCSVVariant(["source", "weight"]);
        assert.notStrictEqual(info.variant, "edge-list");
    });
});

describe("a file that names no endpoint pair", () => {
    it("reads a node table as a node list rather than as an adjacency list", () => {
        const info = detectCSVVariant(["Id", "Label"]);
        assert.strictEqual(info.variant, "node-list");
        assert.strictEqual(info.idColumn, "Id");
        assert.isTrue(info.hasHeaders, "the header row is a header row, not the first node");
    });

    it("reads columns nothing recognises as a generic CSV with a header row", () => {
        const info = detectCSVVariant(["a", "b", "weight"]);
        assert.strictEqual(info.variant, "generic");
        assert.isTrue(info.hasHeaders, "so the records reach the element and it can name a and b");
    });

    it("never answers adjacency-list, which is asked for by name and never guessed", () => {
        for (const headers of [["a", "b"], ["id", "label"], ["x"], ["one", "two", "three", "four"]]) {
            assert.notStrictEqual(detectCSVVariant(headers).variant, "adjacency-list", headers.join(","));
        }
    });
});

describe("the variants that do carry a marker", () => {
    it("still reads Gephi's capitalised pair", () => {
        assert.strictEqual(detectCSVVariant(["Source", "Target", "Type"]).variant, "gephi");
    });

    it("still reads Neo4j's colon-prefixed columns", () => {
        assert.strictEqual(detectCSVVariant([":START_ID", ":END_ID", ":TYPE"]).variant, "neo4j");
    });

    it("still reads Cytoscape's interaction column", () => {
        assert.strictEqual(detectCSVVariant(["source", "interaction", "target"]).variant, "cytoscape");
    });
});

describe("sniffDelimiter", () => {
    it("picks the separator the header line uses most", () => {
        assert.strictEqual(sniffDelimiter("source,target\na,b"), ",");
        assert.strictEqual(sniffDelimiter("source\ttarget\ta,b\n"), "\t");
        assert.strictEqual(sniffDelimiter("source;target;weight"), ";");
        assert.strictEqual(sniffDelimiter("source|target"), "|");
    });

    it("does not count separators inside quotes", () => {
        assert.strictEqual(sniffDelimiter('"a;b;c",d'), ",");
    });

    it("falls back to a comma when the line has no separator", () => {
        assert.strictEqual(sniffDelimiter("id"), ",");
        assert.strictEqual(sniffDelimiter(""), ",");
    });

    it("reads only the first line", () => {
        assert.strictEqual(sniffDelimiter("a,b\nc;d;e;f"), ",");
    });
});
