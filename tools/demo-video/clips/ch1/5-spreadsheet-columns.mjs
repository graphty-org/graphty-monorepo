// Chapter 1, clip 5: a CSV of who links to whom, dropped on the start page, draws at once; the Data
// panel shows the two columns it read as the links' ends.
import { DROP } from "./setup.js";

export default {
    id: "spreadsheet-columns",
    chapter: 1,
    caption: "A spreadsheet works too: it finds which columns connect.",
    async setup(h) {
        await h.park({ x: -60, y: 620 });
    },
    async run(h) {
        const { page } = h;
        await h.dropFile(h.file("les-miserables-links.csv"), DROP);
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes?\b/ }));
        h.mark("graph drawn");
        await h.pause(600);
        await h.click(page.getByRole("button", { name: "Data", exact: true }));
        await h.waitFor(page.getByRole("combobox", { name: "Source" }));
        await h.hover(page.getByRole("combobox", { name: "Target" }), 500);
        h.mark("ends shown");
    },
};
