/**
 * @file `session.recipes` (export a session's analysis and style as one file, apply it to other
 * data) and `session.files.kindOf` (what a file is, by its contents).
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { isGraphtyError } from "../../../src/errors";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";

/**
 * Answer every algorithm with an empty node measurement: these tests are about what runs, not
 * what it computes.
 * @param context - The run.
 * @returns Its outcome.
 */
function execute(context: RunExecutionContext): Promise<RunOutcome> {
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "Value",
                technicalName: "value",
                kind: "node",
                type: "number",
                path: "results.$.value",
            },
        ],
        measured: { nodes: 0, edges: 0 },
        nodes: [],
        edges: [],
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

const ON = { features: ["save-files-v2"], runs: { execute } };
const EXAMPLES = new URL("../../../spec/examples/", import.meta.url);
const example = (name: string): string => readFileSync(new URL(name, EXAMPLES), "utf8");

/**
 * Give a session a small graph with a numeric node column.
 * @param session - The session.
 * @param prefix - Prefixes the node ids, so two sessions hold different data.
 */
async function addGraph(session: GraphSession, prefix: string): Promise<void> {
    await session.data.addNodes([
        { id: `${prefix}a`, score: 1 },
        { id: `${prefix}b`, score: 2 },
        { id: `${prefix}c`, score: 3 },
    ]);
    await session.data.addEdges([
        { src: `${prefix}a`, dst: `${prefix}b` },
        { src: `${prefix}b`, dst: `${prefix}c` },
    ]);
}

describe("session.recipes", () => {
    it("exports runs and layers from one session and applies them, in order, to other data", async () => {
        const first = createGraphSession(ON);
        await addGraph(first, "");
        await first.runs.start("degree");
        await first.runs.start("degree", undefined, { as: "lab__deg", style: false });
        await first.styles.add({
            name: "By degree",
            target: "node",
            selector: { match: "has", path: "results.lab__deg.value" },
            set: { "node.color": "#c62828" },
        });
        const { text } = await first.recipes.export();
        assert.strictEqual(await first.files.kindOf(text), "recipe");
        const ops = (
            JSON.parse(text) as { sections: { recipe: { commands: { op: string }[] } } }
        ).sections.recipe.commands.map((c) => c.op);
        assert.deepEqual(
            ops.filter((op) => op === "algo.run").length,
            2,
            "a run started with no name is in the recipe too",
        );

        const second = createGraphSession(ON);
        await addGraph(second, "x");
        const report = await second.recipes.apply(text);
        assert.strictEqual(report.opened, "document", "applying never replaces the data");
        assert.isDefined(second.runs.get("lab__deg"), "the run ran on the new data");
        assert.lengthOf(second.data.nodes(), 3);
        const layer = second.styles.toDocument().layers.find((each) => each.name === "By degree");
        assert.isDefined(layer, "the style layer came with it");

        // One undoable step.
        await second.undo();
        assert.isUndefined(second.runs.get("lab__deg"));
        first.dispose();
        second.dispose();
    });

    it("leaves a project save writing the session's own recipe after an apply, and after its undo", async () => {
        const first = createGraphSession(ON);
        await addGraph(first, "");
        await first.runs.start("degree", undefined, { as: "lab__deg", style: false });
        const { text } = await first.recipes.export();

        const second = createGraphSession(ON);
        await addGraph(second, "x");
        await second.runs.start("pagerank", undefined, { as: "own__rank", style: false });
        await second.recipes.apply(text);
        const runsIn = async (): Promise<string[]> => {
            const saved = JSON.parse((await second.project.save({ format: 2 })).text) as {
                sections: { recipe: { commands: { op: string; algorithm?: string }[] } };
            };
            return saved.sections.recipe.commands.flatMap((command) =>
                command.op === "algo.run" ? [String(command.algorithm)] : [],
            );
        };
        assert.sameMembers(await runsIn(), ["pagerank", "degree"], "the session's run is kept beside the applied one");
        await second.undo();
        assert.sameMembers(await runsIn(), ["pagerank"], "an undone apply is not saved");
        first.dispose();
        second.dispose();
    });

    it("RecipesApi.apply: no more than linear in the graph", async () => {
        const source = createGraphSession(ON);
        await addGraph(source, "");
        await source.runs.start("degree", undefined, { as: "lab__deg", style: false });
        await source.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#c62828" },
        });
        const { text } = await source.recipes.export();
        source.dispose();
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession(ON);
                const nodes = Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}`, score: at }));
                await session.data.addNodes(nodes);
                await session.data.addEdges(
                    nodes.slice(1).map((node, at) => ({ src: `n${String(at)}`, dst: node.id })),
                );
                const visits = await visitsDuring(async () => {
                    await session.recipes.apply(text);
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited by RecipesApi.apply" },
        );
    });

    it("is refused without the save-files-v2 experiment", async () => {
        const session = createGraphSession();
        for (const call of [() => session.recipes.export(), () => session.recipes.apply("{}")]) {
            try {
                await call();
                assert.fail("expected a refusal");
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_FEATURE_OFF", String(error));
            }
        }

        session.dispose();
    });
});

describe("session.files.kindOf", () => {
    const session = createGraphSession();
    for (const [what, source, kind] of [
        ["a version 2 project", example("card-fraud.graphty.json"), "project"],
        ["a version 2 recipe section file", example("card-fraud.graphty-recipe.json"), "recipe"],
        ["a version 2 style section file", example("card-fraud.graphty-style.json"), "style"],
        ["a version 2 notes section file", example("card-fraud.graphty-notes.json"), "document"],
        [
            "a version 1 project",
            JSON.stringify({
                kind: "graphty-document",
                version: 1,
                members: [{ kind: "graphty-session", version: 1 }],
            }),
            "project",
        ],
        ["a version 1 recipe", JSON.stringify({ kind: "graphty-recipe", version: 1 }), "recipe"],
        ["a 2.x style with no kind", JSON.stringify({ version: 1, layers: [] }), "style"],
        ["graph JSON", JSON.stringify({ nodes: [{ id: "a" }], edges: [] }), "graph"],
        ["a CSV", "source,target\na,b\n", "graph"],
        ["text that is not JSON", "{ nope", "graph"],
    ] as const) {
        it(`reads ${what} as ${kind}`, async () => {
            assert.strictEqual(await session.files.kindOf(source), kind);
        });
    }

    it("reads by content, never by name, from a File and from bytes", async () => {
        const recipe = example("card-fraud.graphty-recipe.json");
        assert.strictEqual(await session.files.kindOf(new File([recipe], "data.csv")), "recipe");
        assert.strictEqual(await session.files.kindOf(new TextEncoder().encode(recipe)), "recipe");
        assert.strictEqual(await session.files.kindOf(new File(["a,b\n1,2\n"], "x.graphty.json")), "graph");
    });
});
