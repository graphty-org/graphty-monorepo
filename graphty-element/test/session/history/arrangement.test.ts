/**
 * @file Where the nodes are, under undo and redo, on a session with a fake layout.
 *
 * Coordinates are recorded at rest: a rest point seals the lane into the top step, a history call
 * seals it before the cursor moves, and `positions.set` records the rows it wrote. Undo restores
 * the arrangement below a step and redo the arrangement after it, without running the layout.
 * See design/undo/undo-design.md sections 6.2 and 6.4.
 */

import { assert, describe, it } from "vitest";

import type { FormatDescriptor } from "../../../src/catalog/types";
import type { AdHocData } from "../../../src/config";
import { type BaseDataSourceConfig, DataSource, type DataSourceChunk } from "../../../src/data/DataSource";
import { GraphtyError } from "../../../src/errors/GraphtyError";
import { dispatcherOf, laneOf } from "../../../src/session/GraphSession";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";
import { fakeLayout } from "./fakes";
import { fixtureSession } from "./fixture-session";

/**
 * Every node's coordinates, by id.
 * @param session - The session.
 * @returns `id: x,y,z` for every row, in id order.
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

/**
 * A layer painting every node red: a step that moves nothing.
 * @param session - The session.
 * @param name - The layer's name.
 * @returns Settles once it is recorded.
 */
async function styleEdit(session: GraphSession, name = "Red"): Promise<void> {
    await session.styles.add({
        name,
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#ff0000" },
    });
}

/**
 * A data source that writes its first chunk, then waits for the test to let the second through:
 * a load a layout can move the lane in the middle of.
 */
class GatedSource extends DataSource {
    static type = "gated-arrangement-test";
    static descriptor: FormatDescriptor = {
        id: GatedSource.type,
        plainName: "Gated test load",
        extensions: [".gated-arrangement"],
        mimeTypes: ["application/x-gated-arrangement"],
        canImport: true,
        canExport: false,
        options: [],
    };
    /** Resolves once the first chunk has been written. */
    static reached: Promise<void>;
    /** Lets the second chunk through. */
    static open: () => void;
    private static arrive: () => void;
    private static gate: Promise<void>;

    constructor(private readonly config: BaseDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
    }

    /** Arm the gate for the next load. */
    static arm(): void {
        GatedSource.reached = new Promise((resolve) => {
            GatedSource.arrive = resolve;
        });
        GatedSource.gate = new Promise((resolve) => {
            GatedSource.open = resolve;
        });
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk> {
        yield { nodes: records({ id: "n1" }, { id: "g1" }), edges: [] };
        GatedSource.arrive();
        await GatedSource.gate;
        yield { nodes: records({ id: "g2" }), edges: records({ src: "n1", dst: "g2" }) };
    }
}

DataSource.register(GatedSource);

/**
 * Records as a data source yields them: parsed objects, not yet validated.
 * @param each - The records.
 * @returns They, typed as a chunk carries them.
 */
function records(...each: object[]): AdHocData[] {
    return each as AdHocData[];
}

/**
 * A load through the gated source, its first chunk written when this resolves.
 * @param session - The session.
 * @param mode - Replace the graph or add to it.
 * @returns The load, still waiting on its second chunk.
 */
async function halfLoaded(session: GraphSession, mode: "replace" | "merge"): Promise<{ done: Promise<unknown> }> {
    GatedSource.arm();
    const done = session.data.import({ type: GatedSource.type, config: {} }, { mode }).then(
        () => "loaded",
        (error: unknown) => error,
    );
    await GatedSource.reached;
    return { done };
}

describe("the arrangement under undo and redo", () => {
    it("seals where the layout came to rest into the top step, and undo and redo restore it without running the layout", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        layout.settle();
        const settled = lane(session);

        await session.data.addNodes([{ id: "n4" }]);
        layout.play();
        layout.step();
        layout.step();
        layout.settle();
        const after = lane(session);
        const { loads } = layout;

        await session.undo();
        assert.deepEqual(lane(session), settled, "the arrangement before the add, n4 gone");
        assert.isFalse(layout.running, "and the layout is left at rest");
        assert.isAbove(layout.loads, loads, "having taken the restored arrangement as its own");

        await session.redo();
        assert.deepEqual(lane(session), after, "the arrangement the add came to rest at");
        session.dispose();
    });

    it("never files a layout's movement under a step that moved nothing", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        await styleEdit(session);
        layout.play();
        layout.step();
        const moving = lane(session);

        await session.undo();
        assert.deepEqual(lane(session), moving, "undoing the style edit leaves the nodes where the layout had them");
        await session.redo();
        assert.deepEqual(lane(session), moving, "and so does redoing it");
        session.dispose();
    });

