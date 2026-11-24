/**
 * @file Former algorithm keys and option names (spec/README.md 10.1 rule 2), behind the
 * `save-files-v2` experiment: a file naming a renamed algorithm or option opens under the current
 * names, reports `W_NAME_UPGRADED` for each, and saves only the current names; an option no name
 * matches leaves that one run not run and the rest of the section restored.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { clearRegisteredAlgorithmsForTesting, publishAlgorithmDescriptor } from "../../../src/catalog/registry";
import type { AlgorithmDescriptor } from "../../../src/catalog/types";
import type { JsonObject } from "../../../src/session/document2/types";
import { createRunResult } from "../../../src/session/results";
import type { Caveats, RunExecutionContext, RunOutcome } from "../../../src/session/runs";

const ON = ["save-files-v2"];

/** The plugin algorithm, renamed from `org.example.old`, with an option once called `oldOpt`. */
const RENAMED: AlgorithmDescriptor = {
    key: "org.example.new",
    plainName: "New",
    technicalName: "New",
    description: "",
    category: "structure",
    shape: "node-metric",
    fields: [
        {
            name: "value",
            plainName: "Value",
            technicalName: "value",
            kind: "node",
            type: "number",
            path: "store.graphty.$.value",
        },
    ],
    options: [{ name: "newOpt", plainName: "New option", type: "number", default: 1, formerNames: ["oldOpt"] }],
    costClass: "instant",
    complexity: "O(n)",
    formerKeys: [{ key: "org.example.old" }],
};

afterEach(() => {
    clearRegisteredAlgorithmsForTesting();
});

/**
 * A session over three nodes whose runs publish a group per node, and record what they ran.
 * @returns The session and the runs it executed.
 */
async function sessionOver(): Promise<{ session: GraphSession; executed: RunExecutionContext[] }> {
    const executed: RunExecutionContext[] = [];
    const session: GraphSession = createGraphSession({
        features: ON,
        runs: {
            execute: (context: RunExecutionContext): Promise<RunOutcome> => {
                executed.push(context);
                const descriptor = session.catalog.algorithms().find((each) => each.key === context.algorithm);
                assert.isDefined(descriptor, context.algorithm);
                const ids = session.data.nodes().map((node) => node.id);
                const community = descriptor.shape === "community";
                const fields = descriptor.fields.filter((field) => field.kind === "node").slice(0, 1);
                const caveats: Caveats = {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: descriptor.key,
                    facts: [],
                    seed: null,
                    weight: null,
                    notes: [],
                };
                const result = createRunResult({
                    runId: context.runId,
                    shape: descriptor.shape,
                    fields,
                    measured: { nodes: ids.length, edges: 0 },
                    nodes: ids.map((id, at) => ({ id, values: community ? { group: at } : { value: at } })),
                    caveats,
                    durationMs: 1,
                });
                return Promise.resolve({ result, summary: result.summary(), caveats, fields });
            },
        },
    });
    await session.data.import({ type: "csv", config: { data: "source,target\nP,Q\nQ,R\n" }, name: "own.csv" });
    return { session, executed };
}

/**
 * The sections of a saved full file.
 * @param text - The file.
 * @returns Its sections.
 */
const sectionsOf = (text: string): Record<string, JsonObject> =>
    (JSON.parse(text) as JsonObject).sections as Record<string, JsonObject>;

/**
 * The upgrades a read reported.
 * @param problems - What it reported.
 * @returns The `W_NAME_UPGRADED` params.
 */
const upgrades = (problems: readonly { code: string; params: object }[]): JsonObject[] =>
    problems.filter((problem) => problem.code === "W_NAME_UPGRADED").map((problem) => ({ ...problem.params }));

describe("a former algorithm key in a results run", () => {
    it("restores `scc` as components with strength strong, and saves components", async () => {
        const { session } = await sessionOver();
        await session.runs.start("components", { strength: "strong" }, { as: "parts", style: false });
        const file = JSON.parse((await session.project.save({ format: 2, results: true })).text) as JsonObject;
        const sections = file.sections as Record<string, JsonObject>;
        const run = (sections.results.runs as Record<string, JsonObject>).parts;
        run.algorithm = "scc";
        delete (run.params as JsonObject).strength;
        // The results run alone, so the open restores it rather than the view starting it again.
        delete sections.view;
        session.dispose();

        const { session: reader } = await sessionOver();
        const report = await reader.project.open(JSON.stringify(file), { rerun: false });
        assert.deepInclude(upgrades(report.problems), {
            section: "results",
            pointer: "/runs/parts/algorithm",
            from: "scc",
            to: "components",
        });
        const restored = reader.runs.get("parts");
        assert.strictEqual(restored?.algorithm, "components");
        assert.strictEqual(restored?.params.strength, "strong");

        const saved = sectionsOf((await reader.project.save({ format: 2, results: true })).text);
        const again = (saved.results.runs as Record<string, JsonObject>).parts;
        assert.strictEqual(again.algorithm, "components");
        assert.strictEqual((again.params as JsonObject).strength, "strong");
        reader.dispose();
    });
});

