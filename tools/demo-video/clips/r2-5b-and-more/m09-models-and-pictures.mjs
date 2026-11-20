// "And more", beat 9: Shape > Model... > Person turns the bank's accounts into figures, then Size 6
// (a model is drawn far smaller than a sphere of the same size; reported). Close in on the ring's
// corner, so the figures are big enough to see.
import { BANK_CLIP, bankLouvain, RING_ADDRESS, zoomToward } from "../r2-1-fraud-ring/bank.js";
import { inspector, MORE, REST } from "./more.js";

export default {
    id: "models-and-pictures",
    ...BANK_CLIP,
    chapter: MORE,
    caption: "3D models as nodes",
    async setup(h) {
        const { page } = h;
        await bankLouvain(h);
        await zoomToward(h, RING_ADDRESS, 5);
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await inspector(page).getByRole("tab", { name: "Style" }).click();
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
        await h.park({ x: 1250, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.click(inspector(page).getByRole("combobox", { name: /^Node shape, / }));
        // the list holds dozens of shapes; Model... is last: scroll it into the list's view
        const list = page.getByRole("listbox", { name: /^Node shape, / });
        const model = list.getByRole("option", { name: "Model..." });
        await h.waitFor(list);
        const [lb, ob] = [await list.boundingBox(), await model.boundingBox()];
        await h.scroll(list, Math.round(ob.y + ob.height - (lb.y + lb.height) + 40), { ms: 600 });
        await h.app.frames(20); // the list's smooth scroll has ended
        await h.click(model);
        await h.click(page.getByRole("dialog", { name: "Models" }).getByRole("button", { name: "Person" }));
        await h.waitFor(page.getByRole("combobox", { name: /^Node shape, Person/ }));
        // a model is drawn far smaller than the sphere it replaces (an app defect): size it up
        const size = inspector(page).getByRole("spinbutton", { name: "Node size" });
        await h.click(size);
        await h.press("Control+a");
        await h.type("6");
        await h.press("Enter");
        await h.move(REST);
        h.mark("figures");
    },
    holdMs: 2500,
};
