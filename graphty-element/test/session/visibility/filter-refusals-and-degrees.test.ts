/**
 * @file `visibility.set` and `visibility.setWindow` refuse each malformed filter and window at the
 * call, with the error code that says what is wrong, and a directed graph's in- and out-degree
 * filters count only the edges that point the asked way.
 */

import { assert, describe, it } from "vitest";

import { GraphtyError } from "../../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession } from "../../../src/session";
import type { RuleTree } from "../../../src/session/visibility/filter";

/**
 * The code a call throws, or null when it does not throw.
 * @param call - The call.
 * @returns The code.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        assert.instanceOf(error, GraphtyError);
        return error.code;
    }
    return null;
}

/**
 * A session over a star pointing out of "hub": hub -> a, hub -> b, a -> b, each node and edge
 * stamped with an instant.
 * @param directed - Whether the graph is directed.
 * @returns The session.
 */
async function star(directed: boolean): Promise<GraphSession> {
    const session = createGraphSession({ config: { data: { directed } } });
    await session.data.addNodes([
        { id: "hub", at: 1 },
        { id: "a", at: 5 },
        { id: "b", at: 9 },
    ]);
    await session.data.addEdges([
        { src: "hub", dst: "a", at: 1 },
        { src: "hub", dst: "b", at: 5 },
        { src: "a", dst: "b", at: 9 },
    ]);
    return session;
}

describe("a malformed filter is refused at the call", () => {
    const CASES: readonly [string, unknown, string][] = [
        ["a degree bound that is not finite", { kind: "degree", min: Number.POSITIVE_INFINITY }, "E_OPTION_RANGE"],
        ["a degree direction that is not one", { kind: "degree", min: 1, direction: "up" }, "E_BAD_COMMAND"],
        ["a component id below 0", { kind: "component", id: -1 }, "E_OPTION_RANGE"],
        ["a component id that is not whole", { kind: "component", id: 1.5 }, "E_OPTION_RANGE"],
        ["neighborhood seeds that are not a list", { kind: "neighborhood", seeds: "a", depth: 1 }, "E_BAD_COMMAND"],
        ["source keys that are not a list", { kind: "source", sources: "people.csv" }, "E_BAD_COMMAND"],
        ["source keys that are not strings", { kind: "source", sources: [1] }, "E_BAD_COMMAND"],
        ["a source side that is neither", { kind: "source", sources: [], side: "both" }, "E_BAD_COMMAND"],
        [
            "categories values that are not a list",
            { kind: "categories", attribute: "data.at", values: "1" },
            "E_BAD_COMMAND",
        ],
        ["a member with no kind", { kind: "not", of: { where: "x" } }, "E_BAD_COMMAND"],
    ];

    for (const [name, filter, code] of CASES) {
        it(`refuses ${name} with ${code}`, async () => {
            const session = await star(false);
            assert.strictEqual(
                codeOf(() => session.visibility.set(filter as RuleTree)),
                code,
            );
            assert.isNull(session.visibility.filter, "nothing was applied");
            session.dispose();
        });
    }

    it("takes a source filter of an empty list on either side", async () => {
        const session = await star(false);
        const result = await session.visibility.set({ kind: "source", sources: [], side: "edges" });
        assert.strictEqual(result.total.nodes, 3);
        session.dispose();
    });
});

describe("a malformed window is refused at the call", () => {
    it("refuses a window that is not an object, a bound that is not a number, and an option that is not one", async () => {
        const session = await star(false);
        const window = (value: unknown): string | null =>
            codeOf(() => session.visibility.setWindow(value as Parameters<typeof session.visibility.setWindow>[0]));

        assert.strictEqual(window("data.at"), "E_BAD_COMMAND");
        assert.strictEqual(window({ attribute: "data.at", from: Number.NaN, to: 5 }), "E_OPTION_RANGE");
        assert.strictEqual(window({ attribute: "data.at", from: new Date(Number.NaN), to: 5 }), "E_OPTION_RANGE");
        assert.strictEqual(window({ attribute: "data.at", from: 1, to: 5, nodes: "some" }), "E_BAD_COMMAND");
        assert.strictEqual(window({ attribute: "data.at", from: 1, to: 5, mode: "rolling" }), "E_BAD_COMMAND");
        assert.isNull(session.visibility.window);
        session.dispose();
    });
});

describe("a threshold over a column some nodes leave out", () => {
    /**
     * A session whose nodes carry scores 1 to 4 and one node carries none.
     * @returns The session.
     */
    async function scored(): Promise<GraphSession> {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "s1", score: 1 },
            { id: "s2", score: 2 },
            { id: "s3", score: 3 },
            { id: "s4", score: 4 },
            { id: "none" },
        ]);
        return session;
    }

    /**
     * The ids a filter leaves visible.
     * @param session - The session.
     * @param filter - The filter.
     * @returns The ids.
     */
    async function shown(session: GraphSession, filter: RuleTree): Promise<string[]> {
        await session.visibility.set(filter);
        return session.data
            .nodes()
            .filter((node) => session.visibility.isVisible(node.id))
            .map((node) => String(node.id));
    }

    it("keeps the node with no score when missing is include, and leaves it out otherwise", async () => {
        const session = await scored();
        assert.sameMembers(await shown(session, { kind: "threshold", path: "data.score", above: 2 }), ["s3", "s4"]);
        assert.sameMembers(
            await shown(session, { kind: "threshold", path: "data.score", above: 2, missing: "include" }),
            ["s3", "s4", "none"],
        );
        session.dispose();
    });

    it("ranks from the low end when asked", async () => {
        const session = await scored();
        assert.sameMembers(await shown(session, { kind: "threshold", path: "data.score", top: 2, from: "low" }), [
            "s1",
            "s2",
        ]);
        session.dispose();
    });

    it("shows nothing for a threshold on a column no node carries", async () => {
        const session = await scored();
        const result = await session.visibility.set({ kind: "threshold", path: "data.absent", top: 2 });
        assert.deepEqual(result.unresolvedPaths, ["data.absent"]);
        session.dispose();
    });
});

describe("degree filters on a directed graph", () => {
    it("counts in-degree and out-degree the way the edges point", async () => {
        const session = await star(true);
        const visible = async (filter: RuleTree): Promise<string[]> => {
            await session.visibility.set(filter);
            return session.data
                .nodes()
                .filter((node) => session.visibility.isVisible(node.id))
                .map((node) => String(node.id));
        };

        assert.sameMembers(await visible({ kind: "range", attribute: "graphty.inDegree", min: 2 }), ["b"]);
        assert.sameMembers(await visible({ kind: "range", attribute: "graphty.outDegree", min: 2 }), ["hub"]);
        assert.sameMembers(await visible({ kind: "range", attribute: "graphty.inDegree", max: 0 }), ["hub"]);
        session.dispose();
    });

    it("counts both ways on an undirected graph, whichever way is asked", async () => {
        const session = await star(false);
        await session.visibility.set({ kind: "range", attribute: "graphty.inDegree", min: 2 });
        const shown = session.data.nodes().filter((node) => session.visibility.isVisible(node.id));
        assert.lengthOf(shown, 3, "every node has two neighbors");
        session.dispose();
    });
});
