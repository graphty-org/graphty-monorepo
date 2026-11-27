// Round 6, basics 3: Layout, Circle, Apply: the flat drawing glides onto one circle.
import { pickLayout, setTransition } from "../r2-5b-and-more/more.js";
import { BASICS_DATA, flat, REST } from "./basics.js";

export default {
    id: "basics-circle",
    ...BASICS_DATA,
    caption: "Switch the layout to a circle",
    async setup(h) {
        await flat(h);
        // the nodes glide onto the circle (a graph setting each layout form writes), not jump
        await setTransition(h.page, /^Circle\b/, "Arc move", 1.6);
        await h.park({ x: 1180, y: 900 });
    },
    leadMs: 400,
    async run(h) {
        await pickLayout(h, /^Circle\b/);
        h.mark("applied");
        await h.move(REST);
        await h.app.settled();
        h.mark("circle");
    },
    holdMs: 1800,
};
