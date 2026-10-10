// A sieve (a filter previewed before commit) and a probe that reads a node or a result.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "physical-tools",
    name: "Physical tools",
    color: "#ff5370",
    claims: [
        { channel: "select", detail: "physical-tools", contexts: ["tool"], priority: 90, note: "take at start" },
        { channel: "squeeze", detail: "physical-tools", contexts: ["tool"], priority: 90, note: "take at start" },
    ],
});
