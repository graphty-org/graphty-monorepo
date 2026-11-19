/**
 * @file Removal, replace and refresh as rebuilds under the source-steps experiment (design
 * design/data/multiple-data-sources-design.md, sections 3.2, 3.10 and 7.12), ported from the
 * reference model's cases: roundtrips "refresh T", "refresh with identical rows mints no build"
 * (the blocking half adapted to a held step), "replace keeps the source id" and "remove a source";
 * copy-reference-and-conflicts "refresh -- a pick follows, keeps or stays silent"; keep-edit;
 * review round 6 "editing one cell twice, then refreshing"; settled mechanisms "refresh (7.12)";
 * review round 7 run-stale (the half with no held source); late findings settled 3.2 "only Undo
 * binds a removed source" and confirms 7.9 "removing a source keeps Use values";
 * type-rules-and-untyped-sources "replace that drops a type rule" and "a part deleted with its
 * step is not reused" (in-session half); review round 10 "a refresh of transactions.csv moves bank B";
 * remove-source-1-merge-drop.
 */

import { assert, describe, it } from "vitest";

import { defineSource, registerSource } from "../../../session";
import { createGraphSession, type GraphSession, type SourceRefreshIssue } from "../../../src/session";
import { sessionWithRuns } from "../../helpers/project-session";
import { ACCOUNTS, BANK_B, edgeFile, phase1, phase2, phase6, spaces, TRANSACTIONS } from "./scenario";

/** The column the transactions carry the account holder in. */
const HOLDER = "holder_name";

/** The people a mutable network source serves; a test changes it between a load and a refresh. */
let people: { id: string; name: string; knows: string[] }[] = [];

registerSource(
    defineSource({
        id: "steps-people-live",
        descriptor: { plainName: "People (live)", params: [] },
        records: () => {
            const nodes = people.map(({ id, name }) => ({ id, name }));
            const edges = people.flatMap(({ id, knows }) => knows.map((other) => ({ source: id, target: other })));
            return Promise.resolve({ nodes, edges });
        },
    }),
);

/**
 * A CSV input.
 * @param data - The CSV text.
 * @param name - Its name.
 * @returns What `import` and `replaceSource` take.
 */
function csv(data: string, name = "transactions.csv"): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * The codes of a report's issues.
 * @param issues - The issues.
 * @returns Their codes.
 */
const codes = (issues: readonly SourceRefreshIssue[] | undefined): string[] => (issues ?? []).map((i) => i.code);

/**
 * The session edge id of a transaction.
 * @param session - The session.
 * @param txn - The transaction's id.
 * @returns The edge id.
 */
function edgeOf(session: GraphSession, txn: string): string {
    const edge = session.data.edges().find((e) => e.txn_id === txn);
    assert.isDefined(edge, `edge ${txn}`);
    return edge?.id ?? "";
}

/**
 * Everything the graph holds, in a stable order: what two equal builds share.
 * @param session - The session.
 * @returns The nodes and edges as text.
 */
function digest(session: GraphSession): string {
    const nodes = session.data
        .nodes()
        .map((n) => JSON.stringify(n))
        .sort();
    const edges = session.data
        .edges()
        .map(({ id: _id, ...rest }) => JSON.stringify(rest))
        .sort();
    return JSON.stringify({ nodes, edges });
}

