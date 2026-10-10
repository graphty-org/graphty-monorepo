// Pinch a node and pull outward to grow its neighborhood hop by hop.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "pull-to-grow",
    name: "Pull to grow",
    color: "#ffcb6b",
    claims: [
        {
            channel: "select",
            contexts: ["node"],
            priority: 60,
            decide: (g) => (g.movedM >= 0.03 ? "take" : "wait"),
            note: "take after 3 cm of movement",
        },
    ],
});
