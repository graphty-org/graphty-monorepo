// Round 2, clip 2.3 (bulk editing): the find box, "Approved"; the Values row "Select where drugStage
// is Approved (16)": the 16 proteins an approved drug targets are selected at once.
import { ALZ_CLIP, alzHull } from "./alz.js";

export default {
    id: "bulk-select",
    ...ALZ_CLIP,
    caption: "Select all 16 approved-drug targets",
    async setup(h) {
        await alzHull(h);
        await h.park({ x: 600, y: 420 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("combobox", { name: "Find" }));
        await h.type("Approved");
        const list = page.getByRole("listbox", { name: "Find results" });
        await h.waitFor(list);
        // the 16 protein rows come first; the Values row is below them
        await h.scroll(list, 1200);
        await h.click(page.getByRole("option", { name: /^Select where drugStage is Approved/ }));
        await h.waitFor(page.getByRole("treeitem", { name: /^Selected, .*\b16 nodes\b/ }));
        await h.move({ x: 1760, y: 760, width: 80, height: 60 });
        h.mark("16 selected");
    },
    holdMs: 2200,
};
