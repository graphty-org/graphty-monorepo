/**
 * @file A run's values live in graphty's area of the shared store, `store.graphty.<run>.<field>`
 * (#2029), and a saved file that still reads them at their older address, `results.<run>.<field>`,
 * opens reading the same values.
 */
import { assert, describe, it } from "vitest";

import type { GraphStore } from "../../src/data/GraphStore";
import { createRunResult, pathParts, resultPath } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { assertRunId } from "../../src/session/runs/runId";
import { upgradeStorePaths } from "../../src/session/storePaths";
import type { ElementSession } from "../../src/session/types";
import { type Harness, makeSession } from "./helpers";

/** The color a layer over the run paints. */
const RED = "#ff0000";

/**
 * A session whose degree runs count every node's links.
 * @returns The harness.
 */
function withDegree(): Harness {
    let store: GraphStore | null = null;
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        if (store === null) {
            throw new Error("no store");
        }

        const snapshot = store.getSnapshot();
        const degrees = snapshot.degree();
        const nodes = [];
        for (let index = 0; index < snapshot.nodeCount; index++) {
            nodes.push({ id: snapshot.ids.idOf(index), values: { value: degrees[index] } });
        }

        const result = createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Connections",
                    technicalName: "degree",
                    kind: "node",
                    type: "number",
                    path: "store.graphty.$.value",
                },
            ],
            measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
            nodes,
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", facts: [], notes: [] },
            durationMs: 1,
        });
        return Promise.resolve({ result, summary: result.summary() });
    };
    const harness = makeSession({ runs: { execute } });
    ({ store } = harness);
    return harness;
}

/**
 * The nodes a layer painted red.
 * @param h - The harness.
 * @returns Their ids, sorted.
 */
function red(h: Harness): string[] {
    const session = h.session as ElementSession;
    const snapshot = session.snapshot();
    const found: string[] = [];
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (session.paint.styleOf("node", row)["node.color"]?.hex === RED) {
            found.push(String(snapshot.ids.idOf(row)));
        }
    }

    return found.sort();
}

describe("a run's values in the shared store", () => {
    it("are addressed at store.graphty.<run>.<field>, and notes is no run's name", () => {
        assert.strictEqual(resultPath("louvain", "group"), "store.graphty.louvain.group");
        assert.deepEqual(pathParts("store.graphty.louvain.group"), { from: "run", runId: "louvain", field: "group" });
        assert.isUndefined(pathParts("store.graphty.notes.count"), "a note value is not a run's");
        assert.isUndefined(pathParts("results.louvain.group"), "the older address is not read at run time");
        assert.throws(() => assertRunId("notes"), /is not "notes"/);
    });

    it("upgradeStorePaths moves a run's older path in path members, expressions, ends and templates", () => {
        const layer = {
            selector: { match: "expression", where: "results.degree.value > `1` && data.name == 'results.x.y'" },
            encode: {
                "node.label": { template: ["{results.degree.value|rank}", "{data.name}"] },
                "edge.color": { by: "graphty.source.results.degree.value" },
                "node.size": { by: "data.results.degree.value" },
            },
        };
        assert.deepEqual(upgradeStorePaths(layer), {
            selector: {
                match: "expression",
                where: "store.graphty.degree.value > `1` && data.name == 'results.x.y'",
            },
            encode: {
                "node.label": { template: ["{store.graphty.degree.value|rank}", "{data.name}"] },
                "edge.color": { by: "graphty.source.store.graphty.degree.value" },
                "node.size": { by: "data.results.degree.value" },
            },
        });
    });

    it("a saved project whose layer reads results.<run>.<field> opens reading the run's values", async () => {
        const h = withDegree();
        const { session } = h;
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        const run = await session.runs.start("degree", undefined, { style: false });
        await session.styles.add({
            name: "Hub",
            target: "node",
            selector: { match: "expression", where: `${resultPath(run.runId, "value")} > \`1\`` },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.deepEqual(red(h), ["b"]);

        const { text } = await session.project.save();
        assert.include(text, `store.graphty.${run.runId}.value`);
        const old = text.replaceAll("store.graphty.", "results.");
        assert.notInclude(old, "store.graphty.");
        await session.project.open(old, { discard: true });
        await session.styles.settled();
        assert.deepEqual(red(h), ["b"], "the older address reads the run's value");
        session.dispose();
    });
});
