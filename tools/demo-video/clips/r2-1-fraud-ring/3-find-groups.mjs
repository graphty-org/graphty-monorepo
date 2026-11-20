// Round 2, clip 1.3: Analyze, Louvain, Run: each circle of accounts takes its own color.
import { analyzeOnCamera, BANK_CLIP, bank2D } from "./bank.js";

export default {
    id: "find-groups",
    ...BANK_CLIP,
    caption: "Color accounts by community",
    async setup(h) {
        await bank2D(h);
        await h.park({ x: 1010, y: 830 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await analyzeOnCamera(h, "louv", "Louvain");
        await h.waitFor(page.getByText("Color: Louvain"));
        await h.move({ x: 1560, y: 880, width: 100, height: 60 }); // off the drawing so the colors read
        h.mark("communities colored");
    },
    holdMs: 2000,
};