describe("source-steps: removal as a rebuild", () => {
    it("removing a source gives back exactly the graph that never had it, and lists the steps it took", async () => {
        const never = await phase2();
        await never.session.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: never.t });
        const { session, a } = await phase6();
        const before = digest(session);
        const history = session.history.steps.length;
        const result = await session.data.removeSource(a);
        assert.strictEqual(digest(session), digest(never.session), "the graph without accounts.csv");
        assert.deepStrictEqual(codes(result.issues), ["W_STEP_REMOVED", "W_STEP_REMOVED"], "its join.add and merge");
        assert.strictEqual(result.removed.nodes, 1, "A-9 only accounts.csv supplied");
        assert.strictEqual(result.kept.nodes, 2, "A-1 and A-2 the transactions also supply");
        assert.lengthOf(session.history.steps, history + 1, "one undo step");
        await session.undo();
        assert.strictEqual(digest(session), before, "undo gives the source back");
        never.session.dispose();
        session.dispose();
    });

    it("removing a source takes its section's filters with it, and one Undo brings both back (7.12)", async () => {
        const { session, a, t } = await phase6();
        await session.visibility.addCondition({
            id: "fa",
            effect: "keep",
            rule: { kind: "range", attribute: "data.opened", min: 2021 },
            source: a,
        });
        await session.visibility.addCondition({
            id: "ft",
            effect: "keep",
            rule: { kind: "range", attribute: "data.amount", min: 0 },
            source: t,
        });
        const history = session.history.steps.length;
        await session.data.removeSource(a);
        assert.deepStrictEqual(
            session.visibility.conditions.map((c) => c.id),
            ["ft"],
            "only the removed source's filter goes",
        );
        assert.lengthOf(session.history.steps, history + 1, "one undo step");
        await session.undo();
        assert.deepStrictEqual(session.visibility.conditions.map((c) => c.id).sort(), ["fa", "ft"]);
        assert.isDefined(
            session.data.sources().find((s) => s.key === a),
            "the source is back too",
        );
        session.dispose();
    });

    it("removing the transactions after a merge that drops what meets no account keeps accounts.csv's nodes", async () => {
        const { session, t, a } = await phase6("drop");
        const supplied = (): number => session.data.sources().find((s) => s.key === a)?.counts.nodes ?? 0;
        assert.isAbove(supplied(), 0);
        await session.data.removeSource(t);
        assert.strictEqual(supplied(), 3, "every account of accounts.csv");
        session.dispose();
    });

    it("removing a staged source is one undo step", async () => {
        const { session } = await phase2();
        const m = await session.data.stage(csv("merchant_id,city\nM-1,Oslo\n", "m.csv"), { key: "merchant_id" });
        const history = session.history.steps.length;
        await session.data.removeSource(m);
        assert.lengthOf(session.history.steps, history + 1);
        session.dispose();
    });

    it("removing a source keeps the values the reader took from it with Use, as the reader's (7.9)", async () => {
        const { session, a } = await phase6();
        const ref = { space: "account", key: "A-2" };
        await session.data.use(ref, "holder", a);
        assert.strictEqual(session.data.values(ref, "holder")?.shown, "Bob");
        await session.data.removeSource(a);
        const v = session.data.values(ref, "holder");
        assert.deepStrictEqual([v?.shown, v?.origin], ["Bob", "reader"]);
        session.dispose();
    });

    it("a note on a node only the removed source supplied goes missing, and only Undo binds it again (3.2)", async () => {
        const { session, a } = await phase6();
        const id = session.notes.add({ text: "check", targets: [{ node: "A-9" }] });
        const result = await session.data.removeSource(a);
        assert.deepStrictEqual(
            (result.issues ?? []).filter((i) => i.code === "W_REFERENCE_UNBOUND").map((i) => i.params),
            [{ ref: { space: "account", key: "A-9" } }],
        );
        assert.strictEqual(session.notes.status(id).targets[0].state, "missing");
        await session.undo();
        assert.strictEqual(session.notes.status(id).targets[0].state, "present");
        session.dispose();
    });

    it("a fixed set member only the removed source supplied is reported unbound, and Undo binds it again (3.2)", async () => {
        const { session, a } = await phase6();
        session.sets.create({ kind: "fixed", nodes: ["A-9"], reading: "induced" }, { name: "Core" });
        const unbound = (issues?: readonly SourceRefreshIssue[]): unknown[] =>
            (issues ?? []).filter((i) => i.code === "W_REFERENCE_UNBOUND").map((i) => i.params);
        const result = await session.data.removeSource(a);
        assert.deepStrictEqual(unbound(result.issues), [{ ref: { space: "account", key: "A-9" } }]);
        await session.undo();
        const again = await session.data.removeSource(a);
        assert.deepStrictEqual(unbound(again.issues), [{ ref: { space: "account", key: "A-9" } }], "bound again");
        session.dispose();
    });

    it("a run whose node parameter names a node only the removed source supplied is reported unbound (3.2)", async () => {
        const { session, a } = await phase6(undefined, sessionWithRuns(["source-steps"]));
        await session.runs.start("bfs", { source: "A-9" }, { style: false });
        const result = await session.data.removeSource(a);
        assert.deepStrictEqual(
            (result.issues ?? []).filter((i) => i.code === "W_REFERENCE_UNBOUND").map((i) => i.params),
            [{ ref: { space: "account", key: "A-9" } }],
        );
        session.dispose();
    });
});

