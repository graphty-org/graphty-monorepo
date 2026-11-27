// Chapter 14, beat 3: the camera starts close in and turned; 0 fits the whole graph, then F frames
// the selection, one Louvain community picked in setup. Auto-rotate turns the drawing throughout.
import { cameraButton, EMPTY_CANVAS, FOOTBALL, football, HOTKEYS, REST, spin } from "./hot.js";

export default {
    id: "hotkeys-fit-frame",
    chapter: HOTKEYS,
    caption: "0 fits the graph, F the selection",
    dataset: FOOTBALL,
    async setup(h) {
        const { page } = h;
        await football(h);
        // close in and turned, off center, with the canvas keys
        const { x, y, width, height } = EMPTY_CANVAS;
        await page.mouse.click(x + width / 2, y + height / 2);
        await page.keyboard.down("w");
        await h.app.frames(40);
        await page.keyboard.up("w");
        await page.keyboard.down("ArrowLeft");
        await h.app.frames(20);
        await page.keyboard.up("ArrowLeft");
        await h.app.settled();
        // one community selected from the Louvain layer's Values list
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await page
            .getByRole("treeitem", { name: /^Louvain/ })
            .first()
            .click();
        await insp.getByRole("tab", { name: "Values" }).click();
        await insp.getByText("Group 5", { exact: true }).click();
        await page.getByRole("heading", { name: /nodes?, \d+ edges? selected$/ }).waitFor();
        await h.app.settled();
        await spin(h);
        await h.park({ x: 1240, y: 880 });
    },
    async run(h) {
        const camera = cameraButton(h.page);
        await h.shortcut("0", { near: camera, label: "Fit" });
        await h.app.frames(30);
        h.mark("fit");
        await h.pause(700);
        await h.shortcut("F", { near: camera, label: "Fit selection" });
        await h.app.frames(30);
        await h.move(REST);
        h.mark("framed");
    },
    holdMs: 2000,
};
