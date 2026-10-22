/**
 * @file `selection.previewHover`: while on, a layer that paints hovered nodes matches every
 * selected node, so a reader sees the hover look without pointing; it is view state, never a step.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

describe("previewing the hover look on the selection", () => {
    it("matches the selected nodes as hovered until it is turned off, and records no step", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const hovered = await session.styles.add({
            name: "Hovered",
            target: "node",
            selector: { match: "state", state: "hovered" },
            set: { "node.color": "#ff00ff" },
        });
        await session.selection.apply({ nodes: ["a", "c"] });
        session.selection.hover("b");
        assert.strictEqual(session.styles.counts(hovered.id).matched, 1, "the pointer's node");
        const steps = session.history.steps.length;

        session.selection.previewHover(true);
        assert.isTrue(session.selection.hoverPreview);
        assert.strictEqual(session.styles.counts(hovered.id).matched, 3, "the pointer's node and the selection");
        assert.strictEqual(session.history.steps.length, steps, "a preview is not a step");

        session.selection.previewHover(false);
        assert.strictEqual(session.styles.counts(hovered.id).matched, 1);
        session.dispose();
    });
});
