import type { XrCapability, XrUnavailableReason } from "../acceleration/types";

/** How long the browser gets to say whether it supports a mode before the answer is "no". */
export const XR_PROBE_BOUND_MS = 1500;

/** What the availability reads from the graph it belongs to, live. */
export interface XrAvailabilityInputs {
    /** Whether XR, VR and AR are switched on in the configuration. */
    enabled(): { readonly xr: boolean; readonly vr: boolean; readonly ar: boolean };
    /** Whether the graph draws through WebGPU, which WebXR cannot present. */
    webgpu(): boolean;
    /** The immersive session presenting now. */
    active(): "vr" | "ar" | null;
}

/**
 * The browser's WebXR, when it has one.
 * @returns `navigator.xr`, or undefined.
 */
function webxr(): XRSystem | undefined {
    return typeof navigator === "undefined" ? undefined : navigator.xr;
}

/**
 * Ask the browser whether it supports a mode, answering false when it refuses or takes longer
 * than {@link XR_PROBE_BOUND_MS} (a headless browser can leave the question unanswered).
 *
 * The browser's promise may never settle, and whatever its handlers hold lives as long as it
 * does. They hold only `pending`, which lets go of the caller once the answer or the bound
 * arrives, so an unanswered question never keeps a disposed graph alive.
 * @param xr - The browser's WebXR.
 * @param mode - The session mode.
 * @returns Whether the mode is supported.
 */
function supports(xr: XRSystem, mode: XRSessionMode): Promise<boolean> {
    return new Promise((resolve) => {
        const pending: { settle: ((supported: boolean) => void) | null } = { settle: null };
        const timer = setTimeout(() => {
            pending.settle?.(false);
        }, XR_PROBE_BOUND_MS);
        pending.settle = (supported) => {
            clearTimeout(timer);
            pending.settle = null;
            resolve(supported);
        };
        xr.isSessionSupported(mode).then(
            (supported) => {
                pending.settle?.(supported);
            },
            () => {
                pending.settle?.(false);
            },
        );
    });
}

/**
 * The one answer to "can this graph enter VR or AR, and if not, why": the `xr` member of the
 * session's capability document, which `isVRSupported()` and `isARSupported()` read too.
 *
 * Asking the browser is deferred to {@link probe}, which the graph calls after its first frame and
 * never from a getter, and is asked again when the browser reports a WebXR device change.
 */
export class XrAvailability {
    readonly #inputs: XrAvailabilityInputs;
    readonly #listeners = new Set<() => void>();
    /** What the browser answered, or null until it has. */
    #supported: { vr: boolean; ar: boolean } | null = null;
    #probing: Promise<void> | null = null;
    #capability: XrCapability | null = null;
    #unlisten: (() => void) | null = null;
    #disposed = false;

    /**
     * Listen for WebXR device changes; ask nothing yet.
     * @param inputs - What it reads from its graph.
     */
    constructor(inputs: XrAvailabilityInputs) {
        this.#inputs = inputs;
        const xr = webxr();
        if (xr !== undefined) {
            const onDeviceChange = (): void => {
                this.#probing = null;
                void this.probe();
            };
            xr.addEventListener("devicechange", onDeviceChange);
            this.#unlisten = () => {
                xr.removeEventListener("devicechange", onDeviceChange);
            };
        }
    }

    /**
     * What VR and AR can do now.
     * @returns The current fact; the same object until something changes.
     */
    get capability(): XrCapability {
        this.#capability ??= this.#compute();
        return this.#capability;
    }

    /**
     * Ask the browser which modes it supports. Idempotent; settles within the bound.
     * @returns Settles once the answer is in.
     */
    probe(): Promise<void> {
        this.#probing ??= this.#ask();
        return this.#probing;
    }

    /**
     * Hear every change to {@link capability}.
     * @param listener - Called after each change.
     * @returns Stops listening.
     */
    onChange(listener: () => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    /** Recompute and tell the listeners: entry, exit, a configuration change. */
    changed(): void {
        this.#capability = null;
        for (const listener of this.#listeners) {
            listener();
        }
    }

    /** Stop listening to the browser and to nobody else. */
    dispose(): void {
        this.#disposed = true;
        this.#unlisten?.();
        this.#unlisten = null;
        this.#listeners.clear();
    }

    async #ask(): Promise<void> {
        const xr = webxr();
        if (xr === undefined) {
            return;
        }

        const [vr, ar] = await Promise.all([supports(xr, "immersive-vr"), supports(xr, "immersive-ar")]);
        if (this.#disposed) {
            return;
        }

        this.#supported = { vr, ar };
        this.changed();
    }

    #compute(): XrCapability {
        const enabled = this.#inputs.enabled();
        const reasonFor = (mode: "vr" | "ar"): XrUnavailableReason | null => {
            if (!enabled.xr || !enabled[mode]) {
                return "disabled";
            }

            if (webxr() === undefined) {
                return "isSecureContext" in globalThis && !globalThis.isSecureContext ? "insecure-context" : "no-webxr";
            }

            if (this.#inputs.webgpu()) {
                return "webgpu-renderer";
            }

            if (this.#supported === null) {
                return "probing";
            }

            return this.#supported[mode] ? null : "unsupported";
        };
        const reasons = Object.freeze({ vr: reasonFor("vr"), ar: reasonFor("ar") });
        return Object.freeze({
            vr: reasons.vr === null,
            ar: reasons.ar === null,
            reasons,
            active: this.#inputs.active(),
        });
    }
}
