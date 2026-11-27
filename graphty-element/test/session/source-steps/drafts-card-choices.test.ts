/**
 * @file What a join card needs of a draft beside the joins themselves: new nodes at one end of a
 * Connect, the source a join added for itself going back to staged with it, and the profile of a
 * column an id space carries.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import type { SourceDraft } from "../../../src/session/types";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const PEOPLE = csv("people.csv", "badge,name", "B1,Ann", "B2,Bo", "B3,Cy");
const ENTRIES = csv("entries.csv", "entry,badge,door", "e1,B1,D1", "e2,B2,D1", "e3,B1,D2", "e4,B9,D1");

/**
 * People in the graph, entries staged, and a draft.
 * @returns the session, the entries' key and the draft.
 */
async function opened(): Promise<{ session: GraphSession; entries: string; draft: SourceDraft }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(PEOPLE, { key: "badge", type: "person" });
    const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
    return { session, entries, draft: session.data.draft() };
}

/**
 * The sources a draft adds.
 * @param draft - The draft.
 * @returns Their keys.
 */
function added(draft: SourceDraft): string[] {
    return draft.steps().flatMap((step) => (step.op === "join.add" ? [step.source] : []));
}

describe("source-steps drafts: what a join card needs", () => {
    it("makes new nodes of one end's values while the other end skips, and reads them back", async () => {
        const { session, entries, draft } = await opened();
        const options = {
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            to: { field: "door", into: { space: "door" }, unmatched: "add" as const, type: "door" },
        };
        draft.connect(options);
        const at = draft.steps().length - 1;
        assert.deepInclude(draft.steps()[at]?.buckets, { newEdges: 3, unmatched: 1 });
        assert.deepStrictEqual(draft.steps()[at]?.act?.to, options.to);
        assert.strictEqual(draft.steps()[at]?.act?.unmatched, "skip", "B9 makes no person");
        assert.deepStrictEqual(draft.preview().after.nodeTypes, { person: 3, door: 2 });
        draft.replaceStep(at, { act: "connect", options: { ...options, direction: "from-into" } });
        assert.deepStrictEqual(draft.steps()[at]?.act?.to, options.to, "the other way round");
        assert.deepStrictEqual(draft.preview().after.nodeTypes, { person: 3, door: 2 });
        await draft.commit();
        const edges = session.data.edges().map((e) => `${String(e.source)}->${String(e.target)}`);
        assert.sameMembers(edges, ["D1->B1", "D1->B2", "D2->B1"]);
        session.dispose();
    });

    it("keeps each row as a node between a person and a new door", async () => {
        const { session, entries, draft } = await opened();
        draft.connect({
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            to: { field: "door", into: { space: "door" }, keepRow: true, unmatched: "add", type: "door" },
        });
        assert.deepInclude(draft.steps().at(-1)?.act?.to, { keepRow: true, unmatched: "add", type: "door" });
        assert.strictEqual(draft.preview().after.nodeTypes.door, 2);
        assert.strictEqual(draft.preview().after.nodes, 3 + 4 + 2, "people, entries and doors");
        session.dispose();
    });

    it("a source a join added goes back to staged when the join needs its nodes no more", async () => {
        const { session, entries, draft } = await opened();
        const from = { source: entries, field: "badge" };
        const into = { space: "person" };
        draft.connect({ from, into });
        assert.include(added(draft), entries, "each entry is a node");
        const at = draft.steps().findIndex((step) => step.act !== null);
        draft.replaceStep(at, {
            act: "connect",
            options: { from, into, to: { field: "door", into: { space: "door" }, unmatched: "add" } },
        });
        assert.notInclude(added(draft), entries, "each entry is an edge: its node goes");
        assert.strictEqual(draft.preview().after.nodes, 3 + 2, "people and doors");
        assert.strictEqual(draft.steps()[at - 1]?.act?.to?.field, "door", "the step follows the add it lost");
        draft.undo();
        assert.include(added(draft), entries, "Undo brings the add back with the step");
        session.dispose();
    });

    it("removeStep with adds remove takes the whole join back; a source added on its own stays", async () => {
        const { session, entries, draft } = await opened();
        const from = { source: entries, field: "badge" };
        const into = { space: "person" };
        const before = draft.steps().length;
        draft.connect({ from, into });
        draft.removeStep(draft.steps().length - 1, { adds: "remove" });
        assert.lengthOf(draft.steps(), before, "the add goes too");
        draft.connect({ from, into });
        draft.removeStep(draft.steps().length - 1);
        assert.lengthOf(draft.steps(), before + 1, "by default it stays");
        draft.undo();
        draft.undo();
        draft.add(entries);
        draft.connect({ from, into });
        draft.removeStep(draft.steps().length - 1, { adds: "remove" });
        assert.include(added(draft), entries, "the reader added it: it stays");
        session.dispose();
    });

    it("keeps an added source another step still needs", async () => {
        const { session, entries, draft } = await opened();
        const from = { source: entries, field: "badge" };
        draft.connect({ from, into: { space: "person" } });
        draft.link({ source: entries, columns: ["door"] });
        const at = draft.steps().findIndex((step) => step.act !== null);
        draft.removeStep(at, { adds: "remove" });
        assert.include(added(draft), entries, "the link's nodes are the entries");
        draft.removeStep(draft.steps().length - 1, { adds: "remove" });
        assert.notInclude(added(draft), entries);
        draft.merge({ from, into: { space: "person" } });
        draft.connect({ from: { source: entries, field: "door" }, into: { space: "person" } });
        draft.removeStep(draft.steps().length - 1, { adds: "remove" });
        assert.include(added(draft), entries, "the merge folds the entries' nodes");
        session.dispose();
    });

    it("profiles a column the nodes of a space carry, each value of a list apart", async () => {
        const { session, entries, draft } = await opened();
        draft.merge({
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            unmatchedFrom: "drop",
            aggregate: { "*": "list" },
        });
        const profile = draft.profile({ space: "person", field: "door" });
        assert.deepInclude(profile, { kind: "text", distinct: 2, empty: 1 });
        assert.sameMembers([...profile.samples], ["D1", "D2"]);
        assert.strictEqual(draft.profile({ space: "person" }).distinct, 3, "with no field, the keys");
        await draft.commit();
        assert.strictEqual(session.data.profile({ space: "person", field: "door" }).distinct, 2);
        session.dispose();
    });

    it("lists a row's own columns, without the facts kept beside them", async () => {
        const { session, draft } = await opened();
        const visits = await draft.stage(csv("visits.csv", "visit,badge,_source.expansion", "v1,B1,none"), {
            key: "visit",
        });
        draft.connect({ from: { source: visits, field: "badge" }, into: { space: "person" } });
        const [row] = draft.preview().rows({ step: draft.steps().length - 1, bucket: "newEdges" }).rows;
        assert.deepStrictEqual(Object.keys(row?.incoming ?? {}).sort(), ["badge", "visit"]);
        session.dispose();
    });
});
