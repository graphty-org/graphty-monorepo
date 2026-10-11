import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";

/**
 * A session over five nodes whose `kind` is a, b, green, absent and c, and whose `x` is spread
 * unevenly so a reading against stops lands below, at and between points.
 * @returns The session.
 */
async function fiveNodes(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "n0", kind: "a", x: -5, size: -3 },
        { id: "n1", kind: "b", x: 0, size: 2 },
        { id: "n2", kind: "green", x: 5, size: 4 },
        { id: "n3", x: 10, size: -1 },
        { id: "n4", kind: "c", x: 20, size: 1 },
    ]);

    return session;
}

/**
 * What one node is drawn with on one channel, read through `explain()`.
 * @param session - The session.
 * @param id - The node.
 * @param channel - The channel.
 * @returns The merged value, a color as its hex string.
 */
function drawn(session: GraphSession, id: string, channel: string): unknown {
    const value = (session.styles.explain({ node: id }).merged as Record<string, unknown>)[channel];

    return typeof value === "object" && value !== null && "hex" in value ? value.hex : value;
}

/**
 * Which layer won one channel on one node.
 * @param session - The session.
 * @param id - The node.
 * @param channel - The channel.
 * @returns The layer id.
 */
function winner(session: GraphSession, id: string, channel: string): string | undefined {
    return session.styles.explain({ node: id }).channels.find((entry) => entry.channel === channel)?.layerId;
}

describe("unmapped: skip", () => {
    it("leaves a value the map does not hold to the layers beneath", async () => {
        const session = await fiveNodes();
        const below = await session.styles.add({
            name: "Below",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#123456" },
        });
        const above = await session.styles.add({
            name: "By kind",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": {
                    by: "data.kind",
                    scale: "passthrough",
                    map: { a: "#ff0000", b: "#0000ff" },
                    unmapped: "skip",
                },
            },
        });

        assert.strictEqual(drawn(session, "n0", "node.color"), "#ff0000");
        assert.strictEqual(winner(session, "n0", "node.color"), above.id);
        assert.strictEqual(drawn(session, "n1", "node.color"), "#0000ff");
        for (const id of ["n2", "n3", "n4"]) {
            assert.strictEqual(drawn(session, id, "node.color"), "#123456", id);
            assert.strictEqual(winner(session, id, "node.color"), below.id, id);
        }

        session.dispose();
    });

    it('does not paint an unmapped "green" green, which it does without the option', async () => {
        const session = await fiveNodes();
        const spec = {
            name: "By kind",
            target: "node" as const,
            selector: { match: "everything" as const },
            encode: { "node.color": { by: "data.kind", scale: "passthrough", map: { a: "#ff0000" } } },
        };
        const layer = await session.styles.add(spec);
        assert.strictEqual(drawn(session, "n2", "node.color"), "#008000", "today: a color name passes through");

        await session.styles.update(layer.id, {
            encode: { "node.color": { ...spec.encode["node.color"], unmapped: "skip" } },
        });
        assert.notStrictEqual(winner(session, "n2", "node.color"), layer.id);
        assert.notStrictEqual(drawn(session, "n2", "node.color"), "#008000");
        assert.strictEqual(drawn(session, "n0", "node.color"), "#ff0000");
        session.dispose();
    });

    it("refuses an unmapped policy that is not skip", async () => {
        const session = await fiveNodes();
        const result = session.styles.validate({
            name: "Bad",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", map: { a: "#ff0000" }, unmapped: "paint" as "skip" } },
        });

        assert.isFalse(result.ok);
        assert.include(
            result.errors.map((problem) => problem.path),
            "encode.node.color.unmapped",
        );
        session.dispose();
    });
});

