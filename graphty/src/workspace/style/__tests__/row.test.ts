import { CHANNEL_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { addLabelRow, EVERYTHING_LAYER, LABEL_SIZE_PX, propose, startingValue, writeLine } from "../row";

describe("the value a line starts with", () => {
    it("is the element's own value for every channel a line can add, never an invented one", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            if (!descriptor.renderable || descriptor.accepts === "labelStyle" || descriptor.accepts === "nothing") {
                continue;
            }
            const value = startingValue(descriptor);
            const own = descriptor.default ?? descriptor.min ?? descriptor.values?.[0] ?? "";
            assert.deepEqual(value, own, descriptor.channel);
        }
    });

    it("starts a glow and an outline in the color the element draws them", () => {
        assert.equal(startingValue(CHANNEL_DESCRIPTORS["node.glow"]), CHANNEL_DESCRIPTORS["node.glow"].default);
        assert.notEqual(startingValue(CHANNEL_DESCRIPTORS["node.outline"]), "#000000");
    });
});

describe("a label line the app adds", () => {
    let session: GraphSession | null = null;
    afterEach(() => {
        session?.dispose();
        session = null;
    });

    /**
     * A session with two named nodes.
     * @returns the session.
     */
    async function twoNodes(): Promise<GraphSession> {
        session = createGraphSession();
        await session.data.addNodes([
            { id: "a", name: "Ada" },
            { id: "b", name: "Bo" },
        ]);
        return session;
    }

    it("is drawn in the app's own font at a legible size, on top on a white chip, in the same step as the binding", async () => {
        const on = await twoNodes();
        const proposal = propose(on, { kind: "column", column: { kind: "node", name: "name" } }, "node.label");
        if (!proposal.ok) {
            throw new Error("the element refused to label by name");
        }
        const before = on.history.steps.length;
        const id = await writeLine(on, [], "node", "node.label", { binding: proposal.binding }, EVERYTHING_LAYER);
        const layer = on.styles.list().find((l) => l.id === id);
        assert.deepEqual(layer?.set?.["node.labelStyle"], {
            font: getComputedStyle(document.body).fontFamily,
            sizePx: LABEL_SIZE_PX,
            onTop: true,
            background: "#FFFFFF",
            cornerRadius: 4,
            pickable: true,
        });
        assert.equal(on.history.steps.length, before + 1);
    });

    it("from an attribute's Add label line, in the app's look, undone in one step", async () => {
        const on = await twoNodes();
        const before = on.styles.list().length;
        const layer = await addLabelRow(on, { kind: "node", name: "name" });
        const written = on.styles.list().find((l) => l.id === layer.id);
        assert.equal((written?.set?.["node.labelStyle"] as { sizePx?: number } | undefined)?.sizePx, LABEL_SIZE_PX);
        await on.undo();
        assert.lengthOf(on.styles.list(), before);
    });
});
