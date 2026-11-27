// Chapter 2, Styles, beat 2: color by a result. PageRank and Louvain already ran, the drawing turns
// slowly in 3D (setup); the hand
// binds Everything's node color to PageRank (a gradient by importance), then changes the binding's
// source to Louvain (a palette by community).
import { inspector, REST, spin, STYLES_CLIP, tap, withLabels } from "./styles.js";

export default {
    id: "styles-color",
    ...STYLES_CLIP,
    caption: "Color by importance, then by group",
    async setup(h) {
        await withLabels(h);
        await spin(h, 3);
        await h.park({ x: 1600, y: 760 });
    },
    async run(h) {
        const { page } = h;
        const insp = inspector(page);
        await tap(h, insp.getByRole("button", { name: "Node color by attribute" }));
        await tap(
            h,
            page.getByRole("dialog", { name: "Node color by attribute" }).getByRole("option", { name: /^PageRank/ }),
        );
        await h.waitFor(insp.getByRole("button", { name: /^Node color: PageRank/ }));
        h.mark("gradient");
        await h.pause(600);
        await tap(h, insp.getByRole("button", { name: /^Node color: PageRank/ }));
        await tap(h, page.getByRole("button", { name: "Change source" }));
        await tap(h, page.getByRole("option", { name: /^Louvain, / }).first());
        await h.waitFor(insp.getByRole("button", { name: /^Node color: Louvain/ }));
        const popover = page.getByRole("dialog", { name: /^Color by / });
        if (await popover.isVisible()) await h.press("Escape");
        await h.move(REST);
        h.mark("palette");
    },
    holdMs: 2000,
};
