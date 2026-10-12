/**
 * @file What a style panel reads before it writes: what the layers beneath a row give its
 * elements (`styles.agreement` with `below`), and what a binding not yet written would paint
 * (`styles.preview`), checked against what the written binding then paints (`styles.explain`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../session";
import type { Binding, NodeId } from "../../src/catalog/types";

/** A node as the tests add it: an id and a few data fields. */
type NodeRecord = { id: NodeId } & Record<string, unknown>;

/**
 * A session holding these nodes.
 * @param nodes - The nodes.
 * @returns The session.
 */
async function sessionOf(nodes: readonly NodeRecord[]): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([...nodes]);
    return session;
}

/**
 * The colour one node is painted, as `#rrggbb`.
 * @param session - The session.
 * @param id - The node.
 * @returns The colour, or undefined when nothing paints it.
 */
function colorOf(session: GraphSession, id: NodeId): string | undefined {
    const color = session.styles.explain({ node: id }).merged["node.color"] as { hex: string } | undefined;
    return color?.hex;
}

/**
 * The hex of a colour a preview reports.
 * @param value - What a bin paints.
 * @returns Its hex.
 */
function hexOf(value: unknown): string | undefined {
    return (value as { hex?: string } | null)?.hex;
}

/**
 * The code a call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("styles.agreement below a row", () => {
    it("answers what the layers beneath a row give: mixed under Degree, the floor under Everything", async () => {
        const nodes = Array.from({ length: 12 }, (_, at) => ({ id: `n${String(at)}`, group: at % 3, degree: at + 1 }));
        const floor = (await sessionOf(nodes)).styles.agreement("graph", "node.color");
        const session = await sessionOf(nodes);
        const { styles } = session;
        const everything = await styles.add({
            name: "Everything",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        await styles.add({
            name: "Louvain",
            target: "node",
            selector: { match: "has", path: "data.group" },
            encode: { "node.color": { by: "data.group", scale: "ordinal" } },
        });
        const degree = await styles.add({
            name: "Degree",
            target: "node",
            selector: { match: "has", path: "data.degree" },
            encode: { "node.color": { by: "data.degree", scale: "log" } },
        });

        const [onTop] = styles.agreement("graph", "node.color").channels;
        assert.strictEqual(onTop?.state, "mixed");
        assert.isTrue(
            onTop?.state === "mixed" && onTop.breakdown.every((share) => share.layerId === degree.id),
            "with nothing cut, Degree decides every node",
        );

        const [beneathDegree] = styles.agreement("graph", "node.color", { below: degree.id }).channels;
        assert.strictEqual(beneathDegree?.state, "mixed", "Louvain's three colours lie beneath Degree");
        assert.strictEqual(beneathDegree?.state === "mixed" ? beneathDegree.breakdown.length : 0, 3);

        assert.deepEqual(
            styles.agreement("graph", "node.color", { below: everything.id }),
            floor,
            "beneath the bottom row is what a session with no layers of its own paints",
        );
        assert.strictEqual(
            codeOf(() => styles.agreement("graph", "node.color", { below: "nope" })),
            "E_UNKNOWN_LAYER",
        );
        session.dispose();
    });

    it("reads beneath a folder as beneath every row in it", async () => {
        const session = await sessionOf([{ id: "a" }, { id: "b" }]);
        const { styles } = session;
        const red = await styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        const blue = await styles.add({
            name: "Blue",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });
        const folder = await styles.addFolder("Annotations");
        await styles.moveRow(blue.id, { parent: folder.id });

        const [beneath] = styles.agreement("graph", "node.color", { below: folder.id }).channels;
        assert.strictEqual(beneath?.state === "agree" ? beneath.layerId : undefined, red.id);
        session.dispose();
    });
});

describe("styles.preview", () => {
    it("gives each log-scale bin the colour explain reports for a node in it", async () => {
        // Degrees from 1 to 10^4, so four bins of the log scale are one decade each, and five
        // nodes sit in the middles of bins.
        const middles = [10 ** 0.5, 10 ** 1.5, 10 ** 2.5, 10 ** 3.5, 10 ** 1.5];
        const nodes = [
            { id: "low", degree: 1 },
            { id: "high", degree: 10_000 },
            { id: "none" },
            { id: "zero", degree: 0 },
            ...middles.map((degree, at) => ({ id: `m${String(at)}`, degree })),
        ];
        const session = await sessionOf(nodes);
        const binding: Binding = { by: "data.degree", scale: "log" };

        const preview = session.styles.preview(binding, { channel: "node.color", bins: 4 });

        assert.strictEqual(preview.scale, "log");
        assert.deepEqual(preview.domain, [1, 10_000], "the positive extent, zero being off a log scale");
        assert.deepEqual(
            preview.bins.map((bin) => [Math.round(bin.from ?? 0), Math.round(bin.to ?? 0)]),
            [
                [1, 10],
                [10, 100],
                [100, 1000],
                [1000, 10_000],
            ],
            "equal stretches of the log scale, in degrees",
        );
        assert.deepEqual(
            preview.bins.map((bin) => bin.count),
            [2, 2, 1, 2],
        );
        assert.strictEqual(preview.noValue, 1);
        assert.strictEqual(preview.outsideScale, 1, "zero has no place on a log scale");
        assert.deepEqual(preview.steps, [], "a continuous scale has no steps");

        await session.styles.add({
            name: "Degree",
            target: "node",
            selector: { match: "has", path: "data.degree" },
            encode: { "node.color": binding },
        });
        for (const [at, degree] of middles.entries()) {
            const bin = preview.bins.find(
                (candidate) => degree >= (candidate.from ?? 0) && degree < (candidate.to ?? 0),
            );
            assert.strictEqual(colorOf(session, `m${String(at)}`), hexOf(bin?.paints), `node m${String(at)}`);
        }

        session.dispose();
    });

    it("gives every node of a stepped scale its step's colour, and reports the step bounds", async () => {
        const nodes = Array.from({ length: 40 }, (_, at) => ({ id: `n${String(at)}`, degree: (at * 7) % 23 }));
        const session = await sessionOf(nodes);
        const binding: Binding = { by: "data.degree", scale: "bins", bins: 4 };

        const preview = session.styles.preview(binding, { channel: "node.color", bins: 4 });

        assert.deepEqual(preview.steps, [5.5, 11, 16.5]);
        await session.styles.add({
            name: "Degree",
            target: "node",
            selector: { match: "has", path: "data.degree" },
            encode: { "node.color": binding },
        });
        for (const { id, degree } of nodes.filter((_, at) => at % 8 === 3)) {
            const bin = preview.bins.find(
                (candidate, at) =>
                    degree >= (candidate.from ?? 0) && (degree < (candidate.to ?? 0) || at === preview.bins.length - 1),
            );
            assert.strictEqual(colorOf(session, id), hexOf(bin?.paints), `node ${id}`);
        }

        session.dispose();
    });

    it("counts the elements a clamp leaves below and above the domain", async () => {
        const nodes = Array.from({ length: 100 }, (_, at) => ({ id: `n${String(at)}`, score: at + 1 }));
        const session = await sessionOf(nodes);

        const preview = session.styles.preview(
            { by: "data.score", clamp: [10, 90] },
            { channel: "node.color", bins: 8 },
        );
        const [low, high] = preview.domain ?? [Number.NaN, Number.NaN];

        assert.closeTo(low, 10.9, 1e-9, "the 10th percentile of 1..100");
        assert.closeTo(high, 90.1, 1e-9);
        assert.strictEqual(preview.below, nodes.filter((node) => node.score < low).length);
        assert.strictEqual(preview.above, nodes.filter((node) => node.score > high).length);
        assert.strictEqual(preview.below, 10);
        assert.strictEqual(preview.above, 10);
        assert.strictEqual(
            preview.bins.reduce((sum, bin) => sum + bin.count, 0),
            80,
            "every node inside the clamp is in a bin",
        );
        session.dispose();
    });

    it("gives a scale of categories one bin per category, with its colour", async () => {
        const session = await sessionOf([
            { id: "a", team: "x" },
            { id: "b", team: "x" },
            { id: "c", team: "y" },
            { id: "d" },
        ]);

        const preview = session.styles.preview({ by: "data.team", scale: "ordinal" }, { channel: "node.color" });

        assert.isNull(preview.domain);
        assert.deepEqual(
            preview.bins.map((bin) => [bin.value, bin.count]),
            [
                ["x", 2],
                ["y", 1],
            ],
        );
        assert.notStrictEqual(hexOf(preview.bins[0]?.paints), hexOf(preview.bins[1]?.paints));
        assert.strictEqual(preview.noValue, 1);
        session.dispose();
    });

    it("refuses what writing the binding would refuse", async () => {
        const session = await sessionOf([{ id: "a", score: 1 }]);
        const { styles } = session;

        assert.strictEqual(
            codeOf(() => styles.preview({ by: "data.score" }, { channel: "node.nope" as "node.color" })),
            "E_UNKNOWN_CHANNEL",
        );
        assert.strictEqual(
            codeOf(() => styles.preview({ by: "data.score", stops: ["#000000"] }, { channel: "node.color" })),
            "E_BAD_LAYER",
        );
        assert.strictEqual(
            codeOf(() => styles.preview({ by: "data.score", palette: "nope" }, { channel: "node.color" })),
            "E_UNKNOWN_PALETTE",
        );
        session.dispose();
    });
});

describe("a binding's own stops", () => {
    it("paints through them, and survives save and reopen", async () => {
        const nodes = [
            { id: "low", score: 0 },
            { id: "mid", score: 5 },
            { id: "high", score: 10 },
        ];
        const saved = await sessionOf(nodes);
        const binding: Binding = { by: "data.score", stops: ["#000000", "#ffffff"] };
        const preview = saved.styles.preview(binding, { channel: "node.color", bins: 2 });
        const layer = await saved.styles.add({
            name: "Score",
            target: "node",
            selector: { match: "has", path: "data.score" },
            encode: { "node.color": binding },
        });

        assert.strictEqual(colorOf(saved, "low"), "#000000");
        assert.strictEqual(colorOf(saved, "high"), "#ffffff");
        assert.deepEqual(
            preview.bins.map((bin) => hexOf(bin.paints)),
            ["#404040", "#bfbfbf"],
            "the middles of the two bins, a quarter and three quarters of the way from black to white",
        );
        const { text } = await saved.project.save();

        const opened = createGraphSession();
        const report = await opened.project.open(text);

        assert.deepEqual(report.problems, []);
        const reopened = opened.styles.list().find((candidate) => candidate.name === layer.name);
        assert.deepEqual(reopened?.encode?.["node.color"], binding);
        for (const { id } of nodes) {
            assert.strictEqual(colorOf(opened, id), colorOf(saved, id), `node ${id}`);
        }

        saved.dispose();
        opened.dispose();
    });

    it("refuses stops that are not colours, and stops beside a palette", async () => {
        const session = await sessionOf([{ id: "a", score: 1 }]);
        const write = async (binding: Binding): Promise<string | null> => {
            try {
                await session.styles.add({
                    name: "Score",
                    target: "node",
                    selector: { match: "has", path: "data.score" },
                    encode: { "node.color": binding },
                });
            } catch (error) {
                return isGraphtyError(error) ? error.code : "not-a-graphty-error";
            }

            return null;
        };

        assert.strictEqual(await write({ by: "data.score", stops: ["#000000", "not a colour"] }), "E_BAD_LAYER");
        assert.strictEqual(
            await write({ by: "data.score", stops: ["#000000", "#ffffff"], palette: "viridis" }),
            "E_BAD_LAYER",
        );
        session.dispose();
    });
});
