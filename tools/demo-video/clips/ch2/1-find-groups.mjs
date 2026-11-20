// Chapter 2, clip 1: Louvain from the Analyze list recolors the graph by group.
import { stage } from "./stage.js";

export default {
    id: "find-groups",
    chapter: 2,
    caption: "Find groups: characters who mostly link to each other.",
    small: "Louvain method, as in Gephi",
    dataset: "Les Miserables",
    async setup(h) {
        await stage(h);
        await h.park({ x: 1010, y: 830 });
    },
    leadMs: 500,
    holdMs: 1800,
    async run(h) {
        const { page } = h;
        await h.click("Analyze");
        await h.type("Louvain"); // Analyze opens with the cursor in Filter analyses
        await h.click(page.getByRole("option", { name: "Louvain", exact: true }));
        await h.click(page.getByRole("button", { name: "Run Louvain" }));
        await h.waitFor(page.getByText("Color: Louvain"));
        await h.move({ x: 1460, y: 900, width: 120, height: 60 }); // off the graph so the colors read
        h.mark("groups drawn");
    },
};
