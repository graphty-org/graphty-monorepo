import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

// The explicit `/index` matters: `src/session/scope.ts` still exists beside this directory and
// wins a bare `../../../src/session/scope`. It goes when the resolver behind it is retired.
import { DEFAULT_MASK_CAPACITY, ElementMask, type MaskIdSpace } from "../../../src/session/scope/index";

/** An identity space over a plain list of ids, which is what a snapshot's id map amounts to. */
function spaceOf(ids: readonly string[]): MaskIdSpace<string> {
    return {
        indexOf: (id: string) => {
            const at = ids.indexOf(id);

            return at === -1 ? INVALID_INDEX : at;
        },
        idOf: (index: number) => ids[index],
    };
}

/** A mask over a fixed list of ids, already grown to hold all of them. */
function maskOf(ids: readonly string[], capacity?: number): ElementMask<string> {
    const space = spaceOf(ids);
    const mask = new ElementMask<string>(() => space, capacity);
    mask.grow(ids.length);

    return mask;
}

/** Put a set of ids into a mask. */
function fillWith(mask: ElementMask<string>, ids: readonly string[]): ElementMask<string> {
    for (const id of ids) {
        mask.add(mask.indexOf(id));
    }

    return mask;
}

describe("ElementMask, as an allocation", () => {
    it("reserves the default capacity and holds nothing", () => {
        const mask = new ElementMask<string>(() => spaceOf([]));

        assert.strictEqual(mask.capacity, DEFAULT_MASK_CAPACITY);
        assert.strictEqual(mask.count, 0, "no rows are live until the mask is grown");
        assert.strictEqual(mask.size, 0);
    });

    it("keeps at least one row, so a zero capacity is not a mask that can never grow", () => {
        assert.strictEqual(new ElementMask<string>(() => spaceOf([]), 0).capacity, 1);
    });

    it("refuses a capacity that is not a whole number of rows", () => {
        // A fractional capacity survives every later doubling, and NaN defeats the one-row floor.
        assert.throws(() => new ElementMask<string>(() => spaceOf([]), 1.5), RangeError);
        assert.throws(() => new ElementMask<string>(() => spaceOf([]), -1), RangeError);
        assert.throws(() => new ElementMask<string>(() => spaceOf([]), Number.NaN), RangeError);
    });
});

describe("ElementMask, as a set", () => {
    it("answers membership by index and by id", () => {
        const mask = fillWith(maskOf(["a", "b", "c"]), ["a", "c"]);

        assert.isTrue(mask.has(0));
        assert.isFalse(mask.has(1));
        assert.isTrue(mask.hasId("c"));
        assert.isFalse(mask.hasId("b"));
        assert.strictEqual(mask.size, 2);
    });

    it("says a row outside the live count is not a member, rather than throwing", () => {
        const mask = fillWith(maskOf(["a", "b"]), ["a"]);

        assert.isFalse(mask.has(2), "one past the live count");
        assert.isFalse(mask.has(-1));
        assert.isFalse(mask.has(0.5));
        assert.isFalse(mask.has(INVALID_INDEX));
        assert.isFalse(mask.hasId("nobody"), "an id the graph does not hold");
    });

    it("refuses to add a row that does not exist, because the write would vanish", () => {
        const mask = maskOf(["a", "b"]);

        assert.throws(() => mask.add(2), RangeError);
        assert.throws(() => mask.add(-1), RangeError);
        assert.throws(() => mask.delete(7), RangeError);
    });

    it("names the sentinel when a caller adds the result of a failed lookup", () => {
        const mask = maskOf(["a"]);

        assert.throws(() => mask.add(INVALID_INDEX), /INVALID_INDEX/);
    });

    it("reports whether add and delete actually changed anything", () => {
        const mask = maskOf(["a", "b"]);

        assert.isTrue(mask.add(0));
        assert.isFalse(mask.add(0), "already a member");
        assert.isTrue(mask.delete(0));
        assert.isFalse(mask.delete(0), "was not a member");
    });

    it("fills, clears and inverts the live rows", () => {
        const mask = maskOf(["a", "b", "c"]);

        assert.isTrue(mask.fill());
        assert.strictEqual(mask.size, 3);
        assert.isFalse(mask.fill(), "everything was already in");

        assert.isTrue(mask.invert());
        assert.strictEqual(mask.size, 0);

        assert.isTrue(mask.invert());
        assert.deepStrictEqual([...mask.ids()], ["a", "b", "c"]);

        assert.isTrue(mask.clear());
        assert.strictEqual(mask.size, 0);
        assert.isFalse(mask.clear(), "it was already empty");
    });

    it("inverts nothing on a mask with no rows", () => {
        assert.isFalse(maskOf([]).invert());
    });
});

