/**
 * Context and capability types (spec 2.2, 3.3; contract 3.3). Types only: the file imports the error class
 * as a type, so every layer may `import type` from it without a value edge (the src/types zone of the
 * package eslint config). P0-T3 wrote AdapterInfoLike and AdapterSummary; P1-T1 completes the file.
 */

import type { GpuContext } from "../context.js";
import type { WebGpuGraphError } from "../errors.js";

/** The limits `"raise"` takes from the adapter (spec 2.2); maxComputeWorkgroupsPerDimension is deliberately absent. */
export type RaisableLimit =
    | "maxBufferSize"
    | "maxStorageBufferBindingSize"
    | "maxStorageBuffersPerShaderStage"
    | "maxComputeWorkgroupStorageSize"
    | "maxComputeInvocationsPerWorkgroup"
    | "maxComputeWorkgroupSizeX";

/** How `create()` builds `requiredLimits` (spec 2.2 step 3). */
export type LimitPolicy = "default" | "raise" | Readonly<Partial<Record<RaisableLimit, number>>>;

/** Options of GpuContext.create (spec 2.2). */
export interface GpuContextOptions {
    /** browser: navigator.gpu; Node: the handle of createNodeGpu(). */
    readonly gpu?: GPU | undefined;
    /** Skips requestAdapter(); the adapter must be UNUSED (spec 2.2 step 1). */
    readonly adapter?: GPUAdapter | undefined;
    /** Adopts a device the caller owns (ownsDevice false). */
    readonly device?: GPUDevice | undefined;
    /** Default "high-performance". */
    readonly powerPreference?: GPUPowerPreference | undefined;
    /** Default false; true -> E_SOFTWARE_ONLY instead of a device on lavapipe / SwiftShader. */
    readonly rejectSoftware?: boolean | undefined;
    /** Default "raise". */
    readonly limits?: LimitPolicy | undefined;
    /** Default ["subgroups", "timestamp-query"]; requested only when the adapter has them. */
    readonly optionalFeatures?: readonly GPUFeatureName[] | undefined;
    /** Default []; a missing one -> E_NO_DEVICE. */
    readonly requiredFeatures?: readonly GPUFeatureName[] | undefined;
    /** The device label and the context label (default "webgpu-graph-algorithms"). */
    readonly label?: string | undefined;
    /** The uncapturederror sink; default: keep the last error and throw it from the next public call (spec 5.7). */
    readonly onError?: ((error: WebGpuGraphError) => void) | undefined;
    /** Default 2: console.warn once when more snapshots than this are resident (spec 4.1). */
    readonly warnUnreleasedSnapshots?: number | undefined;
    /** CONTRACT DECISION: set by the ./browser and ./node entries ("browser" / "node"), never by sniffing globals (spec 2.2 step 4); consumers leave it unset ("unknown"). */
    readonly runtime?: "browser" | "node" | "unknown" | undefined;
}

/** The structural subset of GPUAdapterInfo the package reads (CONTRACT DECISION: structural so tests can fake it without the __brand of @webgpu/types). */
export interface AdapterInfoLike {
    /** The adapter's vendor, such as `nvidia`; may be empty. */
    readonly vendor: string;
    /** The GPU architecture, such as `lovelace`; may be empty. */
    readonly architecture: string;
    /** The device identifier; may be empty. */
    readonly device: string;
    /** The driver's description string; may be empty. */
    readonly description: string;
    /** True for a fallback (usually software) adapter, where the runtime reports it. */
    readonly isFallbackAdapter?: boolean | undefined;
    /** The smallest subgroup size the adapter supports, where the runtime reports it. */
    readonly subgroupMinSize?: number | undefined;
    /** The largest subgroup size the adapter supports, where the runtime reports it. */
    readonly subgroupMaxSize?: number | undefined;
}

