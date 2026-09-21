import { GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import {
    DEFAULT_CAPACITY,
    ElementPositions,
    isStorableCoordinate,
    POSITION_COMPONENTS,
} from "../../src/data/positions";

describe("ElementPositions", () => {
    it("starts unplaced and reports NaN rows", () => {
        const p = new ElementPositions(4);
        p.grow(3);
        assert.strictEqual(p.count, 3);
        assert.strictEqual(p.isPlaced(0), false);
        assert.strictEqual(p.isPlaced(2), false);
    });

    it("publishes its component count", () => {
        const p = new ElementPositions(4);
        assert.strictEqual(p.components, POSITION_COMPONENTS);
        assert.strictEqual(p.components, 3);
    });

    it("keeps the prefix when it grows, and never uses a resizable buffer", () => {
        const p = new ElementPositions(2);
        p.grow(2);
        p.write(0, 1, 2, 3);
        p.write(1, 4, 5, 6);
        p.grow(5);
        assert.strictEqual(p.capacity >= 5, true);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
        p.read(1, out);
        assert.deepStrictEqual(out, { x: 4, y: 5, z: 6 });
        assert.strictEqual(p.isPlaced(4), false);
        assert.strictEqual(p.view(5).buffer instanceof ArrayBuffer, true);
        // THE module-side half of the E_UNSUPPORTED guard: whatever this class allocates must be a
        // plain buffer. The other half -- that the format actually refuses a resizable one -- is
        // pinned in the graph-format describe block below.
        const buffer = p.view(5).buffer as ArrayBuffer & { readonly resizable?: boolean };
        assert.strictEqual(buffer.resizable, false);
    });

    it("leaves SPARE capacity unplaced across a reallocation", () => {
        // The regression this pins: a constructor that allocates without filling, or a growth branch
        // that fills NaN only from `this.array.length`, leaves rows in [rows, capacity) at ZERO.
        // isPlaced() then reports them PLACED at the origin, GraphStore.seedUnplaced skips them and
        // every importer coordinate for those nodes is silently lost.
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 1, 2, 3);
        assert.strictEqual(p.isPlaced(1), false);
        p.grow(5);
        assert.strictEqual(p.isPlaced(2), false, "row 2 lived in the spare capacity of the first array");
        assert.strictEqual(p.isPlaced(3), false, "so did row 3");
        assert.strictEqual(p.isPlaced(4), false);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
    });

    it("unplaces the abandoned tail when it shrinks, so a regrow never inherits a dead layout", () => {
        // A dataset replaced by a smaller one: the truncated rows must NOT come back placed, or the
        // new graph's node 1 silently wears the old graph's coordinates and fillUnplaced() refuses
        // to seed it.
        const p = new ElementPositions(8);
        p.grow(4);
        p.write(0, 10, 10, 10);
        p.write(1, 11, 11, 11);
        p.write(2, 12, 12, 12);
        p.write(3, 13, 13, 13);
        p.grow(2);
        p.grow(4);
        assert.strictEqual(p.isPlaced(0), true, "the surviving prefix is untouched");
        assert.strictEqual(p.isPlaced(1), true);
        assert.strictEqual(p.isPlaced(2), false, "row 2 was abandoned by the shrink");
        assert.strictEqual(p.isPlaced(3), false);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 10, y: 10, z: 10 });
        assert.strictEqual(p.fillUnplaced(2, 7, 7, 7), true, "an abandoned row is seedable again");
    });

    it("a remap cannot resurrect a truncated row", () => {
        // remapArray walks min(remap.length, data.length / components) rows -- the CAPACITY, not
        // the live count -- so the truncated tail is reachable from the remap and must be cleared
        // rather than merely left outside the contract.
        const p = new ElementPositions(8);
        p.grow(4);
        p.write(3, 99, 99, 99);
        p.grow(2);
        p.remap(new Uint32Array([0, 1, 2, 3]), 4);
        assert.strictEqual(p.isPlaced(3), false);
        const out = { x: 0, y: 0, z: 0 };
        p.read(3, out);
        assert.strictEqual(Number.isNaN(out.x), true);
    });

    it("grow(0) discards every coordinate but keeps the reserve", () => {
        const p = new ElementPositions(4);
        p.grow(3);
        p.write(0, 1, 1, 1);
        p.write(1, 2, 2, 2);
        p.grow(0);
        assert.strictEqual(p.count, 0);
        assert.strictEqual(p.capacity, 4);
        p.grow(3);
        assert.strictEqual(p.isPlaced(0), false);
        assert.strictEqual(p.isPlaced(1), false);
        assert.strictEqual(p.isPlaced(2), false);
    });

    it("view(n) is exactly 3n long", () => {
        const p = new ElementPositions(8);
        p.grow(3);
        assert.strictEqual(POSITION_COMPONENTS, 3);
        assert.strictEqual(p.view(3).length, 3 * POSITION_COMPONENTS);
    });

    it("view(n) throws rather than handing back a SHORT array", () => {
        // subarray() clamps. Without the guard a caller that forgot to grow() gets a wrong-length
        // view: E_COLUMN_LENGTH from deep inside graph-format if it is attached, and a layout that
        // places only the first `count` nodes if it is not.
        const p = new ElementPositions(2);
        p.grow(2);
        assert.throws(() => p.view(5), RangeError, /call grow\(5\) first/);
        assert.throws(() => p.view(-1), RangeError);
        assert.throws(() => p.view(1.5), RangeError);
    });

    it("view(n) is bounded by the LIVE count, not by the allocation", () => {
        // Bounded by the capacity instead, view() is the one row accessor that hands out a writable
        // window over the SPARE rows: rows every other method reports unplaced, whose NaN fill the
        // next grow() and remap() depend on, and whose contents the next growth erases anyway.
        const p = new ElementPositions(8);
        p.grow(2);
        assert.strictEqual(p.capacity, 8, "there is plenty of room, which is exactly the trap");
        assert.throws(() => p.view(3), RangeError, /only 2 exist/);
        assert.throws(() => p.view(8), RangeError);
        assert.strictEqual(p.view(2).length, 2 * POSITION_COMPONENTS);
    });

    it("reserves at least a thousand rows by default", () => {
        const p = new ElementPositions();
        assert.strictEqual(p.capacity, DEFAULT_CAPACITY);
        // a concrete floor, not just "the constant equals itself": the reserve exists so that a
        // typical dataset never reallocates, which a DEFAULT_CAPACITY of 4 would not deliver
        assert.strictEqual(p.capacity >= 1024, true);
        assert.strictEqual(p.count, 0);
        assert.strictEqual(p.view(0).length, 0);
    });

    it("rejects a capacity or a row count that is not a non-negative integer", () => {
        assert.throws(() => new ElementPositions(Number.NaN), RangeError);
        assert.throws(() => new ElementPositions(1.5), RangeError);
        assert.throws(() => new ElementPositions(-1), RangeError);
        assert.throws(() => new ElementPositions(Number.POSITIVE_INFINITY), RangeError);
        const p = new ElementPositions(4);
        assert.throws(() => p.grow(2.5), RangeError);
        assert.throws(() => p.grow(-1), RangeError);
        assert.throws(() => p.remap(new Uint32Array([0]), Number.NaN), RangeError);
        // a zero capacity still floors at one row, so the array is never zero-length
        assert.strictEqual(new ElementPositions(0).capacity, 1);
    });

    it("remap moves rows, drops INVALID_INDEX rows and leaves new rows unplaced", () => {
        const p = new ElementPositions(4);
        p.grow(3);
        p.write(0, 7, 8, 9);
        p.write(1, 1, 1, 1);
        p.write(2, 2, 2, 2);
        // node 0 removed; old 1 -> new 0; old 2 -> new 1
        const remap = new Uint32Array([INVALID_INDEX, 0, 1]);
        p.remap(remap, 2);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 1, z: 1 });
        p.read(1, out);
        assert.deepStrictEqual(out, { x: 2, y: 2, z: 2 });
        assert.strictEqual(p.count, 2);
    });

    it("remap leaves a row no old row maps to unplaced", () => {
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 1, 1, 1);
        p.write(1, 2, 2, 2);
        // old 0 -> new 1, old 1 -> new 2; new 0 has no source
        p.remap(new Uint32Array([1, 2]), 3);
        assert.strictEqual(p.isPlaced(0), false);
        assert.strictEqual(p.isPlaced(1), true);
        assert.strictEqual(p.isPlaced(2), true);
        assert.strictEqual(p.count, 3);
    });

    it("fillUnplaced writes only a NaN row and reports whether it did", () => {
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 5, 5, 5);
        assert.strictEqual(p.fillUnplaced(0, 9, 9, 9), false);
        assert.strictEqual(p.fillUnplaced(1, 9, 9, 9), true);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 5, y: 5, z: 5 });
        p.read(1, out);
        assert.deepStrictEqual(out, { x: 9, y: 9, z: 9 });
    });

    it("fillUnplaced THROWS for a row that does not exist, so a seed is never lost silently", () => {
        // false has to mean exactly one thing -- "already placed". If it also meant "there is no
        // such row yet" a caller that seeds before growing would drop the coordinate with no signal.
        const p = new ElementPositions(4);
        p.grow(2);
        assert.throws(() => p.fillUnplaced(2, 9, 9, 9), RangeError, /outside the live range/);
        assert.throws(() => p.fillUnplaced(INVALID_INDEX, 9, 9, 9), RangeError, /INVALID_INDEX/);
    });

    it("reports a row outside the live count as UNPLACED, never as placed at the origin", () => {
        // A typed array answers `undefined` past its end and Number.isNaN(undefined) is FALSE, so an
        // unbounded isPlaced() inverts out there: every out-of-range node reads back "placed", and
        // read() reports it at the origin.
        const p = new ElementPositions(4);
        p.grow(2);
        assert.strictEqual(p.isPlaced(2), false, "inside the capacity but above the live count");
        assert.strictEqual(p.isPlaced(4), false, "exactly at the capacity");
        assert.strictEqual(p.isPlaced(100), false, "far past the allocation");
        assert.strictEqual(p.isPlaced(-1), false);
        assert.strictEqual(p.isPlaced(1.5), false);
        // the zero-node store, reached with no caller mistake at all once every node is removed
        const empty = new ElementPositions(4);
        assert.strictEqual(empty.count, 0);
        assert.strictEqual(empty.isPlaced(0), false);
    });

    it("read and write throw for a row outside the live count", () => {
        const p = new ElementPositions(4);
        p.grow(2);
        const out = { x: 0, y: 0, z: 0 };
        assert.throws(() => p.read(2, out), RangeError);
        assert.throws(() => p.read(-1, out), RangeError);
        assert.throws(() => p.read(1.5, out), RangeError);
        // a typed array SWALLOWS an out-of-range store, so without the check this "succeeded"
        assert.throws(() => p.write(100, 1, 2, 3), RangeError);
        assert.throws(() => p.write(2, 1, 2, 3), RangeError, /outside the live range/);
    });

    it("write REFUSES a non-finite coordinate, so NaN keeps meaning UNPLACED", () => {
        // A force layout that divides by a zero distance emits exactly this NaN, and write() is the
        // one choke point every layout, drag and future GPU readback goes through. Let one in and a
        // PLACED node silently becomes unplaced (so an importer seed re-applies to it on the next
        // freeze), while a NaN in y or z alone leaves a row isPlaced() still calls placed.
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 1, 2, 3);
        assert.throws(() => p.write(0, Number.NaN, 2, 3), RangeError, /unstorable/);
        assert.throws(() => p.write(0, 1, Number.NaN, 3), RangeError);
        assert.throws(() => p.write(0, 1, 2, Number.NaN), RangeError);
        assert.throws(() => p.write(0, Number.POSITIVE_INFINITY, 2, 3), RangeError);
        assert.throws(() => p.write(0, 1, Number.NEGATIVE_INFINITY, 3), RangeError);
        assert.strictEqual(p.isPlaced(0), true, "the refused writes left the row exactly as it was");
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
        // fillUnplaced goes through write(), so an importer seed cannot smuggle one in either
        assert.throws(() => p.fillUnplaced(1, Number.NaN, 0, 0), RangeError, /unstorable/);
        assert.strictEqual(p.isPlaced(1), false);
    });

    it("write refuses a coordinate that is finite as a DOUBLE but overflows the f32 array", () => {
        // The guard has to be as wide as the STORAGE, not as wide as a JS number. 1e39 passes
        // Number.isFinite, is stored into the Float32Array as Infinity, and isPlaced() then reports
        // the row PLACED: the exact outcome this guard exists to prevent, reached with a value no
        // finiteness check would ever stop. GraphStore multiplies an importer seed by
        // config.data.knownFields.positionScale, which is validated as nothing more than a positive
        // number, so ordinary inputs reach here.
        const p = new ElementPositions(4);
        p.grow(2);
        assert.strictEqual(Number.isFinite(1e39), true, "the value the old guard let through");
        assert.throws(() => p.write(0, 1e39, 0, 0), RangeError, /unstorable/);
        assert.throws(() => p.write(0, 0, -1e39, 0), RangeError);
        assert.throws(() => p.write(0, 0, 0, 1e39), RangeError);
        assert.strictEqual(p.isPlaced(0), false, "the row is still unplaced, not Infinity-and-placed");
        assert.throws(() => p.fillUnplaced(1, 1e39, 0, 0), RangeError);
        assert.strictEqual(p.isPlaced(1), false);
        // The largest f32 is still a coordinate, and so is an underflow: the origin is a place.
        p.write(0, 3.4028234663852886e38, 1e-46, 0);
        assert.strictEqual(p.isPlaced(0), true);
    });

    it("reports a row whose x an OUTSIDE writer made infinite as unplaced, not as placed", () => {
        // write() and fillUnplaced() are not the only writers: view() is lent to the snapshot as a
        // `mutable: true` column, so a layout, a drag and (from E1) a GPU readback write straight
        // through the column and never reach those guards. An infinity that lands that way -- here
        // the same 1e39 write() refuses, rounded by the assignment -- must not be reported PLACED,
        // or the mesh vanishes and the scene bounds and camera framing are poisoned in silence.
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 1, 2, 3);
        const lent = p.view(2);

        lent[0] = 1e39;
        assert.strictEqual(lent[0], Number.POSITIVE_INFINITY, "the f32 store rounded it, as it does in a snapshot");
        assert.strictEqual(p.isPlaced(0), false, "so the row is unplaced, and the layout gets it back");
        assert.strictEqual(p.fillUnplaced(0, 7, 8, 9), true, "and a seed may repair it");
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 7, y: 8, z: 9 });

        // A NaN written the same way has always meant unplaced; this pins that both paths agree.
        lent[0] = Number.NaN;
        assert.strictEqual(p.isPlaced(0), false);
    });

    it("isStorableCoordinate answers for the f32 array, not for the double", () => {
        assert.strictEqual(isStorableCoordinate(0), true);
        assert.strictEqual(isStorableCoordinate(-1.5), true);
        assert.strictEqual(isStorableCoordinate(3.4028234663852886e38), true, "the largest f32");
        assert.strictEqual(isStorableCoordinate(1e-46), true, "an f32 underflow is the origin, which is a place");
        assert.strictEqual(isStorableCoordinate(Number.NaN), false);
        assert.strictEqual(isStorableCoordinate(Number.POSITIVE_INFINITY), false);
        assert.strictEqual(isStorableCoordinate(Number.NEGATIVE_INFINITY), false);
        assert.strictEqual(isStorableCoordinate(1e39), false, "finite as a double, Infinity as an f32");
        assert.strictEqual(isStorableCoordinate(-1e39), false);
    });

    it("a view taken before a reallocation is STALE, in both directions", () => {
        // The whole justification for GraphStore re-attaching the column on every freeze and for the
        // snapshot-replaced event. If growth ever became in-place, this test is what notices.
        const p = new ElementPositions(2);
        p.grow(2);
        p.write(0, 1, 1, 1);
        const stale = p.view(2);
        p.grow(5);
        assert.notStrictEqual(p.view(5).buffer, stale.buffer, "grow past the capacity replaces the array");
        p.write(0, 9, 9, 9);
        assert.strictEqual(stale[0], 1, "a write through the class is invisible to the old view");
        stale[0] = 42;
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 9, y: 9, z: 9 }, "a write through the old view is invisible to the class");
    });

    it("remap replaces the array too, so a view taken before it is equally stale", () => {
        const p = new ElementPositions(64);
        p.grow(3);
        p.write(0, 1, 1, 1);
        const stale = p.view(3);
        p.remap(new Uint32Array([0, 1, 2]), 3);
        assert.notStrictEqual(p.view(3).buffer, stale.buffer);
        // remapArray allocates exactly nodeCount rows (PLAN DECISION 3): the reserve is spent
        assert.strictEqual(p.capacity, 3);
        p.write(0, 9, 9, 9);
        assert.strictEqual(stale[0], 1);
    });
});

