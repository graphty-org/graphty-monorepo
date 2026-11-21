// Round 2, clip 2.4 (bulk editing): the 16 selected proteins become one layer; one color and one
// size, and all 16 change together.
import { tap } from "../r2-1-fraud-ring/bank.js";
import { ALZ_CLIP, alz2D, alzSelectApproved, TARGET_COLOR, TARGET_SIZE } from "./alz.js";

export default {
    id: "bulk-style",
    ...ALZ_CLIP,
    caption: "Restyle all 16 drug targets at once",
    async setup(h) {
        await alz2D(h); // plain colors: selecting and styling come before algorithms
        await alzSelectApproved(h);
        await h.page.getByRole("combobox", { name: "Find" }).press("Escape");
        await h.park({ x: 1400, y: 960 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await h.rightClick({ x: 1560, y: 975 }); // empty canvas
        await tap(h, page.getByRole("menuitem", { name: "New layer from selection" }));
        await tap(h, insp.getByRole("button", { name: "Add to node fill" }));
        await tap(h, page.getByRole("menuitem", { name: "Color", exact: true }));
        await tap(h, insp.getByRole("textbox", { name: /^Node color, / }));
        await h.type(TARGET_COLOR);
        await h.press("Enter");
        await tap(h, insp.getByRole("button", { name: "Add to node shape" }));
        await tap(h, page.getByRole("menuitem", { name: "Size", exact: true }));
        await tap(h, insp.getByRole("spinbutton", { name: "Node size" }));
        await page.keyboard.press("Control+A"); // type over the 1
        await h.type(TARGET_SIZE);
        await h.press("Enter");
        await h.move({ x: 1760, y: 760, width: 80, height: 60 });
        h.mark("16 restyled");
    },
    holdMs: 3000,
};
