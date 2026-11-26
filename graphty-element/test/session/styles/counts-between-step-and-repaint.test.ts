/**
 * @file A layer's counts read between a style edit that records a new undo step and the repaint
 * that follows it (issue #9981). `history:changed` is told when the step is recorded, before the
 * pass that prepares the edited layer has run: a read there must answer what the layer last
 * painted, never "painted on 0" for a layer that still paints its elements.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

describe("styles.counts read on history:changed after a style edit", () => {
    it("answers the layer's last painted count, not 0", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 5 }, (_, at) => ({ id: `n${String(at)}` })));
        const layer = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).painted["node.color"], 5);

        const seen: (number | undefined)[] = [];
        const stop = session.on("history:changed", () => {
            seen.push(session.styles.counts(layer.id).painted["node.color"]);
        });
        await session.styles.update(layer.id, { set: { "node.color": "#00ff00" } });
        await session.styles.settled();
        stop();

        assert.isAbove(seen.length, 0, "the edit recorded a step");
        assert.isTrue(
            seen.every((count) => count === 5),
            `every read on history:changed saw the layer paint: ${seen.join(",")}`,
        );
        assert.strictEqual(session.styles.counts(layer.id).painted["node.color"], 5);
        session.dispose();
    });

    it("answers 0 once the repaint lands for a layer that no longer paints anything", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 3 }, (_, at) => ({ id: `n${String(at)}` })));
        const layer = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.settled();
        await session.styles.update(layer.id, { set: {} });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).painted["node.color"] ?? 0, 0);
        session.dispose();
    });
});
