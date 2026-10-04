/**
 * WebGPU acceleration: detection, device acquisition, reuse, device-loss recovery and disposal, per Cytoscape core.
 *
 * The package @graphty/webgpu-graph-algorithms is a regular dependency, but nothing here imports it statically.
 * The first call that could use a GPU, in a runtime that has WebGPU (or might: Node, where the optional `webgpu`
 * package brings Dawn), loads it with a dynamic import of "#gpu-platform". The package's `imports` field maps that specifier to the Node
 * build or the browser build, so a bundler puts the GPU code in a chunk of its own that a CPU-only page never
 * fetches, and a browser bundle never sees the Node build's `import("webgpu")`.
 *
 * The rule the whole module follows: the GPU-or-CPU decision is made once, up front, before any work starts.
 * A failure of work that already started on the GPU (a lost device, an out-of-memory) is thrown to the caller,
 * never finished quietly on the CPU. The next call acquires a fresh device.
 */

import type { AlgorithmAccelerator } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import type { LayoutAccelerator } from "@graphty/layout";
import type { Core } from "cytoscape";

import { loadPart } from "./lazy.js";
import { onSnapshotsDropped } from "./snapshot.js";

/** The accelerator a provider hands over: both CPU packages' injection seams, plus snapshot release and disposal. */
export type GpuAccelerator = AlgorithmAccelerator &
    LayoutAccelerator & {
        release(s: GraphSnapshot): void;
        dispose(): void;
    };

/** A device a provider acquired. */
export interface AcquiredGpu {
    readonly accelerator: GpuAccelerator;
    /** "vendor / description", for the backend report. */
    readonly device: string;
    /** Resolves (with the reason) when the device is lost, including when it is destroyed by dispose(). */
    readonly lost: Promise<string>;
}

/** Thrown by a provider that declined up front (no WebGPU, no adapter, a software-only or incorrect device). */
export class GpuUnavailableError extends Error {
    /** E_NO_WEBGPU, E_NO_ADAPTER, E_SOFTWARE_ONLY, E_DEVICE_INCORRECT, ... */
    readonly code: string;
    /** What the user can change to get the GPU, when there is something; null when nothing they do would help. */
    readonly fix: string | null;

    /**
     * Creates the error.
     * @param code - the reason code
     * @param message - the reason in words
     * @param fix - what the user can change to get the GPU, or null
     */
    constructor(code: string, message: string, fix: string | null = null) {
        super(message);
        this.name = "GpuUnavailableError";
        this.code = code;
        this.fix = fix;
    }
}

/** Probes, constructs and verifies a device, or throws GpuUnavailableError. */
export interface GpuProvider {
    acquire(): Promise<AcquiredGpu>;
}

/**
 * Per call: "auto" (default) uses the GPU when one is available and runs the CPU otherwise; "off" always runs the CPU;
 * "require" throws when no GPU is available instead of running the CPU.
 */
export type GpuMode = "auto" | "off" | "require";

const GPU_MODES: readonly unknown[] = ["auto", "off", "require"] satisfies GpuMode[];

/**
 * Throws when a `gpu` option is not one of the modes, so a misspelled "require" cannot quietly run on the CPU.
 * @param name - the method or layout, for the message
 * @param mode - the caller's `gpu` option
 * @throws TypeError when the option is set to anything but "auto", "off" or "require"
 */
export function checkGpuMode(name: string, mode: unknown): void {
    if (mode !== undefined && !GPU_MODES.includes(mode)) {
        // a string quoted, so "require " shows its space; anything else by its value or its type
        const plain = mode === null || typeof mode === "number" || typeof mode === "boolean";
        const shown = plain ? String(mode) : `a value of type ${typeof mode}`;
        const got = typeof mode === "string" ? JSON.stringify(mode) : shown;
        throw new TypeError(`${name}: gpu must be "auto", "off" or "require"; got ${got}`);
    }
}

/** Which implementation ran, and why the CPU when it was the CPU. */
export interface Backend {
    readonly ran: "gpu" | "cpu";
    /** Why the CPU ran; null when the GPU ran. */
    readonly reason: string | null;
    /** The GPU device, when one was acquired (also when the options kept the work on the CPU). */
    readonly device: string | null;
}

/** Options of `configureWebGpu`, for every core. */
export interface WebGpuOptions {
    /**
     * Accept a software adapter (llvmpipe, SwiftShader, WARP). Default false: a software adapter is usually slower
     * than the CPU implementation, so the CPU runs and the result says why.
     */
    readonly acceptSoftware?: boolean;
    /** Node only: a substring of the Dawn adapter name to pick ("llvmpipe", "4070"). Ignored in a browser. */
    readonly adapter?: string;
}

/**
 * Graphs with at least this many nodes are where the GPU is expected to pay off. One of them running on the CPU for
 * a reason the user could fix logs a one-time console warning; smaller graphs never do.
 */
export const GPU_SIZE_FLOOR = 5_000;

