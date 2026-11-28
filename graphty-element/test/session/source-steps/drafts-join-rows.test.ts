/**
 * @file The two tables of a join: the facts of each side's fields and the rows lined up by a match,
 * with each column read once per draft state.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession } from "../../../src/session";
import { normalize } from "../../../src/session/sources/steps/build";
import type { SourceDraft, SourceJoinMatch, SourceJoinRowsOptions } from "../../../src/session/types";
import { assertScalesLinearly } from "../../helpers/cost";

vi.mock("../../../src/session/sources/steps/build", async (original) => {
    const real = await original<typeof import("../../../src/session/sources/steps/build")>();
    return { ...real, normalize: vi.fn(real.normalize) };
});

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

/**
 * People in the graph and entries staged.
 * @returns The draft and both keys.
 */
async function opened(): Promise<{ draft: SourceDraft; people: string; entries: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(csv("people.csv", "badge,name", "B1,Ann", "B2,Bo", "B3,Cy"), {
        key: "badge",
        type: "person",
    });
    const entries = await session.data.stage(
        csv("entries.csv", "entry,badge", "e1,B1", "e2,B9", "e3,B1", "e4,", "e5,b2"),
        { key: "entry" },
    );
    return { draft: session.data.draft(), people: session.data.sources()[0].key, entries };
}

/**
 * The lines of a page: each side's id, and the side whose row repeats.
 * @param draft - The draft.
 * @param options - The page.
 * @returns The lines.
 */
function lines(draft: SourceDraft, options: SourceJoinRowsOptions): string[] {
    return draft
        .joinRows(options)
        .rows.map(({ a, b, repeat }) =>
            [a?.badge ?? a?.entry, b?.entry ?? b?.badge, repeat].map((v) => String(v ?? "-")).join(" "),
        );
}

describe("source-steps drafts: a join's rows", () => {
    it("are beside each other as read, with nothing matched", async () => {
        const { draft, people, entries } = await opened();
        const page = draft.joinRows({ a: { source: people }, b: { source: entries }, offset: 2, limit: 2 });
        assert.strictEqual(page.total, 5);
        assert.deepStrictEqual(
            page.rows.map(({ a, b }) => [a?.name, b?.entry]),
            [
                ["Cy", "e3"],
                [undefined, "e4"],
            ],
        );
        assert.isNull(page.counts);
        assert.isNull(page.rowsOf);
        assert.strictEqual(draft.joinRows({ a: { source: people } }).total, 3, "one side alone");
    });

    it("are lined up by a match: each value as many lines as its longer side, then each side's rest", async () => {
        const { draft, people, entries } = await opened();
        const match = { a: { source: people, field: "badge" }, b: { source: entries, field: "badge" } };
        const options = { a: { source: people }, b: { source: entries }, match };
        assert.deepStrictEqual(lines(draft, options), [
            "B1 e1 -",
            "B1 e3 a",
            "B2 - -",
            "B3 - -",
            "- e2 -",
            "- e4 -",
            "- e5 -",
        ]);
        assert.deepStrictEqual(lines(draft, { ...options, only: "matched" }), ["B1 e1 -", "B1 e3 a"]);
        assert.deepStrictEqual(lines(draft, { ...options, only: "a" }), ["B2 - -", "B3 - -"]);
        assert.deepStrictEqual(lines(draft, { ...options, only: "b", offset: 1, limit: 1 }), ["- e4 -"]);
        assert.deepStrictEqual(lines(draft, { ...options, only: "matched", ignoreCase: true }), [
            "B1 e1 -",
            "B1 e3 a",
            "B2 e5 -",
        ]);
        const { counts, rowsOf } = draft.joinRows(options);
        assert.strictEqual(rowsOf, "b", "the rows are the entries");
        assert.deepInclude(counts, { rows: 5, matchedRows: 2, emptyRows: 1, moreRowsWithIgnoreCase: 1 });
        const turned = draft.joinRows({ a: options.b, b: options.a, match: { a: match.b, b: match.a } });
        assert.strictEqual(turned.rowsOf, "a", "whichever side is first");
        assert.deepStrictEqual(turned.counts, counts);
    });

    it("read a step as it found its sides", async () => {
        const { draft, people, entries } = await opened();
        const match = { a: { source: entries, field: "badge" }, b: { source: people, field: "badge" } };
        draft.merge({ from: match.a, into: { source: people } });
        const step = draft.steps().length - 1;
        const now = draft.sideFields({ source: people }).map((field) => field.name);
        const then = draft.sideFields({ source: people }, { before: step }).map((field) => field.name);
        assert.include(now, "entry", "the merge brought it");
        assert.notInclude(then, "entry");
        const options = { a: { source: entries }, b: { source: people }, match, before: step };
        assert.strictEqual(draft.joinRows(options).rowsOf, "a");
        assert.strictEqual(draft.joinRows(options).counts?.matchedRows, 2);
    });

    it("list a file's columns in the file's own order, and its rows hold them so (#10206)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "zid,name,dept,age", "Z1,Ann,Ops,3", "Z2,Bo,Lab,4"), {
            key: "zid",
            type: "person",
        });
        const entries = await session.data.stage(csv("entries.csv", "zentry,zid,door,amount", "e1,Z1,D,1"), {
            key: "zentry",
        });
        const draft = session.data.draft();
        const people = { source: session.data.sources()[0].key };
        const names = (side: Parameters<SourceDraft["sideFields"]>[0]): string[] =>
            draft.sideFields(side).map((field) => field.name);
        assert.deepStrictEqual(names(people), ["zid", "name", "dept", "age"]);
        assert.deepStrictEqual(names({ source: entries }), ["zentry", "zid", "door", "amount"]);
        assert.deepStrictEqual(names({ space: "person" }), ["zid", "name", "dept", "age"]);
        const row = draft.joinRows({ a: { source: entries }, limit: 1 }).rows[0]?.a;
        assert.deepStrictEqual(Object.keys(row ?? {}), ["zentry", "zid", "door", "amount"]);
    });

    it("of a field with itself are one table's rows beside themselves", async () => {
        const { draft, entries } = await opened();
        const side = { source: entries };
        const match = { a: { source: entries, field: "badge" }, b: { source: entries, field: "badge" } };
        assert.strictEqual(draft.joinRows({ a: side, b: side, match, only: "a" }).total, 1, "the empty one");
    });

    it("of a space are its nodes, by their key and columns", async () => {
        const { draft, people, entries } = await opened();
        draft.connect({ from: { source: entries, field: "badge" }, into: { source: people } });
        const fields = draft.sideFields({ space: "person" });
        assert.deepStrictEqual(
            fields.map(({ name, key, from }) => [name, key, from]),
            [
                ["badge", true, null],
                ["name", false, people],
            ],
        );
        assert.deepStrictEqual(draft.joinRows({ a: { space: "person" }, limit: 1 }).rows[0]?.a, {
            badge: "B1",
            name: "Ann",
        });
    });
});

