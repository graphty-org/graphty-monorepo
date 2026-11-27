// Round 6, basics 4: click Valjean on the circle (he is selected and the inspector opens on him),
// then his Degree 36 in the inspector: his 36 neighbors light up with him. The workspace has no
// single click that lights a node's neighbors (an app gap, reported). The Selected layer is filled
// red and drawn larger in setup: its own halo draws only on the clicked node (an app defect, reported).
import { BASICS_DATA, circle, HERO, nodeBox, redSelected, REST } from "./basics.js";

const at = {};

export default {
    id: "basics-neighbors",
    ...BASICS_DATA,
    caption: "Click a node, then light its neighbors",
    async setup(h) {
        // red first: after the layout form the fill menu offered no Solid (the Selected layer is
        // filled where probe 7 filled it: before the layout)
        await circle(h, () => redSelected(h.page));
        at.hero = await nodeBox(h, HERO);
        await h.park({ x: 1250, y: 560 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const insp = page.getByRole("complementary", { name: "Inspector" });
        await h.click(at.hero);
        await h.waitFor(insp.getByRole("heading", { name: HERO }));
        h.mark("clicked");
        await h.pause(350);
        await h.click(insp.getByRole("button", { name: /^Degree / }));
        await h.waitFor(insp.getByRole("group", { name: `${HERO} and 36 connections` }));
        await h.move(REST);
        h.mark("neighbors lit");
    },
    holdMs: 2000,
};
