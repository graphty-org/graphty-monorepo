import { CHANNEL_DESCRIPTORS, type ChannelDescriptor } from "@graphty/graphty-element/catalog";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { addLabelRow, EVERYTHING_LAYER, LABEL_SIZE_PX, propose, startingValue, writeLine } from "../row";

/**
 * Every channel a "+" can add: drawn, and not a whole label style or a channel that takes nothing.
 * @returns the descriptors.
 */
function addable(): ChannelDescriptor[] {
    return Object.values(CHANNEL_DESCRIPTORS).filter(
        (descriptor) =>
            descriptor.renderable && descriptor.accepts !== "labelStyle" && descriptor.accepts !== "nothing",
    );
}

describe("the value a line starts with", () => {
    let session: GraphSession | null = null;
    afterEach(() => {
        session?.dispose();
        session = null;
    });

    it("is the element's own value for every channel a line can add, never an invented one", () => {
        for (const descriptor of addable()) {
            const value = startingValue(descriptor);
            const own = descriptor.default ?? descriptor.off ?? descriptor.min ?? descriptor.values?.[0] ?? "";
            assert.deepEqual(value, own, descriptor.channel);
        }
    });

    it("starts an unset label background at what the element draws there: nothing", async () => {
        session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        for (const channel of ["node.labelBackground", "edge.labelBackground"] as const) {
            assert.equal(session.styles.defaultValue(channel), "none", channel);
            assert.equal(startingValue(CHANNEL_DESCRIPTORS[channel]), "none", channel);
            assert.equal(startingValue(CHANNEL_DESCRIPTORS[channel], session), "none", channel);
        }
    });

    it("adds every addable channel at its starting value, with and without a session", async () => {
        session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ src: "a", dst: "b" }]);
        for (const descriptor of addable()) {
            for (const value of [startingValue(descriptor), startingValue(descriptor, session)]) {
                const id = await writeLine(
                    session,
                    [],
                    descriptor.target,
                    descriptor.channel,
                    { value },
                    EVERYTHING_LAYER,
                );
                const layer = session.styles.list().find((each) => each.id === id);
                assert.deepEqual(layer?.set?.[descriptor.channel], value, descriptor.channel);
            }
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

    it("a label line bound from the Style tab writes only its words, in one step", async () => {
        const on = await twoNodes();
        const proposal = propose(on, { kind: "column", column: { kind: "node", name: "name" } }, "node.label");
        if (!proposal.ok) {
            throw new Error("the element refused to label by name");
        }
        const before = on.history.steps.length;
        const id = await writeLine(on, [], "node", "node.label", { binding: proposal.binding }, EVERYTHING_LAYER);
        const layer = on.styles.list().find((l) => l.id === id);
        assert.isDefined(layer?.encode?.["node.label"]);
        assert.isUndefined(layer?.set?.["node.labelStyle"]);
        assert.isUndefined(layer?.set?.["node.labelSize"]);
        assert.equal(on.history.steps.length, before + 1);
    });

    it("from an attribute's Add label line, in the app's look, undone in one step", async () => {
        const on = await twoNodes();
        const before = on.styles.list().length;
        const layer = await addLabelRow(on, { kind: "node", name: "name" });
        const written = on.styles.list().find((l) => l.id === layer.id);
        assert.equal(written?.set?.["node.labelSize"], LABEL_SIZE_PX);
        await on.undo();
        assert.lengthOf(on.styles.list(), before);
    });
});
