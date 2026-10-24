/**
 * @file The column commands: `data.setRole`, `previewType`, `setType`, `renameColumn` and
 * `setHidden`, each one undo step.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { convertValue, renameColumnIn, ruleScope } from "../../src/session/columns";

const ACCOUNTS = "id,amount,opened,flagged\na,12,2024-09-01,yes\nb,N/A,2024-09-02,no\nc,7.5,2024,yes\nd,3,soon,maybe\n";
const TRANSFERS = "source,target,bait,prey\na,b,c,d\nb,c,d,a\n";

/**
 * A session holding the accounts as nodes.
 * @returns the session
 */
async function accounts(): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({ type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" });
    await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/**
 * One column's descriptor.
 * @param session - the session
 * @param name - the node column
 * @returns the descriptor
 */
function column(
    session: GraphSession,
    name: string,
): ReturnType<GraphSession["data"]["attributes"]>[number] | undefined {
    return session.data.attributes().find((each) => each.kind === "node" && each.name === name);
}

/**
 * Every node's value of one column.
 * @param session - the session
 * @param name - the column
 * @returns the values, in node order
 */
function values(session: GraphSession, name: string): unknown[] {
    return session.data.nodes().map((node) => node[name]);
}

describe("data.previewType and data.setType", () => {
    it("converts an amount column with one N/A to numbers, the N/A made blank, in one undo step", async () => {
        const session = await accounts();
        const amount = { kind: "node", name: "amount" } as const;
        const before = values(session, "amount");

        const preview = session.data.previewType(amount, "number");
        assert.strictEqual(preview.converts, 3);
        assert.strictEqual(preview.fails, 1);
        assert.deepStrictEqual(preview.examples[0], { value: "N/A", converted: null });
        assert.deepStrictEqual(values(session, "amount"), before, "a preview changes nothing");

        const steps = session.history.steps.length;
        await session.data.setType(amount, "number");
        assert.deepStrictEqual(values(session, "amount"), [12, null, 7.5, 3]);
        assert.strictEqual(column(session, "amount")?.type, "number");
        assert.strictEqual(column(session, "amount")?.measurement, "quantitative");
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepStrictEqual(session.history.steps.at(-1)?.fact, {
            code: "data.set-type",
            params: { kind: "node", column: "amount", type: "number", fails: 1 },
        });

        await session.undo();
        assert.deepStrictEqual(values(session, "amount"), before);
        assert.notStrictEqual(column(session, "amount")?.type, "number");
        session.dispose();
    });

    it("reads yes/no as booleans and dates as ISO instants, a four-digit year as its first day", async () => {
        const session = await accounts();
        assert.strictEqual(session.data.previewType({ kind: "node", name: "flagged" }, "boolean").fails, 1);
        await session.data.setType({ kind: "node", name: "flagged" }, "boolean");
        assert.deepStrictEqual(values(session, "flagged"), [true, false, true, null]);
        assert.strictEqual(column(session, "flagged")?.type, "boolean");

        await session.data.setType({ kind: "node", name: "opened" }, "date");
        assert.deepStrictEqual(values(session, "opened"), [
            "2024-09-01T00:00:00.000Z",
            "2024-09-02T00:00:00.000Z",
            "2024-01-01T00:00:00.000Z",
            null,
        ]);
        assert.strictEqual(column(session, "opened")?.type, "time");
        assert.strictEqual(column(session, "opened")?.measurement, "time");
        session.dispose();
    });

    it("refuses a type that is not one", async () => {
        const session = await accounts();
        assert.throws(
            () => session.data.previewType({ kind: "node", name: "amount" }, "money" as never),
            /text, number, boolean, date, category/u,
        );
        session.dispose();
    });
});

describe("renameColumnIn", () => {
    it("rewrites paths, expressions and templates, and leaves the same object when nothing names the column", () => {
        const encode = {
            "node.label": { template: ["{data.amount} ({data.amountish})"] },
            "node.size": { by: "data.amount" },
        };
        assert.deepStrictEqual(renameColumnIn(encode, "amount", "total"), {
            "node.label": { template: ["{data.total} ({data.amountish})"] },
            "node.size": { by: "data.total" },
        });
        const untouched = { match: "expression", where: "data.amountish > `1`" };
        assert.strictEqual(renameColumnIn(untouched, "amount", "total"), untouched);
        assert.strictEqual(
            renameColumnIn('data."my col" == `1` && data.other', "my col", "x"),
            "data.x == `1` && data.other",
        );
    });

    it("rewrites a node column outside edges leaves, and an edge column inside them and in value leaves", () => {
        const rule = {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.w", min: 1 },
                { kind: "edges", where: "data.w > `2`" },
            ],
        };
        assert.deepStrictEqual(renameColumnIn(rule, "w", "v", ruleScope("node"), true), {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.v", min: 1 },
                { kind: "edges", where: "data.w > `2`" },
            ],
        });
        // A value leaf reads whichever half carries its path, so an edge column's rename reaches it.
        assert.deepStrictEqual(renameColumnIn(rule, "w", "v", ruleScope("edge"), false), {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.v", min: 1 },
                { kind: "edges", where: "data.v > `2`" },
            ],
        });
    });

    it("converts a number to a date as milliseconds, and an object to text as JSON", () => {
        assert.deepStrictEqual(convertValue(0, "date"), { kind: "value", value: "1970-01-01T00:00:00.000Z" });
        assert.deepStrictEqual(convertValue({ a: 1 }, "text"), { kind: "value", value: '{"a":1}' });
        assert.deepStrictEqual(convertValue(true, "number"), { kind: "value", value: 1 });
        assert.deepStrictEqual(convertValue("  ", "number"), { kind: "blank" });
    });
});

