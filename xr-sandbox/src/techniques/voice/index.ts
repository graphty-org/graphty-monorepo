// Voice with an editable chip sentence; poking a chip fixes one word.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "voice",
    name: "Voice chips",
    color: "#f07178",
    needs: ["microphone"],
    arm: "microphone",
    claims: [
        { channel: "button", detail: "x", hand: "off", contexts: "any", priority: 80, note: "push to talk while held" },
    ],
});
