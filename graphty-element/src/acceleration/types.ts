/**
 * @file The acceleration vocabulary: what an accelerator is, how one is built, and what the
 * element publishes about it.
 *
 * graphty-element owns hardware-acceleration detection, construction, lifecycle and policy. A
 * consumer switches WebGPU on with one import and writes no probe, no construction, no
 * injection and no device-loss code. What a consumer reads is the state published here; what a
 * third party implements is {@link GraphAccelerator}.
 *
 * No GPU type appears in this file, on purpose. `GpuContext`, `GpuCaps`, `ProbeResult` and
 * everything else that names a `GPU*` type stay inside the optional peer package, so installing
 * graphty-element never makes `@webgpu/types` part of a consumer's compilation. The element
 * publishes its own {@link Capabilities} instead, and GPU failures arrive as codes on a
 * `GraphtyError`, never as a class a consumer would have to import to name.
 *
 * The file is free of Babylon.js, Lit and DOM references so it can be re-exported from the
 * Node-safe entry points.
 */

import type { AlgorithmAccelerator } from "@graphty/algorithms";

import type { AccelerationErrorCode } from "../errors";

/**
 * Where hardware acceleration stands, in one word.
 *
 * Six states, because the honest reading of an unfinished probe is not one of the failures:
 * without `"probing"` every page that ends up with a GPU first flashes a false "no GPU", and
 * without `"idle"` a perfectly healthy accelerator with nothing to do is indistinguishable from
 * a broken one.
 *
 * - `"probing"` -- the element is looking and the answer is not known yet. A consumer shows
 *   whatever it shows for a pending answer: not "GPU on", not "GPU unavailable".
 * - `"active"` -- an accelerator is attached and work is on it right now.
 * - `"idle"` -- an accelerator is attached and usable, and nothing is using it at the moment.
 *   This is the resting state of a working accelerator, not a degraded one: a graph below
 *   `acceleration.minNodes`, or a page where nothing has been run yet, sits here.
 * - `"unavailable"` -- no accelerator could be attached. `reason` says why in a sentence a
 *   person can read, `code` says why in a string a `switch` can take.
 * - `"error"` -- an accelerator was attached and then failed, device loss being the usual
 *   cause. The element continues on the CPU path having said so.
 * - `"off"` -- acceleration is switched off by the consumer, so the element never looked.
 */
export type AccelerationState = "probing" | "active" | "idle" | "unavailable" | "error" | "off";

/**
 * What the consumer asked for.
 *
 * `"auto"` uses an accelerator when one can be attached and runs on the CPU when one cannot;
 * `"off"` never looks; `"required"` turns absence into a thrown `E_NO_ACCELERATOR` rather than
 * a quiet CPU result.
 *
 * This is a session setting, not a stored preference. The element persists nothing on a
 * reader's behalf: remembering that a person switched acceleration off, and restoring it on the
 * next visit, is the host application's storage and the host application's job.
 */
export type AccelerationPolicy = "auto" | "off" | "required";

/** The three values, in the order a control offers them. */
export const ACCELERATION_POLICIES: readonly AccelerationPolicy[] = ["auto", "off", "required"];

/** What the element does when nothing was asked: `auto`. */
export const ACCELERATION_POLICY_DEFAULT: AccelerationPolicy = "auto";

/**
 * Whether a value is one of the three acceleration policies.
 *
 * A host that offers the choice gets the value back from storage, a query string or a change
 * handler, where it is an unknown string. This is the check the element itself runs on the
 * `acceleration` attribute, so a host cannot accept a value the element would refuse.
 * @param value - Anything at all.
 * @returns True when `value` is `"auto"`, `"off"` or `"required"`.
 */
export function isAccelerationPolicy(value: unknown): value is AccelerationPolicy {
    return typeof value === "string" && (ACCELERATION_POLICIES as readonly string[]).includes(value);
}

/**
 * The arithmetic that produced a set of numbers.
 *
 * A GPU accelerator usually computes in single precision, so a result that came off one is
 * labelled `"f32"` and a result computed on the CPU path is labelled `"f64"`. The label lands on
 * a run's `Caveats.precision`, which is how a consumer can tell why two runs of the same
 * algorithm over the same graph disagree in the seventh decimal place.
 */
export type AccelerationPrecision = "f32" | "f64";

/** The precision of the CPU path. Double, always, on every host. */
export const CPU_PRECISION: AccelerationPrecision = "f64";

