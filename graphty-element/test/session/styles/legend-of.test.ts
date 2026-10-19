import { assert, describe, it } from "vitest";

import { createGraphSession, isGraphtyError } from "../../../session";

describe("styles.legendOf, the legend blocks of one layer", () => {
    it("answers a base layer, a fixed colour and a rule, and nothing for a hidden layer", async () => {
        const session = createGraphSession();
        const { styles } = session;
        await session.data.addNodes([
            { id: "a", score: 1 },
            { id: "b", score: 5 },
        ]);
        const fixed = await styles.add({
            name: "Fixed",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#e69f00" },
        });
        const rule = await styles.add({
            name: "Rule",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score", palette: "viridis" } },
        });
        const base = styles.list().find((layer) => layer.kind === "base" && layer.target === "node");
        assert.isDefined(base);

        const colorOf = (id: string): string | undefined =>
            styles
                .legendOf(id)
                .find((block) => block.channel === "node.color")
                ?.swatches.at(-1)?.color;

        assert.strictEqual(colorOf(fixed.id)?.toLowerCase().slice(0, 7), "#e69f00");
        assert.isAbove(styles.legendOf(rule.id).find((b) => b.channel === "node.color")?.swatches.length ?? 0, 1);
        assert.isDefined(colorOf(base.id));
        // The whole-graph legend leaves the base layer out; legendOf does not.
        assert.isFalse(styles.legend().some((block) => block.layerId === base.id));

        await styles.update(fixed.id, { enabled: false });
        assert.deepStrictEqual(styles.legendOf(fixed.id), []);
        session.dispose();
    });

    it("refuses a layer the stack does not hold", () => {
        const session = createGraphSession();

        try {
            session.styles.legendOf("no-such-layer");
            assert.fail("expected E_UNKNOWN_LAYER");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_UNKNOWN_LAYER");
        }

        session.dispose();
    });
});
