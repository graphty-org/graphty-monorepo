import { quotePath, resultPath } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import {
    DEFAULT_LABEL_ATTRIBUTE_PATH,
    METRIC_VALUE_FIELD,
    SHELL_DEFAULTS_TEMPLATE_ID,
    topDegreeLabelLayer,
} from "../styleDescriptors";

/** A run id shaped as the session mints one, so the paths below read as the real thing. */
const RUN = "degree-1";

/**
 * The run's per-node column, written the way an expression can actually read it.
 *
 * NOT `results.degree-1.value`, which is what this file used to assert. A run id may carry a
 * hyphen -- every id the session mints from a hyphenated algorithm name does, and the one above
 * does -- and the expression lexer reads a bare hyphen as subtraction, so that spelling is not a
 * path comparison at all: it is `results.degree` minus `1.value`, and the selector is refused.
 * The element publishes `quotePath` exactly so that no consumer has to know that, and the layer
 * builds its path through it.
 */
const VALUE = quotePath(resultPath(RUN, METRIC_VALUE_FIELD));

describe("topDegreeLabelLayer", () => {
    it("names the shell's template as its source, so one sweep can retire it", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 3 });

        expect(layer.source).toEqual({ by: "template", templateId: SHELL_DEFAULTS_TEMPLATE_ID });
    });

    it("paints nodes and nothing else", () => {
        expect(topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 3 }).target).toBe("node");
    });

    it("scopes itself to the run's own measurement, at or above the cut", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 7 });

        expect(layer.selector).toEqual({
            match: "expression",
            where: `${VALUE} >= \`7\``,
        });
    });

    it("draws the node's own id when the caller names no attribute", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 1 });

        expect(layer.encode?.["node.label"]).toEqual({ by: DEFAULT_LABEL_ATTRIBUTE_PATH, scale: "passthrough" });
    });

    it("draws the attribute the caller names", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 1, labelAttribute: "data.name" });

        expect(layer.encode?.["node.label"]).toEqual({ by: "data.name", scale: "passthrough" });
    });

    it("quotes a hyphenated run id, so the selector is a comparison rather than arithmetic", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 3 });
        const { where } = layer.selector as { where: string };

        expect(where).toContain('"degree-1"');
        expect(where).not.toContain("results.degree-1");
    });

    it("sets no literal value at all, so the element's own label style is what draws", () => {
        expect(topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 1 }).set).toBeUndefined();
    });

    it("writes a cut of zero as a literal rather than dropping the comparison", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 0 });

        expect(layer.selector).toEqual({
            match: "expression",
            where: `${VALUE} >= \`0\``,
        });
    });
});
