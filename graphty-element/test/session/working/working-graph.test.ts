/**
 * The working graph (design/working-graph/design.md sections 2, 3 and 9): one view of what the
 * filter and the time window leave shown, built once per state, shared with runs over what is
 * shown, and never built while the masks are only moving.
 */
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, beforeAll, describe, it } from "vitest";

import { DerivedInputs } from "../../../src/algorithms/input/derivedInputs";
import { createScopedInput, scopedInputCounters } from "../../../src/algorithms/input/ScopedInput";
import { isGraphtyError } from "../../../src/errors";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { createGraphSession, type GraphSession, type WorkingGraphChange } from "../../../src/session";
import { scopeResolverOfSession } from "../../../src/session/GraphSession";
import { assertScalesLinearly } from "../../helpers/cost";
import { makeSession } from "../helpers";

// The time window is moved through the timeline, an experiment this file switches on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/**
 * A line of ten nodes s0..s9, each node and edge carrying a `step` and a `kind`.
 * @param options - Passed to the session.
 * @returns The session, with `step` designated as the time field.
 */
async function line(options: Parameters<typeof createGraphSession>[0] = {}): Promise<GraphSession> {
    const session = createGraphSession(options);
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `s${String(i)}`, step: i, kind: i < 6 ? "a" : "b" }));
    const edges = Array.from({ length: 9 }, (_, i) => ({
        source: `s${String(i)}`,
        target: `s${String(i + 1)}`,
        step: i + 1,
        heavy: i % 2 === 0,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });

    return session;
}

/** Keeps the six "a" nodes. */
const KIND_A = { kind: "categories", attribute: "data.kind", values: ["a"] } as const;

describe("the working-graph mode", () => {
    it("defaults to documented, takes the creation option, and refuses an unknown mode", async () => {
        const plain = await line();
        assert.strictEqual(plain.config.workingGraph, "documented");

        const visible = await line({ workingGraph: "visible" });
        assert.strictEqual(visible.config.workingGraph, "visible");

        let refused: unknown = null;
        try {
            visible.config.setWorkingGraph("everything" as "visible");
        } catch (error) {
            refused = error;
        }

        assert.isTrue(isGraphtyError(refused) && refused.code === "E_BAD_COMMAND");
        assert.strictEqual(visible.config.workingGraph, "visible");
        plain.dispose();
        visible.dispose();
    });

    it("publishes working-graph:changed for a mode change, a filter and a data edit, once each", async () => {
        const session = await line();
        const told: WorkingGraphChange[] = [];
        session.on("working-graph:changed", (change) => told.push(change));

        session.config.setWorkingGraph("visible");
        session.config.setWorkingGraph("visible");

        assert.deepStrictEqual(told, [{ mode: "visible", nodeCount: 10, edgeCount: 9, settled: true }]);

        // What is shown moving, and the data moving, tell it too.
        await session.visibility.set(KIND_A);
        assert.deepStrictEqual(told.slice(1), [{ mode: "visible", nodeCount: 6, edgeCount: 5, settled: true }]);
        await session.data.addNodes([{ id: "s10", kind: "a", step: 10 }]);
        assert.deepStrictEqual(told.slice(2), [{ mode: "visible", nodeCount: 7, edgeCount: 5, settled: true }]);
        session.dispose();
    });

    it("is not saved: it is no project setting and no undo step", async () => {
        const session = await line();
        const before = session.history.version;
        session.config.setWorkingGraph("visible");

        assert.strictEqual(session.history.version, before);
        assert.notInclude((await session.project.save()).text, "workingGraph");
        session.dispose();
    });
});

