/**
 * The project file: save a whole session, open it in another, and get the same project back --
 * without computing a single run again.
 */
import { assert, describe, it } from "vitest";

import type { RunId } from "../../src/catalog/types";
import type { GraphStore } from "../../src/data/GraphStore";
import { isGraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { type Harness, makeSession } from "./helpers";

/**
 * A session whose degree runs count every node's links, and which counts how often it was asked.
 * @returns The harness and the number of executions so far.
 */
function withDegree(): { harness: Harness; calls: () => number } {
    let calls = 0;
    let store: GraphStore | null = null;
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        calls++;
        if (store === null) {
            throw new Error("no store");
        }

        const snapshot = store.getSnapshot();
        const degrees = snapshot.degree();
        const nodes = [];
        for (let index = 0; index < snapshot.nodeCount; index++) {
            nodes.push({ id: snapshot.ids.idOf(index), values: { value: degrees[index] } });
        }

        // Each edge carries the label of the node it leaves, so a test can tell edges apart.
        const edges = harness.session.data
            .edges()
            .map((edge) => ({ id: edge.id, values: { from: String(edge.source) } }));

        // The fields name the run "$", as the element's own algorithms declare them.
        return Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                shape: "node-metric",
                fields: [
                    {
                        name: "value",
                        plainName: "Connections",
                        technicalName: "degree",
                        kind: "node",
                        type: "number",
                        path: "results.$.value",
                    },
                    {
                        name: "from",
                        plainName: "From",
                        technicalName: "from",
                        kind: "edge",
                        type: "string",
                        path: "results.$.from",
                    },
                ],
                measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                nodes,
                edges,
                caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", notes: [] },
                durationMs: 1,
            }),
        });
    };
    const harness: Harness = makeSession({ runs: { execute } });
    ({ store } = harness);
    return { harness, calls: () => calls };
}

/**
 * A session holding one of everything a project file saves.
 * @returns The harness.
 */
