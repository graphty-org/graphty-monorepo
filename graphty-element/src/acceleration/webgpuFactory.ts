/**
 * @file Builds the WebGPU accelerator factory from the optional peer's two modules.
 *
 * The peer, `@graphty/webgpu-graph-algorithms`, is never imported here: its modules arrive as
 * arguments. Two callers hand them over. The root entry point loads them itself the first time
 * a controller probes (`./autoload.ts`), and the explicit `./webgpu` entry point
 * loads them when it is first asked. Both build the same factory through {@link createWebGpuFactory}, so the self-check,
 * the software-adapter rule, the ceiling and the device-loss wiring are written once. The explicit
 * entry point loads them on first use too (issue #6389).
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

import type { calibrateLayout, createAccelerator, GpuAccelerator } from "@graphty/webgpu-graph-algorithms";
import type {
    AcceleratorDeclined,
    acquireAccelerator,
    summarizeAdapter,
} from "@graphty/webgpu-graph-algorithms/browser";

import { GraphtyError } from "../errors";
import { GraphtyLogger } from "../logging/GraphtyLogger";
import type {
    AcceleratorExactMaxNodes,
    AcceleratorFactory,
    AcceleratorFactoryOptions,
    GraphAccelerator,
} from "./types";

/**
 * The device the accelerator got and each step of its work: adapter, limits, uncaptured errors and
 * the GPU package's trace. Silent unless a consumer turns on the `acceleration` module.
 */
const gpuLog = GraphtyLogger.getLogger(["graphty", "acceleration", "gpu"]);

/** The device limits the GPU kernels plan against, logged as granted. */
const LOGGED_LIMITS = [
    "maxBufferSize",
    "maxStorageBufferBindingSize",
    "maxStorageBuffersPerShaderStage",
    "maxComputeWorkgroupsPerDimension",
    "maxComputeInvocationsPerWorkgroup",
    "maxComputeWorkgroupSizeX",
    "maxComputeWorkgroupStorageSize",
    "maxUniformBufferBindingSize",
] as const;

/**
 * Logs the device an accelerator got, and routes its trace and its uncaptured errors to the log.
 * @param accelerator - The accelerator just acquired.
 * @returns Stops listening; called when the accelerator is released.
 */
function watchDevice(accelerator: GpuAccelerator): () => void {
    const { ctx } = accelerator;
    const { caps, device } = ctx;
    gpuLog.info("device", {
        vendor: caps.vendor,
        architecture: caps.architecture,
        device: caps.device,
        description: caps.description,
        software: caps.software,
        runtime: caps.runtime,
        features: [...caps.features],
        limits: Object.fromEntries(LOGGED_LIMITS.map((name) => [name, caps.limits[name]])),
    });
    ctx.trace = (event, facts): void => {
        gpuLog.info(event, { ...facts });
    };
    const onError = (event: Event): void => {
        const { error } = event as GPUUncapturedErrorEvent;
        gpuLog.error("uncaptured error", undefined, { type: error.constructor.name, message: error.message });
    };
    device.addEventListener("uncapturederror", onError);
    return (): void => {
        ctx.trace = null;
        device.removeEventListener("uncapturederror", onError);
    };
}

/** What the factory needs from the peer's root module. */
export interface WebGpuPeerRoot {
    /** The largest graph the peer computes exactly. */
    readonly EXACT_MAX_NODES: number;
    /** The peer's own version; a peer released before it exported one has none. */
    readonly VERSION?: string;
    /** Times the device's layout tiers; without it (and `createAccelerator`) the device is never measured. */
    readonly calibrateLayout?: typeof calibrateLayout;
    /** Builds an accelerator on a context; used to re-tune one to a measured ceiling. */
    readonly createAccelerator?: typeof createAccelerator;
}

