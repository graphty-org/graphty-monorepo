/**
 * @file The published default background is the colour the element clears an unset canvas to, so a
 * consumer showing "the default" reads it rather than writing its own.
 */

import "../../src/graphty-element";

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { DEFAULT_BACKGROUND_COLOR } from "../../schema";
import { operationQueueOf } from "../../src/Graph";

describe("the default background", () => {
    it("is what an element with no background clears to", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "200px";
        element.style.height = "150px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();

        assert.strictEqual(element.graph.scene.clearColor.toHexString(true), DEFAULT_BACKGROUND_COLOR);
        element.remove();
    });
});
