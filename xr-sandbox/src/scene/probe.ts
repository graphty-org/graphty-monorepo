// The capability probe (design section 8): what this browser and headset actually expose, logged at
// page load and at session start, so every "unverified" of design section 10.1 is answered the first
// time the owner opens the sandbox on each headset.

import { Engine, type WebXRDefaultExperience } from "@babylonjs/core";

/**
 * Collect the probe fields.
 * @param xr - the XR experience, when there is one
 * @param phase - "load" or "session"
 * @returns the probe entry's data
 */
export async function probe(
    xr: WebXRDefaultExperience | null,
    phase: "load" | "session",
): Promise<Record<string, unknown>> {
    const sm = xr?.baseExperience.sessionManager;
    const session = sm?.inXRSession ? sm.session : null;
    const layer = session?.renderState.baseLayer;
    let microphone = "unknown";
    try {
        microphone = (await navigator.permissions.query({ name: "microphone" })).state;
    } catch {
        microphone = "not queryable";
    }
    const supports = async (mode: XRSessionMode): Promise<boolean> => {
        try {
            return (await navigator.xr?.isSessionSupported(mode)) ?? false;
        } catch {
            return false;
        }
    };
    return {
        phase,
        userAgent: navigator.userAgent,
        babylon: Engine.Version,
        webxr: !!navigator.xr,
        immersiveVr: await supports("immersive-vr"),
        immersiveAr: await supports("immersive-ar"),
        enabledFeatures: xr?.baseExperience.featuresManager.getEnabledFeatures() ?? [],
        frameRate: sm?.currentFrameRate ?? null,
        frameRates: sm?.supportedFrameRates ? Array.from(sm.supportedFrameRates) : null,
        foveation: sm?.isFixedFoveationSupported ? sm.fixedFoveation : "unsupported",
        nativeFramebufferScale:
            session && "XRWebGLLayer" in window ? XRWebGLLayer.getNativeFramebufferScaleFactor(session) : null,
        framebuffer: layer ? { width: layer.framebufferWidth, height: layer.framebufferHeight } : null,
        layers: "XRWebGLBinding" in window,
        systemKeyboard: session
            ? ((session as unknown as { isSystemKeyboardSupported?: boolean }).isSystemKeyboardSupported ?? null)
            : null,
        visibility: session?.visibilityState ?? null,
        inputs: session
            ? Array.from(session.inputSources, (s) => ({
                  handedness: s.handedness,
                  profiles: s.profiles,
                  targetRayMode: s.targetRayMode,
                  hand: !!s.hand,
                  buttons: s.gamepad?.buttons.length ?? 0,
                  axes: s.gamepad?.axes.length ?? 0,
              }))
            : [],
        webgpu: "gpu" in navigator,
        speechRecognition: "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
        microphone,
        devicePixelRatio,
        screen: { width: screen.width, height: screen.height },
    };
}
