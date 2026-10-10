// Two-letter hint tags, and a slab pushed through the graph that shows a slice flat.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "dense-picking",
    name: "Dense picking",
    color: "#b2ccd6",
    claims: [
        { channel: "select", detail: "dense-picking", contexts: ["tool"], priority: 90, note: "take at start" },
        { channel: "squeeze", detail: "dense-picking", contexts: ["tool"], priority: 90, note: "take at start" },
    ],
});
