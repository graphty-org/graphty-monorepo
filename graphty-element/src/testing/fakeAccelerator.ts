/**
 * A deterministic stand-in for a real accelerator, for tests and for stories.
 *
 * The element decides "GPU or CPU" once per piece of work and then drives whatever it attached
 * through the same two seams: `LayoutSimulation` for a layout and the accelerator's algorithm
 * members for a run. Exercising either seam against a real GPU makes a test depend on a device,
 * on a driver and on how many frames the browser happened to render. This fake stands in for
 * the device: it implements the seams, it moves nodes by an exact amount per landed batch, and
 * it counts what it was asked to do.
 *
 * Two properties make it usable from a visual story as well as from a unit test. Movement is on
 * the x axis only and is `moveBy * iterations` per landed batch, so a node's coordinate after a
 * settle is an exact multiple of `moveBy` whatever the frame rate. And settling is counted in
 * landed batches, not in elapsed time, so the picture a screenshot catches after the layout has
 * settled is the same picture on a fast machine and on a slow one.
 *
 * Everything a test observes lives on the ACCELERATOR, aggregated over every simulation it
 * created ({@link FakeAccelerator.calls}), so a test never has to reach for the simulation to
 * find out what happened; `simulations` is there for the rare case that needs identity.
 *
 * This module is reachable from no entry point: it imports the seam TYPES and the error model
 * and nothing else, and it ships in the package the way the tests do.
 * @module testing/fakeAccelerator
 */

import type { IndexedPageRankOptions, LabelResultLike, PageRankResultLike } from "@graphty/algorithms";
import { type F32, type GraphSnapshot, maskTest, type NodeMask, type U32 } from "@graphty/graph-format";
import type {
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    LayoutSimulation,
    SimulationOptions,
    SpringElectricalOptions,
} from "@graphty/layout";

import type { AccelerationPrecision, GraphAccelerator } from "../acceleration/types";
import { GraphtyError, type GraphtyErrorCode } from "../errors";

/** The default distance a landed batch moves one unfixed node along the x axis, per iteration. */
const DEFAULT_MOVE_BY = 1;

/** The default number of landed batches after which a simulation reports itself settled. */
const DEFAULT_SETTLE_AFTER = 10;

/** The default number of batches a simulation accepts before it coalesces onto the oldest one. */
const DEFAULT_MAX_IN_FLIGHT = 2;

/** The default iterations a `step()` with no argument submits. */
const DEFAULT_ITERATIONS_PER_STEP = 1;

/**
 * What the fake has been asked to do, counted across every simulation one accelerator created.
 *
 * Each algorithm and layout member counts CALLS of that name. The three simulation counters are
 * about batches rather than calls, because the seam coalesces: `step` counts SUBMISSIONS, so a
 * call that landed on a pending promise instead of submitting its own batch does not appear
 * here; `resolved` counts the batches that have landed; `reheat` counts reheats. `release` lists
 * the snapshots in call order rather than counting them, because which snapshot was released is
 * the thing a release test is about.
 *
 * Not exported: it is reachable as `FakeAccelerator["calls"]`, and a name nothing imports is a
 * name knip reports. Export it the day a caller needs to spell it.
 */
interface FakeAcceleratorCalls {
    /** How many `forceAtlas2()` simulations were built. */
    forceAtlas2: number;
    /** How many `fruchtermanReingold()` simulations were built. */
    fruchtermanReingold: number;
    /** How many `springElectrical()` simulations were built. */
    springElectrical: number;
    /** How many PageRank runs were asked for. */
    pageRank: number;
    /** How many connected-component runs were asked for. */
    connectedComponents: number;
    /** How many weakly-connected-component runs were asked for. */
    weaklyConnectedComponents: number;
    /** How many times the ACCELERATOR was disposed; a simulation's own dispose is not counted. */
    dispose: number;
    /** The snapshots handed to `release()`, in call order. */
    release: GraphSnapshot[];
    /** How many times a simulation was loaded. */
    load: number;
    /** How many batches were SUBMITTED; a coalesced `step()` does not count. */
    step: number;
    /** How many batches have landed. */
    resolved: number;
    /** How many times a simulation was reheated. */
    reheat: number;
}

/**
 * How to build a fake accelerator.
 *
 * Not exported, for the reason above: `Parameters<typeof createFakeAccelerator>[0]` spells it.
 */
