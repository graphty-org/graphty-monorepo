// Round 2, clip 1.6 (bulk editing): the address and its twelve accounts become one layer, named
// "Fraud ring" and colored red in one edit: all 13 nodes change together.
import {
    BANK_CLIP,
    bankNeighborhood,
    bankRule,
    RING_ADDRESS,
    RING_COLOR,
    RING_LAYER,
    tap,
    zoomToward,
} from "./bank.js";

export default {
    id: "point-out-group",
    ...BANK_CLIP,
    caption: "Mark the ring as one layer",
    async setup(h) {
        await bankRule(h);
        await zoomToward(h, RING_ADDRESS, 6);
        await bankNeighborhood(h);
        await h.park({ x: 1560, y: 880 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const insp = page.getByRole("complementary", { name: "Inspector" });
        // eight controls in a row: the brisker tap keeps the whole edit near ten seconds
        await tap(h, insp.getByRole("button", { name: "Neighborhood actions" }));
        await tap(h, page.getByRole("menuitem", { name: "New layer from selection" }));
        const layer = page.getByRole("treeitem", { name: /^13 nodes, / });
        await h.rightClick(layer);
        await tap(h, page.getByRole("menuitem", { name: "Rename" }));
        await page.keyboard.press("Control+A"); // the name field opens with its text selected for typing over
        await h.type(RING_LAYER);
        await h.press("Enter");
        await h.waitFor(page.getByRole("treeitem", { name: new RegExp(`^${RING_LAYER}, `) }));
        await tap(h, insp.getByRole("button", { name: "Add to node fill" }));
        await tap(h, page.getByRole("menuitem", { name: "Color", exact: true }));
        await tap(h, insp.getByRole("textbox", { name: /^Node color, / }));
        await h.type(RING_COLOR);
        await h.press("Enter");
        await h.move({ x: 1760, y: 720, width: 80, height: 60 }); // off the drawing, onto the empty inspector
        h.mark("ring red");
    },
    holdMs: 2000,
};
