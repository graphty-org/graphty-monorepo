/**
 * Robustness of the CSV importer against documents of another kind read with format "csv".
 */

import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import { codes, importFailure } from "./helpers.js";

describe("robustness: CSV given a document that is no table", () => {
    it("refuses an HTML error page with E_FOREIGN_FORMAT instead of nodes named <html>", async () => {
        const html = "<!DOCTYPE html>\n<html><head><title>404 Not Found</title></head>\n<body><h1>Not Found</h1></body></html>\n";
        for (const format of ["csv", "neo4j", "dot", "gml", "pajek", "json"]) {
            const err = await importFailure(importGraph(html, { format }));
            expect([format, codes(err.report)]).toEqual([format, ["E_FOREIGN_FORMAT"]]);
            expect(err.message).toContain("HTML document");
        }
    });

    it("refuses a PDF read as CSV", async () => {
        const err = await importFailure(importGraph("%PDF-1.4\n1 0 obj\n<< >>\nendobj\n", { format: "csv" }));
        expect(codes(err.report)).toEqual(["E_FOREIGN_FORMAT"]);
    });
});
