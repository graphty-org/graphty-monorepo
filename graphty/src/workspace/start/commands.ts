import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Start screen package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "start",
    commands: stubCommands([
        {
            id: "file.open",
            label: "Open project or file...",
            group: "Project",
            keys: ["Mod+O"],
            description: "A data, recipe or style file is added to this project; a project file opens in its place.",
        },
        { id: "data.new", label: "New from data...", group: "Data" },
    ]),
});
