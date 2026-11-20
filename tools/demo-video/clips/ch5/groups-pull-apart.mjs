// Chapter 5, clip 1: the flat, group-colored graph lifts into 3D (Mode > 3D clicked, with the key 5
// badged above the Mode button), then a drag turns it. A click, not the key: the key needs the canvas
// focused, and a focused canvas draws a focus ring around the whole drawing. The plan's caption ("Groups that overlap when flat pull apart in 3D")
// is its own fallback here: Louvain's groups do not overlap in the flat drawing, so 3D separates nothing.
// Filmed with the cosmograph experiment off: with it on, 2D draws no edges and 5 re-lays the graph
// out from a jumble instead of lifting the flat drawing (graphty-element defect, see the chapter report).
import { colorByGroup, reopenWithout } from "./steps.js";

export default {
    id: "groups-pull-apart",
    chapter: 5,
    caption: "The same graph and results, now in 3D.",
    async setup(h) {
        const { page } = h;
        await reopenWithout(h, ["cosmograph"], "Les Miserables");
        await colorByGroup(page);
        await h.app.mode("2D");
        await h.app.settled(); // 2D lays the graph out again
        await h.app.camera("Fit");
        await h.app.settled();
        await h.park({ x: 1430, y: 700 });
    },
    async run(h) {
        const { page } = h;
        const mode = page.getByRole("button", { name: /^Mode, / });
        await h.click(mode);
        await h.badge("5", { near: mode, label: "3D" });
        await h.click(page.getByRole("menuitemradio", { name: "3D", exact: true }));
        await page.getByRole("button", { name: "Mode, 3D" }).waitFor();
        await h.pause(900); // watch the graph lift
        h.mark("3D");
        await h.drag(
            { x: 1380, y: 640, width: 60, height: 60 },
            { x: 1100, y: 590, width: 60, height: 60 },
            { slow: 1.2 },
        );
        await h.move({ x: 1460, y: 820, width: 100, height: 80 });
        h.mark("turned");
    },
};
