// WebXR setup (design section 10.2, rules 9, 10, 15, 16 and 19): no teleportation, no default UI,
// near interaction on, hands drawn as local joint spheres, no controller models and no online
// profile repository, so nothing is fetched during a session.

import {
    Color3,
    type Scene,
    StandardMaterial,
    WebXRDefaultExperience,
    WebXRFeatureName,
    type WebXRHandTracking,
} from "@babylonjs/core";

/** The XR options the framework settings control. */
export interface XRSettings {
    referenceSpace: "local-floor" | "local";
    /** 0 means "leave the headset's rate"; otherwise the rate to ask for, if supported. */
    frameRate: number;
    foveation: number;
    multiview: boolean;
    framebufferScale: number;
}

/**
 * Create the XR experience. Call once, at boot, after IWER is installed when emulating.
 * @param scene - the scene
 * @param s - the framework's XR settings
 * @returns the experience, or null when this browser has no immersive WebXR
 */
export async function createXR(scene: Scene, s: XRSettings): Promise<WebXRDefaultExperience | null> {
    if (!navigator.xr) {
        return null;
    }
    const orb = new StandardMaterial("touch-orb", scene);
    orb.emissiveColor = new Color3(0.6, 0.8, 1);
    orb.disableLighting = true;
    orb.alpha = 0.6;
    const xr = await WebXRDefaultExperience.CreateAsync(scene, {
        disableDefaultUI: true,
        disableTeleportation: true,
        disableNearInteraction: false,
        disableHandTracking: false,
        inputOptions: { doNotLoadControllerMeshes: true, disableOnlineControllerRepository: true },
        pointerSelectionOptions: { enablePointerSelectionOnAllControllers: true },
        nearInteractionOptions: { motionControllerOrbMaterial: orb, enableNearInteractionOnAllControllers: true },
        handSupportOptions: { handMeshes: { disableDefaultMeshes: true } },
        outputCanvasOptions: { canvasOptions: { framebufferScaleFactor: s.framebufferScale, antialias: true } },
    });
    // Babylon's pointer selection drives GUI only; graph meshes are picked by the graph view.
    xr.pointerSelection.raySelectionPredicate = (m) =>
        m.isEnabled() && m.isVisible && (m.metadata as { ui?: boolean } | null)?.ui === true;
    xr.baseExperience.camera.minZ = 0.05;
    xr.baseExperience.camera.maxZ = 100;
    if (s.multiview) {
        xr.baseExperience.featuresManager.enableFeature(
            WebXRFeatureName.LAYERS,
            "latest",
            { preferMultiviewOnInit: true },
            true,
            false,
        );
    }
    return xr;
}

/**
 * Enter an immersive session and apply the frame rate and foveation settings.
 * @param xr - the experience
 * @param mode - VR or passthrough AR
 * @param s - the framework's XR settings
 * @returns the reference space type the session got
 */
export async function enterSession(xr: WebXRDefaultExperience, mode: XRSessionMode, s: XRSettings): Promise<string> {
    let space: XRReferenceSpaceType = s.referenceSpace;
    try {
        await xr.baseExperience.enterXRAsync(mode, space, xr.renderTarget, {
            optionalFeatures: ["hand-tracking", "local-floor"],
        });
    } catch (e) {
        if (space !== "local-floor") {
            throw e;
        }
        space = "local";
        await xr.baseExperience.enterXRAsync(mode, space, xr.renderTarget, { optionalFeatures: ["hand-tracking"] });
    }
    const sm = xr.baseExperience.sessionManager;
    const rates = sm.supportedFrameRates;
    if (s.frameRate && rates && Array.from(rates).includes(s.frameRate)) {
        await sm.updateTargetFrameRate(s.frameRate).catch(() => undefined);
    }
    if (sm.isFixedFoveationSupported) {
        sm.fixedFoveation = s.foveation;
    }
    return space;
}

/**
 * The hand tracking feature, if the session has it.
 * @param xr - the experience
 * @returns the feature or null
 */
export function handTracking(xr: WebXRDefaultExperience): WebXRHandTracking | null {
    return xr.baseExperience.featuresManager.getEnabledFeature(WebXRFeatureName.HAND_TRACKING);
}
