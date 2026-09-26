import { resultPath } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import {
    DEFAULT_LABEL_ATTRIBUTE_PATH,
    METRIC_VALUE_FIELD,
    SHELL_DEFAULTS_TEMPLATE_ID,
    topDegreeLabelLayer,
} from "../styleDescriptors";

/** A run id shaped as the session mints one, hyphen and all, so the paths below read as the real thing. */
const RUN = "degree-1";

describe("topDegreeLabelLayer", () => {
    it("names the shell's template as its source, so one sweep can retire it", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 5 });

        expect(layer.source).toEqual({ by: "template", templateId: SHELL_DEFAULTS_TEMPLATE_ID });
    });

    it("paints nodes and nothing else", () => {
        expect(topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 5 }).target).toBe("node");
    });

    /* The element decides which nodes are the top N, and how a tie across the budget is cut.
       The shell used to walk the degrees itself and hand over a `value >= cut` expression. */
    it("asks the element for the top N of the run's own measurement", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 7 });

        expect(layer.selector).toEqual({ match: "top", path: resultPath(RUN, METRIC_VALUE_FIELD), n: 7 });
    });

    it("draws the node's own id when the caller names no attribute", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 5 });

        expect(layer.encode?.["node.label"]).toEqual({ by: DEFAULT_LABEL_ATTRIBUTE_PATH, scale: "passthrough" });
    });

    it("draws the attribute the caller names", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 5, labelAttribute: "data.name" });

        expect(layer.encode?.["node.label"]).toEqual({ by: "data.name", scale: "passthrough" });
    });

    it("sets no literal value at all, so the element's own label style is what draws", () => {
        expect(topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 5 }).set).toBeUndefined();
    });
});
