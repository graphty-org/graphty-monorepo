// Chapter 8, clip 2: Play, with the timeline set to Grow, adds each year's films (orange) and their
// cast to what came before, from 2008 to the last film. The plan's Change flash shader is left out:
// it flashes a node whose data changed, not one that enters the time window, so it never fires
// during play (reported with this chapter).
import { filmsLayer, marvel2D, refit, speed, timelineSettings, toStart } from "./setup.js";

export default {
    id: "press-play",
    chapter: 8,
    caption: "Press play: films (orange) arrive year by year.",
    dataset: "Marvel films",
    async setup(h) {
        await marvel2D(h);
        await timelineSettings(h);
        await filmsLayer(h);
        await speed(h, 4);
        await refit(h);
        await toStart(h); // open on 2008, not on the whole graph
        await h.park({ x: 560, y: 860 }); // near Play, so the click comes quickly
    },
    async run(h) {
        const dock = h.page.getByRole("region", { name: "Timeline" });
        await h.click(dock.getByRole("button", { name: "Play" }));
        await h.move({ x: 1420, y: 820, width: 140, height: 60 }); // off the graph while it grows
        await h.waitFor(dock.getByRole("button", { name: "Play" })); // play stops by itself at the end
        h.mark("end");
    },
    holdMs: 1500,
};
