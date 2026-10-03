import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Table dock package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "table",
    commands: stubCommands([
        { id: "table.toggle", label: "Table", group: "Data", keys: ["Shift+T"] },
    ]),
});
