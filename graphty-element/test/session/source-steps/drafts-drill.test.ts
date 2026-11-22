/**
 * @file A draft preview's drill-down, exclusion and batch picks (design 3.10, 5.4), ported from the
 * reference model's phase 5 exclusion half and its "rules per column" and "a pick in a draft"
 * cases; and the property that the rows behind every count of the founding example's drafts add up
 * to that count.
 */

import { assert, describe, it } from "vitest";

import {
    createGraphSession,
    type GraphSession,
    type SourceDraft,
    type SourceDraftBucket,
    type SourceDraftPreviewStep,
} from "../../../src/session";
import { ACCOUNTS, phase1, phase2, refused } from "./scenario";

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
 * @returns The session and accounts.csv's source.
 */
async function renamedAndStaged(): Promise<{ session: GraphSession; a: string }> {
    const { session, t } = await phase2();
    await session.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
    const a = await session.data.stage(csv("accounts.csv", ACCOUNTS), { key: "account_id", type: "account" });
    return { session, a };
}

/**
 * The draft's merge step.
 * @param d - The draft.
 * @returns It, as the preview describes it.
 */
function mergeOf(d: SourceDraft): SourceDraftPreviewStep {
    const st = d.preview().steps.find((s) => s.op === "join.merge");
    assert.isDefined(st);
    return st;
}

const S1 = csv("crm.csv", "id,name,amt\np1,Ann,10\np2,Bo,20");
const S2 = csv("erp.csv", "id,name,amt\np1,Anne,30\np2,Bo,40");
const S3 = csv("hr.csv", "id,name,amt\np1,Anne,50");
const P1 = { space: "person", key: "p1" } as const;
const P2 = { space: "person", key: "p2" } as const;

/**
 * crm.csv imported, then each other source staged and added with its keys merged into person.
 * @param more - The other sources.
 * @returns The session and every source's id, crm.csv first.
 */
async function people(...more: ReturnType<typeof csv>[]): Promise<{ session: GraphSession; ids: string[] }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(S1, { key: "id", type: "person" });
    const ids = [session.data.sources()[0]?.key ?? ""];
    for (const s of more) {
        const id = await session.data.stage(s, { key: "id", type: "person" });
        await session.data.add(id, { overlap: "merge" });
        ids.push(id);
    }
    return { session, ids };
}

/**
 * The place of the newest step reading a source.
 * @param session - The session.
 * @param source - The source.
 * @returns The step's index.
 */
function stepOf(session: GraphSession, source: string): number {
    return session.data
        .steps()
        .map((s) => s.source === source)
        .lastIndexOf(true);
}

/**
 * Every `clash` a saved file writes on a step of one source.
 * @param doc - The parsed file.
 * @param source - The source.
 * @returns The clash values found.
 */
function savedClash(doc: unknown, source: string): unknown[] {
    const out: unknown[] = [];
    const walk = (v: unknown): void => {
        if (Array.isArray(v)) {
            v.forEach(walk);
        } else if (typeof v === "object" && v !== null) {
            const o = v as Record<string, unknown>;
            if (o.source === source && "clash" in o && typeof o.op === "string") {
                out.push(o.clash);
            }
            Object.values(o).forEach(walk);
        }
    };
    walk(doc);
    return out;
}

/**
 * Check that each step's Values differ count by column, its `W_VALUES_DIFFER` outcome, its cell
 * list and its batch pick all count the same cells.
 * @param d - The draft; a batch pick is tried and taken back.
 * @returns How many cells were checked.
 */
