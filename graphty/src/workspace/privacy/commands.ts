import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The usage data package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "privacy",
    commands: stubCommands([
        { id: "settings.privacy", label: "Privacy settings", group: "Settings and help" },
        { id: "help.report", label: "Report a problem", group: "Settings and help" },
    ]),
});