interface FakeAcceleratorOptions {
    /** The name it reports in diagnostics. Default `"fake"`. */
    readonly name?: string;
    /** The arithmetic it claims. Default `"f32"`, the precision a GPU reports. */
    readonly precision?: AccelerationPrecision;
    /** Landed batches after which a simulation reports `settled`. Default 10. */
    readonly settleAfter?: number;
    /** Scene units a landed batch moves one unfixed node along x, per iteration. Default 1. */
    readonly moveBy?: number;
    /** Batches a simulation accepts before coalescing onto the oldest. Default 2. */
    readonly maxInFlight?: number;
    /** A device-loss promise, for the recovery paths. Absent means this backend cannot lose one. */
    readonly lost?: Promise<{ reason: string }>;
    /**
     * What the accelerator's self-check answers when the element asks it, at attach, to prove it
     * computes correctly.
     *
     * Absent -- the default -- gives it no `verify` member at all, which is the shape of a
     * backend that cannot check itself and is what every accelerator looks like today. `"ok"`
     * gives it one that resolves. A code gives it one that rejects with that code, which is how a
     * test stands in for a device that computes wrong answers without owning one:
     * `verify: "E_DEVICE_INCORRECT"`.
     */
    readonly verify?: "ok" | GraphtyErrorCode;
    /**
     * Members to add to the accelerator, or to replace on it.
     *
     * The element feature-tests a member before it uses it, so setting one to `undefined` is how
     * a test builds an accelerator that does not implement a capability.
     */
    readonly members?: Readonly<Record<string, unknown>>;
}

/**
 * Builds the accelerator's self-check from what a test asked it to answer.
 *
 * The rejection is a `GraphtyError` because that is what a real backend rejects with, and it is
 * the code on it -- not the class and not the sentence -- that the element publishes.
 * @param answer - `"ok"` for a device that computes correctly, or the code it fails with.
 * @returns The `verify` member to put on the accelerator.
 */
function selfCheck(answer: "ok" | GraphtyErrorCode): () => Promise<void> {
    return (): Promise<void> =>
        answer === "ok"
            ? Promise.resolve()
            : Promise.reject(
                  new GraphtyError({
                      code: answer,
                      message: `the fake accelerator's self-check reports ${answer}`,
                      source: "acceleration",
                      recoverable: false,
                  }),
              );
}

/**
 * Makes the error a disposed simulation throws from every later call.
 * @param what - The call that was made after the dispose.
 * @returns The error to throw.
 */
function disposedError(what: string): GraphtyError {
    return new GraphtyError({
        code: "E_DISPOSED",
        message: `the fake simulation was disposed; ${what} is not available on it`,
        source: "layout",
    });
}

/**
 * The simulation a {@link FakeAccelerator} hands out: the GPU shape, without a GPU.
 *
 * It is the GPU shape in the two ways the element's frame loop cares about. `step()` returns a
 * promise, so the bridge's fire-and-forget path is what a test exercises rather than the
 * synchronous CPU path. And a simulation that already has `maxInFlight` batches in flight
 * returns the OLDEST pending promise instead of submitting another, which is how a real GPU
 * simulation keeps a frame loop from queueing work faster than the device retires it.
 *
 * What it computes is not a layout: a landed batch adds `moveBy * iterations` to the x
 * coordinate of every node that is neither fixed nor being dragged, and leaves y and z alone.
 */
export class FakeSimulation implements LayoutSimulation {
    /** The options this simulation was created with. */
    readonly options: SimulationOptions;

    readonly #calls: FakeAcceleratorCalls;
    readonly #moveBy: number;
    readonly #settleAfter: number;
    readonly #maxInFlight: number;
    readonly #iterationsPerStep: number;
    readonly #inFlight: Promise<void>[] = [];
    readonly #overrides = new Set<number>();
    #snapshot: GraphSnapshot | null = null;
    #positions: F32 | null = null;
    #fixed: NodeMask | null = null;
    #iterationsDone = 0;
    #failCode: GraphtyErrorCode | null = null;
    #disposed = false;

    /**
     * Builds a simulation. The accelerator does this; a test reaches it through `fake.forceAtlas2()`.
     * @param calls - The accelerator's counter bag, shared by every simulation it creates.
     * @param defaults - The accelerator's own movement and settling defaults.
     * @param defaults.moveBy - Scene units a landed batch moves one unfixed node, per iteration.
     * @param defaults.settleAfter - Landed batches after which the simulation reports `settled`.
     * @param defaults.maxInFlight - Batches accepted before a step coalesces onto the oldest.
     * @param options - The simulation options the caller passed to the layout member.
     */
    constructor(
        calls: FakeAcceleratorCalls,
        defaults: { moveBy: number; settleAfter: number; maxInFlight: number },
        options: SimulationOptions = {},
    ) {
        this.options = options;
        this.#calls = calls;
        this.#moveBy = defaults.moveBy;
        this.#settleAfter = defaults.settleAfter;
        this.#maxInFlight = options.maxInFlight ?? defaults.maxInFlight;
        this.#iterationsPerStep = options.iterationsPerStep ?? DEFAULT_ITERATIONS_PER_STEP;
    }

