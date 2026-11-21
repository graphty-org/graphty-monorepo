// Round 3, intro shots 1-3 in one take, cut full-bleed from the canvas: the bank opens in 3D; key 5
// flattens it and the force layout pulls the accounts into clusters; the Louvain communities color in; key 5 lifts it to 3D, Fit (0) and
// Auto-rotate (9) turn it. The app re-lays the graph on a 2D/3D switch (it cannot lift the flat
// drawing into depth), so the cut drops the re-lay and jumps from the flat drawing to the turning one.
// Keys are pressed with no badge: the intro shows the graph, not the controls.
import { bankIntro, INTRO_CLIP } from "./intro.js";

export default {
    id: "intro-bank",
    ...INTRO_CLIP,
    caption: "Live layouts",
    tag: "Synthetic data",
    async setup(h) {
        await bankIntro(h, { colors: false, flat: false });
        await h.park({ x: 140, y: 640 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await h.press("5");
        h.mark("force");
        await h.waitFor(page.getByRole("button", { name: "Mode, 2D" }));
        await h.app.settled();
        await h.press("0");
        await h.app.settled();
        h.mark("settled");
        await h.click("Show Louvain");
        h.mark("colored");
        await h.pause(1500);
        await h.press("5");
        h.mark("3D");
        await h.waitFor(page.getByRole("button", { name: "Mode, 3D" }));
        await h.app.settled();
        await h.press("0");
        await h.app.settled();
        h.mark("lifted");
        await h.press("9");
        h.mark("turning");
    },
    holdMs: 7000,
};
