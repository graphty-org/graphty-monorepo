// Round 2, clip 6.2: a real Cytoscape session (Cytoscape's Basic Data Visualization tutorial: the
// yeast galactose network, colored and sized by expression) opened from the drawn Open dialog. It
// opens drawn as Cytoscape drew it, and its styles are ordinary layers in Style layers.
import { CYTOSCAPE_SESSION, FILES_CLIP, FROM_CYTOSCAPE, FROM_START, openFromStart, REST } from "./files.js";

export default {
    id: "opens-looking-same",
    // A placeholder while a Cytoscape session opens with none of its styles: the yeast galactose
    // session draws plain default nodes and only the Everything layer (no "By COMMON" label layer,
    // no colors), with every experiment on. Delete `placeholder` and `seconds` to film it again.
    placeholder: "Cytoscape files open with their styles (placeholder: a .cys session opens with none of its styles)",
    seconds: 4,
    ...FILES_CLIP,
    ...FROM_START,
    caption: "Cytoscape sessions keep their styles",
    async run(h) {
        const { page } = h;
        await openFromStart(h, CYTOSCAPE_SESSION, FROM_CYTOSCAPE);
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b249 nodes\b/ }));
        h.mark("session drawn");
        await h.app.settled();
        // the session's styles, as layers: the hand points at its label mapping
        await h.hover(page.getByRole("treeitem", { name: /^By COMMON, / }), 700);
        await h.move(REST);
    },
    holdMs: 1800,
};