    /**
     * The snapshot the last `load()` was given, or null before the first one.
     * @returns The snapshot.
     */
    get snapshot(): GraphSnapshot | null {
        return this.#snapshot;
    }

    /**
     * The position array the last `load()` was given, written in place by every landed batch.
     * @returns The array.
     */
    get positions(): F32 | null {
        return this.#positions;
    }

    /**
     * How many batches have landed since the last `reheat()`.
     * @returns The count.
     */
    get iterationsDone(): number {
        return this.#iterationsDone;
    }

    /**
     * True once `settleAfter` batches have landed; false again after a `reheat()`.
     * @returns Whether it has settled.
     */
    get settled(): boolean {
        return this.#iterationsDone >= this.#settleAfter;
    }

    /**
     * How many batches are in flight on this simulation.
     * @returns The count.
     */
    get pending(): number {
        return this.#inFlight.length;
    }

    /**
     * True once `dispose()` has run.
     * @returns Whether it was disposed.
     */
    get disposed(): boolean {
        return this.#disposed;
    }

    /**
     * Adopts a snapshot and the owner's position array, which every later batch writes in place.
     *
     * Rows no layout has placed read as NaN, which is the element's "not placed yet"; they are
     * seeded to the origin here, as a real simulation seeds them, so a landed batch moves a
     * number rather than turning NaN into NaN. Only the snapshot's OWN rows are seeded: the
     * element's position array outlives any one snapshot and its spare rows belong to nodes this
     * graph does not have yet, whose NaN means "not placed" and must not become the origin.
     * @param snapshot - The graph to lay out.
     * @param positions - The owner's stride-3 scene-unit array.
     */
    load(snapshot: GraphSnapshot, positions: F32): void {
        this.#assertLive("load");
        this.#snapshot = snapshot;
        this.#positions = positions;
        this.#calls.load += 1;

        const slots = Math.min(snapshot.nodeCount * 3, positions.length);
        for (let slot = 0; slot < slots; slot += 1) {
            if (Number.isNaN(positions[slot])) {
                positions[slot] = 0;
            }
        }
    }

    /**
     * Submits one batch of `iterations`, or coalesces onto the oldest one already in flight.
     * @param iterations - Iterations this batch computes. Defaults to the simulation's own.
     * @returns The batch. Coalesced calls share the promise they landed on.
     */
    step(iterations: number = this.#iterationsPerStep): Promise<void> {
        this.#assertLive("step");

        const oldest = this.#inFlight[0];
        if (oldest !== undefined && this.#inFlight.length >= this.#maxInFlight) {
            return oldest;
        }

        const code = this.#failCode;
        this.#failCode = null;
        this.#calls.step += 1;

        const batch = this.#settle(iterations, code);
        this.#inFlight.push(batch);
        return batch;
    }

    /**
     * Fixes the nodes whose bit is set; a fixed node is not moved by a landed batch.
     * @param mask - The bitmask, copied rather than held.
     */
    setFixed(mask: NodeMask): void {
        this.#assertLive("setFixed");
        this.#fixed = mask.slice();
    }

    /**
     * Places one node now, and keeps the next landed batch from moving it.
     *
     * That is what a drag needs: the pointer owns the node until the batch that was in flight
     * when the drag began has landed, and a batch computed before the drag must not slide the
     * node back.
     * @param index - The node's dense row.
     * @param x - The scene-unit x.
     * @param y - The scene-unit y.
     * @param z - The scene-unit z.
     */
    setPosition(index: number, x: number, y: number, z: number): void {
        this.#assertLive("setPosition");
        const positions = this.#positions;
        if (positions !== null && 3 * index + 2 < positions.length) {
            positions[3 * index] = x;
            positions[3 * index + 1] = y;
            positions[3 * index + 2] = z;
        }

        this.#overrides.add(index);
    }

    /** Starts the settle count again, so a settled simulation moves once more. */
    reheat(): void {
        this.#assertLive("reheat");
        this.#iterationsDone = 0;
        this.#calls.reheat += 1;
    }

    /**
     * Makes the NEXT submitted batch reject with this code.
     * @param code - The code the rejection carries.
     */
    fail(code: GraphtyErrorCode): void {
        this.#failCode = code;
    }

