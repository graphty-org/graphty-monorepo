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
 */
export interface AcceleratorDeviceInfo {
    /** The hardware vendor, as the driver reports it: `"nvidia"`, `"apple"`, `"intel"`. */
    readonly vendor: string;
    /** The device family, as the driver reports it: `"ampere"`, `"rdna-3"`, `""` when unknown. */
    readonly architecture: string;
    /** A human-readable description of the device. May be empty; never undefined. */
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
    /** Releases the hardware resources. Called by the element when it detaches this accelerator. */
    dispose?(): void;
    /** An accelerated algorithm or layout, looked up by name and feature-tested before use. */
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
    /** The hardware vendor, when the backend reported one. */
    readonly vendor?: string;
    /** The device family, when the backend reported one. */
    readonly architecture?: string;
    /** The device description, when the backend reported one. */
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
 * the graph is drawn on.
 */
export const ACCELERATION_MIN_NODES_DEFAULT = 0;
