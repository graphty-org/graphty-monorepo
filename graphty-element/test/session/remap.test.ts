/**
 * @file Changing a load's column roles after it loaded (`data.remap`): a new key column makes
 * the nodes anew and the edges find their ends among them; a new label or weight column; one
 * undo step that brings the old mapping and graph back; stale runs; refusals; a project save
 * of the re-mapped graph; and work in proportion to the graph.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** People: `row` numbers them, `name` is what the links name them by. */
const PEOPLE = "row,name,email,team\n1,alice,a@x.org,red\n2,bob,b@x.org,blue\n3,carol,c@x.org,red\n";
/** Links between people by name, with two number columns either of which could be the weight. */
const LINKS = "from,to,trips,cost\nalice,bob,2,9\nbob,carol,5,1\n";

/**
 * A stand-in run: a standalone session runs no algorithm of its own.
 * @param context - The run.
 * @returns A score per node.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Rank",
                    technicalName: "pagerank",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 0, edges: 0 },
            nodes: [],
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session with the people keyed by the wrong column (`row`), so the links make nodes of their own.
 * @returns The session.
 */
async function wronglyKeyed(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute } });
    await session.data.import(
        {
            config: {
                nodeFile: new File([PEOPLE], "people.csv"),
                edgeFile: new File([LINKS], "links.csv"),
            },
        },
        { mapping: { tables: { nodes: { key: "row" }, edges: { source: "from", target: "to", weight: "trips" } } } },
    );
    return session;
}

/**
 * The node ids, sorted.
 * @param session - The session.
 * @returns The ids.
 */
const ids = (session: GraphSession): string[] =>
    session.data
        .nodes()
        .map((node) => String(node.id))
        .sort();

/**
 * The edges as `source>target`, sorted.
 * @param session - The session.
 * @returns The pairs.
 */
const pairs = (session: GraphSession): string[] =>
    session.data
        .edges()
        .map((edge) => `${String(edge.source)}>${String(edge.target)}`)
        .sort();

/**
 * The code and reason a rejected promise carries.
 * @param run - What should reject.
 * @returns The code and `details.reason`.
 */
async function refusal(run: () => Promise<unknown>): Promise<{ code?: string; reason?: unknown }> {
    const error: unknown = await run().then(
        () => assert.fail("expected a refusal"),
        (caught: unknown) => caught,
    );
    const coded = error as { code?: string; details?: { reason?: unknown } };
    return { code: coded.code, reason: coded.details?.reason };
}

