// Round 6, basics 7: Mode > 3D lifts the drawing into 3D; a short drag turns it so the depth shows.
import { BASICS_DATA, bigger, REST } from "./basics.js";

export default {
    id: "basics-lift-3d",
    ...BASICS_DATA,
    caption: "One click lifts it into 3D",
    async setup(h) {
        await bigger(h);
        await h.park({ x: 1300, y: 760 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: /^Mode, / }));
        await h.click(page.getByRole("menuitemradio", { name: "3D", exact: true }));
        await h.waitFor(page.getByRole("button", { name: "Mode, 3D" }));
        h.mark("3D");
        await h.move({ x: 1450, y: 620, width: 40, height: 40 });
        await h.app.settled();
        h.mark("lifted");
        await h.drag({ x: 1460, y: 650 }, { x: 960, y: 560 }, { slow: 2.4 }); // turn it: the depth shows
        await h.move(REST);
        await h.app.settled();
        h.mark("turned");
    },
    holdMs: 1800,
};
