/**
 * @file The edge tooltip 2.0 took away, and the reason it is not coming back yet.
 *
 * WHAT THIS REPLACES. `test/browser/edge-tooltip-is-accepted-and-never-drawn.test.ts` pinned the
 * state this change ended: `edge.tooltip` was published in the channel table as something the
 * renderer draws, the painter resolved it onto the edge, and no version of this package has ever
 * drawn one. A consumer wrote the layer, was told nothing was wrong, and got no tooltip. That
 * file's own closing note said it should be deleted in the change that closes the gap, and this
 * is that change -- closed by withdrawal rather than by a renderer, because the thing an edge
 * tooltip waits on is not a tooltip.
 *
 * WHY IT WAS WITHDRAWN RATHER THAN FIXED. A tooltip appears when the pointer arrives over
 * something, and an edge cannot be pointed at: `src/Edge.ts` sets `isPickable = false` in three
 * places and `PatternedLineMesh` declares it false as a field, which is the same fact
 * `src/events.ts` gives as the reason there is no `edge-click` event. Building the tooltip means
 * building edge picking first, over instanced lines, patterned meshes and bezier curves -- a
 * different feature, of a different size. Withdrawing a published schema field can only happen in
 * a major release, so 2.0 was the one opportunity to stop publishing sixty-two settings that
 * reach no pixel.
 *
 * WHAT IS PINNED HERE, in the order a consumer meets it. A layer that still writes the channel is
 * REFUSED by name rather than accepted in silence, which is the whole difference the withdrawal
 * makes. The edge style no longer accepts a tooltip block. And no edge mesh is pickable, which is
 * the fact the withdrawal rests on -- so the day edge picking lands, this file asks whether the
 * tooltip should come back with it.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { WITHDRAWN_CAPABILITIES } from "../../src/catalog/unreachable";
import { EdgeStyle } from "../../src/config/EdgeStyle";
import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { isChannel } from "../../src/session/styles/channels";

/** Two nodes, so there is one edge to ask about. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** How wide the canvas the graph is drawn on is. */
const WIDTH = 480;

/** How tall it is. */
const HEIGHT = 360;

describe("an edge tooltip, withdrawn in 2.0", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);

        // Circular rather than a physics layout, so the edge is where it was put and nothing is
        // racing a simulation that is still moving it.
        await graph.setLayout("circular", { scale: 0.2 });
        await graph.operationQueue.waitForCompletion();
    }, 60000);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("is refused by name when a layer still writes it, instead of being accepted in silence", () => {
        assert.isFalse(isChannel("edge.tooltip"), "edge.tooltip is published as a channel again");

        const checked = session.styles.validate({
            name: "a layer written against 1.x",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.tooltip": "the edge a consumer asked about" } as never,
        });

        assert.isFalse(checked.ok, "a layer writing a channel that does not exist was accepted");

        const codes = checked.errors.map((problem) => problem.code);

        assert.include(
            codes,
            "E_UNKNOWN_CHANNEL",
            `a layer writing edge.tooltip came back with [${codes.join(", ")}]. Silence is what ` +
                "the withdrawal exists to end: through 1.x this layer was accepted, resolved and " +
                "drawn by nothing, and the only way to find out was to look for a tooltip that " +
                "never arrived.",
        );

        const named = checked.errors.find((problem) => problem.code === "E_UNKNOWN_CHANNEL");

        assert.include(
            named?.message ?? "",
            "edge.tooltip",
            "the refusal does not name the channel that was refused",
        );
    });

    it("is gone from the edge style schema, block and all", () => {
        const parsed = EdgeStyle.safeParse({
            line: { color: "darkgrey" },
            tooltip: { enabled: true, text: "the edge a consumer asked about" },
        });

        assert.isFalse(
            parsed.success,
            "EdgeStyle accepts a tooltip block again. The whole block went with the channel -- " +
                "sixty-two declared settings that no renderer reads -- so if it is back, either " +
                "an edge tooltip is drawn now or the schema is publishing dead fields again.",
        );
    });

    it("still cannot be drawn, because no edge mesh can be hovered", () => {
        const edges = [...graph.getDataManager().edges.values()];

        assert.isNotEmpty(edges, "the graph holds no edge, so this file measured nothing");

        const pickable = edges.filter((edge) => edge.mesh.isPickable).map((edge) => edge.mesh.name);

        assert.deepStrictEqual(
            pickable,
            [],
            `these edge meshes are pickable now: [${pickable.join(", ")}]. That is the ` +
                "prerequisite an edge tooltip was withdrawn for want of, so if it has arrived, " +
                "the withdrawal is worth revisiting -- along with the edge-click event, which " +
                "src/events.ts leaves unemitted for the same reason.",
        );
    });

    it("is on the published record, so a consumer who had one can find out why", () => {
        const record = WITHDRAWN_CAPABILITIES.find((entry) => entry.subject === "edge.tooltip");

        assert.isDefined(
            record,
            "edge.tooltip is gone from WITHDRAWN_CAPABILITIES in src/catalog/unreachable.ts. The " +
                "schema is strict, so a saved 1.x style document carrying a tooltip block now " +
                "fails to parse -- and this list is the only place the reason is written down.",
        );
        assert.strictEqual(record.withdrawnIn, "2.0");
        assert.include(
            record.instead,
            "edge.label",
            "the record does not say what to reach for instead, which is the half of a " +
                "withdrawal a consumer actually needs",
        );
    });
});
