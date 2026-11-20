// Chapter 2, clip 3: the Table dock, sorted by Betweenness, puts Valjean on top.
import { analyze, stage } from "./stage.js";

export default {
    id: "who-comes-first",
    chapter: 2,
    caption: "Every character in a table: Valjean ranks first.",
    dataset: "Les Miserables",
    async setup(h) {
        await stage(h);
        await analyze(h, "brokers", "Betweenness");
        await h.park({ x: 1300, y: 900 });
    },
    leadMs: 500,
    holdMs: 1800,
    async run(h) {
        const { page } = h;
        const table = page.getByRole("button", { name: "Table", exact: true });
        await h.hover(table, 400);
        await h.shortcut("Shift+T", { near: table, label: "Table" });
        const header = page.getByRole("columnheader", { name: /Betweenness/ });
        await h.click(header.getByText("Betweenness", { exact: true }));
        await h.waitFor(page.getByRole("row", { name: /^Valjean Valjean / }));
        await h.move({ x: 1180, y: 760, width: 160, height: 60 }); // beside the top rows, not on them
        h.mark("sorted");
    },
};
