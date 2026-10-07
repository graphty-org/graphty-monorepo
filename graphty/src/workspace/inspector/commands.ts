import { defineRegistration } from "../commands/registry";

/**
 * The Inspector package's registration: the kinds it draws, their tabs and the tab each opens on
 * (tier1-design.md section 2.7). Its verbs are other packages' commands (Re-run layout, Reshuffle
 * layout seed), so it registers none of its own.
 */
export const registration = defineRegistration({
    owner: "inspector",
    commands: [],
    inspectedKinds: [
        { kind: "graph", tabs: ["style", "values"], defaultTab: "values" },
        // A single node always opens on Values (round 8).
        { kind: "node", tabs: ["style", "values"], alwaysOpenOn: "values" },
        { kind: "edge", tabs: ["style", "values"], defaultTab: "values" },
        // Several selected share one Style row; Why this look reads one element, so it is left out.
        { kind: "several", tabs: ["style", "values"], defaultTab: "values" },
        { kind: "neighborhood", tabs: [] },
        { kind: "measure-row", tabs: ["style", "values"], defaultTab: "style" },
        { kind: "run-row", tabs: ["style", "values"], defaultTab: "style" },
        { kind: "group-row", tabs: ["style", "values"], defaultTab: "style" },
        { kind: "everything-row", tabs: ["style", "values"], defaultTab: "style" },
        { kind: "selection-row", tabs: ["style", "values"], defaultTab: "style" },
        { kind: "attribute", tabs: [] },
        { kind: "filter-step", tabs: [] },
    ],
});
