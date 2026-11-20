// Chapter 8, clip 4: find an actor, select them, and Jump to selection snaps the window to their
// years (Chadwick Boseman: 2016-2019), so the graph shrinks to those films. The Selected layer is
// styled big and red in setup, so the chosen actor stands out.
import { marvel2D, refit, styleSelected } from "./setup.js";

export default {
    id: "actor-years",
    chapter: 8,
    caption: "Pick an actor: see only the years of their films.",
    dataset: "Marvel films",
    async setup(h) {
        await marvel2D(h);
        await styleSelected(h);
        await refit(h);
        await h.park({ x: 420, y: 230 }); // near the find box
    },
    async run(h) {
        const { page } = h;
        const dock = page.getByRole("region", { name: "Timeline" });
        const find = page.getByPlaceholder("Find nodes, edges, values");
        await h.click(find);
        await h.type("Chad");
        await h.click(page.getByText("name: Chadwick Boseman"));
        await h.click(dock.getByRole("button", { name: "Jump to selection" }));
        await h.waitFor(dock.getByRole("button", { name: /^Time window .*2016/ }));
        // the hand stays on the dock, below the graph, for the hold
        h.mark("jumped");
    },
    holdMs: 1500,
};
