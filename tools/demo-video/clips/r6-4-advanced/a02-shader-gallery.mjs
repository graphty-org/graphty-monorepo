// Chapter 9, advanced styling: the shader gallery. Shaders + on the Everything layer opens the
// gallery; the hand passes Glass, scrolls down its tiles and picks Hologram, and every node becomes
// a flickering hologram. The tiles are still pictures, so the motion is shown on the graph.
import { backgroundColor, everything, inspector, ready3D, REST, setNumber } from "./adv.js";

export default {
    id: "advanced-shader-gallery",
    chapter: 9,
    caption: "Shaders, from glass to holograms",
    dataset: "Les Miserables",
    async setup(h) {
        await ready3D(h);
        await backgroundColor(h, "111827");
        await everything(h, "Node");
        await setNumber(h, "Node size", 1.6);
        await h.app.settled();
        await h.park({ x: 1250, y: 760 });
    },
    async run(h) {
        const { page } = h;
        const insp = inspector(page);
        await h.click(insp.getByRole("button", { name: "Add to node shaders" }));
        const gallery = page.getByRole("dialog", { name: "Shaders" });
        const glass = gallery.getByRole("button", { name: "Glass", exact: true });
        await h.waitFor(glass);
        await h.hover(glass, 700);
        await h.scroll(glass, 520, { ms: 1600 });
        h.mark("scrolled");
        await h.click(gallery.getByRole("button", { name: "Hologram", exact: true }));
        await h.waitFor(insp.getByRole("button", { name: "Remove hologram" }));
        await h.move(REST);
        // a looping shader keeps the drawing changing: wait on frames, never on settled
        await h.app.frames(20);
        h.mark("holograms");
    },
    holdMs: 3000,
};
