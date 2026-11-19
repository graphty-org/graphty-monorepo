/**
 * @file Today's doors under the source-steps experiment: what they compile to, and what they refuse
 * until a later slice compiles them. Removing a source rebuilds without it; a replacing load starts
 * a new graph even over records no step built; the element's nodeData / edgeData pair owns one
 * derived source (design 9.1, ported from the reference model's late-findings case); the direct
 * edits read the configured edge end columns; joins, replace, reload, remap and refresh are refused
 * with E_UNSUPPORTED, reason "later", so the old path never runs over a steps-built graph.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { replaceNodesCommand } from "../../../src/session/commands/data";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { compileRecords } from "../../../src/session/sources/steps/compile";

/**
 * A session with the source-steps experiment on.
 * @param options - More session options.
 * @returns The session.
 */
function stepsSession(options: Parameters<typeof createGraphSession>[0] = {}): GraphSession {
    return createGraphSession({ ...options, features: ["source-steps"] });
}

/**
 * A CSV load with no other options.
 * @param name - The file's name.
 * @param data - The CSV text.
 * @returns What `import` takes.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * The node ids the graph holds, sorted as text.
 * @param session - The session.
 * @returns The ids.
 */
function nodeIds(session: GraphSession): string[] {
    const { ids } = session.data.store.getSnapshot();
    return Array.from({ length: ids.size }, (_, row) => String(ids.idOf(row))).sort();
}

/**
 * The code a promise rejected with.
 * @param work - The promise.
 * @returns The code, or "resolved".
 */
async function codeOf(work: Promise<unknown>): Promise<unknown> {
    return work.then(
        () => "resolved",
        (error: unknown) => [
            (error as { code?: string }).code,
            (error as { details?: { reason?: string } }).details?.reason,
        ],
    );
}