describe("data.remap", () => {
    it("makes the nodes anew from a new key column, and the edges find their ends among them", async () => {
        const session = await wronglyKeyed();
        assert.deepEqual(ids(session), ["1", "2", "3", "alice", "bob", "carol"]);

        const steps = session.history.steps.length;
        await session.data.remap({ mapping: { tables: { nodes: { key: "name" } } } });

        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.deepEqual(ids(session), ["alice", "bob", "carol"]);
        assert.deepEqual(pairs(session), ["alice>bob", "bob>carol"]);
        assert.strictEqual(session.data.nodes().find((node) => node.id === "alice")?.team, "red");
        const [source] = session.data.sources();
        assert.strictEqual(source.mapping?.tables.nodes.key, "name");
        assert.strictEqual(source.mapping?.tables.edges.weight, "trips");
    });

    it("moves the weight and the label to other columns", async () => {
        const session = await wronglyKeyed();
        await session.data.remap({ mapping: { tables: { nodes: { key: "name", label: "email" } } } });
        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "email");

        await session.data.remap({ mapping: { tables: { edges: { weight: "cost" } } } });
        assert.strictEqual(session.data.loadedWeight()?.attribute, "cost");
        assert.strictEqual(session.config.data.knownFields.edgeWeightPath, "cost");
        // The roles not named stay as they were.
        assert.strictEqual(session.data.sources()[0].mapping?.tables.nodes.key, "name");
    });

    it("comes back exactly with one undo, and goes again with one redo", async () => {
        const session = await wronglyKeyed();
        const before = {
            nodes: session.data.nodes(),
            edges: pairs(session),
            mapping: session.data.sources()[0].mapping,
            weight: session.config.data.knownFields.edgeWeightPath,
        };
        await session.data.remap({ mapping: { tables: { nodes: { key: "name" }, edges: { weight: "cost" } } } });
        const after = {
            nodes: session.data.nodes(),
            edges: pairs(session),
            mapping: session.data.sources()[0].mapping,
        };

        await session.undo();
        assert.deepEqual(session.data.nodes(), before.nodes);
        assert.deepEqual(pairs(session), before.edges);
        assert.deepEqual(session.data.sources()[0].mapping, before.mapping);
        assert.strictEqual(session.config.data.knownFields.edgeWeightPath, before.weight);

        await session.redo();
        assert.deepEqual(session.data.nodes(), after.nodes);
        assert.deepEqual(pairs(session), after.edges);
        assert.deepEqual(session.data.sources()[0].mapping, after.mapping);
    });

    it("marks a run on the old graph stale and runs nothing again", async () => {
        const session = await wronglyKeyed();
        const run = session.runs.start("pagerank", undefined, { style: false });
        await run;
        assert.isNull(session.runs.get(run.id)?.stale ?? null);
        const runs = session.runs.list().length;

        await session.data.remap({ mapping: { tables: { nodes: { key: "name" } } } });

        assert.strictEqual(session.runs.get(run.id)?.stale?.reason, "data-changed");
        assert.strictEqual(session.runs.list().length, runs);
    });

    it("refuses a mapping it cannot carry out, with a code", async () => {
        const session = await wronglyKeyed();
        const steps = session.history.steps.length;
        assert.deepEqual(await refusal(() => session.data.remap({ mapping: { tables: { nodes: { key: "nope" } } } })), {
            code: "E_UNKNOWN_ATTRIBUTE",
            reason: undefined,
        });
        assert.strictEqual(
            (await refusal(() => session.data.remap({ mapping: { tables: { elsewhere: { key: "name" } } } }))).code,
            "E_BAD_COMMAND",
        );
        assert.deepEqual(
            await refusal(() => session.data.remap({} as unknown as Parameters<typeof session.data.remap>[0])),
            { code: "E_BAD_COMMAND", reason: "no-mapping" },
        );
        assert.strictEqual(
            (await refusal(() => session.data.remap({ mapping: { key: "name" }, source: "nope" }))).code,
            "E_SOURCE_UNKNOWN",
        );
        assert.strictEqual(session.history.steps.length, steps);

        await session.data.import({ config: { file: new File(["id\nzed\n"], "extra.csv") } }, { mode: "merge" });
        assert.deepEqual(await refusal(() => session.data.remap({ mapping: { key: "name" } })), {
            code: "E_BAD_COMMAND",
            reason: "which-source",
        });
    });

    it("re-maps the load it is told to when the graph holds several", async () => {
        const session = await wronglyKeyed();
        await session.data.import({ config: { file: new File(["id\nzed\n"], "extra.csv") } }, { mode: "merge" });
        const [first] = session.data.sources();
        await session.data.remap({ source: first.key, mapping: { tables: { nodes: { key: "name" } } } });
        assert.deepEqual(ids(session), ["alice", "bob", "carol", "zed"]);
    });

    it("saves the re-mapped graph with its mapping, and refuses to re-map a load opened from a file", async () => {
        const session = await wronglyKeyed();
        await session.data.remap({ mapping: { tables: { nodes: { key: "name" } } } });
        const { text } = await session.project.save();

        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.deepEqual(reopened.data.nodes(), session.data.nodes());
        assert.deepEqual(pairs(reopened), pairs(session));
        assert.deepEqual(reopened.data.sources()[0].mapping, session.data.sources()[0].mapping);
        assert.deepEqual(
            await refusal(() => reopened.data.remap({ mapping: { tables: { nodes: { key: "email" } } } })),
            {
                code: "E_UNSUPPORTED",
                reason: "not-reloadable",
            },
        );
    });

    it("SessionDataApi.remap: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const people = Array.from({ length: size }, (_unused, at) => `${String(at)},p${String(at)}`);
                const links = Array.from(
                    { length: size },
                    (_unused, at) => `p${String(at)},p${String((at + 1) % size)}`,
                );
                const session = createGraphSession();
                await session.data.import(
                    {
                        config: {
                            nodeFile: new File([["row,name", ...people].join("\n")], "people.csv"),
                            edgeFile: new File([["from,to", ...links].join("\n")], "links.csv"),
                        },
                    },
                    { mapping: { tables: { nodes: { key: "row" }, edges: { source: "from", target: "to" } } } },
                );
                const visits = await visitsDuring(() =>
                    session.data.remap({ mapping: { tables: { nodes: { key: "name" } } } }),
                );
                assert.strictEqual(session.data.statistics().nodeCount, size);
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.remap" },
        );
    });
});