describe("data.renameColumn", () => {
    it("moves the values, and a style layer and a filter still match, in one undo step", async () => {
        const session = await accounts();
        await session.data.setType({ kind: "node", name: "amount" }, "number");
        await session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "expression", where: "data.amount > `5`" },
            set: { "node.color": "#ff0000" },
            encode: { "node.size": { by: "data.amount", scale: "linear", range: [1, 3] } },
        });
        await session.visibility.set({ kind: "range", attribute: "data.amount", min: 5 });
        await session.data.setValueLabel("data.amount", 12, "Twelve");
        assert.strictEqual(session.visibility.summary.visibleNodes, 2);
        const steps = session.history.steps.length;

        await session.data.renameColumn({ kind: "node", name: "amount" }, "total amount");

        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.strictEqual(column(session, "amount"), undefined);
        assert.deepStrictEqual(values(session, "total amount"), [12, null, 7.5, 3]);
        assert.strictEqual(column(session, "total amount")?.type, "number", "the type follows");
        const layer = session.styles.list().find((each) => each.name === "Big");
        assert.deepStrictEqual(layer?.selector, { match: "expression", where: 'data."total amount" > `5`' });
        assert.strictEqual((layer?.encode?.["node.size"] as { by: string }).by, "data.total amount");
        const painted = (id: string): boolean =>
            session.styles.explain({ node: id }).contributions.some((each) => each.layerId === layer?.id);
        assert.deepStrictEqual(
            ["a", "b", "c", "d"].filter(painted),
            ["a", "c"],
            "the layer still paints the nodes over 5",
        );
        assert.deepStrictEqual(
            column(session, "total amount")?.usedBy?.map((use) => use.kind),
            ["layer"],
            "the layer reads the new name",
        );
        assert.deepStrictEqual(session.visibility.filter, { kind: "range", attribute: "data.total amount", min: 5 });
        assert.strictEqual(session.visibility.summary.visibleNodes, 2, "the filter keeps the same nodes");
        assert.strictEqual(session.data.valueLabels("data.total amount").get("12"), "Twelve");

        await session.undo();
        assert.deepStrictEqual(values(session, "amount"), [12, null, 7.5, 3]);
        assert.deepStrictEqual(session.visibility.filter, { kind: "range", attribute: "data.amount", min: 5 });
        assert.deepStrictEqual(session.styles.list().find((each) => each.name === "Big")?.selector, {
            match: "expression",
            where: "data.amount > `5`",
        });
        session.dispose();
    });

    it("refuses an empty name and one another column has", async () => {
        const session = await accounts();
        await assertRejects(session.data.renameColumn({ kind: "node", name: "amount" }, " "), "empty-name");
        await assertRejects(session.data.renameColumn({ kind: "node", name: "amount" }, "flagged"), "name-taken");
        session.dispose();
    });

    it("moves a role with the column", async () => {
        const session = await accounts();
        await session.data.setRole({ kind: "node", name: "flagged" }, "label");
        await session.data.renameColumn({ kind: "node", name: "flagged" }, "risk");
        assert.deepStrictEqual(column(session, "risk")?.roles, ["label"]);
        session.dispose();
    });
});

