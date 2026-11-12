import { CHANNEL_DESCRIPTORS, type ChannelDescriptor } from "@graphty/graphty-element/catalog";
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { CHANNEL_HOMES } from "../coverage";
import { addLabelLine, EVERYTHING_LAYER, labelRow, propose, startingValue, textBinding, writeLine } from "../row";

/**
 * Every channel a "+" can add: drawn, offered somewhere on the Style tab, and not a whole label
 * style or a channel that takes nothing.
 * @returns the descriptors.
 */
function addable(): ChannelDescriptor[] {
    return Object.values(CHANNEL_DESCRIPTORS).filter(
        (descriptor) =>
            descriptor.renderable &&
            "place" in CHANNEL_HOMES[descriptor.channel] &&
            descriptor.accepts !== "labelStyle" &&
            descriptor.accepts !== "nothing" &&
            // A shader is added from the gallery, never as a line at a starting value.
            descriptor.shaderTarget === undefined,
    );
}

describe("the value a line starts with", () => {
    let session: GraphSession | null = null;
    afterEach(() => {
        session?.dispose();
        session = null;
    });

    it("is the element's own value for every channel a line can add, but a pattern count", () => {
        for (const descriptor of addable()) {
            const value = startingValue(descriptor);
            // Unset, a pattern count follows the element's spacing rule edge by edge; its floor (2)
            // draws a mark at each end only, so the app starts it at 10 marks.
            const own =
                descriptor.channel === "edge.patternCount"
                    ? 10
                    : (descriptor.default ?? descriptor.off ?? descriptor.min ?? descriptor.values?.[0] ?? "");
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

    it('Add label line writes the line Text "+" writes on Everything, undone in one step', async () => {
        const column = { kind: "node", name: "name" } as const;
        const row = (on: GraphSession): unknown =>
            on.styles
                .list()
                .filter((l) => l.source.by === "user")
                .map(({ name, target, selector, set, encode }) => ({ name, target, selector, set, encode }));
        // Text "+" on Everything, the column picked from its source list.
        const plus = await twoNodes();
        const proposal = propose(plus, { kind: "column", column }, "node.label");
        if (!proposal.ok) {
            throw new Error("the element refused to label by name");
        }
        await writeLine(
            plus,
            [],
            "node",
            "node.label",
            { binding: textBinding(plus, proposal.binding) },
            EVERYTHING_LAYER,
        );
        const byPlus = row(plus);
        plus.dispose();
        // Add label line, nothing inspected.
        const quick = await twoNodes();
        const before = quick.history.steps.length;
        await addLabelLine(quick, labelRow(quick, null), column);
        assert.deepEqual(row(quick), byPlus);
        assert.notInclude(
            quick.styles.list().map((l) => l.name),
            "name",
            "no layer is named after the attribute",
        );
        assert.equal(quick.history.steps.length, before + 1);
    });

    it("Add label line writes on the inspected layer row, not a new one", async () => {
        const on = await twoNodes();
        const mine = await on.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        const count = on.styles.list().length;
        const row = labelRow(on, { kind: "layer-row", id: mine.id });
        assert.deepEqual(row.inspected, { kind: "layer-row", id: mine.id });
        await addLabelLine(on, row, { kind: "node", name: "name" });
        assert.lengthOf(on.styles.list(), count);
        const written = on.styles.get(mine.id);
        assert.isDefined(written?.encode?.["node.label"]);
        assert.isUndefined(written?.set?.["node.labelStyle"]);
        assert.isUndefined(written?.set?.["node.labelSize"]);
    });
});
