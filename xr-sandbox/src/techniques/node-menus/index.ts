// Point at a node and hold: a menu of its verbs; also a menu on empty space.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "node-menus",
    name: "Node menus",
    color: "#82aaff",
    claims: [
        {
            channel: "select",
            contexts: ["node", "graph", "space"],
            priority: 50,
            decide: (g) => {
                if (g.movedM > 0.015) {
                    return "pass";
                }
                return g.durationMs >= 300 ? "take" : "wait";
            },
            note: "take after 300 ms held within 1.5 cm",
        },
        { channel: "button", detail: "b", contexts: ["node", "graph", "space"], priority: 50, note: "take at start" },
        { channel: "button", detail: "y", contexts: ["node", "graph", "space"], priority: 50, note: "take at start" },
    ],
});