describe("a plugin's former key and option name", () => {
    /**
     * A file whose recipe and view each run the renamed plugin under its old names.
     * @param params - The params both runs hold.
     * @returns The file, saved from a session that ran the plugin under its new names.
     */
    async function oldNamesFile(params: JsonObject): Promise<JsonObject> {
        publishAlgorithmDescriptor({ descriptor: RENAMED, namespace: "org.example", type: RENAMED.key });
        const { session } = await sessionOver();
        await session.runs.start(RENAMED.key, { newOpt: 2 }, { as: "hand", style: false });
        const file = JSON.parse((await session.project.save({ format: 2 })).text) as JsonObject;
        session.dispose();
        const sections = file.sections as Record<string, JsonObject>;
        for (const record of sections.view.runs as JsonObject[]) {
            record.algorithm = "org.example.old";
            record.params = params;
        }

        sections.recipe = {
            ...(sections.recipe ?? { kind: "graphty-recipe", version: 2 }),
            namespace: "lab",
            commands: [{ op: "algo.run", algorithm: "org.example.old", as: "made", style: false, params }],
        };
        return file;
    }

    it("runs both under the new names, reports both upgrades, and saves the new names", async () => {
        const file = await oldNamesFile({ oldOpt: 3 });
        const { session, executed } = await sessionOver();
        const report = await session.project.open(JSON.stringify(file), { rerun: true, applyRecipe: true });
        const found = upgrades(report.problems);
        for (const section of ["recipe", "view"]) {
            const mine = found.filter((each) => each.section === section);
            assert.deepInclude(
                mine.map((each) => [each.from, each.to]),
                ["org.example.old", "org.example.new"],
                section,
            );
            assert.deepInclude(
                mine.map((each) => [each.from, each.to]),
                ["oldOpt", "newOpt"],
                section,
            );
        }

        assert.isAtLeast(executed.length, 2);
        for (const context of executed) {
            assert.strictEqual(context.algorithm, "org.example.new");
            assert.strictEqual(context.params.newOpt, 3);
            assert.notProperty(context.params, "oldOpt");
        }

        const saved = sectionsOf((await session.project.save({ format: 2 })).text);
        const text = JSON.stringify([saved.view, saved.recipe]);
        assert.notInclude(text, "org.example.old");
        assert.notInclude(text, "oldOpt");
        assert.include(text, "org.example.new");
        session.dispose();
    });

    it("keeps the new name's value when both names are present", async () => {
        const file = await oldNamesFile({ oldOpt: 3, newOpt: 5 });
        const { session, executed } = await sessionOver();
        await session.project.open(JSON.stringify(file), { rerun: true, applyRecipe: true });
        assert.isAtLeast(executed.length, 2);
        for (const context of executed) {
            assert.strictEqual(context.params.newOpt, 5);
            assert.notProperty(context.params, "oldOpt");
        }

        session.dispose();
    });
});

describe("an option no name matches", () => {
    it("leaves that results run not run and restores the rest of the section", async () => {
        const { session } = await sessionOver();
        await session.runs.start("components", {}, { as: "parts", style: false });
        await session.runs.start("components", { strength: "strong" }, { as: "strong", style: false });
        const file = JSON.parse((await session.project.save({ format: 2, results: true })).text) as JsonObject;
        const sections = file.sections as Record<string, JsonObject>;
        ((sections.results.runs as Record<string, JsonObject>).parts.params as JsonObject).bogus = 1;
        delete sections.view;
        session.dispose();

        const { session: reader } = await sessionOver();
        const report = await reader.project.open(JSON.stringify(file), { rerun: false });
        assert.deepInclude(
            report.problems.map((problem): JsonObject => ({ code: problem.code, ...problem.params })),
            { code: "W_RUN_NOT_RUN", run: "parts", reason: "E_UNKNOWN_OPTION" },
        );
        assert.strictEqual(reader.runs.get("strong")?.status, "succeeded");
        reader.dispose();
    });
});
