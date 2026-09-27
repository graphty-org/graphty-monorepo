/**
 * @file Random sequences of edits, transactions, pending work, undos, redos and restores on a
 * headless session, against the model in `./random-model.ts`: whatever the order, the state at
 * every history position is the state sealed for it, undoing everything returns to the start,
 * and redoing everything returns to the end. See design/undo/undo-design.md section 12.5.
 *
 * The session runs on a fake clock, a fake layout, a queue whose turns the model holds and
 * releases, and fake runs whose completion the model holds, so every interleaving replays from
 * its seed, on any machine, under coverage. Each sequence starts from one of five states: a
 * baseline built by setup writes, a baseline whose graph came from a setup import, the state
 * after a first load dispatched after mount (a step), the state after `history.clear()`, and a
 * session whose first import failed.
 *
 * A fixed list of seeds runs in CI, one test per seed. `FC_SEED` runs one seed instead,
 * `FC_NUM_RUNS` changes how many sequences each seed tries, for a local soak, and `FC_PATH` with
 * `FC_SHRINK=1` replays one failure and shrinks it.
 */

import fc from "fast-check";
import { afterEach, assert, describe, it } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { ElementSession } from "../../../src/session/types";
import { fakeClock, fakeLayout, heldScheduler, runGate } from "./fakes";
import { blankSession, fixtureSession, paintBaseline } from "./fixture-session";
import {
    baselineModel,
    COALESCE_MS,
    COMMANDS,
    laneOf,
    live,
    type Model,
    modelAfterLoad,
    type Real,
    undoAllRedoAll,
} from "./random-model";

/** The seeds CI runs. */
const SEEDS = [1, 17, 4242, 90210, 2026];
/** Sequences tried per seed. */
const NUM_RUNS = Number(process.env.FC_NUM_RUNS ?? 60);
/** Longest sequence tried. */
const MAX_COMMANDS = 30;
/** Per seed: a coverage run of the whole model is slower than the project's 30 s default. */
const SEED_TIMEOUT_MS = 90_000;

/** Where a sequence starts. */
const STARTS = ["setup", "setup-import", "first-load", "cleared", "failed-import"] as const;
type Start = (typeof STARTS)[number];

