/**
 * @file `styles.counts(id).covers`: per channel a layer writes, which layers the picture shows
 * instead and on how many elements, the three that cover most listed and the rest counted. What
 * answers "why don't I see my look?" when a run's layer covers the base color.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

describe("which layers cover a layer's channels", () => {
    it("lists the covering layers per channel, most first, capped at three with the rest counted", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 10 }, (_, at) => ({ id: `n${String(at)}`, rank: at })));
        const base = await session.styles.add({
            name: "Base",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#888888", "node.size": 2 },
        });
        // Four layers above it cover the color on 1, 2, 3 and 4 nodes of their own; none touches the size.
        const above = [];
        for (const [min, max] of [
            [9, 9],
            [7, 8],
            [4, 6],
            [0, 3],
        ]) {
            above.push(
                await session.styles.add({
                    name: `Ranks ${String(min)} to ${String(max)}`,
                    target: "node",
                    selector: { match: "rule", where: { kind: "range", attribute: "data.rank", min, max } },
                    set: { "node.color": "#ff0000" },
                }),
            );
        }

        const { covers } = session.styles.counts(base.id);
        assert.deepStrictEqual(covers["node.color"], {
            layers: [
                { layerId: above[3].id, count: 4 },
                { layerId: above[2].id, count: 3 },
                { layerId: above[1].id, count: 2 },
            ],
            more: 1,
        });
        assert.isUndefined(covers["node.size"], "the size is the base's everywhere");
        session.dispose();
    });
});
