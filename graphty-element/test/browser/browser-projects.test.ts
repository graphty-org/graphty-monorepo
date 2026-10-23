/**
 * @file Projects kept in the browser's IndexedDB: saved from one renderer, listed, opened in
 * another with their data, styles and results, and removed; a failed write leaves the project
 * dirty; a host with no IndexedDB is refused with a code.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { browserProjects } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { Graph, operationQueueOf } from "../../src/Graph";

/** Per-test budget: a test builds up to two real Babylon scenes. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

beforeEach(async () => {
    for (const stored of await browserProjects.list()) {
        await browserProjects.remove(stored.id);
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

/**
 * A graph of three nodes in a row, with a degree run and its suggested styles.
 * @returns The graph.
 */
async function threeInARow(): Promise<Graph> {
    const graph = await emptyGraph();
    await graph.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await graph.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    const session = graph.getSession();
    await session.run({ op: "algo.run", algorithm: "degree", as: "links", applySuggestedStyles: true });
    await operationQueueOf(graph).waitForCompletion();
    await session.styles.settled();
    await session.project.rename("Three in a row");
    return graph;
}

/**
 * Replace a property of an object until the test ends.
 * @param target - The object.
 * @param key - The property.
 * @param value - The value it has meanwhile.
 */
function override(target: object, key: string, value: unknown): void {
    // The window holds some globals (indexedDB) as its own properties, so put the original back
    // rather than deleting the override.
    const original = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { value, configurable: true, writable: true });
    cleanups.push(() => {
        if (original === undefined) {
            Reflect.deleteProperty(target, key);
        } else {
            Object.defineProperty(target, key, original);
        }
    });
}

describe("browserProjects", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "saves a session, lists it, opens it again with its data, styles and results, and removes it",
        async () => {
            const from = (await threeInARow()).getSession();
            assert.isTrue(from.project.dirty);

            const stored = await browserProjects.save(from);
            assert.isFalse(from.project.dirty, "a committed write marks the project saved");
            assert.deepInclude(stored, { name: "Three in a row", nodes: 3, edges: 2 });

            const listed = await browserProjects.list();
            assert.deepStrictEqual(listed, [stored]);

            const file = await browserProjects.get(stored.id);
            assert.instanceOf(file, File);
            assert.strictEqual(file?.name, "Three in a row.graphty.json");
            assert.strictEqual(file?.type, "application/vnd.graphty+json");

            const target = await emptyGraph();
            const to = target.getSession();
            const report = await to.project.open(file);
            await operationQueueOf(target).waitForCompletion();
            await to.styles.settled();
            assert.deepStrictEqual(report.problems, []);
            assert.strictEqual(to.project.name, "Three in a row");
            assert.strictEqual(to.status.counts.nodes, 3);
            assert.strictEqual(to.status.counts.edges, 2);
            assert.deepStrictEqual(
                to.runs.list().map((run) => run.id),
                ["links"],
            );
            assert.strictEqual(to.results.get("links")?.node("n2")?.value, 2);
            assert.deepStrictEqual(to.styles.toDocument(), from.styles.toDocument());

            const again = await browserProjects.save(from, { id: stored.id });
            assert.strictEqual(again.id, stored.id);
            assert.lengthOf(await browserProjects.list(), 1, "saving with an id replaces that entry");

            await browserProjects.remove(stored.id);
            assert.deepStrictEqual(await browserProjects.list(), []);
            assert.isUndefined(await browserProjects.get(stored.id));
        },
        TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "lists the newest first",
        async () => {
            const session = (await threeInARow()).getSession();
            const first = await browserProjects.save(session);
            // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
            await new Promise((resolve) => setTimeout(resolve, 5));
            const second = await browserProjects.save(session);
            assert.deepStrictEqual(
                (await browserProjects.list()).map((stored) => stored.id),
                [second.id, first.id],
            );
        },
        TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "leaves the project dirty and rejects with a GraphtyError when the write fails",
        async () => {
            const session = (await threeInARow()).getSession();
            override(IDBObjectStore.prototype, "put", () => {
                throw new DOMException("full", "QuotaExceededError");
            });

            const error: unknown = await browserProjects.save(session).catch((caught: unknown) => caught);
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual((error as { code: string }).code, "E_TOO_LARGE");
            assert.isTrue(session.project.dirty);
            assert.deepStrictEqual(await browserProjects.list(), []);
        },
        TEST_TIMEOUT_MS,
    );

    it("refuses every storage method with E_UNSUPPORTED when there is no IndexedDB", async () => {
        override(globalThis, "indexedDB", undefined);
        const session = { project: {}, status: {} } as never;
        for (const call of [
            () => browserProjects.list(),
            () => browserProjects.save(session),
            () => browserProjects.get("x"),
            () => browserProjects.remove("x"),
        ]) {
            const error: unknown = await call().then(
                () => null,
                (caught: unknown) => caught,
            );
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual((error as { code: string }).code, "E_UNSUPPORTED");
        }

        assert.isBoolean(await browserProjects.persisted());
    });

    it("says whether storage is kept, and false when the browser cannot say", async () => {
        assert.isBoolean(await browserProjects.persisted());
        override(navigator, "storage", undefined);
        assert.isFalse(await browserProjects.persisted());
    });
});
