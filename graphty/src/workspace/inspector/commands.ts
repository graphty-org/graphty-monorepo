import { defineRegistration } from "../commands/registry";

/**
 * The Inspector package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "inspector",
    commands: [],
});
