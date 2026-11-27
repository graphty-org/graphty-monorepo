// Round 2, clip 6.3: transfers.csv (from, to, amount, time) opened from the drawn Open dialog: graphty
// reads from and to as each transfer's ends by itself and draws who pays whom; the Data panel shows the two
// columns it picked, each a list to change.
import { BANK_FILES, FILES_CLIP, FROM_START, openFromStart, REST } from "./files.js";

export default {
    id: "spreadsheet",
    ...FILES_CLIP,
    ...FROM_START,
    tag: "Synthetic data",
    caption: "A spreadsheet becomes a network",
    async run(h) {
        const { page } = h;
        await openFromStart(h, h.file("round2/transfers.csv"), BANK_FILES);
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b43 nodes\b/ }));
        h.mark("drawn");
        // the hand waits for the Force layout to be still, so the cut can drop the settle
        await h.app.settled();
        h.mark("settled");
        // the Data panel no longer names the two columns it picked as the ends (no Source and
        // Target lists since the 2026-11 Data panel): the clip shows the panel's Edges row instead
        await h.click(page.getByRole("button", { name: "Data", exact: true }));
        const edges = page.getByRole("button", { name: "Add to edge attributes" });
        await h.waitFor(edges);
        await h.hover(page.getByRole("combobox", { name: "Direction" }), 600);
        h.mark("ends shown");
        await h.move(REST);
    },
    holdMs: 1800,
};
