// Round 2, clip 5.3: the edges translucent but with Blending Off (each drawn solid over the last);
// Blending On lets overlapping edges add up, so the solid mass turns see-through and the communities
// show inside it.
import { BIG_CLIP, bioplex, lineSheet, REST } from "./big.js";

export default {
    id: "blend-glow",
    ...BIG_CLIP,
    caption: "Blend edges to see inside",
    async setup(h) {
        await bioplex(h, { blending: "Off" });
        await h.park({ x: 1600, y: 600 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Edge line settings" }));
        const d = lineSheet(page);
        await h.click(d.getByRole("combobox", { name: /^Edge blending/ }));
        await h.click(page.getByRole("option", { name: "On", exact: true }));
        await h.click(d.getByRole("button", { name: "Close Edge line" }));
        h.mark("blended");
        await h.move(REST);
        await h.app.settled();
    },
    holdMs: 1800,
};
