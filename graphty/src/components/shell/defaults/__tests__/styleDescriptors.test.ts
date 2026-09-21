import { describe, expect, it } from "vitest";

import {
    DEFAULT_LABEL_ATTRIBUTE_PATH,
    METRIC_VALUE_FIELD,
    SHELL_DEFAULTS_TEMPLATE_ID,
    topDegreeLabelLayer,
} from "../styleDescriptors";

/** A run id shaped as the session mints one, so the paths below read as the real thing. */
const RUN = "degree-1";

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
            where: `results.${RUN}.${METRIC_VALUE_FIELD} >= \`7\``,
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

    it("sets no literal value at all, so the element's own label style is what draws", () => {
        expect(topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 1 }).set).toBeUndefined();
    });

    it("writes a cut of zero as a literal rather than dropping the comparison", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, degreeThreshold: 0 });

        expect(layer.selector).toEqual({
            match: "expression",
            where: `results.${RUN}.${METRIC_VALUE_FIELD} >= \`0\``,
        });
    });
});
