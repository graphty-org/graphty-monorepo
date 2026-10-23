import { defineRegistration } from "../commands/registry";
import { resolveInspected } from "../inspector/inspected";
import { MAX_TARGETS, targetsOf } from "./words";

/**
 * The Notes package's commands: the Notes place, and Add note, which opens the editor at the top
 * of the Notes place about whatever the inspector shows (the graph when nothing is selected).
 */
export const registration = defineRegistration({
    owner: "notes",
    commands: [
        {
            id: "place.notes",
            label: "Notes",
            group: "Go to",
            run: ({ workspace }) => {
                workspace.set({ page: "panels", place: "notes" });
            },
        },
        {
            id: "notes.add",
            label: "Add note",
            group: "Notes",
            keys: ["N"],
            disabled: ({ session, workspace }) => {
                if (session === null) {
                    return "No project is open";
                }
                const { nodes, edges } = session.selection;
                return workspace.get().inspected === null && nodes.length + edges.length > MAX_TARGETS
                    ? `A note can name at most ${String(MAX_TARGETS)} things`
                    : null;
            },
            run: ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const { nodes, edges } = session.selection;
                const targets = targetsOf(session, resolveInspected(workspace.get().inspected, { nodes, edges }));
                workspace.set((state) => ({
                    page: "panels",
                    place: "notes",
                    // A draft already about the same things keeps its text.
                    noteDraft: {
                        targets,
                        text:
                            JSON.stringify(state.noteDraft?.targets) === JSON.stringify(targets)
                                ? (state.noteDraft?.text ?? "")
                                : "",
                    },
                }));
            },
        },
    ],
});
