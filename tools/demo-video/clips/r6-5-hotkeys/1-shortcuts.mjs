// Chapter 14, beat 1: ? opens Keyboard shortcuts over the turning graph.
import { FOOTBALL, football, HOTKEYS, REST, spin } from "./hot.js";

export default {
    id: "hotkeys-shortcuts",
    chapter: HOTKEYS,
    caption: "Press ? to see every shortcut",
    dataset: FOOTBALL,
    async setup(h) {
        await football(h);
        await spin(h, 3);
        await h.park({ x: 1240, y: 640 });
    },
    async run(h) {
        const { page } = h;
        await h.shortcut("?", { label: "Keyboard shortcuts" });
        await h.waitFor(page.getByRole("dialog", { name: "Keyboard shortcuts" }));
        h.mark("dialog");
        // the hand reads down the list (the drawing behind the dialog may pause as it opens, so the
        // hand keeps the picture alive), then rests
        const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
        const { x, y, width, height } = await dialog.boundingBox();
        await h.move({ x: x + width * 0.25, y: y + height * 0.2, width: 80, height: 40 }, { slow: 1.4 });
        await h.move({ x: x + width * 0.55, y: y + height * 0.65, width: 80, height: 40 }, { slow: 1.4 });
        await h.move(REST);
    },
    holdMs: 2000,
};
