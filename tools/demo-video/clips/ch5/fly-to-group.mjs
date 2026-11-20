// Chapter 5, clip 2: one Louvain group picked in the Values list, Fit selection (key F) flies the
// camera to it, then Auto-rotate (key 9) turns it. Filmed with the cosmograph experiment off: with it
// on, selecting hides the other nodes but leaves their edges dangling (graphty-element defect).
// The legend card is hidden (key L) in setup: Fit selection frames the group under it.
import { colorByGroup, inspector, reopenWithout } from "./steps.js";

export default {
    id: "fly-to-group",
    chapter: 5,
    caption: "Fly to any group, then let it turn.",
    async setup(h) {
        const { page } = h;
        await reopenWithout(h, ["cosmograph"], "Les Miserables");
        await colorByGroup(page);
        await h.app.settled();
        await page.keyboard.press("l");
        await page.getByText("Color: Louvain").waitFor({ state: "hidden" });
        // the Louvain layer's Values list the group is picked from
        await page.getByRole("treeitem", { name: /^Louvain/ }).click();
        await inspector(page).getByRole("tab", { name: "Values" }).click();
        await inspector(page).getByText("Group 5", { exact: true }).waitFor();
        await h.park({ x: 1250, y: 300 });
    },
    async run(h) {
        const { page } = h;
        await h.click(inspector(page).getByText("Group 5", { exact: true }));
        await page.getByRole("heading", { name: /^10 nodes, \d+ edges selected$/ }).waitFor();
        const camera = page.getByRole("button", { name: "Camera", exact: true });
        await h.shortcut("F", { near: camera, label: "Fly to it" });
        await h.shortcut("9", { near: camera, label: "Turn" });
        await h.move({ x: 1460, y: 860, width: 100, height: 60 });
        h.mark("turning");
    },
    holdMs: 3000,
};
