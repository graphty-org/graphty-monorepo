/**
 * @file Colors in use that fall on the same gray (`styles.grayCollisions`, issue #813): two
 * colors collide when their CIE L* lightness differs by less than the threshold, 10 by default.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import { toColorValue } from "../../src/session/styles/channels";
import { grayCollisionsOf, lightnessOf } from "../../src/session/styles/colors";

/**
 * The L* of a hex color.
 * @param hex - The color.
 * @returns Its lightness.
 */
function lightness(hex: string): number {
    const value = toColorValue(hex);
    if (value === null) {
        assert.fail(`${hex} is not a color`);
    }

    return lightnessOf(value);
}

describe("CIE L* lightness", () => {
    it("is 0 for black, 100 for white and about 53.2 for pure red", () => {
        assert.closeTo(lightness("#000000"), 0, 1e-9);
        assert.closeTo(lightness("#ffffff"), 100, 1e-9);
        assert.closeTo(lightness("#ff0000"), 53.24, 0.01);
        assert.closeTo(lightness("#008000"), 46.23, 0.01);
        assert.closeTo(lightness("#0000ff"), 32.3, 0.01);
    });
});

describe("which pairs collide", () => {
    const use = { layer: "l", channel: "node.color" } as const;
    const of = (colors: string[], threshold: number): string[][] =>
        grayCollisionsOf(
            colors.map((color) => ({ color, use })),
            threshold,
        ).map((pair) => pair.colors.map((each) => each.color));

    it("lists red and green (7.0 apart) under the default 10, darker first, and not red and blue (20.9 apart)", () => {
        assert.deepEqual(of(["#ff0000", "#008000", "#0000ff"], 10), [["#008000", "#ff0000"]]);
    });

    it("collides only below the threshold: red and green are apart at 7.0 and together at 7.1", () => {
        const gap = lightness("#ff0000") - lightness("#008000");
        assert.closeTo(gap, 7.01, 0.01);
        assert.deepEqual(of(["#ff0000", "#008000"], 7), []);
        assert.deepEqual(of(["#ff0000", "#008000"], 7.1), [["#008000", "#ff0000"]]);
    });

    it("counts two spellings of one color as one color, never a pair", () => {
        assert.deepEqual(of(["#D55E00", "#d55e00", "rgb(213, 94, 0)"], 10), []);
    });
});

describe("styles.grayCollisions over the shown layers", () => {
    it("names the layers, channels and values of a category palette's colliding colors, and leaves a hidden layer out", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", group: "x" },
            { id: "b", group: "y" },
            { id: "c", group: "z" },
        ]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        const groups = await session.styles.add({
            name: "Groups",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": { by: "data.group", scale: "ordinal", map: { x: "#ff0000", y: "#008000", z: "#0000ff" } },
            },
        });
        const edges = await session.styles.add({
            name: "Edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#0000ff" },
        });
        await session.styles.settled();

        const found = session.styles.grayCollisions({ threshold: 10 });
        const pair = found.find(({ colors: [dark, light] }) => dark.color === "#008000" && light.color === "#ff0000");
        if (pair === undefined) {
            assert.fail(`red and green should collide: ${JSON.stringify(found)}`);
        }

        assert.closeTo(pair.difference, 7.01, 0.01);
        assert.deepEqual(pair.colors[0].uses, [{ layer: groups.id, channel: "node.color", value: "y" }]);
        assert.deepEqual(pair.colors[1].uses, [{ layer: groups.id, channel: "node.color", value: "x" }]);
        // Blue is drawn twice, by a palette row and by the edges, and collides with nothing.
        assert.isFalse(found.some(({ colors }) => colors.some((each) => each.color === "#0000ff")));

        // An edge color that does collide, once its layer is turned off, is no longer in use.
        await session.styles.update(edges.id, { set: { "edge.color": "#7a7a7a" } });
        await session.styles.settled();
        assert.isTrue(
            session.styles.grayCollisions().some(({ colors }) => colors.some((each) => each.color === "#7a7a7a")),
            "a gray of L* about 51 collides with red and green",
        );
        await session.styles.update(edges.id, { enabled: false });
        await session.styles.settled();
        assert.isFalse(
            session.styles.grayCollisions().some(({ colors }) => colors.some((each) => each.color === "#7a7a7a")),
        );
    });
});