    it("files where the layout settles after an add under the add, not under a later setting", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const start = lane(session);
        await session.data.addNodes([{ id: "n4" }]);
        layout.play();
        layout.step();
        await styleEdit(session);
        layout.step();
        layout.settle();
        const rest = lane(session);

        await session.undo();
        assert.deepEqual(lane(session), rest, "undoing the style edit moves nothing");
        await session.undo();
        const { n4: _gone, ...before } = rest;
        assert.deepEqual(
            lane(session),
            Object.fromEntries(Object.keys(before).map((id) => [id, start[id]])),
            "undoing the add goes back to before it",
        );
        await session.redo();
        assert.deepEqual(lane(session), rest, "redoing the add returns to where it settled");
        session.dispose();
    });

    it("seals a write straight into the lane, as a GPU readback makes one, at the next rest point", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const { state } = dispatcherOf(session);
        await styleEdit(session);
        const before = state.arrangement;

        layout.play();
        assert.isTrue(layout.readback()(), "the readback landed");
        layout.settle();

        const sealed = state.arrangement;
        assert.notStrictEqual(sealed, before, "the rest point took a capture");
        assert.deepEqual(
            [...(sealed?.coords ?? [])],
            [...laneOf(session).view(3)],
            "of the lane as the readback left it",
        );
        const landed = lane(session);
        await session.undo();
        await session.redo();
        assert.deepEqual(lane(session), landed, "and redo restores it");
        session.dispose();
    });

    it("drops a readback submitted before an undo when it lands after it", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        await styleEdit(session);
        layout.play();
        const land = layout.readback();

        await session.undo();
        const restored = lane(session);
        assert.isFalse(land(), "the late readback is dropped");
        assert.deepEqual(lane(session), restored, "and the restored arrangement stands");
        session.dispose();
    });

    it("restores the arrangement below a placement as it was sealed last, not the coordinates the rows were written over", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        await styleEdit(session);
        await session.positions.set([{ id: "n1", x: 10, y: 10, z: 10 }]);

        await session.undo();
        layout.play();
        layout.step();
        layout.settle();
        const below = lane(session);

        await session.redo();
        assert.deepEqual(lane(session), { ...below, n1: "10,10,10" }, "the placement over the arrangement below it");
        await session.undo();
        assert.deepEqual(lane(session), below, "and undone, the arrangement below as it now is");
        session.dispose();
    });

    it("takes at most one capture per layout frame from a script placing one node at a time", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const { arrangement } = dispatcherOf(session);
        const capture = arrangement.capture.bind(arrangement);
        let captures = 0;
        arrangement.capture = () => {
            captures++;
            return capture();
        };

        layout.play();
        const frames = 4;
        let start: Record<string, string> = {};
        for (let frame = 0; frame < frames; frame++) {
            layout.step();
            if (frame === 0) {
                start = lane(session);
            }

            for (const id of ["n1", "n2", "n3"]) {
                await session.positions.set([{ id, x: frame, y: 1, z: 2 }]);
            }
        }

        assert.isAtMost(captures, frames, "one capture per frame the layout moved the lane");
        // Placing a different node is a different gesture, so each call is a step of its own.
        const steps = session.history.steps.length;
        assert.strictEqual(steps, frames * 3, "one step per placement");
        const end = lane(session);
        for (let step = 0; step < steps; step++) {
            await session.undo();
        }
        assert.deepEqual(lane(session), start, "undone, where the script started");
        for (let step = 0; step < steps; step++) {
            await session.redo();
        }
        assert.deepEqual(lane(session), end, "redone, where it finished");
        session.dispose();
    });

    it("pins a removed node again when its removal is undone, through the pins slice, and the lane agrees", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const pinnedRow = (id: string): boolean => session.positions.isPinned(session.snapshot().ids.indexOf(id));

        await session.positions.pin(["n2"]);
        assert.isTrue(session.positions.pinned.has("n2"));
        assert.isTrue(pinnedRow("n2"), "the lane's pin byte is written");

        await session.data.removeNodes(["n2"]);
        assert.isFalse(session.positions.pinned.has("n2"), "the pin went with the node");

        await session.undo();
        assert.isTrue(session.positions.pinned.has("n2"), "the pins slice has it again");
        assert.isTrue(pinnedRow("n2"), "and the lane agrees");
        assert.deepEqual(layout.pins.at(-1), ["n2", true], "and the layout was told");

        await session.undo();
        assert.isFalse(session.positions.pinned.has("n2"), "undoing the pin releases it");
        assert.isFalse(pinnedRow("n2"));
        session.dispose();
    });

    it("a pinned node does not move under the layout", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        await session.positions.pin(["n1"]);
        const pinned = lane(session).n1;

        layout.step();
        assert.strictEqual(lane(session).n1, pinned);
        session.dispose();
    });

    it("pins and releases a numeric node named by the string an id read from a URL is", async () => {
        const session = await fixtureSession();
        await session.data.addNodes([{ id: 34 }]);

        await session.positions.pin(["34"]);
        assert.isTrue(session.positions.pinned.has(34), "the node the graph holds is pinned, under its own id");
        assert.isFalse(session.positions.pinned.has("34"));

        await session.positions.unpin(["34"]);
        assert.isFalse(session.positions.pinned.has(34));
        session.dispose();
    });

    it("refuses ids the graph does not hold, names them, and pins none of the others", async () => {
        const session = await fixtureSession();
        const before = session.history.steps.length;

        const error: unknown = await session.positions.pin(["n1", "nope", 99]).then(
            () => assert.fail("pin should have rejected"),
            (rejection: unknown) => rejection,
        );

        assert.instanceOf(error, GraphtyError);
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.deepEqual(error.details, { ids: ["nope", 99] });
        assert.isFalse(session.positions.pinned.has("n1"), "nothing is pinned when one id misses");
        assert.strictEqual(session.history.steps.length, before, "and no step is recorded");

        const release: unknown = await session.positions.unpin(["nope"]).catch((rejection: unknown) => rejection);
        assert.instanceOf(release, GraphtyError);
        assert.strictEqual(release.code, "E_BAD_COMMAND");
        session.dispose();
    });

    it("removed rows keep their seeds, and a removed node the layout had moved comes back where it was", async () => {
        const harness = makeSession();
        const { session, store } = harness;
        await session.data.addNodes([
            { id: "a", position: { x: 1, y: 2, z: 3 } },
            { id: "b", position: { x: 4, y: 5, z: 6 } },
            { id: "c", position: { x: 7, y: 8, z: 9 } },
        ]);
        session.history.clear();
        const layout = fakeLayout(session);
        const at = { x: 0, y: 0, z: 0 };
        const coordsOf = (id: string): typeof at => {
            store.positions.read(session.snapshot().ids.indexOf(id), at);
            return { ...at };
        };

        await session.data.removeNodes(["b"]);
        await session.undo();
        assert.deepEqual(coordsOf("b"), { x: 4, y: 5, z: 6 }, "unmoved, the node is back at its seed");

        layout.play();
        layout.step();
        layout.settle();
        await session.redo();
        await session.undo();
        assert.deepEqual(coordsOf("b"), { x: 5, y: 6, z: 7 }, "moved, it is back where the layout left it");
        session.dispose();
    });

    it("keeps a capture instead of a row patch for a placement over more than a third of the rows", async () => {
        const session = await fixtureSession();
        fakeLayout(session);
        await session.positions.set([{ id: "n1", x: 1, y: 1, z: 1 }]);
        const small = session.history.steps[0].bytes;
        session.history.clear();

        await session.positions.set([
            { id: "n1", x: 2, y: 2, z: 2 },
            { id: "n2", x: 3, y: 3, z: 3 },
        ]);
        const large = session.history.steps[0].bytes;
        assert.isAbove(large, small, "the step holds a capture of every row");
        assert.deepEqual(
            [...(dispatcherOf(session).state.arrangement?.coords.subarray(0, 6) ?? [])],
            [2, 2, 2, 3, 3, 3],
        );
        session.dispose();
    });

    it("never restores one dataset's coordinates onto another that reuses its ids", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const dataset = JSON.stringify({ nodes: [{ id: "1" }, { id: "2" }, { id: "3" }], edges: [] });
        await session.data.import({ type: "json", config: { data: dataset } });
        layout.play();
        layout.step();
        layout.step();
        layout.settle();
        const settledA = lane(session);

        await session.data.import({ type: "json", config: { data: dataset } });
        const seededB = lane(session);
        layout.play();
        layout.step();
        const moving = lane(session);
        await styleEdit(session);

        await session.undo();
        const restored = lane(session);
        assert.notDeepEqual(moving, seededB, "the layout moved the second dataset");
        assert.deepEqual(restored, moving, "the second dataset where its layout had it");
        for (const id of ["1", "2", "3"]) {
            assert.notStrictEqual(restored[id], settledA[id], `node ${id} did not take the first dataset's place`);
        }

        session.dispose();
    });

    it("an undo that cancels a load between its chunks puts back the arrangement from before it", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        layout.settle();
        await styleEdit(session);
        const { bytes } = session.history.steps[0];
        const before = lane(session);

        const load = await halfLoaded(session, "merge");
        layout.play();
        layout.step();
        assert.notDeepEqual(lane(session), before, "the layout moved the lane under the load");

        const outcome = await session.undo();
        assert.strictEqual(outcome.kind, "cancelled");
        assert.deepEqual(lane(session), before, "every node where it was before the load");
        assert.strictEqual(session.history.steps[0].bytes, bytes, "the step below took no capture");
        assert.isFalse(layout.running, "the rollback left the layout at rest");
        GatedSource.open();
        assert.notStrictEqual(await load.done, "loaded");
        session.dispose();
    });

    it("a layout settling between the chunks of a replacing load seals nothing below it, and undo restores the previous dataset", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        layout.settle();
        await styleEdit(session);
        const { bytes } = session.history.steps[0];
        const before = lane(session);

        const load = await halfLoaded(session, "replace");
        layout.play();
        layout.step();
        layout.settle();
        assert.strictEqual(session.history.steps[0].bytes, bytes, "the rest point went to the open load");
        GatedSource.open();
        assert.strictEqual(await load.done, "loaded");
        assert.lengthOf(session.history.steps, 2);

        await session.undo();
        assert.deepEqual(lane(session), before, "the previous dataset, where it was");
        session.dispose();
    });

    it("a layout settling while a load transaction is open is the transaction's, and undo restores where it began", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        layout.settle();
        await styleEdit(session);
        const { bytes } = session.history.steps[0];
        const before = lane(session);

        let loaded = (): void => undefined;
        const imported = new Promise<void>((resolve) => {
            loaded = resolve;
        });
        let finish = (): void => undefined;
        const held = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const document = JSON.stringify({ nodes: [{ id: "n1" }, { id: "x" }], edges: [] });
        const transaction = session.transaction("Loaded a project", async (tx) => {
            await tx.execute({ op: "data.import", source: { type: "json", config: { data: document } } });
            loaded();
            await held;
        });
        await imported;
        layout.play();
        layout.step();
        layout.settle();
        assert.strictEqual(session.history.steps[0].bytes, bytes, "the rest point went to the open transaction");
        const settled = lane(session);
        finish();
        await transaction;
        assert.lengthOf(session.history.steps, 2);

        await session.undo();
        assert.deepEqual(lane(session), before, "where things were when the transaction began");
        await session.redo();
        assert.deepEqual(lane(session), settled, "where the load came to rest inside it");
        session.dispose();
    });
});
