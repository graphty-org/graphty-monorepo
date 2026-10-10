// Grab and turn the graph, two-hand scale, a small held copy in the off hand.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "handling",
    name: "Handling",
    color: "#ab47bc",
    claims: [
        { channel: "squeeze", contexts: ["node", "graph", "space"], priority: 40, note: "grab at start" },
        {
            channel: "select",
            contexts: ["graph"],
            priority: 40,
            decide: (g) => (g.movedM >= 0.015 ? "take" : "wait"),
            note: "take after 1.5 cm of movement",
        },
        { channel: "two-hand", contexts: "any", priority: 40, note: "when the first press is handling's" },
    ],
});
