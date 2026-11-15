/**
 * @file The version 2 `results` section codec (spec/README.md 4.5, 6.4, 8.2 rule 3 and 11), behind
 * the `save-files-v2` experiment: what a save writes and the schema it meets, the worked example,
 * a round trip both ways, restoring without computing again, references that bind nowhere, a run
 * whose data changed, reruns that disagree, and runs the view starts. Element references and the
 * build stamp come from stand-ins, so these tests do not depend on the data codec.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { markRecipeRun, resultsCodec, runIdOf, runNameOf } from "../../../src/session/document2/codecs/results";
import type {
    BuildStamp,
    DocumentProblem,
    ElementRefs,
    JsonObject,
    ReadSection,
    WriteContext,
} from "../../../src/session/document2/types";
import { answeringFromProject, type CannedOutcomes, graphIdsOf } from "../../../src/session/projectFile";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

const SPACE = "source:src_01JCBP1C9E2G4J6M8N0Q3S5V7Y";
const LOAD = "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y";
const STAMP: BuildStamp = {
    build: "01JCBQ4H7K9N1Q3S5V7X9Z2B4D",
    sources: { [LOAD]: `sha256:${"a".repeat(64)}`, reader: "01JCBQ3G6J8M0P2R4T6W8Y1A3C" },
};

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
ajv.addSchema(readJson("schemas/graphty-results/v2.json"));

/**
 * The schema's complaints about a results section.
 * @param section - The section.
 * @returns The errors, empty when it validates.
 */
function invalid(section: JsonObject): string[] {
    const validate = ajv.getSchema("https://graphty.app/schema/documents/graphty-results/v2.json");
    assert.isDefined(validate);
    return validate(section) ? [] : (validate.errors ?? []).map((error) => `${error.instancePath} ${error.message}`);
}

/**
 * Stand-in element references: a node is its id in one space; an edge `<source>><target>` from one
 * source.
 * @param session - The session.
 * @returns The references.
 */
function refsOf(session: GraphSession): ElementRefs {
    const edges = (): { id: EdgeId; source: NodeId; target: NodeId }[] =>
        session.data.edges().map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
    const keyOf = (edge: { source: NodeId; target: NodeId }): string => `${String(edge.source)}>${String(edge.target)}`;
    return {
        nodeRef: (id) => (session.data.snapshot().ids.has(id) ? { space: SPACE, key: String(id) } : undefined),
        edgeRef: (id) => {
            const edge = edges().find((each) => each.id === id);
            return edge === undefined ? undefined : { load: LOAD, key: keyOf(edge) };
        },
        node: (ref) => {
            const held = ref as { space?: unknown; key?: unknown } | null;
            return held?.space === SPACE
                ? session.data.nodes().find((node) => String(node.id) === held.key)?.id
                : undefined;
        },
        edge: (ref) => {
            const held = ref as { load?: unknown; key?: unknown } | null;
            return held?.load === LOAD ? edges().find((edge) => keyOf(edge) === held.key)?.id : undefined;
        },
    };
}

/** A session whose runs publish each node's links and a score, and each edge's source. */
interface Counted {
    readonly session: GraphSession;
    /** How many runs were computed. */
    readonly executed: () => number;
    /** Where saved outcomes wait for the runs an open starts, as the project's own map does. */
    readonly canned: CannedOutcomes;
}

/**
 * A number field.
 * @param name - Its name.
 * @param kind - Its kind.
 * @returns The descriptor.
 */
function field(name: string, kind: "node" | "edge") {
    return { name, plainName: name, technicalName: name, kind, type: "number" as const, path: `results.$.${name}` };
}

/**
 * A session over three nodes and two edges, counting the runs it computes.
 * @param score - Node c's score: non-finite numbers are written as strings.
 * @returns The session and the count.
 */
