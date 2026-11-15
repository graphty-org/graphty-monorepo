/**
 * @file The version 2 recipe codec (spec/README.md 4.3, 5 and 8.4), behind the `save-files-v2`
 * experiment: what a session writes as commands, what names an element and stays out, the replay
 * through one transaction, rerunning, unknown ops and members, and the round trips.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { RunId } from "../../../src/catalog/types";
import { recipeCodec } from "../../../src/session/document2/codecs/recipe";
import type {
    DocumentProblem,
    DocumentSection,
    JsonObject,
    ReadContext,
    SectionWrite,
    WriteContext,
} from "../../../src/session/document2/types";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
const validateRecipe = ajv.compile(readJson("schemas/graphty-recipe/v2.json"));

/** A session and the run ids its executor computed. */
interface Lab {
    readonly session: GraphSession;
    readonly computed: RunId[];
    /** Outcomes waiting for their runs, as a results section would leave them. */
    readonly canned: Map<RunId, RunOutcome>;
}

/**
 * A session whose executor answers every algorithm with an empty node measurement, answering from
 * `canned` first, as the session's own executor does.
 * @returns The lab.
 */
function lab(): Lab {
    const computed: RunId[] = [];
    const canned = new Map<RunId, RunOutcome>();
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        const waiting = canned.get(context.runId);
        if (waiting !== undefined) {
            return Promise.resolve(waiting);
        }

        computed.push(context.runId);
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
    };
    const session = createGraphSession({ features: ["save-files-v2"], runs: { execute } });
    return { session, computed, canned };
}

/**
 * Give a session a small graph.
 * @param session - The session.
 */
async function addGraph(session: GraphSession): Promise<void> {
    await session.data.addNodes([
        { id: "a", type: "host", score: 1 },
        { id: "b", type: "router", score: 2 },
        { id: "c", type: "host", score: 3 },
        { id: "d", type: "host", score: 4 },
    ]);
    await session.data.addEdges([
        { src: "a", dst: "b", weight: 1 },
        { src: "b", dst: "c", weight: 2 },
        { src: "c", dst: "d", weight: 3 },
    ]);
}

/**
 * Write the recipe section of a session.
 * @param session - The session.
 * @returns What the codec wrote and what it reported.
 */
async function write(session: GraphSession): Promise<{ written: SectionWrite; problems: DocumentProblem[] }> {
    const problems: DocumentProblem[] = [];
    const context: WriteContext = {
        session,
        problems,
        refs: () => assert.fail("a recipe names no element"),
        dataId: () => undefined,
        sections: new Set<DocumentSection>(["recipe"]),
        embed: {},
        isDerived: () => false,
        bindsTo: () => Promise.resolve(undefined),
    };
    return { written: await recipeCodec.write(context), problems };
}

/**
 * The section as a file holds it, with the members the framing writes.
 * @param written - What the codec wrote.
 * @returns The section.
 */
function asSection(written: SectionWrite): JsonObject {
    return {
        kind: "graphty-recipe",
        version: 2,
        generator: { name: "graphty-element", version: "0.0.0" },
        ...written.header,
        ...written.body,
    };
}

/**
 * The schema errors of a section.
 * @param section - The section.
 * @returns The errors, empty when it validates.
 */
