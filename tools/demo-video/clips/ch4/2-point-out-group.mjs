// Chapter 4, clip 2: a layer that glows, ticked to Valjean's group (Louvain Group 1).
//
// Setup (not filmed) adds the layer, names it, gives it a strong red glow and a Louvain step with
// nothing ticked, so it paints no node yet. Filming the whole path (Add layer, Which nodes, Value,
// Louvain, Group 1, Done, Effects, Glow, a color) takes about 15 s against the plan's 7, so the clip
// films the payoff: tick the group, it lights up, and the layer's eye turns it off and on again.
// The camera is zoomed toward Valjean's group in setup, so the glow reads at the edit's framing.
import { base, hideLegend, nodeBox, tap, zoomIn } from "./base.js";

const NAME = "Valjean's group";

export default {
    id: "point-out-group",
    chapter: 4,
    caption: "Light up one group with a layer.",
    dataset: "Les Miserables",
    async setup(h) {
        await base(h);
        const { page } = h;
        await page.getByRole("button", { name: "Add a layer or a folder" }).click();
        await page.getByRole("menuitem", { name: "Layer", exact: true }).click();
        await page.getByRole("textbox", { name: "Layer name" }).fill(NAME);
        await page.keyboard.press("Enter");
        await page.getByRole("tab", { name: "Node", exact: true }).click();
        await page.getByRole("button", { name: "Add to node effects" }).click();
        await page.getByRole("menuitem", { name: "Glow", exact: true }).click();
        await page.getByRole("textbox", { name: /^Node glow color/ }).fill("FF2D55");
        await page.keyboard.press("Enter");
        // strength 1 is a faint haze at video scale
        await page.getByRole("spinbutton", { name: "Node glow strength" }).fill("3");
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "Style Nodes..." }).click();
        const picker = page.getByRole("dialog", { name: /Which nodes$/ });
        await picker.getByRole("button", { name: "Value", exact: true }).click();
        await page.keyboard.type("louv"); // the attribute list scrolls; its search box has focus
        await page.getByRole("option", { name: "Louvain", exact: true }).click();
        await picker.getByRole("button", { name: "Done", exact: true }).click();
        await page.getByRole("treeitem", { name: new RegExp(`^${NAME}, node layer, 0 nodes`) }).waitFor();
        // the legend would grow two glow entries over the graph
        await hideLegend(h);
        await h.app.settled();
        // closer, toward the bottom of Valjean's group, which hangs below him; the point stays above
        // the toolbar, so the wheel reaches the canvas
        const v = await nodeBox(h, "Valjean");
        await zoomIn(h, { x: v.x + v.width / 2 - 60, y: v.y + v.height / 2 + 220 }, 2);
        await h.park({ x: 1640, y: 270 }); // near Style Nodes...
    },
    async run(h) {
        const { page } = h;
        await tap(h, "Style Nodes...");
        const picker = page.getByRole("dialog", { name: /Which nodes$/ });
        await tap(h, picker.getByRole("checkbox", { name: /^Group 1, / })); // Valjean's group
        await h.pause(300); // the preview lights the group
        await tap(h, picker.getByRole("button", { name: "Done", exact: true }));
        await h.waitFor(page.getByRole("treeitem", { name: new RegExp(`^${NAME}, node layer, 20 nodes`) }));
        await h.pause(500);
        // the layer's eye: off, the glow goes; on, it comes back
        await tap(h, `Hide ${NAME}`);
        await h.pause(600);
        await tap(h, `Show ${NAME}`);
        h.mark("group glows");
    },
    holdMs: 2000,
};
