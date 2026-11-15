/**
 * @file A fit is owed again when an input it read changes before the picture is final (issue #4218).
 *
 * A fit reads the view insets, the fit insets and the canvas size when it lands. An application
 * that writes the insets near a load (a key card mounting on React's schedule) wrote them either
 * before the fit landed -- framed beside the key -- or just after, while the picture was still
 * settling -- framed under it, and `waitForStableFrame()` called that final (issue #3372). Which
 * one depended on the machine's speed. The fit now records what it read and is owed again when
 * one of those changes before the picture is final, so both orders end on the same framing. Once
 * the picture was final, an inset change moves nothing (test/browser/camera/view-insets.test.ts).
 *
 * A style that changes how big the nodes are drawn, landing after the fit, is owed the same way
 * (issue #7970): a layer naming a shader whose body was still loading landed after the fit on a
 * cold load and before it on a warm one, so one story framed at two zooms.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

const WIDTH = 640;
const HEIGHT = 480;
/** The key's width, reserved at the left. */
const LEFT = 200;

const NODES = Array.from({ length: 16 }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: 30 * Math.cos((i / 16) * Math.PI * 2), y: 20 * Math.sin((i / 16) * Math.PI * 2), z: 0 },
}));

/**
 * Assert every node is drawn in the part of the canvas the left inset leaves free.
 * @param element - The element.
 */
function assertRightOfInset(element: Graphty): void {
    for (const { id } of NODES) {
        const at = element.nodeScreenPosition(id);
        assert.isDefined(at, id);
        assert.isAbove(at.x, LEFT, `${id} is right of the inset`);
        assert.isAtMost(at.x, WIDTH, `${id} is inside the canvas`);
    }
}

describe("an owed fit reads the inputs in force when the picture is final", () => {
    let container: HTMLDivElement;
    let element: Graphty;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        container.appendChild(element);
        await element.waitForStableFrame();
        await element.graph.addNodes(NODES);
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.setViewMode("2d");
        await element.waitForStableFrame();
    });

    afterEach(() => {
        container.remove();
    });

    it("insets written as the fit lands are framed before the picture is final", async () => {
        let writes = 0;
        const off = element.graph.on("zoom-to-fit-complete", () => {
            // The key card mounts right after the fit landed, before the frame that shows it.
            if (writes++ === 0) {
                element.viewInsets = { left: LEFT };
            }
        });

        try {
            element.zoomToFit();
            await element.waitForStableFrame();
        } finally {
            off();
        }

        assert.isAtLeast(writes, 2, "the fit was owed again");
        assertRightOfInset(element);
    });

    it("nodes a style grows as the fit lands are framed at their new size", async () => {
        let fits = 0;
        const off = element.graph.on("zoom-to-fit-complete", () => {
            // The layer lands right after the fit, before the frame that shows it.
            if (fits++ === 0) {
                void element.session.styles.add({
                    name: "Big",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.size": 12 },
                });
            }
        });

        try {
            element.zoomToFit();
            await element.waitForStableFrame();
        } finally {
            off();
        }

        assert.isAtLeast(fits, 2, "the fit was owed again");
        const settled = element.graph.getCameraState();
        element.zoomToFit();
        await element.waitForStableFrame();
        assert.deepEqual(element.graph.getCameraState(), settled, "a fresh fit frames where the owed one did");
    });

    it("a canvas made shorter as the fit lands is framed at its new size", async () => {
        const SHORT = HEIGHT / 3;
        let resized = false;
        const off = element.graph.on("zoom-to-fit-complete", () => {
            if (!resized) {
                resized = true;
                container.style.height = `${String(SHORT)}px`;
                element.graph.resize();
            }
        });

        try {
            element.zoomToFit();
            await element.waitForStableFrame();
        } finally {
            off();
        }

        assert.isTrue(resized);
        for (const { id } of NODES) {
            const at = element.nodeScreenPosition(id);
            assert.isDefined(at, id);
            assert.isTrue(at.visible, `${id} is visible`);
            assert.isAtLeast(at.y, 0, `${id} is inside the shortened canvas`);
            assert.isAtMost(at.y, SHORT, `${id} is inside the shortened canvas`);
        }
    });
});

describe("a fit is owed again when the label pass moves the labels it measured", () => {
    let container: HTMLDivElement;

    afterEach(() => {
        container.remove();
    });

    it("labels moved off their nodes after the fit lands are framed where they were moved", async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const element = document.createElement("graphty-element");
        container.appendChild(element);
        await element.waitForStableFrame();
        // Four nodes on a square joined by edges, each labelled over its node: `avoidNodesAndEdges`
        // moves every label off its node and edges -- the top row's above the square -- on the pass
        // before a frame, after the fit below measured them over their nodes.
        await element.graph.addNodes(
            [0, 1, 2, 3].map((i) => ({
                id: `s${String(i)}`,
                position: { x: (i % 2) * 160, y: -Math.floor(i / 2) * 160, z: 0 },
            })),
        );
        await element.graph.addEdges(
            [0, 1, 2, 3].map((i) => ({ src: `s${String(i)}`, dst: `s${String((i + 1) % 4)}` })),
        );
        await element.graph.setLayout("fixed", { dim: 2 });
        await element.setViewMode("2d");
        await element.session.styles.add({
            name: "Labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "a label", "node.labelLocation": "center" },
        });
        await element.waitForStableFrame();
        element.graph.setLayoutBehavior({ labels: { avoidNodesAndEdges: true } });
        element.zoomToFit();
        await element.waitForStableFrame();

        const settled = element.graph.getCameraState();
        element.zoomToFit();
        await element.waitForStableFrame();
        assert.deepEqual(element.graph.getCameraState(), settled, "a fresh fit frames where the owed one did");
    });
});