function invalid(section: JsonObject): string[] {
    return validateRecipe(section)
        ? []
        : (validateRecipe.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

/**
 * Open a recipe section in a session, in one transaction.
 * @param target - The session.
 * @param section - The section, header and body together.
 * @param options - The open's choices.
 * @param options.rerun - Whether runs rerun.
 * @param options.others - The other sections the open loads.
 * @returns What the open reported.
 */
async function read(
    target: Lab,
    section: JsonObject,
    options: { rerun?: boolean; others?: Partial<Record<DocumentSection, JsonObject>> } = {},
): Promise<DocumentProblem[]> {
    const problems: DocumentProblem[] = [];
    const { kind, version, generator: _generator, namespace, commands, ...rest } = section;
    const body: JsonObject = { ...(namespace === undefined ? {} : { namespace }), commands };
    await target.session.transaction("Open document", async (tx) => {
        const context: ReadContext = {
            session: target.session,
            problems,
            refs: () => assert.fail("a recipe names no element"),
            dataId: () => undefined,
            sections: new Set<DocumentSection>(["recipe"]),
            tx,
            rerun: options.rerun ?? true,
            dataMode: "replace",
            restored: new Set(),
            other: (name) => {
                const other = options.others?.[name];
                return other === undefined
                    ? undefined
                    : { header: { kind: `graphty-${name}`, version: 1 }, body: other, pointer: "" };
            },
            canned: target.canned,
            restoreDerived: () => undefined,
        };
        await recipeCodec.read(
            {
                header: { kind: String(kind), version: Number(version), ...rest },
                body,
                pointer: "",
            },
            context,
        );
    });
    return problems;
}

/**
 * What a recipe restores, as plain data: the filter steps' rules, the sets, the runs and the layout.
 * @param session - The session.
 * @returns The state.
 */
function stateOf(session: GraphSession): unknown {
    return {
        steps: session.visibility.steps.map((step) => ({ on: step.on, rule: step.rule })),
        sets: session.sets.list().map((set) => ({ id: set.id, name: set.name, definition: set.definition })),
        runs: session.runs
            .list()
            .filter((run) => run.record.status === "succeeded")
            .map((run) => ({
                id: run.id,
                algorithm: run.record.algorithm,
                params: run.record.params,
                seed: run.record.seed,
                scope: run.record.scope.spec,
            })),
        layout: {
            id: session.layout.id,
            engine: session.layout.engine,
            dimension: session.layout.dimension,
            options: session.layout.options,
        },
    };
}

/**
 * A session holding one of each thing a recipe keeps.
 * @returns The lab.
 */
async function analysis(): Promise<Lab> {
    const source = lab();
    const { session } = source;
    await addGraph(session);
    await session.visibility.setSteps([
        { id: "s1", on: true, rule: { kind: "expression", where: "data.score > `1`" } },
        { id: "s2", on: true, rule: { kind: "edges", where: "data.weight > `1`" } },
    ]);
    await session.runs.start("degree", undefined, { as: "lab__links", style: false });
    session.sets.create({ kind: "rule", where: "data.score > `2`", reading: "induced" }, { name: "High" });
    session.sets.create(
        { kind: "rule", where: "results.lab__links.value > `1`", reading: "induced" },
        { name: "Hubs" },
    );
    await session.layout.setDimension("2d");
    return source;
}

describe("the version 2 recipe codec", () => {
    it("writes filters, sets, runs and the layout as commands that validate", async () => {
        const { session } = await analysis();
        const { written, problems } = await write(session);
        const section = asSection(written);
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(problems, []);
        assert.strictEqual(written.body.namespace, "lab");
        const commands = written.body.commands as JsonObject[];
        assert.deepEqual(
            commands.map((command) => command.op),
            ["graph.filter", "graph.filter", "set.define", "algo.run", "set.define", "layout.set"],
        );
        assert.deepEqual(commands[1], { op: "graph.filter", where: "data.weight > `1`", on: "edges" });
        const run = commands[3];
        assert.strictEqual(run.as, "links");
        assert.strictEqual(run.style, false);
        assert.isUndefined(run.scope, "a run over the graph the recipe's filters keep needs no scope");
        // The set reading the run names it by `as`, and comes after it.
        assert.strictEqual(commands[4].where, "results.links.value > `1`");
        assert.strictEqual(commands[5].dimension, 2);
        assert.deepEqual(written.header?.dependencies, {
            columns: [
                { name: "score", schema: { type: "integer" } },
                { name: "weight", schema: { type: "integer" } },
            ],
            results: ["links"],
        });
    });

    it("leaves out, and reports, what names an element", async () => {
        const { session } = lab();
        await addGraph(session);
        await session.runs.start("degree", undefined, { as: "lab__picked", scope: { nodes: ["a", "b"] } });
        await session.selection.apply({ nodes: ["c"] });
        await session.runs.start("degree", undefined, { as: "lab__on_selection", scope: "selection" });
        session.sets.create(
            { kind: "rule", where: { kind: "neighborhood", seeds: ["a"], depth: 1 }, reading: "induced" },
            {
                name: "Near a",
            },
        );
        session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Just a" });
        await session.visibility.setSteps([
            { id: "near", on: true, rule: { kind: "neighborhood", seeds: ["b"], depth: 1 } },
        ]);
        const { written, problems } = await write(session);
        assert.deepEqual(
            (written.body.commands as JsonObject[]).map((command) => command.op),
            ["layout.set"],
        );
        assert.deepEqual(
            problems.map((problem) => problem.params),
            [
                { section: "recipe", pointer: "/commands", step: "near" },
                { section: "recipe", pointer: "/commands", set: "set_near-a" },
                { section: "recipe", pointer: "/commands", run: "lab__picked" },
                { section: "recipe", pointer: "/commands", run: "lab__on_selection" },
            ],
        );
        assert.isTrue(problems.every((problem) => problem.code === "W_ELEMENT_NAMING_LEFT_OUT"));
        assert.deepEqual(invalid(asSection(written)), []);
    });

    it("writes style false for a run whose suggested layers are saved, and a run scoped by a recipe set", async () => {
        const { session } = lab();
        await addGraph(session);
        const high = session.sets.create(
            { kind: "rule", where: "data.score > `2`", reading: "induced" },
            { name: "High" },
        );
        await session.runs.start("degree", undefined, { as: "lab__deg", scope: { set: high } });
        const { written } = await write(session);
        const run = (written.body.commands as JsonObject[]).find((command) => command.op === "algo.run");
        assert.deepEqual(run, { op: "algo.run", algorithm: "degree", as: "deg", scope: { set: high }, style: false });
        assert.isAbove(session.runs.bindings("lab__deg").length, 0, "the run painted its suggested layer");
        assert.deepEqual(invalid(asSection(written)), []);
    });

    it("round-trips: state to section to state, and section to state to section byte for byte", async () => {
        const source = await analysis();
        const first = await write(source.session);
        const target = lab();
        await addGraph(target.session);
        const problems = await read(target, asSection(first.written));
        assert.deepEqual(problems, []);
        assert.deepEqual(stateOf(target.session), stateOf(source.session));
        const second = await write(target.session);
        assert.strictEqual(JSON.stringify(asSection(second.written)), JSON.stringify(asSection(first.written)));
    });

    it("keeps an opened recipe's identity for its re-save", async () => {
        const target = lab();
        await addGraph(target.session);
        await read(target, {
            kind: "graphty-recipe",
            version: 2,
            id: "org.example.team-overview",
            revision: "1.2.0",
            name: "Overview",
            commands: [{ op: "algo.run", algorithm: "degree", as: "deg", style: false }],
        });
        assert.isDefined(target.session.runs.get("team_overview__deg"), "the namespace comes from the id");
        const { written } = await write(target.session);
        assert.deepEqual(written.header, {
            id: "org.example.team-overview",
            revision: "1.2.0",
            name: "Overview",
        });
    });

    it("stops the replay at an unknown op, unless it says narrows: false", async () => {
        const stopped = lab();
        await addGraph(stopped.session);
        const problems = await read(stopped, {
            kind: "graphty-recipe",
            version: 2,
            namespace: "x",
            commands: [
                { op: "algo.run", algorithm: "degree", as: "one", style: false },
                { op: "org.example.motif-census", as: "motifs" },
                { op: "algo.run", algorithm: "degree", as: "two", params: {}, style: false },
            ],
        });
        assert.deepEqual(problems, [
            { code: "E_UNKNOWN_COMMAND", params: { section: "recipe", pointer: "/commands/1/op" } },
            { code: "W_RUN_NOT_RUN", params: { run: "x__two" } },
        ]);
        assert.deepEqual(stopped.computed, ["x__one"]);

        const skipped = lab();
        await addGraph(skipped.session);
        const skips = await read(skipped, {
            kind: "graphty-recipe",
            version: 2,
            namespace: "x",
            commands: [
                { op: "org.example.motif-census", as: "motifs", narrows: false },
                { op: "set.define", id: "set_m", name: "M", where: "results.motifs.count > `1`", reading: "induced" },
                {
                    op: "algo.run",
                    algorithm: "degree",
                    as: "two",
                    scope: { where: "results.motifs.count > `1`" },
                    style: false,
                },
                { op: "algo.run", algorithm: "degree", as: "three", style: false },
                { op: "join.add", source: "accounts" },
            ],
        });
        assert.deepEqual(skips, [
            { code: "E_UNKNOWN_COMMAND", params: { section: "recipe", pointer: "/commands/0/op" } },
            { code: "W_RUN_NOT_RUN", params: { run: "x__two" } },
        ]);
        assert.deepEqual(skipped.computed, ["x__three"]);
        assert.deepEqual(skipped.session.sets.list(), []);
    });

    it("stops the replay at an unknown member of a command or its scope", async () => {
        for (const [command, pointer] of [
            [{ op: "algo.run", algorithm: "degree", as: "one", sed: 7, style: false }, "/commands/0/sed"],
            [
                {
                    op: "algo.run",
                    algorithm: "degree",
                    as: "one",
                    scope: { where: "data.score > `1`", of: 1 },
                    style: false,
                },
                "/commands/0/scope/of",
            ],
            [{ op: "graph.filter", where: "data.score > `1`", narrows: false }, "/commands/0/narrows"],
        ] as const) {
            const target = lab();
            await addGraph(target.session);
            const problems = await read(target, {
                kind: "graphty-recipe",
                version: 2,
                namespace: "x",
                commands: [command, { op: "algo.run", algorithm: "degree", as: "later", style: false }],
            });
            assert.deepEqual(problems[0], { code: "E_UNKNOWN_OPTION", params: { section: "recipe", pointer } });
            // The command the replay stops at is not run either, when it is a run.
            const notRun = command.op === "algo.run" ? ["x__one", "x__later"] : ["x__later"];
            assert.deepEqual(
                problems.slice(1),
                notRun.map((run): DocumentProblem => ({ code: "W_RUN_NOT_RUN", params: { run } })),
            );
            assert.deepEqual(target.computed, []);
        }
    });

    it("with rerun off, restores runs from waiting outcomes and lists the rest as not run", async () => {
        const source = lab();
        await addGraph(source.session);
        const outcome = await (async () => {
            const run = await source.session.runs.start("degree", undefined, { as: "x__saved" });
            return { result: run, summary: run.summary() } as unknown as RunOutcome;
        })();
        const target = lab();
        await addGraph(target.session);
        target.canned.set("x__saved", outcome);
        const problems = await read(
            target,
            {
                kind: "graphty-recipe",
                version: 2,
                namespace: "x",
                commands: [
                    { op: "algo.run", algorithm: "degree", as: "saved", style: false },
                    { op: "algo.run", algorithm: "degree", as: "missing", style: false },
                ],
            },
            { rerun: false },
        );
        assert.deepEqual(problems, [{ code: "W_RUN_NOT_RUN", params: { run: "x__missing" } }]);
        assert.deepEqual(target.computed, [], "nothing was computed again");
        assert.isDefined(target.session.runs.get("x__saved"));
        assert.isUndefined(target.session.runs.get("x__missing"));
    });

    it("paints nothing for a run with no style that a loaded style section reads, and drops unknown style parts", async () => {
        const target = lab();
        await addGraph(target.session);
        const problems = await read(
            target,
            {
                kind: "graphty-recipe",
                version: 2,
                namespace: "x",
                commands: [
                    { op: "algo.run", algorithm: "degree", as: "read" },
                    { op: "algo.run", algorithm: "degree", as: "styled", style: { size: true, glow: 1 } },
                ],
            },
            { others: { style: { layers: [{ encode: { by: "results.read.value" } }] } } },
        );
        assert.deepEqual(problems, [
            { code: "W_UNKNOWN_MEMBER", params: { section: "recipe", pointer: "/commands/1/style/glow" } },
        ]);
        assert.strictEqual(target.session.runs.painting("x__read")?.state, "opted-out");
        assert.notStrictEqual(target.session.runs.painting("x__styled")?.state, "opted-out");
    });

    it("reads the specification's example recipe, reporting what this release cannot replay", async () => {
        const target = lab();
        await addGraph(target.session);
        const example = readJson("examples/card-fraud.graphty-recipe.json");
        assert.deepEqual(invalid(example), []);
        const problems = await read(target, example);
        // The type scope has no session form yet, and no source of this data plays the role
        // "accounts": the run and the set are reported and the rest replays.
        assert.deepEqual(problems, [
            { code: "E_BAD_DOCUMENT", params: { section: "recipe", pointer: "/commands/2" } },
            { code: "W_RUN_NOT_RUN", params: { run: "card_testing__communities" } },
            { code: "E_BAD_DOCUMENT", params: { section: "recipe", pointer: "/commands/3", reason: "E_BAD_COMMAND" } },
        ]);
        assert.deepEqual(target.computed, ["card_testing__pagerank"]);
        assert.deepEqual(
            target.session.visibility.steps.map((step) => step.rule),
            [{ kind: "edges", where: "data.time >= '2026-11-09'" }],
        );
    });
});
