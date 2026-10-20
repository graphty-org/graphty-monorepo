import { defineRegistration } from "../commands/registry";
import { unlessUnsaved } from "../project/actions";
import { newProjectId } from "../state/store";
import { chooseAndOpenFile, pasteSource } from "./open";

/**
 * The Start screen package's commands: Open project or file... and New from data..., the two ways
 * in on the start screen, also on the File list; and the Sources "+" doors to add data: File...,
 * Samples... and Paste (data prototype spec section 3.2).
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
            id: "data.add-file",
            label: "File...",
            group: "Data",
            keywords: ["add", "source", "open"],
            run: chooseAndOpenFile,
        },
        {
            id: "data.samples",
            label: "Samples...",
            group: "Data",
            keywords: ["add", "source", "example"],
            run: (ctx) => {
                ctx.workspace.set({ dialog: "samples" });
            },
        },
        {
            id: "data.add-paste",
            label: "Paste",
            group: "Data",
            keywords: ["add", "source", "clipboard"],
            run: pasteSource,
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
