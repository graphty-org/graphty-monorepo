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