    /**
     * Awaits every batch in flight on this simulation.
     *
     * A snapshot of the array, awaited once: looping until nothing is in flight never returns while
     * something keeps submitting, which a story or a browser test with the frame loop running does.
     */
    async flush(): Promise<void> {
        await Promise.all([...this.#inFlight]);
    }

    /** Releases it. Every later call throws `E_DISPOSED`. */
    dispose(): void {
        this.#disposed = true;
    }

    /**
     * Lands a batch after one microtask, the readback a GPU batch waits for.
     * @param iterations - Iterations this batch computes.
     * @param failCode - The code to reject with instead of landing, when one was armed.
     */
    async #settle(iterations: number, failCode: GraphtyErrorCode | null): Promise<void> {
        try {
            await Promise.resolve();

            if (failCode !== null) {
                throw new GraphtyError({
                    code: failCode,
                    message: `the fake simulation was told to fail with ${failCode}`,
                    source: "layout",
                    recoverable: failCode === "E_DEVICE_LOST",
                });
            }

            this.#advance(iterations);
            this.#iterationsDone += 1;
            this.#calls.resolved += 1;
        } finally {
            void this.#inFlight.shift();
        }
    }

    /**
     * Moves every node that is neither fixed nor overridden by a drag.
     * @param iterations - Iterations the batch computed.
     */
    #advance(iterations: number): void {
        const positions = this.#positions;
        const snapshot = this.#snapshot;
        if (positions === null || snapshot === null) {
            return;
        }

        const rows = Math.min(snapshot.nodeCount, Math.floor(positions.length / 3));
        const delta = this.#moveBy * iterations;
        for (let i = 0; i < rows; i += 1) {
            if (this.#fixed !== null && maskTest(this.#fixed, i)) {
                continue;
            }

            if (this.#overrides.has(i)) {
                continue;
            }

            positions[3 * i] += delta;
        }

        this.#overrides.clear();
    }

    /**
     * Throws when this simulation has been disposed.
     * @param what - The call being made, named in the error.
     */
    #assertLive(what: string): void {
        if (this.#disposed) {
            throw disposedError(what);
        }
    }
}

/**
 * The fake accelerator itself: the layout seam, three algorithm members, residency and the
 * counters a test reads.
 */
export interface FakeAccelerator extends GraphAccelerator {
    /** What the layout package's `LayoutAccelerator` calls itself. */
    readonly kind: string;
    /** Everything the fake was asked to do, aggregated over every simulation it created. */
    readonly calls: FakeAcceleratorCalls;
    /** The simulations it has created, oldest first, for the cases that need identity. */
    readonly simulations: readonly FakeSimulation[];
    /** How many batches are in flight over every simulation. */
    readonly pending: number;
    /**
     * Builds a ForceAtlas2 simulation.
     * @param options - The simulation options.
     * @returns The simulation, also pushed onto `simulations`.
     */
    forceAtlas2(options?: ForceAtlas2Options): FakeSimulation;
    /**
     * Builds a Fruchterman-Reingold simulation.
     * @param options - The simulation options.
     * @returns The simulation, also pushed onto `simulations`.
     */
    fruchtermanReingold(options?: FruchtermanReingoldOptions): FakeSimulation;
    /**
     * Builds a spring-electrical simulation, which has no CPU implementation.
     * @param options - The simulation options.
     * @returns The simulation, also pushed onto `simulations`.
     */
    springElectrical(options?: SpringElectricalOptions): FakeSimulation;
    /**
     * Scores every node equally, so a caller sees a result shape without a computation.
     * @param snapshot - The graph.
     * @param options - Ignored.
     * @returns Scores of `1 / n`, converged after one iteration.
     */
    pageRank(snapshot: GraphSnapshot, options?: IndexedPageRankOptions): Promise<PageRankResultLike>;
    /**
     * Puts every node in one component.
     * @param snapshot - The graph.
     * @returns One label, one group.
     */
    connectedComponents(snapshot: GraphSnapshot): Promise<LabelResultLike>;
    /**
     * Puts every node in one component, ignoring direction.
     * @param snapshot - The graph.
     * @returns One label, one group.
     */
    weaklyConnectedComponents(snapshot: GraphSnapshot): Promise<LabelResultLike>;
    /**
     * Records a snapshot as released. A real accelerator frees its device buffers here.
     * @param snapshot - The snapshot whose residency is dropped.
     */
    release(snapshot: GraphSnapshot): void;
    /** Records that the accelerator was disposed. */
    dispose(): void;
    /** Awaits every batch in flight over every simulation. */
    flush(): Promise<void>;
    /**
     * Makes the next submitted batch of every live simulation reject.
     * @param code - The code the rejection carries; `E_DEVICE_LOST` for the loss paths.
     */
    fail(code: GraphtyErrorCode): void;
}

