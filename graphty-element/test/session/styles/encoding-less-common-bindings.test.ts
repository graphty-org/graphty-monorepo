/**
 * @file The less common bindings a consumer writes, read through the public session API:
 * `styles.preview` of a binding with points (`stops`), with `choices`, and with an overflow the
 * channel cannot draw, and a written layer whose color overflow cycles node shapes.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../../session";
import type { NodeId } from "../../../src/catalog/types";

/**
 * A session holding nodes n0..n{count-1}, each with the fields `fields(at)` gives it.
 * @param count - How many nodes.
 * @param fields - The data of node `at`.
 * @returns The session.
 */
async function sessionOf(count: number, fields: (at: number) => Record<string, unknown>): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: count }, (_, at) => ({ id: `n${String(at)}` as NodeId, ...fields(at) })),
    );

    return session;
}

/**
 * The code and message a call refused with.
 * @param call - The call.
 * @returns The code and message, or null when it did not refuse.
 */
function refusal(call: () => unknown): { code: string; message: string } | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? { code: error.code, message: error.message } : { code: "?", message: "" };
    }

    return null;
}

/**
 * The hex of a painted color.
 * @param value - What a bin paints.
 * @returns Its hex, lower case, without alpha.
 */
function hexOf(value: unknown): string | undefined {
    return (value as { hex?: string } | null)?.hex?.slice(0, 7).toLowerCase();
}

