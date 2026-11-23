/**
 * @file Today's data doors as sources and steps under the source-steps experiment (design
 * design/data/multiple-data-sources-design.md, sections 9.1 and 13): the reader's edits of an edge
 * and its removal, a cell edited twice keeping the value the first edit replaced, a load's time
 * role named by side, its duplicate-id and unmatched-end choices kept as the source's settings, a
 * `data:` URL read as a file, and an edge-values join the steps cannot express refused.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { isGraphtyError } from "../../../src/errors";

/**
 * A session with the experiment on.
 * @returns The session.
 */
function stepsSession(): GraphSession {
    return createGraphSession({ features: ["source-steps"] });
}

/**
 * A CSV load.
 * @param name - The file's name.
 * @param data - The CSV text.
 * @returns What `import` takes.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * The `graphty-sources` member of a saved session.
 * @param session - The session.
 * @returns The member.
 */
async function savedMember(
    session: GraphSession,
): Promise<Record<string, unknown> & { sources: Record<string, unknown>[] }> {
    const doc = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
    const member = doc.members.find((m) => m.kind === "graphty-sources");
    assert.isDefined(member);

    return member as Record<string, unknown> & { sources: Record<string, unknown>[] };
}

/** An edge file keyed by `id`, between nodes a, b and c. */
const EDGES = "id,source,target,w\ne1,a,b,1\ne2,b,c,2\n";

describe("source-steps: the reader's edits of edges", () => {
    it("an edge's cell edit and its removal are reader operations naming the edge by its load and key", async () => {
        const session = stepsSession();
        await session.data.import(csv("e.csv", EDGES), {
            edges: { from: { column: "source" }, to: { column: "target" }, id: "id" },
        });
        const [first, second] = session.data.edges({ scope: "graph" });
        const [load] = session.data.sources().map((s) => s.key);

        await session.data.updateEdges([{ id: first.id, values: { w: 9 } }]);
        assert.strictEqual(session.data.edges({ scope: "graph" }).find((e) => e.id === first.id)?.w, 9);
        await session.data.removeEdges([second.id]);
        assert.lengthOf(session.data.edges({ scope: "graph" }), 1);

        assert.deepStrictEqual(
            session.data.edits().map((e) => [e.op, e.target, e.column]),
            [
                ["edit", { load, key: "e1" }, "w"],
                ["remove", { load, key: "e2" }, undefined],
            ],
        );
        session.dispose();
    });

    it("a cell edited twice saves the value the first edit replaced as both edits' was", async () => {
        const session = stepsSession();
        await session.data.import(csv("n.csv", "id,score\na,1\nb,2\n"), { key: "id" });
        await session.data.updateNodes([{ id: "a", values: { score: 5 } }]);
        await session.data.updateNodes([{ id: "a", values: { score: 7 } }]);
        assert.strictEqual(session.data.node("a")?.score, 7);

        const member = await savedMember(session);
        const reader = member.sources.at(-1) as {
            copy: { operations: { op: string; value?: unknown; was?: unknown }[] };
        };
        assert.deepStrictEqual(
            reader.copy.operations.map((op) => [op.op, op.value, op.was]),
            [
                ["edit", 5, 1],
                ["edit", 7, 1],
            ],
        );
        session.dispose();
    });
});

describe("source-steps: what a load's choices compile to", () => {
    it("a time role named on the edges side times every edge", async () => {
        const session = stepsSession();
        await session.data.import(csv("t.csv", "s,t,when\na,b,2020-01-01\nb,c,2021-01-01\n"), {
            edges: { from: { column: "s" }, to: { column: "t" } },
            mapping: { edges: { source: "s", target: "t", time: "when" } },
        });
        await session.time.ready;
        assert.strictEqual(session.time.field?.edges?.start, "graphty.time");
        assert.strictEqual(session.time.extent()?.edges.timed, 2);
        session.dispose();
    });

    it("keeps a load's duplicate-id and unmatched-end choices as the source's settings", async () => {
        const session = stepsSession();
        await session.data.import(csv("e.csv", "source,target\na,b\nb,c\n"), {
            duplicateIds: "merge",
            unmatched: "leave-out",
        });
        const member = await savedMember(session);
        assert.deepStrictEqual(member.sources[0]?.settings, { duplicateIds: "merge", unmatched: "leave-out" });
        session.dispose();
    });

    it("a load that starts the history leaves nothing to undo before it, and still builds from its source", async () => {
        const session = stepsSession();
        await session.data.import(csv("a.csv", "source,target\na,b\n"));
        await session.data.import(csv("b.csv", "source,target\nc,d\n"), { history: "start" });
        assert.isFalse(session.canUndo);
        assert.deepStrictEqual(
            session.data.sources().map((s) => s.name),
            ["b.csv"],
        );
        assert.lengthOf(session.data.edges({ scope: "graph" }), 1);
        session.dispose();
    });

    it("reads a data: URL as a file", async () => {
        const session = stepsSession();
        await session.data.import({
            type: "csv",
            config: { url: `data:text/csv,${encodeURIComponent("source,target\na,b\n")}` },
            name: "inline.csv",
        });
        assert.lengthOf(session.data.edges({ scope: "graph" }), 1);
        const member = await savedMember(session);
        assert.strictEqual(member.sources[0]?.kind, "file");
        session.dispose();
    });
});

/**
 * Join a table of edge values onto the loaded edges.
 * @param session - The session.
 * @param data - The table.
 * @param choices - More join choices.
 * @returns The refusal's code and reason, or null when the join loaded.
 */
async function edgeValues(
    session: GraphSession,
    data: string,
    choices: Record<string, unknown> = {},
): Promise<[unknown, unknown] | null> {
    const draft = await session.data.prepare(csv("v.csv", data), { onto: "graph" });
    try {
        await draft.load({ join: { keys: [{ file: "edge", graph: "id" }], shape: "edge-values", ...choices } });
    } catch (error) {
        return isGraphtyError(error) ? [error.code, error.details?.reason] : [error, undefined];
    } finally {
        draft.dispose();
    }

    return null;
}

describe("source-steps: an edge-values join", () => {
    it("writes each row onto the edge its key names when a loaded source keys its edges", async () => {
        const session = stepsSession();
        await session.data.import(csv("e.csv", EDGES), {
            edges: { from: { column: "source" }, to: { column: "target" }, id: "id" },
        });
        assert.isNull(await edgeValues(session, "edge,note\ne2,late\n"));
        const second = session.data.edges({ scope: "graph" }).find((e) => e.source === "b");
        assert.strictEqual(second?.note, "late");
        session.dispose();
    });

    it("is refused when no loaded source keys its edges by the join's values", async () => {
        const session = stepsSession();
        await session.data.import(csv("e.csv", "source,target\na,b\n"));
        assert.deepStrictEqual(await edgeValues(session, "edge,note\nzz,x\n"), ["E_UNSUPPORTED", "later"]);
        session.dispose();
    });

    it("is refused with a choice the steps do not express", async () => {
        const session = stepsSession();
        await session.data.import(csv("e.csv", EDGES), {
            edges: { from: { column: "source" }, to: { column: "target" }, id: "id" },
        });
        assert.deepStrictEqual(await edgeValues(session, "edge,note\ne1,x\n", { repeated: "both" }), [
            "E_UNSUPPORTED",
            "later",
        ]);
        session.dispose();
    });
});