async function busySession(): Promise<Harness> {
    const { harness } = withDegree();
    const { session } = harness;
    await session.data.addNodes([
        { id: "a", type: "host" },
        { id: "b", type: "router" },
        { id: "c", type: "host" },
        { id: "d", type: "host" },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b", kind: "wire" },
        { src: "b", dst: "c", kind: "wire" },
        { src: "c", dst: "d", kind: "radio" },
    ]);
    await session.runs.start("degree", undefined, { as: "links" as RunId, style: false });
    await session.styles.encode({ run: "links" as RunId, channel: "node.color" });
    await session.styles.add({
        name: "Hosts in orange",
        target: "node",
        selector: { match: "expression", where: 'data.type == `"host"`' },
        set: { "node.color": "#ff9900" },
        enabled: false,
    });
    session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
    session.notes.add({ text: "b is the router", targets: [{ node: "b" }] });
    await session.views.save([
        { name: "Overview", camera: { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
    ]);
    await session.positions.set([
        { id: "a", x: 1, y: 2, z: 3 },
        { id: "b", x: 4, y: 5, z: 6 },
    ]);
    await session.positions.pin(["a"]);
    await session.selection.apply({ nodes: ["c"] });
    return harness;
}

describe("the project file", () => {
    it("saves a whole session and opens it in another without computing again", async () => {
        const source = await busySession();
        const file = await source.session.project.save({ name: "Network study", app: { legend: true, tab: "values" } });
        assert.strictEqual(file.type, "application/json");
        assert.strictEqual(source.session.project.name, "Network study");
        assert.isFalse(source.session.project.dirty);

        const { harness: target, calls } = withDegree();
        const { session } = target;
        const report = await session.project.open(file);

        assert.deepStrictEqual(report.missing, [], "everything came back");
        assert.strictEqual(report.name, "Network study");
        assert.deepStrictEqual(report.app, { legend: true, tab: "values" });
        assert.strictEqual(session.project.name, "Network study");
        assert.isFalse(session.project.dirty);

        assert.deepStrictEqual(session.data.nodes(), source.session.data.nodes());
        assert.deepStrictEqual(
            session.data.edges().map(({ id: _id, ...edge }) => edge),
            source.session.data.edges().map(({ id: _id, ...edge }) => edge),
        );

        assert.strictEqual(calls(), 0, "the saved result was handed back, not computed");
        assert.deepStrictEqual(
            session.runs.list().map((run) => run.id),
            ["links"],
        );
        assert.strictEqual(session.results.get("links" as RunId)?.node("b")?.value, 2);

        assert.deepStrictEqual(session.styles.toDocument(), source.session.styles.toDocument());
        assert.deepStrictEqual(
            session.sets.list().map((set) => [set.name, set.definition]),
            source.session.sets.list().map((set) => [set.name, set.definition]),
        );
        assert.deepStrictEqual(
            session.notes.list().map((note) => note.text),
            ["b is the router"],
        );
        assert.deepStrictEqual([...session.views.keys()], ["Overview"]);
        assert.deepStrictEqual([...session.positions.pinned], ["a"]);
        const at = { x: 0, y: 0, z: 0 };
        session.positions.read(1, at);
        assert.deepStrictEqual(at, { x: 4, y: 5, z: 6 });
        assert.deepStrictEqual([...session.selection.nodes], ["c"]);

        source.session.dispose();
        session.dispose();
    });

    it("carries edge results and the edge selection over to the edge ids of the session it opens in", async () => {
        const source = await busySession();
        const [, middle] = source.session.data.edges();
        await source.session.selection.apply({ edges: [middle.id] });
        const document = source.session.project.toDocument();

        // A session that has already numbered edges of its own numbers the opened ones afresh.
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "x" }, { id: "y" }]);
        await session.data.addEdges([
            { src: "x", dst: "y" },
            { src: "y", dst: "x" },
        ]);

        const report = await session.project.open(document);
        assert.deepStrictEqual(report.missing, []);

        const result = session.results.get("links" as RunId);
        for (const edge of session.data.edges()) {
            assert.strictEqual(result?.edge(edge.id)?.from, edge.source, "each edge keeps its own value");
        }

        const [selected] = session.selection.edges;
        assert.strictEqual(session.data.edge(selected)?.source, "b", "the selected edge is still b to c");
        source.session.dispose();
        session.dispose();
    });

    it("binds a saved layer to a run whose fields name it by the placeholder", async () => {
        const harness = await busySession();
        const report = await harness.session.styles.applyTemplate(harness.session.styles.toDocument());
        assert.deepStrictEqual(report.unbound, [], "results.links.value is answered by the run links");
        harness.session.dispose();
    });

    it("opens as one step that undo takes back", async () => {
        const source = await busySession();
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "z" }]);

        await session.project.open(source.session.project.toDocument());
        assert.strictEqual(session.data.nodes().length, 4);

        await session.undo();
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["z"],
        );
        assert.deepStrictEqual(session.runs.list(), []);

        source.session.dispose();
        session.dispose();
    });

    it("is dirty after a change and clean after a save", async () => {
        const { harness } = withDegree();
        const { session } = harness;
        assert.isFalse(session.project.dirty);
        await session.data.addNodes([{ id: "a" }]);
        assert.isTrue(session.project.dirty);
        await session.project.save();
        assert.isFalse(session.project.dirty);
        session.dispose();
    });

    it("refuses what it cannot read and leaves the session as it was", async () => {
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "kept" }]);

        const codeOf = async (source: string | object): Promise<string | null> => {
            try {
                await session.project.open(source as string);
                return null;
            } catch (error) {
                return isGraphtyError(error) ? error.code : "not a GraphtyError";
            }
        };

        assert.strictEqual(await codeOf("{ not json"), "E_PARSE_FAILED");
        assert.strictEqual(await codeOf({ nodes: [] }), "E_BAD_DOCUMENT");
        assert.strictEqual(await codeOf({ format: "graphty-project", version: 2 }), "E_UNSUPPORTED_VERSION");
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["kept"],
        );
        session.dispose();
    });
});
