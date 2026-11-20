// Round 2, clip 2.2: the Hull shader in its Outline look, grouped by Louvain: a line around each
// community, in its color. Setup adds the Hull and picks Outline, so the clip opens on one thin
// line around the whole graph: adding it on camera showed the default Goo look as one brown blob over
// the graph for about 3 s. The one action on camera is Group by > Louvain, which splits that line into
// one outline per community.
import { tap } from "../r2-1-fraud-ring/bank.js";
import { ALZ_CLIP, alzLouvain, everythingNodes } from "./alz.js";

export default {
    id: "shape-around-groups",
    ...ALZ_CLIP,
    caption: "Outline each community",
    async setup(h) {
        const { page } = h;
        await alzLouvain(h);
        await everythingNodes(h);
        await page.getByRole("button", { name: "Add to node shaders" }).click();
        await page.getByRole("textbox", { name: "Find node shader" }).fill("hull");
        await page.getByRole("button", { name: "Hull", exact: true }).click();
        await page.getByRole("button", { name: "Hull settings" }).click();
        await page.getByRole("combobox", { name: "Look" }).click();
        await page.getByRole("option", { name: "Outline", exact: true }).click();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Group by None" }).waitFor();
        await h.app.settled();
        await h.park({ x: 1500, y: 760 });
    },
    leadMs: 600,
    async run(h) {
        const { page } = h;
        await h.click("Group by None");
        await tap(h, page.getByRole("option", { name: /^Louvain, / }));
        await h.waitFor(page.getByRole("button", { name: "Group by Louvain" }));
        await h.move({ x: 1760, y: 820, width: 80, height: 60 });
        h.mark("communities outlined");
    },
    holdMs: 3000,
};
