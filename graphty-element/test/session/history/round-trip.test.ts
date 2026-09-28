/**
 * @file The round trip of every fixture tagged `session`, on a session with no renderer: run it,
 * undo, and every digest matches the one before; redo, and every digest matches the one after.
 */

import { assert, describe, it } from "vitest";

import { createElementSession, dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession } from "../../../src/session/types";
import { fakeLayout, heldScheduler } from "./fakes";
import { blankHarness, blankSession, fixtureSession, paintBaseline } from "./fixture-session";
import { FIXTURES } from "./fixtures";
import { pictureDigest, roundTrip } from "./round-trip-harness";

describe("round trip per command", () => {
    for (const fixture of FIXTURES.filter((each) => each.tags.includes("session"))) {
        it(fixture.name, async () => {
            const session = await fixtureSession();
            // An undo that puts rows back mid-graph leaves them to be rebuilt at the next read,
            // and a session with no renderer does not read the graph to repaint until then; a data
            // command's picture is read after a repaint of the settled graph. Every other op is
            // read as its own pass painted it.
            const settle = fixture.command.op.startsWith("data.") ? () => paintBaseline(session) : undefined;
            await roundTrip(session, fixture, undefined, settle);
            session.dispose();
        });
    }

    it("digests a session the same way twice when nothing changed", () => {
        const session = createElementSession();

        assert.strictEqual(pictureDigest(session), pictureDigest(session));
        assert.strictEqual(stateDigest(dispatcherOf(session).state), stateDigest(dispatcherOf(session).state));
        session.dispose();
    });

    it("filter across a data step: set a filter, remove nodes, undo both, and the masks equal a fresh evaluation of the original filter on the original graph", async () => {
        const shown = (session: GraphSession): string =>
            JSON.stringify([
                [...session.visibility.nodes].map(String).sort(),
                [...session.visibility.edges].map(String).sort(),
            ]);
        const filter = { kind: "degree", min: 1, max: 1 } as const;
        const fresh = await fixtureSession();
        const unfiltered = shown(fresh);
        await fresh.visibility.set(filter);
        const filtered = shown(fresh);
        fresh.dispose();

        const session = await fixtureSession();
        await session.visibility.set(filter);
        await session.data.removeNodes(["n1"]);
        assert.notStrictEqual(shown(session), filtered, "the removal changed what the filter shows");

        await session.undo();
        assert.strictEqual(shown(session), filtered, "undoing the removal: the filter over the original graph");
        await session.undo();
        assert.strictEqual(shown(session), unfiltered, "undoing the filter too: everything shows");
        session.dispose();
    });
});

