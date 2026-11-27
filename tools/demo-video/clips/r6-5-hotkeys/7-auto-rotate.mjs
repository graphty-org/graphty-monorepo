// Chapter 14, beat 6: 9 turns on Auto-rotate; the communities turn in 3D. Two notches in, so the
// slow turn moves the drawing enough to read (and for the frame gate).
import { cameraButton, closer, FOOTBALL, football, HOTKEYS, REST } from "./hot.js";

export default {
    id: "hotkeys-auto-rotate",
    chapter: HOTKEYS,
    caption: "Press 9 to auto-rotate",
    dataset: FOOTBALL,
    async setup(h) {
        await football(h);
        await closer(h, 2);
        await h.park({ x: 1240, y: 880 });
    },
    async run(h) {
        await h.shortcut("9", { near: cameraButton(h.page), label: "Auto-rotate" });
        await h.move(REST);
        h.mark("turning");
        await h.app.frames(45);
    },
    holdMs: 2500,
};
