import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Style tab package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "style",
    commands: stubCommands([
        { id: "style.add-label-line", label: "Add label line", group: "Graph tree" },
    ]),
});