describe("source-steps drafts: the fields of a side", () => {
    it("say what their values are", async () => {
        const { draft, entries } = await opened();
        const badge = draft.sideFields({ source: entries }).find((field) => field.name === "badge");
        assert.deepInclude(badge, { kind: "text", rows: 5, empty: 1, distinct: 3, key: false, from: null });
        assert.deepStrictEqual(badge?.repeated, { keys: 1, rows: 2 });
        const entry = draft.sideFields({ source: entries }).find((field) => field.name === "entry");
        assert.deepInclude(entry, { key: true, distinct: 5 });
    });

    it("count a list's values apart, each node's once", async () => {
        const { draft, people, entries } = await opened();
        draft.merge({
            from: { source: entries, field: "badge" },
            into: { source: people },
            aggregate: { "*": "list" },
            unmatchedFrom: "drop",
        });
        const entry = draft.sideFields({ source: people }).find((field) => field.name === "entry");
        assert.deepInclude(entry, { from: entries, distinct: 2, empty: 2 });
        const match: SourceJoinMatch = {
            a: { source: people, field: "entry" },
            b: { source: entries, field: "entry" },
        };
        const page = draft.joinRows({ a: { source: people }, b: { source: entries }, match, only: "matched" });
        assert.deepStrictEqual(page.rows[0]?.a?.entry, ["e1", "e3"]);
        assert.deepStrictEqual(
            page.rows.map((row) => row.b?.entry),
            ["e1", "e3"],
        );
    });
});

describe("source-steps drafts: what a join's tables cost", () => {
    /**
     * How many cells were compared since the last time.
     * @param work - The reads.
     * @returns How many.
     */
    const compared = (work: () => void): number => {
        vi.mocked(normalize).mockClear();
        work();
        return vi.mocked(normalize).mock.calls.length;
    };

    it("a page of 20,000 rows reads each cell of its columns a fixed number of times, and the next page none", async () => {
        const many = (n: number): string[] => Array.from({ length: n }, (_, i) => String(i));
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession({ features: ["source-steps"] });
                // four values hold every row on both sides: a pair of each would be size * size / 4 lines
                const a = await session.data.stage(
                    csv("a.csv", "id,g", ...many(size).map((i) => `a${i},g${String(Number(i) % 4)}`)),
                    { key: "id" },
                );
                const b = await session.data.stage(
                    csv("b.csv", "id,g", ...many(size).map((i) => `b${i},g${String(Number(i) % 4)}`)),
                    { key: "id" },
                );
                const draft = session.data.draft();
                const match = { a: { source: a, field: "g" }, b: { source: b, field: "g" } };
                const options = { a: { source: a }, b: { source: b }, match, limit: 200 };
                let total = 0;
                const first = compared(() => {
                    ({ total } = draft.joinRows(options));
                });
                assert.strictEqual(total, size, "as many lines as rows, never their pairs");
                assert.strictEqual(
                    compared(() => draft.joinRows({ ...options, offset: 200 })),
                    0,
                    "the next page",
                );
                compared(() => draft.joinOutcomes({ matches: [match] }));
                assert.strictEqual(
                    compared(() => draft.joinOutcomes({ matches: [match] })),
                    0,
                    "nor asking again",
                );
                compared(() => draft.sideFields({ source: a }));
                assert.strictEqual(
                    compared(() => draft.sideFields({ source: a })),
                    0,
                );
                session.dispose();
                return first;
            },
            { sizes: [5_000, 20_000], counter: "cells compared for the first page" },
        );
    });
});
