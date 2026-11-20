// Chapter 9, clip 4: the styled project is saved with Main menu > Save local copy..., then the file is
// dropped on a graphty that has never seen it (a colleague's browser) and opens with its results and
// its saved camera, shown in the Views place.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { appUrl, OUT } from "../../lib/env.mjs";
import * as app from "../../lib/app.mjs";
import { saveCamera, styled } from "./styled.js";

export default {
    id: "send-project",
    chapter: 9,
    caption: "Send the whole project to a colleague.",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        const here = new URL(page.url());
        // The colleague's browser: the same app under "localhost", another origin with its own empty
        // storage. Visited once now to answer the first-visit usage question off camera.
        h.colleague = appUrl(`${here.protocol}//localhost:${here.port}/`);
        await page.goto(h.colleague);
        await app.start(page);
        await page.goto(appUrl(here.origin + "/"));
        await app.opened(page);
        await app.closeToast(page);
        await styled(h, { size: false }); // see styled.js: a sized project reopens with nodes missing
        await saveCamera(page, "My view");
        await page.getByRole("button", { name: "Graph", exact: true }).click();
        mkdirSync(join(OUT, "ch9"), { recursive: true });
        h.saved = page.waitForEvent("download").then(async (d) => {
            const file = join(OUT, "ch9", d.suggestedFilename());
            await d.saveAs(file);
            return file;
        });
        await h.park({ x: 170, y: 190 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "Main menu" }));
        await h.click(page.getByRole("menuitem", { name: "Save local copy...", exact: true }));
        const file = await h.saved;
        await h.pause(300);
        // the colleague opens graphty
        await page.goto(h.colleague);
        await page.getByRole("button", { name: /^Open a file/ }).waitFor();
        // aimed low on the left, so the file chip beside the hand stays clear of "Drop to open"
        await h.dropFile(file, { x: 180, y: 820, width: 160, height: 100 });
        await h.waitFor(page.getByRole("region", { name: "Legend" }).getByRole("group", { name: "Color: Louvain" }));
        // its saved camera came too
        await h.click(page.getByRole("button", { name: "Views", exact: true }));
        await h.waitFor(page.getByRole("button", { name: "More for My view" }));
        h.mark("project open");
    },
    leadMs: 500,
    holdMs: 1500,
};