describe("ElementPositions against graph-format 1.0.0", () => {
    it("attaches by reference, so a write through the class is visible on the column", () => {
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const snapshot = builder.freeze({ label: "positions-test" });
        const p = new ElementPositions(4);
        p.grow(snapshot.nodeCount);
        p.write(0, 1.5, 2.5, 3.5);
        const column = snapshot.nodes.set(
            "position",
            p.view(snapshot.nodeCount),
            { dtype: "f32", components: 3, role: "position", mutable: true },
            { replaceRole: true },
        );
        if (column.dtype !== "f32") {
            throw new Error(`expected an f32 column, found ${column.dtype}`);
        }

        assert.strictEqual(column.data.buffer, p.view(snapshot.nodeCount).buffer);
        p.write(0, 9, 9, 9);
        assert.strictEqual(column.data[0], 9);
    });

    it("ORPHANS an attached column the moment it grows past its capacity", () => {
        // The hazard the next phase has to honour: the attach is by reference, so a grow() between
        // two freezes leaves the snapshot's column pointing at a dead buffer. Nothing here detects
        // it; GraphStore must re-attach on EVERY freeze, and this test is what fails if a later
        // change assumes one attach is enough.
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const snapshot = builder.freeze({ label: "positions-test" });
        const p = new ElementPositions(2);
        p.grow(snapshot.nodeCount);
        p.write(0, 1, 1, 1);
        const column = snapshot.nodes.set(
            "position",
            p.view(snapshot.nodeCount),
            { dtype: "f32", components: 3, role: "position", mutable: true },
            { replaceRole: true },
        );
        if (column.dtype !== "f32") {
            throw new Error(`expected an f32 column, found ${column.dtype}`);
        }

        p.grow(5);
        p.write(0, 42, 42, 42);
        assert.strictEqual(column.data[0], 1, "the stale column never sees the new coordinate");
        column.data[0] = 7;
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.strictEqual(out.x, 42, "and a write through the stale column reaches nobody");
    });

    it("refuses to be built over a resizable buffer (the E_UNSUPPORTED guard)", () => {
        // This pins the FORMAT's half of the contract -- that a resizable buffer really is refused,
        // which is WHY ElementPositions grows by allocate-and-copy. The module's own half (that it
        // never allocates such a buffer) is asserted in "keeps the prefix when it grows" above.
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const snapshot = builder.freeze({ label: "positions-test" });
        // lib ES2022 has no two-argument ArrayBuffer constructor; node 22 does.
        type ResizableArrayBufferCtor = new (byteLength: number, options: { maxByteLength: number }) => ArrayBuffer;
        const ResizableArrayBuffer = ArrayBuffer as unknown as ResizableArrayBufferCtor;
        const resizable = new Float32Array(new ResizableArrayBuffer(24, { maxByteLength: 48 }));
        assert.throws(
            () =>
                snapshot.nodes.set(
                    "position",
                    resizable,
                    { dtype: "f32", components: 3, role: "position", mutable: true },
                    { replaceRole: true },
                ),
            /E_UNSUPPORTED|resizable/,
        );
    });
});
