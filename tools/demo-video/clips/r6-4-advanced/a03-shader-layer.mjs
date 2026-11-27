// Chapter 9, advanced styling: a shader on a layer. Liquid metal on the Everything layer's nodes,
// then Comets on its edges.
import { backgroundColor, everything, inspector, ready3D, REST, setNumber } from "./adv.js";

export default {
    id: "advanced-shader-layer",
    chapter: 9,
    caption: "Metal nodes, comet edges",
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
        await h.click(gallery.getByRole("textbox", { name: "Find node shader" }));
        await h.type("metal");
        await h.click(gallery.getByRole("button", { name: "Liquid metal" }));
        await h.waitFor(insp.getByRole("button", { name: "Remove liquid metal" }));
        h.mark("metal");
        await h.click(page.getByRole("tablist", { name: "Style for" }).getByRole("tab", { name: /^Edge/ }));
        await h.click(insp.getByRole("button", { name: "Add to edge shaders" }));
        await h.click(page.getByRole("dialog", { name: "Shaders" }).getByRole("button", { name: "Comets" }));
        await h.waitFor(insp.getByRole("button", { name: "Remove comets" }));
        await h.move(REST);
        // a looping shader keeps the drawing changing: wait on frames, never on settled
        await h.app.frames(20);
        h.mark("comets");
    },
    holdMs: 2500,
};
