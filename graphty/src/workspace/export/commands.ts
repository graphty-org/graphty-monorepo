import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Export dialog package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "export",
    commands: stubCommands([
        { id: "file.export", label: "Export...", group: "Project", keys: ["Mod+E"] },
    ]),
});
