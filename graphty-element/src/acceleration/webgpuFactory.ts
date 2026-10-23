/**
 * @file Builds the WebGPU accelerator factory from the optional peer's two modules.
 *
 * The peer, `@graphty/webgpu-graph-algorithms`, is never imported here: its modules arrive as
 * arguments. Two callers hand them over. The root entry point loads them itself the first time
 * a controller probes (`./autoload.ts`), and the explicit `./webgpu` entry point imports them
 * statically. Both build the same factory through {@link createWebGpuFactory}, so the self-check,
 * the software-adapter rule, the ceiling and the device-loss wiring are written once.
 *
 * Only `import type` reaches the peer from this file, and the emitter deletes it, so nothing at
 * run time and nothing in a published signature names the peer.
 *
 * ## A GPU that answers, and answers wrongly
 *
 * An adapter being present is not the same as an adapter being right. The software renderer that
 * ships with Windows miscomputes shaders that pass a value across a workgroup barrier, so every
 * multi-workgroup prefix sum -- and the sort, the histogram and the grid layout tier above one --
 * comes back wrong, with plausible numbers and no error anywhere. So the peer's
 * `acquireAccelerator` runs its own self-check before it hands a device over, and a wrong word
 * comes back as an `E_DEVICE_INCORRECT` decline, which this file turns into the element's
 * `E_DEVICE_INCORRECT` error. Recorded in `docs/decisions/device-computes-incorrectly.md`.
 *
 * ## Detection is not a fallback
 *
 * Finding out, before anything runs, that this host has no WebGPU and letting the element take
 * the CPU path is correct and required. What this file must never do -- and what nothing in the
 * element does -- is catch a failure from a GPU run that had already started and quietly finish
 * the work on the CPU.
 */

import type { GpuAccelerator } from "@graphty/webgpu-graph-algorithms";
import type { AcceleratorDeclined, acquireAccelerator } from "@graphty/webgpu-graph-algorithms/browser";

import { GraphtyError } from "../errors";
import type { AcceleratorFactory, AcceleratorFactoryOptions, GraphAccelerator } from "./types";

/** What the factory needs from the peer's root module. */
export interface WebGpuPeerRoot {
    /** The largest graph the peer computes exactly. */
    readonly EXACT_MAX_NODES: number;
}

/** What the factory needs from the peer's `/browser` module. */
export interface WebGpuPeerBrowser {
    /** Acquires a checked accelerator, or says why there is none. */
    readonly acquireAccelerator: typeof acquireAccelerator;
}

/** The name the WebGPU accelerator is registered and reported under. */
export const WEBGPU_ACCELERATOR_NAME = "webgpu-graph-algorithms";

/**
 * Members of the peer's accelerator that do not cross into {@link GraphAccelerator}.
 *
 * `ctx` and `options` carry GPU types and stay on this side of the boundary; `kind` is spelled
 * `backend` here; `dispose` is written below so the element controls the lifetime. Everything
 * else -- every accelerated algorithm and layout the peer implements, now and in every future
 * minor of it -- is forwarded by name, which is what keeps this file from needing an edit each
 * time the peer ports another algorithm.
 *
 * `verify` is named although the peer has no such member today: the device was already checked
 * when it was acquired, and a future peer member of that name must not become a second check
 * that reports something other than `E_DEVICE_INCORRECT`.
 */
const NOT_FORWARDED = new Set(["kind", "ctx", "options", "dispose", "verify"]);

/** A forwarded member of the peer's accelerator, typed as loosely as the boundary allows. */
type ForwardedMember = (...args: readonly unknown[]) => unknown;

/**
 * Copies the peer accelerator's callable members onto the element's accelerator.
 * @param source - The peer's accelerator.
 * @param target - The record that becomes the element's accelerator.
 */
function forwardMembers(source: GpuAccelerator, target: GraphAccelerator): void {
    for (const [key, value] of Object.entries(source) as readonly [string, unknown][]) {
        if (NOT_FORWARDED.has(key) || typeof value !== "function") {
            continue;
        }

        target[key] = (value as ForwardedMember).bind(source);
    }
}

/**
 * Turns a device that got the peer's self-check wrong into the element's error.
 * @param declined - The peer's `E_DEVICE_INCORRECT` decline.
 * @returns The error the factory throws.
 */
