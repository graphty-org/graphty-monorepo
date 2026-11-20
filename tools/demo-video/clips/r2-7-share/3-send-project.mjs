// Round 2, clip 7.3: Main menu > Export..., Project, Export; then a colleague's graphty (another
// origin, its own empty storage) opens the file through Open a file: the case comes back as styled,
// at its own positions. (Main menu > Save local copy... is not used: its file reopens by re-running
// the layout and the analyses, with the hidden layers shown and the ring layer empty; an app
// defect, reported with the chapter 7 takes.)
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";

import * as app from "../../lib/app.mjs";
import { appUrl, OUT } from "../../lib/env.mjs";
import { bankCase, CASE_CLIP } from "./case.js";

export default {
    id: "send-project",
    ...CASE_CLIP,
    caption: "Send the whole case to a colleague",
    async setup(h) {
        const { page } = h;
        const here = new URL(page.url());
        // the colleague's browser: the same app under "localhost", another origin with its own
        // empty storage; visited once now to answer the first-visit usage question off camera
        h.colleague = appUrl(`${here.protocol}//localhost:${here.port}/`, "", CASE_CLIP.featuresOff);
        await page.goto(h.colleague);
        await app.start(page);
        await page.goto(here.href);
        await page.getByRole("button", { name: /^Open a file/ }).waitFor();
        await bankCase(h);
        mkdirSync(join(OUT, "share"), { recursive: true });
        h.saved = page.waitForEvent("download").then(async (d) => {
            const file = join(OUT, "share", d.suggestedFilename());
            await d.saveAs(file);
            return file;
        });
        await h.park({ x: 170, y: 190 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Main menu" }));
        await h.click(page.getByRole("menuitem", { name: "Export..." }));
        const dialog = page.getByRole("dialog", { name: "Export" });
        await h.click(dialog.getByRole("row", { name: "Project" }));
        await h.click(dialog.getByRole("button", { name: "Export", exact: true }));
        const file = await h.saved;
        await h.pause(600);
        // the colleague's graphty
        await page.goto(h.colleague);
        const open = page.getByRole("button", { name: /^Open a file/ });
        await open.waitFor();
        // nothing else on screen says whose browser this is
        await h.badge("", { near: open, label: "A colleague's browser", badgeMs: 2200 });
        await h.pause(1200);
        await h.openFile(open, file, {
            folder: "Downloads",
            files: ["Q3 report.pdf", basename(file), "transfers.csv", "IMG_2041.jpg", "notes.txt"],
        });
        await h.waitFor(page.getByRole("treeitem", { name: /^Fraud ring, / }));
        await h.app.settled();
        await h.move({ x: 1560, y: 880, width: 100, height: 60 }); // off the drawing
        h.mark("case open");
    },
    holdMs: 2500,
};
