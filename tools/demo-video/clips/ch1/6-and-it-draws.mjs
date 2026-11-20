// Chapter 1, clip 6: the CSV's links were read one way (arrows); Direction > Undirected redraws them
// as plain links between characters.
import { openFile, REST } from "./setup.js";

export default {
    id: "and-it-draws",
    chapter: 1,
    caption: "Links go both ways? Say so, and it redraws.",
    async setup(h) {
        const { page } = h;
        await openFile(h, h.file("les-miserables-links.csv"));
        await page.getByRole("button", { name: "Data", exact: true }).click();
        await page.getByRole("combobox", { name: "Direction" }).waitFor();
        await h.app.settled();
        await h.park({ x: 1100, y: 880 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("combobox", { name: "Direction" }));
        await h.click(page.getByRole("option", { name: "Undirected", exact: true }));
        h.mark("undirected");
        await h.pause(300);
        await h.move(REST, { slow: 1.3 });
    },
};
