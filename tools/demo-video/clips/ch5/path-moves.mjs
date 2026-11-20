// Chapter 5, clip 3: the Comets shader on a found path's edges only (the path's own layer).
// Napoleon to Javert, the pair chapter 2's shortest-path clip finds (3 steps, through Valjean).
import { colorByGroup, findPath, inspector } from "./steps.js";

export default {
    id: "path-moves",
    chapter: 5,
    caption: "Make the path you found move, so it stands out in a talk.",
    dataset: "Les Miserables",
    async setup(h) {
        const { page } = h;
        await colorByGroup(page);
        await h.app.settled();
        await findPath(page, "Napoleon", "Javert");
        await h.app.settled();
        // the path layer's Style tab, on its edges
        await inspector(page).getByRole("tab", { name: "Style", exact: true }).click();
        await inspector(page).getByRole("tab", { name: "Edge", exact: true }).click();
        await h.park({ x: 1250, y: 700 });
    },
    async run(h) {
        const { page } = h;
        await h.click(inspector(page).getByRole("button", { name: "Add to edge shaders" }));
        const shaders = page.getByRole("dialog", { name: "Shaders" });
        await h.click(shaders.getByRole("button", { name: "Comets", exact: true }));
        // picking a tile may close the picker itself; close it by hand only if it stays
        if (await shaders.isVisible()) await h.click(shaders.getByRole("button", { name: "Close Shaders" }));
        await h.move({ x: 1320, y: 820, width: 100, height: 80 });
        h.mark("streaks");
    },
    holdMs: 2500,
};
