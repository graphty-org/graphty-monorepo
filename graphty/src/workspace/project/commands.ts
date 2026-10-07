import { type CommandContext, defineRegistration } from "../commands/registry";
import { closeProject, SAVE_AS_DIALOG, saveLocalCopy, saveProject } from "./actions";

/**
 * Why Save and Save as cannot run now.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.element - the element, or null while it comes up.
 * @returns the reason, or null.
 */
function cannotSave({ workspace, element }: CommandContext): string | null {
    if (workspace.get().project === null) {
        return "No project is open";
    }
    return element === null ? "The graph is still loading" : null;
}

/** The Project package's commands: Save (Mod+S), Save as... (Shift+Mod+S), Save local copy... and Back to start. */
export const registration = defineRegistration({
    owner: "project",
    commands: [
        {
            id: "project.save",
            label: "Save",
            group: "Project",
            keys: ["Mod+S"],
            keywords: ["project", "file"],
            disabled: cannotSave,
            run: saveProject,
        },
        {
            id: "project.save-as",
            label: "Save as...",
            group: "Project",
            keys: ["Shift+Mod+S"],
            keywords: ["project", "file", "copy"],
            disabled: cannotSave,
            run: ({ workspace }) => {
                workspace.set({ dialog: SAVE_AS_DIALOG });
            },
        },
        {
            id: "project.save-copy",
            label: "Save local copy...",
            group: "Project",
            keywords: ["project", "file", "download", "export"],
            description: "Downloads the project file. Where Save goes does not change.",
            disabled: cannotSave,
            run: saveLocalCopy,
        },
        {
            id: "project.close",
            label: "Back to start",
            group: "Project",
            disabled: ({ workspace }) => (workspace.get().project === null ? "No project is open" : null),
            run: closeProject,
        },
    ],
});
