/**
 * The stand-in tools (drawio.mjs, graphviz.mjs, cytoscape-desktop.mjs) leave yEd's and yEd Live's own drawings alone: no
 * script can make those again. `gml-need4stacks261` was once graphviz.mjs's, and `graphml-galaxy-lcms-workflow` drawio.mjs's.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { isYedDrawing } from "./oracles/tools/own-drawing.mjs";

const oracles = join(dirname(fileURLToPath(import.meta.url)), "oracles");

describe("isYedDrawing", () => {
    it("says yes for yEd's and yEd Live's drawings and no for anything a stand-in tool may write", () => {
        assert.isTrue(isYedDrawing(oracles, "gml-need4stacks261"));
        assert.isTrue(isYedDrawing(oracles, "graphml-galaxy-lcms-workflow"));
        assert.isTrue(isYedDrawing(oracles, "yed-live-graphml-specimen-labels-p3"));
        assert.isTrue(isYedDrawing(oracles, "yed-graphml-specimen-images-charts"));
        // a stand-in's drawing, another program's drawing, and a sample with no oracle yet
        assert.isFalse(isYedDrawing(oracles, "gml-specimen-arrows-p4"));
        assert.isFalse(isYedDrawing(oracles, "dot-profile"));
        assert.isFalse(isYedDrawing(oracles, "no-such-sample"));
    });
});
