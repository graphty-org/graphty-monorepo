import type { WebXRDefaultExperienceOptions } from "@babylonjs/core";
import type { Camera } from "@babylonjs/core/Cameras/camera.js";
import type { Scene } from "@babylonjs/core/scene.js";
import type { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience.js";

import { GraphtyError } from "../errors/GraphtyError";
import { GraphtyLogger, type Logger } from "../logging";
import { laserOnRows } from "./laserOnRows";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "xr", "session"]);

export type XRReferenceSpaceType = "local" | "local-floor" | "bounded-floor" | "unbounded";

/**
 * The reference space a session runs in: the configured type, or the first of its fallbacks the
 * device granted. `"viewer"` is the last resort, when the device refused every other type.
 */
export type XRGrantedReferenceSpaceType = XRReferenceSpaceType | "viewer";

/** Why an XR session ended: the element left it (`"exit"`), or the device or browser ended it. */
export type XRSessionEndCause = "exit" | "device";

/**
 * The reference spaces tried, in order, for a configured type: the type itself, then
 * `local-floor`, then `local` (which every immersive session supports). A device that refuses all of them gets Babylon's `viewer` space.
 * @param requested - The configured reference space type
 * @returns The types to try, first to last, without repeats
 */
export function referenceSpaceFallbacks(requested: XRReferenceSpaceType): XRReferenceSpaceType[] {
    return requested === "local" ? ["local"] : [...new Set<XRReferenceSpaceType>([requested, "local-floor", "local"])];
}

interface XRSessionConfig {
    vr: {
        enabled: boolean;
        referenceSpaceType: XRReferenceSpaceType;
        optionalFeatures?: string[];
    };
    ar: {
        enabled: boolean;
        referenceSpaceType: XRReferenceSpaceType;
        optionalFeatures?: string[];
    };
    /** Whether XR sessions track hands (`xr.input.handTracking`). Defaults to true. */
    handTracking?: boolean;
    /** Whether hands and controllers touch and grab up close (`xr.input.nearInteraction`). Defaults to true. */
    nearInteraction?: boolean;
    /** Called once when a session the manager started ends, however it ended. */
    onSessionEnded?: (ended: { mode: "immersive-vr" | "immersive-ar"; cause: XRSessionEndCause }) => void;
}

/**
 * Babylon XR helper options that keep an XR session off the network. Left at Babylon's defaults,
 * entering XR downloads a controller profile list (immersive-web.github.io), rigged hand meshes
 * and their shader (assets.babylonjs.com) and the near-interaction orb material
 * (snippet.babylonjs.com), which breaks on an offline, intranet or CSP-restricted page.
 *
 * - Controllers use the motion controller classes built into Babylon instead of the online
 *   profile repository, and draw no model: Babylon's built-in classes download their models
 *   from controllers.babylonjs.com. The controllers still track, point and select.
 * - Hands draw as Babylon's tracked joint spheres. The rigged hand meshes are glTF files, and
 *   graphty-element ships no glTF loader, so they never loaded even online: the joint spheres are
 *   what a headset showed before this change too.
 * - The orb material ships with the element. It is Babylon's node material snippet 8RUNKL#3,
 *   the one WebXRNearInteraction loads by default, saved as JSON.
 */
const OFFLINE_XR_OPTIONS = {
    // The element draws its own XR controls (opt-in, `xr.ui.enabled`); Babylon's enter/exit
    // button would otherwise stay on the canvas after the first session request.
    disableDefaultUI: true,
    inputOptions: { disableOnlineControllerRepository: true, doNotLoadControllerMeshes: true },
    handSupportOptions: {
        jointMeshes: { enablePhysics: false },
        handMeshes: { disableDefaultMeshes: true },
    },
    nearInteractionOptions: {
        motionControllerTouchMaterialSnippetUrl: new URL("./assets/touch-orb-material.json", import.meta.url).href,
    },
} satisfies Partial<WebXRDefaultExperienceOptions>;

/**
 * Manages WebXR session lifecycle for VR and AR modes.
 * Handles session initialization, camera management, and cleanup.
 */
export class XRSessionManager {
    private readonly scene: Scene;
    private _config: XRSessionConfig;
    private xrHelper: WebXRDefaultExperience | null = null;
    private activeMode: "immersive-vr" | "immersive-ar" | null = null;
    private referenceSpaceType: XRGrantedReferenceSpaceType | null = null;
    private exiting = false;

    /**
     * Creates a new XRSessionManager instance
     * @param scene - The Babylon.js scene for XR rendering
     * @param config - XR session configuration
     */
    constructor(scene: Scene, config: XRSessionConfig) {
        this.scene = scene;
        this._config = config;
        logger.debug("Created", { vr: config.vr, ar: config.ar });
    }

    /**
     * Replace the configuration. A running session keeps going: the new settings apply from the
     * next session started.
     * @param config - XR session configuration
     */
    public configure(config: XRSessionConfig): void {
        this._config = config;
    }

