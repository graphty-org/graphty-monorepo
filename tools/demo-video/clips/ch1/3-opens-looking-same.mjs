// Chapter 1, clip 3: the Gephi file's colors and sizes arrive as ordinary style layers: the sizes'
// layer (By degree) is switched off with its eye, the nodes shrink, and on again, they grow back.
import { closeStyleNotice, legendOff, openFile, REST } from "./setup.js";

export default {
    id: "opens-looking-same",
    chapter: 1,
    caption: "Its colors and sizes come along, as layers you can change.",
    async setup(h) {
        await openFile(h, h.file("ch1/les-miserables-gephi.gexf"));
        await closeStyleNotice(h.page);
        await legendOff(h.page);
        await h.app.settled();
        await h.park({ x: 1100, y: 880 });
    },
    async run(h) {
        const { page } = h;
        const layer = page.getByRole("treeitem", { name: /^By degree, / });
        await h.click(layer.getByText("By degree"));
        await h.pause(700);
        await h.click(page.getByRole("button", { name: "Hide By degree" }));
        h.mark("sizes off");
        await h.pause(1100);
        await h.click(page.getByRole("button", { name: "Show By degree" }));
        h.mark("sizes on");
        await h.pause(300);
        await h.move(REST, { slow: 1.3 });
    },
};
