import { defineRegistration } from "../commands/registry";
import { openDataPage } from "./request";

/**
 * The Data page package's commands: Add data..., which opens the Data page to add data to the open
 * project from Quick actions (tier1-design.md section 2.10). The start
 * screen's New from data... opens the same page as a new graph.
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
            run: ({ workspace }) => {
                openDataPage(workspace, { intent: "add" });
            },
        },
    ],
});