/**
 * The precision assumed of an accelerator that does not declare one.
 *
 * Single precision is what every shipped GPU backend computes in, so an accelerator that says
 * nothing is reported as `"f32"`. One that computes in double precision declares
 * {@link GraphAccelerator.precision} and is reported as `"f64"`.
 */
export const DEFAULT_ACCELERATOR_PRECISION: AccelerationPrecision = "f32";

/**
 * What an accelerator says about the hardware it is running on.
 *
 * Three plain strings, so a status chip can render "NVIDIA, ampere" without importing a GPU
 * type or parsing a renderer string.
 *
 * This side is ALWAYS PRESENT, MAY BE EMPTY: an accelerator fills in what its driver told it and
 * `""` for what it did not, so an implementer never has to choose between `""` and `undefined`.
 * {@link AccelerationStatus}, what a consumer reads, is the opposite -- a field is there only
 * when the backend reported one -- and `AccelerationController` is the single place that
 * converts between the two, dropping every empty string on the way out. Keep it that way: a
 * browser masks the device and the description for an ordinary origin, so empty is the common
 * case and a consumer must never be handed `""` to render.
 */
export interface AcceleratorDeviceInfo {
    /** The hardware vendor, as the driver reports it: `"nvidia"`, `"apple"`, `""` when unknown. */
    readonly vendor: string;
    /** The device family, as the driver reports it: `"ampere"`, `"rdna-3"`, `""` when unknown. */
    readonly architecture: string;
    /** A human-readable description of the device, `""` when unknown. Never undefined. */
    readonly description: string;
}

/**
 * An attached accelerator: something that can run part of the element's work on hardware the
 * CPU path would otherwise do itself.
 *
 * Every member beyond `name` and `backend` is optional, and the accelerated algorithms and
 * layouts are reached through the index signature rather than through a closed interface. That
 * is deliberate: the accelerated list grows every time a sibling package ports another
 * algorithm, and a closed interface a third party might implement would break on every one of
 * those minors. The element feature-tests a member before using it and reports on
 * {@link Capabilities} when it took the CPU path instead.
 *
 * The index signature is the one place this design accepts a loose type. It buys a third party
 * the ability to implement exactly one method -- `forceAtlas2`, say -- and nothing else.
 */
export interface GraphAccelerator {
    /** A short name for this implementation, used in diagnostics: `"webgpu-graph-algorithms"`. */
    readonly name: string;
    /** The kind of hardware behind it. `"webgpu"` is the one the element ships a factory for. */
    readonly backend: "webgpu" | (string & {});
    /** The hardware, when the backend can describe it. */
    readonly device?: AcceleratorDeviceInfo;
    /**
     * Resolves when the underlying device is lost and this accelerator stops working.
     *
     * The element awaits it, reports `state: "error"` with `E_DEVICE_LOST`, and attempts to
     * attach a fresh accelerator. A backend with no notion of device loss omits it.
     */
    readonly lost?: Promise<{ reason: string }>;
    /** The arithmetic this accelerator computes in. Absent means {@link DEFAULT_ACCELERATOR_PRECISION}. */
    readonly precision?: AccelerationPrecision;
    /**
     * Proves this accelerator computes correctly, before any of the element's work is planned
     * onto it.
     *
     * Hardware that answers is not the same thing as hardware that answers correctly. The
     * software renderer that ships with Windows miscomputes shaders that pass a value across a
     * workgroup barrier: it builds, it runs, it returns plausible numbers, and every prefix sum,
     * sort and grid layout over one of them is wrong. Nothing errors. A backend that can tell
     * the difference implements this; one that cannot omits it, and the element attaches it on
     * the strength of the probe as before.
     *
     * Resolve when the hardware is trustworthy. Reject with a `GraphtyError` carrying
     * `E_DEVICE_INCORRECT` when it is not, and the element reports acceleration unavailable with
     * that code and runs the CPU path -- the same place a missing adapter reaches, because a
     * device that lies is no more usable than a device that is not there.
     *
     * The element calls it once, on an accelerator it built from a registered factory, before
     * attaching it. An accelerator handed over already built through `setAccelerator` is not
     * asked -- the element did not construct it and does not own its lifetime, and whoever did
     * both vouched for it by handing it over.
     *
     * It is NOT a way to report a failure part-way through a run: work that has already started
     * on the accelerator and then fails is that work's failure and throws.
     * @returns Resolves when the accelerator is fit to be given work.
     */
    verify?(): Promise<void>;
    /** Releases the hardware resources. Called by the element when it detaches this accelerator. */
    dispose?(): void;
    /**
     * An accelerated algorithm or layout, looked up by name and feature-tested before use.
     *
     * `release(snapshot)` is one of these rather than a declared member: an accelerator that keeps
     * device buffers for a snapshot implements it, and the element calls it when that snapshot
     * stops being the graph, while an accelerator with no residency to free simply has no such
     * member. Both are feature-tested the same way, so neither has to pretend to be the other.
     */
    [algorithmOrLayout: string]: unknown;
}

