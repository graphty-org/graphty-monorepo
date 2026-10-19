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
        // Why this look reads one element; several wait for graphty-element #810, so these two
        // kinds show their values alone, with no tabs.
        { kind: "several", tabs: [] },
        { kind: "neighborhood", tabs: [] },
        { kind: "measure-row", tabs: ["style", "values"], defaultTab: "values" },
        { kind: "run-row", tabs: ["style", "values"], defaultTab: "values" },
        { kind: "group-row", tabs: [] },
        { kind: "everything-row", tabs: ["style", "values"], defaultTab: "style" },
        { kind: "selection-row", tabs: [] },
        { kind: "attribute", tabs: [] },
    ],
});
