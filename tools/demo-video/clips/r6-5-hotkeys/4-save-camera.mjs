// Chapter 14, beat 4: V saves the turning camera as "Camera 1" in Views. A saved camera gets no key
// of its own, so the hand gives it 2 in its card; a drag on the canvas turns the view away, and 2
// flies back to the saved camera.
import { cameraButton, FOOTBALL, football, HOTKEYS, spin } from "./hot.js";

export default {
    id: "hotkeys-save-camera",
    chapter: HOTKEYS,
    caption: "V saves the camera; 2 flies back",
    dataset: FOOTBALL,
    async setup(h) {
        const { page } = h;
        await football(h);
        await page.getByRole("button", { name: "Views", exact: true }).click();
        await page.getByRole("region", { name: "Front" }).waitFor();
        await spin(h, 2);
        await h.park({ x: 640, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.shortcut("V", { label: "Save camera", badgeMs: 1000 });
        const card = page.getByRole("region", { name: "Camera 1" });
        await h.waitFor(card);
        await h.press("Enter"); // keep the name the rename field offers
        h.mark("saved");
        await h.click(card.getByRole("combobox", { name: "Key" }));
        await h.click(page.getByRole("option", { name: /^2\b/ }).first());
        h.mark("keyed");
        // the drag turns the view away and gives the canvas the keys
        await h.drag({ x: 380, y: 300 }, { x: 540, y: 300 }, { slow: 0.6 }); // the canvas left of the graph, near the card
        h.mark("away");
        await h.shortcut("2", { near: cameraButton(page), label: "Camera 1", badgeMs: 1000 });
        await h.app.frames(12);
        h.mark("back"); // the hand rests where the drag ended, left of the graph
    },
    holdMs: 1500,
};
