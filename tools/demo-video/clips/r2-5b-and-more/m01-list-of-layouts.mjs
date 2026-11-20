// "And more", beat 1: the Alzheimer's network, colored by community; Layout > Rings by group,
// grouped by Louvain, and each community glides onto its own ring (Arc move, set in setup).
import { alzLouvain, ALZ_CLIP } from "../r2-2-alzheimer/alz.js";
import { layoutPanel, MORE, pickLayout, REST, setTransition } from "./more.js";

export default {
    id: "list-of-layouts",
    ...ALZ_CLIP,
    chapter: MORE,
    // the Layout list holds 28 entries in the recording build (the start page's fact bar says 22)
    caption: "28 layouts, one click each",
    async setup(h) {
        await alzLouvain(h);
        await setTransition(h.page, /^Rings by group\b/, "Arc move", 1.8);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await pickLayout(h, /^Rings by group\b/, false);
        const form = layoutPanel(page).getByRole("form", { name: "Rings by group" });
        // the form groups by "name" until told otherwise (an app default; reported)
        await h.click(form.getByRole("combobox", { name: "Group by" }));
        await h.click(page.getByRole("option", { name: /^Louvain\b/ }).first());
        await h.click(form.getByRole("button", { name: "Apply" }));
        h.mark("applied");
        await h.move(REST);
        await h.app.settled(); // the glide ends, then the hold
    },
    holdMs: 1500,
};
