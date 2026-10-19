/**
 * A project file keeps the graph's direction (an undirected graph reopens undirected, with the
 * same fingerprint, so the saved runs come back with their edge values), and its file name gives
 * the project its name back.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, PROJECT_FILE, projectFileName } from "../../session";
import { DataConfig } from "../../src/config/DataConfig";

const UNDIRECTED_GML = `graph [
  node [ id 1 label "a" ]
  node [ id 2 label "b" ]
  node [ id 3 label "c" ]
  edge [ source 1 target 2 ]
  edge [ source 2 target 3 ]
]`;

describe("the project file and the graph's direction", () => {
    it("reopens an undirected graph as undirected, with the same fingerprint", async () => {
        const saved = createGraphSession();
        await saved.data.import({ type: "gml", config: { data: UNDIRECTED_GML } });
        assert.isFalse(saved.status.directed);
        const { text } = await saved.project.save();

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.isFalse(opened.status.directed);
        assert.strictEqual(opened.data.fingerprint(), saved.data.fingerprint());
        assert.deepStrictEqual(report.problems, []);
        assert.strictEqual(opened.data.statistics().directedness, "undirected");
        saved.dispose();
        opened.dispose();
    });

    it("reopens a directed graph as directed", async () => {
        const saved = createGraphSession();
        await saved.data.import({
            type: "gml",
            config: { data: UNDIRECTED_GML.replace("graph [", "graph [ directed 1") },
        });
        assert.isTrue(saved.status.directed);
        const opened = createGraphSession();
        await opened.project.open((await saved.project.save()).text);
        assert.isTrue(opened.status.directed);
        assert.strictEqual(opened.data.fingerprint(), saved.data.fingerprint());
        saved.dispose();
        opened.dispose();
    });

    it("says nothing about a direction nothing settled", async () => {
        const saved = createGraphSession();
        await saved.data.addNodes([{ id: "a" }]);
        const { text } = await saved.project.save();
        const data = (JSON.parse(text) as { members: { kind: string; graph?: object }[] }).members.find(
            (member) => member.kind === "graphty-data",
        );
        assert.notProperty(data?.graph, "directed");
        saved.dispose();
    });
});

describe("the project file's name and type", () => {
    it("names a project's file the way an open reads the name back", async () => {
        assert.strictEqual(projectFileName("Florentine families"), "Florentine families.graphty.json");
        assert.strictEqual(projectFileName(null), "project.graphty.json");
        assert.strictEqual(projectFileName("  "), "project.graphty.json");
        assert.isTrue(projectFileName("x").endsWith(PROJECT_FILE.extension));
        assert.strictEqual(PROJECT_FILE.mediaType, "application/vnd.graphty+json");

        const saved = createGraphSession();
        await saved.data.addNodes([{ id: "a" }]);
        const { text } = await saved.project.save();
        const opened = createGraphSession();
        await opened.project.open(text, { fileName: projectFileName("Pioneers") });
        assert.strictEqual(opened.project.name, "Pioneers");
        saved.dispose();
        opened.dispose();
    });
});

describe("add-edges with a declared direction", () => {
    const edges = [{ source: "a", target: "b" }];

    it("settles the direction of a graph with no edges, as one undoable step", async () => {
        const session = createGraphSession();
        await session.execute({ op: "data.apply", mutation: { kind: "add-edges", records: edges, directed: false } });
        assert.isFalse(session.status.directed);
        assert.deepInclude(session.data.store.directionSettledBy, { by: "file", statedBy: '"directed": false' });

        await session.undo();
        assert.strictEqual(session.data.store.directionSettledBy.by, "unsettled");
        assert.lengthOf(session.data.edges(), 0);
        session.dispose();
    });

    it("leaves a graph that already holds edges, and where its direction came from, alone", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "gml",
            config: { data: UNDIRECTED_GML.replace("graph [", "graph [ directed 1") },
        });
        const before = session.data.store.directionSettledBy;
        const steps = session.history.steps.length;
        await session.execute({
            op: "data.apply",
            mutation: { kind: "add-edges", records: [{ source: "1", target: "3" }], directed: true },
        });
        assert.isTrue(session.status.directed);
        assert.deepStrictEqual(session.data.store.directionSettledBy, before);
        assert.strictEqual(session.history.steps.length, steps + 1, "only the edges were added");

        await session.execute({
            op: "data.apply",
            mutation: { kind: "add-edges", records: [{ source: "3", target: "1" }], directed: false },
        });
        assert.isTrue(session.status.directed, "edges already built keep their direction");
        assert.deepStrictEqual(session.data.store.directionSettledBy, before);
        session.dispose();
    });

    it("never overrides a direction the configuration set", async () => {
        const session = createGraphSession({ config: { data: DataConfig.parse({ directed: true }) } });
        await session.execute({ op: "data.apply", mutation: { kind: "add-edges", records: edges, directed: false } });
        assert.isTrue(session.status.directed);
        assert.strictEqual(session.data.store.directionSettledBy.by, "configuration");
        session.dispose();
    });
});
