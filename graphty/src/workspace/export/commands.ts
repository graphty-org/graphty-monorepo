import { defineRegistration } from "../commands/registry";
import type { WorkspaceState } from "../state/store";

/**
 * Where Export... opens: on the edges' Data while the table dock shows the edges, else on the
 * nodes'. Images and videos are a camera's and a tour's own Export, not listed here.
 * @param state - the workspace state.
 * @returns the store's `exportOn`.
 */
function exportTarget(state: Pick<WorkspaceState, "dockOpen" | "dockTab">): WorkspaceState["exportOn"] {
    return state.dockOpen && state.dockTab === "edges" ? "edges" : "nodes";
}

/**
 * The Export dialog package's commands: Export... (the File list), which opens the dialog on Data,
 * and a Sources row's Export..., which opens it on Data with that source's records.
 */
export const registration = defineRegistration({
    owner: "export",
    commands: [
        {
            id: "file.export",
            label: "Export...",
            group: "Project",
            keys: ["Mod+E"],
            keywords: ["csv", "spreadsheet", "data", "download"],
            disabled: ({ workspace, element }) => {
                if (workspace.get().project === null) {
                    return "No project is open";
                }
                return element === null ? "The graph is still loading" : null;
            },
            run: ({ workspace }) => {
                workspace.set({
                    dialog: "export",
                    exportOn: exportTarget(workspace.get()),
                    exportSource: null,
                });
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