function valuesDifferAddsUp(d: SourceDraft): number {
    const pv = d.preview();
    let checked = 0;
    for (const st of pv.steps) {
        for (const [column, n] of Object.entries(st.buckets?.valuesDiffer ?? {})) {
            const where = `step ${String(st.index)} ${column}`;
            assert.strictEqual(pv.rows({ step: st.index, bucket: "valuesDiffer", name: column }).total, n, where);
            assert.strictEqual(pv.cells({ step: st.index, column }).total, n, `${where} cells`);
            const outcome = st.valuesDiffer.find((o) => o.params.column === column);
            assert.strictEqual(outcome?.params.count, n, `${where} outcome`);
            const picked = d.pickAll({ column, source: st.source, step: st.index });
            assert.strictEqual(picked, n, `${where} pickAll`);
            if (picked > 0) {
                d.undo();
            }
            checked += n;
        }
    }
    return checked;
}

describe("source-steps drafts: drill-down and exclusion (5.4)", () => {
    it("phase 5: Exclude selected keeps the selected rows their own node 2s; Untouched rises by the same count", async () => {
        const { session, a } = await renamedAndStaged();
        const nodes = session.data.store.getSnapshot().nodeCount;
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const st = mergeOf(d);
        const pv = d.preview();
        const merged = pv.rows({ step: st.index, bucket: "merged" });
        assert.strictEqual(merged.total, st.buckets?.merged);
        assert.sameMembers(
            merged.rows.map((r) => r.key),
            ["A-1", "A-2"],
        );
        assert.deepStrictEqual(
            merged.rows.map((r) => r.source),
            [a, a],
        );
        for (const r of merged.rows) {
            assert.isNotNull(r.held, `merged row ${String(r.key)} folds into a node that already exists`);
            assert.notStrictEqual(r.effect, "added");
            assert.include(["changed", "unchanged"], r.effect);
        }
        // The values-differ row: the held holder, the incoming one and the one shown.
        const differ = pv.rows({ step: st.index, bucket: "valuesDiffer", name: "holder" });
        assert.strictEqual(differ.total, 1);
        const [row] = differ.rows;
        assert.strictEqual(row?.key, "A-2");
        assert.strictEqual(row?.held?.holder, "Bo");
        assert.strictEqual(row?.incoming?.holder, "Bob");
        assert.strictEqual(row?.shown?.holder, "Bo", "Keep 1: the held value stays");
        assert.strictEqual(row?.effect, "changed", "A-2 gains accounts.csv's values");
        assert.deepStrictEqual(row?.codes, ["W_VALUES_DIFFER"]);
        assert.deepStrictEqual(row?.element, { space: "account", key: "A-2" });
        const untouched = pv.rows({ step: st.index, bucket: "untouched" });
        assert.deepStrictEqual(
            untouched.rows.map((r) => r.element),
            [{ space: "account", key: "A-3" }],
        );
        assert.deepStrictEqual(untouched.rows[0]?.codes, ["W_UNTOUCHED"]);
        assert.deepStrictEqual(pv.elements({ step: st.index, bucket: "untouched" }), [
            { space: "account", key: "A-3" },
        ]);
        const unmatched = pv.rows({ step: st.index, bucket: "unmatched" });
        assert.deepStrictEqual(
            unmatched.rows.map((r) => [r.key, r.effect]),
            [["A-9", "added"]],
            "kept node 2s are new accounts",
        );
        // Exclude selected: A-2 stays its own node 2; Untouched rises by one.
        d.exclude(st.index, ["A-2"]);
        const st2 = mergeOf(d);
        assert.strictEqual(st2.buckets?.merged, 1);
        assert.strictEqual(st2.buckets?.untouched, 2);
        assert.strictEqual(st2.buckets?.valuesDiffer.holder ?? 0, 0);
        assert.deepStrictEqual(d.preview().rows({ step: st2.index, bucket: "valuesDiffer" }), { total: 0, rows: [] });
        // Include takes the key off again; an empty list is taken off the step.
        d.include(st.index, ["A-2"]);
        assert.strictEqual(mergeOf(d).buckets?.merged, 2);
        d.exclude(st.index, ["A-2", "A-2", "A-1"]);
        assert.strictEqual(mergeOf(d).buckets?.merged, 0, "each key is listed once");
        assert.isTrue(d.undo());
        assert.strictEqual(mergeOf(d).buckets?.merged, 2, "draft undo takes one exclusion back");
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, nodes, "the committed graph is unchanged");
        d.dispose();
        session.dispose();
    });

    it("refuses exclusion on a join.add step, by another column, and an unknown step or count", async () => {
        const { session, a } = await renamedAndStaged();
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const st = mergeOf(d);
        const add = d.steps().findIndex((s) => s.op === "join.add" && s.source === a);
        const noExcept = await refused(() => Promise.resolve(d.exclude(add, ["A-1"])), "E_BAD_COMMAND");
        assert.strictEqual(noExcept.reason, "no-except");
        d.exclude(st.index, ["A-2"]);
        const other = await refused(
            () => Promise.resolve(d.exclude(st.index, ["Bob"], { column: "holder" })),
            "E_BAD_COMMAND",
        );
        assert.deepInclude(other, { reason: "except-column", column: "account_id" });
        const noStep = await refused(
            () => Promise.resolve(d.preview().rows({ step: 99, bucket: "merged" })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(noStep.reason, "no-step");
        const bucket = await refused(
            () => Promise.resolve(d.preview().rows({ step: st.index, bucket: "hub" as SourceDraftBucket })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(bucket.reason, "bucket");
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: rules and picks per column (3.10)", () => {
    it("rules per column -- max and mean on numbers, vote on three sources, the rest keep", async () => {
        const {
            session,
            ids: [, b, c],
        } = await people(S2, S3);
        const d = session.data.draft();
        d.editStep(stepOf(session, b), { clash: { amt: "max" } });
        d.editStep(stepOf(session, c), { clash: { amt: "max" } });
        d.editStep(stepOf(session, c), { clash: { name: "vote" } });
        await d.commit();
        assert.strictEqual(session.data.values(P1, "amt")?.shown, 50);
        assert.strictEqual(session.data.values(P1, "name")?.shown, "Anne", "two of three sources say Anne");
        assert.strictEqual(session.data.values(P2, "name")?.shown, "Bo");
        const e = session.data.draft();
        e.editStep(stepOf(session, b), { clash: { amt: "mean" } });
        e.editStep(stepOf(session, c), { clash: { amt: "mean" } });
        await e.commit();
        const m = session.data.values(P1, "amt");
        assert.strictEqual(m?.shown, 30);
        assert.strictEqual(m?.origin, "rule:mean", "a computed value is marked computed");
        const doc: unknown = JSON.parse((await session.project.save()).text);
        assert.deepInclude(savedClash(doc, b), { "*": "keep", amt: "mean" }, "saved per column with * for the rest");
        session.dispose();
    });

    it("a pick in a draft commits with it as one undo step; pickAll and clearPicks are one draft act each", async () => {
        const {
            session,
            ids: [, b],
        } = await people(S2);
        const d = session.data.draft();
        d.pick(P1, "name", b);
        d.undo();
        assert.lengthOf(d.edits(), 0, "draft undo removes the pick");
        const cells = d.preview().cells({ column: "amt" });
        assert.strictEqual(cells.total, 2);
        assert.deepStrictEqual(
            cells.cells.map((x) => [x.shown, x.decided, x.values.map((v) => v.value)]),
            [
                [10, false, [10, 30]],
                [20, false, [20, 40]],
            ],
        );
        assert.strictEqual(d.pickAll({ column: "amt", source: b }), 2);
        assert.strictEqual(d.preview().cells({ column: "amt", only: "decided" }).total, 2);
        assert.strictEqual(d.preview().cells({ column: "amt", only: "open" }).total, 0);
        assert.strictEqual(d.pickAll({ column: "amt", source: b }), 0, "no open cell is left; nothing recorded");
        assert.strictEqual(d.clearPicks({ column: "amt", refs: [P2] }), 1);
        assert.deepStrictEqual(
            d
                .preview()
                .cells({ column: "amt", only: "open" })
                .cells.map((x) => x.ref),
            [P2],
        );
        assert.isTrue(d.undo(), "one undo takes the clear back");
        assert.strictEqual(d.preview().cells({ column: "amt", only: "decided" }).total, 2);
        await d.commit();
        assert.strictEqual(session.data.values(P1, "amt")?.shown, 30);
        assert.deepStrictEqual(
            session.data.edits().map((x) => x.picked),
            [b, b],
        );
        assert.lengthOf(session.data.conflicts({ column: "amt", only: "decided" }), 2);
        const report = session.data.steps().flatMap((s) => s.valuesDiffer);
        assert.strictEqual(report.find((r) => r.params.column === "amt")?.params.decided, 2);
        await session.undo();
        assert.strictEqual(session.data.values(P1, "amt")?.shown, 10, "one undo step takes both picks back");
        session.dispose();
    });

    it("a third source merged onto the same cells: each step's Values differ, cells, outcome and pickAll agree", async () => {
        const {
            session,
            ids: [, b, c],
        } = await people(S2, S3);
        const d = session.data.draft();
        assert.strictEqual(valuesDifferAddsUp(d), 5, "erp: name 1, amt 2; hr: name 1, amt 1");
        const pv = d.preview();
        assert.deepStrictEqual(
            pv.cells({ step: stepOf(session, b), column: "name" }).cells.map((x) => x.ref),
            [P1],
            "erp's Anne differs from crm's Ann, though hr's step settles the cell",
        );
        assert.deepStrictEqual(
            pv.cells({ step: stepOf(session, c), column: "amt" }).cells.map((x) => x.ref),
            [P1],
        );
        d.dispose();
        session.dispose();
    });

    it("pickAll takes only the cells of the elements it names", async () => {
        const {
            session,
            ids: [, b],
        } = await people(S2);
        const d = session.data.draft();
        assert.strictEqual(d.pickAll({ column: "amt", source: b, refs: [{ key: "p2", space: "person" }] }), 1);
        assert.deepStrictEqual(
            d.edits().map((x) => x.target),
            [P2],
        );
        d.dispose();
        session.dispose();
    });
});

/** Door entries for the founding example: B9 badges no person, D3 is no building's door. */
const ENTRIES = ["entry,badge,door", "E1,B1,D1", "E2,B1,D2", "E3,B2,D1", "E4,B9,D1", "E5,B2,D3", "E6,B2,D1"].join("\n");

describe("source-steps drafts: every count's rows add up to it", () => {
    it("over the founding example's drafts, each count and each count by name equals its rows' total", async () => {
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
        // A second people file merged in, so merges, values that differ and repeated keys are counted too.
        const more = await d.stage(csv("people2.csv", "badge,name\nB1,Annie\nB2,Bo\nB2,Bob\nB7,Di\nB7,Di"), {
            key: "badge",
            type: "person",
        });
        d.merge({ from: { source: more, field: "badge" }, into: { space: "person" } });
        d.connect({ from: { source: entries, field: "badge" }, into: { source: people }, edgeType: "by" });
        d.connect({ from: { source: entries, field: "door" }, into: { source: buildings }, edgeType: "at" });
        const pv = d.preview();
        let checked = 0;
        for (const st of pv.steps) {
            const counts = st.buckets;
            if (counts === null) {
                continue;
            }
            for (const [bucket, count] of Object.entries(counts)) {
                if (typeof count === "number" && bucket !== "step" && bucket !== "part") {
                    const { total, rows } = pv.rows({ step: st.index, bucket: bucket as SourceDraftBucket });
                    assert.strictEqual(total, count, `step ${String(st.index)} ${bucket}`);
                    assert.lengthOf(rows, count);
                    checked += count;
                } else if (typeof count === "object" && !Array.isArray(count)) {
                    for (const [name, n] of Object.entries(count as Record<string, number>)) {
                        const q = { step: st.index, bucket: bucket as SourceDraftBucket, name };
                        assert.strictEqual(pv.rows(q).total, n, `step ${String(st.index)} ${bucket} ${name}`);
                        checked += n;
                    }
                }
            }
        }
        assert.isAbove(checked, 0);
        assert.isAbove(valuesDifferAddsUp(d), 0);
        const edges = pv.steps.find((s) => s.op === "join.edges" && s.source === entries);
        assert.isDefined(edges);
        assert.deepStrictEqual(
            pv
                .rows({ step: edges.index, bucket: "unmatched" })
                .rows.map((r) => [r.key, r.incoming?.badge, r.effect, r.codes]),
            [["E4", "B9", "left-out", ["W_UNMATCHED"]]],
            "B9 badges no person: its entry makes no edge",
        );
        const page = pv.rows({ step: edges.index, bucket: "newEdges", offset: 1, limit: 2 });
        assert.strictEqual(page.total, 5);
        assert.deepStrictEqual(
            page.rows.map((r) => [r.key, r.effect]),
            [
                ["E2", "added"],
                ["E3", "added"],
            ],
        );
        assert.lengthOf(pv.elements({ step: edges.index, bucket: "newEdges" }), 5);
        // The matched rows are the rows the commit turns into edges, as newEdges reports them.
        const matched = pv.rows({ step: edges.index, bucket: "matched" });
        assert.strictEqual(matched.total, 5);
        assert.deepStrictEqual(
            matched.rows.map((r) => [r.key, r.effect, r.element]),
            pv.rows({ step: edges.index, bucket: "newEdges" }).rows.map((r) => [r.key, "added", r.element]),
        );
        assert.lengthOf(pv.elements({ step: edges.index, bucket: "matched" }), 5);
        // An end that meets names the node it met, so its row is never shown as left out.
        const meet = pv.rows({ step: edges.index, bucket: "endsMeet", name: "person" });
        assert.strictEqual(meet.total, 5);
        for (const r of meet.rows) {
            assert.notStrictEqual(r.effect, "left-out", `${String(r.key)} met a person`);
            assert.deepInclude(r.element, { space: "person" });
        }
        session.dispose();
    });
});

describe("source-steps drafts: a repeated key's row names its element", () => {
    it("Repeated in 2 on a values step and on an add names the node the key's rows reached", async () => {
        const { session, t } = await phase1();
        const d = session.data.draft();
        d.moveColumns(t, { columns: ["holder_name"], to: "source" });
        const pv = d.preview();
        const st = pv.steps.find((s) => s.op === "join.node-values");
        assert.isDefined(st);
        const A1 = { space: "account", key: "A-1" };
        const r2 = pv.rows({ step: st.index, bucket: "repeated2" });
        assert.strictEqual(r2.total, 1);
        assert.deepStrictEqual(
            r2.rows.map((r) => [r.key, r.effect, r.element]),
            [["A-1", "changed", A1]],
            "both A-1 rows write holder_name onto account A-1",
        );
        assert.isNotNull(r2.rows[0]?.incoming);
        assert.deepStrictEqual(pv.elements({ step: st.index, bucket: "repeated2" }), [A1]);
        const more = await d.stage(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB2,Bob"), {
            key: "badge",
            type: "person",
        });
        d.add(more);
        const pv2 = d.preview();
        const add = pv2.steps.find((s) => s.op === "join.add" && s.source === more);
        assert.isDefined(add);
        const B2 = { space: "person", key: "B2" };
        assert.deepStrictEqual(
            pv2.rows({ step: add.index, bucket: "repeated2" }).rows.map((r) => [r.key, r.effect, r.element]),
            [["B2", "added", B2]],
        );
        assert.deepStrictEqual(pv2.elements({ step: add.index, bucket: "repeated2" }), [B2]);
        session.dispose();
    });
});
