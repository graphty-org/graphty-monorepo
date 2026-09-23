/**
 * @file `@graphty/graphty-element/webgpu`: the entire WebGPU integration, as one import.
 *
 * ```js
 * import "@graphty/graphty-element";
 * import "@graphty/graphty-element/webgpu";   // this is all of it
 * ```
 *
 * Importing this module registers a WebGPU accelerator factory with the element and does
 * nothing else. After that line the element probes for an adapter, requests a context, builds
 * the accelerator, attaches it, watches for device loss, applies the `acceleration.minNodes`
 * threshold and publishes what it found. A software adapter is refused under `auto` and
 * accepted under `required` (`acceptSoftware`). A consumer writes no probe, no construction, no
 * injection and no device-loss code, because every one of those would be the same code in every
 * application that wanted a GPU.
 *
 * `@graphty/webgpu-graph-algorithms` is an OPTIONAL peer dependency, and this file is the only
 * one in the package that imports it. A consumer who never imports this entry point never
 * resolves the peer, so their build succeeds with the package absent and with no bundler
 * configuration. That is why activation is a separate entry point rather than a dynamic import
 * from the core: module resolution in a bundled application happens at build time, so an import
 * inside the core would break the build of everyone who did not install the peer.
 *
 * Nothing here leaks a GPU type into the element's published API. `GpuContext`, `ProbeResult`
 * and the rest stay on this side of the boundary; what crosses is a {@link GraphAccelerator},
 * which is plain names and functions, and failures arrive as codes on a `GraphtyError`.
 *
 * ## Detection is not a fallback
 *
 * Finding out, before anything runs, that this host has no WebGPU and letting the element take
 * the CPU path is correct and required. That is what this file does: the probe decides, once,
 * up front. What it must never do -- and what nothing in the element does -- is catch a failure
 * from a GPU run that had already started and quietly finish the work on the CPU. A failure
 * there is a real failure and is reported as one.
 */

import {
    createAccelerator,
    EXACT_MAX_NODES,
    type GpuAccelerator,
    type GpuContext,
} from "@graphty/webgpu-graph-algorithms";
import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

import { type AcceleratorFactoryOptions, type GraphAccelerator, registerAccelerator } from "./src/acceleration";
import { GraphtyError } from "./src/errors";

/** The name the WebGPU accelerator is registered and reported under. */
const WEBGPU_ACCELERATOR_NAME = "webgpu-graph-algorithms";

/**
 * Members of the peer's accelerator that do not cross into {@link GraphAccelerator}.
 *
 * `ctx` and `options` carry GPU types and stay on this side of the boundary; `kind` is spelled
 * `backend` here; `dispose` is re-implemented below so the element controls the lifetime.
 * Everything else -- every accelerated algorithm and layout the peer implements, now and in
 * every future minor of it -- is forwarded by name, which is what keeps this file from needing
 * an edit each time the peer ports another algorithm.
 */
const NOT_FORWARDED = new Set(["kind", "ctx", "options", "dispose"]);

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
 * Turns a failed probe into the sentence and the code the element publishes.
 * @param code - What the peer's probe reported.
 * @param reason - What the peer's probe said about it, when it said anything.
 * @returns The error the factory throws, which becomes `capabilities.acceleration.reason` and
 * `.code`.
 */
function probeFailure(code: "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY", reason: string | null): GraphtyError {
    const insecure = typeof globalThis.isSecureContext === "boolean" && !globalThis.isSecureContext;
    const messages = {
        E_NO_WEBGPU: insecure ? "WebGPU requires a secure context (https or localhost)" : "this browser has no WebGPU",
        E_NO_ADAPTER: "WebGPU is present but no graphics adapter would answer",
        E_SOFTWARE_ONLY: "the only WebGPU adapter here is a software renderer, which is slower than the CPU path",
    };

    return new GraphtyError({
        code,
        message: messages[code],
        source: "acceleration",
        recoverable: false,
        details:
            reason === null
                ? { accelerator: WEBGPU_ACCELERATOR_NAME }
                : { accelerator: WEBGPU_ACCELERATOR_NAME, probe: reason },
    });
}

/**
 * Wraps the peer's accelerator as the element's, keeping every GPU type on this side.
 * @param ctx - The GPU context the accelerator runs on.
 * @param accelerator - The peer's accelerator.
 * @returns The accelerator the element attaches.
 */
function toGraphAccelerator(ctx: GpuContext, accelerator: GpuAccelerator): GraphAccelerator {
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
        dispose: (): void => {
            accelerator.dispose();
        },
    };

    forwardMembers(accelerator, wrapped);
    return wrapped;
}

/**
 * Probes for WebGPU and builds the accelerator, or says why it could not.
 *
 * Declining is up-front detection: no work has started, and the element runs the CPU path
 * having reported the reason. It is never a fallback from a run that had already begun.
 * @param options - The ceiling the element will ask this accelerator to respect.
 * @returns The accelerator, or null when the peer declined without a reason.
 * @throws A `GraphtyError` carrying `E_NO_WEBGPU`, `E_NO_ADAPTER`, `E_SOFTWARE_ONLY` or
 * `E_TOO_LARGE`, which the element publishes on `capabilities.acceleration`.
 */
async function createWebGpuAccelerator(options?: AcceleratorFactoryOptions): Promise<GraphAccelerator | null> {
    const { exactMaxNodes } = options ?? {};
    if (exactMaxNodes !== undefined && exactMaxNodes > EXACT_MAX_NODES) {
        throw new GraphtyError({
            code: "E_TOO_LARGE",
            message: `the WebGPU accelerator computes exactly up to ${String(EXACT_MAX_NODES)} nodes, not ${String(exactMaxNodes)}`,
            source: "acceleration",
            details: { accelerator: WEBGPU_ACCELERATOR_NAME, exactMaxNodes, limit: EXACT_MAX_NODES },
        });
    }

    const rejectSoftware = !(options?.acceptSoftware ?? false);
    const probe = await probeBrowserWebGpu({ rejectSoftware });
    if (!probe.ok || probe.code !== "OK") {
        throw probeFailure(probe.code === "OK" ? "E_NO_ADAPTER" : probe.code, probe.reason);
    }

    const ctx = await requestGpuContext(
        probe.adapter === null ? { rejectSoftware } : { adapter: probe.adapter, rejectSoftware },
    );

    try {
        return toGraphAccelerator(
            ctx,
            createAccelerator(ctx, exactMaxNodes === undefined ? undefined : { layout: { exactMaxNodes } }),
        );
    } catch (error) {
        // Construction failed after the device was handed over: release it rather than leaking
        // a device nobody holds a reference to, then report the failure. This is still before
        // any work has run.
        ctx.dispose();
        throw GraphtyError.wrap(error, {
            code: "E_INTERNAL",
            source: "acceleration",
            details: { accelerator: WEBGPU_ACCELERATOR_NAME },
        });
    }
}

registerAccelerator({
    name: WEBGPU_ACCELERATOR_NAME,
    backend: "webgpu",
    factory: createWebGpuAccelerator,
});
