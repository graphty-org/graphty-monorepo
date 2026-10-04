import { defineRegistration } from "../commands/registry";
import { FIND_BOX_ID } from "./FindBox";

/**
 * The Graph place's commands. A click on a row sets `inspected` to `{ kind, id }` with the row's
 * kind and id; the inspector registers and draws those kinds, except a reader's own layer row,
 * which only the paint tree has.
 */
export const registration = defineRegistration({
    owner: "graph-place",
    commands: [
        {
            id: "find.focus",
            label: "Find",
            group: "Graph tree",
            keys: ["/"],
            keywords: ["search", "node", "name"],
            disabled: ({ session }) => (session === null ? "Nothing is open" : null),
            run: ({ workspace }) => {
                workspace.set({ page: "panels", place: "graph" });
                // The Graph place may only now be drawn; focus once it is.
                requestAnimationFrame(() => {
                    document.getElementById(FIND_BOX_ID)?.focus();
                });
            },
        },
    ],
    inspectedKinds: [
        { kind: "layer-row", tabs: ["style", "values"] },
    ],
});
