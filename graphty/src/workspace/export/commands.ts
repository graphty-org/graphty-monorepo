import { defineRegistration } from "../commands/registry";
import type { WorkspaceState } from "../state/store";

/**
 * Where Export... opens (tier 4, R14, tier 1's rule): on Data with the table that is showing
 * whenever the table dock is open, else on Image.
 * @param state - the workspace state.
 * @returns the store's `exportOn`.
 */
export function exportTarget(state: Pick<WorkspaceState, "dockOpen" | "dockTab">): WorkspaceState["exportOn"] {
    if (!state.dockOpen) {
        return "image";
    }
    return state.dockTab === "edges" ? "edges" : "nodes";
}

/**
 * The Export dialog package's commands: Export... (the File list), which opens the dialog on Data
 * while a table is showing and on Image otherwise, and a Sources row's Export..., which opens it on
 * Data with that source's records.
 */
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
                workspace.set({ dialog: "export", exportOn: exportTarget(workspace.get()), exportSource: null });
            },
        },
    ],
    sourceRow: [
        {
            id: "source.export",
            label: "Export...",
            order: 70,
            run: (ctx, source) => {
                ctx.workspace.set({ dialog: "export", exportOn: "nodes", exportSource: source.key });
            },
        },
    ],
});
