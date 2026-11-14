/**
 * @file A session with no renderer runs its layout: `session.layout.play()`, `pause()`, `tick()`
 * and `settle()` move the nodes through `@graphty/layout`, `layout:motion-changed` reports the
 * run, and `session.positions` reads, pins, snapshots and restores them. Node, no Babylon.js.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { laneOf } from "../../src/session/GraphSession";
import { assertScalesLinearly } from "../helpers/cost";

/**
 * A session holding a small ring.
 * @returns The session.
 */
async function ring(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(["a", "b", "c", "d", "e"].map((id) => ({ id })));
    await session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "d" },
        { src: "d", dst: "e" },
        { src: "e", dst: "a" },
    ]);
    return session;
}

/**
 * A session holding a ring of `size` nodes.
 * @param size - How many nodes.
 * @returns The session.
 */
async function bigRing(size: number): Promise<GraphSession> {
    const session = createGraphSession();
    const ids = Array.from({ length: size }, (_, i) => `n${String(i)}`);
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges(ids.map((src, i) => ({ src, dst: ids[(i + 1) % size] })));
    return session;
}

/**
 * The rows written into a session's positions lane during some work.
 * @param session - The session.
 * @param work - The work.
 * @returns How many rows were written.
 */
async function rowsWritten(session: GraphSession, work: () => unknown): Promise<number> {
    const before = laneOf(session).changes;
    await work();
    return laneOf(session).changes - before;
}

describe("running the layout of a session with no renderer", () => {
    it("runs the force layout to rest and reports it", async () => {
        const session = await ring();
        const heard: unknown[] = [];
        session.on("layout:motion-changed", (event) => heard.push(event));
        await session.layout.set("force", { options: { seed: 1 } });
        assert.isUndefined(session.positions.get("a"), "choosing a layout only records it");
        const steps = session.history.steps.length;

        assert.isTrue(await session.layout.settle());

        const a = session.positions.get("a");
        const b = session.positions.get("b");
        assert.isDefined(a);
        assert.isDefined(b);
        assert.isTrue(Number.isFinite(a.x) && Number.isFinite(b.y));
        assert.notDeepEqual(a, b);
        assert.isAbove(session.layout.step, 0);
        assert.strictEqual(session.layout.motion, "settled");
        assert.deepStrictEqual(
            heard.map((event) => (event as { motion: string }).motion),
            ["running", "settled"],
        );
        assert.deepInclude(heard[1] as object, {
            id: "force",
            engine: "ngraph",
            kind: "live",
            step: session.layout.step,
        });
        assert.lengthOf(session.history.steps, steps, "running the layout is not a step");
        session.dispose();
    });

    it("gives the same arrangement for the same seed", async () => {
        const one = await ring();
        const two = await ring();
        for (const session of [one, two]) {
            await session.layout.set("force", { engine: "forceatlas2", options: { seed: 7 } });
            await session.layout.settle();
        }

        assert.deepStrictEqual(one.positions.snapshot().xyz, two.positions.snapshot().xyz);
        one.dispose();
        two.dispose();
    });

    it("takes steps on request and leaves the layout paused", async () => {
        const session = await ring();
        await session.layout.set("force", { engine: "forceatlas2", options: { seed: 1 } });

        session.layout.tick(3);

        assert.strictEqual(session.layout.step, 3);
        assert.strictEqual(session.layout.motion, "paused");
        assert.isDefined(session.positions.get("c"));
        assert.throws(() => session.layout.tick(0), /whole number/);
        session.dispose();
    });

    it("answers false from settle when the layout is paused first", async () => {
        const session = await ring();
        await session.layout.set("force", { engine: "forceatlas2", options: { seed: 1 } });

        const settled = session.layout.settle();
        await session.layout.pause();

        assert.isFalse(await settled);
        assert.strictEqual(session.layout.motion, "paused");
        session.dispose();
    });

    it("computes a one-shot layout at once", async () => {
        const session = await ring();
        await session.layout.set("circular");

        assert.isTrue(await session.layout.settle());

        assert.strictEqual(session.layout.step, 1);
        assert.strictEqual(session.positions.placedCount, 5);
        session.dispose();
    });

    it("refuses an engine that runs only on a renderer", async () => {
        const session = await ring();
        await session.layout.set("fixed");

        const refused = await session.layout.play().then(
            () => undefined,
            (error: unknown) => error,
        );

        assert.propertyVal(refused, "code", "E_UNSUPPORTED");
        session.dispose();
    });

    it("holds pinned nodes still", async () => {
        const session = await ring();
        await session.positions.set([{ id: "a", x: 1, y: 2, z: 3 }]);
        await session.positions.pin(["a"]);
        await session.layout.set("force", { engine: "forceatlas2", options: { seed: 1 } });

        await session.layout.settle();

        assert.deepStrictEqual(session.positions.get("a"), { x: 1, y: 2, z: 3 });
        assert.deepStrictEqual([...session.positions.pinnedMask()], [1, 0, 0, 0, 0]);
        session.dispose();
    });
});

describe("snapshotting and restoring positions", () => {
    it("puts every node back as one step", async () => {
        const session = await ring();
        await session.layout.set("force", { engine: "forceatlas2", options: { seed: 1 } });
        await session.layout.settle();
        const saved = session.positions.snapshot();
        assert.deepStrictEqual(saved.order, ["a", "b", "c", "d", "e"]);

        await session.layout.set("circular");
        await session.layout.settle();
        assert.notDeepEqual(session.positions.snapshot().xyz, saved.xyz);
        const steps = session.history.steps.length;

        await session.positions.restore(saved);

        assert.deepStrictEqual(session.positions.snapshot().xyz, saved.xyz);
        assert.lengthOf(session.history.steps, steps + 1);
        session.dispose();
    });

    it("skips unplaced nodes and refuses a short array", async () => {
        const session = await ring();
        await session.positions.restore({ order: ["a", "b"], xyz: Float32Array.of(4, 5, 6, NaN, NaN, NaN) });
        assert.deepStrictEqual(session.positions.get("a"), { x: 4, y: 5, z: 6 });
        assert.isUndefined(session.positions.get("b"));

        const refused = await session.positions.restore({ order: ["a"], xyz: Float32Array.of(1) }).then(
            () => undefined,
            (error: unknown) => error,
        );
        assert.propertyVal(refused, "code", "E_BAD_COMMAND");
        session.dispose();
    });
});

describe("the work the layout and positions verbs do", () => {
    const verbs: Record<string, (session: GraphSession) => Promise<unknown>> = {
        "SessionLayout.tick": async (session) => {
            await session.layout.set("force", { engine: "forceatlas2", options: { seed: 1 } });
            return rowsWritten(session, () => session.layout.tick(1));
        },
        "SessionLayout.settle": async (session) => {
            await session.layout.set("circular");
            return rowsWritten(session, () => session.layout.settle());
        },
        "SessionPositions.restore": async (session) => {
            await session.layout.set("circular");
            await session.layout.settle();
            const saved = session.positions.snapshot();
            const moved = new Float32Array(saved.xyz.map((v) => v + 1));
            return rowsWritten(session, () => session.positions.restore({ order: saved.order, xyz: moved }));
        },
    };
    for (const [method, measure] of Object.entries(verbs)) {
        it(`${method} writes each row a bounded number of times`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const session = await bigRing(size);
                    const rows = (await measure(session)) as number;
                    session.dispose();
                    return rows;
                },
                { sizes: [200, 800], growth: "linear", counter: `rows written by ${method}` },
            );
        });
    }
});