describe("source-steps: today's doors", () => {
    it("removeSource takes the source and its step out, and a later edit does not list it again", async () => {
        const session = stepsSession();
        await session.data.import(csv("A.csv", "source,target\na,b\n"));
        await session.data.import(csv("B.csv", "source,target\nx,y\n"), { mode: "merge" });
        const a = session.data.sources().find((each) => each.name === "A.csv")?.key ?? "";
        const result = await session.data.removeSource(a);
        assert.deepStrictEqual(result.removed, { nodes: 2, edges: 1 });
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.name),
            ["B.csv"],
        );
        assert.deepStrictEqual(nodeIds(session), ["x", "y"]);
        await session.data.addNodes([{ id: "z" }]);
        assert.deepStrictEqual(
            session.data.sources().map((each) => each.name),
            ["B.csv"],
        );
        assert.deepStrictEqual(nodeIds(session), ["x", "y", "z"]);
        await session.undo();
        await session.undo();
        assert.deepStrictEqual(nodeIds(session), ["a", "b", "x", "y"], "one undo step brings the source back");
        assert.strictEqual(session.data.sources().length, 2);
        session.dispose();
    });

    it("a replacing load removes records no step built", async () => {
        const session = stepsSession();
        const d = dispatcherOf(session);
        await d.dispatch(replaceNodesCommand(d.state.graph.nodes, [{ id: "p" }, { id: "q" }], "id"));
        await session.data.import(csv("two.csv", "source,target\nx,y\n"));
        assert.deepStrictEqual(nodeIds(session), ["x", "y"]);
        await session.undo();
        assert.deepStrictEqual(nodeIds(session), ["p", "q"], "undo gives them back");
        session.dispose();
    });

    it("a replacing load after a reopened project starts a new graph", async () => {
        const saved = stepsSession();
        await saved.data.import(csv("one.csv", "source,target\na,b\n"));
        await saved.data.addNodes([{ id: "z" }]);
        const { text } = await saved.project.save();
        saved.dispose();
        const opened = stepsSession();
        await opened.project.open(text);
        assert.deepStrictEqual(nodeIds(opened), ["a", "b", "z"]);
        await opened.data.import(csv("fresh.csv", "source,target\nx,y\n"));
        assert.deepStrictEqual(nodeIds(opened), ["x", "y"]);
        opened.dispose();
    });

    it("settled (9.1): nodeData / edgeData own one derived source, so a CSV merges into those nodes", async () => {
        const session = stepsSession();
        const d = dispatcherOf(session);
        await d.dispatch(
            compileRecords("nodes", [{ id: "a" }, { id: "b" }], d.state.graph.values, { nodeIdPath: "id" }, false),
        );
        await d.dispatch(
            compileRecords("edges", [{ source: "a", target: "b" }], d.state.graph.values, { nodeIdPath: "id" }, false),
        );
        const sources = session.data.sources();
        assert.strictEqual(sources.length, 1, "the second assignment replaces the source's table in place");
        assert.strictEqual(
            (d.state.graph.values.get("sourceSteps") as { sources: Record<string, { kind: string }> }).sources[
                sources[0].key
            ].kind,
            "derived",
        );
        assert.deepStrictEqual(
            session.data.steps().map((each) => [each.op, each.source]),
            [["join.add", sources[0].key]],
        );
        await session.data.import(csv("attributes.csv", "id,score\na,1\nb,2\n"), {
            mode: "merge",
            key: "id",
            space: `source:${sources[0].key}`,
        });
        assert.deepStrictEqual(nodeIds(session), ["a", "b"], "one node per key");
        assert.strictEqual(session.data.node("a")?.score, 1);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 1);
        await d.dispatch(compileRecords("nodes", [{ id: "a" }], d.state.graph.values, { nodeIdPath: "id" }, false));
        assert.strictEqual(session.data.sources().length, 2, "a later assignment replaces the derived source in place");
        session.dispose();
    });

    it("addEdges reads the configured edge end columns", async () => {
        const session = stepsSession({
            config: { data: { knownFields: { edgeSrcIdPath: "from", edgeDstIdPath: "to" } } },
        });
        await session.data.addNodes([{ id: "x" }, { id: "y" }]);
        await session.data.addEdges([{ from: "x", to: "y" }]);
        assert.deepStrictEqual(nodeIds(session), ["x", "y"]);
        const snapshot = session.data.store.getSnapshot();
        assert.strictEqual(snapshot.edgeCount, 1);
        assert.deepStrictEqual(
            [snapshot.ids.idOf(snapshot.edgeSource(0)), snapshot.ids.idOf(snapshot.edgeTarget(0))],
            ["x", "y"],
        );
        session.dispose();
    });

    it("keeps the direction a file declares, through a save and a reopen", async () => {
        const gml = "graph [\n node [ id 1 ]\n node [ id 2 ]\n edge [ source 1 target 2 ]\n]";
        const saved = stepsSession();
        await saved.data.import({ type: "gml", config: { data: gml } });
        assert.isFalse(saved.status.directed);
        const { text } = await saved.project.save();
        const opened = stepsSession();
        await opened.project.open(text);
        assert.isFalse(opened.status.directed);
        saved.dispose();
        opened.dispose();
    });

    it("refuses replace, reload, remap and refresh until they compile to steps", async () => {
        const session = stepsSession();
        await session.data.import(csv("one.csv", "source,target\na,b\n"));
        const [{ key }] = session.data.sources();
        assert.deepStrictEqual(await codeOf(session.data.replaceSource(key, csv("one.csv", "source,target\na,c\n"))), [
            "E_UNSUPPORTED",
            "later",
        ]);
        assert.deepStrictEqual(await codeOf(session.data.reloadSource(key, {})), ["E_UNSUPPORTED", "later"]);
        assert.deepStrictEqual(await codeOf(session.data.remap({ mapping: { rowsAre: "edges" } })), [
            "E_UNSUPPORTED",
            "later",
        ]);
        assert.deepStrictEqual(await codeOf(session.data.refresh(key)), ["E_UNSUPPORTED", "later"]);
        assert.deepStrictEqual(nodeIds(session), ["a", "b"], "the graph is untouched");
        session.dispose();
    });
});
