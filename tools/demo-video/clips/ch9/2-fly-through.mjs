// Chapter 9, clip 2: a video tour of saved cameras, More > Export video..., Record: the camera flies
// behind the dialog while the bar fills, then "Exported les-miserables_fly-through.webm" shows.
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { OUT } from "../../lib/env.mjs";
import { saveCamera, styled } from "./styled.js";

// the tour's stops: [camera, fly in s, stay s]
const STOPS = [
    ["My view", 0, 0],
    ["Side", 1.2, 0.2],
    ["Isometric", 1.2, 0.3],
];

export default {
    id: "fly-through",
    chapter: 9,
    caption: "Make a fly-through video of your graph.",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await styled(h);
        await saveCamera(page, "My view");
        await page.getByRole("button", { name: "New tour" }).click();
        await page.getByRole("textbox", { name: "Rename Tour 1" }).fill("Fly-through");
        await page.keyboard.press("Enter");
        for (const [i, [camera, fly, stay]] of STOPS.entries()) {
            await page.getByRole("button", { name: "Add camera to Fly-through" }).click();
            await page.getByRole("menuitem", { name: camera, exact: true }).click();
            const stop = page.getByRole("region", { name: `Stop ${i + 1}`, exact: true });
            await stop.getByRole("spinbutton", { name: "Fly in" }).fill(String(fly));
            await stop.getByRole("spinbutton", { name: "Stay" }).fill(String(stay));
            await stop.getByRole("spinbutton", { name: "Stay" }).press("Tab");
        }
        await page.getByRole("button", { name: "Collapse Fly-through" }).click();
        await page.getByRole("button", { name: "Go to My view" }).click();
        await h.app.settled();
        // keep the video the app makes, so a cut can show it after this clip
        mkdirSync(join(OUT, "ch9"), { recursive: true });
        page.once("download", (d) => void d.saveAs(join(OUT, "ch9", d.suggestedFilename())));
        await h.park({ x: 250, y: 470 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: "More for Fly-through" }));
        await h.click(page.getByRole("menuitem", { name: "Export video..." }));
        const dialog = page.getByRole("dialog", { name: "Export video" });
        await h.click(dialog.getByRole("button", { name: "Record", exact: true }));
        // the hand waits by the bar while the camera flies; the toast says the file is made
        await h.waitFor(
            page
                .getByRole("status")
                .filter({ hasText: /^Exported / })
                .first(),
        );
        h.mark("exported");
    },
    leadMs: 500,
    holdMs: 1500,
};