describe("styles.preview of a binding with stops", () => {
    it("reads sizes against the points, with the domain running from the first point to the last", async () => {
        const session = await sessionOf(5, (at) => ({ weight: at * 5 }));
        const preview = session.styles.preview(
            {
                by: "data.weight",
                scale: "linear",
                stops: [
                    { at: 0, value: 2 },
                    { at: 20, value: 10 },
                ],
            },
            { channel: "node.size" },
        );

        assert.strictEqual(preview.scale, "linear");
        assert.deepEqual(preview.domain, [0, 20]);
        assert.strictEqual(preview.noValue, 0);
    });

    it("refuses points on a channel that carries a shape rather than a number or a color", async () => {
        const session = await sessionOf(2, (at) => ({ weight: at }));
        const got = refusal(() =>
            session.styles.preview({ by: "data.weight", stops: [{ at: 0, value: 1 }] }, { channel: "node.shape" }),
        );

        assert.strictEqual(got?.code, "E_BAD_LAYER");
        assert.include(got?.message, "node.shape carries neither");
    });

    it("refuses points beside a scale other than linear", async () => {
        const session = await sessionOf(2, (at) => ({ weight: at + 1 }));
        const got = refusal(() =>
            session.styles.preview(
                { by: "data.weight", scale: "log", stops: [{ at: 1, value: 1 }] },
                { channel: "node.size" },
            ),
        );

        assert.strictEqual(got?.code, "E_BAD_LAYER");
        assert.include(got?.message, '"log" scale');
    });

    it("refuses a point with no number at `at`", async () => {
        const session = await sessionOf(2, (at) => ({ weight: at }));
        const got = refusal(() =>
            session.styles.preview(
                { by: "data.weight", stops: [{ at: "low" as unknown as number, value: 1 }] },
                { channel: "node.size" },
            ),
        );

        assert.strictEqual(got?.code, "E_BAD_LAYER");
        assert.include(got?.message, "number at `at`");
    });

    it("refuses a color point whose value is not a color, saying a color is wanted", async () => {
        const session = await sessionOf(2, (at) => ({ weight: at }));
        const got = refusal(() =>
            session.styles.preview(
                { by: "data.weight", stops: [{ at: 0, value: "not-a-color" }] },
                { channel: "node.color" },
            ),
        );

        assert.strictEqual(got?.code, "E_BAD_LAYER");
        assert.include(got?.message, "is a color");
    });

    it("blends colors between two points", async () => {
        const session = await sessionOf(3, (at) => ({ weight: at * 10 }));
        const preview = session.styles.preview(
            {
                by: "data.weight",
                stops: [
                    { at: 0, value: "#000000" },
                    { at: 20, value: "#ffffff" },
                ],
            },
            { channel: "node.color", bins: 2 },
        );

        assert.deepEqual(preview.domain, [0, 20]);
        assert.isAtLeast(preview.bins.length, 1);
        for (const bin of preview.bins) {
            assert.match(hexOf(bin.paints) ?? "", /^#[0-9a-f]{6}$/);
        }
    });
});

describe("styles.preview of a binding with choices", () => {
    it("refuses choices on a channel that does not take one of a list", async () => {
        const session = await sessionOf(2, (at) => ({ kind: `k${String(at)}` }));
        const got = refusal(() =>
            session.styles.preview({ by: "data.kind", choices: ["a"] }, { channel: "node.size" }),
        );

        assert.strictEqual(got?.code, "E_BAD_LAYER");
    });

    it("refuses an empty list of choices", async () => {
        const session = await sessionOf(2, (at) => ({ kind: `k${String(at)}` }));
        const got = refusal(() => session.styles.preview({ by: "data.kind", choices: [] }, { channel: "node.shape" }));

        assert.strictEqual(got?.code, "E_BAD_LAYER");
    });

    it("refuses a choice the channel does not draw", async () => {
        const session = await sessionOf(2, (at) => ({ kind: `k${String(at)}` }));
        const got = refusal(() =>
            session.styles.preview({ by: "data.kind", choices: ["no-such-shape"] }, { channel: "node.shape" }),
        );

        assert.strictEqual(got?.code, "E_OPTION_RANGE");
    });
});

describe("styles.preview of an overflow the channel cannot draw", () => {
    it('refuses overflow "pattern" on a node, which has no line', async () => {
        const session = await sessionOf(3, (at) => ({ kind: `k${String(at)}` }));
        const got = refusal(() =>
            session.styles.preview({ by: "data.kind", overflow: "pattern" }, { channel: "node.color" }),
        );

        assert.strictEqual(got?.code, "E_BAD_LAYER");
        assert.include(got?.message, "a node has no line");
    });

    it('folds the shapes past the list into "other" when a shape binding overflows to other', async () => {
        const session = await sessionOf(40, (at) => ({ kind: `k${String(at)}` }));
        const preview = session.styles.preview({ by: "data.kind", overflow: "other" }, { channel: "node.shape" });

        assert.isAbove(preview.bins.length, 0);
        assert.isBelow(preview.bins.length, 41);
    });
});

describe("styles.preview of a color over text with gaps", () => {
    it("reads the text as groups, passing over the nodes that carry no value", async () => {
        const session = await sessionOf(4, (at) => (at === 0 ? {} : { kind: `k${String(at % 2)}` }));
        const preview = session.styles.preview({ by: "data.kind" }, { channel: "node.color" });

        assert.strictEqual(preview.scale, "ordinal");
        assert.strictEqual(preview.noValue, 1);
        assert.sameMembers(
            preview.bins.map((bin) => bin.value),
            ["k0", "k1"],
        );
    });
});

describe("styles.preview of a switch read straight from the data", () => {
    it("shows true and false for the words and numbers that mean them, and nothing for any other word", async () => {
        const flags = ["true", "false", 0, "maybe"];
        const session = await sessionOf(flags.length, (at) => ({ flag: flags[at] }));
        const preview = session.styles.preview({ by: "data.flag", scale: "passthrough" }, { channel: "node.visible" });
        const paints = new Map(preview.bins.map((bin) => [String(bin.value), bin.paints]));

        assert.strictEqual(paints.get("true"), true);
        assert.strictEqual(paints.get("false"), false);
        assert.strictEqual(paints.get("0"), false);
        assert.isNull(paints.get("maybe") ?? null);
    });
});

describe("a written layer reading sizes against points", () => {
    it("paints text as the missing value and does not count it as out of range", async () => {
        const values = [0, 5, "n/a"];
        const session = await sessionOf(values.length, (at) => ({ x: values[at] }));
        const layer = await session.styles.add({
            name: "Opacity by x",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.opacity": {
                    by: "data.x",
                    missing: { value: 0.2 },
                    stops: [
                        { at: 0, value: 0.4 },
                        { at: 10, value: 1 },
                    ],
                },
            },
        });

        assert.strictEqual(session.styles.explain({ node: "n2" as NodeId }).merged["node.opacity"], 0.2);
        assert.strictEqual(session.styles.explain({ node: "n1" as NodeId }).merged["node.opacity"], 0.7);
        assert.deepStrictEqual(session.styles.counts(layer.id).adjusted, []);
    });
});

describe("a written color layer whose overflow cycles node shapes", () => {
    it("keeps its own colors and hidden values on the shape half", async () => {
        const session = await sessionOf(4, (at) => ({ kind: `k${String(at % 2)}` }));
        await session.styles.add({
            name: "Kinds",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": {
                    by: "data.kind",
                    scale: "ordinal",
                    overflow: "shape",
                    colors: ["#ff0000", "#0000ff"],
                    hidden: ["k1"],
                },
            },
        });

        const shown = session.styles.explain({ node: "n0" as NodeId }).merged;
        const hidden = session.styles.explain({ node: "n1" as NodeId }).merged;
        assert.strictEqual(hexOf(shown["node.color"]), "#ff0000");
        assert.notInclude(["#ff0000", "#0000ff"], hexOf(hidden["node.color"]));
        assert.strictEqual(hidden["node.shape"], "icosphere");
    });
});
