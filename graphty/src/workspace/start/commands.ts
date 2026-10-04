import { defineRegistration } from "../commands/registry";
import { unlessUnsaved } from "../project/actions";
import { newProjectId } from "../state/store";
import { chooseAndOpenFile } from "./open";

/**
 * The Start screen package's commands: Open project or file... and New from data..., the two ways
 * in on the start screen, also on the File list.
 */
export const registration = defineRegistration({
    owner: "start",
    commands: [
        {
            id: "file.open",
            label: "Open project or file...",
            group: "Project",
            keys: ["Mod+O"],
            description: "A data, recipe or style file is added to this project; a project file opens in its place.",
            run: chooseAndOpenFile,
        },
        {
            id: "data.new",
            label: "New from data...",
            group: "Data",
            run: (ctx) => {
                unlessUnsaved(ctx, () => {
                    ctx.workspace.set((state) => ({
                        project: { name: "Untitled", id: newProjectId(state) },
                        page: "data-page",
                        place: "graph",
                        inspected: null,
                        dialog: null,
                    }));
                });
            },
        },
    ],
});
