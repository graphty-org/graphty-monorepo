/**
 * @file What a finished run answers without computing again: `runs.answered()` hands it back only
 * while a start would change nothing, and `runs.start(..., { applySuggestedStyles: true })` applies
 * what it suggests from the result it has and puts its layers on top of the stack, in one step.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/** Six nodes in two communities. */
const MEMBERSHIP: Readonly<Record<string, number>> = { a: 0, b: 0, c: 0, d: 1, e: 1, f: 1 };

/** How many times the executor ran. */
let executions = 0;

/**
 * An executor that publishes {@link MEMBERSHIP} as a community result.
 * @param context - The run.
 * @returns The outcome.
 */
async function communities(context: RunExecutionContext): Promise<RunOutcome> {
    executions += 1;
    await Promise.resolve();
    const nodes = Object.entries(MEMBERSHIP);
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields: [
                {
                    name: "group",
                    plainName: "Group",
                    technicalName: "community",
                    kind: "node",
                    type: "integer",
                    path: `results.${context.runId}.group`,
                },
            ],
            measured: { nodes: nodes.length, edges: 0 },
            nodes: nodes.map(([id, group]) => ({ id, values: { group } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session over the six nodes.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    executions = 0;
    const made = createGraphSession({ runs: { execute: communities } });
    await made.data.addNodes(Object.keys(MEMBERSHIP).map((id) => ({ id })));
    return made;
}

/**
 * The ids of the layers a run painted, bottom first.
 * @param s - The session.
 * @param runId - The run.
 * @returns The layer ids.
 */
function layersOf(s: GraphSession, runId: string): string[] {
    return s.styles
        .list()
        .filter((layer) => layer.source.by === "run" && layer.source.runId === runId)
        .map((layer) => layer.id);
}

describe("applying a finished run's suggested layers", () => {
    it("puts the run's layers back on top of a later run's, without running it again, as one step", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "first" });
        await s.runs.start("louvain", {}, { as: "second", seed: 3 });
        await s.styles.settled();
        const first = layersOf(s, "first");
        assert.isAbove(first.length, 0, "the first run painted");
        const top = (): string[] =>
            s.styles
                .list()
                .slice(-first.length)
                .map((layer) => layer.id);
        assert.notDeepEqual(top(), first, "the second run's layers sit above the first's");
        const ran = executions;

        await s.runs.start("louvain", {}, { as: "first", applySuggestedStyles: true });
        await s.styles.settled();

        assert.strictEqual(executions, ran, "nothing ran again");
        assert.deepEqual(top(), layersOf(s, "first"), "the first run's layers are on top");

        await s.undo();
        await s.styles.settled();
        assert.notDeepEqual(top(), layersOf(s, "first"), "one undo puts them back where they were");
    });

    it("leaves the stack in its order when the run's layers are already on top", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "only" });
        await s.styles.settled();
        const before = s.styles.list().map((layer) => layer.id);

        await s.runs.start("louvain", {}, { as: "only", applySuggestedStyles: true });
        await s.styles.settled();

        assert.deepEqual(
            s.styles.list().map((layer) => layer.id),
            before,
        );
    });
});

describe("runs.answered", () => {
    it("hands back the finished run only for the same question over data that has not moved", async () => {
        const s = await session();
        assert.isUndefined(s.runs.answered("louvain", {}, { as: "x" }), "nothing has run yet");

        await s.runs.start("louvain", {}, { as: "x", seed: 1 });
        assert.strictEqual(s.runs.answered("louvain", {}, { as: "x", seed: 1 }), s.runs.get("x"));
        assert.isUndefined(s.runs.answered("louvain", {}, { as: "x", seed: 2 }), "another seed computes");
        assert.isUndefined(s.runs.answered("louvain", {}, { as: "y", seed: 1 }), "another id computes");

        await s.data.addNodes([{ id: "g" }]);
        assert.isUndefined(s.runs.answered("louvain", {}, { as: "x", seed: 1 }), "the data moved");
    });

    it("hands back nothing for a run that was removed", async () => {
        const s = await session();
        await s.runs.start("louvain", {}, { as: "x" });
        s.runs.remove("x");
        await s.styles.settled();

        assert.isUndefined(s.runs.answered("louvain", {}, { as: "x" }));
    });
});
