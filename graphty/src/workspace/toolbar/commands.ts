import { defineRegistration, stubCommands } from "../commands/registry";

/**
 * The Toolbar package's commands. Stubs until that package builds them: each holds its id, label
 * and keys, and nothing draws it.
 */
export const registration = defineRegistration({
    owner: "toolbar",
    commands: stubCommands([
        { id: "view.open", label: "View", group: "View" },
        { id: "view.legend", label: "Legend", group: "View", keys: ["L"] },
        { id: "view.fit", label: "Fit", group: "View", keys: ["0"] },
        { id: "view.frame-selection", label: "Frame selection", group: "View", keys: ["F"] },
        { id: "view.toggle-dimension", label: "Switch to 2D", group: "View", keys: ["5"] },
        { id: "quick-actions.open", label: "Quick actions", group: "Settings and help", keys: ["Mod+K"] },
        { id: "selection.neighborhood", label: "Neighborhood", group: "Selection", keys: ["G"] },
    ]),
});