/** What the element tells a factory before the factory builds anything. */
export interface AcceleratorFactoryOptions {
    /**
     * The largest graph the element will ask this accelerator to compute exactly.
     *
     * A backend that has to size buffers, choose an index width, or decide it cannot serve a
     * graph this large needs the number before it builds anything, which is why it arrives at
     * construction time: a factory answers once instead of failing on the first run. A factory
     * that does not care ignores the parameter.
     */
    readonly exactMaxNodes?: number;
    /**
     * Whether a software adapter (SwiftShader, llvmpipe) is acceptable.
     *
     * Under `"auto"` it is not: a software rasteriser is slower than the element's own CPU
     * path, and attaching it would make the graph slower while reporting "active". Under
     * `"required"` it is: the consumer said "no CPU path", and a software device is a device.
     */
    readonly acceptSoftware?: boolean;
}

/**
 * Builds an accelerator, or declines.
 *
 * Three answers, and the difference between them is the whole contract:
 *
 * - an accelerator -- the element attaches it;
 * - `null` -- this backend cannot serve, with nothing more to say. The element reports
 *   `state: "unavailable"` with a generic reason;
 * - a thrown `GraphtyError` carrying an {@link AccelerationErrorCode} -- this backend cannot
 *   serve, and here is why. The element reports `state: "unavailable"` with that `code` and
 *   `reason`, which is what lets a status chip say "requires a secure context (https or
 *   localhost)" instead of shrugging.
 *
 * All three are up-front detection, which is correct and required. None of them is a fallback:
 * an accelerator that has already been attached and then fails mid-run must propagate the
 * failure, never quietly finish the work on the CPU.
 */
export type AcceleratorFactory = (options?: AcceleratorFactoryOptions) => Promise<GraphAccelerator | null>;

/**
 * Where acceleration stands, as a consumer reads it.
 *
 * This is the `acceleration` member of {@link Capabilities} and the payload a status chip
 * renders. It is plain, frozen, serialisable data: no GPU objects, no promises, no classes.
 */
export interface AccelerationStatus {
    /**
     * The policy in force: what the consumer asked for, however they asked -- the `acceleration`
     * attribute, the property, or `session.acceleration`. A change of policy publishes a new
     * status even when the state does not move.
     * @since 2.3.0
     */
    readonly policy: AccelerationPolicy;
    /** The one-word state. */
    readonly state: AccelerationState;
    /** The attached accelerator's backend, when one is attached. */
    readonly backend?: "webgpu" | (string & {});
    /**
     * The hardware vendor, when the backend reported one. Absent otherwise, never `""`.
     *
     * The three device facts arrive from an accelerator as {@link AcceleratorDeviceInfo}, where
     * they are always present and an unknown one is `""`. They are published here the other way
     * round, so a consumer can test one with `??` or `!== undefined` and never render an empty
     * string. `AccelerationController` is what converts.
     */
    readonly vendor?: string;
    /** The device family, when the backend reported one. Absent otherwise, never `""`. */
    readonly architecture?: string;
    /** The device description, when the backend reported one. Absent otherwise, never `""`. */
    readonly device?: string;
    /** Why acceleration is unavailable or has stopped, in a sentence a person can read. */
    readonly reason?: string;
    /** Why acceleration is unavailable or has stopped, in a string a `switch` can take. */
    readonly code?: AccelerationErrorCode;
}

/**
 * The measured numbers that govern how much the element will attempt on this machine.
 *
 * They come from `session.calibrate()`, the element's own first-run probe, and fall back to
 * built-in defaults when the probe cannot run.
 */