    /**
     * Check if WebXR is supported in the current browser
     * @returns True if WebXR API is available
     */
    public isXRSupported(): boolean {
        const hasNavigator = typeof navigator !== "undefined";
        const hasXR = hasNavigator && !!navigator.xr;
        const hasWindow = typeof window !== "undefined";
        const isSecureContext = hasWindow && window.isSecureContext;

        logger.debug("XR detection", {
            hasNavigator,
            hasXR,
            isSecureContext,
            userAgent: hasNavigator ? navigator.userAgent : "N/A",
        });

        return hasXR;
    }

    /**
     * Check if VR sessions are supported on this device
     * @returns Promise resolving to true if VR is supported
     */
    public async isVRSupported(): Promise<boolean> {
        return this.isSessionSupported("immersive-vr");
    }

    /**
     * Check if AR sessions are supported on this device
     * @returns Promise resolving to true if AR is supported
     */
    public async isARSupported(): Promise<boolean> {
        return this.isSessionSupported("immersive-ar");
    }

    /**
     * Ask the browser whether it supports a session mode.
     * @param mode - The session mode
     * @returns True when it does; false without WebXR or when the browser fails to answer
     */
    private async isSessionSupported(mode: XRSessionMode): Promise<boolean> {
        const xr = this.isXRSupported() ? navigator.xr : undefined;
        if (!xr) {
            return false;
        }

        try {
            return await xr.isSessionSupported(mode);
        } catch (error) {
            logger.warn("Could not ask the browser whether it supports the mode", { mode, error });
            return false;
        }
    }

    /**
     * Enter VR mode and optionally transfer camera position from a previous camera
     * @param previousCamera - Optional camera to copy position from
     * @returns Promise that resolves when VR session is active
     * @throws A `GraphtyError`: `E_UNSUPPORTED` without WebXR, `E_XR_SESSION_FAILED` when the
     *     session cannot start (see {@link XRSessionManager.enter})
     */
    public async enterVR(previousCamera?: Camera): Promise<void> {
        await this.enter("immersive-vr", previousCamera);
    }

    /**
     * Enter AR mode and optionally transfer camera position from a previous camera
     * @param previousCamera - Optional camera to copy position from
     * @returns Promise that resolves when AR session is active
     * @throws A `GraphtyError`: `E_UNSUPPORTED` without WebXR, `E_XR_SESSION_FAILED` when the
     *     session cannot start (see {@link XRSessionManager.enter})
     */
    public async enterAR(previousCamera?: Camera): Promise<void> {
        await this.enter("immersive-ar", previousCamera);
    }

