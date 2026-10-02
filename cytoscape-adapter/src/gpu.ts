/**
 * WebGPU acceleration: detection, device acquisition, reuse, device-loss recovery and disposal, per Cytoscape core.
 *
 * This module never imports @graphty/webgpu-graph-algorithms. The "@graphty/cytoscape/webgpu" entry imports it and
 * registers a provider here, so a consumer who never imports that entry never resolves the optional peer and their
 * build works without it. Without a provider every method runs on the CPU and says so.
 *
 * The rule the whole module follows: the GPU-or-CPU decision is made once, up front, before any work starts.
 * A failure of work that already started on the GPU (a lost device, an out-of-memory) is thrown to the caller,
 * never finished quietly on the CPU. The next call acquires a fresh device.
 */

import type { AlgorithmAccelerator } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import type { LayoutAccelerator } from "@graphty/layout";
import type { Core } from "cytoscape";

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

    /**
     * Creates the error.
     * @param code - the reason code
     * @param message - the reason in words
     */
    constructor(code: string, message: string) {
        super(message);
        this.name = "GpuUnavailableError";
        this.code = code;
    }
}

/** What "@graphty/cytoscape/webgpu" registers: probe, construct and verify a device, or throw GpuUnavailableError. */
export interface GpuProvider {
    acquire(): Promise<AcquiredGpu>;
}

/**
 * Per call: "auto" (default) uses the GPU when one is available and runs the CPU otherwise; "off" always runs the CPU;
 * "require" throws when no GPU is available instead of running the CPU.
 */
export type GpuMode = "auto" | "off" | "require";

/** Which implementation ran, and why the CPU when it was the CPU. */
export interface Backend {
    readonly ran: "gpu" | "cpu";
    /** Why the CPU ran; null when the GPU ran. */
    readonly reason: string | null;
    /** The GPU device, when one was acquired (also when the options kept the work on the CPU). */
    readonly device: string | null;
}

/** A core's GPU decision: an acquired device, or the reason there is none. */
interface Decision {
    readonly gpu: AcquiredGpu | null;
    readonly reason: string | null;
}

interface CoreGpu {
    decision: Promise<Decision> | null;
    /** The provider the decision came from; a newly registered provider decides again. */
    by: GpuProvider | null;
    destroyed: boolean;
}

let provider: GpuProvider | null = null;
const cores = new WeakMap<Core, CoreGpu>();

const NOT_ENABLED = 'WebGPU is not enabled: import "@graphty/cytoscape/webgpu" to use it';

/**
 * Registers the provider "@graphty/cytoscape/webgpu" builds; each core disposes its device and decides again on
 * its next call.
 * @param p - the provider, or null to disable WebGPU
 */
export function registerGpuProvider(p: GpuProvider | null): void {
    provider = p;
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
            void created.decision?.then((d) => d.gpu?.accelerator.dispose());
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
        return { gpu: null, reason: `no usable WebGPU device: ${messageOf(e)}` };
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
 * @returns the reason, or null when a device has to be asked for
 */
export function cpuWithoutAsking(mode: GpuMode = "auto"): string | null {
    if (mode === "off") {
        return 'gpu: "off" was requested';
    }
    return provider === null ? NOT_ENABLED : null;
}

/**
 * The core's device, acquiring one on first use and again after a loss. One device per core, reused by every call.
 * @param cy - the core
 * @param mode - the caller's mode
 * @returns the device (null for the CPU) and the reason when null
 * @throws Error under "require" when no device is available, and when the core was destroyed
 */
export async function gpuFor(cy: Core, mode: GpuMode = "auto"): Promise<Decision> {
    const reason = cpuWithoutAsking(mode);
    let d: Decision = { gpu: null, reason };
    if (provider !== null && reason === null) {
        const g = coreGpu(cy);
        if (g.destroyed) {
            throw new Error("graphty: the Cytoscape core was destroyed");
        }
        const p = provider;
        if (g.decision === null || g.by !== p) {
            void g.decision?.then((old) => old.gpu?.accelerator.dispose());
            // deferred one tick so decide() sees its own promise in g.decision
            g.decision = Promise.resolve().then(() => decide(cy, g, p));
            g.by = p;
        }
        d = await g.decision;
    }
    if (mode === "require" && d.gpu === null) {
        throw new Error(`graphty: gpu: "require" but ${d.reason ?? "no device"}`);
    }
    return d;
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
