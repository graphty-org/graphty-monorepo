/**
 * @file Corners of `session.data` the other files leave out: an edge page sorted by its id or its
 * ends and searched by name, issues narrowed by source and named by record, the issue calls that
 * change nothing, and the refusals of mergeNodes, derive, groupTable and renameColumn.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type NodeId } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { accountsCsv, transfersCsv } from "../helpers/fraud-fixture";
import { makeSession } from "./helpers";

/**
 * The code and reason of what a promise rejected with.
 * @param promise - The promise.
 * @returns The code and the reason, or "resolved".
 */
async function refusal(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        const details = (isGraphtyError(error) ? error.details : {}) as { reason?: unknown; option?: unknown };
        return { code: isGraphtyError(error) ? error.code : undefined, reason: details.reason ?? details.option };
    }

    return "resolved";
}

/**
 * A session holding the fraud fixture, loaded the way a reader drops both files.
 * @returns The session.
 */
async function fraud(): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({
        config: {
            nodeFile: new File([accountsCsv()], "accounts.csv"),
            edgeFile: new File([transfersCsv()], "transfers.csv"),
        },
    });
    await draft.load();
    return session;
}

/**
 * A graph whose edge ids, sources and targets each sort differently from graph order.
 * @returns The session.
 */
async function threeEdges(): Promise<GraphSession> {
    const { session } = makeSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { id: "e2", source: "c", target: "a" },
        { id: "e3", source: "a", target: "b" },
        { id: "e1", source: "b", target: "c" },
    ]);
    return session;
}

describe("an edge page", () => {
    it("sorts by the edge's id, its source and its target", async () => {
        const session = await threeEdges();
        const ends = (key: string, descending = false): string[] =>
            session.data
                .edgePage({ sort: { key, descending } })
                .records.map((edge) => `${String(edge.source)}${String(edge.target)}`);

        assert.deepStrictEqual(ends("source"), ["ab", "bc", "ca"]);
        assert.deepStrictEqual(ends("target"), ["ca", "ab", "bc"]);
        assert.deepStrictEqual(ends("source", true), ["ca", "bc", "ab"]);
        const byId = session.data.edgePage({ sort: { key: "id" } }).records.map((edge) => edge.id);
        assert.deepStrictEqual(byId, [...byId].sort());
        session.dispose();
    });

    it("searches an edge by its ends' ids when asked for names only", async () => {
        const session = await threeEdges();
        const page = session.data.edgePage({ matching: { text: "c", names: true } });

        assert.deepStrictEqual(
            page.records.map((edge) => `${String(edge.source)}${String(edge.target)}`),
            ["ca", "bc"],
        );
        session.dispose();
    });
});

describe("data issues", () => {
    it("narrow to one source, fixed ones included", async () => {
        const session = await fraud();
        const all = session.data.issues();

        const fromS1 = session.data.issues({ source: "s1" });
        assert.isAbove(fromS1.length, 0);
        assert.deepStrictEqual(
            fromS1,
            all.filter((each) => each.source === "s1"),
        );
        assert.deepStrictEqual(session.data.issues({ source: "s9" }), []);

        await session.data.fix({ id: "unknown-end:edge" }, "leave-out");
        const fixed = (from: string): string[] =>
            session.data
                .issues({ includeFixed: true, source: from })
                .filter((each) => each.status === "fixed")
                .map((each) => each.id);
        assert.deepStrictEqual(fixed("s1"), ["unknown-end:edge"]);
        assert.deepStrictEqual(fixed("s9"), []);
        session.dispose();
    });

    it("refuse a fix the issue does not take, naming the ones it does", async () => {
        const session = await fraud();
        let message = "";
        try {
            await session.data.fix("repeated-edge:edge", "leave-out");
        } catch (error) {
            message = error instanceof Error ? error.message : "";
        }

        assert.include(message, "takes merge");
        session.dispose();
    });

    it("record nothing when ignoring what is already ignored, and list several again in one step", async () => {
        const session = await fraud();
        const ids = ["refused-row", "repeated-id:node"];
        await session.data.ignoreIssues(ids);
        const steps = session.history.steps.length;

        await session.data.ignoreIssue({ id: "refused-row" });
        assert.strictEqual(session.history.steps.length, steps, "no step was recorded");

        await session.data.ignoreIssues(
            ids.map((id) => ({ id })),
            false,
        );
        const listed = session.data.issues().map((each) => each.id);
        assert.includeMembers(listed, ids);
        session.dispose();
    });
});

describe("data refusals and no-ops", () => {
    it("refuses mergeNodes given something other than a list", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);

        const ids: unknown = "a";
        assert.deepStrictEqual(await refusal(session.data.mergeNodes(ids as readonly NodeId[])), {
            code: "E_BAD_COMMAND",
            reason: undefined,
        });
        assert.strictEqual(session.data.nodePage().total, 2);
        session.dispose();
    });

    it("refuses a computed column carried by neither nodes nor edges, or with no expression", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "a", n: 1 }]);
        const kind: unknown = "graph";
        const expression: unknown = 5;

        assert.deepStrictEqual(await refusal(session.data.derive("x", "data.n", { kind: kind as "node" })), {
            code: "E_BAD_COMMAND",
            reason: "bad-kind",
        });
        assert.deepStrictEqual(await refusal(session.data.derive("x", expression as string)), {
            code: "E_BAD_COMMAND",
            reason: "not-an-expression",
        });
        session.dispose();
    });

    it("refuses a group summary that is not a list", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "a", team: "x", n: 1 }]);
        const summaries: unknown = { "data.n": "mean" };

        let caught: unknown;
        try {
            session.data.groupTable("data.team", { summaries: summaries as Record<string, ["mean"]> });
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught) && caught.code === "E_OPTION_RANGE");
        session.dispose();
    });

    it("records nothing when a column is renamed to its own name", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "a", team: "x" }]);
        const steps = session.history.steps.length;

        await session.data.renameColumn({ kind: "node", name: "team" }, "team");

        assert.strictEqual(session.history.steps.length, steps, "no step was recorded");
        assert.deepStrictEqual(session.data.nodePage().records, [{ id: "a", team: "x" }]);
        session.dispose();
    });
});

describe("neighbors", () => {
    it("reads the loaded weight as a distance when the data says so", async () => {
        const session = createGraphSession({ workingGraph: false });
        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [
                { source: "a", target: "b", weight: 0.1 },
                { source: "a", target: "c", weight: 5 },
            ],
        });
        await session.data.import({ type: "json", config: { data } });
        await session.config.set({ data: { knownFields: { edgeWeightMeaning: "distance" } } });

        const page = session.data.neighbors("a");

        assert.deepStrictEqual(page.measuredBy, { attribute: "weight", meaning: "distance" });
        assert.deepStrictEqual(
            page.records.map((row) => row.node.id),
            ["b", "c"],
        );
        session.dispose();
    });
});

describe("structure values", () => {
    it("offer in- and out-degree only when some edge is directed", async () => {
        const paths = async (directed: boolean): Promise<string[]> => {
            const { session } = makeSession({ directed });
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            await session.data.addEdges([{ source: "a", target: "b" }]);
            const found = session.data.structureValues().map((each) => each.path);
            session.dispose();
            return found;
        };

        assert.deepStrictEqual(await paths(false), ["graphty.degree"]);
        assert.deepStrictEqual(await paths(true), ["graphty.degree", "graphty.inDegree", "graphty.outDegree"]);
    });
});