describe("ElementMask, as set algebra over the bytes", () => {
    const ids = ["a", "b", "c", "d"];

    it("unions, intersects, subtracts and takes the symmetric difference", () => {
        const left = fillWith(maskOf(ids), ["a", "b"]);
        const right = fillWith(maskOf(ids), ["b", "c"]);

        assert.isTrue(left.union(right));
        assert.deepStrictEqual([...left.ids()], ["a", "b", "c"]);

        assert.isTrue(left.intersect(right));
        assert.deepStrictEqual([...left.ids()], ["b", "c"]);

        assert.isTrue(left.subtract(fillWith(maskOf(ids), ["c"])));
        assert.deepStrictEqual([...left.ids()], ["b"]);

        assert.isTrue(left.symmetricDifference(right));
        assert.deepStrictEqual([...left.ids()], ["c"], "b is in both, c is in one");
    });

    it("reports when an operation changed nothing", () => {
        const left = fillWith(maskOf(ids), ["a"]);

        assert.isFalse(left.union(fillWith(maskOf(ids), ["a"])));
        assert.isFalse(left.subtract(maskOf(ids)), "subtracting the empty set");
    });

    it("reads a row the other mask does not reach as absent", () => {
        // Two masks caught mid-growth must not be a length assertion: the shorter one simply has
        // no opinion about the rows it does not hold, and a row it does not hold is not a member.
        const wide = fillWith(maskOf(ids), ["a", "b", "c", "d"]);
        const narrow = fillWith(maskOf(["a", "b"]), ["a"]);

        assert.isTrue(wide.intersect(narrow));
        assert.deepStrictEqual([...wide.ids()], ["a"]);
    });
});

describe("ElementMask, as it grows and is remapped", () => {
    it("keeps every member below the new count and leaves the new rows out", () => {
        const mask = fillWith(maskOf(["a", "b"], 2), ["a", "b"]);
        mask.grow(5);

        assert.strictEqual(mask.count, 5);
        assert.strictEqual(mask.size, 2, "growth adds rows, never members");
        assert.isTrue(mask.has(0));
        assert.isFalse(mask.has(4));
    });

    it("keeps the members when growth past the capacity replaces the backing array", () => {
        const mask = fillWith(maskOf(["a", "b"], 2), ["b"]);
        const before = mask.capacity;
        mask.grow(9);

        assert.isAbove(mask.capacity, before);
        assert.deepStrictEqual([...mask.ids()], ["b"]);
    });

    it("drops the members a truncation removed, so a later growth does not hand them back", () => {
        const mask = fillWith(maskOf(["a", "b", "c"]), ["a", "c"]);
        mask.grow(2);

        assert.strictEqual(mask.size, 1);
        assert.deepStrictEqual([...mask.ids()], ["a"]);

        mask.grow(3);
        assert.isFalse(mask.has(2), "the row came back empty, not as the member it used to be");
    });

    it("refuses a row count that is not a whole number of rows", () => {
        assert.throws(() => maskOf(["a"]).grow(2.5), RangeError);
        assert.throws(() => maskOf(["a"]).remap(new Uint32Array([0]), -1), RangeError);
    });

    it("moves a surviving member to its new index and drops a removed one", () => {
        // The freeze report's remap is old index -> new index, with INVALID_INDEX for a removal.
        const mask = fillWith(maskOf(["a", "b", "c"]), ["b", "c"]);
        mask.remap(new Uint32Array([0, INVALID_INDEX, 1]), 2);

        assert.strictEqual(mask.count, 2);
        assert.strictEqual(mask.size, 1, "b left the graph, so it left the set");
        assert.isTrue(mask.has(1), "c moved from index 2 to index 1");
    });
});

