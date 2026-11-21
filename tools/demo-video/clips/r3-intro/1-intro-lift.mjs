// Round 3, intro shot 3 and the 3D chapter's first clip: the bank, flat and colored by Louvain
// community, bursts into 3D (Mode > 3D, key 5 badged), settles, Fit (0), then Auto-rotate (9).
// The cosmograph experiment is off: with it on, a mode switch re-lays the graph from a jumble of
// giant spheres (tmp/demo-video/rework/app-defects.md).
import { BANK_CLIP, bankLouvain } from "../r2-1-fraud-ring/bank.js";
import { hideLegend } from "../r2-5b-and-more/more.js";

export default {
    id: "intro-lift",
    ...BANK_CLIP,
    featuresOff: ["file-styles", "cosmograph"],
    caption: "One click turns it 3D",
    async setup(h) {
        const { page } = h;
        await bankLouvain(h);
        await hideLegend(page);
        await h.app.mode("2D");
        await h.app.settled();
        await h.app.camera("Fit");
        await h.app.settled();
        await h.park({ x: 1430, y: 700 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const mode = page.getByRole("button", { name: /^Mode, / });
        const camera = page.getByRole("button", { name: "Camera", exact: true });
        await h.badge("5", { near: mode, label: "3D" });
        await h.click(mode);
        await h.click(page.getByRole("menuitemradio", { name: "3D", exact: true }));
        await h.waitFor(page.getByRole("button", { name: "Mode, 3D" }));
        h.mark("3D");
        await h.move({ x: 1560, y: 900, width: 80, height: 60 }); // off the drawing while it lifts
        await h.app.settled();
        h.mark("settled");
        await h.shortcut("0", { near: camera, label: "Fit" });
        await h.app.settled();
        await h.shortcut("9", { near: camera, label: "Auto-rotate" });
        h.mark("turning");
    },
    holdMs: 3000,
};
