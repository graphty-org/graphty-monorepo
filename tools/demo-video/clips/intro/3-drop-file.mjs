// Intro, shot 3: a file dropped on the start page opens as a graph -- in the browser, nothing uploaded.
import { backToStart, DROP, legendOff, REST } from "../ch1/setup.js";
import { flatStart } from "./shared.js";

export default {
    id: "intro-drop-file",
    chapter: 0,
    caption: "Your own file, in your browser. Nothing uploaded, nothing to install.",
    async setup(h) {
        // the legend would cover the left of the dropped graph: off in a throwaway project, kept for the next
        await h.app.openSample("Les Miserables");
        await legendOff(h.page);
        await backToStart(h.page);
        await flatStart(h);
        await h.park({ x: -60, y: 620 }); // off screen: the file comes in from the left edge
    },
    async run(h) {
        await h.dropFile(h.file("ch1/les-miserables-gephi.gexf"), DROP);
        await h.waitFor(h.page.getByRole("treeitem", { name: /^Everything, .*\b77 nodes?\b/ }));
        h.mark("graph drawn");
        await h.move(REST, { slow: 1.2 });
    },
    leadMs: 400,
    holdMs: 2000,
};
