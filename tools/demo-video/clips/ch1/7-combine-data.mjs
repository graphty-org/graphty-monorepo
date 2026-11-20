// Chapter 1, clip 7: a table of characters dropped on the graph opens the Join screen, matching its
// name column to the graph's nodes (77 matched); Join; then the nodes are colored by the new column
// (the volume each character first appears in), and the legend shows it.
import { DROP, openFile, REST } from "./setup.js";

export default {
    id: "combine-data",
    chapter: 1,
    caption: "Add a spreadsheet's columns to the nodes it matches.",
    small: "Then color by the new column: the volume each character first appears in",
    async setup(h) {
        await openFile(h, h.file("les-miserables-links.csv"));
        await h.app.settled();
        await h.park({ x: -60, y: 620 });
    },
    async run(h) {
        const { page } = h;
        await h.dropFile(h.file("les-miserables-characters.csv"), DROP);
        const matched = page.getByText("77 matched", { exact: true });
        await h.waitFor(matched);
        await h.hover(matched, 700);
        await h.click(page.getByRole("button", { name: "Join", exact: true }));
        await h.waitFor(page.getByRole("button", { name: "From 2 files" }));
        h.mark("joined");
        await h.click(page.getByRole("treeitem", { name: /^Everything,/ }).getByText("Everything"));
        await h.click(page.getByRole("button", { name: "Node color by attribute" }).first());
        const pick = page.getByRole("dialog", { name: "Node color by attribute" });
        await h.click(pick.getByRole("option", { name: /^first_volume/ }));
        await h.waitFor(page.getByText("Color: first_volume").first());
        h.mark("colored");
        await h.move(REST, { slow: 1.3 });
    },
};
