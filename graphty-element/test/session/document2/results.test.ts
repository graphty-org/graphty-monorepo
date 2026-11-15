/**
 * @file The version 2 `results` section codec (spec/README.md 4.5, 6.3, 6.4, 8.4 and 11), behind
 * the `save-files-v2` experiment: what a save writes and the schema it meets, a round trip both
 * ways, restoring without computing again, references that bind nowhere, changed data, reruns that
 * disagree, and runs another section starts. The data codec's references and binding are stood in
 * for here until it lands.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { resultsCodec, runIdOf, runNameOf } from "../../../src/session/document2/codecs/results";
import type {
    DocumentProblem,
    EdgeRef,
    ElementRefs,
    JsonObject,
    NodeRef,
    ReadContext,
} from "../../../src/session/document2/types";
import { graphIdsOf } from "../../../src/session/projectFile";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

const binding = vi.hoisted(() => ({
    sources: { test: `sha256:${"a".repeat(64)}` },
    fingerprint: `sha256:${"b".repeat(64)}`,
}));

/**
 * Stand-in element references: a node is `source:test` and its id; an edge is its ends and
 * `<source>><target>`.
 * @param session - The session.
 * @returns The references.
 */
function standInRefs(session: GraphSession): ElementRefs {
    const nodeRef = (id: NodeId): NodeRef | undefined =>
        session.data.snapshot().ids.has(id) ? { space: "source:test", key: String(id) } : undefined;
    const edges = (): { id: EdgeId; source: NodeId; target: NodeId }[] =>
        session.data.edges().map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));
    const isRef = (ref: unknown): ref is NodeRef =>
        typeof ref === "object" && ref !== null && (ref as NodeRef).space === "source:test";
    return {
        nodeRef,
        edgeRef(id): EdgeRef | undefined {
            const edge = edges().find((each) => each.id === id);
            return edge === undefined
                ? undefined
                : {
                      from: { space: "source:test", key: String(edge.source) },
                      to: { space: "source:test", key: String(edge.target) },
                      key: `${String(edge.source)}>${String(edge.target)}`,
                  };
        },
        node(ref) {
            return isRef(ref) ? session.data.nodes().find((node) => String(node.id) === ref.key)?.id : undefined;
        },
        edge(ref) {
            const key = (ref as { key?: unknown } | null)?.key;
            return edges().find((edge) => `${String(edge.source)}>${String(edge.target)}` === key)?.id;
        },
    };
}

vi.mock("../../../src/session/document2/codecs/dataRefs", async (actual) => ({
    ...(await actual<object>()),
    elementRefsOf: standInRefs,
    dataBindingOf: () => Promise.resolve({ sources: { ...binding.sources }, fingerprint: binding.fingerprint }),
}));

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

/** A session whose runs publish each node's links and a score, and each edge's source. */
interface Counted {
    readonly session: GraphSession;
    /** How many runs were computed. */
    readonly executed: () => number;
}

/**
 * A session over three nodes and two edges, counting the runs it computes.
 * @param score - Node c's score: non-finite numbers are written as strings.
 * @returns The session and the count.
 */
async function counted(score = Number.POSITIVE_INFINITY): Promise<Counted> {
    let executed = 0;
    const session: GraphSession = createGraphSession({
        features: ["save-files-v2"],
        runs: {
            execute: (context: RunExecutionContext): Promise<RunOutcome> => {
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
                            notes: [],
                        },
                        durationMs: 1,
                    }),
                });
            },
        },
    });
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    return { session, executed: () => executed };
}

/**
 * A number field.
 * @param name - Its name.
 * @param kind - Its domain.
 * @returns The descriptor.
 */
function field(name: string, kind: "node" | "edge") {
    return { name, plainName: name, technicalName: name, kind, type: "number" as const, path: `results.$.${name}` };
}

/**
 * A session holding a run the author named (`links`), one the element minted, and placed nodes.
 * @returns The session and its count.
 */
