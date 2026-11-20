// Chapter 1, clip 4: a graph file's web address pasted on the start page opens it.
import { REST } from "./setup.js";

const URL = "https://graphty.app/samples/les-miserables.gml";

export default {
    id: "paste-link",
    chapter: 1,
    caption: "Or paste a link to a graph file.",
    small: URL,
    async setup(h) {
        const { page } = h;
        // the reader copied the link: the system clipboard holds it (not the app's state)
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
            origin: new globalThis.URL(page.url()).origin,
        });
        await page.evaluate((u) => navigator.clipboard.writeText(u), URL);
        await h.park({ x: 1180, y: 700 });
    },
    async run(h) {
        await h.pause(300);
        await h.shortcut("Control+V", { label: "Paste" });
        await h.waitFor(h.page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes?\b/ }));
        h.mark("graph drawn");
        await h.pause(400);
        await h.move(REST, { slow: 1.3 });
    },
};
