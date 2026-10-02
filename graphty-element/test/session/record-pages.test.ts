import { assert, describe, it, vi } from "vitest";

import { edgeBetween, makeSession } from "./helpers";

/*
 * `session.data.nodePage` and `edgePage`: a window onto the records, so a host drawing a table of
 * thirty rows reads thirty records rather than copying the graph.
 */
describe("reading records a page at a time", () => {
    it("pages nodes in the order they were added, with the total and the offset", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: 3 }, { id: "d" }, { id: "e" }]);

        const page = session.data.nodePage({ offset: 1, limit: 2 });

        assert.deepStrictEqual(page.records, [{ id: "b" }, { id: 3 }]);
        assert.strictEqual(page.offset, 1);
        assert.strictEqual(page.total, 5);
        assert.isString(page.revision);
        assert.isTrue(Object.isFrozen(page.records[0]));

        const last = session.data.nodePage({ offset: 4, limit: 10 });
        assert.deepStrictEqual(
            last.records.map((record) => record.id),
            ["e"],
        );
        assert.deepStrictEqual(session.data.nodePage({ offset: 9 }).records, []);
        session.dispose();
    });

    it("reads one page of a 100,000-node graph without reading the other records", () => {
        const harness = makeSession();
        const nodeCount = 100_000;
        harness.add(
            Array.from({ length: nodeCount }, (_unused, index) => ({ id: `n${String(index)}`, rank: index % 997 })),
        );
        const { session } = harness;
        const reads = vi.spyOn(harness.nodeAttributes, "get");

        const page = session.data.nodePage({ offset: 50_000, limit: 30 });

        assert.strictEqual(page.total, nodeCount);
        assert.strictEqual(page.records.length, 30);
        assert.strictEqual(page.records[0]?.id, "n50000");
        assert.strictEqual(page.records[29]?.id, "n50029");
        assert.strictEqual(reads.mock.calls.length, 30, "only the page's own records were read");

        // A sorted order reads every value once, and then each page reads only its own records.
        const sorted = session.data.nodePage({ limit: 3, sort: { key: "rank", descending: true } });
        assert.deepStrictEqual(
            sorted.records.map((record) => record.id),
            ["n996", "n1993", "n2990"],
            "equal values keep the order the nodes were added in",
        );
        reads.mockClear();
        const next = session.data.nodePage({ offset: 3, limit: 30, sort: { key: "rank", descending: true } });
        assert.strictEqual(next.revision, sorted.revision);
        assert.strictEqual(reads.mock.calls.length, 30, "the order was reused, not computed again");
        session.dispose();
    });

    it("keeps the order across edits: an update stays put, a removal closes up, an addition goes last", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
        const before = session.data.nodePage();

        await session.data.updateNodes([{ id: "b", values: { label: "Beta" } }]);
        const updated = session.data.nodePage();
        assert.deepStrictEqual(
            updated.records.map((record) => record.id),
            ["a", "b", "c", "d"],
        );
        assert.strictEqual(updated.records[1]?.label, "Beta");
        assert.notStrictEqual(updated.revision, before.revision, "an edit makes a held page stale");

        await session.data.removeNodes(["b"]);
        await session.data.addNodes([{ id: "z" }]);
        const edited = session.data.nodePage();
        assert.deepStrictEqual(
            edited.records.map((record) => record.id),
            ["a", "c", "d", "z"],
        );
        assert.notStrictEqual(edited.revision, updated.revision);

        await session.undo();
        const undone = session.data.nodePage();
        assert.deepStrictEqual(
            undone.records.map((record) => record.id),
            ["a", "c", "d"],
        );
        assert.notStrictEqual(undone.revision, edited.revision, "an undo makes a held page stale");
        assert.strictEqual(session.data.nodePage().revision, undone.revision, "a read alone moves nothing");
        session.dispose();
    });

    it("sorts numbers before text, text naturally, and puts a missing value last either way", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([
            { id: "a", v: "item 10" },
            { id: "b" },
            { id: "c", v: 5 },
            { id: "d", v: "item 9" },
            { id: "e", v: 40 },
        ]);

        const ids = (descending: boolean): unknown[] =>
            session.data.nodePage({ sort: { key: "v", descending } }).records.map((record) => record.id);

        assert.deepStrictEqual(ids(false), ["c", "e", "d", "a", "b"]);
        assert.deepStrictEqual(ids(true), ["a", "d", "e", "c", "b"]);
        assert.deepStrictEqual(
            session.data.nodePage({ sort: { key: "id", descending: true } }).records.map((record) => record.id),
            ["e", "d", "c", "b", "a"],
        );
        session.dispose();
    });

    it("sorts a bigint among the numbers and an object holding one without throwing", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([
            { id: "a", v: 10n },
            { id: "b", v: 3 },
            { id: "c", v: 2n },
            { id: "d", v: { big: 1n } },
            { id: "e", v: "text" },
        ]);

        assert.deepStrictEqual(
            session.data.nodePage({ sort: { key: "v" } }).records.map((record) => record.id),
            ["c", "b", "a", "e", "d"],
        );
        session.dispose();
    });

    it("pages a scope, and the edges at one node", async () => {
        const harness = makeSession();
        harness.add(
            [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
            [
                { src: "a", dst: "b", kind: "x" },
                { src: "c", dst: "a", kind: "y" },
                { src: "c", dst: "d", kind: "z" },
            ],
        );
        const { session } = harness;
        await session.selection.apply({ nodes: ["d", "b"] });

        const selected = session.data.nodePage({ scope: "selection" });
        assert.deepStrictEqual(
            selected.records.map((record) => record.id),
            ["b", "d"],
            "a scope's members come in graph order",
        );
        assert.strictEqual(selected.total, 2);
        assert.strictEqual(session.data.nodePage({ scope: { nodes: ["c"] } }).total, 1);

        const atA = session.data.edgePage({ touching: "a" });
        assert.deepStrictEqual(
            atA.records.map((record) => [record.source, record.target, record.kind]),
            [
                ["a", "b", "x"],
                ["c", "a", "y"],
            ],
        );
        assert.strictEqual(atA.records[0]?.id, edgeBetween(harness, "a", "b"));
        assert.strictEqual(session.data.edgePage({ touching: "nobody" }).total, 0);
        assert.strictEqual(session.data.edgePage().total, 3);
        assert.deepStrictEqual(
            session.data.edgePage({ sort: { key: "kind", descending: true }, limit: 1 }).records.map((r) => r.kind),
            ["z"],
        );
        session.dispose();
    });

    it("refuses a window that is not a whole number of zero or more", () => {
        const harness = makeSession();

        for (const options of [{ offset: -1 }, { offset: 1.5 }, { limit: -2 }, { limit: Number.NaN }]) {
            assert.throws(() => harness.session.data.nodePage(options), /whole number/);
        }

        assert.strictEqual(harness.session.data.nodePage({ limit: Infinity }).total, 0);
        harness.session.dispose();
    });
});
