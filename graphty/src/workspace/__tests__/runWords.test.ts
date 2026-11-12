/**
 * The app words a run's name from the facts graphty-element publishes (`algorithm`,
 * `distinguishedBy`, `siblingsDifferBy`), and the words are the ones the element's deprecated
 * `label` reads (#866), with the algorithm's catalog name in the app's own words. A real headless
 * session, so the facts are the element's own.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { wordsFor } from "../analyze/words";
import { runName } from "../runWords";

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A headless session over a small graph.
 * @returns the session.
 */
async function sessionWithGraph(): Promise<GraphSession> {
    const session = createGraphSession();
    sessions.push(session);
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "a" },
        { source: "c", target: "d" },
    ]);
    return session;
}

/**
 * Every listed run's app name beside the element's own label, its catalog name put in the app's
 * words.
 * @param session - the session.
 * @returns [app name, element label in the app's words] per run.
 */
function names(session: GraphSession): [string, string][] {
    return session.runs.list().map((run) => {
        const descriptor = session.catalog.algorithms().find((each) => each.key === run.algorithm);
        const label =
            descriptor !== undefined && run.label.startsWith(descriptor.plainName)
                ? wordsFor(descriptor).name + run.label.slice(descriptor.plainName.length)
                : run.label;
        return [runName(session, run), label];
    });
}

describe("runName", () => {
    it("names a run by its algorithm, and by the setting its result was named after", async () => {
        const session = await sessionWithGraph();
        session.runs.start("degree", {}, { style: false });
        session.runs.start("louvain", { resolution: 1.5 }, { style: false });
        session.runs.start("pagerank", { dampingFactor: 0.9 }, { style: false });
        session.runs.start("eigenvector", { mode: "out" }, { style: false });

        for (const [name, label] of names(session)) {
            assert.strictEqual(name, label);
        }
        assert.include(
            names(session).map(([name]) => name),
            "PageRank (damping 0.9)",
        );
    });

    it("adds the options that tell siblings apart, or the scope when only the scope does", async () => {
        const session = await sessionWithGraph();
        session.runs.start("pagerank", { maxIterations: 50 }, { as: "p1", style: false });
        session.runs.start("pagerank", { maxIterations: 60, useDelta: false }, { as: "p2", style: false });
        session.runs.start("degree", {}, { style: false });
        session.runs.start("degree", {}, { scope: "largest-component", style: false });

        const named = names(session);
        for (const [name, label] of named) {
            assert.strictEqual(name, label);
        }
        assert.include(
            named.map(([name]) => name),
            "PageRank (maxIterations 60, useDelta off)",
        );
        assert.isTrue(named.some(([name]) => name.endsWith("(largest component)")));
    });

    it("names a sibling over a kept set by the set's name", async () => {
        const session = await sessionWithGraph();
        const team = session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Team" });
        session.runs.start("degree", {}, { style: false });
        session.runs.start("degree", {}, { scope: { set: team }, style: false });

        for (const [name, label] of names(session)) {
            assert.strictEqual(name, label);
        }
        assert.isTrue(names(session).some(([name]) => name.endsWith("(Team)")));
    });

    it("names a batch by the label it was given", async () => {
        const session = await sessionWithGraph();
        const named = session.runs.batch([{ algorithm: "degree" }], { label: "Rankings" });
        const unnamed = session.runs.batch([{ algorithm: "degree" }]);

        assert.strictEqual(runName(session, named), named.label);
        assert.strictEqual(runName(session, unnamed), unnamed.label);
        await Promise.allSettled([named, unnamed]);
    });
});
