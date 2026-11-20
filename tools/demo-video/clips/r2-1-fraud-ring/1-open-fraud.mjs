// Round 2, clip 1.1: the start page's Open a file; the drawn Open dialog shows the "Bank case" folder;
// the hand picks fraud-network.json and clicks Open; the bank's network draws.
import { BANK, BANK_CLIP, BANK_FOLDER } from "./bank.js";

export default {
    id: "open-fraud",
    ...BANK_CLIP,
    caption: "Open three months of bank transfers",
    async setup(h) {
        await h.park({ x: 1380, y: 760 });
    },
    leadMs: 600,
    async run(h) {
        const { page } = h;
        await h.openFile(page.getByRole("button", { name: /^Open a file/ }), h.file(BANK), BANK_FOLDER);
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b623 nodes\b/ }));
        h.mark("network drawn");
        await h.move({ x: 1560, y: 900, width: 80, height: 60 }); // the hand steps off the drawing
    },
    holdMs: 1500, // cut on the drawing: the next clip settles it
};
