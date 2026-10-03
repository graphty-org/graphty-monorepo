/**
 * @file The project file on a real `Graph`: a project saved from one renderer opens in another
 * with its layout, positions, runs and their layers. The
 * session half is `test/session/project-file.test.ts`.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Per-test budget: each builds two real Babylon scenes. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real, empty `Graph`.
 * @returns The graph.
 */
async function emptyGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

describe("the project file on a renderer", () => {
    it(
        "opens a saved project with its layout, positions, runs and layers",
        async () => {
            const source = await emptyGraph();
            await source.setLayout("circular");
            await source.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
            await source.addEdges([
                { src: "n1", dst: "n2" },
                { src: "n2", dst: "n3" },
            ]);
            const from = source.getSession();
            await from.run({ op: "algo.run", algorithm: "degree", as: "links", applySuggestedStyles: true });
            await operationQueueOf(source).waitForCompletion();
            await from.styles.settled();
            const file = await from.project.save({ name: "Three in a row" });

            const target = await emptyGraph();
            const to = target.getSession();
            const report = await to.project.open(file);
            await operationQueueOf(target).waitForCompletion();
            await to.styles.settled();

            assert.deepStrictEqual(report.missing, []);
            assert.strictEqual(to.layout.id, "circular");
            assert.deepStrictEqual(
                to.runs.list().map((run) => run.id),
                ["links"],
            );
            assert.strictEqual(to.results.get("links")?.node("n2")?.value, 2);
            assert.deepStrictEqual(to.styles.toDocument(), from.styles.toDocument());

            const before = { x: 0, y: 0, z: 0 };
            const after = { x: 0, y: 0, z: 0 };
            for (let index = 0; index < 3; index++) {
                from.positions.read(index, before);
                to.positions.read(index, after);
                assert.closeTo(after.x, before.x, 1e-3);
                assert.closeTo(after.y, before.y, 1e-3);
            }

            assert.strictEqual(target.getNodes().length, 3, "the renderer draws the opened nodes");
            assert.isFalse(to.project.dirty);
        },
        TEST_TIMEOUT_MS,
    );
});