describe("ElementMask, as ids a consumer iterates", () => {
    it("hands back the same frozen array until the contents change", () => {
        const mask = fillWith(maskOf(["a", "b", "c"]), ["a", "c"]);
        const first = mask.ids();

        assert.isFrozen(first);
        assert.strictEqual(mask.ids(), first, "a read of an unchanged set costs nothing");

        mask.add(1);
        const second = mask.ids();

        assert.notStrictEqual(second, first, "the contents changed, so the array did");
        assert.deepStrictEqual([...second], ["a", "b", "c"]);
    });

    it("hands back the same array after a write that changed nothing", () => {
        const mask = fillWith(maskOf(["a", "b"]), ["a"]);
        const first = mask.ids();
        mask.add(0);

        assert.strictEqual(mask.ids(), first, "adding a member that was already in is not a change");
    });

    it("hands back the same array when a removal elsewhere renumbered the indices", () => {
        // This is the case a version counter alone gets wrong. The indices moved, so everything
        // has to be walked again -- but the ids that came out are the ids the caller already
        // holds, and handing back a new array would make `prev === next` a lie.
        let ids = ["a", "b", "c"];
        let space = spaceOf(ids);
        const mask = new ElementMask<string>(() => space, 8);
        mask.grow(3);
        fillWith(mask, ["a", "c"]);
        const first = mask.ids();

        mask.remap(new Uint32Array([0, INVALID_INDEX, 1]), 2);
        ids = ["a", "c"];
        space = spaceOf(ids);

        assert.deepStrictEqual([...mask.ids()], ["a", "c"]);
        assert.strictEqual(mask.ids(), first, "the same elements are in the set, so the same array");
    });

    it("moves the version only when the membership actually moved", () => {
        const mask = maskOf(["a", "b"]);
        const start = mask.version;

        mask.add(0);
        const after = mask.version;
        assert.notStrictEqual(after, start);

        mask.add(0);
        assert.strictEqual(mask.version, after, "adding a member twice is one change");

        mask.grow(2);
        assert.strictEqual(mask.version, after, "growing to the size it already is changes nothing");
    });
});

