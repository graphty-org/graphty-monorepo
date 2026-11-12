import { defineRegistration } from "../commands/registry";
import { chooseAndOpenFile } from "../start/open";

/**
 * The Data page package's commands: Add data..., in Quick actions, which adds a file to the open
 * project by the same door as the Sources "+" File...: the file picker, then, onto a graph that holds
 * data, the join screen. The start screen's New from data... opens the Data page as a new graph.
 */
export const registration = defineRegistration({
    owner: "data-page",
    commands: [
        {
            id: "data.add",
            label: "Add data...",
            group: "Data",
            keywords: ["import", "file", "table", "csv"],
            disabled: ({ workspace }) => (workspace.get().project === null ? "No project is open" : null),
            run: chooseAndOpenFile,
        },
    ],
});
