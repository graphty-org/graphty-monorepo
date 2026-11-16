/**
 * @file A community's group numbers hold the same members across runs of the same question: a
 * filter makes a selection step read a new run over what is visible now, and the community
 * algorithm numbers its groups afresh, so "group 1" of the new run may be other nodes. The element
 * numbers a run's groups after the newest run of the same algorithm over the same scope, the group
 * sharing most members keeping its number, so a step, a layer or a card that picked "group 1" keeps
 * the same group.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { StepsReading } from "../../../session";
import type { UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { keepGroupNumbers } from "../../../src/session/runs/groupNumbers";

/** Three communities. Each run numbers them by size inside its scope, smallest first. */
const COMMUNITIES: readonly (readonly string[])[] = [
    ["a", "b", "c"],
    ["d", "e", "f", "g"],
    ["h", "i"],
];

/**
 * An executor that numbers the communities by how many of their members are in scope, as a
 * community algorithm numbers its groups afresh on every run.
 * @param context - The run.
 * @returns The outcome.
 */
async function communities(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const inside = new Set([...context.scope.nodes].map(String));
    const present = COMMUNITIES.map((members) => members.filter((id) => inside.has(id))).filter(
        (members) => members.length > 0,
    );
    const ordered = [...present].sort((x, y) => x.length - y.length || x[0].localeCompare(y[0]));
    // Another resolution finds the same communities and numbers them one place on.
    if (context.params.resolution === 2) {
        ordered.unshift(ordered.pop() ?? []);
    }
    const nodes = ordered.flatMap((members, group) => members.map((id) => ({ id, values: { group } })));
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
                    measurement: "categorical",
                    unstable: true,
                    path: `results.${context.runId}.group`,
                },
            ],
            graph: { sizes: ordered.map((members) => members.length) },
            measured: { nodes: nodes.length, edges: 0 },
            nodes,
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * The nine nodes on a session whose community runs use {@link communities}.
 * @returns The session.
 */
async function nine(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: communities } });
    sessions.push(session);
    await session.data.addNodes(COMMUNITIES.flat().map((id) => ({ id })));
    return session;
}

/** A selection of the visible graph's community "1" (a, b and c on the whole graph). */
const GROUP_ONE: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            start: "none",
            steps: [
                {
                    op: "add",
                    rule: {
                        kind: "measure",
                        algorithm: "louvain",
                        field: "group",
                        test: { kind: "categories", values: ["1"] },
                    },
                },
            ],
        },
    ],
};

/**
 * The selection's members once its run has answered.
 * @param session - The session.
 * @returns The reading.
 */
function ready(session: GraphSession, rule: UnionLeaf = GROUP_ONE): Promise<StepsReading> {
    return new Promise<StepsReading>((resolve) => {
        const watch = session.scope.watchSteps(rule, (reading) => {
            if (reading.branches[0].state === "ready") {
                queueMicrotask(() => {
                    watch.end();
                });
                resolve(reading);
            }
        });
        if (watch.current.branches[0].state === "ready") {
            watch.end();
            resolve(watch.current);
        }
    });
}

/**
 * The node ids a reading holds, sorted.
 * @param reading - The reading.
 * @returns The ids.
 */
function members(reading: StepsReading): string[] {
    const { result } = reading;
    return typeof result === "object" && "nodes" in result ? [...(result.nodes ?? [])].map(String).sort() : [];
}