/**
 * One label per node, all zero: the partition the fake reports.
 * @param snapshot - The graph being partitioned.
 * @returns One component holding every node.
 */
function onePartition(snapshot: GraphSnapshot): LabelResultLike {
    const labels = new Uint32Array(snapshot.nodeCount);
    return {
        labels,
        count: 1,
        groups: (): U32[] => [labels.map((_label, index) => index)],
    };
}

/**
 * Builds a deterministic fake accelerator.
 * @param options - Its name, precision, movement, settling, coalescing and extra members.
 * @returns The accelerator, with every member an own property so a feature test finds it.
 * @example
 * ```ts
 * const fake = createFakeAccelerator({ moveBy: 2, settleAfter: 3 });
 * element.session.setAccelerator(fake);
 * await fake.flush();
 * assert.strictEqual(fake.calls.step, fake.calls.resolved);
 * ```
 */
export function createFakeAccelerator(options: FakeAcceleratorOptions = {}): FakeAccelerator {
    const calls: FakeAcceleratorCalls = {
        forceAtlas2: 0,
        fruchtermanReingold: 0,
        springElectrical: 0,
        pageRank: 0,
        connectedComponents: 0,
        weaklyConnectedComponents: 0,
        dispose: 0,
        release: [],
        load: 0,
        step: 0,
        resolved: 0,
        reheat: 0,
    };
    const defaults = {
        moveBy: options.moveBy ?? DEFAULT_MOVE_BY,
        settleAfter: options.settleAfter ?? DEFAULT_SETTLE_AFTER,
        maxInFlight: options.maxInFlight ?? DEFAULT_MAX_IN_FLIGHT,
    };
    const simulations: FakeSimulation[] = [];

    const build = (simulationOptions: SimulationOptions | undefined): FakeSimulation => {
        const simulation = new FakeSimulation(calls, defaults, simulationOptions);
        simulations.push(simulation);
        return simulation;
    };

    const fake: FakeAccelerator = {
        name: options.name ?? "fake",
        backend: "webgpu",
        kind: "fake",
        device: { vendor: "acme", architecture: "gen-1", description: "Acme Fake GPU" },
        precision: options.precision ?? "f32",
        ...(options.lost === undefined ? {} : { lost: options.lost }),
        ...(options.verify === undefined ? {} : { verify: selfCheck(options.verify) }),
        calls,
        simulations,
        get pending(): number {
            return simulations.reduce((total, simulation) => total + simulation.pending, 0);
        },
        forceAtlas2(simulationOptions?: ForceAtlas2Options): FakeSimulation {
            calls.forceAtlas2 += 1;
            return build(simulationOptions);
        },
        fruchtermanReingold(simulationOptions?: FruchtermanReingoldOptions): FakeSimulation {
            calls.fruchtermanReingold += 1;
            return build(simulationOptions);
        },
        springElectrical(simulationOptions?: SpringElectricalOptions): FakeSimulation {
            calls.springElectrical += 1;
            return build(simulationOptions);
        },
        pageRank(snapshot: GraphSnapshot): Promise<PageRankResultLike> {
            calls.pageRank += 1;
            const scores = new Float32Array(snapshot.nodeCount);
            scores.fill(snapshot.nodeCount === 0 ? 0 : 1 / snapshot.nodeCount);
            return Promise.resolve({ scores, iterations: 1, converged: true, danglingMass: 0 });
        },
        connectedComponents(snapshot: GraphSnapshot): Promise<LabelResultLike> {
            calls.connectedComponents += 1;
            return Promise.resolve(onePartition(snapshot));
        },
        weaklyConnectedComponents(snapshot: GraphSnapshot): Promise<LabelResultLike> {
            calls.weaklyConnectedComponents += 1;
            return Promise.resolve(onePartition(snapshot));
        },
        release(snapshot: GraphSnapshot): void {
            calls.release.push(snapshot);
        },
        dispose(): void {
            calls.dispose += 1;
        },
        async flush(): Promise<void> {
            await Promise.all(simulations.map((simulation) => simulation.flush()));
        },
        fail(code: GraphtyErrorCode): void {
            for (const simulation of simulations) {
                if (!simulation.disposed) {
                    simulation.fail(code);
                }
            }
        },
    };

    // Last, so a member a test named replaces the one above rather than being replaced by it. A
    // member set to `undefined` is how a test builds an accelerator that lacks a capability: the
    // element feature-tests with `typeof accelerator[name] === "function"`.
    return options.members === undefined ? fake : Object.assign(fake, options.members);
}
