/**
 * @file Measuring this machine, so an estimate is a measurement rather than a guess.
 *
 * A cost model written against one developer's laptop is wrong everywhere else, and wrong by an
 * amount nobody can see. The fix is not a better constant: it is to time the work here, once,
 * and to say plainly when the timing could not be taken. That is what the two halves of this
 * file do -- {@link calibrateCost} times three synthetic workloads shaped like the three cost
 * classes, and {@link CostMeasurementLog} keeps what real runs actually took so the next
 * estimate of the same algorithm is scaled from the last one.
 *
 * The honest failure is the important part. If the clock is too coarse, the budget runs out, or
 * a workload returns a time of zero, the calibration comes back with
 * `basis: "defaults"` and the built-in rates, and every estimate built on it reports confidence
 * `"modelled"` rather than `"calibrated"`. A calibration that quietly reported a fabricated rate
 * would be the same failure this whole module exists to prevent, one layer down.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM. The workloads are typed arrays and
 * arithmetic, the clock is `performance.now()` where there is one, and the machine fingerprint
 * reads hardware counters only -- never a document, a canvas or a renderer string.
 */

import type { AlgorithmKey } from "../../catalog/types";
import { type CostMeasurement, type CostRates, DEFAULT_COST_RATES, type MachineCalibration } from "./estimate";

/** How long the whole probe may take before it gives up and reports the defaults. */
const DEFAULT_CALIBRATION_BUDGET_MS = 250;

/**
 * The shortest run a workload's time is believed from.
 *
 * Below this the answer is the clock's resolution rather than the machine's speed, and a rate
 * derived from it would be confidently wrong -- so the workload repeats until it clears the bar
 * or the budget runs out.
 */
const MIN_SAMPLE_MS = 4;

/** Nodes in each synthetic workload. */
const PROBE_NODES = 20_000;

/** Arcs per node in each synthetic workload, which is a density an ordinary graph reaches. */
const PROBE_DEGREE = 8;

/**
 * What the three probe workloads retire per second on the machine `DEFAULT_COST_RATES` were
 * fitted on (an Intel i9-14900, Node 22 under vitest, warm JIT; the fastest of nine probes, so a
 * single probe on that machine reads at or below it and the calibrated rate errs cautious).
 *
 * The probe is tight typed-array arithmetic, and the real algorithms walk Maps of objects, so
 * the probe runs one to two hundred times faster than the work it stands for: on the fitting
 * machine the iterative probe retires about 1,250M elements/s where PageRank retires 3-5M. Using
 * the probe's throughput as the rate -- which this function did until 2026-09-23 -- made every
 * calibrated estimate optimistic by that factor, so a calibrated session waved through runs
 * that locked the frame for minutes. The probe is only good for the RATIO between two machines,
 * so a calibrated rate is the default rate scaled by this machine's probe over this one's.
 * `test/session/cost/estimate-against-measured-runs.test.ts` re-measures real runs against it.
 */
const REFERENCE_PROBE_RATES: Readonly<CostRates> = Object.freeze({
    linearElementsPerSecond: 1_710_000_000,
    iterativeElementsPerSecond: 1_250_000_000,
    heavyPairsPerSecond: 830_000_000,
    cubicOperationsPerSecond: 1_710_000_000,
});

/** Iterations the iterative workload performs per repeat. */
const PROBE_ITERATIONS = 10;

/** Sources the heavy workload sweeps from per repeat. */
const PROBE_SOURCES = 16;

/**
 * A value every workload folds its result into, so nothing it computes can be optimised away.
 *
 * A probe whose result is never read is a probe an optimiser is entitled to delete, and a
 * deleted workload times as instant -- which would make this machine look infinitely fast. The
 * accumulator is read at the end of every calibration for exactly that reason.
 */
let sink = 0;

/**
 * A monotonic clock, wherever one is to be had.
 * @returns Milliseconds since an arbitrary origin.
 */
function now(): number {
    return typeof performance === "object" && typeof performance.now === "function" ? performance.now() : Date.now();
}

/**
 * Read a numeric property off a host object without asserting its type.
 * @param source - The object to read.
 * @param key - The property name.
 * @returns The value when it is a finite number, otherwise undefined.
 */
