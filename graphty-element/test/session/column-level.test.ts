/**
 * @file What a column measures, the binding a channel takes from it when the caller names no
 * scale and no range, and the legend's category cap with its "other" row.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";
import type { GraphSession } from "../../src/session/types";

const KINDS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

/**
 * A session over 100 nodes: a group code, a measurement, a ten-way category and a unique name.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    const graph = createGraphSession();
    await graph.data.addNodes(
        Array.from({ length: 100 }, (_, index) => ({
            id: `n${String(index)}`,
            group: index % 4,
            score: index * 1.5,
            kind: KINDS[index % 10],
            nodeId: `node-${String(index)}`,
        })),
    );
    return graph;
}

/**
 * The level of one attribute.
 * @param graph - The session.
 * @param path - The attribute's path.
 * @returns Its level and where the level came from.
 */
function levelOf(graph: GraphSession, path: string): [string | undefined, string | undefined] {
    const attribute = graph.data.attributes().find((each) => each.path === path);
    return [attribute?.level, attribute?.levelSource];
}

/**
 * Await a call that should fail, and return the error code.
 * @param call - The call.
 * @returns The code.
 */
async function codeOf(call: () => unknown): Promise<string> {
    let code = "none thrown";
    try {
        await call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error));
        ({ code } = error as { code: string });
    }

    return code;
}

describe("an attribute's level", () => {
    it("is inferred from the values: group codes are categories, measurements quantities", async () => {
        const graph = await session();

        assert.deepEqual(levelOf(graph, "data.group"), ["category", "inferred"]);
        assert.deepEqual(levelOf(graph, "data.score"), ["quantity", "inferred"]);
        assert.deepEqual(levelOf(graph, "data.kind"), ["category", "inferred"]);
        assert.deepEqual(levelOf(graph, "data.nodeId"), ["id", "inferred"]);
        graph.dispose();
    });

    it("is declared as one undoable step, and undo takes it back", async () => {
        const graph = await session();

        await graph.data.declare("data.score", { level: "category" });
        assert.deepEqual(levelOf(graph, "data.score"), ["category", "declared"]);

        await graph.undo();
        assert.deepEqual(levelOf(graph, "data.score"), ["quantity", "inferred"]);
        graph.dispose();
    });

    it("refuses a path no record carries and a level that is not one", async () => {
        const graph = await session();

        assert.strictEqual(
            await codeOf(() => graph.data.declare("data.nope", { level: "category" })),
            "E_UNKNOWN_ATTRIBUTE",
        );
        assert.strictEqual(
            await codeOf(() => graph.data.declare("data.score", { level: "ratio" as "category" })),
            "E_BAD_COMMAND",
        );
        graph.dispose();
    });
});

describe("a binding with no scale and no range", () => {
    it("paints an integer group column one color per group", async () => {
        const graph = await session();

        await graph.styles.add({
            name: "By group",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.group" } },
        });
        const [block] = graph.styles.legend();

        assert.strictEqual(block.kind, "categorical");
        assert.strictEqual(block.scale?.kind, "ordinal");
        assert.lengthOf(block.swatches, 4);
        assert.lengthOf(new Set(block.swatches.map((swatch) => swatch.color)), 4);
        graph.dispose();
    });

    it("sizes nodes over a readable range, and the legend reports it", async () => {
        const graph = await session();

        await graph.styles.add({
            name: "By score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.score" } },
        });
        const [block] = graph.styles.legend();
        const sizes = block.swatches.map((swatch) => swatch.size);

        assert.strictEqual(sizes[0], 0.5);
        assert.strictEqual(sizes[sizes.length - 1], 3);
        graph.dispose();
    });

    it("follows a declared level, and its undo", async () => {
        const graph = await session();
        await graph.styles.add({
            name: "By score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score" } },
        });
        assert.strictEqual(graph.styles.legend()[0].scale?.kind, "linear");

        await graph.data.declare("data.score", { level: "category" });
        await graph.styles.settled();
        assert.strictEqual(graph.styles.legend()[0].scale?.kind, "ordinal");

        await graph.undo();
        await graph.styles.settled();
        assert.strictEqual(graph.styles.legend()[0].scale?.kind, "linear");
        graph.dispose();
    });
});

describe("styles.defaultBinding", () => {
    it("says what a binding would read, before it is written", async () => {
        const graph = await session();

        assert.deepEqual(graph.styles.defaultBinding("data.group", "node.color"), {
            level: "category",
            scale: "ordinal",
            palette: "okabe-ito",
            suitable: true,
        });
        assert.deepEqual(graph.styles.defaultBinding("data.score", "node.size"), {
            level: "quantity",
            scale: "linear",
            range: [0.5, 3],
            suitable: true,
        });
        assert.isTrue(graph.styles.defaultBinding("data.nodeId", "node.label").suitable);
        graph.dispose();
    });

    it("refuses an unsuitable column with a reason a reader can see", async () => {
        const graph = await session();

        const byId = graph.styles.defaultBinding("data.nodeId", "node.color");
        assert.isFalse(byId.suitable);
        assert.match(byId.reason ?? "", /nodeId/);

        const sizeByGroup = graph.styles.defaultBinding("data.group", "node.size");
        assert.isFalse(sizeByGroup.suitable);
        assert.match(sizeByGroup.reason ?? "", /no order/);

        const shapeByGroup = graph.styles.defaultBinding("data.group", "node.shape");
        assert.isFalse(shapeByGroup.suitable);
        assert.match(shapeByGroup.reason ?? "", /ordinal/);

        assert.strictEqual(
            await codeOf(() => graph.styles.defaultBinding("data.nope", "node.color")),
            "E_UNKNOWN_ATTRIBUTE",
        );
        graph.dispose();
    });

    it("reads the attribute of the kind the channel paints", async () => {
        const graph = await session();
        await graph.data.addEdges(
            Array.from({ length: 40 }, (_, index) => ({
                source: `n${String(index)}`,
                target: `n${String(index + 1)}`,
                group: index * 2.5,
            })),
        );

        assert.strictEqual(graph.styles.defaultBinding("data.group", "node.color").level, "category");
        assert.strictEqual(graph.styles.defaultBinding("data.group", "edge.color").level, "quantity");
        assert.strictEqual(
            await codeOf(() => graph.styles.defaultBinding("data.score", "edge.width")),
            "E_UNKNOWN_ATTRIBUTE",
        );
        graph.dispose();
    });
});

describe("styles.legend({ maxCategories })", () => {
    it("lists the largest categories and rolls the rest into one other row that lists them", async () => {
        const graph = await session();
        await graph.styles.add({
            name: "By kind",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind" } },
        });

        const [all] = graph.styles.legend();
        assert.lengthOf(all.swatches, 10);

        const [capped] = graph.styles.legend({ maxCategories: 3 });
        assert.lengthOf(capped.swatches, 4);
        const other = capped.swatches[3];
        assert.strictEqual(other.label, "other: 7 groups");
        assert.deepEqual(
            other.rolledUp?.map((swatch) => swatch.color),
            all.swatches.slice(3).map((swatch) => swatch.color),
        );
        assert.deepEqual(
            other.value,
            all.swatches.slice(3).map((swatch) => swatch.value),
        );

        assert.strictEqual(await codeOf(() => graph.styles.legend({ maxCategories: 0 })), "E_OPTION_RANGE");
        graph.dispose();
    });
});
