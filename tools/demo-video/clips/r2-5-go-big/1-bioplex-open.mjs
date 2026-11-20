// Round 2, clip 5.1: BioPlex 3.0 drawn whole on the dark canvas; the hand opens the Graph overview
// (10,251 nodes, 75,346 edges) and points at the status bar's "WebGPU: enabled".
import { BIG_CLIP, bioplex, inspector } from "./big.js";

export default {
    id: "bioplex-open",
    ...BIG_CLIP,
    caption: "10,251 human proteins, drawn at once",
    async setup(h) {
        await bioplex(h);
        await h.park({ x: 1150, y: 860 });
    },
    leadMs: 600,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: /^Graph bioplex/ }));
        await h.click(inspector(page).getByRole("tab", { name: "Values" }));
        await h.waitFor(inspector(page).getByText("10,251", { exact: true }));
        await h.pause(700);
        // rest just right of the status bar's WebGPU chip, so the cursor covers none of its words
        const chip = await page.getByRole("contentinfo", { name: "Status" }).getByText("WebGPU: enabled").boundingBox();
        await h.move({ x: chip.x + chip.width + 14, y: chip.y, width: 12, height: chip.height });
        h.mark("counts shown");
    },
    holdMs: 2000,
};
