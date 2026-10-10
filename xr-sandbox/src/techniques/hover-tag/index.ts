// Pointing at a node shows "Strozzi 0.088, #3" before any press.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "hover-tag",
    name: "Hover name tag",
    color: "#c3e88d",
    needs: ["hover"],
    claims: [],
});