describe("source-steps: replace and refresh keep the source id and swap the copy", () => {
    it("a replace asking to read the copy by another key is refused, not read the old way; its own key is taken", async () => {
        const { session, a } = await phase6();
        const history = session.history.steps.length;
        let code: unknown;
        try {
            await session.data.replaceSource(a, csv(ACCOUNTS, "accounts.csv"), { key: "email" });
        } catch (error) {
            code = [(error as { code?: string }).code, (error as { details?: { reason?: string } }).details?.reason];
        }
        assert.deepStrictEqual(code, ["E_UNSUPPORTED", "later"]);
        assert.lengthOf(session.history.steps, history, "nothing written");
        const same = await session.data.replaceSource(a, csv(ACCOUNTS.replace("a@x", "new@x"), "accounts.csv"), {
            key: "account_id",
        });
        assert.strictEqual(same.nodes.changed, 1);
        session.dispose();
    });

    it("a replace that drops a column a style layer reads reports the layer as unbound", async () => {
        const { session, t } = await phase2();
        const layer = await session.styles.add({
            name: "Big",
            target: "edge",
            selector: { match: "expression", where: "data.amount > `5`" },
            set: { "edge.color": "#0000ff" },
        });
        const [head, ...rows] = TRANSACTIONS.split("\n");
        const drop = (line: string): string =>
            line
                .split(",")
                .filter((_, at) => at !== 3)
                .join(",");
        const report = await session.data.replaceSource(t, csv([head, ...rows].map(drop).join("\n")));
        assert.deepStrictEqual(report.unbound, [
            { code: "style-layer", params: { layer: layer.id, kind: "edge", column: "amount" } },
        ]);
        session.dispose();
    });

    it("refresh T: unchanged rows keep their references; removed rows unbind; edits report their states", async () => {
        const { session, t } = await phase2();
        const t3 = edgeOf(session, "T-3");
        const kept = session.notes.add({ text: "re-sorted", targets: [{ edge: t3 }] });
        const gone = session.notes.add({ text: "removed", targets: [{ edge: edgeOf(session, "T-2") }] });
        await session.data.updateEdges([{ id: edgeOf(session, "T-2"), values: { flag: "review" } }]);
        await session.data.updateNodes([{ id: "A-3", values: { [HOLDER]: "Edited Name" } }]);
        const [head, ...rows] = TRANSACTIONS.split("\n");
        const changed = rows
            .filter((r) => !r.startsWith("T-2,"))
            .map((r) => (r.startsWith("T-4,") ? r.replace(",Cy,", ",Cyd,") : r))
            .reverse();
        const report = await session.data.replaceSource(t, csv([head, ...changed].join("\n")));
        assert.strictEqual(report.edges.removed, 1, "T-2");
        assert.deepStrictEqual(
            (report.issues ?? []).filter((i) => i.code === "W_REFERENCE_UNBOUND").map((i) => i.params.ref),
            [{ load: t, key: "T-2" }],
            "the note and the edit on the removed row unbind, reported once for the row",
        );
        assert.strictEqual(
            session.notes.status(gone).targets[0].state,
            "missing",
            "an unbound note is kept and listed",
        );
        assert.strictEqual(session.notes.status(kept).targets[0].state, "present", "the re-sorted row still binds");
        const moved = report.issues?.find((i) => i.code === "W_EDIT_SOURCE_CHANGED");
        assert.deepStrictEqual(moved?.params, { edit: session.data.edits()[1].id, was: "Cy", now: "Cyd" });
        assert.deepStrictEqual(
            session.data.edits().map((e) => e.state),
            ["lost", "source-changed"],
        );
        assert.strictEqual(session.data.values({ space: "account", key: "A-3" }, "holder_name")?.shown, "Edited Name");
        assert.strictEqual(edgeOf(session, "T-3"), t3, "re-sorted rows never re-key an edge with an edge id");
        assert.strictEqual(session.data.sources().find((s) => s.key === t)?.key, t);
        session.dispose();
    });

    it("identical rows record no step; a step whose column vanished is held until a column is picked", async () => {
        const { session, t } = await phase2();
        const history = session.history.steps.length;
        const same = await session.data.replaceSource(t, csv(TRANSACTIONS));
        assert.lengthOf(session.history.steps, history, "identical rows mint no build");
        assert.deepStrictEqual(
            [same.nodes, same.edges],
            [
                { added: 0, removed: 0, changed: 0 },
                { added: 0, removed: 0, changed: 0 },
            ],
        );

        const report = await session.data.replaceSource(t, csv(TRANSACTIONS.replace("merchant_name", "shop_name")));
        const missing = report.issues?.filter((i) => i.code === "E_COLUMN_MISSING") ?? [];
        assert.lengthOf(missing, 1);
        assert.strictEqual(missing[0].params.column, "merchant_name");
        assert.include(codes(report.issues), "W_COLUMN_UNUSED");
        const index = missing[0].params.step ?? -1;
        assert.isTrue(session.data.steps()[index].off, "held: kept, listed, not built");
        assert.isUndefined(session.data.values({ space: "merchant", key: "M-1" }, "merchant_name")?.shown ?? undefined);
        await session.data.resolveStep(index, { column: "shop_name" });
        assert.isFalse(session.data.steps()[index].off);
        assert.deepStrictEqual(session.data.steps()[index].missing, []);
        assert.strictEqual(
            session.data.values({ space: "merchant", key: "M-1" }, "merchant_name")?.shown,
            "Shop",
            "the picked column takes the vanished working name",
        );

        await session.data.replaceSource(t, csv(TRANSACTIONS.replace("device_id", "dev")));
        assert.isUndefined(spaces(session).device, "the device steps are held");
        assert.isTrue(
            session.data.steps().some((s) => s.off && s.missing.length > 0),
            "an off step is kept and listed",
        );
        // The column comes back: the held steps are built again.
        await session.data.replaceSource(t, csv(TRANSACTIONS));
        assert.strictEqual(spaces(session).device, 2);
        session.dispose();
    });

    it("replace keeps the source id and the session ids of unchanged edges", async () => {
        const { session, t } = await phase1();
        const t1 = edgeOf(session, "T-1");
        const history = session.history.steps.length;
        await session.data.replaceSource(t, csv(TRANSACTIONS.replace("T-4,A-3,M-3,7", "T-4,A-3,M-3,8"), "week47.csv"));
        assert.deepStrictEqual(
            session.data.sources().map((s) => s.key),
            [t],
        );
        assert.strictEqual(session.data.sources()[0].name, "week47.csv");
        assert.strictEqual(edgeOf(session, "T-1"), t1);
        assert.lengthOf(session.history.steps, history + 1, "one undo step");
        await session.undo();
        assert.strictEqual(session.data.edges().find((e) => e.txn_id === "T-4")?.amount, 7);
        session.dispose();
    });

    it("7.12: a replace bringing a column under a renamed column's name is refused until one is renamed", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("id,amount_eur\np1,9\np2,18", "fx.csv"), { key: "id", type: "payment" });
        const [s] = session.data.sources();
        await session.data.renameColumn({ kind: "node", name: "amount_eur" }, "amount", { source: s.key });
        const newer = csv("id,amount,amount_eur\np1,10,9\np2,20,18", "fx.csv");
        const error = await session.data.replaceSource(s.key, newer).then(
            () => null,
            (e: unknown) => e as { code?: string; details?: Record<string, unknown> },
        );
        assert.strictEqual(error?.code, "E_BAD_COMMAND");
        assert.deepInclude(error?.details, { reason: "name-taken", column: "amount", table: "nodes" });
        assert.deepStrictEqual(session.data.node("p1"), { id: "p1", amount: 9 }, "the graph is left as it was");

        const old = "amount_eur_old";
        await session.data.renameColumn({ kind: "node", name: "amount" }, old, { source: s.key });
        await session.data.replaceSource(s.key, newer);
        assert.deepInclude(session.data.node("p1"), { amount: 10, [old]: 9 });
        session.dispose();
    });

    it("reloadSource reads the source again from what it was read from", async () => {
        const { session, t } = await phase1();
        const history = session.history.steps.length;
        const report = await session.data.reloadSource(t, {});
        assert.deepStrictEqual(report.edges, { added: 0, removed: 0, changed: 0 });
        assert.lengthOf(session.history.steps, history, "the same rows record no step");
        session.dispose();
    });

    it("a type rule whose column the replacement drops is reported with E_COLUMN_MISSING", async () => {
        const { session, t } = await phase1();
        await session.data.declareType({
            name: "cash",
            kind: "edge",
            rules: [{ source: t, column: "category", values: ["atm"] }],
        });
        const [head, ...rest] = TRANSACTIONS.split("\n");
        const report = await session.data.replaceSource(
            t,
            csv([head.replace("category", "merchant_category"), ...rest].join("\n")),
        );
        const miss = report.issues?.find((i) => i.code === "E_COLUMN_MISSING" && i.params.type === "cash");
        assert.strictEqual(miss?.code === "E_COLUMN_MISSING" && miss.params.column, "category");
        session.dispose();
    });

    it("refresh (7.12): a vanished weight role holds its step, and None clears the role", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv(TRANSACTIONS), {
            mapping: { rowsAre: "edges", source: "account_id", target: "merchant_id", weight: "amount" },
        });
        const [{ key: t }] = session.data.sources();
        assert.include(session.data.steps()[0].reads, "amount");
        const report = await session.data.replaceSource(t, csv(TRANSACTIONS.replace("amount", "total")));
        const role = report.issues?.find((i) => i.code === "E_READ_ROLE_MISSING");
        assert.deepStrictEqual(
            [role?.params.column, role?.code === "E_READ_ROLE_MISSING" && role.params.role],
            ["amount", "weight"],
        );
        assert.lengthOf(session.data.edges(), 0, "the held join.add builds nothing");
        await session.data.resolveStep(0, { none: true });
        assert.lengthOf(session.data.edges(), 4);
        assert.notInclude(session.data.steps()[0].reads, "amount");
        session.dispose();
    });

    it("refresh (7.12): a step translating through the replaced source checks its columns too", async () => {
        const { session, a } = await phase6();
        const k = await session.data.stage(csv("alert_id,email\nK-1,a@x\n", "kyc.csv"), { key: "alert_id" });
        await session.data.merge({ from: { source: k, field: "email" }, into: { source: a, field: "email" } });
        const report = await session.data.replaceSource(a, csv("account_id,holder\nA-1,Ann\n", "accounts.csv"));
        const viaMissing = report.issues?.find(
            (i) => i.code === "E_COLUMN_MISSING" && i.params.column === "email" && i.params.source === a,
        );
        assert.isDefined(viaMissing, "another source's join through accounts.csv's rows is held");
        session.dispose();
    });

    it("a part deleted with its step is not reused by the next Extract", async () => {
        const { session, t, part } = await phase2();
        const held = session.data
            .steps()
            .filter((s) => s.buckets?.part === part || (s.op === "join.node-values" && s.reads.includes("device_id")))
            .map((s) => s.index)
            .reverse();
        for (const index of held) {
            await session.data.removeStep(index);
        }
        const next = await session.data.extract(t, { column: "os", type: "platform" });
        assert.isAbove(next, part);
        session.dispose();
    });

    it("a refresh of transactions.csv that names a bank B account moves it to named-only for bank B", async () => {
        const { session, t } = await phase2();
        const b = await edgeFile(session, BANK_B, "bankB.csv", "merge");
        const named = (): number => session.data.sources().find((s) => s.key === b)?.named ?? 0;
        const before = named();
        await session.data.replaceSource(t, csv(`${TRANSACTIONS}\nT-5,B-7,M-1,3,Bea,Shop,food,,`));
        assert.strictEqual(named(), before + 1, "B-7 is supplied by the transactions now");
        session.dispose();
    });
});