async function withRuns(): Promise<Counted> {
    const made = await counted();
    await made.session.runs.start("degree", undefined, { as: "links", style: false });
    await made.session.runs.start("degree", undefined, { style: false });
    await made.session.positions.set([
        { id: "a", x: 1, y: 2, z: 3 },
        { id: "b", x: -1, y: 0.5, z: 0 },
    ]);
    return made;
}

/**
 * Save the results section as a section file.
 * @param session - The session.
 * @returns The file's text and the save's report.
 */
async function saveResults(session: GraphSession): Promise<{ text: string; section: JsonObject }> {
    const saved = await session.project.save({ format: 2, sections: ["results"], form: "section" });
    return { text: saved.text, section: JSON.parse(saved.text) as JsonObject };
}

/**
 * Open a results section file over the session's data.
 * @param session - The session.
 * @param text - The file.
 * @param rerun - Whether the runs rerun.
 * @returns What the open reported.
 */
async function openResults(session: GraphSession, text: string, rerun: boolean): Promise<readonly DocumentProblem[]> {
    const report = await session.project.open(text, { rerun, bindOtherData: true });
    return report.problems as readonly DocumentProblem[];
}

const runsOf = (section: JsonObject): Record<string, JsonObject> => section.runs as Record<string, JsonObject>;
const MYSTERY = "lab__mystery";
const codes = (problems: readonly DocumentProblem[]): string[] => problems.map((problem) => problem.code);

describe("run ids in a document", () => {
    it("splits a namespaced id and gives today's bare ids the session or reader namespace", () => {
        assert.deepEqual(runNameOf("card_testing__pagerank", false), { namespace: "card_testing", as: "pagerank" });
        assert.deepEqual(runNameOf("links", false), { namespace: "reader", as: "links" });
        assert.deepEqual(runNameOf("degree", true), { namespace: "session", as: "degree" });
        assert.isUndefined(runNameOf("my-run", false));
        assert.isUndefined(runNameOf("a___b", false));
        for (const id of ["card_testing__pagerank", "links"]) {
            const name = runNameOf(id, false);
            assert.isDefined(name);
            assert.strictEqual(name && runIdOf(name), id);
        }
    });
});

describe("writing results", () => {
    it("writes every finished run and the layout, valid against the schema", async () => {
        const { session } = await withRuns();
        const { section } = await saveResults(session);
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(section.bindsTo, { data: (section.bindsTo as JsonObject).data, ...binding });
        const runs = runsOf(section);
        const minted = Object.keys(runs).find((key) => key.startsWith("session__"));
        assert.isDefined(minted);
        const links = runs.reader__links;
        assert.strictEqual(links.namespace, "reader");
        assert.strictEqual(links.as, "links");
        assert.strictEqual(links.algorithm, "degree");
        assert.deepEqual(links.engine, { name: "@graphty/algorithms", version: (links.engine as JsonObject).version });
        assert.deepEqual(
            (links.nodes as JsonObject).refs,
            ["a", "b", "c"].map((key) => ({ space: "source:test", key })),
        );
        for (const half of [links.nodes, links.edges] as JsonObject[]) {
            for (const column of Object.values(half.columns as Record<string, unknown[]>)) {
                assert.strictEqual(column.length, (half.refs as unknown[]).length);
            }
        }

        assert.deepEqual(((links.nodes as JsonObject).columns as JsonObject).value, [1, 2, 1]);
        // spec 11: a non-finite number is its string.
        assert.strictEqual((((links.nodes as JsonObject).columns as JsonObject).score as unknown[])[2], "Infinity");
        assert.deepEqual(((links.edges as JsonObject).refs as JsonObject[])[0].key, "a>b");
        const { layout } = runs;
        assert.strictEqual(layout.dimension, 3);
        assert.deepEqual((layout.nodes as JsonObject).refs, [
            { space: "source:test", key: "a" },
            { space: "source:test", key: "b" },
        ]);
        assert.deepEqual(((layout.nodes as JsonObject).columns as JsonObject).position, [
            [1, 2, 3],
            [-1, 0.5, 0],
        ]);
    });

    it("writes NaN and -Infinity as strings too", async () => {
        for (const [score, text] of [
            [Number.NaN, "NaN"],
            [Number.NEGATIVE_INFINITY, "-Infinity"],
        ] as const) {
            const { session } = await counted(score);
            await session.runs.start("degree", undefined, { as: "links", style: false });
            const { section } = await saveResults(session);
            const columns = (runsOf(section).reader__links.nodes as JsonObject).columns as JsonObject;
            assert.strictEqual((columns.score as unknown[])[2], text);
        }
    });

    it("writes an empty runs object for a session with no runs", async () => {
        const { session } = await counted();
        const { section } = await saveResults(session);
        assert.deepEqual(section.runs, {});
        assert.deepEqual(invalid(section), []);
    });
});

