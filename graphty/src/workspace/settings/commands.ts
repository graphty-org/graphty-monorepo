import { defineRegistration } from "../commands/registry";
import { MOTION_COMMAND_WORDS } from "../style/words";
import { shaderSettings, writeShaderPreference } from "./shaderPreferences";

/**
 * The canvas menu's Motion command now: Motion off while shaders may move, Motion on once the
 * reader turned it off (WCAG 2.2.2).
 * @returns the command id.
 */
export function motionCommandId(): "view.motion-off" | "view.motion-on" {
    return shaderSettings().motion === "off" ? "view.motion-on" : "view.motion-off";
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
                writeShaderPreference({ motion: "on" });
            },
        },
    ],
});
