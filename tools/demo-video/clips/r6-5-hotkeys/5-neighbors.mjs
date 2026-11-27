// Chapter 14, beat 5: Michigan selected, the camera near it and turning; G adds its neighbors to the
// selection. The Selected layer is filled near-black in setup: its own halo draws on only one node of a
// multi-node selection (an app defect, reported), so the fill makes all of them show.
import { blur, darkSelected, FOOTBALL, football, HOTKEYS, REST, spin } from "./hot.js";

export default {
    id: "hotkeys-neighbors",
    chapter: HOTKEYS,
    caption: "G adds the neighbors to the selection",
    dataset: FOOTBALL,
    async setup(h) {
        const { page } = h;
        await football(h);
        await darkSelected(page);
        // the camera stays put when the selection grows (Focus selected flies it, and the canvas
        // goes blank for about a second on the way)
        await page.getByRole("button", { name: "Camera", exact: true }).click();
        await page.getByRole("menuitemcheckbox", { name: "Focus selected", checked: true }).click();
        await page.keyboard.press("Escape");
        await page.getByRole("combobox", { name: "Find" }).fill("Michigan");
        await page
            .getByRole("option", { name: /^Michigan\b/ })
            .first()
            .click();
        await page
            .getByRole("complementary", { name: "Inspector" })
            .getByRole("heading", { name: "Michigan" })
            .waitFor();
        await blur(page);
        // near Michigan: F frames it, the wheel backs out
        await page.keyboard.press("f");
        await h.app.settled();
        await page.mouse.move(1500, 300); // off the graph, so no node is hovered
        for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 240);
        await h.app.settled();
        await spin(h);
        await h.park({ x: 1460, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await h.shortcut("G", { label: "Neighborhood" });
        const said = /^Michigan and \d+ connections$/;
        await h.waitFor(page.getByRole("group", { name: said }).or(page.getByText(said)).first());
        await h.app.frames(20);
        await h.move(REST);
        h.mark("neighbors");
    },
    holdMs: 2200,
};
