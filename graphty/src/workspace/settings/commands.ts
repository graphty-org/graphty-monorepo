import type { Graphty as GraphtyElement } from "@graphty/graphty-element";

import { defineRegistration } from "../commands/registry";
import { MOTION_COMMAND_WORDS } from "../style/words";
import { shaderSettings, writeShaderPreference } from "./shaderPreferences";

/**
 * The canvas menu's Motion command now, from the motion the element draws with
 * (`renderQuality.motion`, which folds in the reader's setting and the platform's reduced-motion
 * preference): Motion on while shaders are still, Motion off while they may move (WCAG 2.2.2).
 * @param element - the element, or null before it is up (the reader's setting then decides).
 * @returns the command id.
 */
export function motionCommandId(element: GraphtyElement | null): "view.motion-off" | "view.motion-on" {
    const still = element === null ? shaderSettings().motion === "off" : element.renderQuality.motion === "still";
    return still ? "view.motion-on" : "view.motion-off";
}

/**
 * The setting Motion on writes: back to the system's own preference, unless the system asks for
 * reduced motion, where only the reader's explicit "on" makes shaders move.
 * @returns the setting.
 */
export function motionOnSetting(): "system" | "on" {
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reduce ? "on" : "system";
}

/**
 * The Settings package's commands: Settings... (Mod+,), opening on General, and Motion off and on,
 * the reader's shader motion preference.
 */
export const registration = defineRegistration({
    owner: "settings",
    commands: [
        {
            id: "settings.open",
            label: "Settings...",
            group: "Settings and help",
            keys: ["Mod+,"],
            run: ({ workspace }) => {
                workspace.set({ dialog: "settings" });
            },
        },
        {
            id: "view.motion-off",
            label: MOTION_COMMAND_WORDS.off,
            group: "View",
            keywords: ["animation", "shader", "still"],
            run: () => {
                writeShaderPreference({ motion: "off" });
            },
        },
        {
            id: "view.motion-on",
            label: MOTION_COMMAND_WORDS.on,
            group: "View",
            keywords: ["animation", "shader"],
            run: () => {
                writeShaderPreference({ motion: motionOnSetting() });
            },
        },
    ],
});
