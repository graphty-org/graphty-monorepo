// Round 6, basics 9: the saved project, opened again from the start page (Open a file, the drawn
// Open dialog, the file saved in clip 8's way): it comes back as it was left: 3D, the circle, the
// community colors and the bigger nodes.
import { BASICS_DATA, keepDownload, lifted, REST } from "./basics.js";

export default {
    id: "basics-reopen",
    ...BASICS_DATA,
    caption: "Reopen it just as you left it",
    async setup(h) {
        const { page } = h;
        await lifted(h);
        const saved = keepDownload(page);
        await page.getByRole("button", { name: "Main menu" }).click();
        await page.getByRole("menuitem", { name: "Save local copy..." }).click();
        h.file = await saved;
        await page.getByRole("menu").waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "Main menu" }).click();
        await page.getByRole("menuitem", { name: "Back to start" }).click();
        // a local copy is not a save in this browser, so the app asks first
        await page.getByRole("button", { name: "Discard", exact: true }).click();
        await page.getByRole("button", { name: /^Open a file/ }).waitFor();
        await h.app.frames(30);
        await h.park({ x: 1380, y: 760 });
    },
    leadMs: 600,
    async run(h) {
        const { page } = h;
        await h.openFile(page.getByRole("button", { name: /^Open a file/ }), h.file, {
            folder: "Downloads",
            files: ["Les Miserables.graphty.json", "chapter-notes.txt", "characters.csv", "IMG_2041.jpg"],
        });
        await h.waitFor(page.getByRole("treeitem", { name: /^Rule: graphty\.degree >= 10, / }));
        h.mark("opened");
        await h.move(REST);
        await h.app.settled();
        h.mark("back as left");
    },
    holdMs: 2200,
};