describe("session.data.working()", () => {
    it("is the whole graph with identity rows, deriving nothing, when nothing is hidden", async () => {
        const session = await line();
        const before = scopedInputCounters.derivations;
        const working = session.data.working();

        assert.strictEqual(working.nodeCount, 10);
        assert.strictEqual(working.edgeCount, 9);
        assert.strictEqual(working.snapshot().nodeCount, 10);
        assert.strictEqual(working.originalNodeRow(4), 4);
        assert.strictEqual(working.compactEdgeRow(8), 8);
        assert.strictEqual(working.compactNodeRow(10), INVALID_INDEX);
        assert.strictEqual(scopedInputCounters.derivations, before);
        session.dispose();
    });

    it("answers for what a filter leaves shown, with row maps both ways", async () => {
        const session = await line();
        await session.visibility.set(KIND_A);
        const working = session.data.working();
        const original = session.data.snapshot();

        assert.strictEqual(working.nodeCount, 6);
        assert.strictEqual(working.edgeCount, 5);
        assert.isTrue(working.has("s5"));
        assert.isFalse(working.has("s6"));
        assert.deepStrictEqual(working.nodeIds(), ["s0", "s1", "s2", "s3", "s4", "s5"]);
        assert.lengthOf(working.edgeIds(), 5);

        const compact = working.snapshot();
        assert.strictEqual(compact.nodeCount, 6);
        assert.strictEqual(compact.edgeCount, 5);
        for (let row = 0; row < compact.nodeCount; row++) {
            const back = working.originalNodeRow(row);
            assert.strictEqual(original.ids.idOf(back), compact.ids.idOf(row));
            assert.strictEqual(working.compactNodeRow(back), row);
        }

        for (let row = 0; row < compact.edgeCount; row++) {
            assert.strictEqual(working.compactEdgeRow(working.originalEdgeRow(row)), row);
        }

        assert.strictEqual(working.compactNodeRow(original.ids.indexOf("s7")), INVALID_INDEX);
        assert.throws(() => working.originalNodeRow(6), RangeError);
        session.dispose();
    });

    it("is built once per state however many readers ask, and is the same object until it moves", async () => {
        const session = await line();
        await session.visibility.set(KIND_A);
        const before = scopedInputCounters.derivations;

        const first = session.data.working();
        first.snapshot();
        first.originalNodeRow(0);
        session.data.working().snapshot();
        session.data.working().compactNodeRow(3);

        assert.strictEqual(session.data.working(), first);
        assert.strictEqual(session.data.working().snapshot(), first.snapshot());
        // One induced subgraph: the filter hides no edge between shown nodes.
        assert.strictEqual(scopedInputCounters.derivations - before, 1);
        session.dispose();
    });

    it("filters the edges an edge condition hides between shown ends", async () => {
        const session = await line();
        await session.visibility.set({ kind: "all", of: [KIND_A, { kind: "edges", where: "data.heavy == `true`" }] });
        const before = scopedInputCounters.derivations;
        const working = session.data.working();

        // s0..s5 and the heavy edges among them: s0-s1, s2-s3, s4-s5.
        assert.strictEqual(working.nodeCount, 6);
        assert.strictEqual(working.edgeCount, 3);
        assert.strictEqual(working.snapshot().edgeCount, 3);
        assert.strictEqual(scopedInputCounters.derivations - before, 2, "induced, then the edges filtered");
        for (let row = 0; row < 3; row++) {
            assert.strictEqual(working.compactEdgeRow(working.originalEdgeRow(row)), row);
        }
        session.dispose();
    });

    it("moves with the filter, undo and redo, and a data edit; a redo reuses the view it left", async () => {
        const session = await line();
        await session.visibility.set(KIND_A);
        const filtered = session.data.working();
        filtered.snapshot();

        await session.visibility.set({ kind: "categories", attribute: "data.kind", values: ["b"] });
        const other = session.data.working();
        assert.notStrictEqual(other, filtered);
        assert.strictEqual(other.nodeCount, 4);
        other.snapshot();

        await session.undo();
        assert.notStrictEqual(session.data.working(), other);
        assert.strictEqual(session.data.working().nodeCount, session.visibility.summary.visibleNodes);
        session.data.working().snapshot();

        const before = scopedInputCounters.derivations;
        await session.redo();
        assert.strictEqual(session.data.working().nodeCount, 4);
        assert.strictEqual(session.data.working().snapshot().nodeCount, 4);
        assert.strictEqual(scopedInputCounters.derivations, before, "the redone view comes back from the cache");

        // An added node the filter shows is in the next view; one it hides is not.
        await session.data.addNodes([
            { id: "s10", kind: "b", step: 10 },
            { id: "s11", kind: "a", step: 11 },
        ]);
        assert.strictEqual(session.data.working().nodeCount, 5);
        assert.isTrue(session.data.working().has("s10"));
        assert.isFalse(session.data.working().has("s11"));
        assert.strictEqual(session.data.working().snapshot().nodeCount, 5);
        session.dispose();
    });

    it("leaves ghosts out: drawn, but not shown", async () => {
        const session = await line();
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost" });

        assert.strictEqual(session.data.working().nodeCount, 3);
        assert.strictEqual(session.data.working().snapshot().nodeCount, 3);
        session.dispose();
    });

    it("builds nothing while the window slides, and once after it is committed", async () => {
        const session = await line({ workingGraph: "visible" });
        await session.time.window({ from: 0, to: 4 });
        session.data.working().snapshot();
        const told: WorkingGraphChange[] = [];
        session.on("working-graph:changed", (change) => told.push(change));
        const before = scopedInputCounters.derivations;

        for (let step = 0; step < 100; step++) {
            await session.time.seek(step % 6, { commit: false });
            // What a status chip reads every frame.
            const working = session.data.working();
            assert.isAtMost(working.nodeCount, 10);
            working.has("s3");
            working.nodeIds();
        }

        assert.strictEqual(scopedInputCounters.derivations, before, "no view is built during a slide");
        assert.isTrue(told.length > 0 && told.every((change) => !change.settled));

        await session.time.commit();
        assert.isTrue(told.at(-1)?.settled);
        session.data.working().snapshot();
        assert.strictEqual(scopedInputCounters.derivations - before, 1);
        session.dispose();
    });

    it("hands a run over what is shown the view's own derivation", async () => {
        const inputs = new DerivedInputs();
        const harness = makeSession({ internals: { derivedInputs: inputs } });
        harness.add(
            Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}`, kind: i < 5 ? "a" : "b" })),
            Array.from({ length: 7 }, (_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}` })),
        );
        const { session } = harness;
        await session.visibility.set(KIND_A);
        const view = session.data.working().snapshot();
        const before = scopedInputCounters.derivations;

        const scope = scopeResolverOfSession(session).resolutionOf("visible");
        const input = createScopedInput(
            { getSnapshot: () => scope.graph, undirected: () => assert.fail("not asked") },
            "declared",
            { simplify: "none" },
            { inputs, holder: {}, scope: () => scope },
        );

        assert.strictEqual(input.derived().snapshot, view);
        assert.strictEqual(scopedInputCounters.derivations, before);
        session.dispose();
    });

    it("switching the mode never rebuilds the view, however large the graph (counted work)", async () => {
        await assertScalesLinearly(
            async (size) => {
                const harness = makeSession();
                harness.add(
                    Array.from({ length: size }, (_, i) => ({ id: `n${String(i)}`, kind: i % 4 === 0 ? "b" : "a" })),
                    Array.from({ length: size - 1 }, (_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}` })),
                );
                await harness.session.visibility.set(KIND_A);
                const before = scopedInputCounters.derivations;
                for (let flip = 0; flip < 10; flip++) {
                    harness.session.config.setWorkingGraph(flip % 2 === 0 ? "visible" : "documented");
                    harness.session.data.working().snapshot();
                }

                harness.session.dispose();
                return scopedInputCounters.derivations - before;
            },
            { sizes: [200, 2000], growth: "constant", counter: "view derivations over ten mode switches" },
        );
    });
});
