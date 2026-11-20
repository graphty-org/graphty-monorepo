// Round 2, clip 6.1: a Gephi file (the Alzheimer's network, exported with its positions) opened from
// the start page's Open a file button and the drawn Open dialog (a drag washes the whole page pale:
// README.md, "Known app defects"). The app opens it into a fresh Force layout (it reads the file's
// positions but does not start from them; reported); the hand rests until that layout is still, so
// the cut can drop the settle (marks "opened" and "settled"), then applies Layout > Keep positions,
// 2D: the network snaps to the drawing saved in the file, held 2 s.
//
// The file-styles experiment is off: on this file it adds stray "Draw order", "Drawing", "Values" and
// "Defaults" layers, curves every edge and opens a notice over the drawing (an element defect).
import { EXPORTS, FILES_CLIP, REST } from "./files.js";

export default {
    id: "drop-gephi",
    ...FILES_CLIP,
    featuresOff: ["file-styles"],
    caption: "Open a Gephi file",
    async setup(h) {
        await h.park({ x: 1300, y: 760 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.openFile(
            page.getByRole("button", { name: /^Open a file/ }),
            h.file("round2/alzheimer-network.gexf"),
            EXPORTS,
        );
        await h.waitFor(page.getByRole("treeitem", { name: /^Everything, .*\b308 nodes\b/ }));
        h.mark("opened");
        await h.move(REST, { slow: 1.3 });
        await h.app.settled();
        h.mark("settled");
        await h.click(page.getByRole("button", { name: "Layout", exact: true }));
        const list = page.getByRole("listbox", { name: "Layouts" });
        const keep = list.getByRole("option", { name: /^Keep positions\b/ });
        await h.waitFor(list);
        const lb = await list.boundingBox();
        const ob = await keep.boundingBox();
        await h.scroll(list, Math.round(ob.y + ob.height / 2 - (lb.y + lb.height / 2)), { ms: 600 });
        await h.click(keep);
        const form = page.getByRole("form", { name: "Keep positions" });
        await h.click(form.getByText("2D", { exact: true }));
        await h.click(form.getByRole("button", { name: "Apply" }));
        await h.move(REST, { slow: 1.3 });
        await h.app.settled();
        h.mark("saved positions");
    },
    holdMs: 2000,
};
