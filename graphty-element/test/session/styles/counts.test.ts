import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../../session";

/**
 * A session over six nodes: `score` is 0, 1, 2, 3, absent and absent, and `team` is "a" on the
 * first three.
 * @returns The session.
 */
async function sixNodes(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "n0", score: 0, team: "a" },
        { id: "n1", score: 1, team: "a" },
        { id: "n2", score: 2, team: "a" },
        { id: "n3", score: 3 },
        { id: "n4" },
        { id: "n5" },
    ]);

    return session;
}

describe("styles.counts, how many elements a layer covers and where it wins", () => {
    it("counts what a layer matches and the channels it wins, with overlapping layers", async () => {
        const session = await sixNodes();
        const { styles } = session;
        const below = await styles.add({
            name: "Below",
            target: "node",
            selector: { match: "ids", nodes: ["n0", "n1", "n2", "n3"] },
            set: { "node.color": "#ff0000", "node.size": 3 },
        });
        const above = await styles.add({
            name: "Above",
            target: "node",
            selector: { match: "ids", nodes: ["n2", "n3", "n4"] },
            set: { "node.color": "#0000ff" },
        });

        const lower = styles.counts(below.id);
        assert.strictEqual(lower.matched, 4);
        assert.deepStrictEqual(lower.painted, { "node.color": 2, "node.size": 4 });
        assert.strictEqual(lower.noValue, 0);
        assert.strictEqual(lower.outsideScale, 0);

        const upper = styles.counts(above.id);
        assert.strictEqual(upper.matched, 3);
        assert.deepStrictEqual(upper.painted, { "node.color": 3 });
        session.dispose();
    });

    it("agrees with explain about who wins each element", async () => {
        const session = await sixNodes();
        const { styles } = session;
        const layer = await styles.add({
            name: "Everyone",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#00ff00" },
        });
        await styles.add({
            name: "Some",
            target: "node",
            selector: { match: "ids", nodes: ["n0"] },
            set: { "node.color": "#000000" },
        });

        const won = ["n0", "n1", "n2", "n3", "n4", "n5"].filter(
            (id) =>
                styles.explain({ node: id }).channels.find((entry) => entry.channel === "node.color")?.layerId ===
                layer.id,
        ).length;

        assert.strictEqual(styles.counts(layer.id).painted["node.color"], won);
        assert.strictEqual(won, 5);
        session.dispose();
    });

    it("keeps counting what a hidden layer matches, and says it wins nothing", async () => {
        const session = await sixNodes();
        const { styles } = session;
        const layer = await styles.add({
            name: "Hidden",
            target: "node",
            selector: { match: "ids", nodes: ["n0", "n1"] },
            set: { "node.color": "#ff0000" },
        });
        const shown = styles.counts(layer.id);
        assert.deepStrictEqual(shown.painted, { "node.color": 2 });

        await styles.update(layer.id, { enabled: false });
        const hidden = styles.counts(layer.id);

        assert.strictEqual(hidden.matched, 2);
        assert.deepStrictEqual(hidden.painted, { "node.color": 0 });
        assert.notStrictEqual(hidden.revision, shown.revision, "a visibility change moves the revision");
        session.dispose();
    });

    it("counts matched elements the binding has no value for, and values outside the scale", async () => {
        const session = await sixNodes();
        const { styles } = session;
        const layer = await styles.add({
            name: "By score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score", scale: "log", palette: "viridis" } },
        });

        const counts = styles.counts(layer.id);
        assert.strictEqual(counts.matched, 6);
        assert.strictEqual(counts.noValue, 2, "n4 and n5 carry no score");
        assert.strictEqual(counts.outsideScale, 1, "a log scale has no place for 0");
        assert.strictEqual(counts.painted["node.color"], 3);
        session.dispose();
    });

    it("updates after a data change and after a layer change", async () => {
        const session = await sixNodes();
        const { styles } = session;
        const layer = await styles.add({
            name: "Team a",
            target: "node",
            selector: { match: "has", path: "data.team" },
            set: { "node.color": "#ff0000" },
        });
        const first = styles.counts(layer.id);
        assert.strictEqual(first.matched, 3);

        await session.data.addNodes([{ id: "n6", team: "a" }]);
        await styles.settled();
        const afterData = styles.counts(layer.id);
        assert.strictEqual(afterData.matched, 4);
        assert.strictEqual(afterData.painted["node.color"], 4);
        assert.notStrictEqual(afterData.revision, first.revision, "a data change moves the revision");

        await styles.update(layer.id, { selector: { match: "ids", nodes: ["n0"] } });
        const afterLayer = styles.counts(layer.id);
        assert.strictEqual(afterLayer.matched, 1);
        assert.notStrictEqual(afterLayer.revision, afterData.revision, "a layer change moves the revision");
        assert.strictEqual(styles.counts(layer.id).revision, afterLayer.revision, "a read alone does not");
        session.dispose();
    });

    it("refuses a layer id the stack does not hold", async () => {
        const session = await sixNodes();

        try {
            session.styles.counts("no-such-layer");
            assert.fail("an unknown layer was counted");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNKNOWN_LAYER");
        }
        session.dispose();
    });
});
