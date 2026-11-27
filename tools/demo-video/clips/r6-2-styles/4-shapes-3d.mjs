// Chapter 2, Styles, beat 4: shapes in 3D. The stars and hexagons lifted into 3D, closed in and
// turning slowly (setup); the hand makes Everything spheres, then the largest community (Group 1)
// torus knots.
import { choose, inspector, noLegend, REST, spin, STYLES_CLIP, tap, withShapes } from "./styles.js";

export default {
    id: "styles-shapes-3d",
    ...STYLES_CLIP,
    caption: "Shapes in 3D: spheres and torus knots",
    async setup(h) {
        await withShapes(h);
        await noLegend(h);
        await spin(h, 4);
        await h.park({ x: 1600, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await choose(h, inspector(page).getByRole("button", { name: /^Node shape, / }), "sph", "Sphere");
        h.mark("spheres");
        await tap(h, page.getByRole("treeitem", { name: /^Group 1, / }).getByText("Group 1", { exact: true }));
        await h.waitFor(page.getByRole("heading", { name: /^Group 1, / }));
        await choose(h, inspector(page).getByRole("button", { name: /^Node shape, / }), "kn", "Torus knot");
        await h.move(REST);
        h.mark("knots");
    },
    holdMs: 1500,
};