/** A core's GPU decision: an acquired device, or the reason there is none. */
interface Decision {
    readonly gpu: AcquiredGpu | null;
    readonly reason: string | null;
    /** When the CPU was chosen for a reason the user could fix: the fix. */
    readonly fix?: string | null;
}

interface CoreGpu {
    decision: Promise<Decision> | null;
    /** The provider the decision came from; a newly registered provider decides again. */
    by: GpuProvider | null;
    destroyed: boolean;
}

/** A provider, or the reason (and fix) there is none. */
type Source = GpuProvider | { readonly reason: string; readonly fix: string | null };

let options: WebGpuOptions = {};
/** Set by tests in place of the platform's provider; null disables WebGPU, undefined restores the platform's. */
let override: GpuProvider | null | undefined;
/** The provider being loaded or loaded, for the current options. */
let loading: Promise<Source> | null = null;
/** The same, once settled, so a run that cannot use the GPU can stay synchronous. */
let loaded: Source | null = null;
let warned = false;
const cores = new WeakMap<Core, CoreGpu>();

/**
 * Sets the WebGPU options of every core. Each core disposes its device and decides again on its next call.
 * @param o - see WebGpuOptions
 */
export function configureWebGpu(o: WebGpuOptions = {}): void {
    options = { ...o };
    loading = null;
    loaded = null;
    warned = false;
}

/**
 * Test seam: replaces the platform's provider.
 * @param p - the provider; null disables WebGPU; undefined restores the platform's provider
 */
export function registerGpuProvider(p: GpuProvider | null | undefined): void {
    configureWebGpu(options);
    override = p;
}

/**
 * Why this runtime certainly has no WebGPU, without loading anything.
 * @returns the reason, or null when it has WebGPU or might (Node, with the optional `webgpu` package)
 */
function noWebGpu(): string | null {
    const nav = (globalThis as { navigator?: { gpu?: unknown } }).navigator;
    if (nav?.gpu !== undefined && nav.gpu !== null) {
        return null;
    }
    const proc = (globalThis as { process?: { versions?: { node?: string } } }).process;
    return proc?.versions?.node === undefined ? "this runtime has no WebGPU (navigator.gpu is undefined)" : null;
}

/**
 * The provider, loading the GPU package on first use.
 * @returns the provider, or why there is none
 */
function source(): Promise<Source> {
    if (loading === null) {
        const none = noWebGpu();
        if (override !== undefined || none !== null) {
            // known without loading anything, so known synchronously
            loaded = override ?? { reason: none ?? "WebGPU was disabled", fix: null };
            loading = Promise.resolve(loaded);
        } else {
            const p: Promise<Source> = loadPart(
                import("#gpu-platform"),
                "an ...Async method or a simulation layout",
            ).then(
                (m) => m.gpuProvider(options),
                (e: unknown) => ({
                    reason: `@graphty/webgpu-graph-algorithms did not load: ${messageOf(e)}`,
                    fix: "check that @graphty/webgpu-graph-algorithms is installed and that your bundler serves its chunk",
                }),
            );
            loading = p;
            void p.then((s) => {
                if (loading === p) {
                    loaded = s;
                }
            });
        }
    }
    return loading;
}

/**
 * Whether a source is a provider.
 * @param s - the source
 * @returns true for a provider
 */
function isProvider(s: Source): s is GpuProvider {
    return "acquire" in s;
}

/**
 * The message of a thrown value.
 * @param e - what was thrown
 * @returns its message
 */
