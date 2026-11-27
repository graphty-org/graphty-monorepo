// Chapter 2, Styles, beat 5: edge lines and arrows. The spheres and torus knots in 3D, closed in and
// turning slowly; the edges darker and wider (setup). The hand makes the edges zigzags, then gives
// each edge a triangle arrowhead at its target end.
import { ARROW, choose, edgesReady, inspector, noLegend, REST, spin, STYLES_CLIP, tap } from "./styles.js";

export default {
    id: "styles-edge-lines",
    ...STYLES_CLIP,
    caption: "Edges: zigzags and arrowheads",
    async setup(h) {
        await edgesReady(h);
        await noLegend(h);
        await spin(h, 4);
        await h.park({ x: 1600, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await choose(h, inspector(page).getByRole("button", { name: /^Edge pattern, / }), "zi", "Zigzag");
        h.mark("zigzags");
        await tap(h, inspector(page).getByRole("button", { name: "Edge ends settings" }));
        const ends = page.getByRole("dialog", { name: "Edge ends" });
        await tap(h, ends.getByRole("button", { name: "Add edge target", exact: true }));
        await tap(h, ends.getByRole("button", { name: /^Edge target end, / }));
        await tap(h, page.getByRole("option", { name: ARROW, exact: true }));
        if (await ends.isVisible()) await h.press("Escape");
        await h.move(REST);
        h.mark("arrows");
    },
    holdMs: 1500,
};
