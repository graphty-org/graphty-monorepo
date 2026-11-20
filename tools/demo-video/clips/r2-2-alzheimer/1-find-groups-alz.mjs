// Round 2, clip 2.1: Quick actions (Ctrl+K), "louv", Enter opens Louvain, Run: the proteins color by
// community.
import { ALZ_CLIP, alz2D } from "./alz.js";

export default {
    id: "find-groups-alz",
    ...ALZ_CLIP,
    caption: "Color proteins by community",
    async setup(h) {
        await alz2D(h);
        await h.page.mouse.click(1560, 975); // the keys go to the graph, not a panel
        await h.park({ x: 1250, y: 880 });
    },
    leadMs: 500,
    async run(h) {
        const { page } = h;
        await h.shortcut("Ctrl+K", {
            near: page.getByRole("button", { name: "Quick actions" }),
            label: "Quick actions",
        });
        await h.waitFor(page.getByRole("combobox", { name: "Search commands" }));
        await h.type("louv");
        await h.press("Enter");
        await h.click(page.getByRole("button", { name: "Run Louvain" }));
        await h.waitFor(page.getByText("Color: Louvain").first());
        await h.move({ x: 1760, y: 760, width: 80, height: 60 });
        h.mark("communities colored");
    },
    holdMs: 2000,
};