describe("source-steps: reader edits after a refresh", () => {
    const S1 = "id,name,amt\np1,Anne,10\np2,Bo,20";
    const S2 = "id,name,amt\np1,Ann,30\np2,Bob,40";
    const P1 = { space: "person", key: "p1" };
    const P2 = { space: "person", key: "p2" };

    /**
     * Two person files, the second merged into the first.
     * @returns The session and the second file's source.
     */
    async function two(): Promise<{ session: GraphSession; crm: string; erp: string }> {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv(S1, "crm.csv"), { type: "person" });
        const [{ key: crm }] = session.data.sources();
        const erp = await session.data.stage(csv(S2, "erp.csv"), { key: "id", type: "person" });
        await session.data.merge({ from: { source: erp, field: "id" }, into: { space: "person" } });
        return { session, crm, erp };
    }

    it("3.10: a pick follows, keeps or stays silent by the source it picked", async () => {
        const { session, crm, erp } = await two();
        await session.data.use(P1, "name", erp);
        await session.data.use(P2, "amt", crm);
        const report = await session.data.replaceSource(erp, csv("id,name,amt\np1,Annie,30\np2,Bo,99", "erp.csv"));
        const moved = report.issues?.filter((i) => i.code === "W_EDIT_SOURCE_CHANGED") ?? [];
        assert.lengthOf(moved, 1, "the crm pick does not ask: its value did not move");
        assert.strictEqual(moved[0].code === "W_EDIT_SOURCE_CHANGED" && moved[0].params.picked, erp);
        const [first] = session.data.edits();
        assert.strictEqual(first.state, "source-changed");
        await session.data.settleEdit(first.id, "follow");
        assert.strictEqual(session.data.values(P1, "name")?.shown, "Annie", "Follow takes the new value");
        assert.strictEqual(String(session.data.values(P2, "amt")?.shown), "20");

        await session.data.replaceSource(erp, csv("id,name,amt\np1,Ana,30\np2,Bo,99", "erp.csv"));
        await session.data.settleEdit(session.data.edits()[0].id, "keep");
        assert.strictEqual(session.data.values(P1, "name")?.shown, "Annie", "Keep: the value stays");
        assert.isUndefined(session.data.edits()[0].picked, "now the reader's own");
        assert.strictEqual(session.data.edits()[0].state, "applies");
        session.dispose();
    });

    it("Follow is refused on a typed edit; Drop takes an edit back", async () => {
        const { session, erp } = await two();
        await session.data.updateNodes([{ id: "p1", values: { name: "Mine" } }]);
        const [edit] = session.data.edits();
        await session.data.settleEdit(edit.id, "follow").then(
            () => assert.fail("a typed edit has no picked source to follow"),
            (error: unknown) => assert.strictEqual((error as { code?: string }).code, "E_BAD_COMMAND"),
        );
        await session.data.replaceSource(erp, csv("id,name,amt\np1,Ann,31\np2,Bob,40", "erp.csv"));
        await session.data.settleEdit(edit.id, "drop");
        assert.lengthOf(session.data.edits(), 0);
        assert.strictEqual(session.data.values(P1, "name")?.shown, "Anne");
        session.dispose();
    });

    it("Keep edit settles the edit: a later identical refresh reports no W_EDIT_SOURCE_CHANGED", async () => {
        const { session, a } = await phase6();
        await session.data.updateNodes([{ id: "A-1", values: { email: "reader@x" } }]);
        const changed = csv(ACCOUNTS.replace("a@x", "new@x"), "accounts.csv");
        const first = await session.data.replaceSource(a, changed);
        assert.include(codes(first.issues), "W_EDIT_SOURCE_CHANGED");
        await session.data.settleEdit(session.data.edits()[0].id, "keep");
        const again = await session.data.replaceSource(a, changed);
        assert.notInclude(codes(again.issues), "W_EDIT_SOURCE_CHANGED");
        session.dispose();
    });

    it("7.12: editing one cell twice, then refreshing the unchanged file, reports no source change", async () => {
        const { session, t } = await phase1();
        const id = edgeOf(session, "T-1");
        await session.data.updateEdges([{ id, values: { category: "food2" } }]);
        await session.data.updateEdges([{ id, values: { category: "groceries" } }]);
        const report = await session.data.replaceSource(t, csv(TRANSACTIONS));
        assert.notInclude(codes(report.issues), "W_EDIT_SOURCE_CHANGED");
        assert.deepStrictEqual(
            session.data.edits().map((e) => e.state),
            ["applies", "applies"],
        );
        session.dispose();
    });
});