describe("data.setHidden", () => {
    it("hides columns in one undo step, and the hidden set survives a project round trip", async () => {
        const session = await accounts();
        const others = session.data.attributes().filter((each) => each.kind === "node" && each.name !== "amount");
        const steps = session.history.steps.length;
        await session.data.setHidden(others, true);
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepStrictEqual(
            session.data
                .attributes()
                .filter((each) => each.hidden === true)
                .map((each) => each.name),
            others.map((each) => each.name),
        );
        assert.strictEqual(column(session, "amount")?.hidden, undefined);

        await session.data.setHidden(others, true);
        assert.strictEqual(session.history.steps.length, steps + 1, "hiding what is hidden records nothing");

        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.deepStrictEqual(
            reopened.data
                .attributes()
                .filter((each) => each.hidden === true)
                .map((each) => each.name),
            others.map((each) => each.name),
        );

        await reopened.data.setHidden(others, false);
        assert.isFalse(reopened.data.attributes().some((each) => each.hidden === true));
        reopened.dispose();

        await session.undo();
        assert.isFalse(session.data.attributes().some((each) => each.hidden === true));
        session.dispose();
    });

    it("keeps a converted type through a project round trip", async () => {
        const session = await accounts();
        await session.data.setType({ kind: "node", name: "flagged" }, "category");
        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.strictEqual(column(reopened, "flagged")?.type, "category");
        reopened.dispose();
        session.dispose();
    });
});

describe("data.setRole", () => {
    it("gives a column the label role and takes it away, each one undo step", async () => {
        const session = await accounts();
        const steps = session.history.steps.length;
        await session.data.setRole({ kind: "node", name: "flagged" }, "label");
        assert.deepStrictEqual(column(session, "flagged")?.roles, ["label"]);
        assert.strictEqual(session.data.name("a"), "yes", "the label reads the column");
        assert.strictEqual(session.history.steps.length, steps + 1);

        await session.data.setRole({ kind: "node", name: "flagged" }, null);
        assert.strictEqual(column(session, "flagged")?.roles, undefined);
        await session.undo();
        assert.deepStrictEqual(column(session, "flagged")?.roles, ["label"]);
        session.dispose();
    });

    it("refuses a role the kind has no field for, and a new key on loaded nodes", async () => {
        const session = await accounts();
        await assertRejects(session.data.setRole({ kind: "node", name: "flagged" }, "source"), "role-kind");
        await assertRejects(session.data.setRole({ kind: "node", name: "flagged" }, "key"), "reload");
        session.dispose();
    });

    it("makes an edge column the weight, and refuses a new source on loaded edges", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: TRANSFERS }, name: "transfers.csv" });
        const roles = (name: string): readonly string[] | undefined =>
            session.data.attributes().find((each) => each.kind === "edge" && each.name === name)?.roles;

        await session.data.setRole({ kind: "edge", name: "prey" }, "weight");
        assert.deepStrictEqual(roles("prey"), ["weight"]);
        await session.data.setRole({ kind: "edge", name: "bait" }, "weight");
        assert.deepStrictEqual(roles("bait"), ["weight"], "one weight column per kind");
        assert.strictEqual(roles("prey"), undefined);

        await assertRejects(session.data.setRole({ kind: "edge", name: "bait" }, "source"), "reload");
        session.dispose();
    });
});

/**
 * Assert a promise rejects with a `GraphtyError` whose `details.reason` is the one given.
 * @param promise - the call
 * @param reason - the expected reason
 */
async function assertRejects(promise: Promise<unknown>, reason: string): Promise<void> {
    try {
        await promise;
    } catch (error) {
        assert.strictEqual((error as { details?: { reason?: string } }).details?.reason, reason);
        return;
    }

    assert.fail(`expected a rejection with reason ${reason}`);
}
