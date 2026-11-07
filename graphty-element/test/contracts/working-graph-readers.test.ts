/**
 * @file Every session reader reads the working graph with `workingGraph: "visible"`, or says why
 * not (design/working-graph/design.md section 10).
 *
 * The readers come from the public API reports, not from a hand list (`sessionMembers()`), so a new
 * reader fails here until it is classified in `working-graph-readers.ts`. A probed reader is run on a
 * graph where a filter hides one node, and on the same graph without that node:
 *
 * - `working` and `writer`: the two answers are the same; a scoped reader's `scope: "graph"` answer
 *   differs, because it holds the hidden node.
 * - `whole`: the answer is the same in both modes and differs from the graph without the node.
 *   These are the `wholeGraph` rows of `graphty-element/working-graph-baseline.json`, each with
 *   its reason; `tools/check-working-graph.mjs` keeps the list from growing without review.
 * - a `notYetWorking` row of the same file is a reader still to be fixed: its probe must still
 *   fail, so a fixed reader cannot stay listed.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { assert, beforeAll, describe, it } from "vitest";

import { setDefaultFeatures } from "../../src/features/resolve";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { API_DIR } from "../cost-coverage/api-methods";
import { BY_ID, HIDDEN, KIND_A, NOT_A_READER, type Probe, PROBES, sessionMembers } from "./working-graph-readers";

interface BaselineRow {
    readonly method: string;
    readonly reason: string;
    readonly issue?: string;
}

const BASELINE = JSON.parse(readFileSync(path.resolve(API_DIR, "../working-graph-baseline.json"), "utf8")) as {
    readonly wholeGraph: readonly BaselineRow[];
    readonly notYetWorking: readonly BaselineRow[];
};

const members = sessionMembers();
const wholeRows = new Set(BASELINE.wholeGraph.map((row) => row.method));
const pending = new Set(BASELINE.notYetWorking.map((row) => row.method));

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/**
 * A stand-in algorithm with one value per node of the scope it is handed, as a built-in run gets.
 * @param context - The run.
 * @returns The outcome.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    const path = `results.${context.runId}.value`;
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [{ name: "value", plainName: "Value", technicalName: "value", kind: "node", type: "number", path }],
            measured: { nodes: context.scope.nodeCount, edges: context.scope.edgeCount },
            nodes: [...context.scope.nodes].map((id) => ({ id, values: { value: 1 } })),
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A line a0..a4 of kind "a", then the hidden node h of kind "b", each with a size and a step.
 * @param options - Passed to the session.
 * @param withHidden - Whether the graph holds h at all.
 * @returns The session.
 */
async function line(options: Parameters<typeof createGraphSession>[0], withHidden: boolean): Promise<GraphSession> {
    const ids = ["a0", "a1", "a2", "a3", "a4", ...(withHidden ? [HIDDEN] : [])];
    const nodes = ids.map((id, i) => ({ id, kind: id === HIDDEN ? "b" : "a", size: (i + 1) * 10, step: i }));
    const edges = ids.slice(1).map((id, i) => ({ id: `e${String(i)}`, source: ids[i], target: id, step: i + 1 }));
    if (withHidden) {
        // A repeated edge, so the hidden node carries a data issue.
        edges.push({ id: "e9", source: "a4", target: HIDDEN, step: 5 });
    }

    const session = createGraphSession({ ...options, runs: { execute } });
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
    return session;
}

/**
 * The graph with h hidden by a filter, in a mode.
 * @param mode - The working-graph mode.
 * @returns The session.
 */
async function filtered(mode: "visible" | "documented"): Promise<GraphSession> {
    const session = await line({ workingGraph: mode }, true);
    await session.visibility.set(KIND_A);
    return session;
}

/**
 * An answer as plain data, without the fields that differ between two equal answers.
 * @param value - The answer.
 * @returns Plain data.
 */
function plain(value: unknown): unknown {
    const volatile = new Set(["durationMs", "revision", "resolvedAt", "digest", "startedAt", "journalId"]);
    return JSON.parse(
        JSON.stringify(value, (key, each: unknown) => {
            if (volatile.has(key)) {
                return undefined;
            }

            if (each instanceof Map) {
                return [...each.entries()];
            }

            if (each instanceof Set || ArrayBuffer.isView(each)) {
                return [...(each as Iterable<unknown>)];
            }

            if (each !== null && typeof each === "object" && !Array.isArray(each)) {
                // Key order is not part of an answer.
                return Object.fromEntries(Object.entries(each).sort(([a], [b]) => a.localeCompare(b)));
            }

            return each;
        }) ?? "null",
    ) as unknown;
}

/**
 * One probe's answer on a fresh session.
 * @param probe - The probe.
 * @param make - Makes the session.
 * @param scope - The scope it names, if any.
 * @returns The answer, as plain data.
 */
async function answer(probe: Probe, make: () => Promise<GraphSession>, scope?: "graph"): Promise<unknown> {
    const session = await make();
    try {
        return plain(await probe.call(session, scope));
    } finally {
        session.dispose();
    }
}