async function counted(score = Number.POSITIVE_INFINITY): Promise<Counted> {
    let executed = 0;
    const canned: CannedOutcomes = new Map();
    const session: GraphSession = createGraphSession({
        features: ["save-files-v2"],
        runs: {
            execute: answeringFromProject((context: RunExecutionContext): Promise<RunOutcome> => {
                executed += 1;
                const snapshot = session.data.snapshot();
                const degrees = snapshot.degree();
                const ids = graphIdsOf(session);
                return Promise.resolve({
                    result: createRunResult({
                        runId: context.runId,
                        shape: "node-metric",
                        fields: [field("value", "node"), field("score", "node"), field("from", "edge")],
                        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                        nodes: ids.nodes.map((id, at) => ({
                            id,
                            values: { value: degrees[at], score: id === "c" ? score : at / 3 },
                        })),
                        edges: ids.edges.map((id, at) => ({ id, values: { from: snapshot.edgeSource(at) } })),
                        caveats: {
                            exact: true,
                            direction: "as-loaded",
                            precision: "f64",
                            method: "degree",
                            facts: [],
                            seed: 7,
                            notes: ["an English sentence"],
                        },
                        durationMs: 1,
                    }),
                });
            }, canned),
        },
    });
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    return { session, executed: () => executed, canned };
}

/**
 * A session holding a hand-started run, a recipe-made run, and placed nodes.
 * @returns The session and its count.
 */
async function withRuns(): Promise<Counted> {
    const made = await counted();
    await made.session.runs.start("degree", undefined, { as: "links", style: false });
    await made.session.runs.start("degree", undefined, { as: "lab__degree", style: false });
    await made.session.positions.set([
        { id: "a", x: 1, y: 2, z: 3 },
        { id: "b", x: -1, y: 0.5, z: 0 },
    ]);
    return made;
}

/**
 * Save the results section, with the header framing would write.
 * @param session - The session.
 * @param problems - Collects what the save reports.
 * @returns The section.
 */
async function save(session: GraphSession, problems: DocumentProblem[] = []): Promise<JsonObject> {
    const context: WriteContext = {
        session,
        problems,
        refs: () => refsOf(session),
        dataId: () => "data",
        sections: new Set(["results"]),
        embed: {},
        isDerived: () => false,
        bindsTo: () => Promise.resolve({ data: "data" }),
        buildStamp: () => Promise.resolve(STAMP),
    };
    const { body } = await resultsCodec.write(context);
    return {
        kind: "graphty-results",
        version: 2,
        generator: { name: "graphty-element", version: "test" },
        bindsTo: { data: "data" },
        ...body,
    };
}

/** What an open is told beside the section. */
interface OpenChoices {
    readonly rerun: boolean;
    readonly stamp?: BuildStamp;
    readonly view?: JsonObject;
}

/**
 * Open a results section over the session's data.
 * @param made - The session and the map its saved outcomes wait in.
 * @param section - The section.
 * @param choices - Whether the runs rerun, the open data's stamp, a view body loading too.
 * @returns What the open reported.
 */
async function open(made: Counted, section: JsonObject, choices: OpenChoices): Promise<DocumentProblem[]> {
    const { session } = made;
    const problems: DocumentProblem[] = [];
    const view: ReadSection | undefined =
        choices.view === undefined
            ? undefined
            : { header: { kind: "graphty-view", version: 1 }, body: choices.view, pointer: "/sections/view" };
    await session.transaction("open", async (tx) => {
        const { kind: _k, version: _v, generator: _g, bindsTo, ...body } = section;
        await resultsCodec.read(
            { header: { kind: "graphty-results", version: 2, bindsTo: bindsTo as never }, body, pointer: "" },
            {
                session,
                problems,
                refs: () => refsOf(session),
                dataId: () => "data",
                sections: new Set(view === undefined ? ["results"] : ["results", "view"]),
                buildStamp: () => Promise.resolve(choices.stamp ?? STAMP),
                tx,
                rerun: choices.rerun,
                dataMode: "replace",
                restored: new Set(),
                other: (name) => (name === "view" ? view : undefined),
                canned: made.canned,
                restoreDerived: () => undefined,
            },
        );
    });
    return problems;
}

const runsOf = (section: JsonObject): Record<string, JsonObject> => section.runs as Record<string, JsonObject>;
const MYSTERY = "lab__mystery";
const codes = (problems: readonly DocumentProblem[]): string[] => problems.map((problem) => problem.code);

describe("run ids in a document", () => {
    it("splits a recipe-made id into namespace and name, and leaves a hand-started id whole", () => {
        assert.deepEqual(runNameOf("card_testing__pagerank"), { namespace: "card_testing", as: "pagerank" });
        assert.isUndefined(runNameOf("links"));
        assert.isUndefined(runNameOf("a___b"));
        assert.strictEqual(runIdOf({ namespace: "card_testing", as: "pagerank" }), "card_testing__pagerank");
    });
});