/** What the factory needs from the peer's `/browser` module. */
export interface WebGpuPeerBrowser {
    /** Acquires a checked accelerator, or says why there is none. */
    readonly acquireAccelerator: typeof acquireAccelerator;
    /** Describes an adapter; read to decide whether the accelerator shares the renderer's device. */
    readonly summarizeAdapter?: typeof summarizeAdapter;
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

/** Whether the page asked for the exact-tier ceiling to be measured. Off unless `configureWebGpu` says so. */
let measureExactMaxNodes = false;

/**
 * Turns measuring the exact-tier ceiling on or off for accelerators built from now on, whichever
 * entry point loaded the peer. `configureWebGpu` in `./webgpu` is the public way in.
 * @param measure - Whether to measure.
 */
export function setMeasureExactMaxNodes(measure: boolean): void {
    measureExactMaxNodes = measure;
}

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
 * @param create - The peer's `createAccelerator`.
 * @param accelerator - The accelerator to copy the options of.
 * @param exactMaxNodes - The new ceiling.
 * @returns The new accelerator.
 */
function retuned(create: typeof createAccelerator, accelerator: GpuAccelerator, exactMaxNodes: number): GpuAccelerator {
    const { options } = accelerator;
    return create(accelerator.ctx, { ...options, layout: { ...options.layout, exactMaxNodes } });
}

/**
 * Wraps the peer's accelerator as the element's, keeping every GPU type on this side.
 * @param accelerator - The peer's accelerator, already checked against its device.
 * @param release - Releases the device; the element calls it through `dispose`.
 * @param version - The peer's own version, or undefined for a peer that states none.
 * @param tuning - The exact-tier ceiling it was built with, and where that number came from.
 * @param root - The peer's root module, for `calibrateLayout` and `createAccelerator`.
 * @returns The accelerator the element attaches.
 */
function toGraphAccelerator(
    accelerator: GpuAccelerator,
    release: () => void,
    version: string | undefined,
    tuning: AcceleratorExactMaxNodes,
    root: WebGpuPeerRoot,
): GraphAccelerator {
    const { ctx } = accelerator;
    const { caps } = ctx;
    let exactMaxNodes = tuning;
    const wrapped: GraphAccelerator = {
        name: WEBGPU_ACCELERATOR_NAME,
        backend: "webgpu",
        // A run records the package that computed it; a version the peer does not state is never
        // made up.
        ...(version === undefined ? {} : { package: { name: "@graphty/webgpu-graph-algorithms", version } }),
        device: {
            vendor: caps.vendor,
            architecture: caps.architecture,
            description: caps.description === "" ? caps.device : caps.description,
        },
        // Every GPU kernel in the peer computes in single precision, which is why a run that
        // used one is labeled f32 and the same run on the CPU path is labeled f64.
        precision: "f32",
        // The element watches this. A device the element itself destroyed also resolves it, and
        // the controller ignores a loss reported for an accelerator it has already released.
        lost: ctx.lost.then((info) => ({ reason: info.message === "" ? info.reason : info.message })),
        dispose: release,
        get exactMaxNodes(): AcceleratorExactMaxNodes {
            return exactMaxNodes;
        },
    };

    // Offered only when the page opted in (configureWebGpu) and the ceiling is the shipped one:
    // the element then measures this device after its first accelerated work and re-tunes the
    // layouts built from then on. A failure (a lost or disposed device) rejects and changes nothing.
    // Never on a software adapter: its probes take tens of seconds of processor time, and its
    // speed says nothing a layout could use. The peer's members are read only when measuring, so a
    // peer without them is never asked for them.
    const measuring = measureExactMaxNodes && !caps.software && tuning.basis === "default";
    const calibrateDevice = measuring ? root.calibrateLayout : undefined;
    const create = measuring ? root.createAccelerator : undefined;
    const { EXACT_MAX_NODES } = root;
    if (calibrateDevice !== undefined && create !== undefined) {
        wrapped.calibrate = async (): Promise<void> => {
            const calibration = await calibrateDevice(ctx, { sizes: CALIBRATE_SIZES });
            const measured = Math.min(calibration.suggestedExactMaxNodes, EXACT_MAX_NODES);
            measuredExactMaxNodes.set(deviceKey(accelerator), measured);
            forwardMembers(retuned(create, accelerator, measured), wrapped);
            exactMaxNodes = { value: measured, basis: "measured" };
        };
    }

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
    const { EXACT_MAX_NODES, VERSION } = root;
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
            ...(options?.device === undefined ? {} : { device: options.device as GPUDevice }),
        });
        const result = await gpu.current();
        if (!result.ok) {
            throw declineFailure(result);
        }

        let { accelerator } = result;
        let tuning: AcceleratorExactMaxNodes = { value: EXACT_MAX_NODES, basis: "default" };
        const measured = measureExactMaxNodes ? measuredExactMaxNodes.get(deviceKey(accelerator)) : undefined;
        if (exactMaxNodes !== undefined) {
            tuning = { value: exactMaxNodes, basis: "configured" };
        } else if (measured !== undefined && root.createAccelerator !== undefined) {
            accelerator = retuned(root.createAccelerator, accelerator, measured);
            tuning = { value: measured, basis: "measured" };
        }

        const unwatch = watchDevice(accelerator);
        return toGraphAccelerator(
            accelerator,
            () => {
                unwatch();
                gpu.dispose();
            },
            VERSION,
            tuning,
            root,
        );
    };
}

/**
 * Builds the registration's `sharesDevice` answer over the peer's `/browser` module.
 * @param browser - The peer's browser module.
 * @returns Whether the accelerator should run on the device the renderer opens on an adapter: not
 * on a software adapter, which draws a frame slower with the layout on the same device than beside
 * it. A peer without `summarizeAdapter` says no, and the accelerator finds its own device.
 */
export function createWebGpuSharesDevice(
    browser: Pick<WebGpuPeerBrowser, "summarizeAdapter">,
): (adapter: unknown) => boolean {
    const { summarizeAdapter: summarize } = browser;
    return (adapter) => summarize !== undefined && !summarize(adapter as GPUAdapter).software;
}
