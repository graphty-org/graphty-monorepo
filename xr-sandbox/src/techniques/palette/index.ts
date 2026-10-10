// An off-hand palette with faces and tear-off cards, like Tilt Brush's.
// Not built yet: this stub carries the technique's real claims (design section 5.8) so the
// registry, presets, gear panel and input map are complete before it exists.

import { stub } from "../../framework/technique";

export const technique = stub({
    id: "palette",
    name: "Palette",
    color: "#f78c6c",
    claims: [
        {
            channel: "stick",
            detail: "x",
            contexts: "any",
            priority: 70,
            hand: "off",
            note: "off-hand stick left or right turns a face",
        },
        { channel: "micro", contexts: "any", priority: 70, hand: "off", note: "off-hand swipes turn a face" },
    ],
});