describe("writing results", () => {
    it("writes every finished run by run id and the layout, valid against the schema", async () => {
        const { session } = await withRuns();
        // A hand-started run whose id only looks recipe-made writes neither namespace nor as.
        assert.notProperty(runsOf(await save(session)).lab__degree, "namespace");
        markRecipeRun(session, "lab__degree");
        const section = await save(session);
        assert.deepEqual(invalid(section), []);
        const runs = runsOf(section);
        assert.deepEqual(Object.keys(runs), ["links", "lab__degree"]);
        const { links } = runs;
        // A hand-started run writes neither namespace nor as; a recipe-made one writes both.
        assert.notProperty(links, "namespace");
        assert.deepEqual([runs.lab__degree.namespace, runs.lab__degree.as], ["lab", "degree"]);
        assert.strictEqual(links.algorithm, "degree");
        assert.deepEqual(Object.keys(links.engine as JsonObject), ["element", "algorithms", "layout"]);
        assert.deepEqual(links.bindsTo, STAMP);
        assert.deepEqual(links.fields, [
            { name: "value", kind: "node", type: "number" },
            { name: "score", kind: "node", type: "number" },
            { name: "from", kind: "edge", type: "number" },
        ]);
        // No English: the deprecated notes are not written.
        assert.notProperty(links.caveats, "notes");
        // The run's own seed is the authority; the caveats do not repeat it.
        assert.notProperty(links.caveats, "seed");
        assert.deepEqual(
            (links.nodes as JsonObject).refs,
            ["a", "b", "c"].map((key) => ({ space: SPACE, key })),
        );
        for (const half of [links.nodes, links.edges] as JsonObject[]) {
            for (const column of Object.values(half.columns as Record<string, unknown[]>)) {
                assert.strictEqual(column.length, (half.refs as unknown[]).length);
            }
        }

        assert.deepEqual(((links.nodes as JsonObject).columns as JsonObject).value, [1, 2, 1]);
        // spec 11: a non-finite number is its string.
        assert.strictEqual((((links.nodes as JsonObject).columns as JsonObject).score as unknown[])[2], "Infinity");
        assert.deepEqual(((links.edges as JsonObject).refs as JsonObject[])[0], { load: LOAD, key: "a>b" });
        const layout = section.layout as JsonObject;
        assert.deepEqual([layout.id, layout.algorithm, layout.dimension], ["force", "ngraph", 3]);
        assert.notProperty(layout, "versions");
        assert.deepEqual(layout.bindsTo, STAMP);
        assert.notProperty(layout, "durationMs", "an untimed layout leaves its duration out, never 0");
        assert.deepEqual(layout.nodes, {
            refs: [
                { space: SPACE, key: "a" },
                { space: SPACE, key: "b" },
            ],
            columns: { x: [1, -1], y: [2, 0.5], z: [3, 0] },
        });
    });

    it("writes NaN and -Infinity as strings too", async () => {
        for (const [score, text] of [
            [Number.NaN, "NaN"],
            [Number.NEGATIVE_INFINITY, "-Infinity"],
        ] as const) {
            const { session } = await counted(score);
            await session.runs.start("degree", undefined, { as: "links", style: false });
            const columns = (runsOf(await save(session)).links.nodes as JsonObject).columns as JsonObject;
            assert.strictEqual((columns.score as unknown[])[2], text);
        }
    });

    it("writes an empty runs object for a session with no runs", async () => {
        const section = await save((await counted()).session);
        assert.deepEqual(section.runs, {});
        assert.deepEqual(invalid(section), []);
    });

    it("validates the worked example and the minimal example", () => {
        assert.deepEqual(invalid(readJson("examples/card-fraud.graphty-results.json")), []);
        assert.deepEqual(invalid(readJson("examples/minimal/minimal.graphty-results.json")), []);
    });
});

