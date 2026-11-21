// Round 3, chapter 1: the start page's Sample library, the Social filter, the Les Miserables card: a
// small network that draws cleanly (the airline routes opened as a gray disk of 3,214 nodes).
// A click on the filter, not a typed search: the page jumped while a typed search narrowed.
export default {
    id: "sample-library",
    chapter: 1,
    caption: "Or start from a sample",
    async setup(h) {
        const { page } = h;
        await page.getByRole("button", { name: "Samples", exact: true }).click();
        await page.getByRole("searchbox", { name: "Search samples" }).waitFor();
        await h.app.frames(30); // the scroll to the library has finished
        await h.park({ x: 1300, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Social", exact: true }));
        await h.pause(600); // the tiles narrow to social networks
        await h.click(page.getByRole("button", { name: /^Open the Les Miserables sample/ }).last());
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes\b/ }));
        h.mark("opened");
        await h.move({ x: 1460, y: 830, width: 120, height: 80 }); // off the graph while it untangles
        await h.app.settled();
        h.mark("drawn");
    },
    holdMs: 2000,
};
