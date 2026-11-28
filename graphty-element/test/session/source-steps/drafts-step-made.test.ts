/**
 * @file `preview.made`: how many elements some steps of a draft make, each counted once however many of the
 * steps reach it, so a join written as several steps (and the staged sources it adds for itself) reads as one
 * count: the one `preview.marks` gives, what the commit does to the graph the reader already has, so a card's
 * count agrees with the key: a committed join left as it is makes nothing new.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const PEOPLE = csv("people.csv", "person,badge", "P1,B1", "P2,B2", "P3,B3");
const BUILDINGS = csv("buildings.csv", "building,city", "D1,Rome", "D2,Oslo");
const ENTRIES = csv("entries.csv", "entry,badge,building", "E1,B1,D1", "E2,B2,D2", "E3,B3,D1", "E4,B9,D9");
const ACCOUNTS = csv("accounts.csv", "account,phone,device", "A1,555,d1", "A2,777,d2", "A3,888,d1", "A4,999,d9");
const WATCH = csv("watch.csv", "value,risk", "555,high", "d1,mid", "404,none", "405,none");

/**
 * The places of a draft's joins and of the staged sources they add for themselves: what a card reads.
 * @param d - The draft.
 * @returns Them.
 */
const every = (d: SourceDraft): number[] =>
    d
        .steps()
        .filter((row) => row.op !== "join.add" || row.joined === true)
        .map((row) => row.index);

/**
 * A count's new and merged nodes and edges.
 * @param marks - The counts.
 * @param marks.nodes - Its node counts.
 * @param marks.edges - Its edge counts.
 * @returns The new and merged counts.
 */
const effect = (marks: {
    readonly nodes: { readonly merged: number; readonly new: number };
    readonly edges: { readonly merged: number; readonly new: number };
}): unknown => ({
    nodes: { merged: marks.nodes.merged, new: marks.nodes.new },
    edges: { merged: marks.edges.merged, new: marks.edges.new },
});

describe("source-steps drafts: preview.made", () => {
    it("over a join's steps and the staged sources it adds, counts what the draft marks", async () => {
        const session: GraphSession = createGraphSession({ features: ["source-steps"] });
        await session.data.import(BUILDINGS, { key: "building", type: "building" });
        const people = await session.data.stage(PEOPLE, { key: "person", type: "person" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const d = session.data.draft();
        d.connect({
            from: { source: entries, field: "building" },
            into: { space: "building" },
            to: { field: "badge", into: { source: people, field: "badge" } },
        });
        const preview = d.preview();
        assert.isAbove(preview.marks.nodes.new, 0, "the people the join adds for itself");
        assert.deepStrictEqual(effect(preview.made(every(d))), effect(preview.marks));
        const connect = d.steps().at(-1)?.index ?? -1;
        assert.strictEqual(preview.made([connect]).edges.new, preview.marks.edges.new);
        assert.deepStrictEqual(
            effect(preview.made([])),
            effect({ nodes: { merged: 0, new: 0 }, edges: { merged: 0, new: 0 } }),
        );
        d.dispose();
        session.dispose();
    });

    it("over two merges under No match add, counts each new node once, the rows the first kept included", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const watch = await session.data.stage(WATCH, { key: "value" });
        const d = session.data.draft();
        for (const field of ["phone", "device"]) {
            d.merge({ from: { source: watch, field: "value" }, into: { space: "account", field }, fanOut: "each" });
        }
        const preview = d.preview();
        assert.deepStrictEqual(
            effect(preview.marks),
            effect({ nodes: { merged: 2, new: 2 }, edges: { merged: 0, new: 0 } }),
        );
        assert.deepStrictEqual(effect(preview.made(every(d))), effect(preview.marks));
        d.dispose();
        session.dispose();
    });

    it("over a committed join the draft leaves as it is, counts nothing new, as the key does", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(BUILDINGS, { key: "building", type: "building" });
        const people = await session.data.stage(PEOPLE, { key: "person", type: "person" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const first = session.data.draft();
        first.connect({
            from: { source: entries, field: "building" },
            into: { space: "building" },
            to: { field: "badge", into: { source: people, field: "badge" } },
        });
        assert.isAbove(first.preview().made(every(first)).edges.new, 0, "before its commit the join adds edges");
        await first.commit();
        const d = session.data.draft();
        const preview = d.preview();
        assert.deepStrictEqual(
            effect(preview.marks),
            effect({ nodes: { merged: 0, new: 0 }, edges: { merged: 0, new: 0 } }),
        );
        assert.deepStrictEqual(effect(preview.made(every(d))), effect(preview.marks), "the graph holds them already");
        d.dispose();
        session.dispose();
    });
    it("counts the nodes the graph holds that the steps take out, as the key does, not the rows", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("p.csv", "id,boss", "P1,", "P2,P1", "P3,"), { key: "id", type: "person" });
        const people = session.data.sources()[0].key;
        const d = session.data.draft();
        d.connect({ from: { source: people, field: "boss" }, into: { space: "person" }, unlinked: "remove" });
        const preview = d.preview();
        const step = d.steps().at(-1);
        assert.strictEqual(preview.marks.nodes.removed, 1, "P3: P1 is linked by P2's row");
        assert.isAbove((step?.buckets?.emptyKey ?? 0) + (step?.buckets?.unmatched ?? 0), 1, "more rows reach no node");
        assert.strictEqual(preview.made(every(d)).nodes.removed, 1);
        assert.strictEqual(preview.made([]).nodes.removed, 0);
        d.dispose();
        session.dispose();
    });

    it("counts the nodes a merge leaves out under unmatchedFrom drop, and none for a step that takes none", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const watch = await session.data.stage(WATCH, { key: "value" });
        const first = session.data.draft();
        first.merge({ from: { source: watch, field: "value" }, into: { space: "account", field: "phone" } });
        await first.commit();
        const d = session.data.draft();
        const keep = [...d.steps()].reverse().find((row) => row.op === "join.merge")?.index ?? -1;
        assert.strictEqual(d.preview().made([keep]).nodes.removed, 0, "kept, the rows naming no account stay");
        d.editStep(keep, { unmatchedFrom: "drop" });
        const preview = d.preview();
        assert.strictEqual(preview.marks.nodes.removed, 3, "d1, 404 and 405 name no phone");
        assert.strictEqual(preview.made([keep]).nodes.removed, preview.marks.nodes.removed);
        d.dispose();
        session.dispose();
    });
});
