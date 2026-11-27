// Chapter 14, beat 2: the canvas keys fly the 3D camera: the right arrow turns, W zooms in, D rolls,
// S zooms back out. The canvas has the keys from a click on its empty corner in setup.
import { EMPTY_CANVAS, FOOTBALL, football, HOTKEYS, spin } from "./hot.js";

export default {
    id: "hotkeys-fly",
    chapter: HOTKEYS,
    caption: "Fly the camera with the keyboard",
    dataset: FOOTBALL,
    async setup(h) {
        await football(h);
        // a slow turn throughout keeps the still moments alive; a camera key pauses it while held
        await spin(h, 2);
        const { x, y, width, height } = EMPTY_CANVAS;
        await h.page.mouse.click(x + width / 2, y + height / 2);
        await h.park({ x: 1500, y: 780 });
    },
    async run(h) {
        await h.shortcut("w", { show: "W", label: "Zoom in", holdMs: 700 });
        await h.shortcut("ArrowRight", { show: "Right", label: "Turn", holdMs: 1000 });
        await h.shortcut("d", { show: "D", label: "Roll", holdMs: 700 });
        await h.shortcut("s", { show: "S", label: "Zoom out", holdMs: 500 });
        h.mark("flown");
    },
    holdMs: 1600,
};