function messageOf(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

/**
 * Disposes a decision's device once the decision settles. A decision that failed holds no device, and its error
 * already reached the caller that awaited it.
 * @param decision - the decision, or null when there is none
 */
function disposeWhenDecided(decision: Promise<Decision> | null): void {
    decision?.then(
        (d) => d.gpu?.accelerator.dispose(),
        () => undefined,
    );
}

/**
 * The per-core state; the first call subscribes to the core's destroy event.
 * @param cy - the core
 * @returns its state
 */
function coreGpu(cy: Core): CoreGpu {
    let g = cores.get(cy);
    if (g === undefined) {
        const created: CoreGpu = { decision: null, by: null, destroyed: false };
        cy.one("destroy", () => {
            created.destroyed = true;
            disposeWhenDecided(created.decision);
            created.decision = null;
        });
        cores.set(cy, created);
        g = created;
    }
    return g;
}

/**
 * Acquires a device for a core: probe, construct, verify; wires loss, snapshot release and destroy.
 * @param cy - the core
 * @param g - its state
 * @param p - the provider
 * @returns the decision
 */
async function decide(cy: Core, g: CoreGpu, p: GpuProvider): Promise<Decision> {
    let gpu: AcquiredGpu;
    try {
        gpu = await p.acquire();
    } catch (e) {
        // Up-front detection: nothing has run yet, so the CPU is the honest answer, with the reason
        const fix = e instanceof GpuUnavailableError ? e.fix : null;
        return { gpu: null, reason: `no usable WebGPU device: ${messageOf(e)}`, fix };
    }
    if (g.destroyed) {
        gpu.accelerator.dispose();
        return { gpu: null, reason: "the core was destroyed" };
    }
    const unsubscribe = onSnapshotsDropped(cy, (dropped) => {
        for (const s of dropped) {
            gpu.accelerator.release(s);
        }
    });
    const self = g.decision;
    void gpu.lost.then(() => {
        unsubscribe();
        // The next call acquires a new device. A device the core's own destroy disposed also resolves `lost`, and
        // a decision already replaced is left alone.
        if (g.decision === self) {
            g.decision = null;
        }
    });
    return { gpu, reason: null };
}

/**
 * Why a run in this mode takes the CPU without asking for a device, so it can stay synchronous.
 * @param mode - the caller's mode
 * @returns the decision when it is already known to be the CPU, or null when a device has to be asked for
 */
export function cpuWithoutAsking(mode: GpuMode = "auto"): Decision | null {
    if (mode === "off") {
        return { gpu: null, reason: 'gpu: "off" was requested', fix: null };
    }
    if (override === null) {
        return { gpu: null, reason: "WebGPU was disabled", fix: null };
    }
    if (loading === null && override === undefined) {
        const none = noWebGpu();
        if (none !== null) {
            return { gpu: null, reason: none, fix: null };
        }
    }
    return loaded === null || isProvider(loaded) ? null : { gpu: null, ...loaded };
}

/**
 * The core's device, acquiring one on first use and again after a loss. One device per core, reused by every call.
 * The first call in the process loads @graphty/webgpu-graph-algorithms.
 * @param cy - the core
 * @param mode - the caller's mode
 * @returns the device (null for the CPU) and the reason when null
 * @throws Error under "require" when no device is available, and when the core was destroyed
 */
export async function gpuFor(cy: Core, mode: GpuMode = "auto"): Promise<Decision> {
    let d: Decision | null = cpuWithoutAsking(mode);
    if (d === null) {
        // subscribed to the core's destroy before the first await, so a destroy during the wait is seen
        const g = coreGpu(cy);
        const pending = source();
        const src = loaded ?? (await pending);
        if (!isProvider(src)) {
            d = { gpu: null, ...src };
        } else {
            if (g.destroyed) {
                throw new Error("graphty: the Cytoscape core was destroyed");
            }
            if (g.decision === null || g.by !== src) {
                disposeWhenDecided(g.decision);
                // deferred one tick so decide() sees its own promise in g.decision
                g.decision = Promise.resolve().then(() => decide(cy, g, src));
                g.by = src;
            }
            d = await g.decision;
        }
    }
    if (mode === "require" && d.gpu === null) {
        throw new Error(`graphty: gpu: "require" but ${d.reason ?? "no device"}`);
    }
    return d;
}

/**
 * Warns once per configuration when a graph at or above GPU_SIZE_FLOOR runs on the CPU for a reason the user could
 * fix. Small graphs, gpu: "off" and reasons nobody can fix stay quiet.
 * @param d - the decision the run started with
 * @param nodeCount - the graph's node count
 */
export function warnIfFixable(d: Decision, nodeCount: number): void {
    if (warned || d.gpu !== null || d.fix === undefined || d.fix === null || nodeCount < GPU_SIZE_FLOOR) {
        return;
    }
    warned = true;
    console.warn(
        `graphty: a ${nodeCount.toLocaleString("en-US")}-node graph ran on the CPU because ${d.reason ?? "no GPU"}. ` +
            `To use the GPU: ${d.fix}. Pass gpu: "off" to run on the CPU without this warning.`,
    );
}

/**
 * An accelerator that records whether any of its methods was called, so the run can report which implementation
 * answered. The CPU packages' dispatchers choose the CPU silently when the options or the graph need it.
 * @param acc - the accelerator
 * @returns the recording accelerator and the flag reader
 */
export function recording<T extends object>(acc: T): { accelerator: T; used(): boolean } {
    let used = false;
    const accelerator = new Proxy(acc, {
        get(target, key, receiver): unknown {
            const v: unknown = Reflect.get(target, key, receiver);
            if (typeof v !== "function" || key === "release" || key === "dispose") {
                return v;
            }
            return (...args: unknown[]): unknown => {
                used = true;
                return (v as (...a: unknown[]) => unknown).apply(target, args);
            };
        },
    });
    return { accelerator, used: () => used };
}

/**
 * The backend report of a finished run.
 * @param d - the decision the run started with
 * @param usedGpu - whether the dispatcher called the accelerator
 * @param why - the reason the dispatcher kept the work on the CPU, when it did
 * @returns the report
 */
export function backendOf(d: Decision, usedGpu: boolean, why: string): Backend {
    if (d.gpu === null) {
        return { ran: "cpu", reason: d.reason, device: null };
    }
    return usedGpu
        ? { ran: "gpu", reason: null, device: d.gpu.device }
        : { ran: "cpu", reason: why, device: d.gpu.device };
}
