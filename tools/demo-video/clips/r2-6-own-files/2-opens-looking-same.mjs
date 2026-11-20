// Round 2, clip 6.2: a real Cytoscape session (Cytoscape's Basic Data Visualization tutorial: the
// yeast galactose network, colored and sized by expression) opened from the drawn Open dialog. It
// opens drawn as Cytoscape drew it, and its styles are ordinary layers in Style layers.
import { CYTOSCAPE_SESSION, FILES_CLIP, FROM_CYTOSCAPE, REST } from "./files.js";

export default {
    id: "opens-looking-same",
    ...FILES_CLIP,
    caption: "Cytoscape sessions keep their styles",
    async setup(h) {
        await h.park({ x: 1300, y: 760 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.openFile(page.getByRole("button", { name: /^Open a file/ }), CYTOSCAPE_SESSION, FROM_CYTOSCAPE);
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b249 nodes\b/ }));
        h.mark("session drawn");
        await h.app.settled();
        // the session's styles, as layers: the hand points at its label mapping
        await h.hover(page.getByRole("treeitem", { name: /^By COMMON, / }), 700);
        await h.move(REST);
    },
    holdMs: 1800,
};