export interface Limits {
    /** Above this node count the element draws less visual detail. Nothing to do with acceleration. */
    largeGraphThreshold: number;
    /** The most nodes this machine will render at an interactive frame rate. */
    renderCeiling: number;
    /** How much memory the element is willing to hold for one graph. */
    graphMemoryBudgetBytes: number;
    /** Above this node count an approximable algorithm is approximated rather than computed exactly. */
    approximateAboveNodes: number;
    /** The most elements a single selection will hold. */
    selectionCap: number;
    /** The most edges drawn at once. */
    edgesDrawn: number;
}

/** When the element last measured this machine, and whether it measured or guessed. */
export interface CalibrationRecord {
    /** ISO timestamp of the measurement. */
    at: string;
    /** A fingerprint of the machine the measurement belongs to. */
    machine: string;
    /** `"probe"` when the numbers were measured, `"defaults"` when the probe could not run. */
    basis: "probe" | "defaults";
}

/** Whether this host can run the element's work off the main thread, and on how many threads. */
export interface WorkerCapability {
    /** `"active"` when workers are usable here, `"unavailable"` when they are not. */
    readonly state: "active" | "unavailable";
    /** How many worker threads the element will use. Zero when workers are unavailable. */
    readonly count: number;
}

/** Which immersive modes this host offers. */
export interface XrCapability {
    /** Whether an immersive VR session can be entered. */
    readonly vr: boolean;
    /** Whether an immersive AR session can be entered. */
    readonly ar: boolean;
}

/** Which capture formats this host can produce. */
export interface CaptureCapability {
    /** PNG image capture. */
    readonly png: boolean;
    /** JPEG image capture. */
    readonly jpeg: boolean;
    /** WebP image capture. */
    readonly webp: boolean;
    /** SVG capture. */
    readonly svg: boolean;
    /** PDF capture. */
    readonly pdf: boolean;
    /** Video recording. */
    readonly video: boolean;
    /** Writing a capture to the system clipboard. */
    readonly clipboard: boolean;
}

/**
 * What this host can do, as the element measured it.
 *
 * A consumer reads this; a consumer never probes. Every transition emits `capabilities:changed`
 * on the session and `graphty-capabilities-change` on every bound view, so a status chip is
 * written once and is correct from the first frame through a device loss.
 */
export interface Capabilities {
    /** Hardware acceleration: the state, the device behind it, and why not when there is none. */
    readonly acceleration: AccelerationStatus;
    /** Off-main-thread execution. */
    readonly workers: WorkerCapability;
    /** Immersive modes. */
    readonly xr: XrCapability;
    /** Capture formats. */
    readonly capture: CaptureCapability;
    /** The last calibration, or null when the element has not measured this machine. */
    readonly calibration: CalibrationRecord | null;
    /** The measured ceilings and caps. */
    readonly limits: Readonly<Limits>;
}

/**
 * The part of {@link Capabilities} the acceleration subsystem publishes.
 *
 * The element emits this as the `graphty-capabilities-change` detail. It is a subset rather
 * than a different shape: the members a consumer reads here -- `capabilities.acceleration.state`
 * and the rest -- keep their meaning and their spelling when the worker, XR, capture,
 * calibration and limits members join them.
 */
export type AccelerationCapabilities = Pick<Capabilities, "acceleration">;

/**
 * The configuration key that decides when acceleration starts paying for itself.
 *
 * At or above this node count, a run or a layout that has an accelerated implementation uses
 * the accelerator; below it the element takes the CPU path even though an accelerator is
 * attached, and the state reads `"idle"`. It is the only threshold that governs acceleration,
 * and it is a different number from `largeGraphThreshold`, which decides how much visual detail
 * to draw and has nothing to say about where a computation runs.
 */
export const ACCELERATION_MIN_NODES_KEY = "acceleration.minNodes";

