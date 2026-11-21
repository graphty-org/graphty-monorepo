// Round 3, intro shot 5, cut full-bleed: the bank's accounts as 3D person models in their community
// colors, turning (Auto-rotate, key 9) so they read as objects, not icons.
import { RING_ADDRESS, zoomToward } from "../r2-1-fraud-ring/bank.js";
import { inspector } from "../r2-5b-and-more/more.js";
import { bankIntro, INTRO_CLIP, TURNING } from "./intro.js";

export default {
    id: "intro-models",
    ...INTRO_CLIP,
    caption: "3D models",
    tag: "Synthetic data",
    async setup(h) {
        const { page } = h;
        await bankIntro(h, { flat: false });
        await h.app.camera("Fit");
        await h.app.settled();
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await inspector(page).getByRole("tab", { name: "Style" }).click();
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
        await inspector(page)
            .getByRole("combobox", { name: /^Node shape, / })
            .click();
        await page
            .getByRole("listbox", { name: /^Node shape, / })
            .getByRole("option", { name: "Model..." })
            .click();
        await page.getByRole("dialog", { name: "Models" }).getByRole("button", { name: "Person" }).click();
        await page.getByRole("combobox", { name: /^Node shape, Person/ }).waitFor();
        // a model is drawn far smaller than the sphere it replaces (an app defect): size it up
        const size = inspector(page).getByRole("spinbutton", { name: "Node size" });
        await size.fill("6");
        await size.press("Enter");
        await size.blur();
        await zoomToward(h, RING_ADDRESS, 3);
        await h.park({ x: -10, y: -10 });
    },
    ...TURNING,
};
