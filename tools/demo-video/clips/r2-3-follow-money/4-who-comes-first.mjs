// Round 2, clip 3.4: the Table (Shift+T) sorted by Betweenness, highest first: mules, the ring's
// accounts and the collector in Riga head the list (its case column says which).
import { MONEY_CLIP, moneyCase, betweenness, onMap } from "./money.js";

export default {
    id: "who-comes-first",
    ...MONEY_CLIP,
    caption: "Mules, ring and collector rank first",
    async setup(h) {
        await moneyCase(h);
        await onMap(h);
        await betweenness(h);
        await h.park({ x: 1300, y: 900 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const table = page.getByRole("button", { name: "Table", exact: true });
        await h.hover(table, 400);
        await h.shortcut("Shift+T", { near: table, label: "Table" });
        const header = page.getByRole("columnheader", { name: /Betweenness/ });
        await h.waitFor(header);
        const label = header.getByText("Betweenness", { exact: true });
        // the first click sorts lowest first, the second highest first
        await h.click(label);
        await h.click(label);
        await h.waitFor(page.getByRole("row", { name: /\bcollector\b/ }).first());
        await h.move({ x: 1560, y: 330, width: 100, height: 60 }); // beside the top rows, not on them
        h.mark("sorted");
    },
    holdMs: 2500,
};
