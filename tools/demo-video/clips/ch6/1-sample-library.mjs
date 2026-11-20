// Chapter 6, clip 1: the Samples search leaves one tile; it opens the airline routes.
import { drawn } from "./map.js";

export default {
    id: "sample-library",
    chapter: 6,
    caption: "No data of your own? Open the world's airline routes.",
    async setup(h) {
        const { page } = h;
        // Samples brings the start page's Sample library into view (the page still jumps as the results
        // narrow: an app defect)
        await page.getByRole("button", { name: "Samples", exact: true }).click();
        await page.getByRole("searchbox", { name: "Search samples" }).waitFor();
        await h.app.frames(30); // the scroll to the library has finished
        await h.park({ x: 1300, y: 700 });
    },
    async run(h) {
        const { page } = h;
        // Samples brings the start page's Sample library into view; its search box and tiles are on the page
        await h.click(page.getByRole("searchbox", { name: "Search samples" }));
        await h.type("airline");
        await h.pause(250);
        await h.click(page.getByRole("button", { name: /^Open the OpenFlights airline routes sample/ }).last());
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b3,214 nodes\b/ }));
        await drawn(page); // the tangled ball is on the canvas
        h.mark("opened");
        await h.app.frames(10); // a few calm frames, so the move below is filmed smoothly
        await h.move({ x: 1460, y: 830, width: 120, height: 80 }); // off the graph while it untangles
    },
    holdMs: 2000,
};
