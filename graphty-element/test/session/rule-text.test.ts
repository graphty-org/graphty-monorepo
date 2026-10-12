/**
 * @file Generic layer rules: a `{ match: "rule" }` selector over a rule tree, the `text` leaf that
 * runs the same text matcher as a search, the node id as a value a leaf reads, "top N by" a data
 * column, and the rule each find value row carries. The same leaf hides the same nodes in the
 * visibility filter.
 */

import { assert, describe, it } from "vitest";

import type { NodeId, RuleTree } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import type { ElementSession } from "../../src/session/types";

const RED = "#ff0000";

/**
 * A node's name: every seventh holds "bob", lower case when even, "BOBBY" after "Robert" when odd.
 * @param id - The node id.
 * @returns The name.
 */
function nameOf(id: number): string {
    if (id % 7 !== 0) {
        return `ann ${String(id)}`;
    }

    return id % 2 === 0 ? `bob ${String(id)}` : `Robert BOBBY ${String(id)}`;
}

/**
 * Nodes 0..99 with a name (every seventh one holds "Bob" in some case) and a score equal to the id.
 * @returns The session, loaded.
 */
async function hundred(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: 100 }, (_, id) => ({
            id,
            name: nameOf(id),
            score: id,
        })),
    );
    await session.data.addEdges([{ source: 0, target: 1 }]);
    return session;
}

/**
 * Add one layer painting a rule red, repaint, and read the nodes painted red.
 * @param session - The session.
 * @param where - The rule.
 * @returns The ids painted red, sorted as text.
 */
async function painted(session: GraphSession, where: RuleTree): Promise<NodeId[]> {
    const element = session as ElementSession;
    const layer = await session.styles.add({
        name: "Rule",
        selector: { match: "rule", where },
        set: { "node.color": RED },
    });
    await element.paint.repaintAll(element.styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });
    const snapshot = session.data.snapshot();
    const found: NodeId[] = [];
    for (let index = 0; index < snapshot.nodeCount; index++) {
        if (element.paint.styleOf("node", index)["node.color"]?.hex === RED) {
            found.push(snapshot.ids.idOf(index));
        }
    }

    await session.styles.remove(layer.id);
    return found.map(String).sort();
}

describe("rules a layer paints", () => {
    it("'name contains bob' paints exactly the nodes find reports for name, ignoring case", async () => {
        const session = await hundred();
        const found = session.find("bob", { limit: 1000 });
        const byName = found.records
            .filter((hit) => hit.match.path === "data.name")
            .map((hit) => String(hit.id))
            .sort();

        const ids = await painted(session, { kind: "text", reads: "data.name", mode: "substring", text: "bob" });

        assert.lengthOf(ids, 15);
        assert.deepEqual(ids, byName);
        session.dispose();
    });

    it("a pattern on the id matches the odd ids: 50 of 0..99", async () => {
        const session = await hundred();

        const ids = await painted(session, { kind: "text", reads: "id", mode: "regex", text: "[13579]$" });

        assert.lengthOf(ids, 50);
        assert.isTrue(ids.every((id) => Number(id) % 2 === 1));
        session.dispose();
    });

    it("starts with and ends with, and case sensitivity", async () => {
        const session = await hundred();

        assert.lengthOf(
            await painted(session, { kind: "text", reads: "data.name", mode: "starts-with", text: "ROBERT" }),
            7,
        );
        assert.deepEqual(await painted(session, { kind: "text", reads: "id", mode: "ends-with", text: "99" }), ["99"]);
        assert.lengthOf(
            await painted(session, {
                kind: "text",
                reads: "data.name",
                mode: "substring",
                text: "BOB",
                caseSensitive: true,
            }),
            7,
        );
        session.dispose();
    });

    it("a find value row's rule paints the row's count", async () => {
        const session = await hundred();
        const [row] = session.find("bob 14").values;

        assert.isDefined(row);
        assert.deepEqual(row.rule, {
            kind: "text",
            reads: "data.name",
            mode: "exact",
            text: "bob 14",
            caseSensitive: true,
        });
        assert.lengthOf(await painted(session, row.rule), row.count);
        session.dispose();
    });

    it("top 10 by a data column paints 10 nodes", async () => {
        const session = await hundred();

        const ids = await painted(session, { kind: "threshold", path: "data.score", top: 10 });

        assert.deepEqual(
            ids,
            Array.from({ length: 10 }, (_, at) => String(90 + at)),
        );
        session.dispose();
    });

    it("the same text leaf in a visibility filter hides the same nodes", async () => {
        const session = await hundred();
        const leaf: RuleTree = { kind: "text", reads: "data.name", mode: "substring", text: "bob" };
        const ids = await painted(session, leaf);

        await session.visibility.set({ kind: "not", of: leaf });

        const hidden = Array.from({ length: 100 }, (_, id) => id)
            .filter((id) => !session.visibility.isVisible(id))
            .map(String)
            .sort();
        assert.deepEqual(hidden, ids);
        session.dispose();
    });

    it("refuses a text leaf with a pattern that does not parse", async () => {
        const session = await hundred();

        let code: unknown = "no error";
        try {
            await session.styles.add({
                name: "Broken",
                selector: { match: "rule", where: { kind: "text", reads: "id", mode: "regex", text: "[" } },
                set: { "node.color": RED },
            });
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_BAD_SELECTOR");
        session.dispose();
    });
});
