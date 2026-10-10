// Headset emulation for the dry run and desktop try-outs (design section 11.1): `?emulate=<profile>`
// installs IWER (Meta's Immersive Web Emulation Runtime) as the page's WebXR runtime before the XR
// experience is created. The install is forced, as graphty-element's xr test project does
// (graphty-element/test/interactions/helpers/iwer-setup.ts), because Chromium has its own
// navigator.xr. IWER has no Galaxy XR profile: the galaxyxr profiles approximate its input (user
// agent, the 6-button 4-axis controller, refused hand tracking), not its tracking or performance.
// Gap: IWER's hands always report the oculus-hand profile, not Galaxy XR's generic-hand-select.

import { GamepadMappingType, metaQuest3, XRDevice, type XRDeviceConfig } from "iwer";

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
    const device = new XRDevice(config);
    device.installRuntime({ forceInstall: true });
    device.primaryInputMode = profile.endsWith("hands") && profile !== "galaxyxr-no-hands" ? "hand" : "controller";
    return device;
}
