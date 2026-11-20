// "And more", beat 2: the bank as ForceAtlas2 left it (laid out in setup, so no layout settles on
// camera); the hand opens Layout and ForceAtlas2's form, with Gephi's own settings, then closes it so
// the drawing holds clear of the form.
import { analyze, BANK_CLIP, bank2D } from "../r2-1-fraud-ring/bank.js";
import { applyLayout, layoutPanel, MORE, pickLayout, REST } from "./more.js";

export default {
    id: "gephi-look",
    ...BANK_CLIP,
    chapter: MORE,
    caption: "ForceAtlas2, as in Gephi",
    async setup(h) {
        await bank2D(h);
        await analyze(h, "louv", "Louvain");
        await applyLayout(h, /^ForceAtlas2\b/);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        await pickLayout(h, /^ForceAtlas2\b/, false);
        await h.waitFor(h.page.getByRole("form", { name: "ForceAtlas2" }));
        h.mark("form shown");
        await h.pause(1200);
        await h.press("Escape");
        await h.press("Escape");
        await layoutPanel(h.page).waitFor({ state: "hidden" }); // Esc steps back to the list, then closes
        await h.move(REST);
    },
    holdMs: 1800,
};
