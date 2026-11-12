/**
 * @file A text size under 1 draws no text, and the layer check says so.
 *
 * The text size channels take every number their style schema takes (`RichTextStyle.fontSize`
 * is any number), so 0 and -1 are values a layer may write. A label's plane is fontSize / 48
 * tall, so such a size would draw nothing a reader can see, or nonsense; it draws no label,
 * tooltip or caption at all, and `styles.validate` reports `W_TEXT_TOO_SMALL`.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

let graph: Graph;
let container: HTMLElement;

beforeAll(async () => {
    container = document.createElement("div");
    container.style.width = "600px";
    container.style.height = "400px";
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();
    await graph.addNodes([{ id: "a" }, { id: "b" }]);
    await graph.addEdges([{ src: "a", dst: "b" }]);
    await operationQueueOf(graph).waitForCompletion();
});

afterAll(() => {
    graph.dispose();
    container.remove();
});

/**
 * Paints words on every node and edge at one size, and counts the text planes drawn.
 * @param size - The text size.
 * @returns How many text planes are enabled.
 */
async function planesAt(size: number): Promise<number> {
    const session = graph.getSession();
    const nodes = await session.styles.add({
        name: "node words",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "Mg", "node.labelSize": size },
    });
    const edges = await session.styles.add({
        name: "edge words",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.label": "Mg", "edge.labelSize": size },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const drawn = graph.scene.meshes.filter((mesh) => mesh.name.startsWith("richTextPlane") && mesh.isEnabled());
    await session.styles.remove(nodes.id);
    await session.styles.remove(edges.id);
    await graph.waitForStableFrame();

    return drawn.length;
}

describe("a text size under 1", () => {
    it("draws no label on a node or an edge, where a size of 1 draws both", async () => {
        assert.strictEqual(await planesAt(1), 3, "two node labels and one edge label");
        assert.strictEqual(await planesAt(0), 0);
        assert.strictEqual(await planesAt(-1), 0);
    });

    it("is reported by the layer check, and a size of 1 is not", () => {
        const session = graph.getSession();
        const spec = {
            name: "tiny",
            target: "node" as const,
            selector: { match: "everything" as const },
            set: { "node.label": "Mg", "node.labelSize": 0 },
        };

        assert.deepStrictEqual(session.styles.validate(spec).warnings, [
            { code: "W_TEXT_TOO_SMALL", params: { channel: "node.labelSize", path: "set.node.labelSize", value: 0 } },
        ]);
        assert.isTrue(session.styles.validate(spec).ok, "a warning, not an error: the layer is still added");
        assert.deepStrictEqual(
            session.styles.validate({ ...spec, set: { "node.label": "Mg", "node.labelSize": 1 } }).warnings,
            [],
        );
    });
});