/**
 * The default for {@link ACCELERATION_MIN_NODES_KEY}: use the accelerator whenever one is
 * attached.
 *
 * Raise it when a graph is small enough that uploading it costs more than computing it. There
 * is no defensible non-zero default, because the crossover has to be measured on the machine
 * the graph is drawn on -- and this zero is a measurement, not a guess. On the dev box
 * (RTX 4070 SUPER, headless Chromium, 2026-09-22) the accelerated layout's frame time was at or
 * below the CPU simulation's at every size measured, starting with the smallest: 50.0 against
 * 50.0 ms at 500 nodes, 116.7 against 116.7 at 1,000 and 183.3 against 216.6 at 2,000, three runs
 * of sixty working frames per arm, all at average degree 10. A fourth size, 5,000 nodes, read
 * 466.6 against 566.7 -- but from ONE run of five frames, so read it as indicative and not as what
 * the default rests on. The crossover is therefore below the smallest graph worth accelerating,
 * and the default stays 0.
 *
 * `scripts/measure-min-nodes.mjs` is the measurement, protocol in its header; the table and what
 * it does not cover are in section 3 of `graphty-element/docs/decisions/G6.md` IN THE REPOSITORY,
 * which is not part of the published documentation site.
 */
export const ACCELERATION_MIN_NODES_DEFAULT = 0;

/**
 * Where and when the per-capability floors below were measured, as the plan's reason quotes it.
 */
export const ACCELERATION_MIN_NODES_MEASUREMENT = "RTX 4070 SUPER, headless Chromium, 2026-09-30";

/**
 * The node count below which the element declines the accelerator for one capability, when the
 * consumer has not set {@link ACCELERATION_MIN_NODES_KEY} themselves.
 *
 * {@link ACCELERATION_MIN_NODES_DEFAULT} is 0 because it was measured for the forceatlas2
 * LAYOUT, whose accelerated frame was never slower than the CPU's at any size. An algorithm is a
 * different shape of work: the whole run is one call, and on the device that call costs several
 * submit round trips whatever the size -- a readback in Chromium is about 2 ms -- so below some
 * node count the CPU port has finished before the device has started. One number cannot serve
 * both, which is why the layout default stays 0 and each algorithm capability the adapters route
 * carries its own floor here.
 *
 * MEASURED 2026-09-30 AGAINST THE ALGORITHMS 3.0 CPU PORTS, which are much faster than the code
 * the earlier floors were set against. Headless Chromium on the RTX 4070 SUPER (ANGLE's Vulkan
 * backend; no software rasteriser), both arms through `@graphty/algorithms`' dispatcher with the
 * element's own options -- `accelerated(null)` for the CPU port, `accelerated(accelerator)` for
 * the device -- so each arm includes what the element's run includes on that path. Seeded random
 * graphs of n nodes and ten edges a node up to the element's 100,000-edge limit, and ten a node
 * past it; arms interleaved with the order flipped every round, one discarded pass of each first,
 * medians of 15 rounds (9 above 20,000 nodes, 5 where one CPU pass took over a second), the graph
 * resident on the device. Three sweeps, at one-minute load averages between 3.4 and 12.6 on 32
 * threads, with other sessions' browser tests sharing the machine and the card; a CPU median moved
 * by up to 2x between sweeps while the interleaved ratio mostly held.
 *
 * A floor is the smallest measured node count from which the device's median beat the CPU port's
 * at EVERY measured size, graph shape and sweep at or above it, counting only graphs the element
 * can hold (at most 100,000 edges up to 50,000 nodes). So a capability that wins at 10,000 nodes
 * and loses at 50,000 nodes with 100,000 edges is floored above 50,000. The shapes measured are
 * few: uniform random graphs for every capability, and for Katz also a sparse random graph (one
 * edge a node) and a 200-wide grid. A graph unlike those can cross over somewhere else.
 *
 * The timings are of a graph already on the device. The first run on a freshly loaded graph also
 * pays the upload, and several of the 100,000-node floors below do not hold for that first run
 * (connected components took 19.7 ms against the CPU's 14.3 at 100,000 nodes when it had to upload).
 * Every one of those floors is above the render ceiling, so today no run the element makes is
 * affected. The full tables are in
 * `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`, section "The element's floors
 * re-measured against the 3.0 ports (2026-09-30)".
 *
 * WHAT THE ELEMENT CAN HOLD BOUNDS WHAT IS ROUTED. `DEFAULT_LIMITS.renderCeiling` is 50,000 nodes
 * and `DEFAULT_LIMITS.edgesDrawn` is 100,000 edges, and a load past either is refused with
 * `E_TOO_LARGE`. The floors of 100,000 below are the smallest measured size past that ceiling at
 * which the device won in every sweep (on ten edges a node); the crossover lies between 50,000 and
 * 100,000. Those capabilities are not routed to the device at any size the element holds today,
 * and a raised ceiling (issue #419), `acceleration.minNodes` or `acceleration="required"` is what
 * puts them there.
 *
 * Two things the table does not cover. It is one card and one browser: a slower CPU or a slower
 * device moves the crossover, and a consumer who has measured their own machine sets
 * `acceleration.minNodes`, which replaces every floor here with their number. And a run the
 * dispatcher answers on the CPU port whatever is attached -- a personalized PageRank, a seeded
 * label propagation, a Katz `alpha` whose series may diverge on that graph -- never reaches the
 * floor. Under `acceleration="required"` the floors do not apply: `"required"` is what a benchmark
 * runs under, and a benchmark of the small end of the curve has to reach the device.
 */
