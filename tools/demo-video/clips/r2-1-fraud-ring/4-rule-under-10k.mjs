// Round 2, clip 1.4: the find box takes a rule: =amount >= 9000, Enter. The 53 transfers of $9,000
// or more light up, nearly all inside one small community in the middle of the drawing.
import { BANK_CLIP, bankLouvain, typeInFind } from "./bank.js";

export default {
    id: "rule-under-10k",
    ...BANK_CLIP,
    caption: "Find payments of $9,000 or more",
    async setup(h) {
        await bankLouvain(h);
        await h.park({ x: 600, y: 420 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await typeInFind(h, "=amount >= 9000");
        await h.press("Enter");
        await h.waitFor(page.getByText("53 edges selected").first());
        await h.move({ x: 1250, y: 880, width: 100, height: 60 }); // off the highlighted edges
        h.mark("transfers highlighted");
    },
    holdMs: 2600,
};