function readNumber(source: object, key: string): number | undefined {
    const value = (source as Record<string, unknown>)[key];

    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * A fingerprint of the machine a measurement belongs to.
 *
 * It exists so that a calibration or a timing restored from somewhere else is not mistaken for
 * one taken here. It reads hardware counters only: how many threads the host reports and how
 * much memory it admits to. Neither is precise, and neither has to be -- the question is "is
 * this the same machine?", not "which machine is this?".
 * @returns A short string, or "unknown" where the host reports nothing.
 */
export function machineFingerprint(): string {
    const host: object | undefined = typeof navigator === "object" ? navigator : undefined;
    if (host === undefined) {
        return "unknown";
    }

    const threads = readNumber(host, "hardwareConcurrency") ?? 0;
    const memory = readNumber(host, "deviceMemory") ?? 0;

    return threads === 0 && memory === 0 ? "unknown" : `c${threads}-m${memory}`;
}

/** One synthetic graph in the CSR shape the element's own work walks. */
interface ProbeGraph {
    /** Row offsets, one per node plus a terminator. */
    readonly rowPtr: Uint32Array;
    /** Arc targets, in row order. */
    readonly colIdx: Uint32Array;
    /** How many nodes there are. */
    readonly nodes: number;
    /** How many arcs there are. */
    readonly arcs: number;
}

/**
 * Build the synthetic graph every workload walks.
 *
 * A fixed stride rather than a random one, because the probe is timing this machine's memory and
 * arithmetic rather than a particular graph's cache behaviour, and a random graph would make the
 * measurement depend on a seed nobody chose.
 * @returns The graph.
 */
function buildProbeGraph(): ProbeGraph {
    const nodes = PROBE_NODES;
    const arcs = nodes * PROBE_DEGREE;
    const rowPtr = new Uint32Array(nodes + 1);
    const colIdx = new Uint32Array(arcs);

    for (let u = 0; u < nodes; u++) {
        rowPtr[u + 1] = (u + 1) * PROBE_DEGREE;
        for (let k = 0; k < PROBE_DEGREE; k++) {
            colIdx[u * PROBE_DEGREE + k] = (u * 7 + k * 1531 + 1) % nodes;
        }
    }

    return { rowPtr, colIdx, nodes, arcs };
}

/**
 * One linear pass over every node and arc, which is what the "instant" class does.
 * @param graph - The synthetic graph to walk.
 * @returns A number derived from the walk, so the walk cannot be optimised away.
 */
function linearPass(graph: ProbeGraph): number {
    const { rowPtr, colIdx, nodes } = graph;
    let total = 0;
    for (let u = 0; u < nodes; u++) {
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            total += colIdx[a];
        }
    }

    return total;
}

/**
 * One power-iteration sweep with a fresh vector per iteration, as the "iterative" class does.
 * @param graph - The synthetic graph to walk.
 * @returns A number derived from the sweep, so the sweep cannot be optimised away.
 */
function iterativePass(graph: ProbeGraph): number {
    const { rowPtr, colIdx, nodes } = graph;
    let rank = new Float64Array(nodes).fill(1 / nodes);
    for (let iteration = 0; iteration < PROBE_ITERATIONS; iteration++) {
        const next = new Float64Array(nodes);
        for (let u = 0; u < nodes; u++) {
            const start = rowPtr[u];
            const degree = rowPtr[u + 1] - start;
            if (degree === 0) {
                continue;
            }

            const share = (rank[u] * 0.85) / degree;
            for (let a = start; a < start + degree; a++) {
                next[colIdx[a]] += share;
            }
        }

        rank = next;
    }

    return rank[0];
}

/**
 * A breadth-first sweep from several sources, which is the shape of the "heavy" class.
 * @param graph - The synthetic graph to walk.
 * @returns A number derived from the sweep, so the sweep cannot be optimised away.
 */
function heavyPass(graph: ProbeGraph): number {
    const { rowPtr, colIdx, nodes } = graph;
    const distance = new Int32Array(nodes);
    const queue = new Uint32Array(nodes);
    let reached = 0;

    for (let s = 0; s < PROBE_SOURCES; s++) {
        distance.fill(-1);
        const source = (s * 977) % nodes;
        distance[source] = 0;
        queue[0] = source;
        let head = 0;
        let tail = 1;

        while (head < tail) {
            const u = queue[head++];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                if (distance[v] === -1) {
                    distance[v] = distance[u] + 1;
                    queue[tail++] = v;
                }
            }
        }

        reached += tail;
    }

    return reached;
}

/** What one timed workload produced. */
interface Timing {
    /** The rate, in the workload's own units per second, or undefined when it could not be timed. */
    readonly perSecond?: number;
    /** Milliseconds spent, whether or not a rate came out of them. */
    readonly spentMs: number;
}

