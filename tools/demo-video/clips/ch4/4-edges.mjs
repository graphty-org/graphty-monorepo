// Chapter 4, clip 4: edge width by shared_chapters, widened to 8 to 40.
//
// The binding starts at 8 to 16, too close to see at a glance (an app note), so the clip widens it
// in the binding's popover; that is the payoff, so it stays. Curving the edges first made the clip
// 12.5 s, so the curve is left out.
import { base, tap } from "./base.js";

export default {
    id: "edges",
    chapter: 4,
    caption: "Thicker edges mean more chapters together.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        await h.page.getByRole("tab", { name: "Edge", exact: true }).click();
        await h.park({ x: 1600, y: 600 }); // near the Line row
    },
    async run(h) {
        const { page } = h;
        await tap(h, "Edge width by attribute");
        await tap(h, page.getByRole("option", { name: /^shared_chapters/ }));
        await tap(h, page.getByRole("button", { name: /^Edge width: shared_chapters/ }));
        await tap(h, page.getByRole("spinbutton", { name: "Width to" }));
        await h.press("Control+a");
        await h.type("40");
        await h.press("Enter");
        await h.press("Escape");
        await h.waitFor(page.getByRole("button", { name: "Edge width: shared_chapters, 8 to 40" }));
        h.mark("edges styled");
    },
    holdMs: 2200,
};
