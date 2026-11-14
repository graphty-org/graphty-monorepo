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
 * ## A GPU that answers, and answers wrongly
 *
 * An adapter being present is not the same as an adapter being right. The software renderer that
 * ships with Windows miscomputes shaders that pass a value across a workgroup barrier, so every
 * multi-workgroup prefix sum -- and the sort, the histogram and the grid layout tier above one --
 * comes back wrong, with plausible numbers and no error anywhere.
 *
 * So the peer's `acquireAccelerator` runs its own self-check -- a real prefix sum of known
 * numbers scanned through the shipped primitive and checked on the host -- before it hands a
 * device over, and before any of the graph goes near it. A wrong word comes back as an
 * `E_DEVICE_INCORRECT` decline, which this file turns into the element's `E_DEVICE_INCORRECT`
 * error; the element then reports acceleration unavailable with that code and draws the graph on
 * the CPU. The peer memoises the result per device, so the 14 to 20 milliseconds are paid once.
 *
 * That is detection, not a fallback: the decision is made before any accelerated work starts.
 * The peer also guards its own compute entry points, so a device that somehow gets past the
 * check still refuses rather than returning wrong numbers -- and the element lets go of it and
 * republishes rather than finishing that work anywhere else. Recorded in
 * `docs/decisions/device-computes-incorrectly.md`.
 *
 * That the ELEMENT reports `E_DEVICE_INCORRECT` on the Windows WARP renderer is inference, by
 * decision, not a test: no lane runs graphty-element on WARP. The host matrix (`hosts.yml`) runs
 * only webgpu-graph-algorithms there, whose own tests show the multi-block scan failing. This
 * file's side -- a failed check becomes `E_DEVICE_INCORRECT` and no accelerator is built -- is
 * pinned against a stubbed peer. Adding an
 * element job to the Windows lane is a CI cost that can be taken on later if the two halves ever
 * disagree.
 *
 * ## Detection is not a fallback
 *
 * Finding out, before anything runs, that this host has no WebGPU and letting the element take
 * the CPU path is correct and required. That is what this file does: the probe decides, once,
 * up front. What it must never do -- and what nothing in the element does -- is catch a failure
 * from a GPU run that had already started and quietly finish the work on the CPU. A failure
 * there is a real failure and is reported as one.
 */

import type { GpuAccelerator } from "@graphty/webgpu-graph-algorithms";
import type { AcceleratorDeclined } from "@graphty/webgpu-graph-algorithms/browser";

import {
    type AcceleratorExactMaxNodes,
    type AcceleratorFactoryOptions,
    type GraphAccelerator,
    registerAccelerator,
} from "./src/acceleration";
import { GraphtyError } from "./src/errors";

/**
 * The peer, loaded on first use rather than with this entry point (issue #6389): importing this
 * file registers the accelerator, and the peer's 1 MB of kernels arrives while the first frame is
 * being set up instead of before it. Both modules are fetched at most once.
 */
let peer:
    | Promise<
          [typeof import("@graphty/webgpu-graph-algorithms"), typeof import("@graphty/webgpu-graph-algorithms/browser")]
      >
    | undefined;

/**
 * Loads the peer's root and browser entry points, once.
 * @returns Both modules.
 */
function loadPeer(): NonNullable<typeof peer> {
    peer ??= Promise.all([
        import("@graphty/webgpu-graph-algorithms"),
        import("@graphty/webgpu-graph-algorithms/browser"),
    ]);
    return peer;
}

/** The name the WebGPU accelerator is registered and reported under. */
const WEBGPU_ACCELERATOR_NAME = "webgpu-graph-algorithms";

/**
 * Members of the peer's accelerator that do not cross into {@link GraphAccelerator}.
 *
 * `ctx` and `options` carry GPU types and stay on this side of the boundary; `kind` is spelled
 * `backend` here; `dispose` is written below so the element controls the lifetime. Everything
 * else -- every accelerated algorithm and layout the peer implements, now and in every future
 * minor of it -- is forwarded by name, which is what keeps this file from needing an edit each
 * time the peer ports another algorithm.
 *
 * `calibrate` and `exactMaxNodes` are written below too, so the element's measurement stays the
 * one that re-tunes this accelerator. `verify` is named although the peer has no such member today: the device was already checked
 * when it was acquired, and a future peer member of that name must not become a second check
 * that reports something other than `E_DEVICE_INCORRECT`.
 */
const NOT_FORWARDED = new Set(["kind", "ctx", "options", "dispose", "verify", "calibrate", "exactMaxNodes"]);

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
 * The sizes `calibrateLayout` probes. Every one is at or below the peer's own `EXACT_MAX_NODES`
 * (32,768), so a measured ceiling never exceeds what the factory accepts, and the small rungs
 * find the crossover a desktop card has between 1k and 4k nodes. The peer's default probe starts
 * at 8k, which is above that crossover on every card measured so far.
 */
const CALIBRATE_SIZES: readonly number[] = [1024, 2048, 4096, 8192, 16_384, 32_768];

/**
 * The exact-tier ceiling measured on each device this page has calibrated, keyed by
 * {@link deviceKey}. Kept for the page's lifetime only: a new accelerator on the same device (a
 * second element, or the one built after a device loss) starts with the measured value instead
 * of measuring again.
 */
const measuredExactMaxNodes = new Map<string, number>();

/**
 * The key a device's calibration is cached under.
 * @param accelerator - The peer's accelerator.
 * @returns The adapter's vendor, architecture, device and description, joined.
 */
