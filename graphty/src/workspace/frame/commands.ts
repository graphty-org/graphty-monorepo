import { defineRegistration } from "../commands/registry";
import { stepHistoryNotice } from "../data-place/filterSteps";
import { unlessUnsaved } from "../project/actions";
import { newProjectId } from "../state/store";

/** Where Help > Documentation goes. */
const DOCUMENTATION_URL = "https://graphty.app/docs/";

/**
 * The Frame's own commands: New project, Rename, Undo and Redo, the two places, clearing the
 * selection, and Help.
 */
export const registration = defineRegistration({
    owner: "frame",
    commands: [
        {
            id: "project.new",
            label: "New project",
            group: "Project",
            run: (ctx) => {
                unlessUnsaved(ctx, () => {
                    ctx.workspace.set((state) => ({
                        project: { name: "Untitled", id: newProjectId(state) },
                        page: "panels",
                        place: "graph",
                        inspected: null,
                        dialog: null,
                    }));
                });
            },
        },
        {
            id: "project.rename",
            label: "Rename",
            group: "Project",
            keys: ["F2"],
            disabled: ({ workspace }) => (workspace.get().project === null ? "No project is open" : null),
            run: ({ workspace }) => {
                workspace.set({ renaming: true });
            },
        },
        {
            id: "history.undo",
            label: "Undo",
            group: "Project",
            keys: ["Mod+Z"],
            disabled: ({ session }) => (session?.canUndo === true ? null : "Nothing to undo"),
            run: async ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                // A filter step's undo names the step (tier2-design.md section 1).
                const notice = stepHistoryNotice(session, true);
                await session.undo();
                const message = notice?.() ?? null;
                if (message !== null) {
                    workspace.set({ notice: { message } });
                }
            },
        },
        {
            id: "history.redo",
            label: "Redo",
            group: "Project",
            keys: ["Shift+Mod+Z", "Mod+Y"],
            disabled: ({ session }) => (session?.canRedo === true ? null : "Nothing to redo"),
            run: async ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const notice = stepHistoryNotice(session, false);
                await session.redo();
                const message = notice?.() ?? null;
                if (message !== null) {
                    workspace.set({ notice: { message } });
                }
            },
        },
        {
            id: "place.graph",
            label: "Graph",
            group: "Go to",
            run: ({ workspace }) => {
                workspace.set({ page: "panels", place: "graph" });
            },
        },
        {
            id: "place.data",
            label: "Data",
            group: "Go to",
            run: ({ workspace }) => {
                workspace.set({ page: "panels", place: "data" });
            },
        },
        {
            // Esc closes the innermost open thing first (each menu and dialog takes its own Esc),
            // then clears the selection, leaving the graph's panel open (tier1-design.md 2.3).
            id: "selection.clear",
            label: "Clear selection",
            group: "Selection",
            keys: ["Escape"],
            disabled: ({ session }) => (session === null ? "Nothing is drawn" : null),
            run: ({ session }) => {
                session?.selection.clear();
            },
        },
        {
            id: "help.shortcuts",
            label: "Keyboard shortcuts",
            group: "Settings and help",
            keys: ["?"],
            run: ({ workspace }) => {
                workspace.set({ dialog: "shortcuts" });
            },
        },
        {
            id: "help.documentation",
            label: "Documentation",
            group: "Settings and help",
            run: () => {
                window.open(DOCUMENTATION_URL, "_blank", "noopener");
            },
        },
        {
            id: "help.about",
            label: "About",
            group: "Settings and help",
            run: ({ workspace }) => {
                workspace.set({ dialog: "about" });
            },
        },
    ],
});
