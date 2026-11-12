/**
 * @file `selection.previewHover`: while on, a layer that paints hovered nodes matches every
 * selected node, so a reader sees the hover look without pointing; it is view state, never a step.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

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

    it("is painted once styles.settled() resolves, even when the pass yields", async () => {
        // A clock that runs out every slice, so the repaint yields to the event loop at each
        // chunk, as a slow machine's does (#3640).
        let clock = 0;
        const harness = makeSession({ internals: { now: () => (clock += 100) } });
        harness.add(Array.from({ length: 300 }, (_, at) => ({ id: `n${String(at)}` })));
        const { session } = harness;
        await session.config.set({ startingRows: true });
        await session.selection.apply({ nodes: ["n0", "n1"] });
        await session.styles.settled();

        session.selection.previewHover(true);
        assert.isTrue((session as ElementSession).paint.painting(), "the preview asked for a pass");
        await session.styles.settled();
        assert.isFalse((session as ElementSession).paint.painting(), "and it had finished when settled() resolved");
        session.dispose();
    });
});