function deviceKey(accelerator: GpuAccelerator): string {
    const { vendor, architecture, device, description } = accelerator.ctx.caps;
    return [vendor, architecture, device, description].join("|");
}

/**
 * Builds a peer accelerator on the same context with a different exact-tier ceiling. Cheap: the
 * peer's accelerator is a record of closures over the context, and simulations already running
 * keep the tuning they were created with.
 * @param peerModule - The peer's root module.
 * @param accelerator - The accelerator to copy the options of.
 * @param exactMaxNodes - The new ceiling.
 * @returns The new accelerator.
 */
function retuned(
    peerModule: typeof import("@graphty/webgpu-graph-algorithms"),
    accelerator: GpuAccelerator,
    exactMaxNodes: number,
): GpuAccelerator {
    const { options } = accelerator;
    return peerModule.createAccelerator(accelerator.ctx, {
        ...options,
        layout: { ...options.layout, exactMaxNodes },
    });
}

/**
 * Wraps the peer's accelerator as the element's, keeping every GPU type on this side.
 * @param peerModule - The peer's root module, for `calibrateLayout` and `createAccelerator`.
 * @param accelerator - The peer's accelerator, already checked against its device.
 * @param tuning - The exact-tier ceiling it was built with, and where that number came from.
 * @param release - Releases the device; the element calls it through `dispose`.
 * @returns The accelerator the element attaches.
 */
function toGraphAccelerator(
    peerModule: typeof import("@graphty/webgpu-graph-algorithms"),
    accelerator: GpuAccelerator,
    tuning: AcceleratorExactMaxNodes,
    release: () => void,
): GraphAccelerator {
    const { ctx } = accelerator;
    const { caps } = ctx;
    let exactMaxNodes = tuning;
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
        get exactMaxNodes(): AcceleratorExactMaxNodes {
            return exactMaxNodes;
        },
        // Measures this device and, unless the ceiling was configured, re-tunes the layouts built
        // from now on. A failure (a lost or disposed device) rejects and changes nothing.
        calibrate: async (): Promise<void> => {
            const calibration = await peerModule.calibrateLayout(ctx, { sizes: CALIBRATE_SIZES });
            const measured = Math.min(calibration.suggestedExactMaxNodes, peerModule.EXACT_MAX_NODES);
            measuredExactMaxNodes.set(deviceKey(accelerator), measured);
            if (exactMaxNodes.basis === "configured") {
                return;
            }

            forwardMembers(retuned(peerModule, accelerator, measured), wrapped);
            exactMaxNodes = { value: measured, basis: "measured" };
        },
    };

    forwardMembers(accelerator, wrapped);
    return wrapped;
}

/**
 * Acquires a checked WebGPU accelerator, or says why there is none.
 *
 * Declining is up-front detection: no work has started, and the element runs the CPU path
 * having reported the reason. It is never a fallback from a run that had already begun. The
 * element's controller owns when to ask and what to do after a device loss, so each call here
 * is one acquisition.
 * @param options - The ceiling the element will ask this accelerator to respect.
 * @returns The accelerator.
 * @throws A `GraphtyError` carrying `E_NO_WEBGPU`, `E_NO_ADAPTER`, `E_SOFTWARE_ONLY`,
 * `E_DEVICE_INCORRECT` or `E_TOO_LARGE`, which the element publishes on
 * `capabilities.acceleration`.
 */
async function createWebGpuAccelerator(options?: AcceleratorFactoryOptions): Promise<GraphAccelerator | null> {
    const [peerModule, { acquireAccelerator }] = await loadPeer();
    const { EXACT_MAX_NODES } = peerModule;
    const { exactMaxNodes } = options ?? {};
    if (exactMaxNodes !== undefined && exactMaxNodes > EXACT_MAX_NODES) {
        throw new GraphtyError({
            code: "E_TOO_LARGE",
            message: `the WebGPU accelerator computes exactly up to ${String(EXACT_MAX_NODES)} nodes, not ${String(exactMaxNodes)}`,
            source: "acceleration",
            details: { accelerator: WEBGPU_ACCELERATOR_NAME, exactMaxNodes, limit: EXACT_MAX_NODES },
        });
    }

    const gpu = acquireAccelerator({
        acceptSoftware: options?.acceptSoftware ?? false,
        accelerator: exactMaxNodes === undefined ? undefined : { layout: { exactMaxNodes } },
        ...(options?.device === undefined ? {} : { device: options.device as GPUDevice }),
    });
    const result = await gpu.current();
    if (!result.ok) {
        throw declineFailure(result);
    }

    let { accelerator } = result;
    let tuning: AcceleratorExactMaxNodes = { value: EXACT_MAX_NODES, basis: "default" };
    if (exactMaxNodes !== undefined) {
        tuning = { value: exactMaxNodes, basis: "configured" };
    } else {
        const measured = measuredExactMaxNodes.get(deviceKey(accelerator));
        if (measured !== undefined) {
            accelerator = retuned(peerModule, accelerator, measured);
            tuning = { value: measured, basis: "measured" };
        }
    }

    return toGraphAccelerator(peerModule, accelerator, tuning, () => {
        gpu.dispose();
    });
}

registerAccelerator({
    name: WEBGPU_ACCELERATOR_NAME,
    backend: "webgpu",
    factory: createWebGpuAccelerator,
    // A software adapter draws a frame slower with the layout on the same device than beside it.
    sharesDevice: async (adapter) => {
        const [, { summarizeAdapter }] = await loadPeer();
        return !summarizeAdapter(adapter as GPUAdapter).software;
    },
});
