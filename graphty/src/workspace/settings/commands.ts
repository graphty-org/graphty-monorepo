import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Settings package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "settings",
    commands: stubCommands([
        { id: "settings.open", label: "Settings...", group: "Settings and help", keys: ["Mod+,"] },
    ]),
});