/**
 * The capabilities a floor can name: the seam's algorithm members, by their exact names.
 *
 * Typed against the seam rather than as a string so that a member renamed on one side and not
 * the other is a compile error here, not a floor that silently stops applying and sends that
 * capability back to the GPU at every size.
 */
export type FlooredCapability = Exclude<keyof AlgorithmAccelerator, "kind" | "release">;

export const ACCELERATION_MIN_NODES_BY_CAPABILITY: Readonly<Partial<Record<FlooredCapability, number>>> = Object.freeze(
    {
        // All-pairs shortest paths: 0.88x to 1.30x at 256 nodes, 1.19x to 1.90x from 300, 3.8x at
        // the 5,792-node bound. The run refuses a larger graph anyway.
        allPairsShortestPath: 300,
        // Exact: 0.95x to 1.07x at 300, 1.38x to 1.46x at 400, 3.3x to 3.6x at 1,000. A run also
        // has to clear ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY, because its cost follows the
        // number of sources, not the node count.
        betweennessCentrality: 400,
        // Exact and 100 sampled sources: sampled 0.96x at 3,000, both 1.3x to 1.7x at 4,000. A run
        // also has to clear ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY. The closeness
        // adapter never sends an exact run above 30,000 nodes (see
        // EXACT_CLOSENESS_MAX_ACCELERATED_NODES). Was 5,800.
        closenessCentrality: 4_000,
        // 0.56x to 0.86x at 5,000, 1.04x to 1.55x at 10,000, 2x at 20,000. Was 50,000.
        pageRank: 10_000,
        // 0.59x to 0.78x at 10,000, 1.10x at 15,000, 1.7x to 2.7x at 20,000 to 50,000. Unchanged.
        hits: 15_000,
        // The dispatcher sends Katz to the device only where the series provably converges and the
        // in-degrees are uneven: at the default alpha, sparse and bounded-degree graphs. On one
        // edge a node: 0.6x at 20,000, 1.2x to 1.4x at 50,000, 2.3x at 100,000. On a 200-wide grid
        // (two edges a node): 0.5x to 0.8x at 50,000, 1.4x at 100,000, 2.2x at 200,000. Was 28,000.
        katzCentrality: 100_000,
        // Loses at every size the element holds (0.74x at best, at 20,000); 1.4x to 1.6x at
        // 50,000 nodes on ten edges a node, 1.2x to 1.9x above. Was 28,000.
        eigenvectorCentrality: 100_000,
        // Above the render ceiling: 0.25x to 0.74x at 50,000 nodes, 1.0x to 1.6x at 100,000. Was 141,000.
        breadthFirstSearch: 100_000,
        // Above the render ceiling: 0.74x to 1.47x at 50,000 nodes, 1.8x to 2.7x at 100,000. Was 107,000.
        sssp: 100_000,
        // Above the render ceiling: 0.29x to 0.55x at 50,000 nodes with 100,000 edges, 1.6x to 3.9x at
        // 100,000. Was 132,000.
        connectedComponents: 100_000,
        // No node floor: the triangle count is floored on its edges instead, in
        // ACCELERATION_MIN_EDGES_TIMES_DENSITY_BY_CAPABILITY.
        // Wins 1.1x to 2.8x at 5,000 to 20,000 nodes and loses at 50,000 nodes with 100,000 edges
        // (0.51x to 0.59x, where the CPU port converged in 10 passes); 3x to 4x at 100,000. An edge
        // floor was measured for it on 2026-10-01 and does not separate the wins from the losses:
        // its CPU cost is arcs times passes, and the passes, which nothing knows before the run,
        // decide it (a 100-edge-a-node graph converges in a few passes and loses at 70,000 edges).
        labelPropagation: 100_000,
    },
);

