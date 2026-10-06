import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Analyze package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "analyze",
    commands: stubCommands([{ id: "analyze.open", label: "Analyze", group: "Analyze", keys: ["Shift+A"] }]),
});