describe("reading results", () => {
    it("restores every run as saved without computing it again (state, section, state)", async () => {
        const saved = await withRuns();
        const section = await save(saved.session);
        const opened = await counted();
        const problems = await open(opened, section, { rerun: false });
        assert.deepEqual(codes(problems), []);
        assert.strictEqual(opened.executed(), 0);
        for (const run of saved.session.runs.list()) {
            const now = opened.session.runs.get(run.id)?.result;
            assert.isDefined(now, run.id);
            for (const id of ["a", "b", "c"]) {
                assert.deepEqual(now?.node(id), run.result?.node(id));
            }
        }

        assert.deepEqual(opened.session.positions.get("b"), { x: -1, y: 0.5, z: 0 });
    });

    it("restores a run no view records as saved even with rerun on", async () => {
        const section = await save((await withRuns()).session);
        const opened = await counted();
        assert.deepEqual(codes(await open(opened, section, { rerun: true })), []);
        assert.strictEqual(opened.executed(), 0);
        assert.isDefined(opened.session.runs.get("links")?.result);
    });

    it("writes back what it read byte for byte (section, state, section)", async () => {
        const section = await save((await withRuns()).session);
        const opened = await counted();
        await open(opened, section, { rerun: false });
        assert.strictEqual(JSON.stringify(await save(opened.session)), JSON.stringify(section));
    });

    it("keeps a reference that binds nowhere, reports it, and writes it back", async () => {
        const section = await save((await withRuns()).session);
        const nodes = runsOf(section).links.nodes as { refs: unknown[]; columns: Record<string, unknown[]> };
        nodes.refs.push({ space: SPACE, key: "zzz" });
        for (const column of Object.values(nodes.columns)) {
            column.push(7);
        }

        const opened = await counted();
        const problems = await open(opened, section, { rerun: false });
        assert.deepEqual(problems.find((problem) => problem.code === "W_REFERENCE_UNBOUND")?.params, {
            section: "results",
            pointer: "/runs/links/nodes/refs/3",
            ref: `{"key":"zzz","space":"${SPACE}"}`,
        });
        assert.strictEqual(opened.session.runs.get("links")?.result?.node("a")?.value, 1);
        assert.deepEqual((runsOf(await save(opened.session)).links.nodes as JsonObject).refs, nodes.refs);
    });

    it("reports a run whose data changed by the sources whose copy id differs, per run", async () => {
        const section = await save((await withRuns()).session);
        runsOf(section).lab__degree.bindsTo = { ...STAMP, build: "01JCBQ4H7K9N1Q3S5V7X9Z2B4E" };
        const changed: BuildStamp = { ...STAMP, sources: { ...STAMP.sources, [LOAD]: `sha256:${"c".repeat(64)}` } };
        runsOf(section).links.bindsTo = changed;
        const opened = await counted();
        const problems = await open(opened, section, { rerun: false, stamp: changed });
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_DATA_CHANGED").map((problem) => problem.params),
            [
                { section: "results", run: "lab__degree", sources: `["${LOAD}"]` },
                { section: "results", run: "layout", sources: `["${LOAD}"]` },
            ],
        );
    });

    it("leaves a run the view records to the view: its outcome waits with rerun off", async () => {
        const section = await save((await withRuns()).session);
        const opened = await counted();
        const view = { runs: [{ id: "links", algorithm: "degree", scope: "graph" }] };
        assert.deepEqual(await open(opened, section, { rerun: false, view }), []);
        assert.isTrue(opened.canned.has("links"));
        assert.isUndefined(opened.session.runs.get("links"));
        // The run no view records is restored by the results section itself.
        assert.isDefined(opened.session.runs.get("lab__degree")?.result);
        assert.strictEqual(opened.executed(), 0);
    });

    it("compares a run the view reruns and reports only a disagreement", async () => {
        const section = await save((await withRuns()).session);
        ((runsOf(section).links.nodes as JsonObject).columns as Record<string, unknown[]>).value[0] = 99;
        const opened = await counted();
        const view = { runs: [{ id: "links", algorithm: "degree", scope: "graph" }] };
        const problems = await open(opened, section, { rerun: true, view });
        assert.deepEqual(problems, []);
        // The view starts it; once it ends the results section compares.
        await opened.session.runs.start("degree", undefined, { as: "links", style: false });
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_RESULTS_DIFFER").map((problem) => problem.params),
            [{ run: "links" }],
        );
    });

    it("keeps a run of an algorithm this reader lacks and writes it back", async () => {
        const section = await save((await withRuns()).session);
        const runs = runsOf(section);
        runs[MYSTERY] = { ...runs.lab__degree, as: "mystery", algorithm: "org.example.mystery" };
        const opened = await counted();
        const problems = await open(opened, section, { rerun: false });
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_RUN_NOT_RUN").map((problem) => problem.params),
            [{ run: MYSTERY }],
        );
        assert.deepEqual(runsOf(await save(opened.session))[MYSTERY], runs[MYSTERY]);
    });
});