/** The fixtures' graph, as a document an import reads. */
const FIXTURE_JSON = JSON.stringify({
    nodes: [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
    edges: [
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ],
});

/** Held runs a failed sequence left waiting, released after it. */
const gates: (() => void)[] = [];

afterEach(() => {
    for (const release of gates.splice(0)) {
        release();
    }
});

/**
 * A layer the page declares.
 * @param color - Its colour.
 * @returns The specification.
 */
function declared(color: string): LayerSpec {
    return { name: "Declared", target: "node", selector: { match: "everything" }, set: { "node.color": color } };
}

/**
 * A command the page declared at construction: part of the baseline, recorded as no step.
 * @param session - The session.
 * @param command - The command.
 * @returns Settles once it is in.
 */
function setup(session: ElementSession, command: Record<string, unknown>): Promise<unknown> {
    return dispatcherOf(session).dispatch({ ...command, setup: true } as unknown as { op: string });
}

/**
 * The system and the model for one start.
 * @param start - Where the sequence starts.
 * @returns Both.
 */
async function begin(start: Start): Promise<{ real: Real; model: Model }> {
    const clock = fakeClock();
    const queue = heldScheduler();
    const runs = runGate();
    gates.push(() => {
        runs.releaseAll();
    });
    const internals = { now: clock.now, scheduler: queue, baselineWindow: start !== "cleared" };
    if (start === "cleared") {
        const session = await fixtureSession(internals, runs.wrap);
        await session.runs.start("degree", {}, { as: "deg", style: false });
        await session.runs.start("shortest-path", { source: "n1", target: "n3" }, { as: "route", style: false });
        // The runs the edits read are where the sequence starts, not steps of it.
        session.history.clear();
        const real: Real = { session, clock, layout: fakeLayout(session), queue, runs };
        return { real, model: baselineModel(real) };
    }

    const session = blankSession(internals, runs.wrap);
    // What the page declared before any data: baseline, whatever follows.
    await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
    await session.styles.add(declared("#123456"));
    const layout = fakeLayout(session);
    const real: Real = { session, clock, layout, queue, runs };
    if (start === "setup") {
        await setup(session, {
            op: "batch",
            steps: [
                { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n1" }, { id: "n2" }, { id: "n3" }] } },
                {
                    op: "data.apply",
                    mutation: {
                        kind: "add-edges",
                        records: [
                            { src: "n1", dst: "n2" },
                            { src: "n2", dst: "n3" },
                        ],
                    },
                },
            ],
        });
        await setup(session, { op: "algo.run", algorithm: "degree", as: "deg" });
        await setup(session, { op: "algo.run", algorithm: "shortest-path", as: "route", params: { source: "n1", target: "n3" } });
    } else if (start === "setup-import") {
        await setup(session, { op: "data.import", source: { type: "json", config: { data: FIXTURE_JSON } } });
    } else if (start === "failed-import") {
        // An edge whose endpoints no path reads: the import fails after its first node.
        const failing = JSON.stringify({ nodes: [{ id: "q" }], edges: [{ x: "q", y: "q" }] });
        const failed = await session.data.import({ type: "json", config: { data: failing } }).then(
            () => false,
            () => true,
        );
        assert.isTrue(failed, "the first import failed");
    }

    await paintBaseline(session);
    if (start === "first-load") {
        const before = { digest: live(real), visible: "", lane: laneOf(real) };
        const { visibility } = session;
        before.visible = JSON.stringify([[...visibility.nodes].map(String).sort(), [...visibility.edges].map(String).sort()]);
        await session.data.import({ type: "json", config: { data: FIXTURE_JSON } });
        assert.lengthOf(session.history.steps, 1, "a first load after mount is a step");
        return { real, model: modelAfterLoad(real, before) };
    }

    assert.lengthOf(session.history.steps, 0, `${start}: the baseline records no step`);
    return { real, model: baselineModel(real) };
}

/**
 * Run the model for one seed.
 * @param seed - The seed.
 * @param numRuns - How many sequences to try.
 */
async function runSeed(seed: number, numRuns: number): Promise<void> {
    await fc.assert(
        fc.asyncProperty(
            fc.constantFrom(...STARTS),
            fc.scheduler(),
            fc.commands(COMMANDS, { maxCommands: MAX_COMMANDS, size: "max" }),
            async (start, s, commands) => {
                let begun: { real: Real; model: Model } | undefined;
                await fc.scheduledModelRun(
                    s,
                    async () => {
                        begun = await begin(start);
                        return begun;
                    },
                    commands,
                );

                assert.isDefined(begun);
                await undoAllRedoAll(begun.model, begun.real);
                begun.real.runs?.releaseAll();
                begun.real.session.dispose();
            },
        ),
        {
            seed,
            numRuns,
            // A sequence that hangs fails rather than holding the seed's test until it times out.
            timeout: 10_000,
            // Shrinking a long sequence takes longer than CI gives it; FC_SHRINK=1 shrinks one
            // failure locally, and FC_PATH replays it from the path the failure printed.
            endOnFailure: process.env.FC_SHRINK === undefined,
            ...(process.env.FC_PATH === undefined ? {} : { path: process.env.FC_PATH }),
        },
    );
}

describe("random sequences of edits, pending work and history moves, from every starting state", () => {
    const only = process.env.FC_SEED;
    for (const seed of only === undefined ? SEEDS : [Number(only)]) {
        it(`holds for seed ${String(seed)}`, () => runSeed(seed, NUM_RUNS), SEED_TIMEOUT_MS);
    }
});

describe("eviction folds the arrangement of every evicted step into the baseline", () => {
    it("2000 placements with coalescing off and a limit of 1000 steps, all undone, leave every evicted placement in place", async () => {
        const clock = fakeClock();
        const session = await fixtureSession({ now: clock.now });
        const real: Real = { session, clock, layout: fakeLayout(session) };
        session.history.limitSteps = 1000;
        const expected = laneOf(real);
        const ids = ["n1", "n2", "n3"];
        const placed: [string, string][] = [];
        for (let step = 1; step <= 2000; step++) {
            const id = ids[step % ids.length];
            await session.positions.set([{ id, x: step, y: step, z: -step }]);
            placed.push([id, `${String(step)},${String(step)},${String(-step)}`]);
            // Past the coalescing window, so every placement is a step of its own.
            clock.advance(COALESCE_MS + 1);
        }

        const kept = session.history.steps.length;
        assert.isAtMost(kept, 1000);
        assert.isAbove(2000 - kept, 1000, "most placements were evicted");
        for (const [id, value] of placed.slice(0, 2000 - kept)) {
            expected.set(id, value);
        }

        await session.history.restoreTo(null);
        assert.deepEqual(laneOf(real), expected, "the baseline, with every evicted placement applied");
        session.dispose();
    }, SEED_TIMEOUT_MS);
});
