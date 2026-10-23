/**
 * A small session for project-file and autosave tests: three nodes, two weighted edges, and runs
 * that need no renderer (each node's links, each edge's source).
 */

import { createGraphSession, type GraphSession } from "../../session";
import { graphIdsOf } from "../../src/session/projectFile";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";

/**
 * A session whose runs count each node's links, and give each edge its source.
 * @returns The session.
 */
export function sessionWithRuns(): GraphSession {
    const session: GraphSession = createGraphSession({
        runs: {
            execute: (context: RunExecutionContext): Promise<RunOutcome> => {
                const snapshot = session.data.snapshot();
                const degrees = snapshot.degree();
                const ids = graphIdsOf(session);
                return Promise.resolve({
                    result: createRunResult({
                        runId: context.runId,
                        shape: "node-metric",
                        fields: [
                            {
                                name: "value",
                                plainName: "Links",
                                technicalName: "degree",
                                kind: "node",
                                type: "number",
                                path: "results.$.value",
                            },
                            {
                                name: "from",
                                plainName: "From",
                                technicalName: "from",
                                kind: "edge",
                                type: "number",
                                path: "results.$.from",
                            },
                        ],
                        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                        nodes: ids.nodes.map((id, at) => ({ id, values: { value: degrees[at] } })),
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
    return session;
}

/**
 * A session holding a small graph and nothing else.
 * @returns The session.
 */
export async function baseSession(): Promise<GraphSession> {
    const session = sessionWithRuns();
    await session.data.addNodes([
        { id: "a", dept: 1 },
        { id: "b", dept: 2 },
        { id: "c", dept: 1 },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", weight: 2 },
        { source: "b", target: "c", weight: 3 },
    ]);
    return session;
}
