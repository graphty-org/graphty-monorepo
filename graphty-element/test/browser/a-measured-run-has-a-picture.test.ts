/**
 * @file An algorithm that measures elements suggests a picture from a REAL run, not from a table.
 *
 * WHAT THIS EXISTS TO CATCH. `test/algorithms/derived-styles.test.ts` feeds the derivation a run
 * made up out of the catalogue's own descriptor, so it proves the catalogue is self-consistent and
 * nothing more. It went on passing while the all-pairs sweep suggested nothing at all: the run
 * took its shape from the catalogue entry it was folded into, that entry said "path", the result
 * carried no `onPath` to highlight, and `applySuggestedStyles` answered false. The picture was the
 * element's defaults and no test anywhere was reading a real run's shape.
 *
 * So this starts each algorithm for real, on a real graph, and asks the element the question a
 * consumer asks: is there anything to draw from what this just measured. An algorithm that
 * publishes a per-element field and cannot be painted is the defect, whichever half is lying about
 * the result -- the algorithm, the catalogue, or the run that reconciles them.
 */

import "../../src/algorithms";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { Graph } from "../../src/Graph";
import { resultShapeContract } from "../../src/session/results/types";
import { paintOf } from "../helpers/paint-assertions";

/** Six nodes, connected, with a triangle at each end and a costly edge between them. */
const NODES = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }];

/** The edges between them, weighted so a route has something to prefer. */
const EDGES = [
    { src: "A", dst: "B", weight: 1 },
    { src: "B", dst: "C", weight: 1 },
    { src: "A", dst: "C", weight: 1 },
    { src: "C", dst: "D", weight: 5 },
    { src: "D", dst: "E", weight: 1 },
    { src: "E", dst: "F", weight: 1 },
    { src: "D", dst: "F", weight: 1 },
];

/**
 * The parameters an algorithm cannot run without.
 *
 * Only the ones that name an element: a source to walk from, a sink to push flow to. Everything
 * not listed runs on its own defaults, so a catalogue entry added tomorrow is asserted about
 * without anyone remembering to add it here.
 */
const PARAMS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
    "shortest-path": { source: "A", target: "F" },
    dijkstra: { source: "A", target: "F" },
    "bellman-ford": { source: "A", target: "F" },
    bfs: { source: "A" },
    dfs: { source: "A" },
    "max-flow": { source: "A", sink: "F" },
};

/** Every catalogue algorithm whose result shape has a picture in it. */
const PAINTABLE = BUILT_IN_ALGORITHMS.filter(
    (descriptor) => resultShapeContract(descriptor.shape).layer !== "none",
);

describe("an algorithm that measures elements has a picture to suggest", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    for (const descriptor of PAINTABLE) {
        it(`${descriptor.key} suggests a picture from a finished run`, async () => {
            const run = graph.run(descriptor.key, PARAMS[descriptor.key] ?? {}, { style: false });
            await run;

            assert.strictEqual(run.status, "succeeded", `${descriptor.key} finished`);

            // The run's OWN shape, not the catalogue's, is what the derivation reads. They are the
            // same entry today and this is what keeps them that way.
            assert.strictEqual(
                run.shape,
                descriptor.shape,
                `the run reports the shape its catalogue entry promised a consumer`,
            );

            assert.isAtLeast(
                run.suggestEncodings().length,
                1,
                `${descriptor.key} published per-element values with nothing to draw from them`,
            );

            assert.isTrue(
                graph.applySuggestedStyles(descriptor.key),
                `${descriptor.key} refused to paint what it had just measured`,
            );

            await graph.operationQueue.waitForCompletion();

            // THE LAYER THE ELEMENT WROTE ITSELF MUST SURVIVE THE PASS. `applySuggestedStyles`
            // answering true only says the layer was accepted; a binding that cannot be prepared
            // is refused during the repaint instead, and the repaint swallows that on purpose so
            // one bad layer does not take the frame down. The refusal then lives in
            // `paint.problems()`, which nothing else reads -- which is how two algorithm stories
            // drew a blank picture for a week while every other reading said they were fine.
            assert.deepStrictEqual(
                paintOf(graph)
                    .problems()
                    .map((problem) => `${problem.layerId}: ${problem.code} ${problem.message}`),
                [],
                `${descriptor.key} suggested a layer the element then could not paint`,
            );
        });
    }

    /**
     * THE 1.10 ADDRESS REACHES THE SAME PICTURE.
     *
     * This is the half that was broken and the half a walk of the catalogue cannot see. An old
     * address is not always a rename: `graphty:scc` is `components` at `{ strength: "strong" }`,
     * and `graphty:floyd-warshall` used to be `shortest-path` with an `allPairs` switch -- which
     * is how an all-pairs measurement came to be running under a key whose declared shape was a
     * route. A consumer addressing it the old way, which is what every story in this package does,
     * got a run with nothing to paint and no error to explain it.
     */
    describe("addressed the 1.10 way, as the stories and the deprecated entry points do", () => {
        for (const descriptor of PAINTABLE) {
            for (const legacy of descriptor.legacyKeys) {
                it(`graphty:${legacy.key} suggests a picture from a finished run`, async () => {
                    await graph.runAlgorithm("graphty", legacy.key, {
                        algorithmOptions: { ...PARAMS[legacy.key] },
                        applySuggestedStyles: false,
                    });
                    await graph.operationQueue.waitForCompletion();

                    assert.isTrue(
                        graph.applySuggestedStyles(`graphty:${legacy.key}`),
                        `graphty:${legacy.key} refused to paint what it had just measured`,
                    );
                });
            }
        }
    });

    it("covers every algorithm the catalogue says has a picture", () => {
        assert.isAtLeast(PAINTABLE.length, 20, "the catalogue lost algorithms rather than this test gaining them");
    });
});