describe("source-steps: runs bind to the build they read (8.6)", () => {
    it("a refresh that changes the rows makes a run stale, and refreshing back to its rows keeps it stale", async () => {
        const session = sessionWithRuns(["source-steps"]);
        const t = await edgeFile(session, TRANSACTIONS, "transactions.csv");
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        assert.isNull(session.runs.get(run.id)?.stale);
        await session.data.replaceSource(t, csv(TRANSACTIONS.replace("T-4,A-3,M-3", "T-4,A-3,M-9")));
        assert.strictEqual(session.runs.get(run.id)?.stale?.reason, "data-changed");
        await session.data.replaceSource(t, csv(TRANSACTIONS));
        assert.strictEqual(
            session.runs.get(run.id)?.stale?.reason,
            "data-changed",
            "a later build, not the one it read",
        );
        await session.undo();
        await session.undo();
        assert.isNull(session.runs.get(run.id)?.stale, "undo gives back the build it read");
        session.dispose();
    });
});

describe("source-steps: a network source", () => {
    it("a refresh swaps the source's copy under the same id, as one undo step; unchanged rows record none", async () => {
        people = [
            { id: "a", name: "Ana", knows: ["b"] },
            { id: "b", name: "Bo", knows: [] },
        ];
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({ source: "steps-people-live", config: {} });
        const [load] = session.data.loads();
        const [{ key }] = session.data.sources();
        const history = session.history.steps.length;
        const same = await session.data.refresh(load.key);
        assert.strictEqual(same.fact.code, "I_SOURCE_UNCHANGED");
        assert.lengthOf(session.history.steps, history);
        people = [
            { id: "a", name: "Ann", knows: ["c"] },
            { id: "c", name: "Cy", knows: [] },
        ];
        const report = await session.data.refresh(load.key);
        assert.strictEqual(report.fact.code, "I_SOURCE_REFRESHED");
        assert.deepStrictEqual(report.added, { nodes: 1, edges: 1 });
        assert.deepStrictEqual(report.removed, { nodes: 1, edges: 1 });
        assert.deepStrictEqual(
            session.data.sources().map((s) => s.key),
            [key],
        );
        assert.lengthOf(session.history.steps, history + 1);
        session.dispose();
    });

    it("expand, More and Collapse are refused while another source is loaded beside the network source", async () => {
        people = [{ id: "a", name: "Ana", knows: [] }];
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({ source: "steps-people-live", config: {} });
        await session.data.import(csv("id\nz\n", "z.csv"), { mode: "merge" });
        for (const call of [
            () => session.data.expand(["a"]),
            () => session.data.more(),
            () => session.data.collapse("a"),
        ]) {
            const reason = await call().then(
                () => null,
                (error: unknown) => (error as { details?: { reason?: string } }).details?.reason,
            );
            assert.strictEqual(reason, "several-sources");
        }
        session.dispose();
    });
});
