/**
 * @file A draft's preview (design 5.3, 5.6): the buckets counted over every row and their change
 * from the committed counts, ported from the reference model's phase 5 bucket assertions, the
 * settled "data.steps() returns each step's buckets" case and review round 10's repeated edges;
 * and the property that a commit's graph is the preview's "after".
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";
import { ACCOUNTS, full, phase2, phase6 } from "./scenario";

const ACCOUNTS_CSV = { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" } as const;

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its text.
 * @returns What `import` takes.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * Phase 2 with holder_name renamed to holder, and accounts.csv staged.
 * @returns The session and the two sources.
 */
async function renamedAndStaged(): Promise<{ session: GraphSession; t: string; a: string }> {
    const { session, t } = await phase2();
    await session.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
    const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
    return { session, t, a };
}

/**
 * The codes of a preview's issues.
 * @param draft - The draft.
 * @returns Each issue's code.
 */
function codes(draft: SourceDraft): string[] {
    return draft.preview().issues.map((i) => i.code);
}

describe("source-steps drafts: the preview", () => {
    it("phase 5: the preview counts every bucket and changes nothing until Commit", async () => {
        const { session, a } = await renamedAndStaged();
        const nodes = session.data.store.getSnapshot().nodeCount;
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const pv = d.preview();
        const st = pv.steps.find((s) => s.op === "join.merge");
        assert.strictEqual(st?.buckets?.merged, 2, "A-1 and A-2 meet");
        assert.strictEqual(st?.buckets?.untouched, 1, "A-3 has no accounts row");
        assert.strictEqual(st?.buckets?.unmatched, 1, "A-9 names no transaction's account");
        assert.strictEqual(st?.buckets?.valuesDiffer.holder, 1, "Bo and Bob");
        assert.strictEqual(st?.buckets?.groups[0], 2, "each account folds one row into one node");
        assert.strictEqual(pv.nodes.added, 1, "kept node 2s are new accounts");
        assert.strictEqual(pv.after.nodes - pv.before.nodes, 1);
        assert.strictEqual(pv.before.nodes, nodes);
        assert.strictEqual(st?.state, "new");
        assert.isNull(st?.change ?? null, "a new step has no committed counts");
        assert.includeMembers(codes(d), ["W_UNMATCHED", "W_UNTOUCHED", "W_VALUES_DIFFER"]);
        assert.strictEqual(
            pv.sources.find((s) => s.source === a)?.state,
            "built",
            "the merge builds the staged accounts",
        );
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, nodes, "the committed graph is unchanged");
        assert.isTrue(d.undo());
        // Exclude A-2: it stays its own node 2, and Untouched rises by one.
        d.merge({
            from: { source: a, field: "account_id" },
            into: { space: "account" },
            except: { column: "account_id", values: ["A-2"] },
        });
        const st2 = d.preview().steps.find((s) => s.op === "join.merge");
        assert.strictEqual(st2?.buckets?.merged, 1);
        assert.strictEqual(st2?.buckets?.untouched, 2);
        assert.strictEqual(st2?.buckets?.valuesDiffer.holder ?? 0, 0);
        d.dispose();
        session.dispose();
    });

    it("settled (9.2): data.steps() returns each step's buckets, the ones the preview showed", async () => {
        const { session, a } = await renamedAndStaged();
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const pv = d.preview();
        await d.commit();
        const rows = session.data.steps();
        assert.deepStrictEqual(
            rows.map((r) => r.buckets),
            pv.steps.map((r) => r.buckets),
        );
        assert.strictEqual(rows[0]?.buckets?.newEdges, session.data.count({ type: "transfer" }).edges);
        session.dispose();
    });

    it("3.3: a join.edges step with no repeated leaves two rows naming one pair to repeatedEdges (keep: two edges)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "id\np1\np2"), { key: "id", space: "person" });
        const d = session.data.draft();
        // Two calls, each from p1 to p2: Extract makes a join.edges step from a to b, and taking its
        // repeated choice off leaves the two rows naming one pair to the graph's repeatedEdges.
        const calls = await d.import(csv("calls.csv", "call,a,b\nc1,p1,p2\nc2,p1,p2"), {
            edges: { from: { column: "a", space: "person" }, to: { column: "call", space: "call" } },
        });
        const part = d.extract(calls, { column: "b", space: "person" });
        const at = d.steps().findIndex((s) => s.op === "join.edges");
        d.editStep(at, { repeated: null });
        const step = d.preview().steps[at];
        assert.strictEqual(step?.buckets?.part, part);
        assert.strictEqual(step?.buckets?.newEdges, 2);
        assert.strictEqual(step?.buckets?.parallelPairs, 1);
        assert.deepInclude(d.preview().issues, { code: "W_PARALLEL_EDGES", params: { step: at, pairs: 1 } });
        await d.commit();
        const between = session.data.edges().filter((e) => String(e.source) === "p1" && String(e.target) === "p2");
        assert.lengthOf(between, 2);
        session.dispose();
    });

    it("a removal lists the steps it takes, the references it unbinds and the reader edits' states", async () => {
        const { session, a } = await phase6();
        session.notes.add({ text: "watch", targets: [{ node: "A-9" }] });
        await session.data.updateNodes([{ id: "A-1", values: { risk: "high" } }]);
        const merge = session.data.steps().findIndex((s) => s.op === "join.merge");
        const d = session.data.draft();
        d.removeSource(a);
        const pv = d.preview();
        assert.deepInclude(pv.issues, {
            code: "W_STEP_REMOVED",
            params: { step: merge, reason: "source-removed", source: a },
        });
        assert.deepInclude(pv.issues, {
            code: "W_REFERENCE_UNBOUND",
            params: { ref: { space: "account", key: "A-9" } },
        });
        const removed = pv.sources.find((s) => s.source === a);
        assert.strictEqual(removed?.state, "removed");
        assert.strictEqual(removed?.nodes, 0);
        assert.isBelow(removed?.change.nodes ?? 0, 0);
        assert.deepStrictEqual(
            pv.edits.map((e) => e.state),
            ["applies"],
            "the reader's edit on A-1 still applies",
        );
        d.dispose();
        session.dispose();
    });

    it("a graph-wide filter on a column only a removed source carries would be held (W_FILTER_HELD)", async () => {
        const { session, m } = await full();
        const { id } = await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "categories", attribute: "data.city", values: ["Oslo"] },
        });
        const d = session.data.draft();
        d.removeSource(m);
        const held = d.preview().issues.filter((i) => i.code === "W_FILTER_HELD");
        assert.deepStrictEqual(held, [{ code: "W_FILTER_HELD", params: { filter: id, column: "data.city" } }]);
        await d.commit();
        assert.deepStrictEqual(session.visibility.held, held, "the commit holds the filters the preview named");
        session.dispose();
    });

    it("an edited step keeps its committed place and reports the change of each count", async () => {
        const { session, a } = await phase6();
        const merge = session.data.steps().findIndex((s) => s.op === "join.merge");
        const d = session.data.draft();
        const kept = d.preview().steps[merge];
        assert.strictEqual(kept?.state, "kept");
        assert.strictEqual(kept?.change?.merged, 0);
        d.editStep(merge, { except: { column: "account_id", values: ["A-2"] } });
        const edited = d.preview().steps[merge];
        assert.strictEqual(edited?.state, "edited");
        assert.strictEqual(edited?.committed, merge);
        assert.strictEqual(edited?.change?.merged, -1);
        assert.strictEqual(edited?.change?.untouched, 1);
        assert.deepStrictEqual(edited?.change?.valuesDiffer, { holder: -1 });
        assert.strictEqual(d.preview().sources.find((s) => s.source === a)?.state, "built");
        d.dispose();
        session.dispose();
    });

    it("counts edge ends that meet and miss, repeated keys and new elements by type", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo"), { key: "badge", type: "person" });
        const d = session.data.draft();
        const k = await d.import(csv("staff.csv", "badge,boss\nS1,B1\nS1,B1\nS2,S9"), {
            key: "badge",
            type: "staff",
        });
        const add = d.preview().steps.find((s) => s.source === k && s.op === "join.add");
        assert.strictEqual(add?.buckets?.repeated2, 1, "S1 is held by two rows");
        assert.deepStrictEqual(add?.buckets?.newNodeTypes, { staff: 2 });
        d.connect({ from: { source: k, field: "boss" }, into: { space: "person" } });
        const step = d.preview().steps.find((s) => s.op === "join.edges");
        const space = step?.spaces.find((s) => s !== "person") ?? "";
        assert.deepStrictEqual(step?.buckets?.endsMeet, { person: 2, [space]: 3 }, "B1 twice; S1 twice and S2");
        assert.deepStrictEqual(step?.buckets?.endsMissing, { person: 1 }, "S9 is no person");
        assert.deepInclude(d.preview().issues, {
            code: "W_EDGE_END_MISSING",
            params: { step: step?.index ?? -1, space: "person", ends: 1 },
        });
        d.dispose();
        session.dispose();
    });

    it("counts the nodes a source's edges name that its own node rows lack (W_NODE_NAMED_ONLY)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [
                { source: "a", target: "b" },
                { source: "a", target: "z" },
            ],
        });
        const g = await d.import({ type: "json", config: { data }, name: "g.json" });
        const add = d.preview().steps.find((s) => s.source === g && s.op === "join.add");
        assert.strictEqual(add?.buckets?.namedOnly, 1, "z is only an edge end");
        assert.deepInclude(d.preview().issues, {
            code: "W_NODE_NAMED_ONLY",
            params: { step: add?.index ?? -1, source: g, nodes: 1 },
        });
        d.dispose();
        session.dispose();
    });

    it("returns one preview per state, and a new one after an act or an undo", async () => {
        const { session, a } = await renamedAndStaged();
        const d = session.data.draft();
        const first = d.preview();
        assert.strictEqual(d.preview(), first);
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const second = d.preview();
        assert.notStrictEqual(second, first);
        d.undo();
        assert.notStrictEqual(d.preview(), second);
        assert.strictEqual(d.preview().draft, d.id);
        d.dispose();
        session.dispose();
    });
});

