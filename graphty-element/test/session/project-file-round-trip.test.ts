/**
 * A project file keeps the graph's direction: an undirected graph reopens undirected, with the
 * same fingerprint, so the saved runs come back with their edge values.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

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