/**
 * What is wrong with a probe's answers, if anything.
 * @param probe - The probe.
 * @returns The failure, or null when it holds.
 */
async function problem(probe: Probe): Promise<string | null> {
    const shown = await answer(probe, () => filtered("visible"));
    const without = await answer(probe, () => line({ workingGraph: "visible" }, false));
    const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
    if (probe.kind === "whole") {
        const documented = await answer(probe, () => filtered("documented"));
        if (!same(shown, documented)) {
            return `the option changed it: ${JSON.stringify(shown)} vs ${JSON.stringify(documented)}`;
        }

        return same(shown, without) ? `it does not hold the hidden node: ${JSON.stringify(shown)}` : null;
    }

    if (!same(shown, without)) {
        return `it read the hidden node: ${JSON.stringify(shown)}, without it ${JSON.stringify(without)}`;
    }

    // A probe whose answer the hidden node could never change would pass vacuously.
    const unfiltered = await answer(probe, () => line({ workingGraph: "visible" }, true));
    if (same(unfiltered, without)) {
        return `the probe cannot tell: with the node shown it answers the same, ${JSON.stringify(without)}`;
    }

    if (probe.scoped === true) {
        const whole = await answer(probe, () => filtered("visible"), "graph");
        if (same(whole, shown)) {
            return `scope: "graph" did not bring the hidden node back: ${JSON.stringify(whole)}`;
        }
    }

    return null;
}

describe("the session's readers and the working graph", () => {
    it("reads a plausible list of readers from the API reports", () => {
        // A walker that stopped matching would pass everything below vacuously.
        assert.isAbove(members.length, 300);
        for (const member of ["SessionDataApi.statistics", "SelectionApi.nodes", "GraphSession.find", "TimeApi.bins"]) {
            assert.include(members, member);
        }
    });

    it("classifies every reader exactly once", () => {
        const lists: [string, readonly string[]][] = [
            ["PROBES", Object.keys(PROBES)],
            ["BY_ID", BY_ID],
            ["NOT_A_READER", NOT_A_READER],
            ["wholeGraph rows without a probe", [...wholeRows].filter((member) => PROBES[member] === undefined)],
        ];
        const counts = new Map<string, number>();
        for (const [, list] of lists) {
            for (const member of list) {
                counts.set(member, (counts.get(member) ?? 0) + 1);
            }
        }

        const unlisted = members.filter((member) => !counts.has(member));
        assert.deepEqual(
            unlisted,
            [],
            "a new session reader: probe it in PROBES (test/contracts/working-graph-readers.ts), or list it in " +
                "BY_ID or NOT_A_READER if it reads no set of nodes or edges",
        );
        assert.deepEqual(
            [...counts].filter(([, count]) => count > 1).map(([member]) => member),
            [],
            "listed once",
        );
        const known = new Set(members);
        assert.deepEqual(
            [...counts.keys(), ...wholeRows, ...pending].filter((member) => !known.has(member)),
            [],
            "no longer in the API reports: delete it",
        );
    });

    it("lists every whole-graph probe as a wholeGraph row, and probes every notYetWorking row", () => {
        const unlisted = Object.entries(PROBES)
            .filter(([member, probe]) => probe.kind === "whole" && !wholeRows.has(member))
            .map(([member]) => member);
        assert.deepEqual(unlisted, [], "a whole probe is a wholeGraph row in working-graph-baseline.json");
        assert.deepEqual(
            Object.entries(PROBES)
                .filter(([member, probe]) => probe.kind !== "whole" && wholeRows.has(member))
                .map(([member]) => member),
            [],
            "a wholeGraph row reads the whole graph: its probe is whole",
        );
        for (const member of pending) {
            assert.notStrictEqual(
                PROBES[member]?.kind ?? "whole",
                "whole",
                `${member}: a notYetWorking row needs a working probe`,
            );
        }
    });

    it("selection replace and clear drop a hidden selected node; add keeps it", async () => {
        const session = await filtered("visible");
        const after = async (write: () => unknown): Promise<string[]> => {
            await session.visibility.set(null);
            await session.selection.apply({ nodes: ["a4", HIDDEN] });
            await session.visibility.set(KIND_A);
            await write();
            await session.visibility.set(null);
            return session.selection.nodes.map(String).sort();
        };
        assert.deepEqual(await after(() => session.selection.apply({ nodes: ["a0"] })), ["a0"]);
        assert.deepEqual(await after(() => session.selection.clear()), []);
        assert.deepEqual(await after(() => session.selection.apply({ nodes: ["a0"] }, "add")), ["a0", "a4", HIDDEN]);
        session.dispose();
    });

    for (const [member, probe] of Object.entries(PROBES)) {
        if (pending.has(member)) {
            it(`${member} still fails (a notYetWorking row)`, async () => {
                assert.isNotNull(
                    await problem(probe),
                    `${member} reads the working graph now: delete its notYetWorking row in working-graph-baseline.json`,
                );
            });
        } else {
            it(`${member} (${probe.kind})`, async () => {
                const failure = await problem(probe);
                assert.isNull(failure, `${member}: ${failure ?? ""}`);
            });
        }
    }
});
