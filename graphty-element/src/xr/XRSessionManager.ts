import type { Camera, Scene, WebXRDefaultExperience } from "@babylonjs/core";

import { GraphtyLogger, type Logger } from "../logging";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "xr", "session"]);

export type XRReferenceSpaceType = "local" | "local-floor" | "bounded-floor" | "unbounded";

export interface XRSessionConfig {
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
}

/**
 * Manages WebXR session lifecycle for VR and AR modes.
 * Handles session initialization, camera management, and cleanup.
 */
export class XRSessionManager {
    private scene: Scene;
    private config: XRSessionConfig;
    private xrHelper: WebXRDefaultExperience | null = null;
    private activeMode: "immersive-vr" | "immersive-ar" | null = null;

    /**
     * Creates a new XRSessionManager instance
     * @param scene - The Babylon.js scene for XR rendering
     * @param config - XR session configuration
     */
    constructor(scene: Scene, config: XRSessionConfig) {
        this.scene = scene;
        this.config = config;
        logger.debug("Created", { vr: config.vr, ar: config.ar });
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
        if (!this.isXRSupported()) {
            return false;
        }

        try {
            // navigator.xr is guaranteed to exist after isXRSupported() check
            const { xr } = navigator;
            if (!xr) {
                return false;
            }

            return await xr.isSessionSupported("immersive-vr");
        } catch (error) {
            console.warn("Failed to check VR support:", error);
            return false;
        }
    }

    /**
     * Check if AR sessions are supported on this device
     * @returns Promise resolving to true if AR is supported
     */
    public async isARSupported(): Promise<boolean> {
        if (!this.isXRSupported()) {
            return false;
        }

        try {
            // navigator.xr is guaranteed to exist after isXRSupported() check
            const { xr } = navigator;
            if (!xr) {
                return false;
            }

            return await xr.isSessionSupported("immersive-ar");
        } catch (error) {
            console.warn("Failed to check AR support:", error);
            return false;
        }
    }

    /**
     * Enter VR mode and optionally transfer camera position from a previous camera
     * @param previousCamera - Optional camera to copy position from
     * @returns Promise that resolves when VR session is active
     */
    public async enterVR(previousCamera?: Camera): Promise<void> {
        if (!this.isXRSupported()) {
            throw new Error("WebXR is not supported in this browser");
        }

        if (this.activeMode) {
            throw new Error("An XR session is already active");
        }

        try {
            logger.debug("Creating VR XR experience");

            // Import WebXR module dynamically
            const { WebXRDefaultExperience, WebXRFeatureName } = await import("@babylonjs/core");

            this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene, {
                floorMeshes: [],
                optionalFeatures: true,
                disableTeleportation: true, // Match demo
            });

            logger.debug("XR experience created, enabling hand tracking with hand meshes");

            // Enable hand tracking with default rigged hand meshes (purple hands)
            // Using simple config that matches the working demo
            try {
                this.xrHelper.baseExperience.featuresManager.enableFeature(
                    WebXRFeatureName.HAND_TRACKING,
                    "latest",
                    {
                        xrInput: this.xrHelper.input,
                        jointMeshes: { enablePhysics: false },
                    },
                );
                logger.debug("Hand tracking enabled");
            } catch (handError) {
                logger.warn("Failed to enable hand tracking", { error: String(handError) });
            }

            // Actually enter the VR session
            logger.debug("Entering VR session");
            await this.xrHelper.baseExperience.enterXRAsync("immersive-vr", "local-floor");
            logger.debug("Entered VR session");

            // Log available features
            const enabledFeatures = this.xrHelper.baseExperience.featuresManager.getEnabledFeatures();
            logger.debug("Enabled XR features", { features: enabledFeatures.join(", ") });

            // If previous camera provided and not VR-specific, optionally transfer position
            if (previousCamera) {
                const xrCamera = this.getXRCamera();
                if (xrCamera) {
                    xrCamera.position.copyFrom(previousCamera.position);
                    logger.debug("Transferred camera position from previous camera");
                }
            }

            this.activeMode = "immersive-vr";
        } catch (error) {
            console.error("🎮 [XRSessionManager] Failed to enter VR:", error);
            this.xrHelper = null;
            this.activeMode = null;
            throw new Error(`Failed to enter VR mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Enter AR mode and optionally transfer camera position from a previous camera
     * @param previousCamera - Optional camera to copy position from
     * @returns Promise that resolves when AR session is active
     */
    public async enterAR(previousCamera?: Camera): Promise<void> {
        if (!this.isXRSupported()) {
            throw new Error("WebXR is not supported in this browser");
        }

        if (this.activeMode) {
            throw new Error("An XR session is already active");
        }

        try {
            logger.debug("Creating AR XR experience");

            // Import WebXR module dynamically
            const { WebXRDefaultExperience } = await import("@babylonjs/core");

            // For AR, we explicitly DON'T request hand-tracking as an optional feature
            // This prevents dots/spheres from appearing in AR mode
            // Controller triggers still work for gestures without the hand tracking feature
            this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene, {
                floorMeshes: [],
                // Don't request all optional features - this prevents hand-tracking from being enabled
                optionalFeatures: false,
                disableTeleportation: true,
                uiOptions: {
                    sessionMode: "immersive-ar",
                },
            });

            logger.debug("AR mode: Created without hand tracking (controller gestures still work)");

            // Actually enter the AR session
            logger.debug("Entering AR session");
            await this.xrHelper.baseExperience.enterXRAsync("immersive-ar", "local-floor");
            logger.debug("Entered AR session");

            // Log available features
            const enabledFeatures = this.xrHelper.baseExperience.featuresManager.getEnabledFeatures();
            logger.debug("Enabled XR features", { features: enabledFeatures.join(", ") });

            // Always transfer camera position for AR mode
            if (previousCamera) {
                const xrCamera = this.getXRCamera();
                if (xrCamera) {
                    xrCamera.position.copyFrom(previousCamera.position);
                    logger.debug("Transferred camera position from previous camera");
                }
            }

            this.activeMode = "immersive-ar";
        } catch (error) {
            console.error("🎮 [XRSessionManager] Failed to enter AR:", error);
            this.xrHelper = null;
            this.activeMode = null;
            throw new Error(`Failed to enter AR mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Exit the current XR session and clean up resources
     * @returns Promise that resolves when session is exited
     */
    public async exitXR(): Promise<void> {
        if (!this.activeMode || !this.xrHelper) {
            return; // No active session to exit
        }

        try {
            await this.xrHelper.baseExperience.exitXRAsync();
            this.xrHelper.dispose();
            this.xrHelper = null;
            this.activeMode = null;
        } catch (error) {
            // Clean up even if exit fails
            this.xrHelper = null;
            this.activeMode = null;
            throw new Error(`Failed to exit XR mode: ${error instanceof Error ? error.message : String(error)}`);
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
     * Cleanup all XR resources
     */
    public dispose(): void {
        if (this.xrHelper) {
            this.xrHelper.dispose();
            this.xrHelper = null;
        }

        this.activeMode = null;
    }
}
