/**
 * The project file: save a whole session as a graphty document, open it in another, and get the
 * same project back -- without computing a single run again.
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
            const id = snapshot.ids.idOf(index);
            // One value JSON text cannot hold, so a test can tell the columns keep it.
            nodes.push({ id, values: { value: id === "d" ? Number.POSITIVE_INFINITY : degrees[index] } });
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
    await session.visibility.set({ kind: "degree", min: 1 });
    return harness;
}

/**
 * Open a file in a session, and the code it was refused with.
 * @param session - The session.
 * @param source - The file's text.
 * @param options - The open options.
 * @returns The code, or null when it opened.
 */
async function refusal(
    session: Harness["session"],
    source: string,
    options: Parameters<Harness["session"]["project"]["open"]>[1] = {},
): Promise<string | null> {
    try {
        await session.project.open(source, options);
        return null;
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not a GraphtyError";
    }
}

describe("the project file", () => {
    it("is a graphty document holding every member, and opens in another session without computing again", async () => {
        const source = await busySession();
        await source.session.project.rename("Network study");
        const { text, report: saved } = await source.session.project.save({
            extensions: { "com.example.app": { tab: "values" } },
        });
        const file = JSON.parse(text) as Record<string, unknown>;
        assert.strictEqual(file.kind, "graphty-document");
        assert.strictEqual(file.version, 1);
        assert.strictEqual(file.name, "Network study");
        assert.deepStrictEqual(saved.written, [
            "graphty-data",
            "graphty-session",
            "graphty-arrangement",
            "graphty-results",
            "graphty-style",
            "graphty-notes",
            "graphty-view-state",
        ]);
        assert.deepStrictEqual(file.requires, ["graphty-data", "graphty-session", "graphty-results"]);
        assert.strictEqual(saved.bytes, new TextEncoder().encode(text).length);
        assert.deepStrictEqual(saved.leftOut, []);
        assert.isFalse(source.session.project.dirty);

        const { harness: target, calls } = withDegree();
        const { session } = target;
        const report = await session.project.open(new Blob([text]));

        assert.strictEqual(report.opened, "project");
        assert.deepStrictEqual(report.problems, [], "everything came back");
        assert.includeMembers(
            [...report.restored],
            [
                "config",
                "graph",
                "layout",
                "arrangement",
                "pins",
                "runs",
                "styles",
                "visibility",
                "sets",
                "views",
                "notes",
            ],
        );
        assert.deepStrictEqual(report.extensions, { "com.example.app": { tab: "values" } });
        assert.strictEqual(report.name, "Network study");
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
        const result = session.results.get("links" as RunId);
        assert.strictEqual(result?.node("b")?.value, 2);
        assert.strictEqual(result?.node("d")?.value, Number.POSITIVE_INFINITY, "a typed column keeps Infinity");

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
        assert.deepStrictEqual(session.visibility.filter, source.session.visibility.filter);

        source.session.dispose();
        session.dispose();
    });

    it("carries edge results and the edge selection over to the edge ids of the session it opens in", async () => {
        const source = await busySession();
        const [, middle] = source.session.data.edges();
        await source.session.selection.apply({ edges: [middle.id] });
        const { text } = await source.session.project.save();

        // A session that has already numbered edges of its own numbers the opened ones afresh.
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "x" }, { id: "y" }]);
        await session.data.addEdges([
            { src: "x", dst: "y" },
            { src: "y", dst: "x" },
        ]);

        const report = await session.project.open(text, { discard: true });
        assert.deepStrictEqual(report.problems, []);

        const result = session.results.get("links" as RunId);
        for (const edge of session.data.edges()) {
            assert.strictEqual(result?.edge(edge.id)?.from, edge.source, "each edge keeps its own value");
        }

        const [selected] = session.selection.edges;
        assert.strictEqual(session.data.edge(selected)?.source, "b", "the selected edge is still b to c");
        source.session.dispose();
        session.dispose();
    });

    it("reopens in the session that saved it: a set-scoped run, the filter and a layer follow the set's new id", async () => {
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const core = session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
        await session.runs.start("degree", undefined, { as: "in_core" as RunId, style: false, scope: { set: core } });
        await session.visibility.set({ kind: "member", of: { set: core } });
        await session.styles.add({
            name: "Core in red",
            target: "node",
            selector: { match: "member", of: { set: core } },
            set: { "node.color": "#ff0000" },
        });
        const { text } = await session.project.save();

        // The session has issued the set's id already, so the reopened set is minted another.
        const report = await session.project.open(text);
        assert.deepStrictEqual(report.problems, []);
        const [reopened] = session.sets.list();
        assert.notStrictEqual(reopened.id, core);
        assert.deepStrictEqual(
            session.runs.list().map((run) => run.id),
            ["in_core"],
        );
        assert.deepStrictEqual(session.visibility.filter, { kind: "member", of: { set: reopened.id } });
        const layer = session.styles.list().find((held) => held.name === "Core in red");
        assert.deepStrictEqual(layer?.selector, { match: "member", of: { set: reopened.id } });
        session.dispose();
    });

    it("binds a saved layer to a run whose fields name it by the placeholder", async () => {
        const harness = await busySession();
        const report = await harness.session.styles.applyTemplate(harness.session.styles.toDocument());
        assert.deepStrictEqual(report.unbound, [], "results.links.value is answered by the run links");
        const [block] = harness.session.styles.legend().filter((entry) => entry.runId === "links");
        assert.strictEqual(block.field?.plainName, "Connections", "the legend names the column in the run's words");
        harness.session.dispose();
    });

    it("opens a project with a fresh history whose baseline is the opened state", async () => {
        const source = await busySession();
        const { text } = await source.session.project.save();
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "z" }]);

        await session.project.open(text, { discard: true });
        assert.strictEqual(session.data.nodes().length, 4);
        assert.deepStrictEqual(session.history.steps, []);
        assert.isFalse(session.canUndo);

        source.session.dispose();
        session.dispose();
    });

    it("refuses to open a project over unsaved changes unless told to discard them", async () => {
        const source = await busySession();
        const { text } = await source.session.project.save();
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "kept" }]);

        assert.strictEqual(await refusal(session, text), "E_UNSAVED_CHANGES");
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["kept"],
        );
        assert.isNull(await refusal(session, text, { discard: true }));
        source.session.dispose();
        session.dispose();
    });

    it("is dirty after a change, clean after a save, and clean again when undo returns to the save", async () => {
        const { harness } = withDegree();
        const { session } = harness;
        const heard: { name: string | null; dirty: boolean }[] = [];
        session.on("project:status", (change) => heard.push(change));

        assert.isFalse(session.project.dirty);
        await session.data.addNodes([{ id: "a" }]);
        assert.isTrue(session.project.dirty);
        await session.project.save();
        assert.isFalse(session.project.dirty);

        await session.data.addNodes([{ id: "b" }]);
        assert.isTrue(session.project.dirty);
        await session.undo();
        assert.isFalse(session.project.dirty, "undo back to the saved step");

        await session.selection.apply({ nodes: ["a"] });
        assert.isFalse(session.project.dirty, "the selection is not project state");

        await session.project.rename("Renamed");
        assert.strictEqual(session.project.name, "Renamed");
        assert.isTrue(session.project.dirty);
        await session.undo();
        assert.isNull(session.project.name, "a rename is one undoable step");

        assert.deepStrictEqual(heard, [
            { name: null, dirty: true },
            { name: null, dirty: false },
            { name: null, dirty: true },
            { name: null, dirty: false },
            { name: "Renamed", dirty: true },
            { name: null, dirty: false },
        ]);
        session.dispose();
    });

    it("lists a run still computing as left out", async () => {
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "a" }]);
        const pending = session.runs.start("degree", undefined, { as: "later" as RunId, style: false });
        const { report } = await session.project.save();
        assert.deepStrictEqual(report.leftOut, [{ code: "W_RUN_PENDING", params: { slice: "runs", id: "later" } }]);
        await pending;
        session.dispose();
    });

    it("leaves out the members the caller names", async () => {
        const harness = await busySession();
        const { report } = await harness.session.project.save({ leaveOut: ["graphty-notes", "graphty-view-state"] });
        assert.notInclude(report.written, "graphty-notes");
        assert.notInclude(report.written, "graphty-view-state");
        harness.session.dispose();
    });

    it("reports what did not come back: an unknown member kind, edited data, an algorithm this session lacks", async () => {
        const source = await busySession();
        const file = JSON.parse((await source.session.project.save()).text) as {
            members: { kind: string; version: number; graph?: { links: unknown[] }; runs?: { algorithm: string }[] }[];
        };
        file.members.push({ kind: "org.example.bookmarks", version: 1 });
        // A hand edit: one more link, so edges are no longer where the results say.
        file.members[0].graph?.links.push({ source: "a", target: "d" });

        const { harness } = withDegree();
        const report = await harness.session.project.open(JSON.stringify(file));
        assert.deepStrictEqual(report.problems, [
            { code: "W_UNKNOWN_KIND", params: { index: 7, kind: "org.example.bookmarks" } },
            { code: "W_DATA_DIFFERS", params: { slice: "runs", id: "links" } },
        ]);
        const result = harness.session.results.get("links" as RunId);
        assert.strictEqual(result?.node("b")?.value, 2, "node values are keyed by id and survive");
        assert.isUndefined(result?.edge(harness.session.data.edges()[0].id), "edge values are left out");

        const results = file.members.find((member) => member.kind === "graphty-results");
        results!.runs![0].algorithm = "not-installed";
        const { harness: other } = withDegree();
        const missing = await other.session.project.open(JSON.stringify(file));
        assert.deepInclude(missing.problems, { code: "E_UNKNOWN_ALGORITHM", params: { slice: "runs", id: "links" } });
        source.session.dispose();
        harness.session.dispose();
        other.session.dispose();
    });

    it("adds a bare style document as one undoable step", async () => {
        const harness = await busySession();
        const { session } = harness;
        const before = session.styles.list().length;
        const style = {
            kind: "graphty-style",
            version: 1,
            layers: [
                {
                    name: "Routers big",
                    selector: { match: "expression", where: 'data.type == `"router"`' },
                    set: { "node.size": 3 },
                },
            ],
        };
        const report = await session.project.open(JSON.stringify(style));
        assert.strictEqual(report.opened, "document");
        assert.deepStrictEqual(report.restored, ["styles"]);
        assert.strictEqual(session.styles.list().length, before + 1);
        await session.undo();
        assert.strictEqual(session.styles.list().length, before);
        session.dispose();
    });

    it("refuses what it cannot read and leaves the session as it was", async () => {
        const { harness } = withDegree();
        const { session } = harness;
        await session.data.addNodes([{ id: "kept" }]);

        assert.strictEqual(await refusal(session, "{ not json"), "E_PARSE_FAILED");
        assert.strictEqual(await refusal(session, '{ "nodes": [] }'), "E_UNKNOWN_FORMAT");
        assert.strictEqual(
            await refusal(session, '{ "kind": "graphty-document", "version": 2, "members": [] }'),
            "E_UNSUPPORTED_VERSION",
        );
        assert.strictEqual(await refusal(session, '{ "kind": "graphty-document", "version": 1 }'), "E_BAD_DOCUMENT");
        assert.strictEqual(
            await refusal(
                session,
                '{ "kind": "graphty-document", "version": 1, "members": [], "x": { "__proto__": {} } }',
            ),
            "E_BAD_DOCUMENT",
        );
        assert.strictEqual(
            await refusal(
                session,
                '{ "kind": "graphty-document", "version": 1, "requires": ["org.example.x"], "members": [] }',
            ),
            "E_UNSUPPORTED",
        );
        assert.strictEqual(
            await refusal(session, '{ "kind": "graphty-document", "version": 1, "members": [] }', {
                limits: { fileBytes: 10 },
            }),
            "E_TOO_LARGE",
        );
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["kept"],
        );
        session.dispose();
    });
});
