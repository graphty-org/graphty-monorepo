/**
 * @file A binding's value table on every kind of channel, and its `otherwise`: a group with an
 * entry paints the entry, and every other group paints the one `otherwise` value instead of the
 * scale, on a shape, a line pattern, an arrow, a label and a color alike.
 */

import { assert, describe, it } from "vitest";

import type { Channel } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";

/**
 * Four nodes in groups 0 to 3, chained by three edges each carrying its source's group.
 * @returns The session.
 */
async function grouped(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([0, 1, 2, 3].map((group) => ({ id: `n${String(group)}`, group })));
    await session.data.addEdges(
        [0, 1, 2].map((group) => ({ source: `n${String(group)}`, target: `n${String(group + 1)}`, group })),
    );

    return session;
}

/**
 * What the last pass painted on one channel for every element of its kind.
 * @param session - The session.
 * @param channel - The channel.
 * @returns One value per element, colors as hex.
 */
function painted(session: GraphSession, channel: Channel): unknown[] {
    const element = session as ElementSession;
    const kind = channel.startsWith("node.") ? "node" : "edge";
    const { nodeCount, edgeCount } = session.data.snapshot();
    return Array.from({ length: kind === "node" ? nodeCount : edgeCount }, (_, index) => {
        const value: unknown = element.paint.styleOf(kind, index)[channel];
        return typeof value === "object" && value !== null && "hex" in value ? value.hex : value;
    });
}

describe("a value table with an otherwise", () => {
    const cases: { channel: Channel; entry: string; otherwise: string }[] = [
        { channel: "node.shape", entry: "box", otherwise: "sphere" },
        { channel: "edge.style", entry: "dash", otherwise: "dot" },
        { channel: "edge.arrowHead", entry: "diamond", otherwise: "tee" },
        { channel: "node.label", entry: "Chosen", otherwise: "Rest" },
        { channel: "node.color", entry: "#ff0000", otherwise: "#0000ff" },
    ];

    for (const { channel, entry, otherwise } of cases) {
        it(`paints the entry for group 1 and the otherwise value for the rest on ${channel}`, async () => {
            const session = await grouped();
            const target = channel.startsWith("node.") ? "node" : "edge";
            await session.styles.add({
                name: "By group",
                target,
                selector: { match: "has", path: "data.group" },
                encode: {
                    [channel]: {
                        by: "data.group",
                        scale: channel === "node.label" ? "passthrough" : "ordinal",
                        map: { "1": entry },
                        otherwise,
                    },
                },
            });
            await session.styles.settled();

            const drawn = painted(session, channel);
            assert.strictEqual(drawn[1], entry, "the group with an entry");
            assert.deepStrictEqual(
                drawn.filter((_, index) => index !== 1),
                drawn.filter((_, index) => index !== 1).map(() => otherwise),
                "every group without an entry paints the otherwise value",
            );
            session.dispose();
        });
    }

    it("leaves the scale painting the rest when no otherwise is given", async () => {
        const session = await grouped();
        await session.styles.add({
            name: "By group",
            target: "node",
            selector: { match: "has", path: "data.group" },
            encode: { "node.shape": { by: "data.group", scale: "ordinal", map: { "1": "box" } } },
        });
        await session.styles.settled();

        const drawn = painted(session, "node.shape");
        assert.strictEqual(drawn[1], "box");
        assert.isAbove(new Set(drawn).size, 2, "the scale gives the other groups shapes of their own");
        session.dispose();
    });
});