/**
 * Time one workload until it clears the clock's resolution or runs out of budget.
 * @param pass - The workload, run once per repeat.
 * @param unitsPerPass - How many units of work one repeat retires.
 * @param budgetMs - The milliseconds this workload may spend.
 * @returns The rate and what it cost to find it.
 */
function time(pass: () => number, unitsPerPass: number, budgetMs: number): Timing {
    const started = now();
    let repeats = 0;
    let elapsed = 0;

    while (elapsed < MIN_SAMPLE_MS && elapsed < budgetMs) {
        sink += pass();
        repeats++;
        elapsed = now() - started;
    }

    if (elapsed < MIN_SAMPLE_MS || repeats === 0) {
        return { spentMs: elapsed };
    }

    return { perSecond: (repeats * unitsPerPass) / (elapsed / 1000), spentMs: elapsed };
}

/** What {@link calibrateCost} accepts. */
interface CalibrateCostOptions {
    /** The milliseconds the whole probe may spend. Defaults to {@link DEFAULT_CALIBRATION_BUDGET_MS}. */
    readonly budgetMs?: number;
    /** The fingerprint to record the result under. Defaults to {@link machineFingerprint}. */
    readonly machine?: string;
    /**
     * Hand the host back its thread between workloads.
     *
     * The probe measures how fast this machine runs the element's work, so running it in one
     * unbroken block would be the very thing this module exists to stop happening -- a frame
     * held by work nobody asked to watch.
     * @returns A promise that settles when the host has had its turn.
     */
    readonly yieldNow?: () => Promise<void>;
}

/**
 * Hand the host its thread back.
 * @returns A promise that settles on the next macrotask.
 */
function defaultYield(): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * Time this machine on the three shapes of work the cost classes describe.
 *
 * It never throws and it never exceeds its budget: a workload that cannot be timed inside the
 * time it is given produces no rate, and a calibration missing any rate reports
 * `basis: "defaults"` and carries `DEFAULT_COST_RATES`. That is the difference between a
 * calibration a consumer can trust and one that merely always succeeds.
 *
 * The cubic rate is not probed. No cubic algorithm has ever been timed here, so it is set to the
 * measured linear rate, which is the most optimistic honest placeholder and therefore the one
 * that makes a cubic estimate the most cautious of the four.
 * @param options - The budget, the machine fingerprint and how to yield between workloads.
 * @returns The calibration, measured or defaulted.
 */
export async function calibrateCost(options: CalibrateCostOptions = {}): Promise<MachineCalibration> {
    const budgetMs = options.budgetMs ?? DEFAULT_CALIBRATION_BUDGET_MS;
    const machine = options.machine ?? machineFingerprint();
    const yieldNow = options.yieldNow ?? defaultYield;
    const at = new Date().toISOString();
    const share = budgetMs / 3;

    const defaulted: MachineCalibration = Object.freeze({
        rates: DEFAULT_COST_RATES,
        at,
        machine,
        basis: "defaults" as const,
    });

    if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
        return defaulted;
    }

    let graph: ProbeGraph;
    try {
        graph = buildProbeGraph();
    } catch {
        // An allocation this small failing means the host has nothing to spare, and a probe is
        // the last thing it should be spending it on.
        return defaulted;
    }

    const elements = graph.nodes + graph.arcs;
    const linear = time(() => linearPass(graph), elements, share);
    await yieldNow();

    const iterative = time(() => iterativePass(graph), PROBE_ITERATIONS * elements, share);
    await yieldNow();

    const heavy = time(() => heavyPass(graph), PROBE_SOURCES * graph.arcs, share);
    await yieldNow();

    // Reading the accumulator is what keeps the three workloads above from being dead code, and
    // resetting it keeps a long-lived page from drifting it to infinity over repeated probes.
    if (!Number.isFinite(sink)) {
        return defaulted;
    }

    sink = 0;

    if (linear.perSecond === undefined || iterative.perSecond === undefined || heavy.perSecond === undefined) {
        return defaulted;
    }

    // The probe says how fast this machine is RELATIVE to the one the defaults were fitted on; it
    // is not itself the rate of any algorithm. See REFERENCE_PROBE_RATES.
    const linearSpeed = linear.perSecond / REFERENCE_PROBE_RATES.linearElementsPerSecond;
    const rates: CostRates = {
        linearElementsPerSecond: DEFAULT_COST_RATES.linearElementsPerSecond * linearSpeed,
        iterativeElementsPerSecond:
            DEFAULT_COST_RATES.iterativeElementsPerSecond *
            (iterative.perSecond / REFERENCE_PROBE_RATES.iterativeElementsPerSecond),
        heavyPairsPerSecond:
            DEFAULT_COST_RATES.heavyPairsPerSecond * (heavy.perSecond / REFERENCE_PROBE_RATES.heavyPairsPerSecond),
        cubicOperationsPerSecond: DEFAULT_COST_RATES.cubicOperationsPerSecond * linearSpeed,
    };

    return Object.freeze({ rates: Object.freeze(rates), at, machine, basis: "probe" as const });
}