describe("reading results", () => {
    it("restores every run as saved without computing it again (state, section, state)", async () => {
        const saved = await withRuns();
        const { text } = await saveResults(saved.session);
        const opened = await counted();
        const problems = await openResults(opened.session, text, false);
        assert.deepEqual(codes(problems), []);
        assert.strictEqual(opened.executed(), 0);
        for (const run of saved.session.runs.list()) {
            const was = run.result;
            const now = opened.session.runs.get(run.id)?.result;
            assert.isDefined(now, run.id);
            for (const id of ["a", "b", "c"]) {
                assert.deepEqual(now?.node(id), was?.node(id));
            }

            for (const edge of opened.session.data.edges()) {
                assert.deepEqual(now?.edge(edge.id)?.from, was?.edge(edge.id)?.from);
            }

            assert.deepEqual(now?.graph, was?.graph);
        }

        assert.deepEqual(opened.session.positions.get("b"), { x: -1, y: 0.5, z: 0 });
    });

    it("writes back what it read byte for byte (section, state, section)", async () => {
        const { text } = await saveResults((await withRuns()).session);
        const opened = await counted();
        await openResults(opened.session, text, false);
        const again = await saveResults(opened.session);
        // Each session mints its own data id; the runs and the rest of the binding must match.
        const strip = (section: JsonObject): JsonObject => ({
            ...section,
            modified: null,
            created: null,
            bindsTo: { ...(section.bindsTo as JsonObject), data: null },
        });
        assert.strictEqual(JSON.stringify(strip(again.section)), JSON.stringify(strip(JSON.parse(text) as JsonObject)));
    });

    it("keeps a reference that binds nowhere, reports it, and writes it back", async () => {
        const { section } = await saveResults((await withRuns()).session);
        const nodes = runsOf(section).reader__links.nodes as { refs: unknown[]; columns: Record<string, unknown[]> };
        const ghost = { space: "source:test", key: "zzz" };
        nodes.refs.push(ghost);
        for (const column of Object.values(nodes.columns)) {
            column.push(7);
        }

        const opened = await counted();
        const problems = await openResults(opened.session, JSON.stringify(section), false);
        const reported = problems.find((problem) => problem.code === "W_REFERENCE_UNBOUND");
        assert.deepEqual(reported?.params, {
            section: "results",
            pointer: "/runs/reader__links/nodes/refs/3",
            ref: '{"key":"zzz","space":"source:test"}',
        });
        assert.strictEqual(opened.session.runs.get("links")?.result?.node("a")?.value, 1);
        const again = await saveResults(opened.session);
        assert.deepEqual((runsOf(again.section).reader__links.nodes as JsonObject).refs, nodes.refs);
    });

    it("reports changed data by the sources whose hash differs", async () => {
        const { text } = await saveResults((await withRuns()).session);
        const before = { ...binding };
        binding.sources = { test: `sha256:${"c".repeat(64)}` };
        binding.fingerprint = `sha256:${"d".repeat(64)}`;
        try {
            const opened = await counted();
            const problems = await openResults(opened.session, text, false);
            const changed = problems.find((problem) => problem.code === "W_DATA_CHANGED");
            assert.deepEqual(changed?.params, { section: "results", sources: '["test"]' });
        } finally {
            Object.assign(binding, before);
        }
    });

    it("reruns with rerun on and reports only the runs that disagree", async () => {
        const { section } = await saveResults((await withRuns()).session);
        const agreeing = await counted();
        assert.notInclude(
            codes(await openResults(agreeing.session, JSON.stringify(section), true)),
            "W_RESULTS_DIFFER",
        );
        assert.strictEqual(agreeing.executed(), 2);

        ((runsOf(section).reader__links.nodes as JsonObject).columns as Record<string, unknown[]>).value[0] = 99;
        const disagreeing = await counted();
        const problems = await openResults(disagreeing.session, JSON.stringify(section), true);
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_RESULTS_DIFFER").map((problem) => problem.params),
            [{ run: "links" }],
        );
        assert.strictEqual(disagreeing.session.runs.get("links")?.result?.node("a")?.value, 1);
    });

    it("keeps a run of an algorithm this reader lacks and writes it back", async () => {
        const { section } = await saveResults((await withRuns()).session);
        const runs = runsOf(section);
        runs[MYSTERY] = { ...runs.reader__links, namespace: "lab", as: "mystery", algorithm: "org.example.mystery" };
        const opened = await counted();
        const problems = await openResults(opened.session, JSON.stringify(section), false);
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_RUN_NOT_RUN").map((problem) => problem.params),
            [{ run: MYSTERY }],
        );
        const again = await saveResults(opened.session);
        assert.deepEqual(runsOf(again.section)[MYSTERY], runs[MYSTERY]);
    });

    it("leaves a run a view run record stands for to the view, its outcome waiting", async () => {
        const { section } = await saveResults((await withRuns()).session);
        const opened = await counted();
        const canned: ReadContext["canned"] = new Map();
        const derived: string[] = [];
        const problems: DocumentProblem[] = [];
        const minted = Object.keys(runsOf(section)).find((key) => key.startsWith("session__")) ?? "";
        const mintedAs = String(runsOf(section)[minted].as);
        await opened.session.transaction("open", async (tx) => {
            const context: ReadContext = {
                session: opened.session,
                problems,
                refs: () => standInRefs(opened.session),
                dataId: () => "data",
                sections: new Set(["results", "view"]),
                tx,
                rerun: false,
                dataMode: "replace",
                restored: new Set(),
                other: (name) =>
                    name === "view"
                        ? {
                              header: { kind: "graphty-view", version: 1 },
                              body: { runs: { [minted]: { namespace: "session", as: mintedAs } } },
                              pointer: "/sections/view",
                          }
                        : undefined,
                canned,
                restoreDerived: (id) => derived.push(id),
            };
            const { runs } = section;
            await resultsCodec.read(
                {
                    header: { kind: "graphty-results", version: 2, bindsTo: section.bindsTo as never },
                    body: { runs },
                    pointer: "",
                },
                context,
            );
        });
        assert.deepEqual(problems, []);
        assert.isTrue(canned.has(mintedAs));
        assert.isUndefined(opened.session.runs.get(mintedAs));
        // The view starts the minted run and marks it minted once it exists, not the results codec.
        assert.deepEqual(derived, []);
        // The run no other section stands for is started by the results section itself. Its saved
        // outcome waits in this test's own map, which the session's executor does not read, so it is
        // computed here; project.open answers it from the project's map (end-to-end.test.ts).
        assert.isFalse(canned.has("links"));
        assert.isDefined(opened.session.runs.get("links")?.result);
    });
});