/** Door entries for the founding example: B9 badges no person, D3 is no building's door. */
const ENTRIES = ["entry,badge,door", "E1,B1,D1", "E2,B1,D2", "E3,B2,D1", "E4,B9,D1", "E5,B2,D3", "E6,B2,D1"].join("\n");

/** One act on the founding example's draft, given the three sources. */
type Act = (d: SourceDraft, s: { people: string; buildings: string; entries: string }) => void;

const ADD: Act = (d, s) => d.add(s.entries);
const TO_PEOPLE: Act = (d, s) => {
    d.connect({ from: { source: s.entries, field: "badge" }, into: { source: s.people }, edgeType: "by" });
};
const TO_BUILDINGS: Act = (d, s) => {
    d.connect({ from: { source: s.entries, field: "door" }, into: { source: s.buildings }, edgeType: "at" });
};
const NOT_B2: Act = (d) => {
    const last = d.steps().length - 1;
    d.editStep(last, { except: { column: "badge", values: ["B2"] } });
};
const DROP_PEOPLE: Act = (d, s) => d.removeSource(s.people);

/** The founding example's act sequences the property runs. */
const SEQUENCES: readonly (readonly Act[])[] = [
    [],
    [ADD],
    [TO_PEOPLE],
    [TO_PEOPLE, TO_BUILDINGS],
    [ADD, TO_PEOPLE, TO_BUILDINGS],
    [ADD, TO_PEOPLE, NOT_B2],
    [ADD, TO_BUILDINGS, DROP_PEOPLE],
    [TO_BUILDINGS, TO_PEOPLE, NOT_B2],
];

