// Chapter 2, clip 2: typing an everyday word in Analyze's filter finds the analysis that answers it.
import { labelNames, nodeBox, stage } from "./stage.js";

const at = {};

export default {
    id: "ask-plain-words",
    chapter: 2,
    caption: "Type 'brokers': it finds who links the groups.",
    small: "Bigger and darker = more of a go-between: Valjean",
    dataset: "Les Miserables",
    async setup(h) {
        await stage(h);
        await labelNames(h, ["Hovered"]); // pointing at a character shows its name
        at.valjean = await nodeBox(h, "Valjean");
        await h.park({ x: 1010, y: 830 });
    },
    leadMs: 500,
    holdMs: 1800,
    async run(h) {
        const { page } = h;
        await h.click("Analyze");
        await h.type("brokers"); // Analyze opens with the cursor in Filter analyses
        await h.click(page.getByRole("option", { name: "Betweenness", exact: true }));
        await h.click(page.getByRole("button", { name: "Run Betweenness" }));
        await h.waitFor(page.getByText("Color: Betweenness").first());
        // size by the same result, on the Everything layer the inspector shows
        await h.click(page.getByRole("button", { name: "Node size by attribute" }).first());
        const pick = page.getByRole("dialog", { name: "Node size by attribute" });
        await h.click(pick.getByRole("option", { name: /^Betweenness, / }));
        await h.move(at.valjean); // the biggest, darkest dot: its name comes up
        h.mark("ranked");
    },
};