function deviceIncorrect(declined: AcceleratorDeclined): GraphtyError {
    const { check } = declined;
    const mismatch = check?.mismatch ?? null;
    if (check === null || mismatch === null) {
        return new GraphtyError({
            code: "E_DEVICE_INCORRECT",
            message: `this GPU computes incorrectly: ${declined.reason}`,
            source: "acceleration",
            recoverable: false,
            details: { accelerator: WEBGPU_ACCELERATOR_NAME },
        });
    }

    const observed = mismatch.poison
        ? `${mismatch.where} was never written at all`
        : `${mismatch.where} came back as ${String(mismatch.actual)} where ${String(mismatch.expected)} was required`;

    return new GraphtyError({
        code: "E_DEVICE_INCORRECT",
        message:
            `this GPU computes multi-workgroup shaders incorrectly: a prefix sum of ` +
            `${String(check.count)} known numbers came back wrong -- ${observed}. The graph is being ` +
            `computed on the processor instead, because every number this device produced would be unreliable`,
        source: "acceleration",
        recoverable: false,
        details: {
            accelerator: WEBGPU_ACCELERATOR_NAME,
            check: check.check,
            where: mismatch.where,
            expected: mismatch.expected,
            actual: mismatch.actual,
            poison: mismatch.poison,
            count: check.count,
            blocks: check.blocks,
            workgroupSize: check.workgroupSize,
            ms: check.ms,
            adapter: {
                vendor: check.vendor,
                architecture: check.architecture,
                description: check.description,
            },
        },
    });
}

/**
 * Turns the peer's decline into the sentence and the code the element publishes.
 * @param declined - Why the peer handed over no accelerator.
 * @returns The error the factory throws, which becomes `capabilities.acceleration.reason` and
 * `.code`.
 */
function declineFailure(declined: AcceleratorDeclined): GraphtyError {
    if (declined.code === "E_DEVICE_INCORRECT") {
        return deviceIncorrect(declined);
    }

    const insecure = typeof globalThis.isSecureContext === "boolean" && !globalThis.isSecureContext;
    const messages = {
        E_NO_WEBGPU: insecure ? "WebGPU requires a secure context (https or localhost)" : "this browser has no WebGPU",
        E_NO_ADAPTER: "WebGPU is present but no graphics adapter would answer",
        E_SOFTWARE_ONLY: "the only WebGPU adapter here is a software renderer, which is slower than the CPU path",
    };

    return new GraphtyError({
        code: declined.code,
        message: messages[declined.code],
        source: "acceleration",
        recoverable: false,
        details: { accelerator: WEBGPU_ACCELERATOR_NAME, probe: declined.reason },
    });
}

/**
 * Wraps the peer's accelerator as the element's, keeping every GPU type on this side.
 * @param accelerator - The peer's accelerator, already checked against its device.
 * @param release - Releases the device; the element calls it through `dispose`.
 * @returns The accelerator the element attaches.
 */
function toGraphAccelerator(accelerator: GpuAccelerator, release: () => void): GraphAccelerator {
    const { ctx } = accelerator;
    const { caps } = ctx;
    const wrapped: GraphAccelerator = {
        name: WEBGPU_ACCELERATOR_NAME,
        backend: "webgpu",
        device: {
            vendor: caps.vendor,
            architecture: caps.architecture,
            description: caps.description === "" ? caps.device : caps.description,
        },
        // Every GPU kernel in the peer computes in single precision, which is why a run that
        // used one is labelled f32 and the same run on the CPU path is labelled f64.
        precision: "f32",
        // The element watches this. A device the element itself destroyed also resolves it, and
        // the controller ignores a loss reported for an accelerator it has already released.
        lost: ctx.lost.then((info) => ({ reason: info.message === "" ? info.reason : info.message })),
        dispose: release,
    };

    forwardMembers(accelerator, wrapped);
    return wrapped;
}

/**
 * Builds the WebGPU accelerator factory over the peer's modules.
 * @param root - The peer's root module (`@graphty/webgpu-graph-algorithms`).
 * @param browser - The peer's browser module (`@graphty/webgpu-graph-algorithms/browser`).
 * @returns A factory that acquires a checked accelerator, or throws a `GraphtyError` carrying
 * `E_NO_WEBGPU`, `E_NO_ADAPTER`, `E_SOFTWARE_ONLY`, `E_DEVICE_INCORRECT` or `E_TOO_LARGE`.
 */
export function createWebGpuFactory(root: WebGpuPeerRoot, browser: WebGpuPeerBrowser): AcceleratorFactory {
    const { EXACT_MAX_NODES } = root;
    const { acquireAccelerator: acquire } = browser;

    return async (options?: AcceleratorFactoryOptions): Promise<GraphAccelerator | null> => {
        const { exactMaxNodes } = options ?? {};
        if (exactMaxNodes !== undefined && exactMaxNodes > EXACT_MAX_NODES) {
            throw new GraphtyError({
                code: "E_TOO_LARGE",
                message: `the WebGPU accelerator computes exactly up to ${String(EXACT_MAX_NODES)} nodes, not ${String(exactMaxNodes)}`,
                source: "acceleration",
                details: { accelerator: WEBGPU_ACCELERATOR_NAME, exactMaxNodes, limit: EXACT_MAX_NODES },
            });
        }

        const gpu = acquire({
            acceptSoftware: options?.acceptSoftware ?? false,
            accelerator: exactMaxNodes === undefined ? undefined : { layout: { exactMaxNodes } },
        });
        const result = await gpu.current();
        if (!result.ok) {
            throw declineFailure(result);
        }

        return toGraphAccelerator(result.accelerator, () => {
            gpu.dispose();
        });
    };
}