/**
 * For a capability whose cost follows its edges, the smallest (edges x edges per node), that is
 * edges squared over nodes, at which the device beat the CPU port. A capability listed here has
 * no node floor: this one decides alone, and like the node floors it applies only while the
 * consumer has not set `acceleration.minNodes` and not under `acceleration="required"`.
 *
 * The triangle count is the one capability it serves (the clustering coefficient runs on it). Its
 * device call costs 6 to 15 ms almost whatever the graph inside the element's ceiling, while the
 * CPU port's cost grows with the edges and with how many neighbors each node has to intersect,
 * so a node floor had to sit above the 50,000-node ceiling to keep sparse graphs off the device
 * (two edges a node at 50,000 nodes is a toss-up, 0.92x to 1.30x) and so kept dense graphs that
 * win off it too.
 *
 * Measured 2026-10-01, RTX 4070 SUPER, headless Chromium, the method of the node floors: both arms
 * through `@graphty/algorithms`' dispatcher, seeded uniform random graphs of 2, 3, 5, 10, 12, 15,
 * 20, 25, 30, 40, 60 and 100 edges a node from 300 to 50,000 nodes, at most 100,000 edges, plus
 * two R-MAT (skewed-degree) shapes; medians of 15 rounds (9 above 20,000 nodes), seven sweeps.
 * Every graph at or above 1,080,000 won in every sweep (1.11x to 9.3x); just below, around
 * 1,000,000, graphs won in most sweeps and lost in some (0.93x at 1,008,000, 0.98x at 1,012,500).
 * The floor is 1,080,000, the smallest measured value at and above which every graph won, the
 * rule the node floors follow; nothing between it and the losses was measured. Unlike the node
 * floors this one routes runs inside the ceiling, so it also had to hold for the first run on a
 * freshly loaded graph, which pays the upload: it does (1.06x to 10.7x at and above it). Neither the edge count alone (two edges a node lose at
 * 100,000 edges, twenty win at 60,000) nor a wedge count from the degrees separates the wins from
 * the losses. Skewed-degree graphs win below the floor (1.5x to 2x around 220,000 to 370,000);
 * the floor leaves those on the CPU port, which is a few milliseconds lost, never a slower run.
 * The table is in `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`, section
 * "Edge-aware floors (2026-10-01)".
 */
export const ACCELERATION_MIN_EDGES_TIMES_DENSITY_BY_CAPABILITY: Readonly<Partial<Record<FlooredCapability, number>>> =
    Object.freeze({
        triangleCount: 1_080_000,
    });

/** Where and when the edge floors above were measured, as the plan's reason quotes it. */
export const ACCELERATION_MIN_EDGES_MEASUREMENT = "RTX 4070 SUPER, headless Chromium, 2026-10-01";

/**
 * For a run that searches from a set of sources, the smallest (sources x edges) at which the
 * device beat the CPU port. Applies on top of {@link ACCELERATION_MIN_NODES_BY_CAPABILITY}: a run
 * must clear both.
 *
 * A node count alone cannot floor a sampled run. The device's cost of a sampled betweenness or
 * closeness is a few milliseconds almost whatever the size, while the CPU port's grows with the
 * number of sources times the number of edges -- so with ten sources the device loses at sizes
 * where with a hundred it wins by 2x. An exact run counts every node as a source.
 *
 * Measured 2026-09-30, RTX 4070 SUPER, headless Chromium, the same method as the node floors:
 * uniform random graphs of 400 to 50,000 nodes at ten edges a node up to 100,000 edges, with 1, 3,
 * 10, 30 and 100 sources, two sweeps at load averages 4.3 to 6.1. Betweenness: every run of
 * 500,000 or more won (1.5x to 9x). At 300,000 to 400,000 it lost on 400 and 1,000 nodes (0.86x
 * to 0.90x) and won from 10,000 (1.0x to 1.6x); below 300,000 it lost everywhere. Closeness: on
 * 4,000 nodes or more, every run of 1,000,000 or more won (1.2x to 7x), and every run below it
 * lost except three sources on 50,000 nodes (1.0x to 1.25x).
 */
export const ACCELERATION_MIN_SOURCE_EDGES_BY_CAPABILITY: Readonly<Partial<Record<FlooredCapability, number>>> =
    Object.freeze({
        betweennessCentrality: 500_000,
        closenessCentrality: 1_000_000,
    });
