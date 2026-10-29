/**
 * @file `project:derived` follows every change once the picture has caught up with it (issues
 * #3543, #3529). `project:changed` fires at commit, before the derivation lane's pass; a data
 * edit repaints in the `graph` hook, a run in `runs`, a note in `notes`, and none of them
 * publishes a `style:changed`. A legend read on `project:changed` alone kept the previous pass's
 * categories, and no later event asked for another read.
 */

import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../../src/catalog/algorithms";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

type Hook = (...args: unknown[]) => unknown;

/**
 * A run that gives every node its number of edges as `value`.
 * @param session - Read when the run starts.
 * @param context - The run.
 * @returns The outcome.
 */
function degree(session: () => GraphSession, context: RunExecutionContext): Promise<RunOutcome> {
    const snapshot = session().data.snapshot();
    const counts = new Array<number>(snapshot.nodeCount).fill(0);
    for (const edge of session().data.edges()) {
        counts[snapshot.ids.requireIndex(edge.source)]++;
        counts[snapshot.ids.requireIndex(edge.target)]++;
    }
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: (algorithmByKey("degree")?.fields ?? []).map((field) => ({
            ...field,
            path: `results.${context.runId}.${field.name}`,
        })),
        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
        nodes: counts.map((value, index) => ({ id: snapshot.ids.idOf(index), values: { value } })),
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result });
}

describe("project:derived", () => {
    it("a legend read on it after a data-only edit shows the new category", async () => {
        const s = createGraphSession();
        await s.data.addNodes([
            { id: "a", kind: "x" },
            { id: "b", kind: "y" },
        ]);
        await s.styles.add({
            name: "Kind",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito" } },
        });
        await s.styles.settled();
        const categories = (): string[] =>
            s.styles.legend().flatMap((block) => ("swatches" in block ? block.swatches.map((w) => w.label) : []));
        assert.deepEqual(categories(), ["x", "y"]);

        let read: string[] = [];
        s.on("project:derived", () => {
            read = categories();
        });
        await s.data.updateNodes([{ id: "b", values: { kind: "z" } }]);
        await s.styles.settled();
        assert.deepEqual(read, ["x", "z"], "the read on the event already shows the edited category");
    });

    it("every derivation hook that runs is followed by a project:derived", async () => {
        const s: GraphSession = createGraphSession({ runs: { execute: (context) => degree(() => s, context) } });
        const { lane } = dispatcherOf(s);
        // Every hook the session registered, wrapped to note when it finished.
        const { hooks } = lane as unknown as { hooks: Map<string, Hook[]> };
        let seq = 0;
        const finished: { slice: string; at: number }[] = [];
        const published: number[] = [];
        for (const [slice, list] of hooks) {
            for (const [index, hook] of list.entries()) {
                list[index] = async (...args: unknown[]): Promise<void> => {
                    await hook(...args);
                    finished.push({ slice, at: seq++ });
                };
            }
        }
        s.on("project:derived", () => published.push(seq++));

        await s.data.addNodes([
            { id: "a", kind: "x" },
            { id: "b", kind: "y" },
            { id: "c", kind: "y" },
        ]);
        await s.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        await s.styles.add({
            name: "Kind",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito" } },
        });
        await s.styles.add({
            name: "Noted",
            target: "node",
            selector: { match: "has", path: "graphty.notes.count" },
            set: { "node.shape": "box" },
        });
        await s.runs.start("degree", {}, { as: "deg" });
        await s.styles.add({
            name: "Degree",
            target: "node",
            selector: { match: "expression", where: "results.deg.value > `1`" },
            set: { "node.size": 3 },
        });
        await s.runs.start("degree", {}, { as: "deg" });
        s.notes.add({ text: "n", targets: [{ node: "a" }] });
        await s.data.updateNodes([{ id: "b", values: { kind: "z" } }]);
        await s.visibility.set({ kind: "member", of: { nodes: ["a", "b"] } });
        await s.undo();
        await s.redo();
        await s.styles.settled();
        await lane.settled();
        // The events follow the pass in a promise reaction after `settled`.
        await Promise.resolve();

        const ran = new Set(finished.map((each) => each.slice));
        for (const slice of ["graph", "runs", "notes", "styles", "visibility"]) {
            assert.isTrue(ran.has(slice), `the ${slice} hook ran`);
        }
        const last = published.at(-1) ?? -1;
        const unannounced = finished.filter((each) => each.at > last);
        assert.deepEqual(unannounced, [], "no hook finished after the last project:derived");
    });
});
