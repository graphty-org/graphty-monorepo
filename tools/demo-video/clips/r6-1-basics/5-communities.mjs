// Round 6, basics 5: Analyze, Louvain, Run: each community on the circle takes its own color. The
// "picked" mark is just before the click on Run, where a short cut can start.
import { BASICS_DATA, circle, REST } from "./basics.js";

export default {
    id: "basics-communities",
    ...BASICS_DATA,
    caption: "One click colors the communities",
    async setup(h) {
        await circle(h);
        await h.park({ x: 1010, y: 830 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        await h.click("Analyze");
        await h.type("louv"); // Analyze opens with the cursor in Filter analyses
        await h.click(page.getByRole("option", { name: "Louvain", exact: true }));
        h.mark("picked");
        await h.click(page.getByRole("button", { name: "Run Louvain" }));
        await h.waitFor(page.getByText("Color: Louvain").first());
        await h.press("Escape"); // the Analyze popover closes off the drawing
        await h.move(REST);
        await h.app.settled();
        h.mark("communities colored");
    },
    holdMs: 2000,
};
