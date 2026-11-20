// "And more", beat 6: bulk editing of layers. In Style layers, the Louvain folder open; the hand clicks
// one community's layer and Shift+clicks another; the inspector edits both as "2 layers", and one
// Node size change makes both communities larger.
import { alzLouvain, ALZ_CLIP } from "../r2-2-alzheimer/alz.js";
import { hideLegend, inspector, MORE, REST } from "./more.js";

export default {
    id: "bulk-layers",
    ...ALZ_CLIP,
    chapter: MORE,
    caption: "Edit many layers at once",
    async setup(h) {
        const { page } = h;
        await alzLouvain(h);
        await hideLegend(page);
        // the Louvain folder opened, so its community layers are listed
        const folder = page.getByRole("treeitem", { name: /^Louvain, / });
        await folder.click();
        await page.keyboard.press("ArrowRight");
        await page.getByRole("treeitem", { name: /^Group 2, / }).waitFor();
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await h.park({ x: 600, y: 700 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        const g1 = page.getByRole("treeitem", { name: /^Group 1, / });
        const g2 = page.getByRole("treeitem", { name: /^Group 2, / });
        await h.click(g1.getByText("Group 1", { exact: true }));
        await h.badge("Shift", { near: g2, label: "Add to selection" });
        await page.keyboard.down("Shift");
        await h.click(g2.getByText("Group 2", { exact: true }));
        await page.keyboard.up("Shift");
        await h.waitFor(inspector(page).getByRole("heading", { name: "2 layers" }));
        await h.click(inspector(page).getByRole("button", { name: "Add to node shape" }));
        await h.click(page.getByRole("menuitem", { name: "Size", exact: true }));
        const size = inspector(page).getByRole("spinbutton", { name: "Node size" });
        await h.click(size);
        await h.press("Control+a");
        await h.type("3");
        await h.press("Enter");
        await h.move(REST);
        h.mark("both larger");
    },
    holdMs: 2000,
};
