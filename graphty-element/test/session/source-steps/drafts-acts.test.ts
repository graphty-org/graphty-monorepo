/**
 * @file A draft of the sources and steps (design 5.6), ported from the reference model's draft
 * cases: acts change only the draft until its commit, which is one undo step; while it is open the
 * data and the history are refused, and the source it brings in may still change.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { ACCOUNTS, edgeFile, phase1, phase2, phase6, refused } from "./scenario";

/** Accounts on the transactions' keys: A-1 and A-2 meet, A-9 does not; A-2's holder differs. */
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
 * Phase 2 with holder_name renamed to holder, so accounts.csv's holder meets it, and accounts.csv
 * staged.
 * @returns The session and the two sources.
 */
async function renamedAndStaged(): Promise<{ session: GraphSession; t: string; a: string }> {
    const { session, t } = await phase2();
    const d0 = session.data.draft();
    d0.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
    await d0.commit();
    const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
    return { session, t, a };
}

/**
 * crm.csv and erp.csv on one key, erp.csv added with its keys merged into crm.csv's: their name and
 * amt meet.
 * @returns The session and the two sources.
 */
async function two(): Promise<{ session: GraphSession; a: string; b: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(csv("crm.csv", "id,name,amt\np1,Ann,10\np2,Bo,20"), { key: "id", type: "person" });
    const a = session.data.sources({ staged: true })[0]?.key ?? "";
    const b = await session.data.stage(csv("erp.csv", "id,name,amt\np1,Anne,30\np2,Bo,40"), {
        key: "id",
        type: "person",
    });
    await session.data.add(b, { overlap: "merge" });
    return { session, a, b };
}

const P1 = { space: "person", key: "p1" } as const;
const P2 = { space: "person", key: "p2" } as const;

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

