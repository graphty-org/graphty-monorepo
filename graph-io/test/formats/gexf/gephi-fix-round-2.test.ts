/**
 * GEXF labels and settings drawn as Gephi Toolkit 0.11.3 draws them (specimen sheet fix round 2).
 */

import { describe, expect, it } from "vitest";

import { drawnLabels, GephiPreview } from "../../../src/formats/gexf/preview.js";

describe("Gephi's label drawing", () => {
    it("draws a label's line break as nothing, as Java's drawString does (gexf-specimen-labels, label-newline)", () => {
        const labels = drawnLabels(["line one\nline two", "a & b <c>", null], new GephiPreview(), "node");
        expect(labels).toEqual(["line oneline two", "a & b <c>", null]);
    });

    it("cuts a label before taking its line breaks out", () => {
        const preview = new GephiPreview({
            "edge.label.show": "true",
            "edge.label.shorten": "true",
            "edge.label.max-char": "4",
        });
        expect(drawnLabels(["ab\ncdefgh"], preview, "edge")).toEqual(["abc..."]);
    });
});
