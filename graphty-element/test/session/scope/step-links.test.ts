/**
 * @file A union step's `links`: the step's degree, walk and computation read only the edges that
 * pass an edge-side rule ("ignore links with weight under 2"), within the step's input, and such a
 * computation belongs to the step, never to `session.runs`. On Les Miserables, every edge given a
 * weight of 1, 2 or 3 by its position.
 */

import { assert, describe, it } from "vitest";

import type { StepsReading } from "../../../session";
import type { RuleTree, UnionLeaf, UnionStep } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);
const WEIGHT = (edge: number): number => (edge % 3) + 1;
const HEAVY: RuleTree = { kind: "range", attribute: "data.weight", min: 2 };

/** What the fake executor saw, per execution: counted work. */
interface Seen {
    readonly scopes: { nodes: number; edges: number }[];
}

/**
 * An executor that publishes 1 for every node of its scope, recording the scope's size.
 * @param seen - Where each execution is recorded.
 * @returns The executor.
 */
function recording(seen: Seen) {
    return async (context: RunExecutionContext): Promise<RunOutcome> => {
        seen.scopes.push({ nodes: context.scope.nodeCount, edges: context.scope.edgeCount });
        const inside = [...context.scope.nodes];
        return Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                measured: { nodes: inside.length, edges: context.scope.edgeCount },
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: context.algorithm,
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
                shape: "node-metric",
                fields: [
                    {
                        name: "value",
                        plainName: "Value",
                        technicalName: "value",
                        kind: "node",
                        type: "number",
                        path: `results.${context.runId}.value`,
                    },
                ],
                nodes: inside.map((id) => ({ id, values: { value: 1 } })),
            }),
        });
    };
}

/**
 * Les Miserables with a weight on every edge.
 * @param seen - Where executions are recorded.
 * @returns The session.
 */
async function weighted(seen: Seen = { scopes: [] }): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: recording(seen) } });
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({
            source: IDS[src],
            target: IDS[LES_MISERABLES.dst[e]],
            weight: WEIGHT(e),
        })),
    );
    return session;
}

/**
 * Each node's degree over only the edges a test passes, counted from the edge list.
 * @param keep - Whether an edge counts.
 * @returns The degree by id.
 */
function degreesOver(keep: (edge: number) => boolean): Map<string, number> {
    const counts = new Map<string, number>(IDS.map((id) => [id, 0]));
    LES_MISERABLES.src.forEach((src, e) => {
        if (keep(e)) {
            const dst = LES_MISERABLES.dst[e];
            counts.set(IDS[src], (counts.get(IDS[src]) ?? 0) + 1);
            counts.set(IDS[dst], (counts.get(IDS[dst]) ?? 0) + 1);
        }
    });
    return counts;
}

/**
 * A node union of one All branch.
 * @param steps - Its steps.
 * @returns The leaf.
 */
const allOf = (steps: readonly UnionStep[]): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "graph",
    branches: [{ start: "all", steps }],
});

/**
 * The first reading whose first branch is ready.
 * @param session - The session.
 * @param rule - The selection.
 * @returns The reading.
 */
async function ready(session: GraphSession, rule: UnionLeaf): Promise<StepsReading> {
    return new Promise<StepsReading>((resolve) => {
        const watch = session.scope.watchSteps(rule, (reading) => {
            if (reading.branches[0].state === "ready" && reading.branches[0].steps.every((s) => s.values !== null)) {
                watch.end();
                resolve(reading);
            }
        });
        const now = watch.current;
        if (now.branches[0].state === "ready" && now.branches[0].steps.every((s) => s.values !== null)) {
            watch.end();
            resolve(now);
        }
    });
}

describe("a union step's links", () => {
    it("counts a degree step over only the passing links", async () => {
        const session = await weighted();
        const degrees = degreesOver((e) => WEIGHT(e) >= 2);
        const expected = [...degrees.values()].filter((d) => d >= 5).length;
        const unscoped = [...degreesOver(() => true).values()].filter((d) => d >= 5).length;
        const step: UnionStep = { op: "keep", rule: { kind: "range", attribute: "graphty.degree", min: 5 } };
        const scoped = session.scope.watchSteps(allOf([{ ...step, links: HEAVY }]), () => undefined);
        const plain = session.scope.watchSteps(allOf([step]), () => undefined);
        assert.strictEqual(scoped.current.total.count, expected);
        assert.strictEqual(plain.current.total.count, unscoped);
        assert.notStrictEqual(expected, unscoped, "the links change the answer");
        scoped.end();
        plain.end();
    });

    it("walks hops only along the passing links", async () => {
        const session = await weighted();
        // The busiest character, so the heavy links leave some neighbours out.
        const valjean = IDS.indexOf(
            [...degreesOver(() => true)].reduce((best, each) => (each[1] > best[1] ? each : best))[0],
        );
        const reached = new Set<number>([valjean]);
        LES_MISERABLES.src.forEach((src, e) => {
            const dst = LES_MISERABLES.dst[e];
            if (WEIGHT(e) >= 2 && (src === valjean || dst === valjean)) {
                reached.add(src === valjean ? dst : src);
            }
        });
        const watch = session.scope.watchSteps(
            allOf([{ op: "keep", rule: { kind: "hops", of: { nodes: [IDS[valjean]] }, max: 1 }, links: HEAVY }]),
            () => undefined,
        );
        assert.strictEqual(watch.current.total.count, reached.size);
        assert.isBelow(reached.size, (degreesOver(() => true).get(IDS[valjean]) ?? 0) + 1, "some links left out");
        watch.end();
    });

    it("computes a measure on only the passing links, as the step's own computation", async () => {
        const seen: Seen = { scopes: [] };
        const session = await weighted(seen);
        const heavy = [...LES_MISERABLES.src].filter((_src, e) => WEIGHT(e) >= 2).length;
        const reading = await ready(
            session,
            allOf([
                {
                    op: "keep",
                    rule: { kind: "measure", algorithm: "degree", field: "value", test: { kind: "range", min: 1 } },
                    links: HEAVY,
                },
            ]),
        );
        assert.deepEqual(seen.scopes, [{ nodes: IDS.length, edges: heavy }]);
        assert.strictEqual(session.runs.list().length, 0, "never a session run");
        assert.strictEqual(reading.total.count, IDS.length);
        assert.strictEqual(reading.branches[0].steps[0].values?.of, IDS.length, "its values are on the step");
    });

    it("draws a histogram of degree over only the passing links", async () => {
        const session = await weighted();
        const degrees = [...degreesOver((e) => WEIGHT(e) >= 2).values()];
        const histogram = session.scope.histogram("graphty.degree", { links: HEAVY });
        assert.strictEqual(histogram.kind, "numeric");
        assert.strictEqual(histogram.kind === "numeric" ? histogram.max : undefined, Math.max(...degrees));
    });

    it("refuses links holding a node-only leaf", async () => {
        const session = await weighted();
        try {
            session.scope.watchSteps(
                allOf([
                    {
                        op: "keep",
                        rule: { kind: "range", attribute: "graphty.degree", min: 5 },
                        links: { kind: "isolated" },
                    },
                ]),
                () => undefined,
            );
            assert.fail("expected a refusal");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
            assert.strictEqual((error as { details?: { reason?: string } }).details?.reason, "links-not-edges");
        }
    });
});
