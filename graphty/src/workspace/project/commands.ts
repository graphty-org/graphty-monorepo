import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Project package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "project",
    commands: stubCommands([
        { id: "project.save", label: "Save", group: "Project", keys: ["Mod+S"] },
        { id: "project.save-as", label: "Save as...", group: "Project", keys: ["Shift+Mod+S"] },
        { id: "project.close", label: "Close project", group: "Project" },
    ]),
});
