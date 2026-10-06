import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Graph place package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "graph-place",
    commands: stubCommands([{ id: "find.focus", label: "Find", group: "Graph tree", keys: ["/"] }]),
});