/** What the app displays or logs about an adapter (spec 2.2). */
export interface AdapterSummary {
    /** The adapter's vendor, such as `nvidia`; may be empty. */
    readonly vendor: string;
    /** The GPU architecture, such as `lovelace`; may be empty. */
    readonly architecture: string;
    /** The device identifier; may be empty. */
    readonly device: string;
    /** The driver's description string; may be empty. */
    readonly description: string;
    /** True when the adapter is a software renderer (llvmpipe, SwiftShader, WARP). */
    readonly software: boolean;
    /** The smallest subgroup size; 0 when the adapter has no `subgroups` feature. */
    readonly subgroupMinSize: number;
    /** The largest subgroup size; 0 when the adapter has no `subgroups` feature. */
    readonly subgroupMaxSize: number;
    /** The adapter's feature names. */
    readonly features: readonly string[];
    /** The adapter's limits, by name. */
    readonly limits: Readonly<Record<string, number>>;
}

/** Result of GpuContext.probe (spec 2.2); `adapter` is the UNUSED adapter to pass to create({ adapter }). */
export interface ProbeResult {
    /** True when a usable adapter was found. */
    readonly ok: boolean;
    /** `OK`, or why there is no usable adapter. */
    readonly code: "OK" | "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY";
    /** A sentence for logs about why there is none; null when `ok`. */
    readonly reason: string | null;
    /** The unused adapter to pass to `GpuContext.create({ adapter })`; null when there is none. */
    readonly adapter: GPUAdapter | null;
    /** What the adapter is; null when there is none. */
    readonly summary: AdapterSummary | null;
}

/** Options of GpuContext.from. */
export interface FromOptions {
    /**
     * Listen for the device's uncaptured errors and fail the next public call with them; default true. Pass false on
     * a device shared with a renderer, whose errors are not this context's: each batch then learns of its own errors
     * from a validation scope around its submit, and its readback rejects with them.
     */
    readonly errorSink?: boolean | undefined;
}

/** Options of GpuContext.probe (spec 2.2). `gpu` may be undefined so an app can pass `navigator.gpu` without a guard: undefined -> E_NO_WEBGPU. */
export interface ProbeOptions {
    /** The WebGPU entry point: `navigator.gpu` in a browser, the handle of `createNodeGpu()` in Node. Undefined gives `E_NO_WEBGPU`. */
    readonly gpu: GPU | undefined;
    /** Which adapter to ask for; default `"high-performance"`. */
    readonly powerPreference?: GPUPowerPreference | undefined;
    /** When true, a software adapter gives `E_SOFTWARE_ONLY`; default false. */
    readonly rejectSoftware?: boolean | undefined;
}

/** The limits every planner reads; GPUSupportedLimits is structurally assignable to it (CONTRACT DECISION: planners take PlanCaps so faked tables need no cast). */
export interface PlanLimits {
    /** The largest buffer the device creates, in bytes. */
    readonly maxBufferSize: number;
    /** The largest storage buffer binding, in bytes. */
    readonly maxStorageBufferBindingSize: number;
    /** How many storage buffers one shader stage may bind. */
    readonly maxStorageBuffersPerShaderStage: number;
    /** The alignment of a storage binding's offset, in bytes. */
    readonly minStorageBufferOffsetAlignment: number;
    /** The alignment of a uniform binding's offset, in bytes. */
    readonly minUniformBufferOffsetAlignment: number;
    /** The largest workgroup count of one dispatch dimension. */
    readonly maxComputeWorkgroupsPerDimension: number;
    /** The most invocations one workgroup may hold. */
    readonly maxComputeInvocationsPerWorkgroup: number;
    /** The largest workgroup size along x. */
    readonly maxComputeWorkgroupSizeX: number;
    /** Workgroup shared memory, in bytes. */
    readonly maxComputeWorkgroupStorageSize: number;
    /** The largest uniform buffer binding, in bytes. */
    readonly maxUniformBufferBindingSize: number;
}

