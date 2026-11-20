// "And more", beat 5: the bank case (the ring red, the rest pale) with Betweenness sizing the nodes on
// its own layer; the hand clicks a ring account, and the inspector's Why this look lists the layer
// behind each part of its look.
import { BANK_CLIP, nodeBox, RING_ACCOUNT, zoomToward } from "../r2-1-fraud-ring/bank.js";
import { bankCase, betweenness, sizeBy } from "../r2-3-follow-money/money.js";
import { inspector, MORE } from "./more.js";

let account;

export default {
    id: "legend-and-why",
    ...BANK_CLIP,
    chapter: MORE,
    caption: "Every style, explained",
    async setup(h) {
        const { page } = h;
        await bankCase(h);
        await betweenness(h);
        // Betweenness colors every node by default; here it sizes them, so the ring stays red
        await page.getByRole("treeitem", { name: /^Betweenness, / }).click();
        await inspector(page).getByRole("tab", { name: "Style" }).click();
        await page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Node/ }).click();
        await page.getByRole("button", { name: "Remove node color" }).click();
        await sizeBy(h, "Betweenness", 4);
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        await zoomToward(h, RING_ACCOUNT, 3);
        account = await nodeBox(h, RING_ACCOUNT);
        await h.park({ x: 1250, y: 860 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(account);
        await h.click(inspector(page).getByRole("tab", { name: "Style", exact: true }));
        const why = inspector(page).getByRole("group", { name: "Why this look" });
        await h.waitFor(why);
        const lines = await why.getByRole("list").boundingBox();
        await h.move({ x: lines.x - 34, y: lines.y + lines.height / 2 - 8, width: 16, height: 16 });
        h.mark("why shown");
    },
    holdMs: 2500,
};
