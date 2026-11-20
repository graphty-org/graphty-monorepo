// Round 2, clip 6.5: a graph file's web address pasted on the start page (Ctrl+V) opens it.
import { FILES_CLIP, REST } from "./files.js";

const URL = "https://graphty.app/samples/les-miserables.gml";

export default {
    id: "paste-link",
    ...FILES_CLIP,
    caption: "Or paste a link",
    async setup(h) {
        const { page } = h;
        // the reader copied the link: the system clipboard holds it (not the app's state)
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
            origin: new globalThis.URL(page.url()).origin,
        });
        await page.evaluate((u) => navigator.clipboard.writeText(u), URL);
        await h.park({ x: 1180, y: 700 });
    },
    leadMs: 500,
    async run(h) {
        // the badge is up a moment before the key, so it is read on the start page: the paste opens
        // the graph at once
        await h.badge("Ctrl+V", { label: "Paste a link", badgeMs: 1600 });
        await h.pause(700);
        await h.press("Control+V");
        await h.waitFor(h.page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes?\b/ }));
        h.mark("graph drawn");
        await h.move(REST, { slow: 1.3 });
    },
    holdMs: 1800,
};
