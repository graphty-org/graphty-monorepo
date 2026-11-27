// Chapter 8, Data management: the Les Miserables network; the hand opens the Table (every node a row),
// switches to Edges (every edge a row) and clicks shared_chapters, which sorts the edges by it.
import { flat, REST } from "./data.js";

export default {
    id: "data-table",
    chapter: 8,
    caption: "Every node and edge, a row",
    dataset: "Les Miserables",
    async setup(h) {
        await flat(h);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click("Table");
        await h.waitFor(page.getByRole("grid", { name: "Nodes" }));
        await h.pause(500);
        await h.click(page.getByRole("tab", { name: /^Edges/ }).first());
        const grid = page.getByRole("grid", { name: "Edges" });
        await h.waitFor(grid);
        await h.click(grid.getByRole("button", { name: "number shared_chapters", exact: true }));
        await h.waitFor(grid.getByRole("button", { name: /^shared_chapters, sorted/ }));
        await h.move(REST); // off the header, so its tooltip does not cover the top row
        h.mark("sorted");
    },
    holdMs: 2000,
};
