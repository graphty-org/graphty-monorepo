import { defineRegistration } from "../commands/registry";

/** The Table dock package's commands: Table (Shift+T) opens the dock, with focus in its table, and closes it. */
export const registration = defineRegistration({
    owner: "table",
    commands: [
        {
            id: "table.toggle",
            label: "Table",
            group: "Data",
            keys: ["Shift+T"],
            keywords: ["rows", "spreadsheet", "nodes", "edges", "columns"],
            description: "Show or hide the table of nodes and edges",
            disabled: ({ workspace, session }) => {
                if (workspace.get().project === null) {
                    return "No project is open";
                }
                return session === null ? "The graph is still loading" : null;
            },
            run: ({ workspace }) => {
                const opening = !workspace.get().dockOpen;
                workspace.set({ dockOpen: opening });
                if (opening) {
                    // A command that opens a region puts focus in it: the table's own Tab stop,
                    // once the dock is drawn.
                    requestAnimationFrame(() => {
                        document.querySelector<HTMLElement>('.ws-dock [role="grid"] [tabindex="0"]')?.focus();
                    });
                }
            },
        },
    ],
});
