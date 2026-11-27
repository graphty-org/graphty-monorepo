// Chapter 4, Layouts: a generated balanced tree (2 children a node, 31 nodes) drawn by Force; Layout >
// Layered > Apply and the nodes glide into ranks, the root on top and each level a row below it (the
// camera frames the new drawing itself). Layered (Graphviz dot), not Tree: in the recording build Tree draws the
// root at the bottom ("Vertical" lays the levels out left to right; reported as an app defect).
import { flat, generate, layoutPanel, pickLayout, REST, setTransition } from "./data.js";

export default {
    id: "data-tree",
    chapter: 4,
    caption: "A tree, top-down, level by level",
    async setup(h) {
        await generate(h, "Balanced tree", { "Children per node": 2 });
        await flat(h);
        await setTransition(h.page, /^Layered\b/, "Arc move", 1.4);
        await h.app.settled();
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await pickLayout(h, /^Layered\b/);
        h.mark("applied");
        await layoutPanel(page).waitFor({ state: "hidden" });
        await h.move(REST);
        await h.app.settled();
        h.mark("tree");
    },
    holdMs: 2000,
};
