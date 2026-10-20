import { defineRegistration } from "../commands/registry";

/** The Table dock package's commands: Table (Shift+T) opens and closes the dock. */
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
                if (session === null) {
                    return "The graph is still loading";
                }
                return session.data.sources().length === 0 ? "No data yet" : null;
            },
            run: ({ workspace }) => {
                workspace.set((state) => ({ dockOpen: !state.dockOpen }));
            },
        },
    ],
});
