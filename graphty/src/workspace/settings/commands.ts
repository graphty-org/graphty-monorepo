import { defineRegistration } from "../commands/registry";

/** The Settings package's command: Settings... (Mod+,), opening on General. */
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
    ],
});
