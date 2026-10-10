// Hand poses and motions (handy-work style).
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "gestures",
    name: "Gestures",
    color: "#c792ea",
    needs: ["hand-joints"],
    claims: [
        { channel: "pose", contexts: "any", priority: 30, note: "take at start (poses are discrete events)" },
        { channel: "motion", contexts: "any", priority: 30, note: "take at start" },
        { channel: "micro", contexts: "any", priority: 30, hand: "dominant", note: "take at start" },
    ],
});
