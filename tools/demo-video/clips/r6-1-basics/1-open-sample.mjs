// Round 6, basics 1: the start page's sample library, the Les Miserables card; the
// network opens in 3D and settles into shape.
import { BASICS_CLIP, REST } from "./basics.js";

export default {
    id: "basics-open-sample",
    ...BASICS_CLIP,
    caption: "Open a sample network",
    async setup(h) {
        const { page } = h;
        await page.getByRole("button", { name: "Samples", exact: true }).click();
        await page.getByRole("searchbox", { name: "Search samples" }).waitFor();
        await h.app.frames(30); // the scroll to the library has finished
        await h.park({ x: 1300, y: 700 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        // the card itself: a click on a filter (Social) made the page jump
        await h.click(page.getByRole("button", { name: /^Open the Les Miserables sample/ }).last());
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes\b/ }));
        h.mark("opened");
        await h.move(REST); // off the graph while it settles
        await h.app.settled();
        h.mark("settled");
    },
    holdMs: 1800,
};
