/**
 * @file More corners of `session.data`: a page sorted by true/false and by list values, and the
 * settings a renamed column carries (hidden, renamed before, read by the time window).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const ACCOUNTS = "id,amount,opened\na,12,1\nb,4,2\nc,7.5,3\nd,3,4\n";

/**
 * A session holding the accounts as nodes, loaded from a CSV the way a reader drops a file.
 * @param options - forwarded to createGraphSession
 * @returns The session.
 */
async function accounts(options: Parameters<typeof createGraphSession>[0] = {}): Promise<GraphSession> {
    const session = createGraphSession(options);
    const draft = await session.data.prepare({ type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" });
    await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/**
 * The node columns' names, in the session's order.
 * @param session - The session.
 * @returns The names.
 */
function nodeColumns(session: GraphSession): string[] {
    return session.data
        .attributes()
        .filter((each) => each.kind === "node")
        .map((each) => each.name);
}

describe("a node page", () => {
    it("sorts true/false values false first, and list values by their text", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", on: true, tags: ["b", "c"] },
            { id: "b", on: false, tags: ["a"] },
            { id: "c", on: true, tags: ["c"] },
            { id: "d", on: false, tags: ["b"] },
        ]);
        const ids = (key: string, descending = false): string[] =>
            session.data.nodePage({ sort: { key, descending } }).records.map((node) => String(node.id));

        assert.deepStrictEqual(ids("on"), ["b", "d", "a", "c"]);
        assert.deepStrictEqual(ids("on", true), ["a", "c", "b", "d"]);
        // ["a"] < ["b","c"] < ["b"] < ["c"] as JSON text.
        assert.deepStrictEqual(ids("tags"), ["b", "a", "d", "c"]);
        session.dispose();
    });
});

describe("data.renameColumn", () => {
    it("keeps a hidden column hidden under its new name", async () => {
        const session = await accounts();
        await session.data.setHidden([{ kind: "node", name: "amount" }], true);
        await session.data.renameColumn({ kind: "node", name: "amount" }, "total");

        const hidden = session.data.attributes().filter((each) => each.hidden === true);
        assert.deepStrictEqual(
            hidden.map((each) => each.name),
            ["total"],
        );
        session.dispose();
    });

    it("renames a column twice, and back, keeping its values each time", async () => {
        const session = await accounts();
        const amounts = (name: string): unknown[] => session.data.nodes().map((node) => node[name]);

        await session.data.renameColumn({ kind: "node", name: "amount" }, "total");
        await session.data.renameColumn({ kind: "node", name: "total" }, "sum");
        assert.deepStrictEqual(amounts("sum"), [12, 4, 7.5, 3]);
        assert.notInclude(nodeColumns(session), "total");

        await session.data.renameColumn({ kind: "node", name: "sum" }, "amount");
        assert.deepStrictEqual(amounts("amount"), [12, 4, 7.5, 3]);
        assert.notInclude(nodeColumns(session), "sum");
        session.dispose();
    });

    it("moves the time window and leaves a layer that reads another column alone", async () => {
        const session = await accounts();
        await session.data.setType({ kind: "node", name: "opened" }, "number");
        await session.visibility.setWindow({ attribute: "data.opened", from: 1, to: 2 });
        const other = await session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "expression", where: "data.amount > `5`" },
            set: { "node.color": "#ff0000" },
        });

        await session.data.renameColumn({ kind: "node", name: "opened" }, "since");

        assert.deepStrictEqual(session.visibility.window, { attribute: "data.since", from: 1, to: 2 });
        assert.deepStrictEqual(session.styles.list().find((each) => each.id === other.id)?.selector, {
            match: "expression",
            where: "data.amount > `5`",
        });
        await session.undo();
        assert.deepStrictEqual(session.visibility.window, { attribute: "data.opened", from: 1, to: 2 });
        session.dispose();
    });
});
