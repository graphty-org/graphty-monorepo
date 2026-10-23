import { defineRegistration } from "../commands/registry";
import { selectionClearedWords } from "../inspector/words";
import { unlessUnsaved } from "../project/actions";
import { newProjectId } from "../state/store";
import { nothingDrawn } from "../toolbar/useSessionVersion";
import { cyclePanel } from "./focus";
import { historyTip, undoOrRedo } from "./historyWords";

/** Where Help > Documentation goes. */
const DOCUMENTATION_URL = "https://graphty.app/docs/";

/**
 * The Frame's own commands: New project, Rename, Undo and Redo, the two places, selecting all and
 * clearing the selection, and Help.
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
            tooltip: ({ session }) => historyTip(session, true),
            run: async ({ session, workspace }) => {
                // Undo names the step it took back (tier2-design.md section 1).
                const message = session === null ? null : await undoOrRedo(session, true);
                if (message !== null) {
                    // The notice is spoken once, by the status line.
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
            tooltip: ({ session }) => historyTip(session, false),
            run: async ({ session, workspace }) => {
                const message = session === null ? null : await undoOrRedo(session, false);
                if (message !== null) {
                    // The notice is spoken once, by the status line.
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
            // F6 and Shift+F6 move between the panels, as in a desktop application, so a
            // keyboard reader crosses from the layer list to the inspector in one press.
            id: "focus.next-panel",
            label: "Next panel",
            group: "Go to",
            keys: ["F6"],
            run: () => {
                cyclePanel(1);
            },
        },
        {
            id: "focus.previous-panel",
            label: "Previous panel",
            group: "Go to",
            keys: ["Shift+F6"],
            run: () => {
                cyclePanel(-1);
            },
        },
        {
            // Every node the drawing shows: a node a filter hides is not one the reader can see
            // selected. The selection's own announcement says how many.
            id: "selection.all",
            label: "Select all",
            group: "Selection",
            keys: ["Mod+A"],
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ session }) => {
                await session?.selection.apply({ scope: "visible" });
            },
        },
        {
            // Esc closes the innermost open thing first (each menu and dialog takes its own Esc),
            // then clears the selection, leaving the graph's panel open (tier1-design.md 2.3).
            id: "selection.clear",
            label: "Clear selection",
            group: "Selection",
            keys: ["Escape"],
            disabled: ({ session }) => {
                if (session === null) {
                    return "Nothing is drawn";
                }
                return session.selection.size === 0 ? "Nothing is selected" : null;
            },
            run: ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                // Says what went, so an Escape pressed for something else is not silent; a rule in
                // the find box stays there, so Enter brings the selection back.
                const message = selectionClearedWords(session.selection.nodes.length, session.selection.edges.length);
                session.selection.clear();
                workspace.set({ notice: { message, endsWithSelection: true } });
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
