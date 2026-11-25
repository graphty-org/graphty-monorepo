/**
 * @file Stripes from data (`node.stripeData`): a list of words one band per word in the same color on every node, a
 * list of numbers one band per item, an empty node's band, a gauge's track, the refusal beside fixed lists, and the
 * facts and sample the panel reads.
 */

import { assert, describe, it } from "vitest";

import { DATA_FIXED_CHANNELS, type StripeData } from "../../../catalog";
import { createGraphSession } from "../../../src/session";

type Session = ReturnType<typeof createGraphSession>;

/**
 * A session holding these nodes, with one stripes layer over every node.
 * @param nodes - The nodes.
 * @param stripes - The spec.
 * @returns The session and the layer id.
 */
async function stripesOf(
    nodes: readonly Record<string, unknown>[],
    stripes: StripeData,
): Promise<{ session: Session; layerId: string }> {
    const session = createGraphSession();
    await session.data.addNodes(nodes);
    const layer = await session.styles.add({
        name: "Stripes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.stripeData": stripes },
    });
    await session.styles.settled();
    return { session, layerId: layer.id };
}

/**
 * The stripes one node draws.
 * @param session - The session.
 * @param node - The node.
 * @returns Its colors and sizes.
 */
function drawn(session: Session, node: string): { colors: string[]; sizes: number[] } {
    const merged = session.styles.explain({ node }).merged as Record<string, unknown>;
    const words = (key: string): string[] =>
        typeof merged[key] === "string" ? merged[key].split(" ").filter((w) => w !== "") : [];
    return { colors: words("node.stripeColors"), sizes: words("node.stripeSizes").map(Number) };
}

const SETS = [{ id: "a", sets: ["setA", "setC"] }, { id: "b", sets: ["setC"] }, { id: "c" }];

describe("stripes from data", () => {
    it("draws one band per word, each category the same color on every node", async () => {
        const { session } = await stripesOf(SETS, { entries: [{ field: "data.sets" }] });
        const a = drawn(session, "a");
        const b = drawn(session, "b");
        assert.deepStrictEqual(a.sizes, [0.5, 0.5]);
        assert.strictEqual(a.colors.length, 2);
        assert.deepStrictEqual(b.colors, [a.colors[1]], "setC is the same color on a and b");
        assert.deepStrictEqual(drawn(session, "c").colors, [], "no value, no bands");
    });

    it("draws one band per item of a number list", async () => {
        const { session } = await stripesOf([{ id: "a", mix: [0.5, 0.3, 0.2] }], { entries: [{ field: "data.mix" }] });
        assert.deepStrictEqual(drawn(session, "a").sizes, [0.5, 0.3, 0.2]);
    });

    it("draws a node with no value as one band in the No values color, and a gauge's rest in its track", async () => {
        const { session } = await stripesOf([{ id: "a", n: 25 }, { id: "c" }], {
            entries: [{ field: "data.n" }],
            empty: "band",
            emptyColor: "#123456",
            whole: { max: 100, track: "#eeeeee" },
        });
        assert.deepStrictEqual(drawn(session, "c"), { colors: ["#123456"], sizes: [1] });
        assert.deepStrictEqual(drawn(session, "a").sizes, [0.25, 0.75]);
        assert.strictEqual(drawn(session, "a").colors[1], "#eeeeee");
    });

    it("refuses a layer holding both the spec and the stripe lists it fills", () => {
        assert.deepStrictEqual(
            [...DATA_FIXED_CHANNELS["node.stripeData"]],
            ["node.stripeColors", "node.stripeSizes", "node.stripeOpacities"],
        );
        const session = createGraphSession();
        const result = session.styles.validate({
            name: "Both",
            selector: { match: "everything" },
            set: { "node.stripeData": { entries: [{ field: "data.sets" }] }, "node.stripeColors": "red" },
        });
        assert.isFalse(result.ok);
    });

    it("reports facts and a sample node, as for a pie", async () => {
        const { session, layerId } = await stripesOf(SETS, { entries: [{ field: "data.sets" }] });
        const sample = session.styles.dataSample(layerId, "node.stripeData", "first");
        assert.strictEqual(sample, "a");
        const facts = session.styles.dataFacts(layerId, "node.stripeData", "a");
        assert.deepStrictEqual(
            facts.categories.map((each) => each.key),
            ["setA", "setC"],
        );
    });
});
