// Round 2, clip 7.4: the tab is closed (Ctrl+W) and graphty opened again: the case is back as it
// was, from the browser's own storage. Wide, no push-in: it leads into the outro.
import { appUrl } from "../../lib/env.mjs";
import { bankCase, CASE_CLIP } from "./case.js";

export default {
    id: "keeps-your-work",
    ...CASE_CLIP,
    caption: "Close the tab. Your work stays.",
    async setup(h) {
        h.reopen = h.page.url();
        await bankCase(h);
        await h.park({ x: 1180, y: 760 });
    },
    leadMs: 800,
    async run(h) {
        const { page } = h;
        await h.pause(700);
        // Ctrl+W closes a tab in a person's browser; the recorded page has no tab strip, so the
        // badge says it and the page is left (an empty tab) the way closing does
        await h.badge("Ctrl+W", { label: "Close tab", badgeMs: 1200 });
        await h.pause(1200);
        await page.goto("about:blank");
        h.mark("closed");
        await h.pause(1200);
        await page.goto(h.reopen ?? appUrl(new URL(page.url()).origin + "/"));
        h.mark("reopened");
        await h.badge("", { label: "Open graphty again", badgeMs: 1600 });
        await h.waitFor(page.getByRole("treeitem", { name: /^Fraud ring, / }));
        await h.app.settled();
        await h.move({ x: 1560, y: 880, width: 100, height: 60 }); // the hand comes back, off the drawing
        h.mark("case back");
    },
    holdMs: 2500,
};
