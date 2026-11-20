// Chapter 5, clip 4: Style > Shape > Model... > Samples > Person turns every character into a figure.
// The plan's second half (Fill > + > Picture on Valjean's node) is left out: it needs a layer for
// Valjean alone and would take the clip well past 8 s.
import { colorByGroup } from "./steps.js";

export default {
    id: "models-and-pictures",
    chapter: 5,
    caption: "Swap the dots for 3D models.",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await colorByGroup(page);
        await h.app.settled();
        await page.getByRole("treeitem", { name: /^Everything, / }).click();
        // closer in, so the figures read
        await page.mouse.move(960, 470);
        for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -240);
        await h.app.settled();
        await h.park({ x: 1250, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.click(page.getByRole("button", { name: /^Node shape, / }));
        // the list holds 53 shapes; Model... is last, so search for it as a person would
        await h.click(page.getByPlaceholder(/^Search \d+ shapes$/));
        await h.type("model");
        await h.click(page.getByRole("option", { name: "Model..." }));
        await h.click(page.getByRole("dialog", { name: "Models" }).getByRole("button", { name: "Person" }));
        // a model shape's field is a combobox (a plain shape's is a button)
        await page.getByRole("combobox", { name: /^Node shape, Person/ }).waitFor();
        await h.move({ x: 1350, y: 840, width: 100, height: 80 });
        h.mark("figures");
    },
    holdMs: 2500,
};
