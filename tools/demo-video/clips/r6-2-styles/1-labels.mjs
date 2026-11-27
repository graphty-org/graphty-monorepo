// Chapter 2, Styles, beat 1: names appear on the nodes. Les Miserables lifted into 3D, closed in on its
// middle and turning slowly (setup; the label's default size is in world units, so it reads close
// up); the hand adds a Label from the name column to Everything.
import { inspector, lesMis, REST, spin, STYLES_CLIP } from "./styles.js";

export default {
    id: "styles-labels",
    ...STYLES_CLIP,
    caption: "Names appear on the nodes",
    async setup(h) {
        await lesMis(h);
        await spin(h, 4);
        await h.park({ x: 1600, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.click(inspector(page).getByRole("button", { name: "Add to node text" }));
        await h.click(page.getByRole("menuitem", { name: "Label", exact: true }));
        await h.click(page.getByRole("dialog", { name: "Label" }).getByRole("option", { name: "name", exact: true }));
        await h.waitFor(inspector(page).getByRole("group", { name: "Text" }).getByText("name").first());
        await h.move(REST);
        h.mark("labels");
    },
    holdMs: 2000,
};
