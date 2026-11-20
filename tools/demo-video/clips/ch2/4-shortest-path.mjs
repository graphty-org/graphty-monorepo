// Chapter 2, clip 4: Path between (P), both ends typed (Enter picks the name and moves on), Find path,
// then the pointer names both ends on the canvas.
import { labelNames, nodeBox, stage } from "./stage.js";

const at = {};

export default {
    id: "shortest-path",
    chapter: 2,
    caption: "Trace how any two characters are connected.",
    small: "Napoleon to Javert: 3 steps, through Valjean",
    dataset: "Les Miserables",
    async setup(h) {
        await stage(h);
        await labelNames(h, ["Hovered"]); // pointing at a character shows its name
        at.from = await nodeBox(h, "Napoleon");
        at.to = await nodeBox(h, "Javert");
        // labelling leaves the keyboard in the Style layers tree, where P jumps to the Pinned row:
        // a click on empty canvas gives the keys back to the graph
        await h.page.mouse.click(1500, 950);
        await h.park({ x: 1300, y: 860 });
    },
    leadMs: 500,
    holdMs: 1500,
    async run(h) {
        const { page } = h;
        // With nothing selected, P opens Shortest path with the cursor in From; Enter takes the first
        // name that matches and moves on to To, then to Find path
        await h.shortcut("P", {
            near: page.getByRole("button", { name: "Analyze", exact: true }),
            badgeMs: 1200,
            label: "Path",
        });
        await h.type("Napoleon");
        await h.press("Enter");
        await h.type("Javert");
        await h.press("Enter");
        await h.press("Enter");
        await h.waitFor(page.getByText("Nodes in order"));
        await h.move(at.from);
        await h.pause(700);
        await h.move(at.to);
        h.mark("route drawn");
    },
};
