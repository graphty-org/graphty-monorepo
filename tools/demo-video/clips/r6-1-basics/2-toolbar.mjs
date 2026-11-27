// Round 6, basics 2: the hand passes along the canvas toolbar and each tool shows its name (the first
// tooltip after a 1 s rest, the rest at once). The clips after it start flat (their setup switches
// to 2D), so this take ends on the tour. The toolbar holds Analyze, Layout, Camera (Fit and Zoom are in its menu), Mode, Legend,
// Table and Quick actions; it has no Filters button.
import { BASICS_DATA, REST } from "./basics.js";

const TOOLS = ["Analyze", "Layout", "Camera", /^Mode, /, "Legend", "Table", "Quick actions"];

export default {
    id: "basics-toolbar",
    ...BASICS_DATA,
    caption: "The toolbar names every tool",
    async setup(h) {
        await h.app.settled();
        await h.park({ x: 800, y: 960 });
    },
    leadMs: 400,
    async run(h) {
        const { page } = h;
        const bar = page.getByRole("toolbar", { name: "Canvas tools" });
        const tool = (n) =>
            typeof n === "string"
                ? bar.getByRole("button", { name: n, exact: true })
                : bar.getByRole("button", { name: n });
        await h.hover(tool(TOOLS[0]), 1250); // the first tooltip waits a second
        h.mark("tour");
        for (const n of TOOLS.slice(1)) await h.hover(tool(n), 600); // each name up long enough to read
        h.mark("tour end");
        await h.move(REST);
    },
    holdMs: 1600,
};