describe("ElementMask, as bytes for a worker", () => {
    it("hands out one byte per live row, with 1 for a member", () => {
        const mask = fillWith(maskOf(["a", "b", "c"]), ["a", "c"]);
        const bytes = mask.bytes();

        assert.strictEqual(bytes.length, 3, "the element count, not the member count");
        assert.deepStrictEqual([...bytes], [1, 0, 1]);
    });

    it("hands out a copy, so a holder cannot corrupt the model", () => {
        const mask = fillWith(maskOf(["a", "b"]), ["a"]);
        const bytes = mask.bytes();
        bytes[1] = 1;

        assert.isFalse(mask.has(1), "the mask is unmoved");
        assert.notStrictEqual(mask.bytes(), bytes, "and the next read is a fresh copy too");
    });

    describe("changedSince", () => {
        const move = (row: number): ((bytes: Uint8Array) => { entered: number[]; left: number[] }) => {
            return (bytes) => {
                bytes[row] = 1 - bytes[row];
                return bytes[row] === 1 ? { entered: [row], left: [] } : { entered: [], left: [row] };
            };
        };

        it("answers across rewrites from any version the log still holds", () => {
            const mask = maskOf(["a", "b", "c", "d"]);
            const start = mask.version;
            assert.isNull(mask.changedSince(start - 1), "no rewrite yet");
            assert.deepEqual(mask.changedSince(start), [], "nothing since now");

            mask.rewrite(move(1));
            mask.rewrite(() => ({ entered: [], left: [] }));
            mask.rewrite(move(2));
            mask.rewrite(move(1));

            assert.deepEqual(mask.changedSince(start), [1, 2, 1], "once per move, for a reader three behind");
            assert.deepEqual(mask.changedSince(start + 2), [1]);
            assert.deepEqual(mask.changedSince(mask.version), []);
            assert.isNull(mask.changedSince(start - 1), "before the log began");
            assert.isNull(mask.changedSince(mask.version + 1), "a version the mask never held");
        });

        it("is null across any other write, and starts again with the next rewrite", () => {
            const writes: readonly ((mask: ElementMask<string>) => void)[] = [
                (mask) => mask.add(3),
                (mask) => mask.fill(),
                (mask) => mask.invert(),
                (mask) => {
                    mask.load(new Uint8Array([1, 0, 1, 0]));
                },
                (mask) => {
                    mask.remap(new Uint32Array([0, 1, 2, 3]), 4);
                },
                (mask) => mask.union(fillWith(maskOf(["a", "b", "c", "d"]), ["d"])),
                (mask) => {
                    mask.grow(1);
                    mask.grow(4);
                },
            ];
            for (const write of writes) {
                const mask = fillWith(maskOf(["a", "b", "c", "d"]), ["a"]);
                const before = mask.version;
                mask.rewrite(move(1));
                write(mask);
                assert.isNull(mask.changedSince(before), String(write));

                const after = mask.version;
                mask.rewrite(move(2));
                assert.deepEqual(mask.changedSince(after), [2], String(write));
                assert.isNull(mask.changedSince(before), String(write));
            }
        });

        it("lets go of the oldest moves past the cap, and of a move over it", () => {
            const mask = maskOf(["a", "b", "c", "d"]);
            const start = mask.version;
            mask.rewrite(move(0), 2);
            mask.rewrite(move(1), 2);
            mask.rewrite(move(2), 2);

            assert.isNull(mask.changedSince(start), "the oldest went");
            assert.deepEqual(mask.changedSince(start + 1), [1, 2], "a reader keeping up still reads rows");

            const before = mask.version;
            const write = (bytes: Uint8Array): { entered: number[]; left: number[] } => {
                bytes[3] = 1;
                bytes[0] = 0;
                bytes[1] = 0;
                return { entered: [3], left: [0, 1] };
            };
            mask.rewrite(write, 2);
            assert.isNull(mask.changedSince(before), "over the cap");
            assert.deepEqual(mask.changedSince(mask.version), []);
        });

        it("answers on a read-only copy from the live mask", () => {
            const mask = maskOf(["a", "b"]);
            const start = mask.version;
            mask.rewrite(move(1));
            const copy = mask.readOnlyCopy();
            assert.deepEqual(copy.changedSince(start), [1]);
            mask.clear();
            assert.isNull(copy.changedSince(start));
        });
    });

    it("rewrites rows in one version bump, and none when nothing changed", () => {
        const mask = fillWith(maskOf(["a", "b", "c"]), ["a"]);
        const { version } = mask;
        const rows = mask.rewrite((bytes) => {
            bytes[0] = 0;
            bytes[1] = 1;
            bytes[2] = 1;
            return { entered: [1, 2], left: [0] };
        });
        assert.deepEqual(rows, { entered: [1, 2], left: [0] });
        assert.deepEqual([...mask.bytes()], [0, 1, 1]);
        assert.strictEqual(mask.size, 2);
        assert.strictEqual(mask.version, version + 1);

        mask.rewrite(() => ({ entered: [], left: [] }));
        assert.strictEqual(mask.version, version + 1, "no rows, no change");
        assert.throws(() => {
            mask.readOnlyCopy().rewrite(() => ({ entered: [], left: [] }));
        });
    });
});