describe("stops", () => {
    it("reads numbers against uneven points with a jump, Cytoscape's way", async () => {
        const session = await fiveNodes();
        // Points at 0 and 10 (a jump at 10: 4 below it, 8 exactly at it, 12 above it) and 20.
        await session.styles.add({
            name: "Size by x",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.size": {
                    by: "data.x",
                    stops: [
                        { at: 0, value: 2, below: 1 },
                        { at: 10, below: 4, value: 8, above: 12 },
                        { at: 20, value: 14, above: 30 },
                    ],
                },
            },
        });

        assert.strictEqual(drawn(session, "n0", "node.size"), 1, "below the first point: its below");
        assert.strictEqual(drawn(session, "n1", "node.size"), 2, "at a point: its value");
        assert.strictEqual(drawn(session, "n2", "node.size"), 3, "between: 2 to 4, half way");
        assert.strictEqual(drawn(session, "n3", "node.size"), 8, "at the jump: its value");
        assert.strictEqual(drawn(session, "n4", "node.size"), 14, "at the last point: its value");
        session.dispose();
    });

    it("blends colors between points and takes the outer values past the ends", async () => {
        const session = await fiveNodes();
        await session.styles.add({
            name: "Color by x",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": {
                    by: "data.x",
                    stops: [
                        { at: 0, value: "#000000", below: "#ff0000" },
                        { at: 10, value: "#ffffff", above: "#0000ff" },
                    ],
                },
            },
        });

        assert.strictEqual(drawn(session, "n0", "node.color"), "#ff0000");
        assert.strictEqual(drawn(session, "n1", "node.color"), "#000000");
        assert.strictEqual(drawn(session, "n2", "node.color"), "#808080");
        assert.strictEqual(drawn(session, "n3", "node.color"), "#ffffff");
        assert.strictEqual(drawn(session, "n4", "node.color"), "#0000ff");
        session.dispose();
    });

    it("refuses stops beside a palette, out of order, or of the wrong kind", async () => {
        const session = await fiveNodes();
        const problems = (stops: unknown, extra: Record<string, unknown> = {}): readonly string[] =>
            session.styles
                .validate({
                    name: "Bad",
                    target: "node",
                    selector: { match: "everything" },
                    encode: { "node.size": { by: "data.x", stops, ...extra } as never },
                })
                .errors.map((problem) => problem.path ?? "");

        assert.include(problems([{ at: 0, value: 1 }], { range: [0, 1] }), "encode.node.size.stops");
        assert.include(
            problems([
                { at: 5, value: 1 },
                { at: 0, value: 2 },
            ]),
            "encode.node.size.stops",
        );
        assert.include(problems([{ at: 0, value: "red" }]), "encode.node.size.stops");
        assert.include(problems([]), "encode.node.size.stops");
        assert.deepStrictEqual(problems([{ at: 0, value: 1 }]), []);
        session.dispose();
    });
});

describe("values the element adjusts are counted, and drawn as before", () => {
    it("clamps an out-of-range size exactly as before and counts it", async () => {
        const session = await fiveNodes();
        const layer = await session.styles.add({
            name: "Size from data",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.size", scale: "passthrough" } },
        });

        assert.strictEqual(drawn(session, "n0", "node.size"), 0, "-3 is drawn at the smallest size drawn");
        assert.strictEqual(drawn(session, "n1", "node.size"), 2);
        assert.strictEqual(drawn(session, "n3", "node.size"), 0);
        assert.deepStrictEqual(session.styles.counts(layer.id).adjusted, [
            { code: "style.out-of-range", params: { channel: "node.size", count: 2 } },
        ]);
        session.dispose();
    });

    it("counts a stop that runs past what the channel draws", async () => {
        const session = await fiveNodes();
        const layer = await session.styles.add({
            name: "Opacity by x",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.opacity": {
                    by: "data.x",
                    stops: [
                        { at: 0, value: 0.5 },
                        { at: 10, value: 1.5 },
                    ],
                },
            },
        });

        assert.strictEqual(drawn(session, "n3", "node.opacity"), 1);
        assert.deepStrictEqual(session.styles.counts(layer.id).adjusted, [
            { code: "style.out-of-range", params: { channel: "node.opacity", count: 2 } },
        ]);
        session.dispose();
    });

    it("draws a node color with alpha as before and reports the alpha", async () => {
        const session = await fiveNodes();
        const layer = await session.styles.add({
            name: "See-through",
            target: "node",
            selector: { match: "ids", nodes: ["n0", "n1"] },
            set: { "node.color": "#ff000080" },
        });

        assert.strictEqual(drawn(session, "n0", "node.color"), "#ff000080");
        assert.deepStrictEqual(session.styles.counts(layer.id).adjusted, [
            { code: "style.alpha-not-drawn", params: { channel: "node.color", count: 2 } },
        ]);
        session.dispose();
    });

    it("reports nothing for a layer the element draws as written", async () => {
        const session = await fiveNodes();
        const layer = await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000", "node.size": 2 },
        });

        assert.deepStrictEqual(session.styles.counts(layer.id).adjusted, []);
        session.dispose();
    });
});
