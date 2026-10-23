/**
 * A template line read as a row (words and one value) and written back, through the `./schema`
 * entry point an editor imports.
 */

import { assert, describe, it } from "vitest";

import { labelTemplateLine, labelTemplateRow } from "../../../schema";
import { isGraphtyError } from "../../../src/errors";

describe("labelTemplateRow and labelTemplateLine", () => {
    it("reads the rows an editor writes", () => {
        assert.deepEqual(labelTemplateRow("<bold>{data.id}</bold>"), { text: "", path: "data.id", bold: true });
        assert.deepEqual(labelTemplateRow("Connections: {results.degree.value}"), {
            text: "Connections: ",
            path: "results.degree.value",
            bold: false,
        });
    });

    it("answers null for a line that is not one row", () => {
        for (const line of [
            "Community {results.louvain.group|rank} of {results.louvain.group|count}",
            "{a} and {b}",
            "{data.id} items",
            "<color='red'>{data.id}</color>",
            "<bold>{data.id}",
            "no value",
            "{ }",
        ]) {
            assert.isNull(labelTemplateRow(line), line);
        }
    });

    it("writes a row that reads back as the same row, its words escaped", () => {
        for (const row of [
            { text: "", path: "data.id", bold: true },
            { text: "a < b: ", path: "data.score", bold: false },
            { text: "<lt>", path: "x", bold: false },
        ]) {
            assert.deepEqual(labelTemplateRow(labelTemplateLine(row)), row);
        }
        assert.strictEqual(labelTemplateLine({ text: "a<b ", path: "data.x" }), "a<lt>b {data.x}");
    });

    it("refuses words with braces and a path it cannot write", () => {
        for (const row of [
            { text: "{", path: "data.id" },
            { text: "", path: " " },
            { text: "", path: "a|count" },
        ]) {
            try {
                labelTemplateLine(row);
                assert.fail("refused");
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_LAYER");
            }
        }
    });
});