describe("group numbers across a re-run", () => {
    it("a step that picked a group keeps that group's members after a filter", async () => {
        const session = await nine();
        assert.deepEqual(members(await ready(session)), ["a", "b", "c"]);

        // Hiding a and b leaves c alone in its community, which a fresh numbering would call 0.
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "member", of: { nodes: ["a", "b"] } },
        });
        const reading = await ready(session);
        assert.deepEqual(members(reading), ["c"], "group 1 is still the group c is in");
        const result = session.runs.get(reading.branches[0].steps[0].run ?? "")?.result;
        assert.deepEqual(
            ["c", "d", "h"].map((id) => result?.node(id)?.group),
            [1, 2, 0],
            "the new run numbers every group as the first did",
        );
    });

    it("a step whose settings change keeps the group it picked, read from the new run", async () => {
        const session = await nine();
        assert.deepEqual(members(await ready(session)), ["a", "b", "c"]);
        const [step] = GROUP_ONE.branches[0].steps;
        const retuned: UnionLeaf = {
            ...GROUP_ONE,
            branches: [
                {
                    start: "none",
                    steps: [{ ...step, rule: { ...step.rule, params: { resolution: 2 } } as typeof step.rule }],
                },
            ],
        };
        const reading = await ready(session, retuned);
        assert.notStrictEqual(reading.branches[0].steps[0].run, session.runs.list()[0].id, "a run of its own");
        assert.deepEqual(members(reading), ["a", "b", "c"], "group 1 of the new run is the same group");
    });

    it("a layer that picked a group by a step keeps painting that group after a filter", async () => {
        const session = await nine();
        await ready(session);
        const layer = await session.styles.add({
            name: "Group 1",
            target: "node",
            selector: { match: "rule", where: GROUP_ONE },
            set: { "node.color": "#D55E00" },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).matched, 3);
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "member", of: { nodes: ["a", "b"] } },
        });
        await ready(session);
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).matched, 1, "c alone, as the group it picked holds now");
    });
});

/**
 * A community result over some nodes.
 * @param groups - Each node's group.
 * @returns The result.
 */
function partition(groups: Readonly<Record<string, number>>): ReturnType<typeof createRunResult> {
    return createRunResult({
        runId: "louvain",
        shape: "community",
        fields: [
            {
                name: "group",
                plainName: "Group",
                technicalName: "community",
                kind: "node",
                type: "integer",
                path: "results.louvain.group",
            },
        ],
        measured: { nodes: Object.keys(groups).length, edges: 0 },
        nodes: Object.entries(groups).map(([id, group]) => ({ id, values: { group } })),
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
        durationMs: 1,
    });
}

describe("keepGroupNumbers", () => {
    const { caveats } = partition({}).summary();

    it("reports groups that merged into one, under the number of the one sharing most members", () => {
        const before = partition({ a: 0, b: 0, c: 0, d: 1, e: 1, f: 2 });
        const after = partition({ a: 5, b: 5, c: 5, d: 5, e: 5, f: 6 });
        const kept = keepGroupNumbers(before, after, new Set(["group"]), caveats);
        assert.deepEqual(
            ["a", "d", "f"].map((id) => kept.result.node(id)?.group),
            [0, 0, 2],
        );
        assert.deepEqual(kept.caveats.facts, [
            { code: "groups.merged", params: { field: "group", group: 0, from: [1] } },
        ]);
        assert.deepEqual(kept.result.summary().caveats.facts, kept.caveats.facts, "the result says so too");
        assert.deepEqual(
            (kept.result.graph.sizes as readonly { group: number }[]).map((row) => row.group),
            [0, 2],
            "the size rows follow the numbers",
        );
    });

    it("reports a group that split, keeping its number on the larger part", () => {
        const before = partition({ a: 0, b: 0, c: 0, d: 0, e: 1 });
        const after = partition({ a: 1, b: 1, c: 1, d: 0, e: 2 });
        const kept = keepGroupNumbers(before, after, new Set(["group"]), caveats);
        assert.deepEqual(
            ["a", "d", "e"].map((id) => kept.result.node(id)?.group),
            [0, 2, 1],
        );
        assert.deepEqual(kept.caveats.facts, [
            { code: "groups.split", params: { field: "group", group: 0, into: [2] } },
        ]);
    });

    it("leaves a first run, and a field that is not unstable, as they are", () => {
        const after = partition({ a: 3 });
        assert.strictEqual(keepGroupNumbers(undefined, after, new Set(["group"]), caveats).result, after);
        assert.strictEqual(keepGroupNumbers(partition({ a: 1 }), after, new Set(), caveats).result, after);
    });
});
