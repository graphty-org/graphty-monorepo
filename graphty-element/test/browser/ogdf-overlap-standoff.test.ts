/**
 * The force layout with `nodeGap` set stops once the springs and the overlap sweep reach a standoff, rather than at
 * its 1000-step cap. The graphty app's OGDF sample (43 boxes, no positions in its file, laid out by the force layout
 * as the app opens it) had stopped drawing in by step 450, while a pair of boxes was pulled back into overlap as fast
 * as each sweep pushed it out, so it ran all 1000 steps in 3D and 1000 more after the switch to 2D: 17 s each at 60
 * steps a second (issue #10538). Counted in layout steps, never in time.
 */
import "../../src/graphty-element";

import { afterEach, assert, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../index.js";
import type { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";

/** Half the 1000-step cap: the sample rests after 431 steps in 3D and 51 in 2D. */
const MOST_STEPS = 500;

let element: Graphty | undefined;
let url: string | undefined;

afterEach(() => {
    element?.remove();
    element = undefined;
    if (url !== undefined) {
        URL.revokeObjectURL(url);
        url = undefined;
    }
});

/**
 * The steps the force layout took to come to rest, once the picture is final.
 * @param shown - the element
 * @returns the step count
 */
async function stepsToRest(shown: Graphty): Promise<number> {
    await shown.waitForSettled();
    await shown.session.styles.settled();
    await shown.waitForStableFrame();
    return (shown.graph.getLayoutManager().layoutEngine as NGraphEngine)._stepCount;
}

it("lays out the OGDF sample's overlapping boxes in far fewer steps than the cap, in 3D and then in 2D", async () => {
    const base64 = await commands.readFile("../graph-io/test/corpus/programs/ogdf__ERDiagram.gml", {
        encoding: "base64",
    });
    url = URL.createObjectURL(new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))]));
    // as the graphty app opens a sample from its start page: the force layout, seeded, in 3D, every label shown
    const shown = document.createElement("graphty-element");
    element = shown;
    shown.style.cssText = "display:block;width:800px;height:600px";
    shown.features = ["file-styles"];
    shown.viewMode = "3d";
    shown.layout = "force";
    shown.layoutConfig = { seed: 1 };
    shown.layoutBehavior = { labels: { declutter: false, avoidNodesAndEdges: true }, rendering: { onDemand: true } };
    document.body.appendChild(shown);
    await shown.updateComplete;
    await shown.session.data.import(
        { type: "gml", config: { url } },
        {
            styles: "file",
            layout: "placed",
            styleOptions: { lengths: "spacing", framing: "file", valueColumns: "hidden" },
        },
    );

    const steps3d = await stepsToRest(shown);
    // the file's box sizes keep the boxes apart: the layout runs with a gap between drawn nodes
    assert.isNumber((shown.layoutConfig as { nodeGap?: unknown }).nodeGap, "the layout keeps nodes apart");
    assert.isAtMost(steps3d, MOST_STEPS, "steps to rest in 3D");
    shown.viewMode = "2d";
    const steps2d = await stepsToRest(shown);
    assert.isAtMost(steps2d, MOST_STEPS, "steps to rest after the switch to 2D");
});