    /**
     * Build the WebXR experience, start a session in it, and put the XR camera where
     * `previousCamera` stands. When the session cannot start, the experience built for it is
     * disposed, so a failed attempt leaves nothing on the scene and the next one starts clean.
     * @param mode - The session mode
     * @param previousCamera - Optional camera to copy position from
     * @returns Promise that resolves when the session is active
     * @throws A `GraphtyError` with `E_UNSUPPORTED` without WebXR, or with `E_XR_SESSION_FAILED`
     *     (`details.mode`, the browser's error as `cause`) when another session is running or the
     *     browser or headset refuses the session
     */
    private async enter(mode: "immersive-vr" | "immersive-ar", previousCamera?: Camera): Promise<void> {
        const viewMode = mode === "immersive-vr" ? "vr" : "ar";
        if (!this.isXRSupported()) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `${viewMode.toUpperCase()} needs WebXR, and this browser has none.`,
                source: "view",
                details: { mode: viewMode, reason: "no-webxr" },
            });
        }

        if (this.activeMode) {
            throw new GraphtyError({
                code: "E_XR_SESSION_FAILED",
                message: `Cannot enter ${viewMode.toUpperCase()}: an XR session is already running.`,
                source: "view",
                details: { mode: viewMode, reason: "active" },
            });
        }

        let helper: WebXRDefaultExperience | null = null;
        try {
            logger.debug("Creating XR experience", { mode });
            const { WebXRDefaultExperience } = await import("@babylonjs/core/XR/webXRDefaultExperience.js");
            helper = await WebXRDefaultExperience.CreateAsync(this.scene, {
                ...OFFLINE_XR_OPTIONS,
                floorMeshes: [],
                // The session's optional features are the mode's `optionalFeatures`, asked for in
                // enterSession; Babylon reads this option only for its own enter button, which is off.
                disableTeleportation: true,
                // Babylon turns hand tracking on by default; the configuration decides instead.
                disableHandTracking: this._config.handTracking === false,
                disableNearInteraction: this._config.nearInteraction === false,
                ...(mode === "immersive-ar" ? { uiOptions: { sessionMode: mode } } : {}),
            });
            this.xrHelper = helper;

            await this.enterSession(helper, mode, mode === "immersive-vr" ? this._config.vr : this._config.ar);
            logger.debug("Entered XR session", {
                mode,
                features: helper.baseExperience.featuresManager.getEnabledFeatures().join(", "),
            });

            const xrCamera = this.getXRCamera();
            if (previousCamera && xrCamera) {
                xrCamera.position.copyFrom(previousCamera.position);
            }

            this.activeMode = mode;
        } catch (error) {
            logger.warn("Could not enter the XR session", { mode, error });
            this.xrHelper = null;
            this.activeMode = null;
            this.referenceSpaceType = null;
            helper?.dispose();
            throw new GraphtyError({
                code: "E_XR_SESSION_FAILED",
                message: `Cannot enter ${viewMode.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`,
                source: "view",
                recoverable: true,
                details: { mode: viewMode },
                cause: error,
            });
        }
    }

    /**
     * Start the session, in the configured reference space or the first fallback the device grants
     * (see {@link referenceSpaceFallbacks}), with the mode's configured optional features
     * requested, and watch for it to end.
     * @param helper - The XR experience the session runs in
     * @param mode - The session mode
     * @param modeConfig - The mode's configuration
     */
    private async enterSession(
        helper: WebXRDefaultExperience,
        mode: "immersive-vr" | "immersive-ar",
        modeConfig: XRSessionConfig["vr"],
    ): Promise<void> {
        const requested = modeConfig.referenceSpaceType;
        const { baseExperience } = helper;
        const { sessionManager } = baseExperience;
        const candidates = referenceSpaceFallbacks(requested);
        // Babylon asks the session for one type and, refused, falls back to "viewer" without saying
        // so. For the session's first reference space only, try each candidate, and hand Babylon
        // the first one the device grants.
        const setSpace = sessionManager.setReferenceSpaceTypeAsync.bind(sessionManager);
        sessionManager.setReferenceSpaceTypeAsync = async () => {
            sessionManager.setReferenceSpaceTypeAsync = setSpace;
            for (const type of candidates) {
                try {
                    await sessionManager.session.requestReferenceSpace(type);
                } catch {
                    continue;
                }

                this.referenceSpaceType = type;
                return await setSpace(type);
            }

            // Refused everything: Babylon's own fallback, the viewer space lowered to floor height.
            this.referenceSpaceType = "viewer";
            return await setSpace(requested);
        };

        // A fallback is granted only if the session was asked for it; "local" always is.
        const fallbacks = candidates.slice(1).filter((type) => type !== "local");
        const optionalFeatures = [...new Set([...fallbacks, ...(modeConfig.optionalFeatures ?? [])])];
        await baseExperience.enterXRAsync(mode, requested, undefined, { optionalFeatures });
        logger.debug("Reference space", { requested, granted: this.referenceSpaceType });
        const stopLaserOnRows = laserOnRows(this.scene, helper);

        sessionManager.onXRSessionEnded.addOnce(() => {
            stopLaserOnRows();
            const cause: XRSessionEndCause = this.exiting ? "exit" : "device";
            this.activeMode = null;
            this.referenceSpaceType = null;
            if (cause === "device" && this.xrHelper === helper) {
                // Disposed after Babylon's own end handler has restored the render loop, which it
                // does after notifying this observer.
                this.xrHelper = null;
                queueMicrotask(() => {
                    helper.dispose();
                });
            }

            this._config.onSessionEnded?.({ mode, cause });
        });
    }

    /**
     * Exit the current XR session and clean up resources
     * @returns Promise that resolves when session is exited
     */
    public async exitXR(): Promise<void> {
        if (!this.xrHelper) {
            return; // No active session to exit
        }

        this.exiting = true;
        try {
            // A session the headset already ended has nothing left to exit, only to release.
            if (this.activeMode !== null) {
                this.activeMode = null;
                await this.xrHelper.baseExperience.exitXRAsync();
            }

            this.xrHelper.dispose();
            this.xrHelper = null;
            this.activeMode = null;
            this.referenceSpaceType = null;
        } catch (error) {
            // Clean up even if exit fails
            this.xrHelper = null;
            this.activeMode = null;
            this.referenceSpaceType = null;
            throw GraphtyError.wrap(error, { code: "E_INTERNAL", message: "Failed to exit XR mode", source: "view" });
        } finally {
            this.exiting = false;
        }
    }

    /**
     * Get the active XR camera
     * @returns The XR camera or null if no session is active
     */
    public getXRCamera(): Camera | null {
        return this.xrHelper?.baseExperience.camera ?? null;
    }

    /**
     * Get the WebXR helper instance for advanced XR features
     * @returns The WebXR helper or null if no session is active
     */
    public getXRHelper(): WebXRDefaultExperience | null {
        return this.xrHelper;
    }

    /**
     * Get the currently active XR mode
     * @returns The active XR mode or null if no session is active
     */
    public getActiveMode(): "immersive-vr" | "immersive-ar" | null {
        return this.activeMode;
    }

    /**
     * The reference space the active session runs in: the configured type, or the fallback the
     * device granted instead (see {@link referenceSpaceFallbacks}).
     * @returns The granted reference space type, or null if no session is active
     */
    public getReferenceSpaceType(): XRGrantedReferenceSpaceType | null {
        return this.referenceSpaceType;
    }

    /**
     * Cleanup all XR resources
     */
    public dispose(): void {
        if (this.xrHelper) {
            this.xrHelper.dispose();
            this.xrHelper = null;
        }

        this.activeMode = null;
        this.referenceSpaceType = null;
    }
}
