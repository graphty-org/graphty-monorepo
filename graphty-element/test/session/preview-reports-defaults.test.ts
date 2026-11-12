/**
 * @file What `styles.preview` reports beside its bins: the palette painting, the parts of the
 * binding the element filled in, the data's extent, and where the domain's ends sit in the data
 * (percentiles, and how many elements tie at each end).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/**
 * A session of ten nodes whose score runs 1 to 10, with three nodes tied at 10.
 * @returns The session.
 */
async function scored(): Promise<GraphSession> {
    const session = createGraphSession();
    const scores = [1, 2, 3, 4, 5, 6, 7, 10, 10, 10];
    await session.data.addNodes(scores.map((score, at) => ({ id: `n${String(at)}`, score })));

    return session;
}

describe("a binding preview", () => {
    it("names the palette in use and says the element filled it, the scale and the domain in", async () => {
        const session = await scored();
        const preview = session.styles.preview({ by: "data.score" }, { channel: "node.color" });

        assert.isString(preview.palette, "a default palette is painting");
        assert.deepStrictEqual([...preview.defaulted], ["palette", "scale", "domain"]);
        assert.deepStrictEqual(preview.extent, [1, 10]);
        session.dispose();
    });

    it("lists nothing as filled in once the binding names every part", async () => {
        const session = await scored();
        const preview = session.styles.preview(
            { by: "data.score", scale: "linear", palette: "viridis", domain: [2, 10] },
            { channel: "node.color" },
        );

        assert.strictEqual(preview.palette, "viridis");
        assert.deepStrictEqual([...preview.defaulted], []);
        session.dispose();
    });

    it("says where the ends sit in the data, and how many tie at each", async () => {
        const session = await scored();
        const preview = session.styles.preview({ by: "data.score", domain: [3, 10] }, { channel: "node.size" });

        assert.deepStrictEqual(preview.endPercentiles, [20, 100], "two of ten lie below 3; all ten at or below 10");
        assert.deepStrictEqual(preview.endTies, [1, 3], "one node sits at 3, three tie at 10");
        assert.include([...preview.defaulted], "range");
        assert.isNull(preview.palette, "a size has no palette");
        session.dispose();
    });

    it("reports a binding's own stops as a custom palette", async () => {
        const session = await scored();
        const preview = session.styles.preview(
            { by: "data.score", colors: ["#000000", "#ffffff"] },
            { channel: "node.color" },
        );

        assert.strictEqual(preview.palette, "custom");
        assert.notInclude([...preview.defaulted], "palette");
        session.dispose();
    });
});
