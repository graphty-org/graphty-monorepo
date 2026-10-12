// Headset emulation for the dry run and desktop try-outs (design section 11.1): `?emulate=<profile>`
// installs IWER (Meta's Immersive Web Emulation Runtime) as the page's WebXR runtime before the XR
// experience is created. The install is forced, as graphty-element's xr test project does
// (graphty-element/test/interactions/helpers/iwer-setup.ts), because Chromium has its own
// navigator.xr. IWER has no Galaxy XR profile: the galaxyxr profiles approximate its input (user
// agent, the 6-button 4-axis controller, refused hand tracking), not its tracking or performance.
// Gap: IWER's hands always report the oculus-hand profile, not Galaxy XR's generic-hand-select.

import { GamepadMappingType, metaQuest3, XRDevice, type XRDeviceConfig } from "iwer";
import { type HandPose, oculusHandConfig } from "iwer/lib/device/XRHandInput.js";

/** The profile names `emulate=` accepts. */
const PROFILES = [
    "quest3-controllers",
    "quest3-hands",
    "galaxyxr-hands",
    "galaxyxr-controllers",
    "galaxyxr-no-hands",
] as const;

const GALAXY_UA =
    "Mozilla/5.0 (Linux; Android 14; Galaxy XR) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile VR Safari/537.36";

/** Galaxy XR controllers as Chrome reports them: 6 buttons and 4 axes, fewer than its own profile lists. */
const galaxyControllers: XRDeviceConfig["controllerConfig"] = (() => {
    const side = (a: string, b: string): { buttons: unknown[]; axes: unknown[] } => ({
        buttons: [
            { id: "trigger", type: "analog", eventTrigger: "select" },
            { id: "squeeze", type: "analog", eventTrigger: "squeeze" },
            null,
            { id: "thumbstick", type: "binary" },
            { id: a, type: "binary" },
            { id: b, type: "binary" },
        ],
        axes: [null, null, { id: "thumbstick", type: "x-axis" }, { id: "thumbstick", type: "y-axis" }],
    });
    const base = metaQuest3.controllerConfig;
    return {
        profileId: "samsung-galaxyxr",
        fallbackProfileIds: ["oculus-touch", "generic-trigger-squeeze-thumbstick"],
        layout: {
            left: {
                ...base?.layout.left,
                gamepad: { mapping: GamepadMappingType.XRStandard, ...side("x-button", "y-button") },
                numHapticActuators: 1,
            },
            right: {
                ...base?.layout.right,
                gamepad: { mapping: GamepadMappingType.XRStandard, ...side("a-button", "b-button") },
                numHapticActuators: 1,
            },
        },
    } as XRDeviceConfig["controllerConfig"];
})();

/**
 * Add a "fist" hand pose (IWER ships default, pinch and point) for the pose layer's fist, the hands'
 * squeeze: the point pose with the index finger curled like the middle finger, moved to the index
 * metacarpal. Its fingertips average 4.6 cm from their metacarpals (the fist begins under 5 cm) and
 * the thumb tip is 7.8 cm from the index tip (no pinch).
 */
function addFistPose(): void {
    const poses = oculusHandConfig.poses as Record<string, HandPose>;
    const { point } = poses;
    if (poses.fist || !point) {
        return;
    }
    type Joint = { offsetMatrix: ArrayLike<number>; radius: number };
    const joints = point.jointTransforms as Record<string, Joint>;
    const fist: Record<string, Joint> = {};
    for (const [name, j] of Object.entries(joints)) {
        fist[name] = { radius: j.radius, offsetMatrix: Float32Array.from(j.offsetMatrix) };
    }
    const index = joints["index-finger-metacarpal"].offsetMatrix;
    const middle = joints["middle-finger-metacarpal"].offsetMatrix;
    for (const part of ["phalanx-proximal", "phalanx-intermediate", "phalanx-distal", "tip"]) {
        const m = Float32Array.from(joints[`middle-finger-${part}`].offsetMatrix);
        for (let k = 12; k < 15; k++) {
            m[k] += index[k] - middle[k];
        }
        fist[`index-finger-${part}`].offsetMatrix = m;
    }
    poses.fist = { ...point, jointTransforms: fist as unknown as HandPose["jointTransforms"] };
}

/**
 * Install IWER with a device profile.
 * @param profile - one of PROFILES
 * @returns the emulated device, to move the head, hands and controllers
 */
export function installEmulation(profile: string): XRDevice {
    if (!(PROFILES as readonly string[]).includes(profile)) {
        throw new Error(`unknown emulate profile "${profile}"; one of ${PROFILES.join(", ")}`);
    }
    const galaxy = profile.startsWith("galaxyxr");
    const config: XRDeviceConfig = {
        ...metaQuest3,
        ...(galaxy
            ? {
                  name: "Galaxy XR (approximation)",
                  userAgent: GALAXY_UA,
                  supportedFrameRates: [60, 72, 90],
                  isSystemKeyboardSupported: false,
                  controllerConfig: profile === "galaxyxr-hands" ? metaQuest3.controllerConfig : galaxyControllers,
              }
            : {}),
        supportedFeatures: metaQuest3.supportedFeatures.filter(
            (f) => profile !== "galaxyxr-no-hands" || f !== "hand-tracking",
        ),
    };
    addFistPose();
    const device = new XRDevice(config);
    device.installRuntime({ forceInstall: true });
    device.primaryInputMode = profile.endsWith("hands") && profile !== "galaxyxr-no-hands" ? "hand" : "controller";
    return device;
}
