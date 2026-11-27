// Chapter 2, Styles, beat 6: edge labels. The zigzag edges with arrowheads in 3D, closed in and
// turning slowly (setup); the hand adds a Label from shared_chapters (how many chapters the two
// share) to Everything's edges.
import { inspector, noLegend, REST, spin, STYLES_CLIP, tap, withEdgeLines } from "./styles.js";

export default {
    id: "styles-edge-labels",
    ...STYLES_CLIP,
    caption: "Each edge shows its value",
    async setup(h) {
        await withEdgeLines(h);
        await noLegend(h);
        await spin(h, 5);
        await h.park({ x: 1600, y: 760 });
    },
    async run(h) {
        const { page } = h;
        await tap(h, inspector(page).getByRole("button", { name: "Add to edge text" }));
        await tap(h, page.getByRole("menuitem", { name: "Label", exact: true }));
        await tap(h, page.getByRole("dialog", { name: "Label" }).getByRole("option", { name: /^shared_chapters/ }));
        await h.waitFor(
            inspector(page)
                .getByRole("group", { name: "Text" })
                .getByText(/^share/)
                .first(),
        );
        await h.move(REST);
        h.mark("values");
    },
    holdMs: 2500,
};