// ---------------------------------------------------------------------------------------------
// Measuring it once, and keeping the answer
// ---------------------------------------------------------------------------------------------

/** The calibration this process has already taken, keyed by the machine it belongs to. */
let cached: MachineCalibration | undefined;

/** The probe currently running, so two callers at once measure once rather than twice. */
let inFlight: Promise<MachineCalibration> | undefined;

/**
 * The calibration this process has already taken, without taking one.
 *
 * Synchronous, because an estimate is synchronous: a session reads whatever has been measured so
 * far and an unmeasured machine simply reports lower confidence.
 * @returns The calibration, or undefined when none has been taken here.
 */
export function currentCalibration(): MachineCalibration | undefined {
    return cached;
}

/**
 * Measure this machine once, and hand every later caller the same answer.
 *
 * Calibration is a property of the machine rather than of a session, so a page with four graphs
 * on it probes once. A caller that genuinely wants a fresh measurement calls
 * {@link calibrateCost} directly.
 * @param options - The budget, the machine fingerprint and how to yield between workloads.
 * @returns The calibration.
 */
export async function calibrateOnce(options: CalibrateCostOptions = {}): Promise<MachineCalibration> {
    if (cached !== undefined) {
        return cached;
    }

    inFlight ??= calibrateCost(options).then((result) => {
        cached = result;
        inFlight = undefined;

        return result;
    });

    return inFlight;
}

/**
 * Forget what this process measured.
 *
 * For a test that wants a known starting point, and for a host that has reason to believe the
 * machine changed underneath it.
 */
export function resetCalibration(): void {
    cached = undefined;
    inFlight = undefined;
}

/**
 * What runs on this machine actually took.
 *
 * This is the loop that makes the element's estimate better than any consumer's could be: a
 * consumer sees a number and has no way to check it, while the element watches the run it
 * predicted and scales the next prediction from what happened. One entry per algorithm, the most
 * recent kept, because an older timing of the same algorithm says nothing the newer one does
 * not.
 */
export class CostMeasurementLog {
    /** The most recent timing of each algorithm. */
    private readonly byAlgorithm = new Map<AlgorithmKey, CostMeasurement>();

    /**
     * Record what a completed run took.
     *
     * A timing with a size or a duration that is not a usable number is dropped rather than
     * stored: a measurement that cannot be scaled would degrade every later estimate while
     * claiming to improve it.
     * @param measurement - The run that finished.
     * @returns True when it was kept.
     */
    record(measurement: CostMeasurement): boolean {
        const usable =
            Number.isFinite(measurement.seconds) &&
            measurement.seconds >= 0 &&
            Number.isFinite(measurement.nodes) &&
            measurement.nodes >= 0 &&
            Number.isFinite(measurement.edges) &&
            measurement.edges >= 0;

        if (!usable) {
            return false;
        }

        this.byAlgorithm.set(measurement.algorithm, Object.freeze({ ...measurement }));

        return true;
    }

    /**
     * The most recent timing of one algorithm.
     * @param algorithm - Which algorithm.
     * @returns The timing, or undefined when it has never run here.
     */
    latest(algorithm: AlgorithmKey): CostMeasurement | undefined {
        return this.byAlgorithm.get(algorithm);
    }

    /**
     * Every timing, in the shape the estimate reads.
     * @returns The timings, keyed by algorithm.
     */
    get entries(): ReadonlyMap<AlgorithmKey, CostMeasurement> {
        return this.byAlgorithm;
    }

    /**
     * How many algorithms have been timed here.
     * @returns The count.
     */
    get size(): number {
        return this.byAlgorithm.size;
    }

    /** Forget every timing. */
    clear(): void {
        this.byAlgorithm.clear();
    }
}
