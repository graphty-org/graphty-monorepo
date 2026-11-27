// Chapter 2, Styles, beat 3: shapes in 2D. Flat, closed in on Valjean's community; the largest
// community (its Louvain layer, Group 1) has a Shape of its own at the default (setup). The hand makes
// Group 1 hexagons, then every other node a star on Everything.
import { choose, closeIn, groupShape, inspector, noLegend, REST, STYLES_CLIP, tap } from "./styles.js";

export default {
    id: "styles-shapes-2d",
    ...STYLES_CLIP,
    caption: "Shapes in 2D: stars and hexagons",
    async setup(h) {
        await groupShape(h);
        await noLegend(h);
        await closeIn(h, "Valjean", 2);
        await h.park({ x: 1600, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await choose(h, inspector(page).getByRole("button", { name: /^Node shape, / }), "hex", "Hexagon");
        h.mark("hexagons");
        await tap(h, page.getByRole("treeitem", { name: /^Everything, / }).getByText("Everything", { exact: true }));
        await h.waitFor(page.getByRole("heading", { name: /^Everything, / }));
        await choose(h, inspector(page).getByRole("button", { name: /^Node shape, / }), "sta", "Star");
        await h.move(REST);
        h.mark("stars");
    },
    holdMs: 1500,
};
