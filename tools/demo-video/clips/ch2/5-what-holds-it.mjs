// Chapter 2, clip 5: Valjean's menu > Simulate removing marks who would be cut off; nothing is removed.
import { labelNames, nodeBox, stage } from "./stage.js";

const at = {};

export default {
    id: "what-holds-it",
    chapter: 2,
    caption: "Who would be cut off without Valjean?",
    small: "Simulated: nothing is removed",
    dataset: "Les Miserables",
    async setup(h) {
        await stage(h);
        await labelNames(h, ["Hovered", "Selected"]); // Valjean's name shows as he is pointed at and picked
        at.valjean = await nodeBox(h, "Valjean");
        await h.park({ x: 1300, y: 860 });
    },
    leadMs: 500,
    holdMs: 1800,
    async run(h) {
        const { page } = h;
        await h.rightClick(at.valjean);
        await h.click(page.getByRole("menuitem", { name: "Simulate removing" }));
        await h.waitFor(page.getByText("Color: Removal impact").first());
        await h.move({ x: 1460, y: 900, width: 120, height: 60 });
        h.mark("cut off shown");
    },
};
