// Chapter 5, Algorithms: Analyze opens on the Les Miserables network and the list scrolls past its
// three groups: ranking (centrality, and Most flow), finding groups (communities) and paths and edge
// sets (paths, Weakest cut, link prediction). The menu lists 33 analyses, not counting its three Run
// all rows (the start page's fact bar also says 33); the outline's "60+" counts the algorithms
// package, not this menu, so the caption says 33. The hand rests on the list's scroll bar, off the
// names, so no hover tooltip covers them.
import { flat } from "./data.js";

export default {
    id: "data-algorithms-menu",
    chapter: 5,
    caption: "33 algorithms in one menu",
    dataset: "Les Miserables",
    async setup(h) {
        await flat(h);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click("Analyze");
        const list = page.getByRole("listbox", { name: "Analyses" });
        await h.waitFor(list);
        const b = await list.boundingBox();
        const bar = { x: b.x + b.width - 9, y: b.y + b.height * 0.35, width: 4, height: b.height * 0.3 };
        await h.move(bar);
        await h.pause(700);
        h.mark("centrality");
        await h.scroll(bar, 420, { ms: 1000 });
        await h.pause(900);
        h.mark("communities");
        await h.scroll(bar, 600, { ms: 1000 });
        await h.pause(900);
        h.mark("paths");
    },
    holdMs: 1800,
};
