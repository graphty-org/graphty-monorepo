import { describe, expect, it } from "vitest";

import * as codes from "../../src/common/codes.js";
import { JSON_ISSUE } from "../../src/formats/json/index.js";

describe("shared issue codes", () => {
    it("spells the codes the Cytoscape and OBO importers share (design cytoscape-and-obo 1.0.1)", () => {
        expect({
            BAD_VALUE: codes.BAD_VALUE_CODE,
            WIDENED: codes.WIDENED_CODE,
            DANGLING_REFERENCE: codes.DANGLING_REFERENCE_CODE,
            DUPLICATE_ATTRIBUTE: codes.DUPLICATE_ATTRIBUTE_CODE,
            PARENT_CYCLE: codes.PARENT_CYCLE_CODE,
            EQUATION_AS_TEXT: codes.EQUATION_AS_TEXT_CODE,
            STYLES_NOT_IMPORTED: codes.STYLES_NOT_IMPORTED_CODE,
            BAD_ASPECT_BLOCK: codes.BAD_ASPECT_BLOCK_CODE,
            ASPECT_ORDER: codes.ASPECT_ORDER_CODE,
            COUNT_MISMATCH: codes.COUNT_MISMATCH_CODE,
            STATUS_FAILED: codes.STATUS_FAILED_CODE,
            STATUS_WARNING: codes.STATUS_WARNING_CODE,
            TOO_LARGE: codes.TOO_LARGE_CODE,
            GRAPH_NOT_FOUND: codes.GRAPH_NOT_FOUND_CODE,
            AMBIGUOUS_GRAPH_NAME: codes.AMBIGUOUS_GRAPH_NAME_CODE,
        }).toEqual({
            BAD_VALUE: "E_BAD_VALUE",
            WIDENED: "W_WIDENED",
            DANGLING_REFERENCE: "W_DANGLING_REFERENCE",
            DUPLICATE_ATTRIBUTE: "W_DUPLICATE_ATTRIBUTE",
            PARENT_CYCLE: "E_PARENT_CYCLE",
            EQUATION_AS_TEXT: "W_EQUATION_AS_TEXT",
            STYLES_NOT_IMPORTED: "W_STYLES_NOT_IMPORTED",
            BAD_ASPECT_BLOCK: "E_BAD_ASPECT_BLOCK",
            ASPECT_ORDER: "W_ASPECT_ORDER",
            COUNT_MISMATCH: "W_COUNT_MISMATCH",
            STATUS_FAILED: "E_STATUS_FAILED",
            STATUS_WARNING: "W_STATUS_WARNING",
            TOO_LARGE: "E_TOO_LARGE",
            GRAPH_NOT_FOUND: "E_GRAPH_NOT_FOUND",
            AMBIGUOUS_GRAPH_NAME: "E_AMBIGUOUS_GRAPH_NAME",
        });
    });

    it("defines every shared code once, with an E_ or W_ prefix", () => {
        const values = Object.values(codes);
        expect(new Set(values).size).toBe(values.length);
        for (const value of values) {
            expect(value).toMatch(/^[EW]_[A-Z0-9_]+$/);
        }
    });

    it("is aliased by the format tables that record the same condition", () => {
        expect(JSON_ISSUE.BAD_VALUE).toBe(codes.BAD_VALUE_CODE);
    });
});