/** The capability record every planner and kernel reads (spec 3.3). */
export interface GpuCaps {
    /** device.limits (never adapter.limits, spec 2.2 step 4). */
    readonly limits: GPUSupportedLimits;
    /** device.features. */
    readonly features: ReadonlySet<string>;
    /** navigator.gpu.wgslLanguageFeatures / the Dawn equivalent; informational only (never relied on). */
    readonly wgslFeatures: ReadonlySet<string>;
    /** 0 when the "subgroups" feature is absent from the device. */
    readonly subgroupMinSize: number;
    /** 0 when the "subgroups" feature is absent from the device. */
    readonly subgroupMaxSize: number;
    /** True when the device runs on a software renderer. */
    readonly software: boolean;
    /** Where the context runs: `"browser"`, `"node"`, or `"unknown"` for a context built outside the two entries. */
    readonly runtime: "browser" | "node" | "unknown";
    /** The adapter's vendor; may be empty. */
    readonly vendor: string;
    /** The GPU architecture; may be empty. */
    readonly architecture: string;
    /** The device identifier; may be empty. */
    readonly device: string;
    /** The driver's description string; may be empty. */
    readonly description: string;
}

/** What the pure planners need of GpuCaps: `limits` narrowed to PlanLimits plus the four scalar facts. A GpuCaps IS a PlanCaps. */
export interface PlanCaps {
    /** The device limits the planners read. */
    readonly limits: PlanLimits;
    /** The device's features. */
    readonly features: ReadonlySet<string>;
    /** The smallest subgroup size; 0 without the `subgroups` feature. */
    readonly subgroupMinSize: number;
    /** The largest subgroup size; 0 without the `subgroups` feature. */
    readonly subgroupMaxSize: number;
    /** True when the device runs on a software renderer. */
    readonly software: boolean;
}

/** Mutable test-build flags on a context (@internal; set by test/setup/gpu.ts from GRAPHTY_GPU_INSPECT, spec 11.9 item 2). */
export interface GpuDebugFlags {
    inspect: boolean;
}

/**
 * The context the device self-check runs on. `src/primitives/**` may not name GpuContext (the layer rule of
 * spec 3.2), and this file may, so the alias is how src/primitives/verify.ts types its argument. It is
 * GpuContext and nothing else: pass the context you were going to compute on.
 */
export type CheckedContext = GpuContext;

/**
 * The first word a device got wrong in the self-check. `poison` is true when the word still held the
 * 0xdeadbeef the check wrote before the dispatch, which means NOTHING wrote it -- a different failure from a
 * word written with the wrong value, and the distinction that made the Windows diagnosis possible.
 */
export interface DeviceCheckMismatch {
    /** Where it was found: `out[<index>]`, or `total`. */
    readonly where: string;
    /** The value arithmetic requires there. */
    readonly expected: number;
    /** The value the device returned. */
    readonly actual: number;
    /** True when `actual` is the poison word the check wrote beforehand: nothing wrote this word. */
    readonly poison: boolean;
}

/**
 * What one device self-check found (spec 3.3): the capability record a caller may read BEFORE it commits work
 * to a device, through `verifyDevice`. `mismatch === null` (equivalently `ok`) means every one of `count`
 * output words and the total matched the arithmetic answer; a non-null `mismatch` is the device returning
 * wrong numbers, which every compute entry point of this package turns into E_DEVICE_INCORRECT.
 *
 * It reports one property -- that values crossing a workgroup barrier and block totals crossing dispatches of
 * one compute pass survive -- and is therefore a refusal mechanism, not a certificate of correctness.
 */
export interface DeviceCheck {
    /** The check that ran; one today, named so a second can be added without changing the shape. */
    readonly check: "exclusive-scan";
    /** True when nothing disagreed. */
    readonly ok: boolean;
    /** The device's workgroup size (spec 5.1). */
    readonly workgroupSize: number;
    /** The words scanned: `blocks * workgroupSize + 1`, so the last workgroup is a partial one. */
    readonly count: number;
    /** The full workgroups of the scan (one partial one follows). */
    readonly blocks: number;
    /** Wall time of this check in milliseconds, pipeline compile included on the first call. */
    readonly ms: number;
    /** caps.vendor of the device that ran it. */
    readonly vendor: string;
    /** caps.architecture of the device that ran it. */
    readonly architecture: string;
    /** caps.description: the string that separates a broken driver from a fixed one. */
    readonly description: string;
    /** The first disagreement, or null when there was none. */
    readonly mismatch: DeviceCheckMismatch | null;
}
