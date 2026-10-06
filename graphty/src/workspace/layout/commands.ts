import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Layout package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "layout",
    commands: stubCommands([
        { id: "layout.open", label: "Layout", group: "Layout" },
        { id: "layout.rerun", label: "Re-run layout", group: "Layout" },
        { id: "layout.reshuffle", label: "Reshuffle layout seed", group: "Layout" },
    ]),
});
