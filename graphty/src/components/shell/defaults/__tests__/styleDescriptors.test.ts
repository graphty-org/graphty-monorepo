import { resultPath } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { METRIC_VALUE_FIELD, SHELL_DEFAULTS_TEMPLATE_ID, topDegreeLabelLayer } from "../styleDescriptors";

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

    /* The element draws each node's own id when a layer switches labels on without naming the
       words, so the shell names no attribute and the element's own label style is what draws. */
    it("switches labels on and leaves the words and their look to the element", () => {
        const layer = topDegreeLabelLayer({ degreeRunId: RUN, labelCount: 5 });

        expect(layer.set).toEqual({ "node.labelStyle": { enabled: true } });
        expect(layer.encode).toBeUndefined();
    });
});
