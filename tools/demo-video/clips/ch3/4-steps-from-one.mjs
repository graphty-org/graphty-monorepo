// Chapter 3, clip 4: Valjean is clicked, then Rings around a node: his neighbors on the first
// ring, theirs on the next.
import { base, nodeBox, pickLayout } from "./base.js";

let valjean;

export default {
    id: "steps-from-one",
    chapter: 3,
    caption: "Everyone arranged by steps from Valjean.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        valjean = await nodeBox(h, "Valjean");
        await h.park({ x: 1460, y: 860 });
    },
    leadMs: 500,
    holdMs: 2000,
    async run(h) {
        const { page } = h;
        await h.click(valjean);
        await h.waitFor(page.getByRole("treeitem", { name: /^Selected, .*\b1 node\b/ }));
        await pickLayout(h, /^Rings around a node /);
        h.mark("applied");
        await h.move({ x: 1460, y: 900, width: 120, height: 60 });
    },
};