describe("source-steps drafts: acts on a copy", () => {
    it("phase 5: a merge in a draft changes nothing until Commit; undo takes the act back", async () => {
        const { session, a } = await renamedAndStaged();
        const nodes = session.data.store.getSnapshot().ids.size;
        const history = session.history.steps.length;
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const st = d.steps().find((s) => s.op === "join.merge")?.buckets;
        assert.strictEqual(st?.merged, 2, "A-1 and A-2 meet");
        assert.strictEqual(st?.untouched, 1, "A-3 has no accounts row");
        assert.strictEqual(st?.unmatched, 1, "A-9 names no transaction's account");
        assert.strictEqual(st?.valuesDiffer.holder, 1, "Bo and Bob");
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes, "the committed graph is unchanged");
        assert.lengthOf(session.history.steps, history, "no step is recorded");
        assert.isUndefined(
            session.data.steps().find((s) => s.op === "join.merge"),
            "the committed steps hold no merge",
        );
        await refused(() => session.data.updateNodes([{ id: "A-1", values: { risk: "high" } }]), "E_DRAFT_OPEN");
        assert.isTrue(d.undo());
        assert.isUndefined(d.steps().find((s) => s.op === "join.merge"));
        // Exclude A-2: it stays its own node 2, and Untouched rises by one.
        d.merge({
            from: { source: a, field: "account_id" },
            into: { space: "account" },
            except: { column: "account_id", values: ["A-2"] },
        });
        const st2 = d.steps().find((s) => s.op === "join.merge")?.buckets;
        assert.strictEqual(st2?.merged, 1);
        assert.strictEqual(st2?.untouched, 2);
        assert.strictEqual(st2?.valuesDiffer.holder ?? 0, 0);
        d.dispose();
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes);
        session.dispose();
    });

    it("phase 6: the commit is one undo step, and undoing it returns accounts.csv to staged", async () => {
        const { session, a } = await renamedAndStaged();
        const nodes = session.data.store.getSnapshot().ids.size;
        const history = session.history.steps.length;
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        await d.commit();
        assert.isFalse(d.open);
        assert.lengthOf(session.history.steps, history + 1);
        assert.strictEqual(session.data.sources({ staged: true }).find((s) => s.key === a)?.state, "built");
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes + 1, "A-9 is a new account");
        assert.strictEqual(session.data.node("A-2")?.holder, "Bo", "keep: the held value stays");
        await session.undo();
        assert.strictEqual(session.data.sources({ staged: true }).find((s) => s.key === a)?.state, "staged");
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes);
        await session.redo();
        assert.strictEqual(session.data.store.getSnapshot().ids.size, nodes + 1);
        session.dispose();
    });

    it("while a draft is open: undo and other data writes are refused; the staged source it adds may still change", async () => {
        const { session, t } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id" });
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const details = await refused(() => session.undo(), "E_DRAFT_OPEN");
        assert.strictEqual(details.draft, d.id);
        await refused(() => session.redo(), "E_DRAFT_OPEN");
        await refused(() => Promise.resolve(d.setMapping(t, { type: "x" })), "E_DRAFT_OPEN");
        d.setMapping(a, { type: "account" });
        assert.include(
            d
                .types()
                .find((type) => type.name === "account")
                ?.rules.map((r) => r.source) ?? [],
            a,
            "the staged source's type is written as its rule",
        );
        // A note goes ahead.
        session.notes.add({ text: "check", targets: [{ node: "A-1" }] });
        assert.strictEqual(session.notes.list().length, 1);
        // A second draft, and every data write, are refused.
        await refused(() => Promise.resolve(session.data.draft()), "E_DRAFT_OPEN");
        await refused(
            () => session.data.declareType({ name: "x", kind: "node", rules: [{ source: t }] }),
            "E_DRAFT_OPEN",
        );
        await refused(() => session.data.stage(ACCOUNTS_CSV, { key: "account_id" }), "E_DRAFT_OPEN");
        await refused(() => session.data.addNodes([{ id: "z" }]), "E_DRAFT_OPEN");
        await refused(() => session.data.removeSource(t), "E_DRAFT_OPEN");
        assert.strictEqual(session.data.currentDraft(), d);
        d.dispose();
        assert.isNull(session.data.currentDraft());
        await session.data.addNodes([{ id: "z" }]);
        assert.isDefined(session.data.node("z"), "writes go ahead once the draft is discarded");
        session.dispose();
    });

    it("refutes: the staged-section edits mock 05 shows are refused while a preview is open", async () => {
        const { session } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id" });
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        d.setMapping(a, { type: "account" });
        assert.isAbove(d.steps().length, 0);
        d.dispose();
        session.dispose();
    });

    it("refutes: a split draft cannot rename columns or add type rules", async () => {
        const { session, t } = await phase1();
        const d = session.data.draft();
        d.moveColumns(t, { columns: ["holder_name"], to: "source" });
        d.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
        d.declareType({
            name: "atm",
            kind: "node",
            rules: [{ source: t, end: "target", column: "category", values: ["atm"] }],
        });
        d.setMapping(t, { edges: { weightMeaning: "strength" } });
        await d.commit();
        assert.strictEqual(session.data.node("A-1")?.holder, "Ann");
        session.dispose();
    });

    it("settled (3.3): repeated absent means first, differing rows counted; both is refused off join.edges", async () => {
        const { session } = await phase1();
        // Two rows of one edge file name account A-1 with different tiers.
        const v = await edgeFile(
            session,
            "txn_id,account_id,merchant_id,tier\nV-1,A-1,M-1,gold\nV-2,A-1,M-2,silver",
            "v.csv",
            "merge",
        );
        const d = session.data.draft();
        d.moveColumns(v, { columns: ["tier"], to: "source" });
        const values = d
            .steps()
            .map((s) => s.op === "join.node-values")
            .lastIndexOf(true);
        assert.strictEqual(d.steps()[values]?.buckets?.rowsDiffer, 1);
        await refused(() => Promise.resolve(d.editStep(values, { repeated: "both" })), "E_BAD_COMMAND");
        await refused(
            () =>
                Promise.resolve(
                    d.merge({
                        from: { source: v, field: "account_id" },
                        into: { space: "account" },
                        repeated: "both" as never,
                    }),
                ),
            "E_BAD_COMMAND",
        );
        await d.commit();
        assert.strictEqual(session.data.node("A-1")?.tier, "gold");
        session.dispose();
    });

    it("a merge counts the keys source 2's rows repeat, folds the first by default and the last when asked", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "badge,dept\nB1,Ops\nB2,Lab"), { key: "badge", type: "person" });
        const people = session.data.sources()[0]?.key ?? "";
        // Two alerts name B1, with different departments.
        const hr = await session.data.stage(csv("hr.csv", "badge,dept\nB1,Operations\nB1,Research\nB2,Lab"), {
            key: "badge",
        });
        const merged = async (repeated?: "last"): Promise<unknown> => {
            const d = session.data.draft();
            d.merge({ from: { source: hr, field: "badge" }, into: { source: people } });
            const merge = d.steps().find((s) => s.op === "join.merge")?.index ?? -1;
            const row = d.preview().steps.find((s) => s.index === merge)?.buckets;
            assert.strictEqual(row?.repeated2, 1, "B1 is held by two of hr.csv's rows");
            assert.strictEqual(row?.keptNew, 0, "every hr.csv node meets its person");
            d.editStep(merge, { clash: { dept: "overwrite" }, ...(repeated === undefined ? {} : { repeated }) });
            await d.commit();
            const dept = session.data.node("B1")?.dept;
            await session.undo();
            return dept;
        };
        assert.strictEqual(await merged(), "Operations", "the first row by default");
        assert.strictEqual(await merged("last"), "Research", "the last row once asked");
        session.dispose();
    });

    it("editStep sets a step's choices and takes them off again; setMapping refuses a reserved space", async () => {
        const { session, a } = await renamedAndStaged();
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const i = d.steps().findIndex((s) => s.op === "join.merge");
        const merged = (): number | undefined => d.steps()[i]?.buckets?.merged;
        d.editStep(i, { except: { column: "account_id", values: ["A-2"] } });
        assert.strictEqual(merged(), 1);
        d.editStep(i, { except: null });
        assert.strictEqual(merged(), 2);
        d.editStep(i, { off: true });
        assert.isTrue(d.steps()[i]?.off);
        d.editStep(i, { off: false });
        assert.isFalse(d.steps()[i]?.off);
        assert.strictEqual(merged(), 2);
        const details = await refused(() => Promise.resolve(d.editStep(99, { off: true })), "E_BAD_COMMAND");
        assert.strictEqual(details.reason, "no-step");
        await refused(() => Promise.resolve(d.setMapping(a, { space: "graph:x" })), "E_SPACE_RESERVED");
        d.dispose();
        session.dispose();
    });

    it("3.10: a numeric rule on a text column is refused with E_CLASH_RULE_TYPE", async () => {
        const { session, b } = await two();
        const d = session.data.draft();
        const details = await refused(
            () => Promise.resolve(d.editStep(stepOf(session, b), { clash: { name: "max" } })),
            "E_CLASH_RULE_TYPE",
        );
        assert.strictEqual(details.column, "name");
        d.dispose();
        session.dispose();
    });

    it("3.10: picks in a draft commit with it as one undo step, each a reader edit naming its source", async () => {
        const { session, b } = await two();
        const d = session.data.draft();
        d.pick(P1, "name", b);
        d.undo();
        assert.lengthOf(d.edits(), 0, "draft undo removes the pick");
        d.pick(P1, "amt", b);
        d.use(P2, "amt", b);
        await d.commit();
        assert.strictEqual(session.data.values(P1, "amt")?.shown, 30);
        assert.deepStrictEqual(
            session.data.edits().map((x) => x.picked),
            [b, b],
        );
        assert.lengthOf(session.data.conflicts({ column: "amt", only: "decided" }), 2);
        await session.undo();
        assert.strictEqual(session.data.values(P1, "amt")?.shown, 10, "one undo step takes both picks back");
        session.dispose();
    });

    it("deleting a Merge's two steps returns accounts.csv to staged, and Add then meets the accounts as before", async () => {
        const accounts = (session: GraphSession): number => session.data.count({ type: "account" }).nodes;
        const fresh = await phase2();
        const a1 = await fresh.session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        await fresh.session.data.add(a1);
        const expected = accounts(fresh.session);
        fresh.session.dispose();

        const { session } = await phase2();
        const a2 = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        await session.data.merge({ from: { source: a2, field: "account_id" }, into: { space: "account" } });
        const del = async (op: string): Promise<void> => {
            const d = session.data.draft();
            d.removeStep(session.data.steps().findIndex((s) => s.op === op && s.source === a2));
            await d.commit();
        };
        await del("join.merge");
        await del("join.add");
        assert.strictEqual(session.data.sources({ staged: true }).find((s) => s.key === a2)?.state, "staged");
        await session.data.add(a2);
        assert.strictEqual(accounts(session), expected);
        session.dispose();
    });

    it("4.4 + 3.10: renaming a column in every source keeps its conflict rule, through save and reopen", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("crm.csv", "id,amt\np1,10"), { key: "id", type: "person" });
        const a = session.data.sources({ staged: true })[0]?.key ?? "";
        const b = await session.data.stage(csv("erp.csv", "id,amt\np1,30"), { key: "id", type: "person" });
        await session.data.add(b, { overlap: "merge" });
        const d = session.data.draft();
        d.editStep(stepOf(session, b), { clash: { amt: "max" } });
        await d.commit();
        assert.strictEqual(session.data.values(P1, "amt")?.shown, 30, "max of 10 and 30");
        const r = session.data.draft();
        r.renameColumn({ kind: "node", name: "amt" }, "amount", { source: a });
        r.renameColumn({ kind: "node", name: "amt" }, "amount", { source: b });
        await r.commit();
        assert.strictEqual(session.data.values(P1, "amount")?.shown, 30, "the rule follows the rename");
        const { text } = await session.project.save();
        const opened = createGraphSession({ features: ["source-steps"] });
        await opened.project.open(text);
        assert.strictEqual(opened.data.values(P1, "amount")?.shown, 30, "and survives save and reopen");
        session.dispose();
        opened.dispose();
    });

    it("4.4: renaming a column onto a name its own table carries is refused with name-taken", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("fx.csv", "id,amount,amount_eur\np1,10,9\np2,20,18"), {
            key: "id",
            type: "payment",
        });
        const s = session.data.sources({ staged: true })[0]?.key ?? "";
        const before = (await session.project.save()).text;
        const d = session.data.draft();
        const details = await refused(
            () => Promise.resolve(d.renameColumn({ kind: "node", name: "amount_eur" }, "amount", { source: s })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(details.reason, "name-taken");
        d.dispose();
        assert.deepStrictEqual([session.data.node("p1")?.amount, session.data.node("p1")?.amount_eur], [10, 9]);
        assert.strictEqual((await session.project.save()).text.length, before.length);
        session.dispose();
    });

    it("Rename (4.4): a column an end or a step reads refuses it; a value column takes its reader edits along", async () => {
        const { session, t } = await phase2();
        const d = session.data.draft();
        await refused(
            () => Promise.resolve(d.renameColumn({ kind: "edge", name: "account_id" }, "acct", { source: t })),
            "E_EDIT_ROLE_COLUMN",
        );
        await refused(
            () => Promise.resolve(d.renameColumn({ kind: "edge", name: "device_id" }, "dev", { source: t })),
            "E_EDIT_ROLE_COLUMN",
        );
        d.dispose();
        const edge = session.data.edges().find((e) => e.txn_id === "T-4");
        await session.data.updateEdges([{ id: edge?.id as never, values: { category: "cash" } }]);
        const r = session.data.draft();
        r.renameColumn({ kind: "edge", name: "category" }, "kind", { source: t });
        await r.commit();
        assert.strictEqual(session.data.edits().at(-1)?.column, "kind");
        assert.strictEqual(session.data.edges().find((e) => e.txn_id === "T-4")?.kind, "cash");
        session.dispose();
    });
    it("7.12: removing a source in a draft takes its section filters with it, and one Undo brings both back", async () => {
        const { session, a } = await phase6();
        await session.visibility.addCondition({
            effect: "keep",
            source: a,
            rule: { kind: "categories", attribute: "data.opened", values: ["2020"] },
        });
        const d = session.data.draft();
        d.removeSource(a);
        await d.commit();
        assert.notInclude(
            session.data.sources({ staged: true }).map((s) => s.key),
            a,
        );
        assert.lengthOf(
            session.visibility.conditions.filter((c) => c.source === a),
            0,
            "its section filter goes with it",
        );
        assert.notInclude((await session.project.save()).text, a);
        await session.undo();
        assert.include(
            session.data.sources({ staged: true }).map((s) => s.key),
            a,
        );
        assert.lengthOf(
            session.visibility.conditions.filter((c) => c.source === a),
            1,
            "one Undo brings the filter back",
        );
        session.dispose();
    });

    it("a file imported through a draft keeps the direction it declares, as data.import does", async () => {
        const gml = "graph [ node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 ] ]";
        const door = createGraphSession({ features: ["source-steps"] });
        await door.data.import({ type: "gml", config: { data: gml } });
        const drafted = createGraphSession({ features: ["source-steps"] });
        const d = drafted.data.draft();
        await d.import({ type: "gml", config: { data: gml } });
        await d.commit();
        assert.strictEqual(drafted.data.edges().length, 1);
        assert.strictEqual(drafted.status.directed, door.status.directed);
        assert.isFalse(drafted.status.directed);
        door.dispose();
        drafted.dispose();
    });
});
