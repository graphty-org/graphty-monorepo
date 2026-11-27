// Round 6, basics 8: Main menu > Save local copy... writes the project to a file (Les
// Miserables.graphty.json); the badge names the file the browser saved (headless pages show no
// download bar).
import { BASICS_DATA, keepDownload, lifted, REST } from "./basics.js";

export default {
    id: "basics-save",
    ...BASICS_DATA,
    caption: "Save the project as a file",
    async setup(h) {
        await lifted(h);
        h.saved = keepDownload(h.page);
        await h.park({ x: 520, y: 380 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const menu = page.getByRole("button", { name: "Main menu" });
        await h.click(menu);
        await h.click(page.getByRole("menuitem", { name: "Save local copy..." }));
        const file = await h.saved;
        h.mark("saved");
        await h.badge("", { near: menu, label: `Saved ${file.split("/").pop()}`, badgeMs: 2200 });
        await h.move(REST);
    },
    holdMs: 1800,
};
