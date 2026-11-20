// Chapter 1, clip 1: a file saved in Gephi, dragged onto the start page, opens as a graph.
import { backToStart, DROP, legendOff, REST } from "./setup.js";

export default {
    id: "drop-gephi",
    chapter: 1,
    caption: "Drag in the file you already have.",
    async setup(h) {
        // The legend would cover the graph's left side (the file's draw order makes a long key):
        // turn it off in a throwaway project; the choice carries to the next one.
        await h.app.openSample("Les Miserables");
        await legendOff(h.page);
        await backToStart(h.page);
        await h.park({ x: -60, y: 620 }); // off screen: the file comes in from the left edge
    },
    async run(h) {
        // a Gephi file with its colors, sizes and positions (data/ch1/make-styled.mjs)
        await h.dropFile(h.file("ch1/les-miserables-gephi.gexf"), DROP);
        await h.waitFor(h.page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes?\b/ }));
        h.mark("graph drawn");
        await h.pause(500);
        await h.move(REST, { slow: 1.3 }); // the hand steps aside, off the graph
    },
    holdMs: 2800,
};
