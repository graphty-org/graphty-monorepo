import { defineRegistration } from "../commands/registry";
import { FIND_BOX_ID } from "./FindBox";

/**
 * The Graph place's commands and the row kinds its paint tree hands the inspector. A click on a
 * row sets `inspected` to `{ kind, id }` with one of these kinds and the row's id.
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
        { kind: "selection", tabs: [] },
        { kind: "measure-row", tabs: ["style", "values"] },
        { kind: "run-row", tabs: ["style", "values"] },
        { kind: "group-row", tabs: ["style", "values"] },
        { kind: "layer-row", tabs: ["style", "values"] },
        { kind: "everything", tabs: ["style", "values"] },
    ],
});
