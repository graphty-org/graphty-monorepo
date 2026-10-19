import { defineRegistration } from "../commands/registry";

/** The Export dialog package's commands: Export... (the File list), which opens the dialog on Image. */
export const registration = defineRegistration({
    owner: "export",
    commands: [
        {
            id: "file.export",
            label: "Export...",
            group: "Project",
            keys: ["Mod+E"],
            keywords: ["image", "picture", "screenshot", "png", "csv", "spreadsheet", "data", "download"],
            disabled: ({ workspace, element }) => {
                if (workspace.get().project === null) {
                    return "No project is open";
                }
                return element === null ? "The graph is still loading" : null;
            },
            run: ({ workspace }) => {
                workspace.set({ dialog: "export", exportOn: "image" });
            },
        },
    ],
});
