// Chapter 8, clip 1: the Overview finds the films' release dates; Set in Data makes them the time,
// and T opens the timeline with a histogram of releases from 2008 on.
// App gap: the Marvel films sample declares no time field, so it takes Set in Data before T works.
import { marvel2D, refit } from "./setup.js";

export default {
    id: "timeline",
    chapter: 8,
    caption: "Data with dates gets a timeline.",
    dataset: "Marvel films",
    async setup(h) {
        await marvel2D(h, { timeline: false });
        await refit(h); // room under the graph for the dock that slides up
        await h.park({ x: 1480, y: 420 }); // near the Overview, so the first move is short
    },
    async run(h) {
        const { page } = h;
        await h.click("Set in Data");
        // Set in Data leaves focus in the Edge time picker, where T would not reach the app
        // (reported with this chapter): a click on the empty panel below first, as a person would
        await h.click({ x: 120, y: 620, width: 120, height: 120 });
        await h.shortcut("T", { near: page.getByRole("button", { name: "Timeline", exact: true }), label: "Timeline" });
        await h.waitFor(page.getByRole("region", { name: "Timeline" }));
        await h.move({ x: 1300, y: 760, width: 120, height: 80 }); // off the dock so the bars read
        h.mark("timeline open");
    },
    holdMs: 1800,
};