describe("what the random sequences found, each pinned on its own", () => {
    /**
     * Every node's coordinates, by id.
     * @param session - The session.
     * @returns The coordinates as `x,y,z`.
     */
    function lane(session: GraphSession): Record<string, string> {
        const snapshot = session.snapshot();
        const at = { x: 0, y: 0, z: 0 };
        const out: Record<string, string> = {};
        for (let row = 0; row < snapshot.nodeCount; row++) {
            session.positions.read(row, at);
            out[String(snapshot.ids.idOf(row))] = `${String(at.x)},${String(at.y)},${String(at.z)}`;
        }

        return out;
    }

    const UNPLACED = "NaN,NaN,NaN";

    it("a baseline whose rows came from setup writes is where undoing everything puts them", async () => {
        const session = blankSession({ baselineWindow: true });
        await dispatcherOf(session).dispatch({
            op: "batch",
            setup: true,
            steps: [{ op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "a" }, { id: "b" }] } }],
        } as unknown as { op: string });
        assert.lengthOf(session.history.steps, 0, "the setup rows are the baseline");

        await session.positions.set([
            { id: "a", x: 1, y: 2, z: 3 },
            { id: "b", x: 4, y: 5, z: 6 },
        ]);
        await session.history.restoreTo(null);

        assert.deepEqual(lane(session), { a: UNPLACED, b: UNPLACED });
        session.dispose();
    });

    it("an edge's missing endpoint, left behind when the edge goes, is in the arrangement history.clear takes", async () => {
        const session = blankSession();
        await session.data.addEdges([{ src: "a", dst: "b" }]);
        await session.data.removeNodes(["a"]);
        session.history.clear();

        await session.positions.set([{ id: "b", x: 1, y: 2, z: 3 }]);
        await session.history.restoreTo(null);

        assert.deepEqual(lane(session), { b: UNPLACED });
        session.dispose();
    });

    it("undoing a placement that sealed a capture puts a row no earlier capture held back to unplaced", async () => {
        const session = await fixtureSession();
        await session.data.clear();
        await session.data.addEdges([{ src: "n4", dst: "n1" }]);
        // One row of two: more than a third, so the step keeps an after-capture, not a row patch.
        await session.positions.set([{ id: "n4", x: 0, y: 0, z: 0 }]);

        await session.undo();

        assert.deepEqual(lane(session), { n4: UNPLACED, n1: UNPLACED });
        session.dispose();
    });

    it("an import undone past and redone gives its edges back the load provenance they had", async () => {
        const session = blankSession({ baselineWindow: true });
        const digest = (): string => stateDigest(dispatcherOf(session).state, { snapshot: session.snapshot() });
        const data = JSON.stringify({
            nodes: [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
            edges: [
                { src: "n1", dst: "n2" },
                { src: "n2", dst: "n3" },
            ],
        });
        await session.data.import({ type: "json", config: { data } });
        const loaded = digest();
        await session.data.removeEdges(["0"]);
        // Read, so the last freeze is a graph without the edge: undoing both steps in one go
        // then finds it only in the removal's recorded row, put back by the same restore.
        session.snapshot();

        await session.history.restoreTo(null);
        await session.redo();

        assert.strictEqual(digest(), loaded, "the edge columns graphty.edgeHash, edgeOrdinal and edgeAmong");
        session.dispose();
    });

    it("the capture a history move seals cannot evict the step it moves to", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        for (const color of ["#111111", "#222222", "#333333"]) {
            await session.styles.add({
                name: color,
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": color },
            });
        }

        const [first] = session.history.steps;
        layout.play();
        layout.step();
        // Room for the steps, not for the capture the restore seals into the top one.
        session.history.limitBytes = session.history.bytes + 8;

        const outcome = await session.history.restoreTo(first.id);

        assert.strictEqual(outcome.kind, "restored");
        assert.strictEqual(session.history.steps[session.history.position - 1]?.id, first.id, "it landed on the step");
        assert.isAtMost(session.history.bytes, session.history.limitBytes, "and evicted after landing");
        session.dispose();
    });

    it("undoing a removal made while the layout was moving puts the node back where the step below came to rest", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const baseline = lane(session);
        layout.play();
        layout.step();
        await session.data.removeNodes(["n2"]);
        await session.styles.add({
            name: "After",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });

        // The layout's frame is sealed into the style step, which this undoes.
        await session.undo();
        await session.history.restoreTo(null);

        assert.deepEqual(lane(session), baseline);
        session.dispose();
    });

    it("undoing a placement, after undoing a step that began from its own arrangement, puts the nodes back where that undo left them", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        await session.execute({
            op: "batch",
            steps: [{ op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n8" }] } }],
        });
        await session.undo();
        // A frame while at the baseline, sealed into it by the redo.
        layout.play();
        layout.step();
        await session.redo();
        await session.undo();
        const before = lane(session);
        // Every node, so the step keeps a capture and its undo restores the position below.
        await session.positions.set(Object.keys(before).map((id, at) => ({ id, x: at, y: at, z: at })));

        await session.undo();

        assert.deepEqual(lane(session), before, "not the frame the redo sealed before the undo");
        session.dispose();
    });

    it("undoing adds and removals from the middle of the rows in one move rebuilds the graph once, at the next read", async () => {
        const { session, store } = blankHarness();
        await session.data.addNodes(Array.from({ length: 12 }, (_, at) => ({ id: `v${String(at)}` })));
        session.history.clear();
        const order = session.snapshot().ids.toArray();
        for (let at = 0; at < 4; at++) {
            await session.data.removeNodes([`v${String(2 + 2 * at)}`]);
            await session.data.addNodes([{ id: `new${String(at)}` }]);
        }

        const rebuilds = store.rebuildCount;
        await session.history.restoreTo(null);
        assert.strictEqual(store.rebuildCount, rebuilds, "nothing rebuilt before the graph was read");
        assert.deepEqual(session.snapshot().ids.toArray(), order);
        assert.strictEqual(store.rebuildCount, rebuilds + 1, "one rebuild for the whole move");
        session.dispose();
    });

    it("an add still waiting for its turn on the queue is pending work, and undo cancels it", async () => {
        const queue = heldScheduler();
        const session = await fixtureSession({ scheduler: queue });
        const { value, turns } = queue.holding(() => session.data.addNodes([{ id: "late" }]));
        value.catch(() => undefined);
        assert.lengthOf(session.history.pending, 1, "the add waits for its turn");

        const outcome = await session.undo();
        assert.strictEqual(outcome.kind, "cancelled");
        for (const turn of turns) {
            await turn.release();
        }

        assert.isTrue(
            await value.then(
                () => false,
                () => true,
            ),
            "the add was cancelled",
        );
        assert.notInclude(session.snapshot().ids.toArray(), "late");
        assert.lengthOf(session.history.steps, 0, "and recorded nothing");
        session.dispose();
    });
});
