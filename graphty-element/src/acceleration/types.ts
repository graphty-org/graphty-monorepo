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
export const ACCELERATION_MIN_NODES_MEASUREMENT = "RTX 4070 SUPER, headless Chromium, 2026-09-25";

/**
 * The node count below which the element declines the accelerator for one capability, when the
 * consumer has not set {@link ACCELERATION_MIN_NODES_KEY} themselves.
 *
 * {@link ACCELERATION_MIN_NODES_DEFAULT} is 0 because it was measured for the forceatlas2
 * LAYOUT, whose accelerated frame was never slower than the CPU's at any size. A traversal is a
 * different shape of work: the whole walk is one call, and on the device that call has a floor
 * of several submit round trips whatever the size, so below some node count the CPU walk is done
 * before the device has started. One number cannot serve both, which is why the layout default
 * stays 0 and each algorithm capability the adapters route carries its own floor here.
 *
 * MEASURED, not guessed. `tmp/traversal-threshold/kernel-cpu-vs-gpu.ts` (the harness, kept
 * out of the tree) mounted `<graphty-element acceleration="required">` in headless Chromium on
 * the dev box (RTX 4070 SUPER through ANGLE's Vulkan backend, 2026-09-25, load average
 * 18 to 23), took the accelerator the element built, built seeded undirected graphs with ten
 * edges per node and integer weights 1..10 in the page, and timed the two dispatchers
 * `Algorithm.accelerated()` uses -- `accelerated(null)` for the CPU port and
 * `accelerated(narrowAlgorithms(accelerator))` for the device -- directly on the snapshot, so no
 * renderer frame is in the loop. Medians of nine warm calls after one cold call, in ms:
 *
 * | nodes / edges | BFS cpu | BFS gpu | sssp cpu | sssp gpu | pageRank cpu | pageRank gpu | components cpu | components gpu |
 * | ------------- | ------: | ------: | -------: | -------: | -----------: | -----------: | -------------: | -------------: |
 * | 1k / 10k      |     0.1 |     7.8 |      0.3 |      7.3 |          0.7 |          3.0 |            0.2 |            3.9 |
 * | 5k / 50k      |     0.6 |     8.8 |      1.6 |      7.9 |          5.3 |          2.9 |            1.2 |            5.3 |
 * | 10k / 100k    |     1.0 |     7.5 |      2.8 |      7.2 |          4.6 |          2.9 |            2.3 |            7.4 |
 * | 20k / 200k    |     1.7 |     9.1 |      3.8 |     13.5 |         16.2 |          3.0 |            4.8 |            7.5 |
 * | 50k / 500k    |     5.7 |    13.0 |     25.8 |     27.6 |         50.3 |          4.3 |           11.6 |            7.8 |
 * | 100k / 1M     |     9.8 |    17.3 |     30.4 |     49.2 |         67.4 |          5.6 |           16.2 |            8.6 |
 * | 200k / 2M     |    17.6 |    23.2 |     73.0 |     79.6 |        148.3 |         10.5 |           29.9 |           11.5 |
 * | 500k / 5M     |    88.3 |    33.6 |    343.8 |    150.3 |        523.0 |         36.1 |           99.7 |           20.9 |
 * | 1M / 10M      |   250.9 |    24.2 |   1031.1 |    274.9 |       1762.4 |         17.5 |          215.7 |           43.2 |
 *
 * The two traversals were then measured twice more around their crossover, because the device's
 * time at one size moves with what else the box is doing (the first sweep's 200k row was taken
 * at a load average of 22.6, the repeats at about 18):
 *
 * | nodes / edges | BFS cpu | BFS gpu | sssp cpu | sssp gpu |
 * | ------------- | ------: | ------: | -------: | -------: |
 * | 100k / 1M     |     7.4 |     9.5 |     26.9 |     20.9 |
 * | 200k / 2M     |    15.6 |    10.1 |     66.3 |     37.8 |
 * | 200k / 2M     |    17.8 |    11.0 |     70.6 |     42.5 |
 * | 300k / 3M     |    35.2 |    13.3 |    129.2 |     77.1 |
 * | 300k / 3M     |    34.4 |    18.9 |    129.8 |     65.2 |
 * | 400k / 4M     |    63.3 |    30.7 |    226.6 |    128.2 |
 * | 500k / 5M     |    93.1 |    32.5 |    361.9 |    200.0 |
 *
 * So: BFS loses at 100k in both runs and splits at 200k (one loss, two wins); Dijkstra splits at
 * both 100k and 200k; from 300k up the device wins every run of both by two to ten times.
 * PageRank wins from 5k and connected components from 50k, in the one run each was measured.
 *
 * A floor is the smallest measured size at which the device's median was at or below the CPU
 * port's IN EVERY RUN, so a size that won under one load and lost under another is below it. A
 * capability that is not listed has no floor and follows {@link ACCELERATION_MIN_NODES_DEFAULT}.
 *
 * Two things the table does not cover. It is one card and one browser: a slower CPU or a
 * slower device moves the crossover, and a consumer who has measured their own machine sets
 * `acceleration.minNodes`, which replaces every floor here with their number. And it is the
 * kernel's time, not the run's: through the element a run also publishes its result rows,
 * which costs the same on either path and is why the element-level numbers in the issue read
 * higher on both sides.
 *
 * Under `acceleration="required"` the floors do not apply: `"required"` is what a benchmark
 * runs under, and a benchmark of the small end of the curve has to reach the device.
 */
export const ACCELERATION_MIN_NODES_BY_CAPABILITY: Readonly<Record<string, number>> = Object.freeze({
    breadthFirstSearch: 300_000,
    sssp: 300_000,
    pageRank: 5_000,
    connectedComponents: 50_000,
});