describe("source-steps drafts: commit equals preview", () => {
    it("over the founding example's acts, the committed graph, its types and its steps are the preview's after", async () => {
        for (const [n, acts] of SEQUENCES.entries()) {
            const session = createGraphSession({ features: ["source-steps"] });
            await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB3,Cy"), {
                key: "badge",
                type: "person",
            });
            const people = session.data.sources()[0]?.key ?? "";
            const buildings = await session.data.stage(csv("buildings.csv", "door,building\nD1,North\nD2,South"), {
                key: "door",
                type: "building",
            });
            await session.data.add(buildings);
            const d = session.data.draft();
            const entries = await d.stage(csv("entries.csv", ENTRIES), { key: "entry", type: "entry" });
            for (const act of acts) {
                act(d, { people, buildings, entries });
            }
            const pv = d.preview();
            await d.commit();
            const snapshot = session.data.store.getSnapshot();
            assert.strictEqual(snapshot.nodeCount, pv.after.nodes, `sequence ${String(n)}: nodes`);
            assert.strictEqual(snapshot.edgeCount, pv.after.edges, `sequence ${String(n)}: edges`);
            for (const { name } of session.data.types()) {
                const count = session.data.count({ type: name });
                assert.strictEqual(count.nodes, pv.after.nodeTypes[name] ?? 0, `sequence ${String(n)}: ${name} nodes`);
                assert.strictEqual(count.edges, pv.after.edgeTypes[name] ?? 0, `sequence ${String(n)}: ${name} edges`);
            }
            assert.deepStrictEqual(
                session.data.steps().map((r) => r.buckets),
                pv.steps.map((r) => r.buckets),
                `sequence ${String(n)}: buckets`,
            );
            const staged = session.data.sources().find((s) => s.key === entries)?.state ?? "removed";
            assert.strictEqual(staged, pv.sources.find((s) => s.source === entries)?.state);
            session.dispose();
        }
    });
});
