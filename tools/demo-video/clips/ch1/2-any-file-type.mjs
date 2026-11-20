// Chapter 1, clip 2: the same network as GraphML and as a Cytoscape session, each dropped on the
// start page, drawing the same. Filmed with the file-styles experiment off: with it on, a plain file
// opens with a dozen stray style layers and the DOT file as black Graphviz ellipses (an app defect
// reported with chapter 1), so the formats do not look like the same network.
import { backToStart, DROP, legendOff, REST } from "./setup.js";

const FILES = ["les-miserables.graphml", "les-miserables.cys"];

export default {
    id: "any-file-type",
    chapter: 1,
    caption: "Same network, any common file type.",
    small: "GraphML, Cytoscape, Gephi, Graphviz DOT, CSV and more",
    featuresOff: ["file-styles"],
    async setup(h) {
        // the Cytoscape and DOT files' draw order makes a long legend over the graph: off
        await h.app.openSample("Les Miserables");
        await legendOff(h.page);
        await backToStart(h.page);
        await h.park({ x: -60, y: 620 });
    },
    async run(h) {
        const { page } = h;
        for (const [i, f] of FILES.entries()) {
            await h.dropFile(h.file(f), DROP);
            await h.waitFor(page.getByRole("button", { name: `Graph ${f}` }));
            await h.app.opened();
            h.mark(`${f} drawn`);
            await h.pause(800);
            if (i === FILES.length - 1) break;
            // back to the start page for the next file
            await h.click("Main menu");
            await h.click(page.getByRole("menuitem", { name: "Back to start" }));
            await h.waitFor(page.getByRole("button", { name: /^Open a file/ }));
        }
        await h.move(REST, { slow: 1.3 });
    },
    holdMs: 1600,
};
